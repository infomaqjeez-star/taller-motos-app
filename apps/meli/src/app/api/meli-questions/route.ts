import { NextRequest, NextResponse } from "next/server";
import { getSupabase, getValidToken, meliGet, type LinkedMeliAccount } from "@/lib/meli";

export const dynamic = "force-dynamic";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function getAuthenticatedUserId(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const supabase = getSupabase();
  const token = authHeader.slice(7);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return null;
  }

  return user.id;
}

async function getLinkedAccountsForUser(userId: string): Promise<LinkedMeliAccount[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("linked_meli_accounts")
    .select("id, user_id, meli_user_id, meli_nickname, access_token_enc, refresh_token_enc, token_expiry_date, is_active")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[meli-questions] Error obteniendo cuentas:", error);
    return [];
  }

  return (data ?? []) as LinkedMeliAccount[];
}

async function resolveAccountIdentity(
  token: string,
  account: LinkedMeliAccount
): Promise<{ sellerId: string; nickname: string }> {
  try {
    const response = await fetch("https://api.mercadolibre.com/users/me", {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return {
        sellerId: String(account.meli_user_id),
        nickname: account.meli_nickname,
      };
    }

    const data = await response.json();

    return {
      sellerId: String(data.id ?? account.meli_user_id),
      nickname: data.nickname || account.meli_nickname,
    };
  } catch {
    return {
      sellerId: String(account.meli_user_id),
      nickname: account.meli_nickname,
    };
  }
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3,
  accountName: string
): Promise<Response | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (response.status === 502 || response.status === 429) {
        const waitTime = attempt * 1000;
        console.log(`[meli-questions] [${accountName}] ${response.status}, esperando ${waitTime}ms...`);
        await sleep(waitTime);
        continue;
      }

      return response;
    } catch (error: any) {
      console.error(`[meli-questions] [${accountName}] Error intento ${attempt}:`, error.message);
      if (attempt < maxRetries) {
        await sleep(attempt * 1000);
      }
    }
  }

  return null;
}

async function fetchQuestionsCandidate(
  url: string,
  token: string,
  accountName: string
): Promise<{ questions: any[]; total: number; source: string; ok: boolean }> {
  const response = await fetchWithRetry(
    url,
    {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(12000),
    },
    3,
    accountName
  );

  if (!response || !response.ok) {
    return { questions: [], total: 0, source: url, ok: false };
  }

  const data = await response.json();

  return {
    questions: data.questions || [],
    total: data.total || data.paging?.total || data.questions?.length || 0,
    source: url,
    ok: true,
  };
}

async function enrichItemInfo(
  questions: any[],
  token: string
): Promise<Map<string, { title: string; thumbnail: string }>> {
  const itemCache = new Map<string, { title: string; thumbnail: string }>();
  const uniqueItemIds = [...new Set(questions.map((question) => String(question.item_id)).filter(Boolean))];

  for (let index = 0; index < uniqueItemIds.length; index += 5) {
    const batch = uniqueItemIds.slice(index, index + 5);

    await Promise.all(
      batch.map(async (itemId) => {
        if (itemCache.has(itemId)) {
          return;
        }

        try {
          const response = await fetch(
            `https://api.mercadolibre.com/items/${itemId}?attributes=id,title,thumbnail`,
            {
              headers: { Authorization: `Bearer ${token}` },
              signal: AbortSignal.timeout(5000),
            }
          );

          if (!response.ok) {
            itemCache.set(itemId, { title: itemId, thumbnail: "" });
            return;
          }

          const data = await response.json();
          itemCache.set(itemId, {
            title: data.title || itemId,
            thumbnail: String(data.thumbnail || "").replace("http://", "https://"),
          });
        } catch {
          itemCache.set(itemId, { title: itemId, thumbnail: "" });
        }
      })
    );
  }

  return itemCache;
}

