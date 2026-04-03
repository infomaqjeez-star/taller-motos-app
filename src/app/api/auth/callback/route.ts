import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ── CONFIGURACIÓN ──────────────────────────────────────────────
const CLIENT_ID = process.env.APPJEEZ_MELI_APP_ID ?? "";
const CLIENT_SECRET = process.env.APPJEEZ_MELI_SECRET_KEY ?? "";
const REDIRECT_URI = process.env.MELI_REDIRECT_URI ?? "";
const API_BASE_URL = "https://api.mercadolibre.com";

// Cliente Supabase con service_role para escribir en la BD saltando RLS
const getSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return createClient(url, key);
};

// ── ENCRIPTACIÓN AES-GCM ───────────────────────────────────────
async function deriveKey(passphrase: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const km = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode("appjeez-meli-salt"),
      iterations: 100000,
      hash: "SHA-256",
    },
    km,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encrypt(text: string, passphrase: string): Promise<string> {
  const key = await deriveKey(passphrase);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(text));
  const combined = new Uint8Array(iv.byteLength + ct.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ct), iv.byteLength);
  return btoa(String.fromCharCode.apply(null, Array.from(combined)));
}

// ── HANDLER PRINCIPAL ──────────────────────────────────────────
export async function GET(request: NextRequest) {
  console.log("[AUTH/CALLBACK] OAuth callback recibido");

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // Contiene el user_id del usuario MaqJeez
  const error = searchParams.get("error");

  // Validar errores de MeLi
  if (error) {
    console.error("[AUTH/CALLBACK] Error de MeLi:", error);
    return NextResponse.redirect(
      new URL(`/configuracion/meli?status=error&message=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code) {
    console.error("[AUTH/CALLBACK] No se proporcionó código");
    return NextResponse.redirect(
      new URL(`/configuracion/meli?status=error&message=No authorization code`, request.url)
    );
  }

  if (!state) {
    console.error("[AUTH/CALLBACK] Falta state (user_id)");
    return NextResponse.redirect(
      new URL(`/configuracion/meli?status=error&message=Missing state parameter`, request.url)
    );
  }

  const userId = state; // El state contiene el user_id del usuario MaqJeez

  // Validar configuración
  if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
    console.error("[AUTH/CALLBACK] Faltan variables de entorno");
    return NextResponse.redirect(
      new URL(`/configuracion/meli?status=error&message=Missing config`, request.url)
    );
  }

  try {
    // 1. Intercambiar código por tokens
    console.log("[AUTH/CALLBACK] Intercambiando código por tokens...");
    const tokenResponse = await fetch(`${API_BASE_URL}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code: code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}));
      console.error("[AUTH/CALLBACK] Error al intercambiar token:", errorData);
      return NextResponse.redirect(
        new URL(
          `/configuracion/meli?status=error&message=${encodeURIComponent(errorData.message || "Token exchange failed")}`,
          request.url
        )
      );
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in, user_id: meli_user_id } = tokenData;

    console.log("[AUTH/CALLBACK] Tokens obtenidos:", { meli_user_id, userId });

    // 2. Obtener nickname del usuario desde MeLi
    const userResponse = await fetch(`${API_BASE_URL}/users/${meli_user_id}`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    let meliNickname = String(meli_user_id);
    if (userResponse.ok) {
      const userData = await userResponse.json();
      meliNickname = userData.nickname || String(meli_user_id);
    }

    // 3. Calcular fecha de expiración
    const expiresAt = new Date(Date.now() + expires_in * 1000);

    // 4. Encriptar tokens
    const encKey = process.env.APPJEEZ_MELI_ENCRYPTION_KEY ?? "";
    if (!encKey) {
      throw new Error("Missing APPJEEZ_MELI_ENCRYPTION_KEY");
    }

    const [accessTokenEnc, refreshTokenEnc] = await Promise.all([
      encrypt(access_token, encKey),
      encrypt(refresh_token, encKey),
    ]);

    // 5. Guardar en Supabase usando la función RPC
    const supabase = getSupabase();
    const { data: accountId, error: rpcError } = await supabase.rpc("upsert_linked_meli_account", {
      p_user_id: userId,
      p_meli_user_id: String(meli_user_id),
      p_meli_nickname: meliNickname,
      p_access_token_enc: accessTokenEnc,
      p_refresh_token_enc: refreshTokenEnc,
      p_token_expiry_date: expiresAt.toISOString(),
    });

    if (rpcError) {
      console.error("[AUTH/CALLBACK] Error al guardar en BD:", rpcError);
      return NextResponse.redirect(
        new URL(
          `/configuracion/meli?status=error&message=${encodeURIComponent(rpcError.message)}`,
          request.url
        )
      );
    }

    console.log("[AUTH/CALLBACK] Cuenta vinculada exitosamente:", {
      accountId,
      userId,
      meli_user_id,
      meliNickname,
    });

    // 6. Redirigir al dashboard con éxito
    return NextResponse.redirect(
      new URL(
        `/configuracion/meli?status=success&user_id=${meli_user_id}&nickname=${encodeURIComponent(meliNickname)}`,
        request.url
      )
    );
  } catch (err) {
    console.error("[AUTH/CALLBACK] Error inesperado:", err);
    return NextResponse.redirect(
      new URL(
        `/configuracion/meli?status=error&message=${encodeURIComponent((err as Error).message)}`,
        request.url
      )
    );
  }
}
