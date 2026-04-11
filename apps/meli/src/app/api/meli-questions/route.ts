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
      return NextResponse.json([], { status: 200 });
    }

    const { data: accounts } = await supabase
      .from("linked_meli_accounts")
      .select("id, meli_user_id, meli_nickname, access_token_enc")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (!accounts || accounts.length === 0) {
      return NextResponse.json([]);
    }

    const allQuestions: any[] = [];

    for (const account of accounts) {
      try {
        console.log(`[meli-questions] Procesando cuenta: ${account.meli_nickname}, meli_user_id: ${account.meli_user_id}`);
        console.log(`[meli-questions] Token (primeros 30 chars): ${account.access_token_enc?.substring(0, 30)}...`);
        
        if (!account.access_token_enc) {
          console.log(`[meli-questions] Sin token para ${account.meli_nickname}`);
          continue;
        }
        
        const headers = { Authorization: `Bearer ${account.access_token_enc}` };
        const url = `https://api.mercadolibre.com/questions/search?seller_id=${account.meli_user_id}&status=UNANSWERED&limit=50`;
        
        console.log(`[meli-questions] Fetching: ${url}`);
        const res = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
        
        console.log(`[meli-questions] Response status: ${res.status}`);
        
        if (!res.ok) {
          const errorText = await res.text().catch(() => "Unknown");
          console.error(`[meli-questions] Error ${res.status} para ${account.meli_nickname}: ${errorText}`);
          continue;
        }
        
        const data = await res.json();
        console.log(`[meli-questions] Data keys: ${Object.keys(data).join(", ")}`);
        const questions = data.questions || [];
        console.log(`[meli-questions] ${questions.length} preguntas encontradas`);
        
        for (const q of questions) {
          allQuestions.push({
            meli_question_id: q.id,
            meli_account_id: account.id,
            item_id: q.item_id,
            item_title: q.item_id,
            item_thumbnail: "",
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

    allQuestions.sort((a, b) => new Date(b.date_created).getTime() - new Date(a.date_created).getTime());
    return NextResponse.json(allQuestions);
  } catch (error) {
    console.error("[meli-questions] Error:", error);
    return NextResponse.json([]);
  }
}
