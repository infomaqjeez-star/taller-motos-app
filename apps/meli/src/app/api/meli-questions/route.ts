import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getValidToken, type LinkedMeliAccount } from "@/lib/meli";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key"
);

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    let userId: string | null = null;
    
    if (authHeader?.startsWith("Bearer ")) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.slice(7));
      if (user) userId = user.id;
    }
    
    if (!userId) {
      return NextResponse.json([], { status: 200 });
    }

    const { data: accounts } = await supabase
      .from("linked_meli_accounts")
      .select("id, user_id, meli_user_id, meli_nickname, access_token_enc, refresh_token_enc, token_expiry_date, is_active")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (!accounts || accounts.length === 0) {
      return NextResponse.json([]);
    }

    const allQuestions: any[] = [];

    for (const account of accounts) {
      try {
        // Usar getValidToken centralizado (con auto-refresh)
        const token = await getValidToken(account as LinkedMeliAccount);
        if (!token) {
          console.log(`[meli-questions] No se pudo obtener token para ${account.meli_nickname}`);
          continue;
        }

        const headers = { Authorization: `Bearer ${token}` };
        
        // Intentar endpoint primario
        let questions: any[] = [];
        const url = `https://api.mercadolibre.com/questions/search?seller_id=${account.meli_user_id}&status=UNANSWERED&limit=50`;
        
        console.log(`[meli-questions] [${account.meli_nickname}] GET ${url}`);
        
        const res = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
        
        console.log(`[meli-questions] [${account.meli_nickname}] Response status: ${res.status}`);
        
        if (res.ok) {
          const data = await res.json();
          questions = data.questions || [];
          console.log(`[meli-questions] [${account.meli_nickname}] ${questions.length} preguntas encontradas`);
          console.log(`[meli-questions] [${account.meli_nickname}] Total: ${data.total}, Available: ${data.available}, Filters: ${JSON.stringify(data.filters)}`);
        } else {
          const errorText = await res.text().catch(() => "Unknown error");
          console.error(`[meli-questions] [${account.meli_nickname}] Error ${res.status}: ${errorText.substring(0, 200)}`);
        }
        
        // Si no hay preguntas, intentar endpoint alternativo
        if (questions.length === 0) {
          console.log(`[meli-questions] [${account.meli_nickname}] Intentando endpoint alternativo...`);
          const fallbackUrl = `https://api.mercadolibre.com/my/received_questions?status=UNANSWERED&limit=50`;
          const fallbackRes = await fetch(fallbackUrl, { headers, signal: AbortSignal.timeout(15000) });
          
          if (fallbackRes.ok) {
            const fallbackData = await fallbackRes.json();
            questions = fallbackData.questions || [];
            console.log(`[meli-questions] [${account.meli_nickname}] Fallback: ${questions.length} preguntas`);
          } else {
            console.error(`[meli-questions] [${account.meli_nickname}] Fallback tambien fallo: ${fallbackRes.status}`);
          }
        }
        
        // Si sigue sin haber preguntas, intentar sin filtro de status
        if (questions.length === 0) {
          console.log(`[meli-questions] [${account.meli_nickname}] Intentando sin filtro de status...`);
          const noFilterUrl = `https://api.mercadolibre.com/questions/search?seller_id=${account.meli_user_id}&limit=10`;
          const noFilterRes = await fetch(noFilterUrl, { headers, signal: AbortSignal.timeout(10000) });
          
          if (noFilterRes.ok) {
            const noFilterData = await noFilterRes.json();
            const allQuestions = noFilterData.questions || [];
            console.log(`[meli-questions] [${account.meli_nickname}] Sin filtro: ${allQuestions.length} preguntas totales`);
            if (allQuestions.length > 0) {
              const statuses = [...new Set(allQuestions.map((q: any) => q.status))];
              console.log(`[meli-questions] [${account.meli_nickname}] Estados disponibles: ${statuses.join(', ')}`);
            }
          }
        }
        
        for (const q of questions) {
          // Obtener detalles del item
          let itemTitle = q.item_id;
          let itemThumbnail = "";
          try {
            const itemRes = await fetch(`https://api.mercadolibre.com/items/${q.item_id}`, {
              headers,
              signal: AbortSignal.timeout(8000),
            });
            if (itemRes.ok) {
              const itemData = await itemRes.json();
              itemTitle = itemData.title || q.item_id;
              itemThumbnail = itemData.thumbnail || "";
            }
          } catch {
            // Ignorar error de item
          }
          
          allQuestions.push({
            meli_question_id: q.id,
            meli_account_id: account.id,
            item_id: q.item_id,
            item_title: itemTitle,
            item_thumbnail: itemThumbnail,
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
      } catch (e) {
        console.error(`[meli-questions] Error cuenta ${account.meli_nickname}:`, e);
      }
    }

    allQuestions.sort((a, b) => 
      new Date(b.date_created).getTime() - new Date(a.date_created).getTime()
    );
    
    console.log(`[meli-questions] TOTAL: ${allQuestions.length} preguntas para el usuario`);
    
    // Agregar headers de no-caché
    const response = NextResponse.json(allQuestions);
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;
  } catch (error) {
    console.error("[meli-questions] Error fatal:", error);
    return NextResponse.json([]);
  }
}
