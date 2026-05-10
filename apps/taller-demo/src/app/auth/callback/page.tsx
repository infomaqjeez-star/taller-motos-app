"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/taller";
  return raw;
}

/**
 * OAuth vuelve aquí con ?code= (PKCE) o con #access_token=… (hash).
 * Los fragmentos #… no llegan al servidor, por eso este flujo es 100 % cliente.
 */
function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [msg, setMsg] = useState("Ingresando…");

  useEffect(() => {
    const next = safeNext(searchParams.get("next"));

    (async () => {
      const code = searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          router.replace(next);
          return;
        }
        setMsg(error.message || "Error al validar sesión");
        router.replace(`/login?error=${encodeURIComponent("oauth")}`);
        return;
      }

      const hash = typeof window !== "undefined" ? window.location.hash : "";
      if (hash && hash.includes("access_token")) {
        const h = new URLSearchParams(hash.replace(/^#/, ""));
        const access_token = h.get("access_token");
        const refresh_token = h.get("refresh_token");
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (!error) {
            window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
            router.replace(next);
            return;
          }
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.replace(next);
        return;
      }

      setMsg("No se pudo completar el inicio de sesión");
      router.replace("/login?error=auth");
    })();
  }, [router, searchParams]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center bg-[#121212] px-4 text-center text-gray-300">
      <p className="text-sm">{msg}</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center bg-[#121212] text-gray-400">
          Cargando…
        </div>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  );
}
