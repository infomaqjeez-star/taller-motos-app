"use client";

import { useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // Flujo implícito: Supabase SDK maneja los tokens en el hash
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error("[auth/callback] Error:", error.message);
        router.replace("/login?error=auth_failed");
      } else if (session) {
        router.replace("/");
      } else {
        // Intentar procesar el hash si existe
        supabase.auth.onAuthStateChange((event, session) => {
          if (event === "SIGNED_IN" && session) {
            router.replace("/");
          }
        });
      }
    });
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#121212" }}>
      <div className="text-center">
        <div
          className="w-10 h-10 rounded-full border-2 animate-spin mx-auto mb-3"
          style={{ borderColor: "#FFE600", borderTopColor: "transparent" }}
        />
        <p className="text-sm" style={{ color: "#6B7280" }}>Iniciando sesion...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ background: "#121212" }}>
          <div
            className="w-10 h-10 rounded-full border-2 animate-spin"
            style={{ borderColor: "#FFE600", borderTopColor: "transparent" }}
          />
        </div>
      }
    >
      <AuthCallback />
    </Suspense>
  );
}
