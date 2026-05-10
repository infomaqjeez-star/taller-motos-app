"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/taller";
  return raw;
}

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [msg, setMsg] = useState("Ingresando…");
  const [errorInfo, setErrorInfo] = useState<string | null>(null);

  useEffect(() => {
    const next = safeNext(searchParams.get("next"));

    (async () => {
      const code = searchParams.get("code");
      const urlError = searchParams.get("error");
      const urlErrorDesc = searchParams.get("error_description");

      if (urlError) {
        setErrorInfo(`Supabase error: ${urlError}\n${urlErrorDesc || ""}`);
        return;
      }

      if (code) {
        setMsg("Validando sesión con Supabase…");
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          router.replace(next);
          return;
        }
        // Fallback: si falla por PKCE code_verifier, intentar getSession
        // (el token puede haber sido procesado por otro mecanismo o el hash)
        if (error.message?.toLowerCase().includes("code_verifier")) {
          setMsg("Reintentando con sesión existente…");
          await new Promise((r) => setTimeout(r, 500));
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            router.replace(next);
            return;
          }
        }
        setErrorInfo(
          `exchangeCodeForSession failed:\n` +
          `Message: ${error.message}\n` +
          `Status: ${error.status || "N/A"}\n` +
          `Code: ${error.code || "N/A"}\n` +
          `Session exists: ${data?.session ? "YES" : "NO"}\n` +
          `Code length: ${code.length}`
        );
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
          setErrorInfo(`setSession failed: ${error.message}`);
          return;
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.replace(next);
        return;
      }

      setErrorInfo("No se recibió código de autenticación y no hay sesión activa.");
    })();
  }, [router, searchParams]);

  if (errorInfo) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0a] px-4 text-center gap-4">
        <h1 className="text-xl font-bold text-red-400">Error en login con Google</h1>
        <pre className="text-left text-xs text-gray-400 bg-[#1a1a1a] p-4 rounded-lg max-w-lg whitespace-pre-wrap">
          {errorInfo}
        </pre>
        <button
          onClick={() => router.push("/login")}
          className="px-4 py-2 rounded-lg bg-[#FF5722] text-white font-semibold hover:bg-[#E64A19]"
        >
          Volver al login
        </button>
      </div>
    );
  }

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
