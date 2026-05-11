import { createClient } from "@supabase/supabase-js";

// Siempre prefiere service role (bypasea RLS). Fallback a anon solo si no hay service key.
export function getSupabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase URL or key");
  return createClient(url, key, { auth: { persistSession: false } });
}

// Igual que getSupabaseServer pero lanza error descriptivo si no hay service key
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY no configurada en las variables de entorno");
  return createClient(url, key, { auth: { persistSession: false } });
}
