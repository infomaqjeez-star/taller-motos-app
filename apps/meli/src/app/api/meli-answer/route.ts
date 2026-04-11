import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

// Simple decrypt function inline
async function decryptToken(enc64: string): Promise<string> {
  const ENC_KEY = process.env.APPJEEZ_MELI_ENCRYPTION_KEY || "";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(ENC_KEY),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  const derivedKey = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: new TextEncoder().encode("appjeez-meli-salt"), iterations: 100000, hash: "SHA-256" },
    key,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );
  const combined = Uint8Array.from(atob(enc64), c => c.charCodeAt(0));
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: combined.slice(0, 12) }, derivedKey, combined.slice(12));
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
      .select("access_token_enc")
      .eq("id", meli_account_id)
      .single();

    if (accountError || !account?.access_token_enc) {
      return NextResponse.json(
        { error: "Cuenta no encontrada" },
        { status: 404 }
      );
    }

    // Desencriptar token
    const token = await decryptToken(account.access_token_enc);

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

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("[meli-answer] Error:", error);
    return NextResponse.json(
      { error: "Error interno" },
      { status: 500 }
    );
  }
}
