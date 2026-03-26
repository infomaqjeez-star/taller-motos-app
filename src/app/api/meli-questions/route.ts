import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

async function decrypt(encBase64: string, passphrase: string): Promise<string> {
  const key      = await deriveKey(passphrase);
  const combined = Uint8Array.from(atob(encBase64), (c) => c.charCodeAt(0));
  const plain    = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: combined.slice(0, 12) },
    key,
    combined.slice(12)
  );
  return new TextDecoder().decode(plain);
}

export async function GET() {
  try {
    const supabase = createClient(SUPA_URL, SERVICE_KEY);

    const { data: accounts, error } = await supabase
      .from("meli_accounts")
      .select("id, meli_user_id, nickname, access_token_enc")
      .eq("status", "active");

    if (error || !accounts?.length) {
      return NextResponse.json([]);
    }

    const allQuestions: object[] = [];
    const itemCache: Record<string, string> = {};

    for (const acc of accounts) {
      try {
        const token = await decrypt(acc.access_token_enc, ENC_KEY);

        // Endpoint correcto para preguntas recibidas en MeLi Argentina
        const url = `https://api.mercadolibre.com/questions/search?seller_id=${acc.meli_user_id}&status=UNANSWERED&limit=50`;
        const qRes = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!qRes.ok) {
          console.error(`MeLi questions error for ${acc.nickname}: HTTP ${qRes.status}`);
          continue;
        }

        const qData = await qRes.json() as {
          questions?: {
            id: number;
            item_id: string;
            text: string;
            status: string;
            date_created: string;
            from: { id: number; nickname?: string };
            answer?: { text: string; date_created: string };
          }[];
        };

        const questions = qData.questions ?? [];

        for (const q of questions) {
          if (!itemCache[q.item_id]) {
            try {
              const iRes = await fetch(
                `https://api.mercadolibre.com/items/${q.item_id}?attributes=id,title`,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              itemCache[q.item_id] = iRes.ok
                ? ((await iRes.json()) as { title?: string }).title ?? q.item_id
                : q.item_id;
            } catch {
              itemCache[q.item_id] = q.item_id;
            }
          }

          allQuestions.push({
            id:               crypto.randomUUID(),
            meli_question_id: q.id,
            meli_account_id:  acc.id,
            item_id:          q.item_id,
            item_title:       itemCache[q.item_id],
            buyer_id:         q.from?.id ?? null,
            buyer_nickname:   q.from?.nickname ?? null,
            question_text:    q.text,
            status:           q.status,
            date_created:     q.date_created,
            answer_text:      q.answer?.text ?? null,
            answer_date:      q.answer?.date_created ?? null,
            meli_accounts:    { nickname: acc.nickname },
          });
        }
      } catch (err) {
        console.error(`Error processing ${acc.nickname}:`, err);
      }
    }

    return NextResponse.json(allQuestions);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
