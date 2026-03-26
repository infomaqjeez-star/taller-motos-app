import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MELI = "https://api.mercadolibre.com";

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
  "Access-Control-Allow-Methods": "GET",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const url         = new URL(req.url);
  const filterAcct  = url.searchParams.get("account_id"); // opcional: filtrar por cuenta
  const ENC_KEY     = Deno.env.get("APPJEEZ_MELI_ENCRYPTION_KEY")!;
  const SUPA_URL    = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabase = createClient(SUPA_URL, SERVICE_KEY);
  let query = supabase.from("meli_accounts").select("id, meli_user_id, nickname, access_token_enc").eq("status", "active");
  if (filterAcct) query = query.eq("id", filterAcct);

  const { data: accounts, error } = await query;
  if (error || !accounts?.length) return new Response("[]", { headers: { ...cors, "Content-Type": "application/json" } });

  const result = [];

  for (const acc of accounts) {
    try {
      const token = await decrypt(acc.access_token_enc, ENC_KEY);
      const uid   = acc.meli_user_id;

      // Obtener IDs de publicaciones
      const searchRes = await fetch(`${MELI}/users/${uid}/items/search?limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!searchRes.ok) { result.push({ account: acc.nickname, meli_user_id: uid, items: [], error: `search_${searchRes.status}` }); continue; }

      const searchData = await searchRes.json() as { results: string[]; paging: { total: number } };
      const ids = searchData.results ?? [];
      const totalItems = searchData.paging?.total ?? 0;

      if (ids.length === 0) { result.push({ account: acc.nickname, meli_user_id: uid, items: [], total: totalItems }); continue; }

      // Batch fetch items (max 20 por request)
      const items: object[] = [];
      for (let i = 0; i < ids.length; i += 20) {
        const batch = ids.slice(i, i + 20);
        const itemsRes = await fetch(
          `${MELI}/items?ids=${batch.join(",")}&attributes=id,title,price,available_quantity,sold_quantity,status,thumbnail,secure_thumbnail,permalink,currency_id,category_id`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (itemsRes.ok) {
          const data = await itemsRes.json() as { code: number; body: object }[];
          data.forEach(r => { if (r.code === 200) items.push(r.body); });
        }
      }

      result.push({ account: acc.nickname, meli_user_id: uid, items, total: totalItems });
    } catch (err) {
      result.push({ account: acc.nickname, meli_user_id: acc.meli_user_id, items: [], error: String(err) });
    }
  }

  return new Response(JSON.stringify(result), { headers: { ...cors, "Content-Type": "application/json" } });
});
