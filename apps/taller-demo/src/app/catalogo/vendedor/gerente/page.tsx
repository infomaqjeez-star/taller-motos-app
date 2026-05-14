"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useVendedorAuth } from "@/components/vendedor/VendedorAuthContext";
import {
  Users, DollarSign, ShoppingBag, TrendingUp, Check, Timer,
  Package, LogOut, Store, ChevronDown, ChevronUp, Loader2,
  Award, Star, UserCheck, Truck, CreditCard, RefreshCw,
  Search, Crown, Building2, BarChart3, Bell, Plus,
  ShoppingCart, Ticket,
} from "lucide-react";

function fmtMoney(n: number) {
  return "$" + (n || 0).toLocaleString("es-AR", { maximumFractionDigits: 0 });
}

function Badge({ estado, tipo }: { estado: string; tipo: "pedido" | "pago" | "envio" }) {
  if (tipo === "pago") {
    return estado === "pagado" ? (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border text-emerald-400 bg-emerald-400/10 border-emerald-400/30">💰 Pago ✓</span>
    ) : (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border text-slate-500 bg-slate-500/10 border-slate-500/20">💰 Pendiente</span>
    );
  }
  if (tipo === "envio") {
    return estado === "entregado" ? (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border text-emerald-400 bg-emerald-400/10 border-emerald-400/30">📦 Entregado</span>
    ) : estado === "enviado" ? (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border text-blue-400 bg-blue-400/10 border-blue-400/30">🚚 Despachado</span>
    ) : (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border text-slate-500 bg-slate-500/10 border-slate-500/20">📦 Sin despacho</span>
    );
  }
  // pedido
  const map: Record<string, string> = {
    entregado: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
    enviado: "text-blue-400 bg-blue-400/10 border-blue-400/30",
    confirmado: "text-purple-400 bg-purple-400/10 border-purple-400/30",
    pagado: "text-purple-400 bg-purple-400/10 border-purple-400/30",
    cancelado: "text-red-400 bg-red-400/10 border-red-400/30",
  };
  const label: Record<string, string> = {
    entregado: "✓ Entregado", enviado: "🚚 Enviado", confirmado: "✓ Confirmado",
    pagado: "💳 Pagado", cancelado: "✕ Cancelado",
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${map[estado] || "text-yellow-400 bg-yellow-400/10 border-yellow-400/30"}`}>
      {label[estado] || "⏳ Pendiente"}
    </span>
  );
}

const NIVEL_COLORS: Record<string, string> = {
  nuevo: "#10b981", junior: "#3b82f6", senior: "#8b5cf6",
  senior_pro: "#f97316", master: "#f59e0b", gerente: "#ec4899",
};

export default function GerenteDashboardPage() {
  const router = useRouter();
  const { vendedor, logout, loading: authLoading } = useVendedorAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"dashboard" | "vendedores" | "clientes" | "pedidos">("dashboard");
  const [filtroVendedor, setFiltroVendedor] = useState<string>("todos");
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedVendedor, setExpandedVendedor] = useState<string | null>(null);
  const [busquedaCliente, setBusquedaCliente] = useState<string>("");

  useEffect(() => {
    if (authLoading) return;
    if (!vendedor) { router.push("/catalogo/vendedor/login"); return; }
    if (!(vendedor as any).es_gerente) { router.push("/catalogo/vendedor/dashboard"); return; }
    cargar();
  }, [vendedor, authLoading]);

  const cargar = async () => {
    setLoading(true);
    const token = localStorage.getItem("vendedor_token");
    if (!token) return;
    try {
      const res = await fetch("/api/vendedor/gerente/pedidos", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(await res.json());
    } catch {}
    finally { setLoading(false); }
  };

  if (authLoading || loading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: "#030305" }}>
        <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
      </main>
    );
  }

  if (!vendedor || !(vendedor as any).es_gerente) return null;

  const pedidos: any[] = data?.pedidos || [];
  const equipo: any[] = data?.equipo || [];
  const clientes: any[] = data?.clientes || [];
  const resumen = data?.resumen;

  const pedidosFiltrados = pedidos
    .filter(p => filtroVendedor === "todos" || p.vendedor_id === filtroVendedor)
    .filter(p => filtroEstado === "todos" || p.estado === filtroEstado);

  const getVendedor = (id: string) => equipo.find((v: any) => v.id === id);
  const getNombreVendedor = (id: string) => getVendedor(id)?.nombre || "—";

  // Métricas por vendedor
  const metricasVendedor = (vId: string) => {
    const ps = pedidos.filter(p => p.vendedor_id === vId);
    const activos = ps.filter(p => p.estado !== "cancelado");
    const ventas = activos.reduce((s: number, p: any) => s + (p.total || 0), 0);
    const comisionV = activos.reduce((s: number, p: any) => s + (p.comision_monto || 0), 0);
    const comisionG = activos.reduce((s: number, p: any) => s + (p.comision_gerente_monto || 0), 0);
    const pagados = ps.filter(p => p.estado_pago === "pagado").length;
    const despachados = ps.filter(p => p.estado_envio === "enviado" || p.estado_envio === "entregado").length;
    const pendientes = ps.filter(p => p.comision_estado !== "pagada" && p.comision_monto > 0);
    const urgentes = pendientes.filter(p => {
      if (!p.fecha_limite_pago) return false;
      return Math.ceil((new Date(p.fecha_limite_pago).getTime() - Date.now()) / 86400000) <= 3;
    });
    const clientesV = clientes.filter(c => c.vendedor_referente_id === vId);
    return { total: ps.length, ventas, comisionV, comisionG, pagados, despachados, urgentes: urgentes.length, clientes: clientesV };
  };

  // Alertas globales de comisiones por vencer
  const alertasUrgentes = pedidos.filter(p => {
    if (p.comision_estado === "pagada" || !p.fecha_limite_pago) return false;
    return Math.ceil((new Date(p.fecha_limite_pago).getTime() - Date.now()) / 86400000) <= 3;
  });

  const NAV_TABS = [
    { id: "dashboard" as const, label: "Dashboard" },
    { id: "vendedores" as const, label: "Vendedores" },
    { id: "clientes" as const, label: "Clientes" },
    { id: "pedidos" as const, label: "Pedidos" },
  ];

  // Distribución de niveles
  const nivelDist = () => {
    const total = equipo.length || 1;
    const counts: Record<string, number> = {};
    equipo.forEach((v: any) => {
      const n = v.nivel_vendedor || "nuevo";
      counts[n] = (counts[n] || 0) + 1;
    });
    return [
      { label: "Master", pct: Math.round(((counts.master || 0) / total) * 100), color: "#eab308" },
      { label: "Senior Pro", pct: Math.round(((counts.senior_pro || 0) / total) * 100), color: "#3b82f6" },
      { label: "Senior", pct: Math.round(((counts.senior || 0) / total) * 100), color: "#8b5cf6" },
      { label: "Junior / Nuevos", pct: Math.round((((counts.junior || 0) + (counts.nuevo || 0)) / total) * 100), color: "#10b981" },
    ].filter(d => d.pct > 0);
  };

  const clientesFiltrados = clientes.filter((c: any) => {
    if (!busquedaCliente) return true;
    const q = busquedaCliente.toLowerCase();
    return c.nombre?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.telefono?.includes(q);
  });

  const ticketPromedio = pedidos.length > 0
    ? pedidos.filter(p => p.estado !== "cancelado").reduce((s: number, p: any) => s + (p.total || 0), 0) / pedidos.filter(p => p.estado !== "cancelado").length
    : 0;

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden" style={{ background: "#030305", color: "#fff", fontFamily: "var(--font-montserrat), sans-serif" }}>

      {/* ── HEADER STICKY ── */}
      <header className="sticky top-0 z-50 border-b border-white/[0.08]" style={{ background: "rgba(3,3,5,0.85)", backdropFilter: "blur(24px)" }}>
        <div className="max-w-[1600px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6 lg:gap-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#FF5E3A", boxShadow: "0 0 20px rgba(255,94,58,0.3)" }}>
                <BarChart3 className="h-5 w-5 text-black" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-black tracking-tight leading-none">MaqJeez <span style={{ color: "#FF5E3A" }}>Sales Manager</span></h1>
                <p className="text-[9px] text-gray-500 uppercase font-bold tracking-[0.2em] mt-1">Panel de Gerencia</p>
              </div>
            </div>
            <nav className="hidden lg:flex items-center gap-8">
              {NAV_TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className="text-xs font-black uppercase tracking-widest py-7 transition-colors"
                  style={{ color: tab === t.id ? "#FF5E3A" : "#64748b", borderBottom: tab === t.id ? "2px solid #FF5E3A" : "2px solid transparent", boxShadow: tab === t.id ? "0 10px 10px -10px rgba(255,94,58,0.4)" : "none" }}>
                  {t.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-4 px-4 py-2 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="text-right">
                <p className="text-xs font-black">{vendedor.nombre}</p>
                <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#00FF66" }}>Gerente Online</p>
              </div>
              <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center font-black text-sm" style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)", border: "1px solid rgba(168,85,247,0.4)" }}>
                {vendedor.nombre.charAt(0)}
              </div>
            </div>
            <button onClick={logout} className="p-2 hover:bg-white/5 rounded-xl transition-colors text-gray-400 hover:text-white">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Nav móvil */}
        <div className="lg:hidden flex border-t border-white/[0.06] overflow-x-auto">
          {NAV_TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex-1 py-3 text-xs font-black uppercase tracking-widest whitespace-nowrap transition-colors"
              style={{ color: tab === t.id ? "#FF5E3A" : "#64748b", borderBottom: tab === t.id ? "2px solid #FF5E3A" : "2px solid transparent" }}>
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto w-full p-6 lg:p-10 space-y-10 flex-1">

        {/* ── TAB DASHBOARD ── */}
        {tab === "dashboard" && (<>

          {/* KPIs */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: "Ventas del Equipo", value: fmtMoney(resumen?.total_ventas ?? 0), sub: `${equipo.length} vendedor${equipo.length !== 1 ? "es" : ""}`, border: "#FF5E3A", icon: TrendingUp },
              { label: "Pedidos en Curso", value: pedidos.filter(p => !["cancelado","entregado"].includes(p.estado)).length, sub: `${pedidos.filter(p => p.estado_pago !== "pagado" && p.estado !== "cancelado").length} pendientes pago`, border: "#3A86FF", icon: ShoppingCart },
              { label: "Clientes Activos", value: clientes.length, sub: `del equipo completo`, border: "#00FF66", icon: Users },
              { label: "Ticket Promedio", value: fmtMoney(ticketPromedio), sub: `sobre ${pedidos.filter(p => p.estado !== "cancelado").length} pedidos`, border: "#A855F7", icon: Ticket },
            ].map(({ label, value, sub, border, icon: Icon }) => (
              <div key={label} className="p-6 rounded-3xl relative overflow-hidden group" style={{ background: "linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 30px rgba(0,0,0,0.5)", borderLeft: `4px solid ${border}` }}>
                <div className="flex justify-between items-start mb-4">
                  <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">{label}</p>
                  <div className="p-2 rounded-lg" style={{ background: `${border}15`, color: border }}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <h3 className="text-3xl font-black text-white tracking-tighter">{value}</h3>
                <p className="text-[10px] text-gray-400 mt-2 font-medium">{sub}</p>
              </div>
            ))}
          </section>

          {/* Layout 12 cols */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">

            {/* LEFT: 4 cols */}
            <div className="xl:col-span-4 space-y-8">

              {/* Monitor Vendedores */}
              <div className="rounded-[2.5rem] p-8" style={{ background: "linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 30px rgba(0,0,0,0.5)" }}>
                <div className="flex items-center justify-between mb-8">
                  <h3 className="font-black text-xl flex items-center gap-3">
                    Monitor Vendedores
                    <span className="text-[10px] px-2 py-1 rounded-md text-gray-500 border border-white/[0.08]" style={{ background: "rgba(255,255,255,0.03)" }}>TOP 5</span>
                  </h3>
                  <button onClick={() => setTab("vendedores")} className="text-[10px] font-black uppercase tracking-widest hover:underline" style={{ color: "#FF5E3A" }}>Ver Todos</button>
                </div>
                <div className="space-y-4">
                  {equipo.length === 0 ? (
                    <div className="py-8 text-center">
                      <Users className="h-8 w-8 mx-auto mb-2 text-gray-700" />
                      <p className="text-xs text-gray-600">Sin vendedores asignados</p>
                    </div>
                  ) : [...equipo].sort((a, b) => metricasVendedor(b.id).ventas - metricasVendedor(a.id).ventas).slice(0, 5).map((v: any) => {
                    const m = metricasVendedor(v.id);
                    const vPedidos = pedidos.filter(p => p.vendedor_id === v.id);
                    const ultimaActividad = vPedidos.length > 0
                      ? Math.ceil((Date.now() - new Date(vPedidos[0].created_at).getTime()) / 86400000)
                      : null;
                    const enRiesgo = m.ventas === 0 || (ultimaActividad !== null && ultimaActividad > 30);
                    return (
                      <div key={v.id}
                        className="group p-4 rounded-2xl cursor-pointer transition-all"
                        style={{ background: "rgba(255,255,255,0.02)", border: enRiesgo ? "1px solid rgba(255,94,58,0.2)" : "1px solid rgba(255,255,255,0.05)" }}
                        onClick={() => { setTab("vendedores"); setExpandedVendedor(v.id); }}>
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm shrink-0"
                            style={{ background: enRiesgo ? "#0A0B10" : `linear-gradient(135deg, ${NIVEL_COLORS[v.nivel_vendedor] || "#10b981"}, ${NIVEL_COLORS[v.nivel_vendedor] || "#10b981"}99)`, color: enRiesgo ? "#9ca3af" : "#000", border: enRiesgo ? "1px solid rgba(255,255,255,0.08)" : "none" }}>
                            {v.nombre.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold group-hover:text-[#FF5E3A] transition-colors truncate">{v.nombre}</h4>
                            <p className="text-[10px] font-black uppercase tracking-[0.1em] capitalize" style={{ color: enRiesgo ? "#64748b" : NIVEL_COLORS[v.nivel_vendedor] || "#10b981" }}>
                              {enRiesgo ? "En Riesgo" : (v.nivel_vendedor || "Nuevo")}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-black" style={{ color: enRiesgo ? "#FF5E3A" : "#fff" }}>{enRiesgo ? (ultimaActividad !== null ? `${ultimaActividad} Días` : "Sin ventas") : fmtMoney(m.ventas)}</p>
                            <p className="text-[9px] font-bold uppercase" style={{ color: enRiesgo ? "#FF5E3A" : "#00FF66" }}>{enRiesgo ? "Inactivo" : "Meta 105%"}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Equilibrio de Red */}
              <div className="rounded-[2.5rem] p-8" style={{ background: "linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 30px rgba(0,0,0,0.5)" }}>
                <h3 className="font-black text-xl mb-8">Equilibrio de Red</h3>
                <div className="space-y-6">
                  {nivelDist().map(({ label, pct, color }) => (
                    <div key={label} className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                        <span style={{ color }}>{label}</span>
                        <span className="text-white">{pct}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.03)" }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color, boxShadow: label === "Master" ? `0 0 10px ${color}66` : "none" }} />
                      </div>
                    </div>
                  ))}
                  {equipo.length === 0 && <p className="text-xs text-gray-700 italic text-center py-4">Sin datos</p>}
                </div>
              </div>
            </div>

            {/* RIGHT: 8 cols */}
            <div className="xl:col-span-8 space-y-8">

              {/* Monitor de Pedidos */}
              <div className="rounded-[2.5rem] overflow-hidden" style={{ background: "linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 30px rgba(0,0,0,0.5)" }}>
                <div className="p-8 border-b border-white/5 flex items-center justify-between">
                  <div>
                    <h3 className="font-black text-xl">Monitor de Pedidos</h3>
                    <p className="text-xs text-gray-500 font-medium mt-1">Últimos movimientos del equipo</p>
                  </div>
                  <button onClick={() => setTab("pedidos")} className="px-6 py-2.5 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-[#FF5E3A] hover:text-black transition-colors">
                    Ver Todos
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-white/[0.02] border-b border-white/5">
                      <tr>
                        {["Pedido / Fecha", "Cliente", "Asignado a", "Monto", "Estado"].map((h, i) => (
                          <th key={h} className="px-8 py-5 text-[10px] font-black uppercase text-gray-500 tracking-widest" style={{ textAlign: i >= 3 ? "center" : "left" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {pedidos.slice(0, 8).map((p: any) => {
                        const v = getVendedor(p.vendedor_id);
                        return (
                          <tr key={p.id} className="cursor-pointer transition-colors hover:bg-white/[0.02] group"
                            onClick={() => { setFiltroVendedor(p.vendedor_id || "todos"); setTab("pedidos"); }}>
                            <td className="px-8 py-6">
                              <p className="text-sm font-black text-white">#{p.id.slice(-6).toUpperCase()}</p>
                              <p className="text-[10px] text-gray-500 font-bold mt-0.5">{new Date(p.created_at).toLocaleDateString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                            </td>
                            <td className="px-8 py-6">
                              <p className="text-xs font-bold">{p.datos_cliente?.nombre || "—"}</p>
                              <p className="text-[9px] text-gray-500 uppercase tracking-wider">{p.datos_cliente?.cuit ? `CUIT ${p.datos_cliente.cuit.slice(0,8)}...` : ""}</p>
                            </td>
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black"
                                  style={{ background: `${NIVEL_COLORS[v?.nivel_vendedor] || "#3A86FF"}20`, color: NIVEL_COLORS[v?.nivel_vendedor] || "#3A86FF" }}>
                                  {v?.nombre?.slice(0, 2).toUpperCase() || "—"}
                                </div>
                                <span className="text-xs text-gray-400 font-medium">{v?.nombre?.split(" ")[0] || "—"}</span>
                              </div>
                            </td>
                            <td className="px-8 py-6 text-center">
                              <p className="text-sm font-black" style={{ color: p.estado_pago === "pagado" ? "#00FF66" : "#fff" }}>{fmtMoney(p.total)}</p>
                            </td>
                            <td className="px-8 py-6 text-center">
                              {p.estado_pago === "pagado" ? (
                                <span className="px-3 py-1 bg-[#00FF66]/10 text-[#00FF66] border border-[#00FF66]/20 rounded-full text-[9px] font-black uppercase tracking-widest">Pagado</span>
                              ) : (
                                <span className="px-3 py-1 bg-[#FF5E3A]/10 text-[#FF5E3A] border border-[#FF5E3A]/20 rounded-full text-[9px] font-black uppercase tracking-widest">Pendiente</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {pedidos.length === 0 && (
                        <tr><td colSpan={5} className="px-8 py-12 text-center text-gray-600 text-sm">Sin pedidos aún</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Monitor de Clientes */}
              <div className="rounded-[2.5rem] p-8" style={{ background: "linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 30px rgba(0,0,0,0.5)" }}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
                  <div>
                    <h3 className="font-black text-xl">Monitor de Clientes</h3>
                    <p className="text-xs text-gray-500 font-medium mt-1">Base de datos centralizada de empresas</p>
                  </div>
                  <div className="relative group max-w-sm w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500 group-focus-within:text-[#FF5E3A] transition-colors" />
                    <input type="text" placeholder="Buscar cliente por nombre o CUIT..." value={busquedaCliente} onChange={e => setBusquedaCliente(e.target.value)}
                      className="w-full rounded-2xl py-3 pl-12 pr-4 text-xs outline-none transition-all"
                      style={{ background: "#030305", border: "1px solid rgba(255,255,255,0.08)", color: "#fff" }} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {clientesFiltrados.slice(0, 6).map((c: any, idx: number) => {
                    const v = equipo.find((vv: any) => vv.id === c.vendedor_referente_id);
                    const cPedidos = pedidos.filter(p => p.datos_cliente?.cliente_id === c.id);
                    const cTotal = cPedidos.filter(p => p.estado !== "cancelado").reduce((s: number, p: any) => s + p.total, 0);
                    const esVip = cTotal > 500000;
                    const Icono = idx % 2 === 0 ? Building2 : Truck;
                    const iconoColor = idx % 2 === 0 ? "#3A86FF" : "#A855F7";
                    return (
                      <div key={c.id} className="p-6 rounded-3xl cursor-pointer group transition-all hover:border-opacity-100"
                        style={{ background: "rgba(10,11,16,0.6)", border: `1px solid ${idx % 2 === 0 ? "rgba(58,134,255,0.1)" : "rgba(168,85,247,0.1)"}` }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = idx % 2 === 0 ? "rgba(58,134,255,0.3)" : "rgba(168,85,247,0.3)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = idx % 2 === 0 ? "rgba(58,134,255,0.1)" : "rgba(168,85,247,0.1)"; }}>
                        <div className="flex justify-between items-start mb-6">
                          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: `${iconoColor}10`, color: iconoColor }}>
                            <Icono className="h-5 w-5" />
                          </div>
                          <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full"
                            style={esVip ? { background: "rgba(0,255,102,0.1)", color: "#00FF66" } : { background: "rgba(255,255,255,0.05)", color: "#64748b", border: "1px solid rgba(255,255,255,0.1)" }}>
                            {esVip ? "VIP Buyer" : "Standard"}
                          </span>
                        </div>
                        <h4 className="text-lg font-black group-hover:text-[#3A86FF] transition-colors truncate">{c.nombre}</h4>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">{c.cuit ? `CUIT: ${c.cuit}` : c.email}</p>
                        <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
                          <div>
                            <p className="text-[9px] text-gray-500 font-black uppercase tracking-wider mb-1">Compras Totales</p>
                            <p className="text-sm font-black text-white">{fmtMoney(cTotal)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] text-gray-500 font-black uppercase tracking-wider mb-1">Responsable</p>
                            <p className="text-xs font-bold text-[#FF5E3A] underline underline-offset-4">{v?.nombre?.split(" ")[0] || "—"}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {clientes.length === 0 && (
                    <div className="col-span-2 py-12 text-center text-gray-600">
                      <UserCheck className="h-8 w-8 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">Sin clientes registrados</p>
                    </div>
                  )}
                </div>
                {clientes.length > 6 && (
                  <div className="mt-6 text-center">
                    <button onClick={() => setTab("clientes")} className="text-xs font-black uppercase tracking-widest" style={{ color: "#FF5E3A" }}>Ver todos los {clientes.length} clientes →</button>
                  </div>
                )}
              </div>

            </div>
          </div>
        </>)}

        {/* ── TAB VENDEDORES ── */}
        {tab === "vendedores" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-black">Equipo de Ventas <span className="text-gray-600 font-normal text-sm">({equipo.length} vendedores)</span></h2>
            </div>
            {equipo.length === 0 ? (
              <div className="rounded-2xl p-12 text-center text-gray-600" style={{ border: "1px dashed rgba(255,255,255,0.08)" }}>
                <Users className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No tenés vendedores asignados</p>
              </div>
            ) : [...equipo].sort((a, b) => metricasVendedor(b.id).ventas - metricasVendedor(a.id).ventas).map((v: any, idx: number) => {
              const m = metricasVendedor(v.id);
              const isExp = expandedVendedor === v.id;
              const vPedidos = pedidos.filter(p => p.vendedor_id === v.id);
              return (
                <div key={v.id} className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                  <button className="w-full px-5 py-4 text-left" onClick={() => setExpandedVendedor(isExp ? null : v.id)}>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-base font-black shrink-0 w-6 text-center" style={{ color: idx === 0 ? "#f59e0b" : idx === 1 ? "#94a3b8" : idx === 2 ? "#b45309" : "#374151" }}>
                        {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}`}
                      </span>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0"
                        style={{ background: `${NIVEL_COLORS[v.nivel_vendedor] || "#10b981"}18`, color: NIVEL_COLORS[v.nivel_vendedor] || "#10b981", border: `1px solid ${NIVEL_COLORS[v.nivel_vendedor] || "#10b981"}35` }}>
                        {v.nombre.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-black text-white">{v.nombre}</p>
                          <span className="text-[9px] px-2 py-0.5 rounded-full font-bold capitalize" style={{ background: `${NIVEL_COLORS[v.nivel_vendedor] || "#10b981"}15`, color: NIVEL_COLORS[v.nivel_vendedor] || "#10b981", border: `1px solid ${NIVEL_COLORS[v.nivel_vendedor] || "#10b981"}30` }}>
                            <Star className="inline h-2.5 w-2.5 mr-0.5" />{v.nivel_vendedor || "nuevo"}
                          </span>
                          {m.urgentes > 0 && <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-red-500/10 text-red-400 border border-red-500/20">⚠ {m.urgentes} urgente{m.urgentes > 1 ? "s" : ""}</span>}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{v.email} · <span className="font-mono">{v.codigo_referido}</span> · {v.comision_pct}% com.</p>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <p className="text-sm font-black text-emerald-400">{fmtMoney(m.ventas)}</p>
                          <p className="text-[10px] text-orange-400">Tu parte: {fmtMoney(m.comisionG)}</p>
                        </div>
                        {isExp ? <ChevronUp className="h-4 w-4 text-gray-600" /> : <ChevronDown className="h-4 w-4 text-gray-600" />}
                      </div>
                    </div>
                  </button>
                  <div className="grid grid-cols-4 border-t" style={{ borderColor: "rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.15)" }}>
                    {[
                      { label: "Pedidos", value: m.total, color: "#8b5cf6" },
                      { label: "Pagados", value: m.pagados, color: "#10b981" },
                      { label: "Despachados", value: m.despachados, color: "#3b82f6" },
                      { label: "Clientes", value: m.clientes.length, color: "#f97316" },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="p-3 text-center" style={{ borderRight: "1px solid rgba(255,255,255,0.04)" }}>
                        <p className="text-[9px] text-gray-600 uppercase font-bold mb-0.5">{label}</p>
                        <p className="text-base font-black" style={{ color }}>{value}</p>
                      </div>
                    ))}
                  </div>
                  {isExp && (
                    <div className="border-t space-y-4 p-4" style={{ borderColor: "rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.12)" }}>
                      <div>
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2">Clientes registrados ({m.clientes.length})</p>
                        {m.clientes.length === 0 ? <p className="text-xs text-gray-700 italic">Sin clientes aún</p> : (
                          <div className="flex flex-wrap gap-2">
                            {m.clientes.map((c: any) => {
                              const cP = vPedidos.filter(p => p.datos_cliente?.cliente_id === c.id);
                              const cT = cP.filter(p => p.estado !== "cancelado").reduce((s: number, p: any) => s + p.total, 0);
                              return (
                                <div key={c.id} className="rounded-lg px-3 py-2" style={{ background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.15)" }}>
                                  <p className="text-xs font-bold text-white">{c.nombre}</p>
                                  <p className="text-[10px] text-gray-500">{c.email}</p>
                                  <p className="text-[10px] text-orange-400 font-bold mt-0.5">{fmtMoney(cT)} · {cP.length} pedidos</p>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2">Pedidos recientes</p>
                        <div className="space-y-1.5">
                          {vPedidos.slice(0, 4).map((p: any) => {
                            const dias = p.fecha_limite_pago ? Math.ceil((new Date(p.fecha_limite_pago).getTime() - Date.now()) / 86400000) : null;
                            return (
                              <div key={p.id} className="flex flex-wrap items-center gap-2 rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-white truncate">{p.datos_cliente?.nombre || "Cliente"}</p>
                                  <p className="text-[10px] text-gray-600">{new Date(p.created_at).toLocaleDateString("es-AR")}</p>
                                </div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <Badge estado={p.estado} tipo="pedido" />
                                  <Badge estado={p.estado_pago || ""} tipo="pago" />
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-xs font-black text-white">{fmtMoney(p.total)}</p>
                                  <p className={`text-[10px] ${p.comision_estado === "pagada" ? "text-emerald-400" : dias !== null && dias <= 3 ? "text-red-400 font-bold" : "text-amber-400"}`}>
                                    {p.comision_estado === "pagada" ? "✓" : dias !== null && dias <= 3 ? `⚠${dias}d` : "⏳"} {fmtMoney(p.comision_monto)}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                          {vPedidos.length > 4 && (
                            <button onClick={() => { setFiltroVendedor(v.id); setTab("pedidos"); }}
                              className="w-full text-xs text-center py-2 transition-colors hover:text-white" style={{ color: "#FF5E3A" }}>
                              Ver los {vPedidos.length - 4} pedidos restantes →
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── TAB CLIENTES ── */}
        {tab === "clientes" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black">Clientes del Equipo <span className="text-gray-600 font-normal text-sm">({clientes.length})</span></h2>
              <div className="relative group max-w-sm w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500 group-focus-within:text-[#FF5E3A] transition-colors" />
                <input type="text" placeholder="Buscar cliente por nombre o CUIT..." value={busquedaCliente} onChange={e => setBusquedaCliente(e.target.value)}
                  className="w-full rounded-2xl py-3 pl-12 pr-4 text-xs outline-none transition-all"
                  style={{ background: "#030305", border: "1px solid rgba(255,255,255,0.08)", color: "#fff" }} />
              </div>
            </div>
            {clientesFiltrados.length === 0 ? (
              <div className="py-12 text-center text-gray-600">
                <UserCheck className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Sin clientes{busquedaCliente ? " con ese filtro" : " registrados"}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {clientesFiltrados.map((c: any, idx: number) => {
                  const v = equipo.find((vv: any) => vv.id === c.vendedor_referente_id);
                  const cPedidos = pedidos.filter(p => p.datos_cliente?.cliente_id === c.id);
                  const cTotal = cPedidos.filter(p => p.estado !== "cancelado").reduce((s: number, p: any) => s + p.total, 0);
                  const esVip = cTotal > 500000;
                  const Icono = idx % 2 === 0 ? Building2 : Truck;
                  const iconoColor = idx % 2 === 0 ? "#3A86FF" : "#A855F7";
                  return (
                    <div key={c.id} className="p-6 rounded-3xl cursor-pointer group transition-all"
                      style={{ background: "rgba(10,11,16,0.6)", border: `1px solid ${idx % 2 === 0 ? "rgba(58,134,255,0.1)" : "rgba(168,85,247,0.1)"}` }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = idx % 2 === 0 ? "rgba(58,134,255,0.3)" : "rgba(168,85,247,0.3)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = idx % 2 === 0 ? "rgba(58,134,255,0.1)" : "rgba(168,85,247,0.1)"; }}>
                      <div className="flex justify-between items-start mb-6">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `${iconoColor}10`, color: iconoColor }}>
                          <Icono className="h-5 w-5" />
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full"
                          style={esVip ? { background: "rgba(0,255,102,0.1)", color: "#00FF66" } : { background: "rgba(255,255,255,0.05)", color: "#64748b", border: "1px solid rgba(255,255,255,0.1)" }}>
                          {esVip ? "VIP Buyer" : "Standard"}
                        </span>
                      </div>
                      <h4 className="text-lg font-black group-hover:text-[#3A86FF] transition-colors truncate">{c.nombre}</h4>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">{c.cuit ? `CUIT: ${c.cuit}` : c.email}</p>
                      <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
                        <div>
                          <p className="text-[9px] text-gray-500 font-black uppercase tracking-wider mb-1">Compras Totales</p>
                          <p className="text-sm font-black text-white">{fmtMoney(cTotal)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] text-gray-500 font-black uppercase tracking-wider mb-1">Responsable</p>
                          <p className="text-xs font-bold text-[#FF5E3A] underline underline-offset-4">{v?.nombre?.split(" ")[0] || "—"}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB PEDIDOS ── */}
        {tab === "pedidos" && (
          <div className="space-y-4">
            <div className="rounded-2xl p-4 flex flex-wrap gap-3 items-center" style={{ background: "rgba(10,11,16,0.8)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => setFiltroVendedor("todos")}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all"
                  style={{ background: filtroVendedor === "todos" ? "rgba(255,94,58,0.12)" : "rgba(255,255,255,0.03)", border: `1px solid ${filtroVendedor === "todos" ? "rgba(255,94,58,0.35)" : "rgba(255,255,255,0.07)"}`, color: filtroVendedor === "todos" ? "#FF5E3A" : "#64748b" }}>
                  Todos
                </button>
                {equipo.map(v => (
                  <button key={v.id} onClick={() => setFiltroVendedor(filtroVendedor === v.id ? "todos" : v.id)}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all"
                    style={{ background: filtroVendedor === v.id ? "rgba(255,94,58,0.12)" : "rgba(255,255,255,0.03)", border: `1px solid ${filtroVendedor === v.id ? "rgba(255,94,58,0.35)" : "rgba(255,255,255,0.07)"}`, color: filtroVendedor === v.id ? "#FF5E3A" : "#64748b" }}>
                    {v.nombre.split(" ")[0]}
                  </button>
                ))}
              </div>
              <div className="h-6 w-px" style={{ background: "rgba(255,255,255,0.06)" }} />
              <div className="flex flex-wrap gap-1.5">
                {["pendiente", "confirmado", "pagado", "enviado", "entregado", "cancelado"].map(e => (
                  <button key={e} onClick={() => setFiltroEstado(filtroEstado === e ? "todos" : e)}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-bold capitalize transition-all"
                    style={{ background: filtroEstado === e ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.02)", border: `1px solid ${filtroEstado === e ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.06)"}`, color: filtroEstado === e ? "#a5b4fc" : "#64748b" }}>
                    {e}
                  </button>
                ))}
              </div>
              <span className="ml-auto text-[11px] text-gray-600">{pedidosFiltrados.length} pedidos</span>
            </div>

            {pedidosFiltrados.length === 0 ? (
              <div className="text-center py-16 text-gray-600">
                <Package className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Sin pedidos con ese filtro</p>
              </div>
            ) : (
              <div className="rounded-[2.5rem] overflow-hidden" style={{ background: "linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 30px rgba(0,0,0,0.5)" }}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-white/[0.02] border-b border-white/5">
                      <tr>
                        {["Pedido / Fecha", "Cliente", "Asignado a", "Comisión", "Monto", "Estado"].map((h, i) => (
                          <th key={h} className="px-8 py-5 text-[10px] font-black uppercase text-gray-500 tracking-widest" style={{ textAlign: i >= 4 ? "center" : "left" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {pedidosFiltrados.map((p: any) => {
                        const diasRestantes = p.fecha_limite_pago ? Math.ceil((new Date(p.fecha_limite_pago).getTime() - Date.now()) / 86400000) : null;
                        const comisionUrgente = p.comision_estado !== "pagada" && diasRestantes !== null && diasRestantes <= 3;
                        const v = getVendedor(p.vendedor_id);
                        const isExpanded = expandedId === p.id;
                        return (
                          <>
                            <tr key={p.id} className="cursor-pointer transition-colors hover:bg-white/[0.02] group"
                              style={{ background: comisionUrgente ? "rgba(239,68,68,0.03)" : undefined }}
                              onClick={() => setExpandedId(isExpanded ? null : p.id)}>
                              <td className="px-8 py-6">
                                <p className="text-sm font-black text-white">#{p.id.slice(-6).toUpperCase()}</p>
                                <p className="text-[10px] text-gray-500 font-bold mt-0.5">{new Date(p.created_at).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}</p>
                              </td>
                              <td className="px-8 py-6">
                                <p className="text-xs font-bold">{p.datos_cliente?.nombre || "—"}</p>
                                <p className="text-[9px] text-gray-500 uppercase tracking-wider">{p.datos_cliente?.cuit ? `CUIT ${p.datos_cliente.cuit.slice(0,8)}...` : ""}</p>
                              </td>
                              <td className="px-8 py-6">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black"
                                    style={{ background: `${NIVEL_COLORS[v?.nivel_vendedor] || "#3A86FF"}20`, color: NIVEL_COLORS[v?.nivel_vendedor] || "#3A86FF" }}>
                                    {v?.nombre?.slice(0, 2).toUpperCase() || "—"}
                                  </div>
                                  <span className="text-xs text-gray-400 font-medium">{v?.nombre?.split(" ")[0] || "—"}</span>
                                </div>
                              </td>
                              <td className="px-8 py-6">
                                <p className={`text-xs font-bold ${p.comision_estado === "pagada" ? "text-emerald-400" : comisionUrgente ? "text-red-400" : "text-amber-400"}`}>
                                  {p.comision_estado === "pagada" ? "✓" : comisionUrgente ? `⚠ ${diasRestantes}d` : "⏳"} {fmtMoney(p.comision_monto)}
                                </p>
                                {p.comision_gerente_monto > 0 && <p className="text-[10px] text-orange-400">Tu parte: {fmtMoney(p.comision_gerente_monto)}</p>}
                              </td>
                              <td className="px-8 py-6 text-center">
                                <p className="text-sm font-black" style={{ color: p.estado_pago === "pagado" ? "#00FF66" : "#fff" }}>{fmtMoney(p.total)}</p>
                              </td>
                              <td className="px-8 py-6 text-center">
                                {p.estado_pago === "pagado" ? (
                                  <span className="px-3 py-1 bg-[#00FF66]/10 text-[#00FF66] border border-[#00FF66]/20 rounded-full text-[9px] font-black uppercase tracking-widest">Pagado</span>
                                ) : (
                                  <span className="px-3 py-1 bg-[#FF5E3A]/10 text-[#FF5E3A] border border-[#FF5E3A]/20 rounded-full text-[9px] font-black uppercase tracking-widest">Pendiente</span>
                                )}
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr key={`${p.id}-detail`} style={{ background: "rgba(0,0,0,0.2)" }}>
                                <td colSpan={6} className="px-8 py-3">
                                  <div className="flex flex-wrap gap-3">
                                    {[
                                      { label: "Estado envío", value: p.estado_envio || "—", color: "text-blue-400" },
                                      p.fecha_pago ? { label: "Fecha pago", value: new Date(p.fecha_pago).toLocaleDateString("es-AR"), color: "text-emerald-400" } : null,
                                      p.fecha_despacho ? { label: "Fecha despacho", value: new Date(p.fecha_despacho).toLocaleDateString("es-AR"), color: "text-blue-400" } : null,
                                      p.fecha_entrega ? { label: "Entrega", value: new Date(p.fecha_entrega).toLocaleDateString("es-AR"), color: "text-emerald-400" } : null,
                                      p.fecha_pago_comision ? { label: "Pago comisión", value: new Date(p.fecha_pago_comision).toLocaleDateString("es-AR"), color: "text-orange-400" } : null,
                                    ].filter(Boolean).map((item: any) => (
                                      <div key={item.label} className="rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                                        <p className="text-[9px] text-gray-600 uppercase font-bold mb-0.5">{item.label}</p>
                                        <p className={`text-xs font-bold ${item.color}`}>{item.value}</p>
                                      </div>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

      </main>

      {/* FAB */}
      <div className="fixed bottom-10 right-10 z-[60] group">
        <button onClick={() => router.push("/catalogo/vendedor/dashboard")}
          className="w-16 h-16 rounded-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          style={{ background: "#FF5E3A", boxShadow: "0 10px 40px rgba(255,94,58,0.4)", color: "#000" }}>
          <Plus className="h-6 w-6 group-hover:rotate-90 transition-transform" />
        </button>
        <span className="absolute right-20 bottom-4 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-2xl pointer-events-none" style={{ background: "#fff", color: "#000" }}>
          Mi Dashboard
        </span>
      </div>
    </div>
  );
}
