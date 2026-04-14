"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  TrendingUp, ShoppingCart, MessageCircle, Package,
  DollarSign, RefreshCw, BarChart2, CheckCircle, ArrowLeft, Truck,
} from "lucide-react";
import Link from "next/link";

type Periodo = "hoy" | "semana" | "mes" | "todo";

const PERIODOS: { key: Periodo; label: string }[] = [
  { key: "hoy",    label: "Hoy"       },
  { key: "semana", label: "Semana"    },
  { key: "mes",    label: "Este mes"  },
  { key: "todo",   label: "Todo"      },
];

const fmt = (n: number) =>
  "$" + Math.round(n).toLocaleString("es-AR");

function StatCard({
  icon: Icon, label, value, sub, color,
}: {
  icon: any; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <div className="rounded-2xl p-5" style={{ background: "#1F1F1F" }}>
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-xl" style={{ background: color + "22" }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <span className="text-sm font-medium" style={{ color: "#9CA3AF" }}>{label}</span>
      </div>
      <p className="text-2xl font-black text-white">{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: "#6B7280" }}>{sub}</p>}
    </div>
  );
}

export default function EstadisticasMeliPage() {
  const router = useRouter();
  const [periodo, setPeriodo] = useState<Periodo>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("meli-stats-periodo");
      if (saved && ["hoy", "semana", "mes", "todo"].includes(saved)) return saved as Periodo;
    }
    return "mes";
  });

  function changePeriodo(p: Periodo) {
    setPeriodo(p);
    localStorage.setItem("meli-stats-periodo", p);
    load(p);
  }
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (p: Periodo) => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }

      const res = await fetch(`/api/meli-stats?periodo=${p}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { load(periodo); }, [periodo, load]);

  const totales = data?.totales;
  const respRate = totales?.preguntas > 0
    ? Math.round((totales.respondidas / totales.preguntas) * 100)
    : 0;

  return (
    <div className="min-h-screen pb-24" style={{ background: "#121212" }}>
      <div className="max-w-3xl mx-auto p-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 pt-2">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 rounded-xl hover:bg-white/5 transition-colors">
              <ArrowLeft className="w-5 h-5 text-white" />
            </Link>
            <div className="p-2.5 rounded-xl" style={{ background: "#FFE60022" }}>
              <BarChart2 className="w-6 h-6" style={{ color: "#FFE600" }} />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">Estadisticas MeLi</h1>
              <p className="text-xs" style={{ color: "#6B7280" }}>Todas tus cuentas de Mercado Libre</p>
            </div>
          </div>
          <button
            onClick={() => load(periodo)}
            disabled={loading}
            className="p-2 rounded-xl hover:bg-white/5 transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} style={{ color: "#6B7280" }} />
          </button>
        </div>

        {/* Selector de periodo */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {PERIODOS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => changePeriodo(key)}
              className="px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all"
              style={{
                background: periodo === key ? "#FFE600" : "#1F1F1F",
                color: periodo === key ? "#000" : "#9CA3AF",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {error && (
          <div className="p-4 rounded-2xl mb-4 text-sm" style={{ background: "#2D1515", color: "#F87171" }}>
            Error al cargar: {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center py-24 gap-3">
            <RefreshCw className="w-8 h-8 animate-spin" style={{ color: "#FFE600" }} />
            <p className="text-sm" style={{ color: "#6B7280" }}>Cargando estadisticas...</p>
          </div>
        ) : !data || data.accounts?.length === 0 ? (
          <div className="text-center py-20 rounded-2xl" style={{ background: "#1F1F1F" }}>
            <BarChart2 className="w-12 h-12 mx-auto mb-4" style={{ color: "#374151" }} />
            <p className="text-white font-semibold">Sin cuentas MeLi conectadas</p>
            <p className="text-sm mt-1" style={{ color: "#6B7280" }}>
              Conecta una cuenta desde la pagina de configuracion
            </p>
          </div>
        ) : (
          <>
            {/* Tarjetas de resumen */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <StatCard
                icon={DollarSign}
                label="Facturacion"
                value={fmt(totales?.facturacion || 0)}
                sub={`${totales?.ventas || 0} ordenes pagadas`}
                color="#34D399"
              />
              <StatCard
                icon={ShoppingCart}
                label="Ventas"
                value={totales?.ventas || 0}
                sub="ordenes pagadas"
                color="#60A5FA"
              />
              <StatCard
                icon={MessageCircle}
                label="Preguntas"
                value={totales?.preguntas || 0}
                sub={`${respRate}% respondidas`}
                color="#F59E0B"
              />
              <StatCard
                icon={Package}
                label="Publicaciones"
                value={totales?.publicaciones || 0}
                sub="activas en este momento"
                color="#A78BFA"
              />
            </div>

            {/* Grafico de ventas por dia */}
            {data.ventas_por_dia?.length > 0 && (
              <div className="rounded-2xl p-5 mb-6" style={{ background: "#1F1F1F" }}>
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4" style={{ color: "#34D399" }} />
                  <h2 className="text-white font-semibold text-sm">Facturacion por dia</h2>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={data.ventas_por_dia} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                    <XAxis
                      dataKey="dia"
                      tick={{ fill: "#6B7280", fontSize: 10 }}
                      tickFormatter={(v) => v.slice(5)}
                    />
                    <YAxis tick={{ fill: "#6B7280", fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ background: "#1F1F1F", border: "none", borderRadius: 12 }}
                      labelStyle={{ color: "#9CA3AF" }}
                      formatter={(v: any) => [fmt(v), "Ventas"]}
                    />
                    <Bar dataKey="total" fill="#FFE600" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Ventas por tipo de envio */}
            {data.ventas_por_tipo && Object.keys(data.ventas_por_tipo).length > 0 && (
              <div className="rounded-2xl p-5 mb-6" style={{ background: "#1F1F1F" }}>
                <div className="flex items-center gap-2 mb-4">
                  <Truck className="w-4 h-4" style={{ color: "#00E5FF" }} />
                  <h2 className="text-white font-semibold text-sm">Ventas por tipo de envio</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { key: "full", label: "Full", color: "#FFE600", icon: "⚡" },
                    { key: "flex", label: "Flex", color: "#00E5FF", icon: "🚚" },
                    { key: "turbo", label: "Turbo", color: "#A855F7", icon: "⚡" },
                    { key: "correo", label: "Correo", color: "#FF9800", icon: "📦" },
                  ].map(({ key, label, color, icon }) => {
                    const d = data.ventas_por_tipo[key];
                    if (!d) return (
                      <div key={key} className="rounded-xl p-3 text-center" style={{ background: "#2A2A2A" }}>
                        <p className="text-lg font-black" style={{ color: "#374151" }}>0</p>
                        <p className="text-[10px]" style={{ color: "#6B7280" }}>{icon} {label}</p>
                        <p className="text-[10px] font-bold" style={{ color: "#374151" }}>$0</p>
                      </div>
                    );
                    return (
                      <div key={key} className="rounded-xl p-3 text-center" style={{ background: color + "15", border: `1px solid ${color}33` }}>
                        <p className="text-lg font-black" style={{ color }}>{d.ventas}</p>
                        <p className="text-[10px]" style={{ color: "#9CA3AF" }}>{icon} {label}</p>
                        <p className="text-[10px] font-bold" style={{ color }}>{fmt(d.facturacion)}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Por cuenta */}
            <div className="rounded-2xl p-5" style={{ background: "#1F1F1F" }}>
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-4 h-4" style={{ color: "#60A5FA" }} />
                <h2 className="text-white font-semibold text-sm">Detalle por cuenta</h2>
              </div>
              <div className="space-y-3">
                {data.por_cuenta?.map((acc: any) => (
                  <div
                    key={acc.id}
                    className="rounded-xl p-4"
                    style={{ background: "#2A2A2A" }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-white font-semibold text-sm">@{acc.nickname}</p>
                      <span className="text-xs font-bold" style={{ color: "#34D399" }}>
                        {fmt(acc.facturacion)}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center">
                        <p className="text-lg font-black text-white">{acc.ventas}</p>
                        <p className="text-xs" style={{ color: "#6B7280" }}>ventas</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-black text-white">{acc.publicaciones}</p>
                        <p className="text-xs" style={{ color: "#6B7280" }}>pubs activas</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-black text-white">{acc.preguntas}</p>
                        <p className="text-xs" style={{ color: "#6B7280" }}>preguntas</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Nota si tablas vacias */}
            {totales?.ventas === 0 && totales?.preguntas === 0 && (
              <p className="text-center text-xs mt-4" style={{ color: "#4B5563" }}>
                Los datos apareceran luego de la primera sincronizacion con Mercado Libre.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
