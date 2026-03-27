import { NextResponse } from "next/server";
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

async function meliGet(path: string, token: string) {
  try {
    const res = await fetch(`https://api.mercadolibre.com${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("account_id"); // opcional: filtrar por cuenta

  try {
    const supabase = createClient(SUPA_URL, SERVICE_KEY);
    let query = supabase
      .from("meli_accounts")
      .select("id, meli_user_id, nickname, access_token_enc")
      .eq("status", "active")
      .order("nickname", { ascending: true });

    if (accountId) query = query.eq("id", accountId);

    const { data: accounts, error } = await query;
    if (error || !accounts?.length) return NextResponse.json([]);

    const results = await Promise.all(accounts.map(async (acc) => {
      try {
        const token = await decrypt(acc.access_token_enc, ENC_KEY);

        // Obtener IDs de publicaciones activas
        const searchData = await meliGet(
          `/users/${acc.meli_user_id}/items/search?status=active&limit=100`,
          token
        );
        const itemIds: string[] = searchData?.results ?? [];

        if (!itemIds.length) {
          return { account: acc.nickname, meli_user_id: String(acc.meli_user_id), items: [] };
        }

        // Obtener detalles en lote (máx 20 por request)
        const chunks: string[][] = [];
        for (let i = 0; i < itemIds.length; i += 20) {
          chunks.push(itemIds.slice(i, i + 20));
        }

        const allItems: object[] = [];
        await Promise.all(chunks.map(async (chunk) => {
          const data = await meliGet(`/items?ids=${chunk.join(",")}&attributes=id,title,price,currency_id,available_quantity,sold_quantity,thumbnail,status,permalink,logistic_type`, token);
          const list = (data ?? []) as Array<{ code: number; body: Record<string, unknown> }>;
          for (const entry of list) {
            if (entry.code === 200 && entry.body) {
              const b = entry.body;
              allItems.push({
                id:                 b.id,
                title:              b.title,
                price:              b.price,
                currency_id:        b.currency_id ?? "ARS",
                available_quantity: b.available_quantity ?? 0,
                sold_quantity:      b.sold_quantity ?? 0,
                thumbnail:          (b.thumbnail as string | undefined)?.replace("http://", "https://") ?? null,
                secure_thumbnail:   (b.thumbnail as string | undefined)?.replace("http://", "https://") ?? null,
                status:             b.status,
                permalink:          b.permalink,
                logistic_type:      b.logistic_type ?? "not_specified",
              });
            }
          }
        }));

        // Ordenar por vendidos desc
        allItems.sort((a, b) => {
          const as = (a as { sold_quantity: number }).sold_quantity;
          const bs = (b as { sold_quantity: number }).sold_quantity;
          return bs - as;
        });

        return {
          account:      acc.nickname,
          meli_user_id: String(acc.meli_user_id),
          items:        allItems,
          total:        allItems.length,
        };
      } catch (e) {
        return {
          account:      acc.nickname,
          meli_user_id: String(acc.meli_user_id),
          items:        [],
          total:        0,
          error:        (e as Error).message,
        };
      }
    }));

    return NextResponse.json(results);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
