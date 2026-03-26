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

const cors = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET, POST",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-debug",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const isDebug = req.headers.get("x-debug") === "true";
  const log: string[] = [];

  const ENC_KEY     = Deno.env.get("APPJEEZ_MELI_ENCRYPTION_KEY") ?? "";
  const SUPA_URL    = Deno.env.get("SUPABASE_URL") ?? "";
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!ENC_KEY || !SUPA_URL || !SERVICE_KEY) {
    const missing = [];
    if (!ENC_KEY)     missing.push("APPJEEZ_MELI_ENCRYPTION_KEY");
    if (!SUPA_URL)    missing.push("SUPABASE_URL");
    if (!SERVICE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
    return new Response(JSON.stringify({ error: "Missing env vars", missing }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  log.push("env_ok");

  const supabase = createClient(SUPA_URL, SERVICE_KEY);

  const { data: accounts, error: accErr } = await supabase
    .from("meli_accounts")
    .select("id, meli_user_id, nickname, access_token_enc")
    .eq("status", "active");

  if (accErr) {
    return new Response(JSON.stringify({ error: "DB error", detail: accErr.message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  log.push(`accounts_found:${accounts?.length ?? 0}`);

  if (!accounts?.length) {
    const resp = isDebug
      ? { debug: log, questions: [], note: "No active accounts in meli_accounts" }
      : [];
    return new Response(JSON.stringify(resp), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const allQuestions: object[] = [];
  const itemTitleCache: Record<string, string> = {};
  const accountLogs: object[] = [];

  for (const acc of accounts) {
    const accLog: Record<string, unknown> = { nickname: acc.nickname };
    try {
      const token = await decrypt(acc.access_token_enc, ENC_KEY);
      accLog.token_ok = true;
      accLog.token_prefix = token.slice(0, 10) + "...";

      // Try both endpoints for maximum compatibility
      const endpoints = [
        `https://api.mercadolibre.com/my/received_questions/search?status=UNANSWERED&limit=50`,
        `https://api.mercadolibre.com/questions/search?seller_id=${acc.meli_user_id}&status=UNANSWERED&limit=50`,
      ];

      let questions: {
        id: number; item_id: string;
        text: string; status: string; date_created: string;
        from: { id: number; nickname?: string };
        answer?: { text: string; date_created: string };
      }[] = [];

      for (const url of endpoints) {
        const qRes = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        accLog[`endpoint_${endpoints.indexOf(url)}_status`] = qRes.status;

        if (qRes.ok) {
          const qData = await qRes.json() as { questions?: typeof questions };
          questions = qData.questions ?? [];
          accLog.questions_from_endpoint = endpoints.indexOf(url);
          accLog.questions_count = questions.length;
          break;
        } else {
          const errText = await qRes.text();
          accLog[`endpoint_${endpoints.indexOf(url)}_error`] = errText.slice(0, 200);
        }
      }

      for (const q of questions) {
        if (!itemTitleCache[q.item_id]) {
          try {
            const iRes = await fetch(
              `https://api.mercadolibre.com/items/${q.item_id}?attributes=id,title`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            itemTitleCache[q.item_id] = iRes.ok
              ? ((await iRes.json()) as { title?: string }).title ?? q.item_id
              : q.item_id;
          } catch { itemTitleCache[q.item_id] = q.item_id; }
        }

        const record = {
          id:               crypto.randomUUID(),
          meli_question_id: q.id,
          meli_account_id:  acc.id,
          item_id:          q.item_id,
          item_title:       itemTitleCache[q.item_id],
          buyer_id:         q.from?.id ?? null,
          buyer_nickname:   q.from?.nickname ?? null,
          question_text:    q.text,
          status:           q.status,
          date_created:     q.date_created,
          answer_text:      q.answer?.text ?? null,
          answer_date:      q.answer?.date_created ?? null,
          meli_accounts:    { nickname: acc.nickname },
        };

        allQuestions.push(record);

        supabase.from("meli_unified_questions").upsert({
          meli_question_id: q.id,
          meli_account_id:  acc.id,
          item_id:          q.item_id,
          item_title:       itemTitleCache[q.item_id],
          buyer_id:         q.from?.id ?? null,
          buyer_nickname:   q.from?.nickname ?? null,
          question_text:    q.text,
          status:           q.status,
          date_created:     q.date_created,
          answer_text:      q.answer?.text ?? null,
          answer_date:      q.answer?.date_created ?? null,
        }, { onConflict: "meli_question_id" }).then(() => {});
      }
    } catch (err) {
      accLog.error = String(err);
      accLog.token_ok = false;
    }
    accountLogs.push(accLog);
  }

  const response = isDebug
    ? { debug: log, account_logs: accountLogs, questions: allQuestions, total: allQuestions.length }
    : allQuestions;

  return new Response(JSON.stringify(response), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
