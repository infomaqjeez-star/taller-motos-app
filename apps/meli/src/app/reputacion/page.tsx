"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft, RefreshCw, Star, TrendingUp, TrendingDown,
  ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle2,
  Award, Clock, Package, XCircle, Minus,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

// ── Tipos ────────────────────────────────────────────────────────────────────
interface Reputation {
  level_id: string | null;
  power_seller_status: string | null;
  transactions_total: number;
  transactions_completed: number;
  ratings_positive: number;
  ratings_negative: number;
  ratings_neutral: number;
  delayed_handling_time: number;
  claims: number;
  cancellations: number;
}

interface AccountDash {
  account: string;
  meli_user_id: string;
  reputation: Reputation;
  claims_count: number;
  today_orders: number;
  total_items: number;
  error?: string;
}

// ── Constantes de niveles MeLi ───────────────────────────────────────────────
const LEVELS: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  "5_green":       { label: "Verde",         color: "#22c55e", bg: "#22c55e18", icon: "🟢" },
  "4_light_green": { label: "Verde claro",   color: "#86efac", bg: "#86efac18", icon: "🟩" },
  "3_yellow":      { label: "Amarillo",      color: "#FFE600", bg: "#FFE60018", icon: "🟡" },
  "2_orange":      { label: "Naranja",       color: "#f97316", bg: "#f9731618", icon: "🟠" },
  "1_red":         { label: "Rojo",          color: "#ef4444", bg: "#ef444418", icon: "🔴" },
};

const POWER: Record<string, { label: string; color: string }> = {
  platinum: { label: "Platinum",      color: "#38bdf8" },
  gold:     { label: "Gold",          color: "#FFE600" },
  silver:   { label: "Silver",        color: "#9ca3af" },
};

const pct  = (v: number) => `${(v * 100).toFixed(1)}%`;
const fmt  = (n: number) => n.toLocaleString("es-AR");

// ── Componente: badge de nivel ───────────────────────────────────────────────
function LevelBadge({ level }: { level: string | null }) {
  const info = level ? (LEVELS[level] ?? null) : null;
  if (!info) return <span className="text-[10px] text-gray-500">Sin nivel</span>;
  return (
    <span
      className="text-[10px] font-black px-2 py-0.5 rounded-full"
      style={{ background: info.bg, color: info.color, border: `1px solid ${info.color}44` }}
    >
      {info.icon} {info.label}
    </span>
  );
}

// ── Componente: barra de nivel MeLi ──────────────────────────────────────────
function LevelBar({ level }: { level: string | null }) {
  const order = ["1_red", "2_orange", "3_yellow", "4_light_green", "5_green"];
  return (
    <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5 my-3">
      {order.map(lvl => {
        const info = LEVELS[lvl];
        const active = level === lvl;
        return (
          <div
            key={lvl}
            className="flex-1 rounded-sm transition-all"
            style={{ background: info.color, opacity: active ? 1 : 0.18 }}
          />
        );
      })}
    </div>
  );
}

// ── Componente: métrica individual ───────────────────────────────────────────
function MetricRow({
  icon, label, value, rate, limit, invertGood = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  rate: number;
  limit: number;
  invertGood?: boolean;
}) {
  const bad = invertGood ? rate > limit : rate > limit;
  const pctFill = Math.min((rate / (limit * 2)) * 100, 100);
  const color = bad ? "#ef4444" : "#22c55e";

  return (
    <div className="flex items-center gap-3 py-2.5 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
      <div className="flex-shrink-0" style={{ color: bad ? "#ef4444" : "#6b7280" }}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-400">{label}</span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black" style={{ color }}>{value}</span>
            {bad
              ? <TrendingUp className="w-3 h-3" style={{ color: "#ef4444" }} />
              : <TrendingDown className="w-3 h-3" style={{ color: "#22c55e" }} />
            }
          </div>
        </div>
        <div className="h-1 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pctFill}%`, background: color }}
          />
        </div>
        <p className="text-[9px] mt-0.5" style={{ color: "#4b5563" }}>Límite MeLi: {pct(limit)}</p>
      </div>
    </div>
  );
}

