import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

// Función para refrescar token
async function refreshToken(refreshToken: string) {
  const response = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: process.env.APPJEEZ_MELI_APP_ID || "",
      client_secret: process.env.APPJEEZ_MELI_SECRET_KEY || "",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`Error refreshing token: ${response.status}`);
  }

  return response.json();
}

// Función para obtener token válido (con auto-refresh)
async function getValidToken(account: any) {
  // Verificar si el token está vencido (con 5 minutos de margen)
  const isExpired = account.token_expiry_date && 
    new Date(account.token_expiry_date).getTime() < Date.now() + 5 * 60 * 1000;

  if (!isExpired) {
    return account.access_token_enc;
  }

  // Token vencido, intentar refrescar
  console.log(`[meli-answer] Token vencido para ${account.meli_nickname}, refrescando...`);
  
  if (!account.refresh_token_enc) {
    throw new Error("No hay refresh token disponible");
  }

  const newTokens = await refreshToken(account.refresh_token_enc);
  
  // Actualizar en DB
  const newExpiry = new Date(Date.now() + newTokens.expires_in * 1000).toISOString();
  await supabase
    .from("linked_meli_accounts")
    .update({
      access_token_enc: newTokens.access_token,
      refresh_token_enc: newTokens.refresh_token,
      token_expiry_date: newExpiry,
    })
    .eq("id", account.id);

  return newTokens.access_token;
}

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
    const { data: account, error: accountError } = await supabase
      .from("linked_meli_accounts")
      .select("id, meli_user_id, meli_nickname, access_token_enc, refresh_token_enc, token_expiry_date")
      .eq("id", meli_account_id)
      .single();

    if (accountError || !account?.access_token_enc) {
      return NextResponse.json(
        { error: "Cuenta no encontrada" },
        { status: 404 }
      );
    }

    console.log(`[meli-answer] Respondiendo para cuenta: ${account.meli_nickname}`);

    // Obtener token válido (con auto-refresh si es necesario)
    let token: string;
    try {
      token = await getValidToken(account);
    } catch (e) {
      console.error(`[meli-answer] Error obteniendo token:`, e);
      return NextResponse.json(
        { error: "Token inválido o expirado. Por favor, reconecta la cuenta." },
        { status: 401 }
      );
    }

    // Responder en MeLi
    const response = await fetch(`https://api.mercadolibre.com/questions/${question_id}/answers`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: answer_text }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Error desconocido" }));
      console.error(`[meli-answer] Error ${response.status} de MeLi:`, errorData);
      
      // Si es 403, el token no tiene permisos suficientes
      if (response.status === 403) {
        return NextResponse.json(
          { error: "La cuenta no tiene permisos para responder. Por favor, reconecta la cuenta con todos los permisos." },
          { status: 403 }
        );
      }
      
      return NextResponse.json(
        { error: "Error al responder", details: errorData },
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
