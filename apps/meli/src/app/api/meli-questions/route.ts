import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
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
      console.log("[meli-questions] No userId, returning empty");
      return NextResponse.json([], { status: 200 });
    }

    console.log(`[meli-questions] UserID: ${userId}`);

    const { data: accounts, error: accountsError } = await supabase
      .from("linked_meli_accounts")
      .select("id, meli_user_id, meli_nickname, access_token_enc")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (accountsError) {
      console.error("[meli-questions] Error fetching accounts:", accountsError);
    }

    console.log(`[meli-questions] Cuentas encontradas: ${accounts?.length || 0}`);
    console.log(`[meli-questions] Cuentas:`, accounts?.map(a => `${a.meli_nickname}(${a.meli_user_id})`).join(', '));

    if (!accounts || accounts.length === 0) {
      return NextResponse.json([]);
    }

    const allQuestions: any[] = [];

    for (const account of accounts) {
      try {
        console.log(`[meli-questions] === Procesando: ${account.meli_nickname} ===`);
        
        if (!account.access_token_enc) {
          console.log(`[meli-questions] ❌ Sin token`);
          continue;
        }
        
        if (!account.access_token_enc.startsWith('APP_USR')) {
          console.error(`[meli-questions] ❌ Token inválido: ${account.access_token_enc.substring(0, 20)}...`);
          continue;
        }
        
        const headers = { Authorization: `Bearer ${account.access_token_enc}` };
        const url = `https://api.mercadolibre.com/questions/search?seller_id=${account.meli_user_id}&status=UNANSWERED&limit=50`;
        
        console.log(`[meli-questions] URL: ${url}`);
        
        const res = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
        
        console.log(`[meli-questions] Status: ${res.status}`);
        
        if (!res.ok) {
          const errorText = await res.text().catch(() => "Unknown");
          console.error(`[meli-questions] ❌ Error ${res.status}: ${errorText.substring(0, 300)}`);
          continue;
        }
        
        const data = await res.json();
        const questions = data.questions || [];
        const total = data.total || data.paging?.total || questions.length;
        
        console.log(`[meli-questions] ✅ ${questions.length} preguntas (total reportado: ${total})`);
        
        for (const q of questions) {
          console.log(`[meli-questions]   - ID:${q.id} | ${q.text?.substring(0, 60)}...`);
          
          let itemTitle = q.item_id;
          let itemThumbnail = "";
          try {
            const itemRes = await fetch(`https://api.mercadolibre.com/items/${q.item_id}`, {
              headers, signal: AbortSignal.timeout(8000),
            });
            if (itemRes.ok) {
              const itemData = await itemRes.json();
              itemTitle = itemData.title || q.item_id;
              itemThumbnail = itemData.thumbnail || "";
            }
          } catch (e) {
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
        console.error(`[meli-questions] ❌ Error cuenta ${account.meli_nickname}:`, e);
      }
    }

    console.log(`[meli-questions] === TOTAL: ${allQuestions.length} preguntas ===`);
    
    allQuestions.sort((a, b) => new Date(b.date_created).getTime() - new Date(a.date_created).getTime());
    return NextResponse.json(allQuestions);
  } catch (error) {
    console.error("[meli-questions] Error fatal:", error);
    return NextResponse.json([]);
  }
}
