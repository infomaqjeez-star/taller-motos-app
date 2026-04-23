import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getValidToken, type LinkedMeliAccount } from "@/lib/meli";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/meli-questions-unified
 * 
 * Trae las preguntas de TODAS las cuentas conectadas del usuario.
 * Usa el MISMO patrón que meli-dashboard (que funciona).
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Auth — mismo que dashboard
    const authHeader = request.headers.get("authorization");
    let userId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) userId = user.id;
    }

    if (!userId) {
      return NextResponse.json({ error: "No autorizado", questions: [], accounts: [] }, { status: 401 });
    }

    // Cuentas — mismo query que dashboard
    const { data: accounts, error: accountsError } = await supabase
      .from("linked_meli_accounts")
      .select("id, user_id, meli_user_id, meli_nickname, is_active, access_token_enc, refresh_token_enc, token_expiry_date")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (accountsError || !accounts?.length) {
      return NextResponse.json({ questions: [], accounts: [], message: "No hay cuentas" });
    }

    console.log(`[Questions] ${accounts.length} cuentas para ${userId}`);

    // Traer preguntas de TODAS las cuentas en PARALELO — mismo patrón que dashboard
    const allResults = await Promise.all(
      accounts.map(async (account) => {
        try {
          const validToken = await getValidToken(account as LinkedMeliAccount);
          if (!validToken) {
            console.log(`[Questions] ❌ Sin token: ${account.meli_nickname}`);
            return { account, questions: [], total: 0, error: "token_expired", responseTime: null };
          }

          const meliId = String(account.meli_user_id);
          const headers = { Authorization: `Bearer ${validToken}` };

          // Preguntas + response time en paralelo
          const [questionsRes, rtRes] = await Promise.allSettled([
            fetch(
              `https://api.mercadolibre.com/questions/search?seller_id=${meliId}&status=UNANSWERED&api_version=4&limit=50&sort_fields=date_created&sort_types=DESC`,
              { headers, signal: AbortSignal.timeout(8000) }
            ),
            fetch(
              `https://api.mercadolibre.com/users/${meliId}/questions/response_time`,
              { headers, signal: AbortSignal.timeout(5000) }
            ),
          ]);

          // Parsear preguntas
          let questions: any[] = [];
          let total = 0;
          if (questionsRes.status === "fulfilled" && questionsRes.value.ok) {
            const data = await questionsRes.value.json();
            questions = data.questions || [];
            total = data.total || questions.length;
            console.log(`[Questions] ✅ ${account.meli_nickname}: ${questions.length} preguntas (total: ${total})`);
          } else {
            const status = questionsRes.status === "fulfilled" ? questionsRes.value.status : "timeout";
            console.log(`[Questions] ❌ ${account.meli_nickname}: HTTP ${status}`);
          }

          // Parsear response time
          let responseTime = null;
          if (rtRes.status === "fulfilled" && rtRes.value.ok) {
            responseTime = await rtRes.value.json();
          }

          // Enriquecer preguntas con datos del item (en paralelo, batch de 5)
          const itemCache = new Map<string, { title: string; thumbnail: string }>();
          const uniqueItems = [...new Set(questions.map((q: any) => q.item_id))];
          
          // Fetch items en batches de 5
          for (let i = 0; i < uniqueItems.length; i += 5) {
            const batch = uniqueItems.slice(i, i + 5);
            await Promise.allSettled(
              batch.map(async (itemId: string) => {
                try {
                  const res = await fetch(
                    `https://api.mercadolibre.com/items/${itemId}?attributes=id,title,thumbnail`,
                    { headers, signal: AbortSignal.timeout(3000) }
                  );
                  if (res.ok) {
                    const d = await res.json();
                    itemCache.set(itemId, { title: d.title || itemId, thumbnail: (d.thumbnail || "").replace("http://", "https://") });
                  }
                } catch { /* skip */ }
              })
            );
          }

          return {
            account,
            questions: questions.map((q: any) => ({
              ...q,
              item_title: itemCache.get(q.item_id)?.title || q.item_id,
              item_thumbnail: itemCache.get(q.item_id)?.thumbnail || "",
              account_nickname: account.meli_nickname,
              account_id: account.id,
            })),
            total,
            error: null,
            responseTime,
          };
        } catch (err: any) {
          console.error(`[Questions] Error ${account.meli_nickname}:`, err.message);
          return { account, questions: [], total: 0, error: err.message, responseTime: null };
        }
      })
    );

    // Combinar resultados
    const allQuestions = allResults.flatMap(r => r.questions);
    allQuestions.sort((a, b) => new Date(b.date_created).getTime() - new Date(a.date_created).getTime());

    const duration = Date.now() - startTime;
    console.log(`[Questions] ✅ TOTAL: ${allQuestions.length} preguntas de ${accounts.length} cuentas en ${duration}ms`);

    const response = NextResponse.json({
      questions: allQuestions,
      accounts: allResults.map(r => ({
        accountId: r.account.id,
        nickname: r.account.meli_nickname,
        sellerId: r.account.meli_user_id,
        total: r.total,
        error: r.error,
        responseTime: r.responseTime,
      })),
      totalQuestions: allQuestions.length,
      duration_ms: duration,
    });
    
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error: any) {
    console.error("[Questions] Error fatal:", error);
    return NextResponse.json({ error: error.message, questions: [], accounts: [] }, { status: 500 });
  }
}
