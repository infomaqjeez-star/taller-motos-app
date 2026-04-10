import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// ValidaciÃ³n en tiempo de ejecuciÃ³n para variables de entorno
if (typeof window !== "undefined") {
  // Solo verificar en el cliente
  if (!url || url.trim() === "" || url.includes("placeholder")) {
    console.error("âŒ [Supabase Config] NEXT_PUBLIC_SUPABASE_URL no estÃ¡ configurada");
  }
  if (!key || key.trim() === "" || key.includes("placeholder")) {
    console.error("âŒ [Supabase Config] NEXT_PUBLIC_SUPABASE_ANON_KEY no estÃ¡ configurada");
  }
  if ((!url || !key) || url.includes("placeholder") || key.includes("placeholder")) {
    console.error("ðŸ“‹ Para corregir:");
    console.error("   1. Crea/edita el archivo .env.local en la raÃ­z del proyecto");
    console.error("   2. Agrega: NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co");
    console.error("   3. Agrega: NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key");
    console.error("   4. Reinicia el servidor: npm run dev");
  }
}

console.log("[Supabase Init]", {
  url: url && !url.includes("placeholder") ? "âœ“ URL configured" : "âœ— URL missing",
  key: key && !key.includes("placeholder") ? "âœ“ Key configured" : "âœ— Key missing",
});

export const supabase: SupabaseClient = createClient(
  url || "https://placeholder.supabase.co",
  key || "placeholder-key",
  {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

// ðŸ”Œ Nota: Realtime usa polling en producciÃ³n (fallback automÃ¡tico)
// Los errores de WebSocket se deben a que RLS no estÃ¡ configurado en Supabase
// Para habilitar Realtime: configurar RLS en tablas meli_printed_labels y etiquetas_history
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  console.log("[Supabase] Client initialized. Using polling for data sync.");
}

// Helper para obtener usuario actual
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}
