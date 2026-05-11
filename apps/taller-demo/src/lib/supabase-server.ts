import { createClient } from "@supabase/supabase-js";

// Siempre prefiere service role (bypasea RLS). Fallback a anon solo si no hay service key.
export function getSupabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase URL or key");
  return createClient(url, key, { auth: { persistSession: false } });
}

// Usa service role (bypasa RLS). Si no está configurada, cae a anon key con advertencia.
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase URL or key");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("[admin] SUPABASE_SERVICE_ROLE_KEY no configurada — usando anon key, RLS puede bloquear datos");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
