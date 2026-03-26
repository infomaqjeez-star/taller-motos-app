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
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const ENC_KEY     = Deno.env.get("APPJEEZ_MELI_ENCRYPTION_KEY")!;
  const SUPA_URL    = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabase = createClient(SUPA_URL, SERVICE_KEY);

  const { data: accounts, error: accErr } = await supabase
    .from("meli_accounts")
    .select("id, meli_user_id, nickname, access_token_enc")
    .eq("status", "active");

  if (accErr || !accounts?.length) {
    return new Response(JSON.stringify([]), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const allQuestions: object[] = [];
  const itemTitleCache: Record<string, string> = {};

  for (const acc of accounts) {
    try {
      const token = await decrypt(acc.access_token_enc, ENC_KEY);

      const qRes = await fetch(
        "https://api.mercadolibre.com/my/received_questions/search?status=UNANSWERED&limit=50",
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!qRes.ok) continue;

      const qData = await qRes.json() as {
        questions: {
          id: number; item_id: string;
          text: string; status: string; date_created: string;
          from: { id: number; nickname?: string };
          answer?: { text: string; date_created: string };
        }[];
      };

      const questions = qData.questions ?? [];

      for (const q of questions) {
        // Cache de títulos
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

        // Guardar en caché (sin bloquear)
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
      console.error(`Error for ${acc.nickname}:`, err);
    }
  }

  // Devuelve las preguntas directamente — sin depender de la DB
  return new Response(JSON.stringify(allQuestions), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
