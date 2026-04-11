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

    // Obtener cuenta con tokens
    const { data: account, error: accountError } = await supabase
      .from("linked_meli_accounts")
      .select("access_token_enc, refresh_token_enc, token_expiry_date")
      .eq("id", meli_account_id)
      .single();

    if (accountError || !account?.access_token_enc) {
      return NextResponse.json(
        { error: "Cuenta no encontrada" },
        { status: 404 }
      );
    }

    // Verificar si el token está vencido
    const isExpired = account.token_expiry_date && 
      new Date(account.token_expiry_date).getTime() < Date.now() + 5 * 60 * 1000;

    let token = account.access_token_enc;

    // Si está vencido, intentar refresh (simplificado)
    if (isExpired && account.refresh_token_enc) {
      try {
        const refreshRes = await fetch("https://api.mercadolibre.com/oauth/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "refresh_token",
            client_id: process.env.APPJEEZ_MELI_APP_ID || "",
            client_secret: process.env.APPJEEZ_MELI_SECRET_KEY || "",
            refresh_token: account.refresh_token_enc,
          }),
        });

        if (refreshRes.ok) {
          const newTokens = await refreshRes.json();
          token = newTokens.access_token;
          
          // Actualizar en DB
          await supabase
            .from("linked_meli_accounts")
            .update({
              access_token_enc: newTokens.access_token,
              refresh_token_enc: newTokens.refresh_token,
              token_expiry_date: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
            })
            .eq("id", meli_account_id);
        }
      } catch (e) {
        console.error("[meli-answer] Error refresh:", e);
      }
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
      const errorData = await response.json().catch(() => ({ message: "Error" }));
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
