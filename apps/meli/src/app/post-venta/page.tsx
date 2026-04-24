"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import UnifiedPostSalePanel from "@/components/UnifiedPostSalePanel";
import { supabase } from "@/lib/supabase";

interface AccountData {
  meli_user_id: string;
  account_name: string;
  claims_count: number;
  claims_percent?: number;
  mediations_count?: number;
  mediations_percent?: number;
  delayed_shipments?: number;
  cancellations_percent?: number;
  reputation_risk: "low" | "medium" | "high" | "critical";
}

function PostVentaContent() {
  const searchParams = useSearchParams();
  const selectedAccount = searchParams.get("account");

  const [accounts, setAccounts] = useState<AccountData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        // Get session token for auth header
        const { data: { session } } = await supabase.auth.getSession();
        const authToken = session?.access_token;

        const headers: HeadersInit = { "Content-Type": "application/json" };
        if (authToken) {
          headers["Authorization"] = `Bearer ${authToken}`;
        }

        const res = await fetch("/api/meli-accounts", { headers });
        if (!res.ok) throw new Error("Failed to fetch accounts");
        const data = await res.json();

        // Transformar datos al formato requerido
        // Endpoint returns: {id, meli_user_id, nickname, is_active}
        const transformed = data.map((acc: any) => {
          return {
            meli_user_id: acc.meli_user_id,
            account_name: acc.nickname ?? acc.meli_nickname ?? acc.account_name ?? acc.meli_user_id,
            claims_count: 0,
            claims_percent: undefined,
            mediations_count: 0,
            mediations_percent: undefined,
            delayed_shipments: 0,
            cancellations_percent: undefined,
            reputation_risk: "low" as const,
          };
        });

        setAccounts(transformed);
        setError(null);
      } catch (err) {
        setError((err as Error).message);
        setLoading(false);
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, []);

  return (
    <div className="min-h-screen flex" style={{ background: "#121212" }}>
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div
          className="border-b px-4 py-4 flex items-center justify-between"
          style={{ borderColor: "rgba(255,255,255,0.08)", background: "#181818" }}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" style={{ color: "#EF4444" }} />
            <h1 className="font-black text-lg text-white">
              Gestión Post-Venta {selectedAccount ? `- @${selectedAccount}` : "(Unificada)"}
            </h1>
          </div>
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all hover:bg-opacity-80"
            style={{ background: "#FFE60022", color: "#FFE600", textDecoration: "none" }}
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al Dashboard
          </Link>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto px-4 py-4">
          {error && (
            <div
              className="rounded-lg p-4 mb-4 text-sm"
              style={{ background: "#EF444422", color: "#EF4444" }}
            >
              Error: {error}
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="rounded-2xl p-6 text-center" style={{ background: "#1F1F1F" }}>
              <div className="w-10 h-10 mx-auto mb-2 rounded-full border-2 border-yellow-400 border-t-transparent animate-spin" />
              <p className="text-white font-bold mb-1">Cargando cuentas...</p>
              <p className="text-sm" style={{ color: "#6B7280" }}>
                Estamos conectando con Mercado Libre
              </p>
            </div>
          )}

          {/* No accounts state */}
          {!loading && !error && accounts.length === 0 && (
            <div className="rounded-2xl p-6 text-center" style={{ background: "#ef444418", border: "1px solid #ef444440" }}>
              <AlertTriangle className="w-10 h-10 mx-auto mb-2" style={{ color: "#ef4444" }} />
              <p className="text-white font-bold mb-1">No hay cuentas disponibles</p>
              <p className="text-sm" style={{ color: "#6B7280" }}>
                Conectá al menos una cuenta de Mercado Libre desde el Dashboard.
              </p>
              <Link 
                href="/"
                className="inline-block mt-3 px-4 py-2 rounded-xl text-sm font-bold text-black"
                style={{ background: "#FFE600" }}
              >
                Ir al Dashboard
              </Link>
            </div>
          )}

          {/* Unified Panel */}
          {accounts.length > 0 && (
            <UnifiedPostSalePanel accounts={accounts} isLoading={loading} />
          )}

          {/* Tabla Detallada */}
          {!loading && accounts.length > 0 && (
            <div
              className="mt-6 rounded-lg overflow-hidden"
              style={{ background: "#181818", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              {/* Header */}
              <div
                className="px-4 py-3 grid grid-cols-5 gap-2 text-xs font-bold"
                style={{ background: "#0f0f0f", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div>Cuenta</div>
                <div className="text-center">Reclamos</div>
                <div className="text-center">Mediaciones</div>
                <div className="text-center">Demoras</div>
                <div className="text-center">Riesgo</div>
              </div>

              {/* Rows */}
              <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                {accounts.map((acc) => (
                  <div
                    key={acc.meli_user_id}
                    className="px-4 py-3 grid grid-cols-5 gap-2 items-center text-xs hover:bg-opacity-50 transition-colors"
                    style={{ background: "rgba(0,0,0,0.2)" }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-6 h-6 rounded text-xs font-bold flex items-center justify-center flex-shrink-0"
                        style={{ background: "#FFE600", color: "#121212" }}
                      >
                        📦
                      </span>
                      <span className="truncate">{acc.account_name}</span>
                    </div>

                    <div className="text-center cursor-pointer transition-all hover:scale-105 hover:opacity-80">
                      <p className="font-bold" style={{ color: acc.claims_count > 0 ? "#EF4444" : "#6B7280" }}>
                        {acc.claims_count}
                      </p>
                      {acc.claims_percent && (
                        <p style={{ color: "#6B7280", fontSize: "10px" }}>
                          {acc.claims_percent.toFixed(2)}%
                        </p>
                      )}
                    </div>

                    <div className="text-center cursor-pointer transition-all hover:scale-105 hover:opacity-80">
                      <p className="font-bold" style={{ color: (acc.mediations_count ?? 0) > 0 ? "#FF5722" : "#6B7280" }}>
                        {acc.mediations_count ?? 0}
                      </p>
                      {acc.mediations_percent && (
                        <p style={{ color: "#6B7280", fontSize: "10px" }}>
                          {acc.mediations_percent.toFixed(2)}%
                        </p>
                      )}
                    </div>

                    <div className="text-center cursor-pointer transition-all hover:scale-105 hover:opacity-80">
                      <p className="font-bold" style={{ color: (acc.delayed_shipments ?? 0) > 0 ? "#FFE600" : "#6B7280" }}>
                        {acc.delayed_shipments ?? 0}
                      </p>
                      {acc.cancellations_percent && (
                        <p style={{ color: "#6B7280", fontSize: "10px" }}>
                          {acc.cancellations_percent.toFixed(2)}%
                        </p>
                      )}
                    </div>

                    <div className="text-center">
                      <span
                        className="inline-block px-2 py-1 rounded text-[10px] font-bold"
                        style={{
                          background:
                            acc.reputation_risk === "critical"
                              ? "#EF444422"
                              : acc.reputation_risk === "high"
                                ? "#FF572222"
                                : acc.reputation_risk === "medium"
                                  ? "#FFE60022"
                                  : "#39FF1422",
                          color:
                            acc.reputation_risk === "critical"
                              ? "#EF4444"
                              : acc.reputation_risk === "high"
                                ? "#FF5722"
                                : acc.reputation_risk === "medium"
                                  ? "#FFE600"
                                  : "#39FF14",
                        }}
                      >
                        {acc.reputation_risk === "critical"
                          ? "🚨 Crítico"
                          : acc.reputation_risk === "high"
                            ? "⚠️ Alto"
                            : acc.reputation_risk === "medium"
                              ? "⚠ Medio"
                              : "✓ Bajo"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && accounts.length === 0 && (
            <div className="text-center py-10">
              <p style={{ color: "#6B7280" }}>No hay cuentas disponibles</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PostVentaPage() {
  return (
    <Suspense fallback={<div style={{ background: "#121212", minHeight: "100vh" }} />}>
      <PostVentaContent />
    </Suspense>
  );
}
