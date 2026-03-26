import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MELI_TOKEN_URL = "https://api.mercadolibre.com";

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

async function meliGet(path: string, token: string) {
  const res = await fetch(`${MELI_TOKEN_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  const ENC_KEY     = Deno.env.get("APPJEEZ_MELI_ENCRYPTION_KEY");
  const SUPA_URL    = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!ENC_KEY) {
    return new Response(JSON.stringify({ error: "Missing ENC_KEY" }), {
      status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  const supabase = createClient(SUPA_URL, SERVICE_KEY);
  const { data: accounts, error } = await supabase
    .from("meli_accounts")
    .select("id, meli_user_id, nickname, access_token_enc, status")
    .eq("status", "active");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  if (!accounts || accounts.length === 0) {
    return new Response("[]", {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  const todayISO = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
  const result   = [];

  for (const acc of accounts) {
    try {
      const token = await decrypt(acc.access_token_enc, ENC_KEY);
      const uid   = acc.meli_user_id;

      const [questions, reputation, ordersToday, shipments, itemsSearch] = await Promise.allSettled([
        meliGet(`/my/received_questions/search?status=UNANSWERED&limit=1`, token),
        meliGet(`/users/${uid}/reputation`, token),
        meliGet(`/orders/search?seller=${uid}&order.status=paid&order.date_created.from=${todayISO}&limit=50`, token),
        meliGet(`/shipments/search?seller_id=${uid}&status=ready_to_ship&limit=1`, token),
        meliGet(`/users/${uid}/items/search?limit=1`, token),
      ]);

      const qData   = questions.status   === "fulfilled" ? questions.value   : null;
      const repData = reputation.status  === "fulfilled" ? reputation.value  : null;
      const ordData = ordersToday.status === "fulfilled" ? ordersToday.value : null;
      const shipData= shipments.status   === "fulfilled" ? shipments.value   : null;
      const itmData = itemsSearch.status === "fulfilled" ? itemsSearch.value : null;

      const totalAmount = (ordData?.results ?? []).reduce(
        (s: number, o: { total_amount?: number }) => s + (o.total_amount ?? 0), 0
      );

      result.push({
        account:              acc.nickname,
        meli_user_id:         uid,
        unanswered_questions: qData?.total ?? 0,
        pending_messages:     0,
        ready_to_ship:        shipData?.paging?.total ?? 0,
        total_items:          itmData?.paging?.total ?? 0,
        today_orders:         ordData?.paging?.total ?? 0,
        today_sales_amount:   totalAmount,
        reputation: {
          level_id:              repData?.level_id ?? null,
          power_seller_status:   repData?.power_seller_status ?? null,
          transactions:          repData?.transactions?.total ?? 0,
          positive:              repData?.transactions?.ratings?.positive ?? 0,
          negative:              repData?.transactions?.ratings?.negative ?? 0,
          neutral:               repData?.transactions?.ratings?.neutral ?? 0,
          delayed_handling_time: repData?.metrics?.delayed_handling_time?.rate ?? 0,
          claims:                repData?.metrics?.claims?.rate ?? 0,
          cancellations:         repData?.metrics?.cancellations?.rate ?? 0,
          immediate_payment:     repData?.immediate_payment ?? false,
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.push({ account: acc.nickname, meli_user_id: acc.meli_user_id, error: msg });
    }
  }

  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
});
