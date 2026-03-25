"use client";

import { useState, useEffect, useMemo } from "react";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import { flexDb } from "@/lib/db";
import { FlexEnvio, FlexZona } from "@/lib/types";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";
import { BarChart2, TrendingUp, DollarSign, Package, Calendar, Truck } from "lucide-react";

const fmt = (n: number) => "$" + n.toLocaleString("es-AR");

const ZONA_COLORS_HEX: Record<FlexZona, string> = {
  cercana: "#22c55e",
  media:   "#eab308",
  lejana:  "#ef4444",
};

type Periodo = "hoy" | "semana" | "mes" | "todo";

function isInPeriod(fecha: string, periodo: Periodo): boolean {
  const d = new Date(fecha);
  const now = new Date();
  if (periodo === "hoy") {
    return d.toDateString() === now.toDateString();
  }
  if (periodo === "semana") {
    const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
    return d >= weekAgo;
  }
  if (periodo === "mes") {
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }
  return true;
}

export default function ReportesPage() {
  const [envios, setEnvios] = useState<FlexEnvio[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState<Periodo>("mes");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try { setEnvios(await flexDb.getAll()); } catch (_) { setEnvios([]); }
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() =>
    envios.filter(e => isInPeriod(e.fecha, periodo)),
    [envios, periodo]
  );

  // KPIs
  const kpis = useMemo(() => ({
    count:        filtered.length,
    totalML:      filtered.reduce((s, e) => s + e.precioML, 0),
    totalFlete:   filtered.reduce((s, e) => s + e.pagoFlete, 0),
    totalGanancia:filtered.reduce((s, e) => s + e.ganancia, 0),
  }), [filtered]);

  // Pie: distribución por zona
  const pieData = useMemo(() => {
    const zones = (["cercana", "media", "lejana"] as FlexZona[]).map(z => ({
      name: z === "cercana" ? "Cercana" : z === "media" ? "Media" : "Lejana",
      zona: z,
      value: filtered.filter(e => e.zona === z).length,
      ganancia: filtered.filter(e => e.zona === z).reduce((s, e) => s + e.ganancia, 0),
    })).filter(z => z.value > 0);
    return zones;
  }, [filtered]);

  // Bar: Top 10 localidades
  const barData = useMemo(() => {
    const byLoc: Record<string, { count: number; ganancia: number; zona: FlexZona }> = {};
    filtered.forEach(e => {
      if (!byLoc[e.localidad]) byLoc[e.localidad] = { count: 0, ganancia: 0, zona: e.zona };
      byLoc[e.localidad].count++;
      byLoc[e.localidad].ganancia += e.ganancia;
    });
    return Object.entries(byLoc)
      .sort((a, b) => b[1].ganancia - a[1].ganancia)
      .slice(0, 10)
      .map(([loc, data]) => ({
        localidad: loc.replace("de ", "de\n").slice(0, 14),
        fullName: loc,
        envios: data.count,
        ganancia: data.ganancia,
        ml: data.ganancia / 0.2 * 1, // precioML = ganancia / 0.2
        color: ZONA_COLORS_HEX[data.zona],
      }));
  }, [filtered]);

  // Tendencia diaria (últimos 14 días)
  const tendencia = useMemo(() => {
    const days: Record<string, { ganancia: number; count: number }> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days[key] = { ganancia: 0, count: 0 };
    }
    envios.forEach(e => {
      if (days[e.fecha]) {
        days[e.fecha].ganancia += e.ganancia;
        days[e.fecha].count++;
      }
    });
    return Object.entries(days).map(([fecha, data]) => ({
      fecha: fecha.slice(5), // MM-DD
      ...data,
    }));
  }, [envios]);

  const PERIODOS: { key: Periodo; label: string }[] = [
    { key: "hoy",    label: "Hoy" },
    { key: "semana", label: "7 días" },
    { key: "mes",    label: "Este mes" },
    { key: "todo",   label: "Todo" },
  ];

  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-6 pb-24 sm:pb-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 rounded-xl p-2.5">
              <BarChart2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Reportes Flex</h1>
              <p className="text-gray-400 text-sm">Estadísticas de logística Mercado Libre</p>
            </div>
          </div>
        </div>

        {/* Filtro período */}
        <div className="flex gap-2 flex-wrap">
          {PERIODOS.map(p => (
            <button key={p.key} onClick={() => setPeriodo(p.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${
                periodo === p.key
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500"
              }`}>
              <Calendar className="w-3.5 h-3.5" />
              {p.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-gray-800/60 rounded-2xl border border-gray-700 p-4 text-center">
                <Package className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                <p className="text-xs text-gray-400">Envíos</p>
                <p className="text-white font-black text-2xl">{kpis.count}</p>
              </div>
              <div className="bg-gray-800/60 rounded-2xl border border-gray-700 p-4 text-center">
                <DollarSign className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
                <p className="text-xs text-gray-400">Total ML</p>
                <p className="text-white font-black text-lg">{fmt(kpis.totalML)}</p>
              </div>
              <div className="bg-gray-800/60 rounded-2xl border border-gray-700 p-4 text-center">
                <Truck className="w-5 h-5 text-blue-300 mx-auto mb-1" />
                <p className="text-xs text-gray-400">Pago Flete</p>
                <p className="text-blue-300 font-black text-lg">{fmt(kpis.totalFlete)}</p>
              </div>
              <div className="bg-green-900/40 rounded-2xl border border-green-700/50 p-4 text-center">
                <TrendingUp className="w-5 h-5 text-green-400 mx-auto mb-1" />
                <p className="text-xs text-gray-400">Ganancia neta</p>
                <p className="text-green-300 font-black text-lg">{fmt(kpis.totalGanancia)}</p>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Sin envíos en este período</p>
              </div>
            ) : (
              <>
                {/* Gráfico de Torta + tabla zona */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-gray-800/60 rounded-2xl border border-gray-700 p-5">
                    <h2 className="text-white font-bold mb-4">Distribución por Zona</h2>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%" cy="50%"
                          innerRadius={55} outerRadius={85}
                          paddingAngle={3}
                          dataKey="value"
                          label={({ name, value }) => `${name} (${value})`}
                          labelLine={false}
                        >
                          {pieData.map((entry) => (
                            <Cell key={entry.zona} fill={ZONA_COLORS_HEX[entry.zona]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number, name: string) => [value + " envíos", name]}
                          contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: "12px", color: "#fff" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Leyenda */}
                    <div className="space-y-2 mt-2">
                      {pieData.map(z => (
                        <div key={z.zona} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ background: ZONA_COLORS_HEX[z.zona] }} />
                            <span className="text-gray-300">{z.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-white font-bold">{z.value} envíos</span>
                            <span className="text-green-300 text-xs ml-2">{fmt(z.ganancia)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tendencia diaria */}
                  <div className="bg-gray-800/60 rounded-2xl border border-gray-700 p-5">
                    <h2 className="text-white font-bold mb-4">Ganancia — Últimos 14 días</h2>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={tendencia} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="fecha" tick={{ fontSize: 9, fill: "#9ca3af" }} />
                        <YAxis tick={{ fontSize: 9, fill: "#9ca3af" }} tickFormatter={v => "$" + (v/1000).toFixed(0) + "k"} />
                        <Tooltip
                          formatter={(v: number) => [fmt(v), "Ganancia"]}
                          contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: "12px", color: "#fff" }}
                        />
                        <Bar dataKey="ganancia" fill="#22c55e" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Ranking de localidades */}
                <div className="bg-gray-800/60 rounded-2xl border border-gray-700 p-5">
                  <h2 className="text-white font-bold mb-4">Ranking de Localidades (Top 10)</h2>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 60, left: 80, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: "#9ca3af" }} tickFormatter={v => "$" + (v/1000).toFixed(0) + "k"} />
                      <YAxis type="category" dataKey="localidad" tick={{ fontSize: 10, fill: "#d1d5db" }} width={78} />
                      <Tooltip
                        formatter={(v: number, name: string) => [fmt(v), name === "ganancia" ? "Ganancia" : "ML"]}
                        labelFormatter={(label: string) => {
                          const item = barData.find(b => b.localidad === label);
                          return item?.fullName ?? label;
                        }}
                        contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: "12px", color: "#fff" }}
                      />
                      <Legend />
                      <Bar dataKey="ganancia" name="Ganancia" radius={[0, 4, 4, 0]}>
                        {barData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>

                  {/* Tabla resumen */}
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="text-left text-gray-400 font-semibold py-2 pr-4">#</th>
                          <th className="text-left text-gray-400 font-semibold py-2 pr-4">Localidad</th>
                          <th className="text-right text-gray-400 font-semibold py-2 pr-4">Envíos</th>
                          <th className="text-right text-gray-400 font-semibold py-2 pr-4">Total ML</th>
                          <th className="text-right text-gray-400 font-semibold py-2">Ganancia</th>
                        </tr>
                      </thead>
                      <tbody>
                        {barData.map((b, i) => (
                          <tr key={b.fullName} className="border-b border-gray-700/40 last:border-0">
                            <td className="text-gray-500 py-2 pr-4 font-bold">#{i + 1}</td>
                            <td className="text-white py-2 pr-4 font-semibold">{b.fullName}</td>
                            <td className="text-gray-300 py-2 pr-4 text-right">{b.envios}</td>
                            <td className="text-white py-2 pr-4 text-right font-bold">{fmt(b.ganancia / 0.2)}</td>
                            <td className="text-green-300 py-2 text-right font-black">{fmt(b.ganancia)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </main>
      <BottomNav />
    </>
  );
}
