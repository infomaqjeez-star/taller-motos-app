// modules/questions/api/answer/route.ts
// Endpoint para responder preguntas desde el buzón unificado

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createMeliClient } from "../../../shared/meli-client";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question_id, answer_text } = body;

    if (!question_id || !answer_text?.trim()) {
      return NextResponse.json(
        { error: "Faltan campos requeridos: question_id, answer_text" },
        { status: 400 }
      );
    }

    // Auth
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { data: { user } } = await supabase.auth.getUser(authHeader.slice(7));
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    console.log(`[questions/answer] Respondiendo pregunta ${question_id}`);

    // Obtener la pregunta de la base de datos
    const { data: question, error: questionError } = await supabase
      .from("unified_questions")
      .select("*, meli_accounts:meli_user_id(id)")
      .eq("question_id", question_id)
      .single();

    if (questionError || !question) {
      return NextResponse.json(
        { error: "Pregunta no encontrada" },
        { status: 404 }
      );
    }

    // Verificar que la pregunta pertenece al usuario
    const { data: account } = await supabase
      .from("linked_meli_accounts")
      .select("id")
      .eq("meli_user_id", question.meli_user_id)
      .eq("user_id", user.id)
      .single();

    if (!account) {
      return NextResponse.json(
        { error: "No tienes permiso para responder esta pregunta" },
        { status: 403 }
      );
    }

    // Crear cliente MeLi y responder
    const client = await createMeliClient(account.id);
    const result = await client.answerQuestion(question_id, answer_text.trim());

    console.log(`[questions/answer] Respuesta enviada:`, result);

    // Actualizar en base de datos
    await supabase
      .from("unified_questions")
      .update({
        status: "ANSWERED",
        answer_text: answer_text.trim(),
        answer_date: new Date().toISOString(),
      })
      .eq("question_id", question_id);

    return NextResponse.json({
      success: true,
      message: "Respuesta enviada correctamente",
      data: result,
    });

  } catch (error) {
    console.error("[questions/answer] Error:", error);
    return NextResponse.json(
      { error: "Error al responder", details: String(error) },
      { status: 500 }
    );
  }
}
