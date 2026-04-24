import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/meli";

export const dynamic = "force-dynamic";

type UnifiedAccountBucket = {
  accountId: string;
  nickname: string;
  sellerId: string;
  questions: any[];
  total: number;
  responseTime: any | null;
};

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const supabase = getSupabase();
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

    const [questionsResponse, responseTimeResponse] = await Promise.all([
      fetch(new URL("/api/meli-questions", request.url), {
        headers: {
          authorization: request.headers.get("authorization") || "",
        },
        cache: "no-store",
      }),
      fetch(new URL("/api/meli-questions/response-time", request.url), {
        headers: {
          authorization: request.headers.get("authorization") || "",
        },
        cache: "no-store",
      }),
    ]);

    const questionsData = questionsResponse.ok ? await questionsResponse.json() : [];
    const responseTimesData = responseTimeResponse.ok ? await responseTimeResponse.json() : [];

    const accountsMap = new Map<string, UnifiedAccountBucket>();

    for (const question of questionsData ?? []) {
      const accountId = String(question.meli_account_id);
      const existing: UnifiedAccountBucket =
        accountsMap.get(accountId) ??
        {
          accountId,
          nickname: question.meli_accounts?.nickname || "Cuenta",
          sellerId: "",
          questions: [],
          total: 0,
          responseTime: null,
        };

      existing.questions.push(question);
      existing.total = existing.questions.length;
      accountsMap.set(accountId, existing);
    }

    for (const responseTime of responseTimesData ?? []) {
      const existing =
        accountsMap.get(responseTime.accountId) ??
        {
          accountId: responseTime.accountId,
          nickname: responseTime.nickname,
          sellerId: responseTime.sellerId,
          questions: [],
          total: 0,
          responseTime: null,
        };

      existing.nickname = responseTime.nickname || existing.nickname;
      existing.sellerId = responseTime.sellerId || existing.sellerId;
      existing.responseTime = responseTime;
      accountsMap.set(responseTime.accountId, existing);
    }

    const accounts = Array.from(accountsMap.values()).sort((a, b) =>
      a.nickname.localeCompare(b.nickname)
    );

    const response = NextResponse.json({
      questions: accounts,
      accounts: accounts.map((account) => ({
        accountId: account.accountId,
        nickname: account.nickname,
        sellerId: account.sellerId,
        total: account.total,
        responseTime: account.responseTime,
      })),
      totalQuestions: questionsData?.length || 0,
      duration_ms: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });

    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error: any) {
    console.error("[QuestionsUnified] Error fatal:", error);

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