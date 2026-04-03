import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Validación en tiempo de ejecución para variables de entorno
if (typeof window !== "undefined") {
  // Solo verificar en el cliente
  if (!url || url.trim() === "" || url.includes("placeholder")) {
    console.error("❌ [Supabase Config] NEXT_PUBLIC_SUPABASE_URL no está configurada");
  }
  if (!key || key.trim() === "" || key.includes("placeholder")) {
    console.error("❌ [Supabase Config] NEXT_PUBLIC_SUPABASE_ANON_KEY no está configurada");
  }
  if ((!url || !key) || url.includes("placeholder") || key.includes("placeholder")) {
    console.error("📋 Para corregir:");
    console.error("   1. Crea/edita el archivo .env.local en la raíz del proyecto");
    console.error("   2. Agrega: NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co");
    console.error("   3. Agrega: NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key");
    console.error("   4. Reinicia el servidor: npm run dev");
  }
}

console.log("[Supabase Init]", {
  url: url && !url.includes("placeholder") ? "✓ URL configured" : "✗ URL missing",
  key: key && !key.includes("placeholder") ? "✓ Key configured" : "✗ Key missing",
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

// 🔌 Nota: Realtime usa polling en producción (fallback automático)
// Los errores de WebSocket se deben a que RLS no está configurado en Supabase
// Para habilitar Realtime: configurar RLS en tablas meli_printed_labels y etiquetas_history
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  console.log("[Supabase] Client initialized. Using polling for data sync.");
}
