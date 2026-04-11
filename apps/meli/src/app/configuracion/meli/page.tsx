"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Plus, Trash2, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import Link from "next/link";

interface LinkedAccount {
  id: string;
  meli_user_id: string;
  nickname: string;
  is_active: boolean;
  created_at: string;
}

function ConfiguracionMeliPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Leer mensajes del callback OAuth
    const successParam = searchParams.get("success");
    const nicknameParam = searchParams.get("nickname");
    const errorParam = searchParams.get("error");
    if (successParam === "1") {
      setSuccess(`Cuenta "${nicknameParam || "MeLi"}" conectada exitosamente.`);
    } else if (errorParam) {
      setError(`Error al conectar: ${errorParam}`);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/login");
        return;
      }
      setUser(session.user);
      loadAccounts(session.access_token);
    });
  }, [router, searchParams]);

  async function loadAccounts(token: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/meli-accounts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAccounts(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Error cargando cuentas:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect() {
    setConnecting(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      // Obtener la URL de OAuth de MeLi desde la API
      const res = await fetch("/api/auth/meli-connect", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al iniciar conexion con MeLi");
      }

      const { url } = await res.json();
      window.location.href = url;
    } catch (e) {
      setError((e as Error).message);
      setConnecting(false);
    }
  }

  async function handleDisconnect(accountId: string, nickname: string) {
    if (!confirm(`Desconectar la cuenta "${nickname}"?`)) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/meli-accounts?id=${accountId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.ok) {
        setAccounts(prev => prev.filter(a => a.id !== accountId));
        setSuccess(`Cuenta "${nickname}" desconectada.`);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        throw new Error("Error al desconectar la cuenta");
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: "#121212" }}>
      <div className="max-w-2xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link
            href="/"
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">Cuentas de Mercado Libre</h1>
            <p className="text-sm" style={{ color: "#6B7280" }}>
              Conecta y administra tus cuentas vendedoras
            </p>
          </div>
        </div>

        {/* Alertas */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl mb-4 text-sm" style={{ background: "#2D1515", color: "#F87171" }}>
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 p-3 rounded-xl mb-4 text-sm" style={{ background: "#152D1E", color: "#34D399" }}>
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            {success}
          </div>
        )}

        {/* Boton conectar */}
        <div className="rounded-2xl p-6 mb-6" style={{ background: "#1F1F1F" }}>
          <h2 className="text-white font-semibold mb-2">Vincular nueva cuenta</h2>
          <p className="text-sm mb-4" style={{ color: "#6B7280" }}>
            Conecta tu cuenta de Mercado Libre para gestionar preguntas, etiquetas, precios y mas desde un solo lugar.
          </p>
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-black transition-opacity disabled:opacity-60"
            style={{ background: "#FFE600" }}
          >
            {connecting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            {connecting ? "Redirigiendo a Mercado Libre..." : "Conectar cuenta de Mercado Libre"}
          </button>
        </div>

        {/* Lista de cuentas conectadas */}
        <div className="rounded-2xl p-6" style={{ background: "#1F1F1F" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">Cuentas conectadas</h2>
            {!loading && user && (
              <button
                onClick={async () => {
                  const { data: { session } } = await supabase.auth.getSession();
                  if (session) loadAccounts(session.access_token);
                }}
                className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
              >
                <RefreshCw className="w-4 h-4" style={{ color: "#6B7280" }} />
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-5 h-5 animate-spin" style={{ color: "#FFE600" }} />
            </div>
          ) : accounts.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: "#6B7280" }}>
              No tienes cuentas conectadas. Usa el boton de arriba para vincular tu primera cuenta.
            </p>
          ) : (
            <div className="space-y-3">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-4 rounded-xl"
                  style={{ background: "#2A2A2A" }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: account.is_active ? "#34D399" : "#6B7280" }}
                    />
                    <div>
                      <p className="text-white font-medium text-sm">{account.nickname || `Cuenta ${account.meli_user_id}`}</p>
                      <p className="text-xs" style={{ color: "#6B7280" }}>
                        ID: {account.meli_user_id}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDisconnect(account.id, account.nickname || account.meli_user_id)}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    title="Desconectar cuenta"
                  >
                    <Trash2 className="w-4 h-4" style={{ color: "#F87171" }} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Nota sobre permisos */}
        <p className="text-xs text-center mt-4" style={{ color: "#4B5563" }}>
          Al conectar tu cuenta autorizas a MaqJeez a leer publicaciones, preguntas y ordenes.
          Puedes desconectar en cualquier momento.
        </p>
      </div>
    </div>
  );
}

export default function ConfiguracionMeliPageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#121212" }}>
        <RefreshCw className="w-6 h-6 animate-spin" style={{ color: "#FFE600" }} />
      </div>
    }>
      <ConfiguracionMeliPage />
    </Suspense>
  );
}
