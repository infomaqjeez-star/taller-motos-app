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
        { error: "Faltan campos requeridos: question_id, answer_text" },
        { status: 400 }
      );
    }

    console.log(`[meli-answer] Respondiendo pregunta ${question_id}`);

    // OBTENER TODAS LAS CUENTAS ACTIVAS
    const { data: accounts } = await supabase
      .from("linked_meli_accounts")
      .select("id, meli_user_id, meli_nickname, access_token_enc")
      .eq("is_active", true);

    if (!accounts || accounts.length === 0) {
      return NextResponse.json(
        { error: "No hay cuentas activas" },
        { status: 404 }
      );
    }

    console.log(`[meli-answer] ${accounts.length} cuentas disponibles:`, accounts.map(a => `${a.meli_nickname}(${a.meli_user_id})`).join(', '));

    // BUSCAR LA CUENTA CORRECTA PROBANDO CADA UNA
    let correctAccount = null;

    for (const account of accounts) {
      if (!account.access_token_enc?.startsWith('APP_USR')) {
        console.log(`[meli-answer] Saltando ${account.meli_nickname} - token inválido`);
        continue;
      }

      try {
        console.log(`[meli-answer] Probando cuenta: ${account.meli_nickname} (meli_user_id: ${account.meli_user_id})`);
        
        // Intentar responder directamente
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

        if (response.ok) {
          correctAccount = account;
          const data = await response.json();
          console.log(`[meli-answer] ✅ Respuesta enviada con cuenta: ${account.meli_nickname}`);
          return NextResponse.json({ 
            status: "ok", 
            message: "Respuesta enviada",
            account: account.meli_nickname,
            data 
          });
        } else if (response.status === 400 || response.status === 404) {
          // Pregunta no pertenece a esta cuenta, probar siguiente
          console.log(`[meli-answer] Cuenta ${account.meli_nickname} no puede responder esta pregunta (status: ${response.status})`);
          continue;
        } else {
          // Otro error, guardar para mostrar
          const errorText = await response.text();
          console.error(`[meli-answer] Error ${response.status} con ${account.meli_nickname}: ${errorText}`);
        }
      } catch (e) {
        console.log(`[meli-answer] Error probando ${account.meli_nickname}:`, e);
      }
    }

    return NextResponse.json(
      { error: "No se pudo responder la pregunta con ninguna cuenta. Verifica que la pregunta exista y pertenezca a una de tus cuentas." },
      { status: 404 }
    );
  } catch (error) {
    console.error("[meli-answer] Error inesperado:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
