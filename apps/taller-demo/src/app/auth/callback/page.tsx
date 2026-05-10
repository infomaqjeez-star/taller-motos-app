"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Procesando login...");
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<string>("");

  useEffect(() => {
    const handleAuth = async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const next = url.searchParams.get("next") || "/taller";
        const urlError = url.searchParams.get("error");
        const urlErrorDesc = url.searchParams.get("error_description");

        // Log para debugging
        console.log("[AuthCallback] URL:", window.location.href);
        console.log("[AuthCallback] code:", code ? "present" : "missing");
        console.log("[AuthCallback] error param:", urlError);
        console.log("[AuthCallback] error_description:", urlErrorDesc);

        // Si Supabase ya devolvió un error en la URL
        if (urlError) {
          setError(`Error de Supabase: ${urlError}`);
          setDetails(urlErrorDesc || "");
          return;
        }

        if (!code) {
          setError("No se recibió código de autenticación");
          setDetails("Google no envió el parámetro 'code'. Probá de nuevo.");
          return;
        }

        setStatus("Verificando sesión con Supabase...");
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          console.error("[AuthCallback] exchangeCodeForSession error:", exchangeError);
          setError(exchangeError.message);
          setDetails(`Código: ${exchangeError.status || "N/A"}`);
          return;
        }

        console.log("[AuthCallback] Session:", data?.session ? "OK" : "NULL");
        setStatus("¡Login exitoso! Redirigiendo...");
        router.push(next);
      } catch (err: any) {
        console.error("[AuthCallback] Unexpected error:", err);
        setError("Error inesperado");
        setDetails(err?.message || String(err));
      }
    };

    handleAuth();
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] text-white gap-4 px-4">
        <AlertTriangle className="w-12 h-12 text-red-500" />
        <h1 className="text-xl font-bold text-red-400">Error en el login</h1>
        <p className="text-gray-300 text-center max-w-md">{error}</p>
        {details && (
          <p className="text-gray-500 text-sm text-center max-w-md bg-[#1a1a1a] p-3 rounded-lg">
            {details}
          </p>
        )}
        <div className="flex gap-3 mt-4">
          <button
            onClick={() => router.push("/login")}
            className="px-4 py-2 rounded-lg bg-[#FF5722] text-white font-semibold hover:bg-[#E64A19] transition-colors"
          >
            Volver al login
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg bg-[#1a1a1a] border border-white/20 text-white font-semibold hover:bg-white/10 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] text-white gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-[#FF5722]" />
      <p className="text-gray-400 text-sm">{status}</p>
    </div>
  );
}
