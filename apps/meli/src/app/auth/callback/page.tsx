"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          console.error("[auth/callback] Error intercambiando code:", error.message);
          router.replace("/login?error=auth_failed");
        } else {
          router.replace("/");
        }
      });
    } else {
      // Flujo implícito: tokens en hash, el SDK ya los proceso
      supabase.auth.getSession().then(({ data: { session } }) => {
        router.replace(session ? "/" : "/login");
      });
    }
  }, [router, searchParams]);

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
