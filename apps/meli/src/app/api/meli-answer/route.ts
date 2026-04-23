import { NextRequest, NextResponse } from "next/server";
import { getActiveAccounts, getValidToken, getSupabase } from "@/lib/meli";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Aceptar ambos formatos de campo (frontend envía question_id/answer_text/meli_account_id)
    const question_id = body.question_id ?? body.questionId;
    const answer_text = body.answer_text ?? body.text;
    const meli_account_id = body.meli_account_id ?? body.accountId;

    if (!question_id || !answer_text) {
      return NextResponse.json(
        { status: "error", error: "Faltan question_id o answer_text" },
        { status: 400 }
      );
    }

    // Buscar la cuenta correcta para obtener el token
    const accounts = await getActiveAccounts();
    let account = meli_account_id
      ? accounts.find(a => a.id === meli_account_id || String(a.meli_user_id) === meli_account_id)
      : null;

    // Si no se encontró por meli_account_id, intentar buscar la cuenta que tiene esa pregunta
    if (!account && accounts.length > 0) {
      for (const acc of accounts) {
        const token = await getValidToken(acc);
        if (!token) continue;
        const checkRes = await fetch(
          `https://api.mercadolibre.com/questions/${question_id}?api_version=4`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (checkRes.ok) {
          const qData = await checkRes.json();
          if (String(qData.seller_id) === String(acc.meli_user_id)) {
            account = acc;
            break;
          }
        }
      }
    }

    if (!account) {
      console.error("[meli-answer] No se encontró cuenta para pregunta:", question_id);
      return NextResponse.json(
        { status: "error", error: "Cuenta no encontrada", code: "ACCOUNT_NOT_FOUND" },
        { status: 404 }
      );
    }

    const token = await getValidToken(account);
    if (!token) {
      console.error("[meli-answer] Token inválido para cuenta:", account.nickname);
      return NextResponse.json(
        { status: "error", error: "Token inválido o expirado", code: "INVALID_TOKEN" },
        { status: 401 }
      );
    }

    // Enviar respuesta a MeLi API
    console.log("[meli-answer] Enviando respuesta a MeLi:", { question_id, account: account.nickname });
    const meliRes = await fetch("https://api.mercadolibre.com/answers", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question_id: Number(question_id),
        text: answer_text,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!meliRes.ok) {
      const errorData = await meliRes.json().catch(() => ({}));
      console.error("[meli-answer] Error de MeLi API:", meliRes.status, errorData);
      return NextResponse.json(
        {
          status: "error",
          error: errorData.message || `Error HTTP ${meliRes.status}`,
          code: errorData.error || "MELI_API_ERROR",
          details: errorData,
        },
        { status: meliRes.status }
      );
    }

    const responseData = await meliRes.json();
    console.log("[meli-answer] Respuesta enviada exitosamente:", { question_id, account: account.nickname });

    // Actualizar estado en la base de datos
    try {
      const supabase = getSupabase();
      await supabase
        .from("meli_questions_sync")
        .update({ status: "ANSWERED", updated_at: new Date().toISOString() })
        .eq("id", String(question_id));
    } catch (dbErr) {
      console.warn("[meli-answer] No se pudo actualizar BD (no crítico):", dbErr);
    }

    return NextResponse.json({
      status: "ok",
      message: "Respuesta enviada exitosamente",
      question_id,
      account: account.nickname,
      meli_response: responseData,
    });
  } catch (error) {
    console.error("[meli-answer] Error crítico:", error);
    return NextResponse.json(
      { status: "error", error: (error as Error).message, code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
