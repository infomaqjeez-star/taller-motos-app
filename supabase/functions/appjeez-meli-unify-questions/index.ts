import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Crypto helpers (igual que appjeez-meli-callback) ─────────
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
  "Access-Control-Allow-Methods": "GET, POST",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const ENC_KEY     = Deno.env.get("APPJEEZ_MELI_ENCRYPTION_KEY")!;
  const SUPA_URL    = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabase = createClient(SUPA_URL, SERVICE_KEY);

  // 1. Obtener todas las cuentas activas
  const { data: accounts, error: accErr } = await supabase
    .from("meli_accounts")
    .select("id, meli_user_id, nickname, access_token_enc")
    .eq("status", "active");

  if (accErr || !accounts) {
    return new Response(JSON.stringify({ error: accErr?.message ?? "No accounts" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let totalUnanswered = 0;
  let totalProcessed  = 0;
  const errors: string[] = [];

  // Cache de títulos de items para no repetir llamadas
  const itemTitleCache: Record<string, string> = {};

  for (const acc of accounts) {
    try {
      const token = await decrypt(acc.access_token_enc, ENC_KEY);

      // 2. Obtener preguntas sin responder de esta cuenta
      const qRes = await fetch(
        "https://api.mercadolibre.com/questions/search?status=UNANSWERED&limit=50",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!qRes.ok) { errors.push(`${acc.nickname}: questions API ${qRes.status}`); continue; }

      const qData = await qRes.json() as {
        questions: {
          id: number; item_id: string; seller_id: number;
          text: string; status: string; date_created: string;
          from: { id: number; answered_questions: number };
          answer?: { text: string; date_created: string };
        }[];
      };

      const questions = qData.questions ?? [];
      totalUnanswered += questions.length;

      for (const q of questions) {
        // 3. Obtener título del item (con caché)
        if (!itemTitleCache[q.item_id]) {
          try {
            const iRes = await fetch(
              `https://api.mercadolibre.com/items/${q.item_id}?attributes=id,title`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (iRes.ok) {
              const iData = await iRes.json() as { title?: string };
              itemTitleCache[q.item_id] = iData.title ?? q.item_id;
            } else {
              itemTitleCache[q.item_id] = q.item_id;
            }
          } catch { itemTitleCache[q.item_id] = q.item_id; }
        }

        // 4. Upsert en tabla caché
        const { error: upsertErr } = await supabase
          .from("meli_unified_questions")
          .upsert({
            meli_question_id: q.id,
            meli_account_id:  acc.id,
            item_id:          q.item_id,
            item_title:       itemTitleCache[q.item_id],
            buyer_id:         q.from?.id ?? null,
            question_text:    q.text,
            status:           q.status,
            date_created:     q.date_created,
            answer_text:      q.answer?.text ?? null,
            answer_date:      q.answer?.date_created ?? null,
          }, { onConflict: "meli_question_id" });

        if (!upsertErr) totalProcessed++;
      }
    } catch (err) {
      errors.push(`${acc.nickname}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return new Response(
    JSON.stringify({ status: "ok", unanswered_count: totalUnanswered, processed: totalProcessed, errors }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
