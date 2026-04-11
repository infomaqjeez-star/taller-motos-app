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
      .select("id, meli_user_id, meli_nickname, access_token_enc")
      .eq("id", meli_account_id)
      .single();

    if (!account?.access_token_enc) {
      return NextResponse.json(
        { error: "Cuenta no encontrada" },
        { status: 404 }
      );
    }

    console.log(`[meli-answer] Respondiendo pregunta ${question_id} para cuenta: ${account.meli_nickname} (ID: ${account.id})`);
    console.log(`[meli-answer] Token preview: ${account.access_token_enc?.substring(0, 30)}...`);

    // Primero verificar que la pregunta existe y pertenece a esta cuenta
    const questionCheck = await fetch(`https://api.mercadolibre.com/questions/${question_id}`, {
      headers: { "Authorization": `Bearer ${account.access_token_enc}` },
    });
    
    if (!questionCheck.ok) {
      console.error(`[meli-answer] Pregunta ${question_id} no encontrada con el token de ${account.meli_nickname}`);
      return NextResponse.json(
        { error: `La pregunta no existe o no pertenece a la cuenta ${account.meli_nickname}. Verifica que estés usando la cuenta correcta.` },
        { status: 404 }
      );
    }
    
    const questionData = await questionCheck.json();
    console.log(`[meli-answer] Pregunta encontrada: ID=${questionData.id}, seller_id=${questionData.seller_id}, status=${questionData.status}`);
    console.log(`[meli-answer] Cuenta usada: ${account.meli_nickname}, meli_user_id=${account.meli_user_id}`);

    // Verificar que la pregunta pertenece a esta cuenta
    if (String(questionData.seller_id) !== String(account.meli_user_id)) {
      console.error(`[meli-answer] ERROR: La pregunta ${question_id} pertenece al seller ${questionData.seller_id}, pero estamos usando la cuenta ${account.meli_user_id}`);
      return NextResponse.json(
        { error: `Esta pregunta pertenece a otra cuenta. Seller ID: ${questionData.seller_id}, Cuenta usada: ${account.meli_user_id}` },
        { status: 403 }
      );
    }

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
