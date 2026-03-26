import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { webcrypto } from "crypto";

const subtle = webcrypto.subtle;

// ── AES-GCM decrypt (mismo algoritmo que la Edge Function) ─────
async function deriveKey(passphrase: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode("appjeez-meli-salt"), iterations: 100000, hash: "SHA-256" },
    keyMaterial, { name: "AES-GCM", length: 256 }, false, ["decrypt"]
  );
}

async function decrypt(encBase64: string, passphrase: string): Promise<string> {
  const key      = await deriveKey(passphrase);
  const combined = Buffer.from(encBase64, "base64");
  const iv       = combined.slice(0, 12);
  const data     = combined.slice(12);
  const plain    = await subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return new TextDecoder().decode(plain);
}

// ── Tipos MeLi ─────────────────────────────────────────────────
interface MeliItem {
  id:            string;
  title:         string;
  price:         number;
  available_quantity: number;
  sold_quantity: number;
  status:        string;
  thumbnail:     string;
  permalink:     string;
  currency_id:   string;
}

export async function GET() {
  const ENC_KEY     = process.env.APPJEEZ_MELI_ENCRYPTION_KEY;
  const SUPA_URL    = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!ENC_KEY) return NextResponse.json({ error: "Missing encryption key" }, { status: 500 });

  // ── 1. Obtener cuentas activas con tokens encriptados ──────
  const supabase = createClient(SUPA_URL, SERVICE_KEY);
  const { data: accounts, error } = await supabase
    .from("meli_accounts")
    .select("id, meli_user_id, nickname, access_token_enc, status")
    .eq("status", "active");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!accounts || accounts.length === 0) return NextResponse.json([]);

  const result = [];

  // ── 2. Para cada cuenta, obtener publicaciones ─────────────
  for (const acc of accounts as { id: string; meli_user_id: string; nickname: string; access_token_enc: string; status: string }[]) {
    try {
      const accessToken = await decrypt(acc.access_token_enc, ENC_KEY);

      // Buscar IDs de publicaciones del usuario
      const searchRes = await fetch(
        `https://api.mercadolibre.com/users/${acc.meli_user_id}/items/search?limit=50`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!searchRes.ok) {
        result.push({ account: acc.nickname, meli_user_id: acc.meli_user_id, items: [], error: `MeLi API ${searchRes.status}` });
        continue;
      }

      const searchData = await searchRes.json() as { results: string[] };
      const ids = searchData.results ?? [];

      if (ids.length === 0) {
        result.push({ account: acc.nickname, meli_user_id: acc.meli_user_id, items: [] });
        continue;
      }

      // Obtener detalles de las publicaciones en batch (max 20 por request)
      const batches = [];
      for (let i = 0; i < ids.length; i += 20) batches.push(ids.slice(i, i + 20));

      const items: MeliItem[] = [];
      for (const batch of batches) {
        const itemsRes = await fetch(
          `https://api.mercadolibre.com/items?ids=${batch.join(",")}&attributes=id,title,price,available_quantity,sold_quantity,status,thumbnail,permalink,currency_id`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (itemsRes.ok) {
          const itemsData = await itemsRes.json() as { code: number; body: MeliItem }[];
          itemsData.forEach(r => { if (r.code === 200) items.push(r.body); });
        }
      }

      result.push({ account: acc.nickname, meli_user_id: acc.meli_user_id, items });
    } catch (err) {
      console.error(`Error for ${acc.meli_user_id}:`, err);
      result.push({ account: acc.nickname, meli_user_id: acc.meli_user_id, items: [], error: "decrypt_error" });
    }
  }

  return NextResponse.json(result);
}
