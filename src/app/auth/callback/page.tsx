"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error("Auth callback error:", error);
        router.push("/login?error=auth_callback_failed");
        return;
      }

      if (session) {
        // Usuario autenticado exitosamente
        router.push("/appjeez");
      } else {
        // No hay sesión, redirigir al login
        router.push("/login");
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-[#FFE600] animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Completando autenticación...</p>
      </div>
    </div>
  );
}