function mapQuestionsToFrontend(
  questions: any[],
  account: { id: string; nickname: string; sellerId: string },
  itemCache: Map<string, { title: string; thumbnail: string }>
) {
  return questions.map((question) => {
    const itemId = String(question.item_id);
    const itemInfo = itemCache.get(itemId) || { title: itemId, thumbnail: "" };

    return {
      meli_question_id: question.id,
      meli_account_id: account.id,
      item_id: itemId,
      item_title: itemInfo.title,
      item_thumbnail: itemInfo.thumbnail,
      buyer_id: question.from?.id || 0,
      buyer_nickname: question.from?.nickname || (question.from?.id ? `Usuario ${question.from.id}` : "Comprador"),
      question_text: question.text || "",
      status: question.status,
      date_created: question.date_created,
      answer_text: question.answer?.text ?? null,
      meli_accounts: { nickname: account.nickname },
    };
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shouldSync = searchParams.get("sync") === "true";
    const userId = await getAuthenticatedUserId(request);

    if (!userId) {
      return NextResponse.json([]);
    }

    if (shouldSync) {
      try {
        const supabase = getSupabase();
        await syncQuestionsFromMeli(supabase, userId);
      } catch (error) {
        console.warn("[meli-questions] Sync a DB falló, continuando con fetch directo:", error);
      }
    }

    return await fetchQuestionsDirectFromMeli(userId);
  } catch (error) {
    console.error("[meli-questions] Error fatal:", error);
    return NextResponse.json([]);
  }
}

async function fetchQuestionsDirectFromMeli(userId: string) {
  const accounts = await getLinkedAccountsForUser(userId);

  if (!accounts.length) {
    return NextResponse.json([]);
  }

  const allQuestions: any[] = [];

  for (const account of accounts) {
    try {
      const token = await getValidToken(account);
      if (!token) {
        continue;
      }

      const identity = await resolveAccountIdentity(token, account);

      const [sellerQuestions, receivedQuestions] = await Promise.all([
        fetchQuestionsCandidate(
          `https://api.mercadolibre.com/questions/search?seller_id=${identity.sellerId}&api_version=4&limit=50&sort_fields=date_created&sort_types=DESC`,
          token,
          identity.nickname
        ),
        fetchQuestionsCandidate(
          "https://api.mercadolibre.com/my/received_questions/search?api_version=4&limit=50",
          token,
          identity.nickname
        ),
      ]);

      const chosenQuestions =
        sellerQuestions.ok && sellerQuestions.questions.length > 0
          ? sellerQuestions.questions
          : receivedQuestions.questions.length > 0
            ? receivedQuestions.questions
            : sellerQuestions.questions;

      if (!chosenQuestions.length) {
        continue;
      }

      const itemCache = await enrichItemInfo(chosenQuestions, token);

      allQuestions.push(
        ...mapQuestionsToFrontend(chosenQuestions, {
          id: account.id,
          nickname: identity.nickname,
          sellerId: identity.sellerId,
        }, itemCache)
      );
    } catch (error) {
      console.error(`[meli-questions] Error cuenta ${account.meli_nickname}:`, error);
    }
  }

  allQuestions.sort(
    (firstQuestion, secondQuestion) =>
      new Date(secondQuestion.date_created).getTime() - new Date(firstQuestion.date_created).getTime()
  );

  const response = NextResponse.json(allQuestions);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

async function syncQuestionsFromMeli(supabase: any, userId: string) {
  const accounts = await getLinkedAccountsForUser(userId);

  for (const account of accounts) {
    try {
      const token = await getValidToken(account);
      if (!token) {
        continue;
      }

      const identity = await resolveAccountIdentity(token, account);

      const sellerQuestions = await meliGet(
        `/questions/search?seller_id=${identity.sellerId}&api_version=4&limit=50`,
        token
      ) as { questions?: any[] } | null;

      const receivedQuestions = await meliGet(
        "/my/received_questions/search?api_version=4&limit=50",
        token
      ) as { questions?: any[] } | null;

      const questions =
        (sellerQuestions?.questions?.length ? sellerQuestions.questions : null) ??
        receivedQuestions?.questions ??
        [];

      for (const question of questions) {
        try {
          const itemData = await meliGet(
            `/items/${question.item_id}?attributes=id,title,thumbnail`,
            token
          ) as { title?: string; thumbnail?: string } | null;

          await supabase
            .from("meli_questions_sync")
            .upsert(
              {
                id: String(question.id),
                meli_user_id: identity.sellerId,
                item_id: question.item_id,
                title_item: itemData?.title || "Producto",
                item_thumbnail: String(itemData?.thumbnail || "").replace("http://", "https://"),
                question_text: question.text || "",
                status: question.status || "UNANSWERED",
                buyer_nickname: question.from?.nickname || `Usuario ${question.from?.id || ""}`,
                buyer_id: question.from?.id || null,
                meli_created_date: question.date_created,
                account_nickname: identity.nickname,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "id" }
            );
        } catch (error) {
          console.warn(`[sync] Error pregunta ${question.id}:`, error);
        }
      }

      const meliIds = questions.map((question: any) => String(question.id));
      const { data: dbQuestions } = await supabase
        .from("meli_questions_sync")
        .select("id")
        .eq("meli_user_id", identity.sellerId)
        .eq("status", "UNANSWERED");

      if (dbQuestions) {
        const staleIds = dbQuestions
          .filter((dbQuestion: any) => !meliIds.includes(dbQuestion.id))
          .map((dbQuestion: any) => dbQuestion.id);

        if (staleIds.length > 0) {
          await supabase
            .from("meli_questions_sync")
            .update({ status: "ANSWERED", updated_at: new Date().toISOString() })
            .in("id", staleIds);
        }
      }
    } catch (error) {
      console.error(`[sync] Error cuenta ${account.meli_nickname}:`, error);
    }
  }
}