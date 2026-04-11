import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

// Decrypt function matching the one in lib/meli.ts
async function decrypt(enc64: string): Promise<string> {
  const ENC_KEY = process.env.APPJEEZ_MELI_ENCRYPTION_KEY || "";
  
  // Derive key using PBKDF2
  const enc = new TextEncoder();
  const km = await crypto.subtle.importKey("raw", enc.encode(ENC_KEY), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode("appjeez-meli-salt"), iterations: 100000, hash: "SHA-256" },
    km,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );
  
  // Decrypt
  const combined = Uint8Array.from(atob(enc64), c => c.charCodeAt(0));
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: combined.slice(0, 12) },
    key,
    combined.slice(12)
  );
  
  return new TextDecoder().decode(plain);
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
      .select("access_token_enc, refresh_token_enc, token_expiry_date")
      .eq("id", meli_account_id)
      .single();

    if (accountError || !account?.access_token_enc) {
      return NextResponse.json(
        { error: "Cuenta no encontrada" },
        { status: 404 }
      );
    }

    // Desencriptar token
    let token: string;
    try {
      token = await decrypt(account.access_token_enc);
    } catch (e) {
      console.error("[meli-answer] Error desencriptando token:", e);
      return NextResponse.json(
        { error: "Error al desencriptar token" },
        { status: 500 }
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
      const errorData = await response.json().catch(() => ({ message: "Error" }));
      console.error("[meli-answer] Error MeLi:", errorData);
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
