import { createClient } from "@supabase/supabase-js";

const SUPA_URL    = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ENC_KEY     = process.env.APPJEEZ_MELI_ENCRYPTION_KEY!;
const APP_ID      = process.env.APPJEEZ_MELI_APP_ID ?? "";
const SECRET_KEY  = process.env.APPJEEZ_MELI_SECRET_KEY ?? "";

export function getSupabase() {
  return createClient(SUPA_URL, SERVICE_KEY);
}

async function deriveKey(passphrase: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const km  = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode("appjeez-meli-salt"), iterations: 100000, hash: "SHA-256" },
    km, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]
  );
}

export async function decrypt(enc64: string, pass: string = ENC_KEY): Promise<string> {
  const key      = await deriveKey(pass);
  const combined = Uint8Array.from(atob(enc64), c => c.charCodeAt(0));
  const plain    = await crypto.subtle.decrypt({ name: "AES-GCM", iv: combined.slice(0, 12) }, key, combined.slice(12));
  return new TextDecoder().decode(plain);
}

export async function encrypt(text: string, pass: string = ENC_KEY): Promise<string> {
  const key = await deriveKey(pass);
  const iv  = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ct  = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(text));
  const combined = new Uint8Array(iv.byteLength + ct.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ct), iv.byteLength);
  return btoa(String.fromCharCode.apply(null, Array.from(combined)));
}

interface RefreshResult {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export async function refreshMeliToken(refreshTokenEnc: string): Promise<RefreshResult | null> {
  if (!APP_ID || !SECRET_KEY) return null;
  try {
    const rt = await decrypt(refreshTokenEnc);
    const body = new URLSearchParams({
      grant_type:    "refresh_token",
      client_id:     APP_ID,
      client_secret: SECRET_KEY,
      refresh_token: rt,
    });
    const res = await fetch("https://api.mercadolibre.com/oauth/token", {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body:    body.toString(),
      signal:  AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

export async function updateAccountTokens(
  meliUserId: number | string,
  nickname: string,
  newTokens: RefreshResult
): Promise<string> {
  const [encAt, encRt] = await Promise.all([
    encrypt(newTokens.access_token),
    encrypt(newTokens.refresh_token),
  ]);
  const expiresAt = new Date(Date.now() + newTokens.expires_in * 1000).toISOString();
  const supabase = getSupabase();
  await supabase.rpc("upsert_meli_account", {
    p_meli_user_id:  Number(meliUserId),
    p_nickname:      nickname,
    p_access_token:  encAt,
    p_refresh_token: encRt,
    p_expires_at:    expiresAt,
  });
  return newTokens.access_token;
}

export interface MeliAccount {
  id: string;
  meli_user_id: number;
  nickname: string;
  access_token_enc: string;
  refresh_token_enc: string;
  expires_at: string;
  status: string;
}

export async function getActiveAccounts(): Promise<MeliAccount[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("meli_accounts")
    .select("id, meli_user_id, nickname, access_token_enc, refresh_token_enc, expires_at, status")
    .eq("status", "active")
    .order("nickname", { ascending: true });
  return (data ?? []) as MeliAccount[];
}

export async function getValidToken(acc: MeliAccount): Promise<string | null> {
  try {
    const isExpired = acc.expires_at && new Date(acc.expires_at).getTime() < Date.now() + 5 * 60 * 1000;

    if (!isExpired) {
      const token = await decrypt(acc.access_token_enc);
      const test  = await fetch(`https://api.mercadolibre.com/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(5000),
      });
      if (test.ok) return token;
    }

    if (!acc.refresh_token_enc) return null;
    const newTokens = await refreshMeliToken(acc.refresh_token_enc);
    if (!newTokens) return null;
    await updateAccountTokens(acc.meli_user_id, acc.nickname, newTokens);
    return newTokens.access_token;
  } catch { return null; }
}

export async function meliGet(path: string, token: string) {
  try {
    const res = await fetch(`https://api.mercadolibre.com${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) {
      console.error(`[meliGet] HTTP ${res.status} en ${path}`, await res.text().catch(() => ""));
      if (res.status === 451) {
        throw new Error(`HTTP_451_BLOCKED`);
      }
      return null;
    }
    return res.json();
  } catch (err) {
    if ((err as Error).message === "HTTP_451_BLOCKED") throw err;
    return null;
  }
}

export async function meliGetWithRetry(
  path: string,
  token: string,
  retries = 1,
  delayMs = 1000
): Promise<unknown | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`https://api.mercadolibre.com${path}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(15000),
      });
      if (res.status === 429 && attempt < retries) {
        console.warn(`[meli] 429 rate limit en ${path}, reintentando...`);
        await new Promise(r => setTimeout(r, delayMs * 2));
        continue;
      }
      if (!res.ok) {
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, delayMs));
          continue;
        }
        return null;
      }
      return res.json();
    } catch {
      if (attempt < retries) {
        console.warn(`[meli] Timeout en ${path}, intento ${attempt + 1}/${retries + 1}`);
        await new Promise(r => setTimeout(r, delayMs));
        continue;
      }
      return null;
    }
  }
  return null;
}

export async function meliGetRaw(path: string, token: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(`https://api.mercadolibre.com${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    return res.arrayBuffer();
  } catch { return null; }
}
