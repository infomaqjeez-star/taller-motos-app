import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getValidToken, type LinkedMeliAccount } from "@/lib/meli";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key"
);

// Caché en memoria para preguntas (DESHABILITADO para tiempo real absoluto)
const CACHE_ENABLED = false;
const CACHE_TTL = 5 * 1000;

interface CacheEntry {
  data: any[];
  timestamp: number;
}
const questionsCache = new Map<string, CacheEntry>();

// Función para esperar N ms
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Función para hacer fetch con retry y backoff para error 502
async function fetchWithRetry(
  url: string, 
  options: RequestInit, 
  maxRetries = 3,
  accountName: string
): Promise<Response | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[meli-questions] [${accountName}] Intento ${attempt}/${maxRetries}`);
      
      const res = await fetch(url, options);
      
      // Si es 502, esperar y reintentar
      if (res.status === 502) {
        const waitTime = attempt * 1000; // 1s, 2s, 3s
        console.log(`[meli-questions] [${accountName}] ⚠️ Error 502, esperando ${waitTime}ms...`);
        await sleep(waitTime);
        continue;
      }
      
      return res;
      
    } catch (err: any) {
      console.error(`[meli-questions] [${accountName}] ❌ Error en intento ${attempt}:`, err.message);
      
      if (attempt < maxRetries) {
        const waitTime = attempt * 1000;
        await sleep(waitTime);
      }
    }
  }
  
  console.error(`[meli-questions] [${accountName}] ❌ Todos los intentos fallaron`);
  return null;
}

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
        try {
          const token = await getValidToken(account as LinkedMeliAccount);
          if (!token) {
            console.error(`[meli-questions] [${account.meli_nickname}] ❌ NO SE PUDO OBTENER TOKEN`);
          } else {
            console.log(`[meli-questions] [${account.meli_nickname}] ✅ Token válido obtenido`);
          }
          return { account, token, headers: token ? { Authorization: `Bearer ${token}` } : null };
        } catch (err) {
          console.error(`[meli-questions] [${account.meli_nickname}] ❌ Error obteniendo token:`, err);
          return { account, token: null, headers: null };
        }
      })
    );
    
    const validTokens = tokenResults.filter(({ token }) => token);
    const invalidTokens = tokenResults.filter(({ token }) => !token);
    
    console.log(`[meli-questions] Tokens: ${validTokens.length} válidos, ${invalidTokens.length} inválidos de ${accounts.length} cuentas`);
    console.log(`[meli-questions] Tiempo tokens: ${Date.now() - tokensStart}ms`);

    // Consultar preguntas de TODAS las cuentas con token válido
    // Procesar en grupos pequeños para no saturar ni MeLi ni Railway
    const questionsStart = Date.now();
    
    const questionsResults: { account: any; questions: any[]; error: string | null }[] = [];
    
    // Procesar de a 2 cuentas con delay de 1s entre grupos
    const batchSize = 2;
    for (let i = 0; i < validTokens.length; i += batchSize) {
      const batch = validTokens.slice(i, i + batchSize);
      
      console.log(`[meli-questions] Procesando batch ${Math.floor(i/batchSize) + 1}: ${batch.map(b => b.account.meli_nickname).join(', ')}`);
      
      const batchPromises = batch.map(async ({ account, headers }) => {
        try {
          const url = `https://api.mercadolibre.com/questions/search?seller_id=${account.meli_user_id}&status=UNANSWERED&limit=50`;
          
          const res = await fetchWithRetry(
            url,
            { headers: headers!, signal: AbortSignal.timeout(20000) },
            3,
            account.meli_nickname
          );
          
          if (!res) {
            return { account, questions: [], error: "Max retries exceeded" };
          }
          
          if (!res.ok) {
            const errorText = await res.text().catch(() => "Unknown error");
            console.error(`[meli-questions] [${account.meli_nickname}] ❌ Error ${res.status}: ${errorText.substring(0, 200)}`);
            return { account, questions: [], error: `${res.status}: ${errorText}` };
          }
          
          const data = await res.json();
          const questions = data.questions || [];
          console.log(`[meli-questions] [${account.meli_nickname}] ✅ ${questions.length} preguntas`);
          return { account, questions, error: null };
        } catch (e: any) {
          console.error(`[meli-questions] [${account.meli_nickname}] ❌ Error:`, e.message);
          return { account, questions: [], error: e.message };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      questionsResults.push(...batchResults);
      
      // Esperar 1s entre batches para no saturar
      if (i + batchSize < validTokens.length) {
        console.log(`[meli-questions] Esperando 1s antes del siguiente batch...`);
        await sleep(1000);
      }
    }
    
    // Resumen de resultados
    const totalQuestions = questionsResults.reduce((sum, r) => sum + r.questions.length, 0);
    const errors = questionsResults.filter(r => r.error);
    
    console.log(`[meli-questions] Consultas completadas en ${Date.now() - questionsStart}ms`);
    console.log(`[meli-questions] RESULTADO: ${totalQuestions} preguntas totales de ${questionsResults.length} cuentas consultadas`);
    
    if (errors.length > 0) {
      console.error(`[meli-questions] ERRORES en ${errors.length} cuentas:`, errors.map(e => `${e.account.meli_nickname}: ${e.error}`));
    }
    if (invalidTokens.length > 0) {
      console.error(`[meli-questions] SIN TOKEN:`, invalidTokens.map(t => t.account.meli_nickname));
    }

    // Procesar preguntas y obtener info de items en PARALELO
    const allQuestions: any[] = [];
    const itemCache = new Map<string, { title: string; thumbnail: string }>();

    for (const { account, questions } of questionsResults) {
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
