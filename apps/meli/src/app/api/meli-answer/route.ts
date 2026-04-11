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
    let questionData = null;

    for (const account of accounts) {
      if (!account.access_token_enc?.startsWith('APP_USR')) {
        console.log(`[meli-answer] Saltando ${account.meli_nickname} - token inválido`);
        continue;
      }

      try {
        console.log(`[meli-answer] Probando cuenta: ${account.meli_nickname} (meli_user_id: ${account.meli_user_id})`);
        
        const checkRes = await fetch(`https://api.mercadolibre.com/questions/${question_id}`, {
          headers: { "Authorization": `Bearer ${account.access_token_enc}` },
          signal: AbortSignal.timeout(5000),
        });

        if (checkRes.ok) {
          const qData = await checkRes.json();
          console.log(`[meli-answer] Pregunta encontrada con ${account.meli_nickname}! Seller ID: ${qData.seller_id}`);
          
          // Verificar que la pregunta pertenece a esta cuenta
          if (String(qData.seller_id) === String(account.meli_user_id)) {
            correctAccount = account;
            questionData = qData;
            console.log(`[meli-answer] ✅ CUENTA CORRECTA IDENTIFICADA: ${account.meli_nickname}`);
            break;
          } else {
            console.log(`[meli-answer] ⚠️ Pregunta accesible pero seller_id ${qData.seller_id} != ${account.meli_user_id}`);
          }
        } else {
          console.log(`[meli-answer] Cuenta ${account.meli_nickname} no puede acceder a la pregunta (status: ${checkRes.status})`);
        }
      } catch (e) {
        console.log(`[meli-answer] Error probando ${account.meli_nickname}:`, e);
      }
    }

    if (!correctAccount) {
      return NextResponse.json(
        { error: "No se encontró una cuenta con acceso a esta pregunta. Verifica que la pregunta exista y pertenezca a una de tus cuentas conectadas." },
        { status: 404 }
      );
    }

    // RESPONDER CON LA CUENTA CORRECTA
    console.log(`[meli-answer] Enviando respuesta con cuenta: ${correctAccount.meli_nickname}`);
    
    const response = await fetch(`https://api.mercadolibre.com/questions/${question_id}/answers`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${correctAccount.access_token_enc}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: answer_text }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Error" }));
      console.error(`[meli-answer] Error ${response.status} de MeLi:`, errorData);
      return NextResponse.json(
        { error: "Error al responder", details: errorData },
        { status: response.status }
      );
    }

    return NextResponse.json({ 
      status: "ok", 
      message: "Respuesta enviada correctamente",
      account: correctAccount.meli_nickname 
    });
  } catch (error) {
    console.error("[meli-answer] Error inesperado:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
