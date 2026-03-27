import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic  = "force-dynamic";
export const revalidate = 0;

const SUPA_URL    = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ENC_KEY     = process.env.APPJEEZ_MELI_ENCRYPTION_KEY!;

async function deriveKey(passphrase: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const km  = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode("appjeez-meli-salt"), iterations: 100000, hash: "SHA-256" },
    km, { name: "AES-GCM", length: 256 }, false, ["decrypt"]
  );
}
async function decrypt(enc64: string, pass: string): Promise<string> {
  const key      = await deriveKey(pass);
  const combined = Uint8Array.from(atob(enc64), c => c.charCodeAt(0));
  const plain    = await crypto.subtle.decrypt({ name: "AES-GCM", iv: combined.slice(0, 12) }, key, combined.slice(12));
  return new TextDecoder().decode(plain);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      question_id:    number;
      answer_text:    string;
      meli_account_id?: string; // UUID de Supabase (preferido)
      meli_user_id?:  string;   // fallback
    };

    const { question_id, answer_text, meli_account_id, meli_user_id } = body;

    if (!question_id || !answer_text?.trim()) {
      return NextResponse.json({ error: "question_id y answer_text son requeridos" }, { status: 400 });
    }

    const supabase = createClient(SUPA_URL, SERVICE_KEY);

    // Buscar la cuenta por ID o meli_user_id
    let query = supabase.from("meli_accounts").select("id, meli_user_id, nickname, access_token_enc").eq("status", "active");
    if (meli_account_id) {
      query = query.eq("id", meli_account_id);
    } else if (meli_user_id) {
      query = query.eq("meli_user_id", meli_user_id);
    } else {
      return NextResponse.json({ error: "Se requiere meli_account_id o meli_user_id" }, { status: 400 });
    }

    const { data: accounts, error } = await query.limit(1);
    if (error || !accounts?.length) {
      return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
    }

    const acc   = accounts[0];
    const token = await decrypt(acc.access_token_enc, ENC_KEY);

    // Enviar respuesta directamente a MeLi
    const meliRes = await fetch(`https://api.mercadolibre.com/answers`, {
      method:  "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body:    JSON.stringify({ question_id, text: answer_text.trim() }),
      signal:  AbortSignal.timeout(15000),
    });

    const meliData = await meliRes.json() as Record<string, unknown>;

    if (!meliRes.ok) {
      const errMsg = (meliData?.message as string | undefined) ?? (meliData?.error as string | undefined) ?? `HTTP ${meliRes.status}`;
      return NextResponse.json({ status: "error", error: errMsg }, { status: 400 });
    }

    return NextResponse.json({ status: "ok", message: "Pregunta respondida exitosamente", data: meliData });

  } catch (e) {
    return NextResponse.json({ status: "error", error: (e as Error).message }, { status: 500 });
  }
}
