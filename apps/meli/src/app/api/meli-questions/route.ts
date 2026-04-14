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
        const url = `https://api.mercadolibre.com/questions/search?seller_id=${account.meli_user_id}&status=UNANSWERED&limit=50`;
        
        const res = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
        
        if (!res.ok) {
          console.error(`[meli-questions] Error ${res.status} para ${account.meli_nickname}`);
          continue;
        }

        const data = await res.json();
        const questions = data.questions || [];
        
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
    
    return NextResponse.json(allQuestions);
  } catch (error) {
    console.error("[meli-questions] Error fatal:", error);
    return NextResponse.json([]);
  }
}
