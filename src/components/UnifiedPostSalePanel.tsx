"use client";

import { AlertTriangle, Clock, Scale, TrendingDown, ExternalLink } from "lucide-react";

interface CriticalMetric {
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

interface Props {
  accounts: CriticalMetric[];
  isLoading?: boolean;
}

const RISK_COLORS: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  low: {
    bg: "#39FF1422",
    border: "#39FF14",
    text: "#39FF14",
    icon: "✓",
  },
  medium: {
    bg: "#FFE60022",
    border: "#FFE600",
    text: "#FFE600",
    icon: "⚠",
  },
  high: {
    bg: "#FF572222",
    border: "#FF5722",
    text: "#FF5722",
    icon: "⚠⚠",
  },
  critical: {
    bg: "#EF444422",
    border: "#EF4444",
    text: "#EF4444",
    icon: "🚨",
  },
};

export default function UnifiedPostSalePanel({ accounts, isLoading = false }: Props) {
  if (isLoading) {
    return (
      <div
        className="rounded-lg p-4"
        style={{ background: "#181818", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div className="animate-pulse flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-gray-600 border-t-gray-400 rounded-full animate-spin" />
          <span className="text-xs text-gray-400">Cargando datos de post-venta...</span>
        </div>
      </div>
    );
  }

  // Filtrar solo cuentas con problemas
  const problematicAccounts = accounts.filter(
    a =>
      (a.claims_count ?? 0) > 0 ||
      (a.mediations_count ?? 0) > 0 ||
      (a.delayed_shipments ?? 0) > 0 ||
      a.reputation_risk !== "low"
  );

  if (problematicAccounts.length === 0) {
    return (
      <div
        className="rounded-lg p-4 text-center"
        style={{ background: "#181818", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div className="flex items-center justify-center gap-2 text-green-400 text-sm">
          <span>✓</span>
          <span>Todas las cuentas están en orden</span>
        </div>
      </div>
    );
  }

  // Calcular totales
  const totalClaims = problematicAccounts.reduce((s, a) => s + (a.claims_count ?? 0), 0);
  const totalMediations = problematicAccounts.reduce((s, a) => s + (a.mediations_count ?? 0), 0);
  const totalDelayed = problematicAccounts.reduce((s, a) => s + (a.delayed_shipments ?? 0), 0);
  const criticalCount = problematicAccounts.filter(a => a.reputation_risk === "critical").length;

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ background: "#181818", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 border-b flex items-center justify-between"
        style={{ borderColor: "rgba(255,255,255,0.06)", background: "#0f0f0f" }}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" style={{ color: "#EF4444" }} />
          <h3 className="font-bold text-sm">Gestión Post-Venta</h3>
          <span
            className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black"
            style={{ background: "#EF4444", color: "#fff" }}
          >
            {problematicAccounts.length}
          </span>
        </div>
        <a
          href="/appjeez/post-venta"
          className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
        >
          Ver todo <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-2 px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="text-center">
          <p className="text-xs font-bold" style={{ color: "#EF4444" }}>
            {totalClaims}
          </p>
          <p className="text-[9px]" style={{ color: "#6B7280" }}>
            Reclamos
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs font-bold" style={{ color: "#FF5722" }}>
            {totalMediations}
          </p>
          <p className="text-[9px]" style={{ color: "#6B7280" }}>
            Mediaciones
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs font-bold" style={{ color: "#FFE600" }}>
            {totalDelayed}
          </p>
          <p className="text-[9px]" style={{ color: "#6B7280" }}>
            Envíos Retrasados
          </p>
        </div>
      </div>

      {/* Critical Accounts List */}
      <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        {problematicAccounts.map((acc) => {
          const risk = RISK_COLORS[acc.reputation_risk];
          const maxIssues = Math.max(acc.claims_count ?? 0, acc.mediations_count ?? 0, acc.delayed_shipments ?? 0);

          return (
            <div key={acc.meli_user_id} className="px-4 py-2.5 hover:bg-opacity-50 transition-colors" style={{ background: "rgba(0,0,0,0.2)" }}>
              {/* Account Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded text-xs font-bold flex items-center justify-center flex-shrink-0"
                    style={{ background: risk.bg, color: risk.text }}
                  >
                    📦
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">{acc.account_name}</p>
                  </div>
                </div>
                <span
                  className="text-[10px] font-black px-1.5 py-0.5 rounded flex-shrink-0"
                  style={{ background: risk.bg, color: risk.text, border: `1px solid ${risk.border}` }}
                >
                  {risk.icon}
                </span>
              </div>

              {/* Issues Grid */}
              <div className="grid grid-cols-3 gap-1.5">
                {/* Reclamos */}
                {(acc.claims_count ?? 0) > 0 && (
                  <div
                    className="rounded p-1.5 text-center cursor-pointer transition-all hover:scale-105 hover:shadow-lg"
                    style={{
                      background: "#EF444222",
                      border: "1px solid #EF444444",
                    }}
                    onClick={() => console.log("Clicked claims for account:", acc.meli_user_id)}
                  >
                    <p className="text-xs font-bold" style={{ color: "#EF4444" }}>
                      {acc.claims_count}
                    </p>
                    <p className="text-[9px]" style={{ color: "#6B7280" }}>
                      Reclamos
                    </p>
                    {acc.claims_percent && (
                      <p className="text-[8px]" style={{ color: "#EF4444" }}>
                        {acc.claims_percent.toFixed(2)}%
                      </p>
                    )}
                  </div>
                )}

                {/* Mediaciones */}
                {(acc.mediations_count ?? 0) > 0 && (
                  <div
                    className="rounded p-1.5 text-center cursor-pointer transition-all hover:scale-105 hover:shadow-lg"
                    style={{
                      background: "#FF572222",
                      border: "1px solid #FF572244",
                    }}
                    onClick={() => console.log("Clicked mediations for account:", acc.meli_user_id)}
                  >
                    <p className="text-xs font-bold" style={{ color: "#FF5722" }}>
                      {acc.mediations_count}
                    </p>
                    <p className="text-[9px]" style={{ color: "#6B7280" }}>
                      Mediaciones
                    </p>
                    {acc.mediations_percent && (
                      <p className="text-[8px]" style={{ color: "#FF5722" }}>
                        {acc.mediations_percent.toFixed(2)}%
                      </p>
                    )}
                  </div>
                )}

                {/* Envíos Retrasados */}
                {(acc.delayed_shipments ?? 0) > 0 && (
                  <div
                    className="rounded p-1.5 text-center cursor-pointer transition-all hover:scale-105 hover:shadow-lg"
                    style={{
                      background: "#FFE60022",
                      border: "1px solid #FFE60044",
                    }}
                    onClick={() => console.log("Clicked delays for account:", acc.meli_user_id)}
                  >
                    <p className="text-xs font-bold" style={{ color: "#FFE600" }}>
                      {acc.delayed_shipments}
                    </p>
                    <p className="text-[9px]" style={{ color: "#6B7280" }}>
                      Retrasados
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Critical Alert Banner */}
      {criticalCount > 0 && (
        <div
          className="px-4 py-2.5 flex items-center gap-2 text-xs font-semibold"
          style={{ background: "#EF444422", borderTop: "1px solid #EF444444" }}
        >
          <span className="animate-pulse">🚨</span>
          <span style={{ color: "#EF4444" }}>
            {criticalCount} cuenta{criticalCount > 1 ? "s" : ""} en riesgo crítico
          </span>
        </div>
      )}
    </div>
  );
}
