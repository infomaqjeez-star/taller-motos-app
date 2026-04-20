import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getValidToken } from "@/lib/meli";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key"
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question_id, answer_text, meli_account_id } = body;

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

    console.log(`[meli-answer] Respondiendo pregunta ${question_id} (usuario: ${userId}, cuenta: ${meli_account_id || 'auto-detect'})`);

    // Si tenemos meli_account_id, usar esa cuenta directamente
    if (meli_account_id) {
      const { data: account, error: accountError } = await supabase
        .from("linked_meli_accounts")
        .select("id, user_id, meli_user_id, meli_nickname, access_token_enc, refresh_token_enc, token_expiry_date, is_active")
        .eq("id", meli_account_id)
        .eq("user_id", userId)
        .eq("is_active", true)
        .single();

      if (accountError || !account) {
        console.error(`[meli-answer] Cuenta ${meli_account_id} no encontrada:`, accountError);
        return NextResponse.json(
          { error: "Cuenta no encontrada o no autorizada" },
          { status: 404 }
        );
      }

      // Usar getValidToken para obtener token desencriptado (con auto-refresh)
      const validToken = await getValidToken(account);
      
      if (!validToken) {
        console.error(`[meli-answer] No se pudo obtener token válido para ${account.meli_nickname}`);
        return NextResponse.json(
          { error: "Token inválido o expirado para la cuenta" },
          { status: 401 }
        );
      }

      console.log(`[meli-answer] Enviando respuesta con cuenta: ${account.meli_nickname}`);
      
      const response = await fetch("https://api.mercadolibre.com/answers", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${validToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question_id: question_id,
          text: answer_text
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`[meli-answer] ✅ Respuesta enviada exitosamente con ${account.meli_nickname}`);
        return NextResponse.json({ 
          status: "ok", 
          message: "Respuesta enviada",
          account: account.meli_nickname,
          data 
        });
      } else {
        const errorText = await response.text();
        console.error(`[meli-answer] ❌ Error ${response.status} de MeLi: ${errorText}`);
        return NextResponse.json(
          { error: `Error de Mercado Libre: ${response.status}`, details: errorText },
          { status: response.status }
        );
      }
    }

    // Fallback: si no tenemos meli_account_id, probar todas las cuentas (comportamiento anterior)
    console.log(`[meli-answer] No se proporcionó meli_account_id, probando todas las cuentas...`);
    
    const { data: accounts } = await supabase
      .from("linked_meli_accounts")
      .select("id, user_id, meli_user_id, meli_nickname, access_token_enc, refresh_token_enc, token_expiry_date, is_active")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (!accounts || accounts.length === 0) {
      return NextResponse.json(
        { error: "No hay cuentas activas" },
        { status: 404 }
      );
    }

    console.log(`[meli-answer] ${accounts.length} cuentas disponibles:`, accounts.map(a => `${a.meli_nickname}(${a.meli_user_id})`).join(', '));

    // Buscar la cuenta correcta probando cada una
    for (const account of accounts) {
      const validToken = await getValidToken(account);
      
      if (!validToken) {
        console.log(`[meli-answer] Saltando ${account.meli_nickname} - no se pudo obtener token válido`);
        continue;
      }

      try {
        console.log(`[meli-answer] Probando cuenta: ${account.meli_nickname}`);
        
        const response = await fetch("https://api.mercadolibre.com/answers", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${validToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            question_id: question_id,
            text: answer_text
          }),
        });

        if (response.ok) {
          const data = await response.json();
          console.log(`[meli-answer] ✅ Respuesta enviada con cuenta: ${account.meli_nickname}`);
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
