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

  const ENC_KEY     = Deno.env.get("APPJEEZ_MELI_ENCRYPTION_KEY")!;
  const SUPA_URL    = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabase = createClient(SUPA_URL, SERVICE_KEY);
  const { data: accounts, error } = await supabase
    .from("meli_accounts").select("id, meli_user_id, nickname, access_token_enc").eq("status", "active");

  if (error || !accounts?.length) return new Response("[]", { headers: { ...cors, "Content-Type": "application/json" } });

  const todayISO = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
  const result   = [];

  for (const acc of accounts) {
    try {
      const token = await decrypt(acc.access_token_enc, ENC_KEY);
      const uid   = acc.meli_user_id;

      // Órdenes del día
      const ordRes = await fetch(
        `${MELI}/orders/search?seller=${uid}&order.status=paid&order.date_created.from=${todayISO}&limit=50&sort=date_desc`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const ordData = ordRes.ok ? await ordRes.json() as {
        results: {
          id: number; status: string; date_created: string; total_amount: number;
          currency_id: string;
          order_items: { item: { id: string; title: string; thumbnail?: string }; quantity: number; unit_price: number }[];
          buyer: { id: number; nickname: string };
          shipping?: { id: number; status: string };
        }[];
        paging: { total: number };
      } : null;

      // Envíos listos para despachar
      const shipRes = await fetch(
        `${MELI}/shipments/search?seller_id=${uid}&status=ready_to_ship&limit=20`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const shipData = shipRes.ok ? await shipRes.json() as {
        results: {
          id: number; status: string; substatus: string; date_created: string;
          receiver_address?: { city?: { name: string }; state?: { name: string }; zip_code?: string; street_name?: string; street_number?: string };
          tracking_number?: string;
        }[];
        paging: { total: number };
      } : null;

      const totalAmount = (ordData?.results ?? []).reduce((s, o) => s + (o.total_amount ?? 0), 0);

      result.push({
        account:      acc.nickname,
        meli_user_id: uid,
        orders: {
          total:   ordData?.paging?.total ?? 0,
          amount:  totalAmount,
          results: (ordData?.results ?? []).map(o => ({
            id:          o.id,
            status:      o.status,
            date:        o.date_created,
            total:       o.total_amount,
            currency:    o.currency_id,
            buyer:       o.buyer?.nickname ?? "—",
            shipping_id: o.shipping?.id ?? null,
            items:       (o.order_items ?? []).map(i => ({
              title:     i.item?.title ?? "—",
              thumbnail: i.item?.thumbnail ?? null,
              qty:       i.quantity,
              price:     i.unit_price,
            })),
          })),
        },
        shipments: {
          total:   shipData?.paging?.total ?? 0,
          results: (shipData?.results ?? []).map(s => ({
            id:              s.id,
            status:          s.status,
            substatus:       s.substatus,
            date:            s.date_created,
            tracking_number: s.tracking_number ?? null,
            address:         s.receiver_address
              ? `${s.receiver_address.street_name ?? ""} ${s.receiver_address.street_number ?? ""}, ${s.receiver_address.city?.name ?? ""}`
              : "—",
            zip:             s.receiver_address?.zip_code ?? "—",
          })),
        },
      });
    } catch (err) {
      result.push({ account: acc.nickname, meli_user_id: acc.meli_user_id, error: String(err) });
    }
  }

  return new Response(JSON.stringify(result), { headers: { ...cors, "Content-Type": "application/json" } });
});
