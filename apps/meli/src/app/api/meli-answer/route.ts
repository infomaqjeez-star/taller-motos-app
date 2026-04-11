import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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

    // Por ahora, responder directamente sin verificar la cuenta
    // Esto es temporal para verificar que el endpoint funciona
    console.log(`[meli-answer] Recibido: question_id=${question_id}, meli_account_id=${meli_account_id}`);

    return NextResponse.json({ 
      status: "ok", 
      message: "Endpoint funcionando - falta implementar respuesta real",
      received: { question_id, meli_account_id }
    });
  } catch (error) {
    console.error("[meli-answer] Error:", error);
    return NextResponse.json(
      { error: "Error interno" },
      { status: 500 }
    );
  }
}
