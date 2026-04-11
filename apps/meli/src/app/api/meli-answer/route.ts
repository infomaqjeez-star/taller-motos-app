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
    const { question_id, answer_text } = body;

    if (!question_id || !answer_text) {
      return NextResponse.json(
        { error: "Faltan campos requeridos" },
        { status: 400 }
      );
    }

    // Obtener cuenta MAQJEEZ (única cuenta activa)
    const { data: account } = await supabase
      .from("linked_meli_accounts")
      .select("id, meli_user_id, meli_nickname, access_token_enc")
      .eq("is_active", true)
      .single();

    if (!account?.access_token_enc) {
      return NextResponse.json(
        { error: "No hay cuenta activa" },
        { status: 404 }
      );
    }

    console.log(`[meli-answer] Cuenta: ${account.meli_nickname} (ID: ${account.meli_user_id})`);
    console.log(`[meli-answer] Token: ${account.access_token_enc.substring(0, 30)}...`);
    console.log(`[meli-answer] Pregunta: ${question_id}`);
    console.log(`[meli-answer] Respuesta: ${answer_text.substring(0, 50)}...`);

    // Intentar responder usando el endpoint /answers (formato alternativo)
    const response = await fetch("https://api.mercadolibre.com/answers", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${account.access_token_enc}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question_id: question_id,
        text: answer_text
      }),
    });

    console.log(`[meli-answer] Status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[meli-answer] Error ${response.status}: ${errorText}`);
      
      // Si es 400, puede ser que la pregunta ya fue respondida o datos incorrectos
      if (response.status === 400) {
        return NextResponse.json(
          { error: "Datos incorrectos o pregunta ya respondida", details: errorText },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: "Error al responder", details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(`[meli-answer] Éxito:`, data);

    return NextResponse.json({ 
      status: "ok", 
      message: "Respuesta enviada",
      data 
    });
  } catch (error) {
    console.error("[meli-answer] Error:", error);
    return NextResponse.json(
      { error: "Error interno" },
      { status: 500 }
    );
  }
}
