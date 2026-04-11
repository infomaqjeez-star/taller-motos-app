import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseServiceKey || "placeholder-key"
);

const MELI_APP_ID = process.env.APPJEEZ_MELI_APP_ID || "";
const MELI_SECRET_KEY = process.env.APPJEEZ_MELI_SECRET_KEY || "";
const ENC_KEY = process.env.APPJEEZ_MELI_ENCRYPTION_KEY || "";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "";

// Encriptacion simple AES-GCM
async function deriveKey(passphrase: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const km = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode("appjeez-meli-salt"), iterations: 100000, hash: "SHA-256" },
    km, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]
  );
}

async function encrypt(text: string): Promise<string> {
  const key = await deriveKey(ENC_KEY);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(text));
  const combined = new Uint8Array(iv.byteLength + ct.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ct), iv.byteLength);
  return btoa(String.fromCharCode.apply(null, Array.from(combined)));
}

/**
 * GET /api/auth/callback
 * Callback OAuth de Mercado Libre. Intercambia el codigo por tokens
 * y guarda la cuenta en linked_meli_accounts.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  const baseUrl = APP_URL || `https://${request.headers.get("host")}`;
  const configUrl = `${baseUrl}/configuracion/meli`;

  if (errorParam) {
    return NextResponse.redirect(`${configUrl}?error=${encodeURIComponent(errorParam)}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${configUrl}?error=missing_params`);
  }

  if (!MELI_APP_ID || !MELI_SECRET_KEY) {
    return NextResponse.redirect(`${configUrl}?error=server_config_missing`);
  }

  // Decodificar el state para obtener el userId
  let userId: string;
  try {
    const decoded = JSON.parse(Buffer.from(state, "base64url").toString("utf-8"));
    userId = decoded.userId;
    if (!userId) throw new Error("userId missing in state");
  } catch {
    return NextResponse.redirect(`${configUrl}?error=invalid_state`);
  }

  // Intercambiar el codigo por tokens
  const callbackUrl = `${baseUrl}/api/auth/callback`;
  let tokenData: { access_token: string; refresh_token: string; expires_in: number; user_id: number };
  try {
    const tokenRes = await fetch("https://api.mercadolibre.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: MELI_APP_ID,
        client_secret: MELI_SECRET_KEY,
        code,
        redirect_uri: callbackUrl,
      }).toString(),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error("[callback] Error al obtener token:", err);
      return NextResponse.redirect(`${configUrl}?error=token_exchange_failed`);
    }

    tokenData = await tokenRes.json();
  } catch (err) {
    console.error("[callback] Error de red al obtener token:", err);
    return NextResponse.redirect(`${configUrl}?error=network_error`);
  }

  // Obtener el nickname del usuario de MeLi
  let meliNickname = `Cuenta ${tokenData.user_id}`;
  try {
    const userRes = await fetch(`https://api.mercadolibre.com/users/${tokenData.user_id}`, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (userRes.ok) {
      const userData = await userRes.json();
      meliNickname = userData.nickname || meliNickname;
    }
  } catch {
    // Usar nickname por defecto
  }

  // Encriptar los tokens
  let accessTokenEnc: string;
  let refreshTokenEnc: string;
  try {
    [accessTokenEnc, refreshTokenEnc] = await Promise.all([
      encrypt(tokenData.access_token),
      encrypt(tokenData.refresh_token),
    ]);
  } catch (err) {
    console.error("[callback] Error al encriptar tokens:", err);
    return NextResponse.redirect(`${configUrl}?error=encryption_failed`);
  }

  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

  // Guardar en Supabase usando la funcion RPC
  // NOTA: También guardamos el access_token sin encriptar para usar en endpoints
  try {
    const { error: rpcError } = await supabase.rpc("upsert_linked_meli_account", {
      p_user_id: userId,
      p_meli_user_id: String(tokenData.user_id),
      p_meli_nickname: meliNickname,
      p_access_token_enc: tokenData.access_token, // Guardar sin encriptar temporalmente
      p_refresh_token_enc: refreshTokenEnc,
      p_token_expiry_date: expiresAt,
    });

    if (rpcError) {
      console.error("[callback] Error al guardar cuenta:", rpcError);
      return NextResponse.redirect(`${configUrl}?error=db_error`);
    }
  } catch (err) {
    console.error("[callback] Error inesperado al guardar:", err);
    return NextResponse.redirect(`${configUrl}?error=db_error`);
  }

  // Exito - redirigir a configuracion con mensaje de exito
  return NextResponse.redirect(`${configUrl}?success=1&nickname=${encodeURIComponent(meliNickname)}`);
}
