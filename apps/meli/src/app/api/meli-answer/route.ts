import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question_id, answer_text, meli_account_id } = body;

    if (!question_id || !answer_text || !meli_account_id) {
      return NextResponse.json(
        { error: "Faltan campos requeridos" },
        { status: 400 }
      );
    }

    // Obtener cuenta
    const { data: account } = await supabase
      .from("linked_meli_accounts")
      .select("access_token_enc, meli_nickname")
      .eq("id", meli_account_id)
      .single();

    if (!account?.access_token_enc) {
      return NextResponse.json(
        { error: "Cuenta no encontrada" },
        { status: 404 }
      );
    }

    console.log(`[meli-answer] Respondiendo para: ${account.meli_nickname}`);

    // Responder en MeLi
    const response = await fetch(`https://api.mercadolibre.com/questions/${question_id}/answers`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${account.access_token_enc}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: answer_text }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Error" }));
      console.error(`[meli-answer] Error ${response.status}:`, errorData);
      return NextResponse.json(
        { error: "Error al responder", details: errorData },
        { status: response.status }
      );
    }

    return NextResponse.json({ status: "ok", message: "Respuesta enviada" });
  } catch (error) {
    console.error("[meli-answer] Error:", error);
    return NextResponse.json(
      { error: "Error interno" },
      { status: 500 }
    );
  }
}
