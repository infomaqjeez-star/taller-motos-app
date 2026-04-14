import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key"
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

    // Auth: verificar usuario autenticado
    const authHeader = request.headers.get("authorization");
    let userId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.slice(7));
      if (user) userId = user.id;
    }

    if (!userId) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    console.log(`[meli-answer] Respondiendo pregunta ${question_id} (usuario: ${userId})`);

    // Solo obtener cuentas del usuario autenticado
    const { data: accounts } = await supabase
      .from("linked_meli_accounts")
      .select("id, meli_user_id, meli_nickname, access_token_enc")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (!accounts || accounts.length === 0) {
      return NextResponse.json(
        { error: "No hay cuentas activas" },
        { status: 404 }
      );
    }

    console.log(`[meli-answer] ${accounts.length} cuentas del usuario:`, accounts.map(a => `${a.meli_nickname}(${a.meli_user_id})`).join(', '));

    // Buscar la cuenta correcta probando cada una
    for (const account of accounts) {
      if (!account.access_token_enc?.startsWith('APP_USR')) {
        console.log(`[meli-answer] Saltando ${account.meli_nickname} - token invalido`);
        continue;
      }

      try {
        console.log(`[meli-answer] Probando cuenta: ${account.meli_nickname}`);
        
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
          const data = await response.json();
          console.log(`[meli-answer] Respuesta enviada con cuenta: ${account.meli_nickname}`);
          return NextResponse.json({ 
            status: "ok", 
            message: "Respuesta enviada",
            account: account.meli_nickname,
            data 
          });
        } else if (response.status === 400 || response.status === 404) {
          console.log(`[meli-answer] Cuenta ${account.meli_nickname} no puede responder (status: ${response.status})`);
          continue;
        } else {
          const errorText = await response.text();
          console.error(`[meli-answer] Error ${response.status} con ${account.meli_nickname}: ${errorText}`);
        }
      } catch (e) {
        console.log(`[meli-answer] Error probando ${account.meli_nickname}:`, e);
      }
    }

    return NextResponse.json(
      { error: "No se pudo responder la pregunta con ninguna cuenta." },
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
