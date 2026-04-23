import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getValidToken, type LinkedMeliAccount } from "@/lib/meli";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const dynamic = "force-dynamic";

type AccountResult = {
  accountId: string;
  nickname: string;
  sellerId: string;
  questions: any[];
  total: number;
  responseTime: any | null;
  error?: string;
};

const QUESTIONS_LIMIT = 50;
const ACCOUNT_TIMEOUT_MS = 12000;
const RETRY_DELAY_MS = 700;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => reject(new Error("Timeout")), timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 2): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      const response = await fetch(url, options);

      if ((response.status === 429 || response.status >= 500) && attempt <= retries) {
        await sleep(RETRY_DELAY_MS * attempt);
        continue;
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Error de red");

      if (attempt <= retries) {
        await sleep(RETRY_DELAY_MS * attempt);
      }
    }
  }

  throw lastError ?? new Error("No se pudo completar la solicitud");
}

async function fetchResponseTime(token: string, sellerId: string): Promise<any | null> {
  try {
    const response = await fetch(
      `https://api.mercadolibre.com/users/${sellerId}/questions/response_time`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch {
    return null;
  }
}

async function enrichQuestionsWithItems(
  questions: any[],
  headers: Record<string, string>
): Promise<any[]> {
  const itemCache = new Map<string, { title: string; thumbnail: string }>();
  const uniqueItems = [...new Set(questions.map((question: any) => question.item_id).filter(Boolean))];

  for (let index = 0; index < uniqueItems.length; index += 5) {
    const batch = uniqueItems.slice(index, index + 5);

    await Promise.allSettled(
      batch.map(async (itemId: string) => {
        try {
          const response = await fetch(
            `https://api.mercadolibre.com/items/${itemId}?attributes=id,title,thumbnail`,
            {
              headers,
              signal: AbortSignal.timeout(3000),
            }
          );

          if (!response.ok) {
            return;
          }

          const itemData = await response.json();

          itemCache.set(itemId, {
            title: itemData.title || itemId,
            thumbnail: String(itemData.thumbnail || "").replace("http://", "https://"),
          });
        } catch {}
      })
    );
  }

  return questions.map((question: any) => ({
    ...question,
    item_title: itemCache.get(question.item_id)?.title || question.item_title || question.item_id,
    item_thumbnail: itemCache.get(question.item_id)?.thumbnail || question.item_thumbnail || "",
  }));
}

async function fetchAccountQuestions(account: LinkedMeliAccount): Promise<AccountResult> {
  const baseResult: AccountResult = {
    accountId: account.id,
    nickname: account.meli_nickname,
    sellerId: String(account.meli_user_id),
    questions: [],
    total: 0,
    responseTime: null,
  };

  const token = await getValidToken(account);

  if (!token) {
    return {
      ...baseResult,
      error: "token_expired",
    };
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };

  const response = await fetchWithRetry(
    `https://api.mercadolibre.com/questions/search?seller_id=${account.meli_user_id}&status=UNANSWERED&api_version=4&limit=${QUESTIONS_LIMIT}&sort_fields=date_created&sort_types=DESC`,
    {
      headers,
      signal: AbortSignal.timeout(8000),
    }
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");

    return {
      ...baseResult,
      error: errorText ? `HTTP ${response.status}: ${errorText}` : `HTTP ${response.status}`,
    };
  }

  const [questionsData, responseTime] = await Promise.all([
    response.json(),
    fetchResponseTime(token, String(account.meli_user_id)),
  ]);

  const rawQuestions = questionsData.questions || [];
  const enrichedQuestions = await enrichQuestionsWithItems(rawQuestions, headers);

  return {
    ...baseResult,
    questions: enrichedQuestions,
    total: questionsData.total || questionsData.paging?.total || enrichedQuestions.length || 0,
    responseTime,
  };
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const authHeader = request.headers.get("authorization");
    let userId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(token);

      if (!error && user) {
        userId = user.id;
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: "No autorizado", questions: [], accounts: [] },
        { status: 401 }
      );
    }

    const { data: accounts, error: accountsError } = await supabase
      .from("linked_meli_accounts")
      .select("id, user_id, meli_user_id, meli_nickname, is_active, access_token_enc, refresh_token_enc, token_expiry_date")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (accountsError) {
      return NextResponse.json(
        { error: "Error obteniendo cuentas", questions: [], accounts: [] },
        { status: 500 }
      );
    }

    if (!accounts?.length) {
      const emptyResponse = NextResponse.json({
        questions: [],
        accounts: [],
        totalQuestions: 0,
        duration_ms: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      });

      emptyResponse.headers.set("Cache-Control", "no-store");
      return emptyResponse;
    }

    const results = await Promise.all(
      accounts.map((account) =>
        withTimeout(fetchAccountQuestions(account as LinkedMeliAccount), ACCOUNT_TIMEOUT_MS).catch((error: any) => ({
          accountId: account.id,
          nickname: account.meli_nickname,
          sellerId: String(account.meli_user_id),
          questions: [],
          total: 0,
          responseTime: null,
          error: error?.message || "Timeout",
        }))
      )
    );

    const response = NextResponse.json({
      questions: results,
      accounts: results.map((result) => ({
        accountId: result.accountId,
        nickname: result.nickname,
        sellerId: result.sellerId,
        total: result.total,
        error: result.error ?? null,
        responseTime: result.responseTime,
      })),
      totalQuestions: results.reduce((sum, result) => sum + result.questions.length, 0),
      duration_ms: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });

    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error: any) {
    console.error("[Questions] Error fatal:", error);

    return NextResponse.json(
      {
        error: error?.message || "Error interno del servidor",
        questions: [],
        accounts: [],
      },
      { status: 500 }
    );
  }
}