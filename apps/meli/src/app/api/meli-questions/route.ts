import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getValidToken, type LinkedMeliAccount } from "@/lib/meli";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key"
);

// Caché en memoria para preguntas (DESHABILITADO para tiempo real absoluto)
// Si necesitas reactivar el caché, cambia esto a true y ajusta CACHE_TTL
const CACHE_ENABLED = false;
const CACHE_TTL = 5 * 1000; // 5 segundos (mínimo si se reactiva)

interface CacheEntry {
  data: any[];
  timestamp: number;
}
const questionsCache = new Map<string, CacheEntry>();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const force = searchParams.get("force") === "true";
    
    const authHeader = request.headers.get("authorization");
    let userId: string | null = null;
    
    if (authHeader?.startsWith("Bearer ")) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.slice(7));
      if (user) userId = user.id;
    }
    
    if (!userId) {
      return NextResponse.json([], { status: 200 });
    }

    // Verificar caché (solo si está habilitado Y no se fuerza recarga)
    if (CACHE_ENABLED && !force) {
      const cached = questionsCache.get(userId);
      if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        console.log(`[meli-questions] ✅ Usando caché para ${userId}`);
        const response = NextResponse.json(cached.data);
        response.headers.set('Cache-Control', 'no-store');
        return response;
      }
    } else if (!CACHE_ENABLED) {
      console.log(`[meli-questions] 🔄 Caché DESHABILITADO - Consultando MeLi directamente`);
    } else if (force) {
      console.log(`[meli-questions] 🔄 Forzando recarga para ${userId}`);
    }

    const { data: accounts } = await supabase
      .from("linked_meli_accounts")
      .select("id, user_id, meli_user_id, meli_nickname, access_token_enc, refresh_token_enc, token_expiry_date, is_active")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (!accounts || accounts.length === 0) {
      return NextResponse.json([]);
    }

    // Obtener tokens válidos en paralelo
    const tokensStart = Date.now();
    const tokenResults = await Promise.all(
      accounts.map(async (account) => {
        const token = await getValidToken(account as LinkedMeliAccount);
        return { account, token, headers: token ? { Authorization: `Bearer ${token}` } : null };
      })
    );
    console.log(`[meli-questions] Tokens obtenidos en ${Date.now() - tokensStart}ms`);

    // Consultar preguntas de TODAS las cuentas en PARALELO
    const questionsStart = Date.now();
    const questionsPromises = tokenResults
      .filter(({ token }) => token)
      .map(async ({ account, headers }) => {
        try {
          // Solo un endpoint - el más confiable
          const url = `https://api.mercadolibre.com/questions/search?seller_id=${account.meli_user_id}&status=UNANSWERED&limit=50`;
          
          const res = await fetch(url, { 
            headers: headers!, 
            signal: AbortSignal.timeout(8000) // Reducir timeout a 8s
          });
          
          if (!res.ok) {
            console.error(`[meli-questions] [${account.meli_nickname}] Error ${res.status}`);
            return { account, questions: [] };
          }
          
          const data = await res.json();
          const questions = data.questions || [];
          console.log(`[meli-questions] [${account.meli_nickname}] ${questions.length} preguntas`);
          return { account, questions };
        } catch (e) {
          console.error(`[meli-questions] [${account.meli_nickname}] Error:`, e);
          return { account, questions: [] };
        }
      });

    const allResults = await Promise.all(questionsPromises);
    console.log(`[meli-questions] Consultas completadas en ${Date.now() - questionsStart}ms`);

    // Procesar preguntas y obtener info de items en PARALELO
    const allQuestions: any[] = [];
    const itemCache = new Map<string, { title: string; thumbnail: string }>();

    for (const { account, questions } of allResults) {
      if (questions.length === 0) continue;

      // Obtener info de items únicos en paralelo
      const uniqueItemIds = [...new Set(questions.map((q: any) => String(q.item_id)))] as string[];
      const itemPromises = uniqueItemIds.map(async (itemId) => {
        if (itemCache.has(itemId)) return;
        
        try {
          const token = await getValidToken(account as LinkedMeliAccount);
          const res = await fetch(`https://api.mercadolibre.com/items/${itemId}`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: AbortSignal.timeout(5000),
          });
          if (res.ok) {
            const data = await res.json();
            itemCache.set(itemId, { title: data.title, thumbnail: data.thumbnail });
          }
        } catch {
          itemCache.set(itemId, { title: String(itemId), thumbnail: "" });
        }
      });

      await Promise.all(itemPromises);

      // Mapear preguntas con info de items
      for (const q of questions) {
        const itemId = String(q.item_id);
        const itemInfo = itemCache.get(itemId) || { title: itemId, thumbnail: "" };
        allQuestions.push({
          meli_question_id: q.id,
          meli_account_id: account.id,
          item_id: itemId,
          item_title: itemInfo.title,
          item_thumbnail: itemInfo.thumbnail,
          buyer_id: q.from?.id,
          buyer_nickname: q.from?.nickname || "Comprador",
          question_text: q.text,
          status: q.status,
          date_created: q.date_created,
          answer_text: null,
          answer_date: null,
          meli_accounts: { nickname: account.meli_nickname },
        });
      }
    }

    allQuestions.sort((a, b) => 
      new Date(b.date_created).getTime() - new Date(a.date_created).getTime()
    );
    
    console.log(`[meli-questions] TOTAL: ${allQuestions.length} preguntas en ${Date.now() - tokensStart}ms`);
    
    // Guardar en caché
    questionsCache.set(userId, { data: allQuestions, timestamp: Date.now() });
    
    const response = NextResponse.json(allQuestions);
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error) {
    console.error("[meli-questions] Error fatal:", error);
    return NextResponse.json([]);
  }
}
