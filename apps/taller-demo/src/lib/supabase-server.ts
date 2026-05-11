import { createClient } from "@supabase/supabase-js";

// Siempre prefiere service role (bypasea RLS). Fallback a anon solo si no hay service key.
function getServiceKey(): string | undefined {
  // Intentar múltiples nombres por si Railway renombra la variable
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SERVICE_ROLE_KEY
  );
}

export function getSupabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = getServiceKey() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase URL or key");
  return createClient(url, key, { auth: { persistSession: false } });
}

export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = getServiceKey();
  const key = serviceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase URL or key");
  if (!serviceKey) {
    console.warn("[admin] Sin service key — usando anon key, RLS puede bloquear datos");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
