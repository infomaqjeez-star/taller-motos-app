import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

async function deriveKey(passphrase: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const km  = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode("appjeez-meli-salt"), iterations: 100000, hash: "SHA-256" },
    km, { name: "AES-GCM", length: 256 }, false, ["decrypt"]
  );
}
async function decrypt(encBase64: string, passphrase: string): Promise<string> {
  const key      = await deriveKey(passphrase);
  const combined = Uint8Array.from(atob(encBase64), c => c.charCodeAt(0));
  const plain    = await crypto.subtle.decrypt({ name: "AES-GCM", iv: combined.slice(0, 12) }, key, combined.slice(12));
  return new TextDecoder().decode(plain);
}

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const ENC_KEY     = Deno.env.get("APPJEEZ_MELI_ENCRYPTION_KEY")!;
  const SUPA_URL    = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  let body: { question_id: number; answer_text: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ status: "error", code: "invalid_body" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { question_id, answer_text } = body;
  if (!question_id || !answer_text?.trim()) {
    return new Response(JSON.stringify({ status: "error", code: "missing_fields" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPA_URL, SERVICE_KEY);

  // 1. Buscar la pregunta y la cuenta dueña
  const { data: question, error: qErr } = await supabase
    .from("meli_unified_questions")
    .select("id, meli_question_id, meli_account_id, status")
    .eq("meli_question_id", question_id)
    .single();

  if (qErr || !question) {
    return new Response(JSON.stringify({ status: "error", code: "question_not_found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (question.status === "ANSWERED") {
    return new Response(JSON.stringify({ status: "error", code: "already_answered" }), {
      status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 2. Obtener token de la cuenta dueña
  const { data: account, error: accErr } = await supabase
    .from("meli_accounts")
    .select("access_token_enc, nickname")
    .eq("id", question.meli_account_id)
    .single();

  if (accErr || !account) {
    return new Response(JSON.stringify({ status: "error", code: "account_not_found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 3. Desencriptar token
  let token: string;
  try {
    token = await decrypt(account.access_token_enc, ENC_KEY);
  } catch {
    return new Response(JSON.stringify({ status: "error", code: "decrypt_error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 4. Enviar respuesta a MeLi
  const meliRes = await fetch(`https://api.mercadolibre.com/answers`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ question_id, text: answer_text.trim() }),
  });

  if (!meliRes.ok) {
    const errBody = await meliRes.text();
    console.error("MeLi answer error:", meliRes.status, errBody);
    return new Response(JSON.stringify({ status: "error", code: "meli_api_error", detail: meliRes.status }), {
      status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 5. Actualizar caché
  await supabase
    .from("meli_unified_questions")
    .update({
      status:      "ANSWERED",
      answer_text: answer_text.trim(),
      answer_date: new Date().toISOString(),
    })
    .eq("meli_question_id", question_id);

  return new Response(
    JSON.stringify({ status: "ok", message: "Pregunta respondida exitosamente", account: account.nickname }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
