import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Flag para saber si estamos en build time
const isBuildTime = typeof window === "undefined" && process.env.NODE_ENV === "production";

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

if (!isBuildTime) {
  console.log("[Supabase Init]", {
    url: url && !url.includes("placeholder") ? "✓ URL configured" : "✗ URL missing",
    key: key && !key.includes("placeholder") ? "✓ Key configured" : "✗ Key missing",
  });
}

// Crear un cliente mock para build time
const createMockClient = (): SupabaseClient => {
  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithOAuth: async () => ({ data: null, error: new Error("Build time") }),
      signOut: async () => ({ error: null }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null, error: null }),
          order: () => ({ data: [], error: null }),
        }),
        order: () => ({ data: [], error: null }),
      }),
      insert: async () => ({ data: null, error: null }),
      update: async () => ({ data: null, error: null }),
      delete: async () => ({ data: null, error: null }),
    }),
    realtime: {
      channel: () => ({
        on: () => ({ subscribe: () => {} }),
        subscribe: () => {},
      }),
    },
  } as unknown as SupabaseClient;
};

// Crear el cliente real o mock según el entorno
export const supabase: SupabaseClient = isBuildTime && (!url || url.includes("placeholder"))
  ? createMockClient()
  : createClient(
      url || "https://placeholder.supabase.co",
      key || "placeholder-key",
      {
        auth: {
          flowType: "implicit",
          autoRefreshToken: true,
          persistSession: true,
        },
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

// Helper para obtener usuario actual
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

// Helper para obtener headers de autenticacion para llamadas a la API
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    return { Authorization: `Bearer ${session.access_token}` };
  }
  return {};
}
