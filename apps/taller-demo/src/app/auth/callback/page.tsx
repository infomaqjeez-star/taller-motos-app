"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Procesando login...");

  useEffect(() => {
    const handleAuth = async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const next = url.searchParams.get("next") || "/taller";

        if (!code) {
          setStatus("Error: no se recibió código de autenticación");
          setTimeout(() => router.push("/login?error=no_code"), 2000);
          return;
        }

        setStatus("Verificando sesión...");
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          console.error("Auth callback error:", error.message);
          setStatus(`Error: ${error.message}`);
          setTimeout(() => router.push("/login?error=auth_callback_failed"), 2000);
          return;
        }

        setStatus("¡Login exitoso! Redirigiendo...");
        router.push(next);
      } catch (err) {
        console.error("Unexpected error:", err);
        setStatus("Error inesperado");
        setTimeout(() => router.push("/login?error=unexpected"), 2000);
      }
    };

    handleAuth();
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] text-white gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-[#FF5722]" />
      <p className="text-gray-400 text-sm">{status}</p>
    </div>
  );
}