// ── Componente: tarjeta de una cuenta ────────────────────────────────────────
function ReputationCard({ data }: { data: AccountDash }) {
  const rep = data.reputation;
  const levelInfo = rep.level_id ? (LEVELS[rep.level_id] ?? null) : null;
  const powerInfo = rep.power_seller_status ? (POWER[rep.power_seller_status] ?? null) : null;

  const hasIssues = rep.delayed_handling_time > 0.18 || rep.claims > 0.02 || rep.cancellations > 0.02;

  const totalRatings = (rep.ratings_positive + rep.ratings_negative + rep.ratings_neutral) || 1;
  const positivePct  = rep.ratings_positive / totalRatings;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "#181818",
        border: `1px solid ${hasIssues ? "#ef444430" : "rgba(255,255,255,0.08)"}`,
      }}
    >
      {/* ── Encabezado de la cuenta ── */}
      <div
        className="px-5 py-4 flex items-center justify-between"
        style={{
          background: levelInfo
            ? `linear-gradient(135deg, ${levelInfo.color}12, transparent)`
            : "#1F1F1F",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center font-black text-lg text-black flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${levelInfo?.color ?? "#FFE600"}, ${levelInfo?.color ?? "#FF9800"}99)` }}
          >
            {data.account.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h3 className="font-black text-white text-sm">{data.account}</h3>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <LevelBadge level={rep.level_id} />
              {powerInfo && (
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: `${powerInfo.color}18`, color: powerInfo.color, border: `1px solid ${powerInfo.color}44` }}
                >
                  <Award className="w-2.5 h-2.5 inline mr-0.5" />{powerInfo.label}
                </span>
              )}
              {hasIssues
                ? <span className="text-[10px] font-bold text-red-400 flex items-center gap-0.5"><AlertTriangle className="w-2.5 h-2.5" /> Requiere atención</span>
                : <span className="text-[10px] font-bold text-green-400 flex items-center gap-0.5"><CheckCircle2 className="w-2.5 h-2.5" /> En regla</span>
              }
            </div>
          </div>
        </div>

        {/* Score de reputación circular */}
        <div className="text-center flex-shrink-0">
          <p className="text-2xl font-black" style={{ color: levelInfo?.color ?? "#fff" }}>
            {Math.round(positivePct * 100)}
            <span className="text-xs font-normal text-gray-500">%</span>
          </p>
          <p className="text-[9px] text-gray-500">positivas</p>
        </div>
      </div>

      <div className="px-5 py-4">
        {/* Barra de nivel */}
        <LevelBar level={rep.level_id} />

        {/* Métricas clave */}
        <div className="mb-4">
          <MetricRow
            icon={<Clock className="w-3.5 h-3.5" />}
            label="Envíos con demora"
            value={pct(rep.delayed_handling_time)}
            rate={rep.delayed_handling_time}
            limit={0.18}
          />
          <MetricRow
            icon={<ShieldAlert className="w-3.5 h-3.5" />}
            label="Tasa de reclamos"
            value={pct(rep.claims)}
            rate={rep.claims}
            limit={0.02}
          />
          <MetricRow
            icon={<XCircle className="w-3.5 h-3.5" />}
            label="Cancelaciones"
            value={pct(rep.cancellations)}
            rate={rep.cancellations}
            limit={0.02}
          />
        </div>

        {/* Calificaciones */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: "Positivas", value: fmt(rep.ratings_positive), pct: pct(positivePct), color: "#22c55e" },
            { label: "Negativas", value: fmt(rep.ratings_negative), pct: pct(rep.ratings_negative / totalRatings), color: "#ef4444" },
            { label: "Neutras",   value: fmt(rep.ratings_neutral),  pct: pct(rep.ratings_neutral / totalRatings),  color: "#6b7280" },
          ].map(r => (
            <div key={r.label} className="rounded-xl p-2.5 text-center" style={{ background: "#121212" }}>
              <p className="text-base font-black" style={{ color: r.color }}>{r.value}</p>
              <p className="text-[9px] font-bold" style={{ color: r.color }}>{r.pct}</p>
              <p className="text-[9px] text-gray-600 mt-0.5">{r.label}</p>
            </div>
          ))}
        </div>

        {/* Datos extra */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Transacciones", value: fmt(rep.transactions_total), icon: <Package className="w-3.5 h-3.5" />, color: "#00E5FF" },
            { label: "Completadas",   value: fmt(rep.transactions_completed), icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: "#22c55e" },
            { label: "Publicaciones", value: fmt(data.total_items), icon: <Star className="w-3.5 h-3.5" />, color: "#FFE600" },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-2.5 text-center" style={{ background: "#121212" }}>
              <div className="flex justify-center mb-1" style={{ color: s.color }}>{s.icon}</div>
              <p className="text-sm font-black text-white">{s.value}</p>
              <p className="text-[9px] text-gray-600">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Componente: resumen global ───────────────────────────────────────────────
function GlobalSummary({ accounts }: { accounts: AccountDash[] }) {
  const total       = accounts.length;
  const withIssues  = accounts.filter(a =>
    a.reputation.delayed_handling_time > 0.18 ||
    a.reputation.claims > 0.02 ||
    a.reputation.cancellations > 0.02
  ).length;
  const greens      = accounts.filter(a =>
    a.reputation.level_id === "5_green" || a.reputation.level_id === "4_light_green"
  ).length;
  const openClaims  = accounts.reduce((s, a) => s + (a.claims_count ?? 0), 0);

  const items: { label: string; value: string | number; color: string; icon: React.ReactNode }[] = [
    { label: "Cuentas totales",   value: total,       color: "#00E5FF",  icon: <ShieldCheck className="w-4 h-4" /> },
    { label: "En verde MeLi",     value: greens,      color: "#22c55e",  icon: <CheckCircle2 className="w-4 h-4" /> },
    { label: "Requieren atención",value: withIssues,  color: withIssues > 0 ? "#ef4444" : "#22c55e", icon: <AlertTriangle className="w-4 h-4" /> },
    { label: "Reclamos abiertos", value: openClaims,  color: openClaims > 0 ? "#f97316" : "#22c55e", icon: <ShieldAlert className="w-4 h-4" /> },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {items.map(item => (
        <div
          key={item.label}
          className="rounded-2xl p-4"
          style={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="flex items-center gap-2 mb-1" style={{ color: item.color }}>
            {item.icon}
            <span className="text-xs text-gray-400">{item.label}</span>
          </div>
          <p className="text-3xl font-black" style={{ color: item.color }}>{item.value}</p>
        </div>
      ))}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function ReputacionPage() {
  const [accounts, setAccounts] = useState<AccountDash[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Sin sesión activa");

      const res = await fetch("/api/meli-dashboard", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: AccountDash[] = await res.json();
      setAccounts(data.filter(a => !a.error || a.reputation));
      setLastUpdate(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <main className="min-h-screen pb-24" style={{ background: "#121212" }}>
      {/* Header */}
      <div
        className="sticky top-0 z-30 px-4 py-3 flex items-center justify-between border-b"
        style={{
          background: "rgba(18,18,18,0.97)",
          backdropFilter: "blur(16px)",
          borderColor: "rgba(255,255,255,0.07)",
        }}
      >
        <div className="flex items-center gap-3">
          <Link href="/" className="p-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }}>
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </Link>
          <div>
            <h1 className="font-black text-white text-base flex items-center gap-2">
              <Star className="w-5 h-5" style={{ color: "#FFE600" }} />
              Reputaciones Unificadas
            </h1>
            <p className="text-[10px]" style={{ color: "#6B7280" }}>
              {accounts.length} cuenta{accounts.length !== 1 ? "s" : ""}
              {lastUpdate ? ` · ${lastUpdate.toLocaleTimeString()}` : ""}
            </p>
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold disabled:opacity-40"
          style={{ background: "#1F1F1F", color: "#FFE600", border: "1px solid #FFE60044" }}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Sync..." : "Actualizar"}
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-6">
        {/* Estado de carga */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 rounded-full border-2 border-yellow-400 border-t-transparent animate-spin" />
            <p className="text-sm text-gray-400 font-medium">Consultando reputaciones en MeLi...</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="rounded-2xl p-6 text-center mb-6" style={{ background: "#ef444418", border: "1px solid #ef444440" }}>
            <AlertTriangle className="w-10 h-10 mx-auto mb-2 text-red-400" />
            <p className="text-white font-bold mb-1">Error al cargar reputaciones</p>
            <p className="text-sm text-gray-500 mb-3">{error}</p>
            <button
              onClick={load}
              className="px-4 py-2 rounded-xl text-sm font-bold text-black"
              style={{ background: "#FFE600" }}
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Sin cuentas */}
        {!loading && !error && accounts.length === 0 && (
          <div className="rounded-2xl p-6 text-center" style={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.07)" }}>
            <Minus className="w-10 h-10 mx-auto mb-2 text-gray-600" />
            <p className="text-white font-bold mb-1">No hay cuentas conectadas</p>
            <Link href="/" className="inline-block mt-3 px-4 py-2 rounded-xl text-sm font-bold text-black" style={{ background: "#FFE600" }}>
              Ir al Dashboard
            </Link>
          </div>
        )}

        {/* Contenido principal */}
        {!loading && accounts.length > 0 && (
          <>
            <GlobalSummary accounts={accounts} />

            {/* Alerta general si hay cuentas con problemas */}
            {accounts.some(a =>
              a.reputation.delayed_handling_time > 0.18 ||
              a.reputation.claims > 0.02 ||
              a.reputation.cancellations > 0.02
            ) && (
              <div
                className="rounded-2xl p-4 mb-6 flex items-start gap-3"
                style={{ background: "#ef444412", border: "1px solid #ef444430" }}
              >
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-white">Hay métricas que superan los límites de MeLi</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Revisá las cuentas marcadas en rojo. Superarlos puede bajar tu nivel de reputación.
                  </p>
                </div>
              </div>
            )}

            {/* Grid de tarjetas */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {accounts.map(acc => (
                <ReputationCard key={acc.meli_user_id} data={acc} />
              ))}
            </div>

            {/* Leyenda de niveles */}
            <div
              className="mt-6 rounded-2xl p-4"
              style={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <p className="text-xs font-bold text-gray-400 mb-3">Niveles de reputación MeLi</p>
              <div className="flex flex-wrap gap-3">
                {Object.entries(LEVELS).reverse().map(([key, info]) => (
                  <div key={key} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ background: info.color }} />
                    <span className="text-xs text-gray-500">{info.label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] text-gray-600">
                <div className="flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> Reclamos: máx. 2%</div>
                <div className="flex items-center gap-1"><XCircle className="w-3 h-3" /> Cancelaciones: máx. 2%</div>
                <div className="flex items-center gap-1"><Clock className="w-3 h-3" /> Demoras en envío: máx. 18%</div>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
