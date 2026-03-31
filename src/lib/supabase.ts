import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

console.log("[Supabase Init]", {
  url: url ? "✓ URL configured" : "✗ URL missing",
  key: key ? "✓ Key configured" : "✗ Key missing",
});

export const supabase: SupabaseClient = createClient(
  url || "https://placeholder.supabase.co",
  key || "placeholder-key"
);

// ✅ Diagnosticar estado de conexión (solo en desarrollo)
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  supabase.realtime.setAuth(key);
  console.log("[Supabase] Realtime mode enabled");
}
