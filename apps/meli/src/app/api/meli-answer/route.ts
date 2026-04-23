import { NextRequest, NextResponse } from "next/server";
import { getActiveAccounts, getSupabase, getValidToken } from "@/lib/meli";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const questionId = Number(body.question_id ?? body.questionId);
    const rawText = body.answer_text ?? body.text;
    const answerText = typeof rawText === "string" ? rawText.trim() : "";
    const accountSelector = body.meli_account_id ?? body.accountId ?? body.account_id;

    if (!Number.isFinite(questionId) || !answerText) {
      return NextResponse.json(
        { status: "error", error: "Faltan question_id o answer_text" },
        { status: 400 }
      );
    }

    const accounts = await getActiveAccounts();
    let account =
      accountSelector != null
        ? accounts.find(
            (item) =>
              item.id === accountSelector ||
              String(item.meli_user_id) === String(accountSelector)
          ) ?? null
        : null;

    if (!account && accounts.length > 0) {
      for (const currentAccount of accounts) {
        const token = await getValidToken(currentAccount);

        if (!token) {
          continue;
        }

        const questionResponse = await fetch(
          `https://api.mercadolibre.com/questions/${questionId}?api_version=4`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal: AbortSignal.timeout(8000),
          }
        );

        if (!questionResponse.ok) {
          continue;
        }

        const questionData = await questionResponse.json();

        if (String(questionData.seller_id) === String(currentAccount.meli_user_id)) {
          account = currentAccount;
          break;
        }
      }
    }

    if (!account) {
      return NextResponse.json(
        { status: "error", error: "Cuenta no encontrada", code: "ACCOUNT_NOT_FOUND" },
        { status: 404 }
      );
    }

    const token = await getValidToken(account);

    if (!token) {
      return NextResponse.json(
        { status: "error", error: "Token inválido o expirado", code: "INVALID_TOKEN" },
        { status: 401 }
      );
    }

    const meliResponse = await fetch("https://api.mercadolibre.com/answers", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        question_id: questionId,
        text: answerText,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!meliResponse.ok) {
      const errorText = await meliResponse.text().catch(() => "");
      let errorData: unknown = errorText;

      try {
        errorData = JSON.parse(errorText);
      } catch {}

      const errorMessage =
        typeof errorData === "object" &&
        errorData !== null &&
        "message" in errorData &&
        typeof (errorData as { message?: unknown }).message === "string"
          ? (errorData as { message: string }).message
          : `Error HTTP ${meliResponse.status}`;

      const errorCode =
        typeof errorData === "object" &&
        errorData !== null &&
        "error" in errorData &&
        typeof (errorData as { error?: unknown }).error === "string"
          ? (errorData as { error: string }).error
          : "MELI_API_ERROR";

      return NextResponse.json(
        {
          status: "error",
          error: errorMessage,
          code: errorCode,
          details: errorData,
        },
        { status: meliResponse.status }
      );
    }

    const responseData = await meliResponse.json().catch(() => null);

    try {
      const supabase = getSupabase();

      await supabase
        .from("meli_questions_sync")
        .update({
          status: "ANSWERED",
          updated_at: new Date().toISOString(),
        })
        .eq("id", String(questionId));
    } catch (databaseError) {
      console.warn("[meli-answer] No se pudo actualizar meli_questions_sync:", databaseError);
    }

    return NextResponse.json({
      status: "ok",
      message: "Respuesta enviada exitosamente",
      question_id: questionId,
      account: account.nickname,
      meli_response: responseData,
    });
  } catch (error) {
    console.error("[meli-answer] Error crítico:", error);

    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Error interno",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}