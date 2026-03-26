import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MELI_TOKEN_URL  = "https://api.mercadolibre.com/oauth/token";
const MELI_ME_URL     = "https://api.mercadolibre.com/users/me";

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  // ── Variables de entorno (NUNCA hardcodeadas) ──────────────
  const APP_ID       = Deno.env.get("APPJEEZ_MELI_APP_ID");
  const SECRET_KEY   = Deno.env.get("APPJEEZ_MELI_SECRET_KEY");
  const FRONTEND_URL = Deno.env.get("APPJEEZ_FRONTEND_URL") ?? "https://taller-motos-app-two.vercel.app";
  const SUPA_URL     = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const redirectOk    = (userId: number) =>
    Response.redirect(`${FRONTEND_URL}/configuracion/meli?status=success&user_id=${userId}`, 302);
  const redirectError = (msg: string) =>
    Response.redirect(`${FRONTEND_URL}/configuracion/meli?status=error&message=${msg}`, 302);

  // ── Solo GET ───────────────────────────────────────────────
  if (req.method !== "GET") return new Response("Method Not Allowed", { status: 405 });

  // ── Validar configuración ──────────────────────────────────
  if (!APP_ID || !SECRET_KEY) {
    console.error("Missing APPJEEZ_MELI_APP_ID or APPJEEZ_MELI_SECRET_KEY");
    return redirectError("config_error");
  }

  // ── 1. Extraer código de autorización ─────────────────────
  const code = url.searchParams.get("code");
  if (!code) return new Response(JSON.stringify({ error: "Missing code" }), {
    status: 400, headers: { "Content-Type": "application/json" },
  });

  // ── 2. Construir redirect_uri exacta ──────────────────────
  const redirectUri = `${url.protocol}//${url.host}${url.pathname}`;

  // ── 3. Intercambio de código por tokens (server-side) ─────
  let tokenData: {
    access_token: string;
    refresh_token: string;
    user_id: number;
    expires_in: number;
    token_type: string;
  };

  try {
    const body = new URLSearchParams({
      grant_type:    "authorization_code",
      client_id:     APP_ID,
      client_secret: SECRET_KEY,
      code,
      redirect_uri:  redirectUri,
    });

    const res = await fetch(MELI_TOKEN_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body:    body.toString(),
    });

    if (!res.ok) {
      console.error("MeLi token exchange failed:", res.status, await res.text());
      return redirectError("auth_failed");
    }

    tokenData = await res.json();
  } catch (err) {
    console.error("Network error:", err);
    return redirectError("network_error");
  }

  // ── 4. Obtener nickname del usuario ───────────────────────
  let nickname = "";
  try {
    const meRes = await fetch(MELI_ME_URL, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (meRes.ok) {
      const me = await meRes.json() as { nickname?: string };
      nickname = me.nickname ?? "";
    }
  } catch { /* nickname opcional */ }

  // ── 5. Calcular expiración ────────────────────────────────
  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

  // ── 6. Guardar en Supabase Vault via RPC ──────────────────
  const supabase = createClient(SUPA_URL, SERVICE_KEY);

  const { error: rpcError } = await supabase.rpc("upsert_meli_account", {
    p_meli_user_id:  tokenData.user_id,
    p_nickname:      nickname,
    p_access_token:  tokenData.access_token,
    p_refresh_token: tokenData.refresh_token,
    p_expires_at:    expiresAt,
  });

  if (rpcError) {
    console.error("Supabase RPC error:", rpcError);
    return redirectError("db_error");
  }

  // ── 7. Redirección exitosa ────────────────────────────────
  return redirectOk(tokenData.user_id);
});
