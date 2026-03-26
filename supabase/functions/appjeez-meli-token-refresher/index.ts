import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MELI_TOKEN_URL = "https://api.mercadolibre.com/oauth/token";

// ── Tipos ──────────────────────────────────────────────────────
interface MeliAccountDecrypted {
  id:            string;
  meli_user_id:  number;
  nickname:      string;
  access_token:  string;
  refresh_token: string;
  expires_at:    string;
  status:        string;
}

Deno.serve(async (_req: Request) => {
  // ── Variables de entorno ──────────────────────────────────
  const APP_ID      = Deno.env.get("APPJEEZ_MELI_APP_ID");
  const SECRET_KEY  = Deno.env.get("APPJEEZ_MELI_SECRET_KEY");
  const SUPA_URL    = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!APP_ID || !SECRET_KEY) {
    return new Response(JSON.stringify({ error: "Missing env vars" }), { status: 500 });
  }

  const supabase = createClient(SUPA_URL, SERVICE_KEY);

  // ── 1. Buscar cuentas que expiran en los próximos 30 min ──
  const threshold = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  const { data: accounts, error: fetchErr } = await supabase
    .from("meli_accounts_decrypted")
    .select("*")
    .eq("status", "active")
    .lte("expires_at", threshold);

  if (fetchErr) {
    console.error("Error fetching accounts:", fetchErr);
    return new Response(JSON.stringify({ error: fetchErr.message }), { status: 500 });
  }

  if (!accounts || accounts.length === 0) {
    return new Response(JSON.stringify({ refreshed: 0, message: "No accounts need refresh" }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  }

  const results = { refreshed: 0, failed: 0, errors: [] as string[] };

  // ── 2. Renovar cada cuenta ────────────────────────────────
  for (const account of accounts as MeliAccountDecrypted[]) {
    try {
      const body = new URLSearchParams({
        grant_type:    "refresh_token",
        client_id:     APP_ID,
        client_secret: SECRET_KEY,
        refresh_token: account.refresh_token,
      });

      const res = await fetch(MELI_TOKEN_URL, {
        method:  "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body:    body.toString(),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error(`Refresh failed for ${account.meli_user_id}:`, res.status, errText);

        // Marcar como expirada si MeLi rechaza el refresh_token
        if (res.status === 400 || res.status === 401) {
          await supabase
            .from("meli_accounts")
            .update({ status: "expired", updated_at: new Date().toISOString() })
            .eq("id", account.id);
        }

        results.failed++;
        results.errors.push(`${account.meli_user_id}: ${res.status}`);
        continue;
      }

      const newTokens = await res.json() as {
        access_token:  string;
        refresh_token: string;
        expires_in:    number;
      };

      const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000).toISOString();

      // Actualizar en Vault via RPC (re-encripta automáticamente)
      const { error: rpcErr } = await supabase.rpc("upsert_meli_account", {
        p_meli_user_id:  account.meli_user_id,
        p_nickname:      account.nickname,
        p_access_token:  newTokens.access_token,
        p_refresh_token: newTokens.refresh_token,
        p_expires_at:    newExpiresAt,
      });

      if (rpcErr) {
        console.error(`DB update failed for ${account.meli_user_id}:`, rpcErr);
        results.failed++;
        results.errors.push(`${account.meli_user_id}: db_error`);
      } else {
        console.log(`Refreshed account ${account.meli_user_id} (${account.nickname})`);
        results.refreshed++;
      }

    } catch (err) {
      console.error(`Unexpected error for ${account.meli_user_id}:`, err);
      results.failed++;
      results.errors.push(`${account.meli_user_id}: unexpected_error`);
    }
  }

  return new Response(JSON.stringify(results), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
