import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getValidToken } from "@/lib/meli";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key"
);

/**
 * POST /api/meli-answer
 *
 * Responde una pregunta de Mercado Libre.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question_id, answer_text, meli_account_id } = body;

    if (!question_id || !answer_text || !meli_account_id) {
      return NextResponse.json(
        { error: "Faltan campos requeridos: question_id, answer_text, meli_account_id" },
        { status: 400 }
      );
    }

    // Obtener los datos de la cuenta desde linked_meli_accounts
    const { data: account, error: accountError } = await supabase
      .from("linked_meli_accounts")
      .select("id, meli_user_id, meli_nickname, access_token_enc, refresh_token_enc, token_expiry_date")
      .eq("id", meli_account_id)
      .single();

    if (accountError || !account) {
      console.error(`[meli-answer] Cuenta no encontrada: ${meli_account_id}`, accountError);
      return NextResponse.json(
        { error: "Cuenta de Mercado Libre no encontrada" },
        { status: 404 }
      );
    }

    // Obtener token válido (con auto-refresh si es necesario)
    const validToken = await getValidToken(account as any);
    
    if (!validToken) {
      return NextResponse.json(
        { error: "No se pudo obtener token válido para la cuenta" },
        { status: 401 }
      );
    }

    // Responder la pregunta en MeLi
    const response = await fetch(`https://api.mercadolibre.com/questions/${question_id}/answers`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${validToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: answer_text }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Error desconocido" }));
      console.error(`[meli-answer] Error al responder:`, errorData);
      return NextResponse.json(
        { error: "Error al responder en Mercado Libre", details: errorData },
        { status: response.status }
      );
    }

    return NextResponse.json({ status: "ok", message: "Respuesta enviada correctamente" });
  } catch (error) {
    console.error("[meli-answer] Error inesperado:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
