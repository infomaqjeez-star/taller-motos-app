import { NextRequest, NextResponse } from "next/server";
import { getSupabase, getValidToken, type LinkedMeliAccount } from "@/lib/meli";

export const dynamic = "force-dynamic";

// ── Caché de items (título + thumbnail) — persiste entre polls en el servidor ──
const ITEM_CACHE_TTL = 60 * 60 * 1000; // 1 hora
const itemCache = new Map<string, { title: string; thumbnail: string; ts: number }>();

function getCachedItem(itemId: string) {
  const c = itemCache.get(itemId);
  if (c && Date.now() - c.ts < ITEM_CACHE_TTL) return c;
  return null;
}
function setCachedItem(itemId: string, title: string, thumbnail: string) {
  itemCache.set(itemId, { title, thumbnail, ts: Date.now() });
}

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

        // Enriquecer con datos de items — usa caché del servidor, multi-item API (1 req/batch)
        const localItemMap = new Map<string, { title: string; thumbnail: string }>();
        const uniqueItems = [...new Set(questions.map((q: any) => String(q.item_id)).filter(Boolean))];
        const itemsToFetch = uniqueItems.filter(id => !getCachedItem(id));

        // Fetch paralelo de todos los batches usando el endpoint multi-item de MeLi
        // /items?ids=A,B,C&attributes=id,title,thumbnail → 1 sola request por batch de 20
        const batches: string[][] = [];
        for (let i = 0; i < itemsToFetch.length; i += 20) {
          batches.push(itemsToFetch.slice(i, i + 20));
        }

        if (batches.length > 0) {
          await Promise.allSettled(
            batches.map(async (batch) => {
              try {
                const ids = batch.join(",");
                const res = await fetch(
                  `https://api.mercadolibre.com/items?ids=${ids}&attributes=id,title,thumbnail`,
                  { headers, signal: AbortSignal.timeout(8000) }
                );
                if (res.ok) {
                  const results: any[] = await res.json();
                  for (const item of results) {
                    if (item.code === 200 && item.body) {
                      const d = item.body;
                      const title = d.title || String(d.id);
                      const thumb = String(d.thumbnail || "").replace("http://", "https://");
                      setCachedItem(String(d.id), title, thumb);
                    }
                  }
                }
              } catch { /* skip */ }
            })
          );
        }

        // Resolver desde caché
        for (const id of uniqueItems) {
          const c = getCachedItem(id);
          if (c) localItemMap.set(id, { title: c.title, thumbnail: c.thumbnail });
        }

        // Mapear al formato del frontend
        const mappedQuestions = questions.map((q: any) => {
          const itemId = String(q.item_id);
          const item = localItemMap.get(itemId) || { title: itemId, thumbnail: "" };
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
