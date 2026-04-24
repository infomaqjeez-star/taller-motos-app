import { NextRequest, NextResponse } from "next/server";
import { getSupabase, getValidToken, type LinkedMeliAccount } from "@/lib/meli";

export const dynamic = "force-dynamic";

/**
 * GET /api/meli-questions-unified
 * 
 * Trae preguntas + response time de TODAS las cuentas en PARALELO.
 * Mismo patrón de auth y tokens que meli-dashboard (que funciona).
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Auth
    const supabase = getSupabase();
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
      console.log(`[Questions] No hay cuentas activas para ${userId}`);
      return NextResponse.json({ questions: [], accounts: [], totalQuestions: 0 });
    }

    console.log(`[Questions] ${accounts.length} cuentas para ${userId}`);

    // ══════ TODAS las cuentas EN PARALELO ══════
    const accountResults = await Promise.allSettled(
      accounts.map(async (account) => {
        const nickname = account.meli_nickname || `Cuenta ${account.meli_user_id}`;
        const meliId = String(account.meli_user_id);

        // Token — mismo que dashboard
        const validToken = await getValidToken(account as LinkedMeliAccount);
        if (!validToken) {
          console.log(`[Questions] ❌ Sin token: ${nickname}`);
          return { account, nickname, meliId, questions: [], total: 0, responseTime: null, error: "token_expired" };
        }

        const headers = { Authorization: `Bearer ${validToken}` };

        // Preguntas + response time en paralelo POR CUENTA
        const [qRes, rtRes] = await Promise.allSettled([
          fetch(
            `https://api.mercadolibre.com/questions/search?seller_id=${meliId}&status=UNANSWERED&api_version=4&limit=50&sort_fields=date_created&sort_types=DESC`,
            { headers, signal: AbortSignal.timeout(10000) }
          ),
          fetch(
            `https://api.mercadolibre.com/users/${meliId}/questions/response_time`,
            { headers, signal: AbortSignal.timeout(5000) }
          ),
        ]);

        // Parsear preguntas
        let questions: any[] = [];
        let total = 0;
        if (qRes.status === "fulfilled" && qRes.value.ok) {
          const data = await qRes.value.json();
          questions = data.questions || [];
          total = data.total ?? data.paging?.total ?? questions.length;
          console.log(`[Questions] ✅ ${nickname}: ${questions.length} preguntas sin responder`);
        } else {
          // Fallback: /my/received_questions/search
          try {
            const fallbackRes = await fetch(
              `https://api.mercadolibre.com/my/received_questions/search?status=UNANSWERED&api_version=4&limit=50`,
              { headers, signal: AbortSignal.timeout(10000) }
            );
            if (fallbackRes.ok) {
              const fbData = await fallbackRes.json();
              questions = fbData.questions || [];
              total = fbData.total ?? questions.length;
              console.log(`[Questions] ✅ ${nickname}: ${questions.length} preguntas (fallback)`);
            }
          } catch { /* skip */ }
        }

        // Parsear response time
        let responseTime = null;
        if (rtRes.status === "fulfilled" && rtRes.value.ok) {
          responseTime = await rtRes.value.json();
        }

        // Enriquecer con datos de items — en paralelo, batch de 10
        const itemCache = new Map<string, { title: string; thumbnail: string }>();
        const uniqueItems = [...new Set(questions.map((q: any) => String(q.item_id)).filter(Boolean))];
        
        for (let i = 0; i < uniqueItems.length; i += 10) {
          const batch = uniqueItems.slice(i, i + 10);
          await Promise.allSettled(
            batch.map(async (itemId) => {
              try {
                const res = await fetch(
                  `https://api.mercadolibre.com/items/${itemId}?attributes=id,title,thumbnail`,
                  { headers, signal: AbortSignal.timeout(3000) }
                );
                if (res.ok) {
                  const d = await res.json();
                  itemCache.set(itemId, {
                    title: d.title || itemId,
                    thumbnail: String(d.thumbnail || "").replace("http://", "https://"),
                  });
                }
              } catch { /* skip */ }
            })
          );
        }

        // Mapear al formato del frontend
        const mappedQuestions = questions.map((q: any) => {
          const itemId = String(q.item_id);
          const item = itemCache.get(itemId) || { title: itemId, thumbnail: "" };
          return {
            meli_question_id: q.id,
            meli_account_id: account.id,
            item_id: itemId,
            item_title: item.title,
            item_thumbnail: item.thumbnail,
            buyer_id: q.from?.id || 0,
            buyer_nickname: q.from?.nickname || (q.from?.id ? `Usuario ${q.from.id}` : "Comprador"),
            question_text: q.text || "",
            status: q.status,
            date_created: q.date_created,
            answer_text: q.answer?.text ?? null,
            meli_accounts: { nickname },
          };
        });

        return {
          account,
          nickname,
          meliId,
          questions: mappedQuestions,
          total,
          responseTime,
          error: null,
        };
      })
    );

    // Combinar resultados
    const results = accountResults.map(r => 
      r.status === "fulfilled" ? r.value : { account: null, nickname: "Error", meliId: "", questions: [], total: 0, responseTime: null, error: "Promise rejected" }
    );

    const allQuestions = results.flatMap(r => r.questions);
    allQuestions.sort((a, b) => new Date(b.date_created).getTime() - new Date(a.date_created).getTime());

    const duration = Date.now() - startTime;
    console.log(`[Questions] ✅ TOTAL: ${allQuestions.length} preguntas, ${accounts.length} cuentas, ${duration}ms`);

    const response = NextResponse.json({
      questions: results.map(r => ({
        accountId: r.account?.id || "",
        nickname: r.nickname,
        sellerId: r.meliId,
        questions: r.questions,
        total: r.total,
        responseTime: r.responseTime,
        error: r.error,
      })),
      accounts: results.map(r => ({
        accountId: r.account?.id || "",
        nickname: r.nickname,
        sellerId: r.meliId,
        total: r.total,
        responseTime: r.responseTime,
        error: r.error,
      })),
      totalQuestions: allQuestions.length,
      duration_ms: duration,
      timestamp: new Date().toISOString(),
    });

    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error: any) {
    console.error("[Questions] Error fatal:", error);
    return NextResponse.json({ error: error.message, questions: [], accounts: [] }, { status: 500 });
  }
}
