"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useVendedorAuth } from "@/components/vendedor/VendedorAuthContext";
import {
  ShieldStar, CurrencyDollar, Package, Users, TrendUp,
  Ranking, ShoppingCart, Buildings, Funnel,
  MagnifyingGlass, Info, Bell, Plus, Truck, HardHat,
  SignOut, CaretDown, CaretUp, Star, Spinner
} from "@phosphor-icons/react";

function fmtMoney(n: number) {
  return "$" + (n || 0).toLocaleString("es-AR", { maximumFractionDigits: 0 });
}

const NIVEL_COLORS: Record<string, string> = {
  nuevo: "#10b981", junior: "#3b82f6", senior: "#8b5cf6",
  senior_pro: "#f97316", master: "#f59e0b", gerente: "#ec4899",
};

function Badge({ estado, tipo }: { estado: string; tipo: "pedido" | "pago" | "envio" }) {
  if (tipo === "pago") {
    return estado === "pagado" ? (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border text-emerald-400 bg-emerald-400/10 border-emerald-400/30">Pago ✓</span>
    ) : (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border text-slate-500 bg-slate-500/10 border-slate-500/20">Pendiente</span>
    );
  }
  if (tipo === "envio") {
    return estado === "entregado" ? (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border text-emerald-400 bg-emerald-400/10 border-emerald-400/30">Entregado</span>
    ) : estado === "enviado" ? (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border text-blue-400 bg-blue-400/10 border-blue-400/30">Despachado</span>
    ) : (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border text-slate-500 bg-slate-500/10 border-slate-500/20">Sin despacho</span>
    );
  }
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
      <main className="min-h-screen flex items-center justify-center" style={{ background: "#08090D" }}>
        <span className="h-8 w-8 animate-spin text-orange-400"><Spinner size={32} /></span>
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

  const metricasMap = useMemo(() => {
    const map: Record<string, { total: number; ventas: number; comisionG: number; pagados: number; despachados: number; clientes: any[] }> = {};
    for (const v of equipo) {
      const ps = pedidos.filter(p => p.vendedor_id === v.id);
      const activos = ps.filter(p => p.estado !== "cancelado");
      const ventas = activos.reduce((s: number, p: any) => s + (p.total || 0), 0);
      const comisionG = activos.reduce((s: number, p: any) => s + (p.comision_gerente_monto || 0), 0);
      const pagados = ps.filter(p => p.estado_pago === "pagado").length;
      const despachados = ps.filter(p => p.estado_envio === "enviado" || p.estado_envio === "entregado").length;
      const clientesV = clientes.filter(c => c.vendedor_referente_id === v.id);
      map[v.id] = { total: ps.length, ventas, comisionG, pagados, despachados, clientes: clientesV };
    }
    return map;
  }, [equipo, pedidos, clientes]);

  const metricasVendedor = (vId: string) => metricasMap[vId] || { total: 0, ventas: 0, comisionG: 0, pagados: 0, despachados: 0, clientes: [] };

  const ticketPromedio = useMemo(() => {
    const activos = pedidos.filter(p => p.estado !== "cancelado");
    return activos.length > 0 ? activos.reduce((s: number, p: any) => s + (p.total || 0), 0) / activos.length : 0;
  }, [pedidos]);

  const tasaConversion = useMemo(() => {
    if (pedidos.length === 0) return 0;
    return Math.round((pedidos.filter(p => p.estado === "confirmado" || p.estado === "pagado" || p.estado === "enviado" || p.estado === "entregado").length / pedidos.length) * 100);
  }, [pedidos]);

  const NAV_TABS = [
    { id: "dashboard" as const, label: "Dashboard" },
    { id: "vendedores" as const, label: "Vendedores" },
    { id: "clientes" as const, label: "Clientes" },
    { id: "pedidos" as const, label: "Pedidos" },
  ];

  const equipoOrdenado = useMemo(() =>
    [...equipo].sort((a, b) => metricasVendedor(b.id).ventas - metricasVendedor(a.id).ventas),
  [equipo, pedidos, clientes]);

  const topVendedores = equipoOrdenado.slice(0, 5);

  const clientesFiltrados = clientes.filter((c: any) => {
    if (!busquedaCliente) return true;
    const q = busquedaCliente.toLowerCase();
    return c.nombre?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.telefono?.includes(q);
  });

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

  const barHeights = topVendedores.length > 0
    ? topVendedores.map(v => {
        const ventas = metricasVendedor(v.id).ventas;
        const max = metricasVendedor(topVendedores[0].id).ventas || 1;
        return Math.max(5, Math.round((ventas / max) * 100));
      })
    : [100, 70, 40, 20, 5];

  return (
    <div className="min-h-screen" style={{ background: "#08090D", color: "#F8FAFC", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        .premium-border {
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        .section-card {
          background: #111319;
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 1rem;
          transition: border-color 0.3s ease;
        }
        .section-card:hover {
          border-color: rgba(255, 94, 58, 0.3);
        }
        .help-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.15rem 0.5rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 999px;
          font-size: 0.6rem;
          font-weight: 700;
          color: #94A3B8;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }
        .status-indicator {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
      `}</style>

      {/* ── HEADER ── */}
      <header className="h-16 border-b border-white/[0.06] sticky top-0 z-[100]" style={{ background: "rgba(8,9,13,0.9)", backdropFilter: "blur(24px)" }}>
        <div className="max-w-[1700px] mx-auto h-full px-6 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shadow-lg" style={{ background: "#FF5E3A", boxShadow: "0 0 20px rgba(255,94,58,0.2)" }}>
                <ShieldStar weight="fill" color="#000" size={20} />
              </div>
              <div className="leading-none">
                <span className="text-sm font-black tracking-tight">MAQJEEZ</span>
                <span className="text-sm font-black" style={{ color: "#FF5E3A" }}>CORE</span>
              </div>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              {NAV_TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`text-xs font-bold px-3 py-1 rounded-md transition-colors ${tab === t.id ? "bg-white/5 text-white" : "text-gray-400 hover:text-white"}`}>
                  {t.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold">{vendedor.nombre}</p>
              <div className="flex items-center justify-end gap-1.5">
                <div className="status-indicator animate-pulse" style={{ background: "#10B981" }}></div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Modo Administrador</p>
              </div>
            </div>
            <button onClick={logout} className="p-2 hover:bg-white/5 rounded-xl transition-colors text-gray-400 hover:text-white">
              <SignOut size={20} />
            </button>
            <div className="w-10 h-10 rounded-full border border-white/[0.06] p-1 flex items-center justify-center font-black text-xs" style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}>
              {vendedor.nombre?.charAt(0)?.toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1700px] mx-auto p-6 space-y-8">

        {/* ── TAB DASHBOARD ── */}
        {tab === "dashboard" && (<>

          {/* KPIs */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">Indicadores Críticos</h2>
                <span className="help-pill"><Info size={10} /> Global de hoy</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Ventas */}
              <div className="section-card p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full" style={{ background: "#FF5E3A" }}></div>
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 rounded-lg" style={{ background: "rgba(255,94,58,0.1)", color: "#FF5E3A" }}>
                    <CurrencyDollar weight="bold" size={20} />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ color: "#10B981", background: "rgba(16,185,129,0.1)" }}>+14.2%</span>
                </div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Ventas Consolidadas</p>
                <p className="text-2xl font-black">{fmtMoney(resumen?.total_ventas ?? 0)}</p>
                <p className="text-[9px] text-gray-500 mt-2">Facturación bruta en toda la red</p>
              </div>

              {/* Pedidos */}
              <div className="section-card p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full" style={{ background: "#3B82F6" }}></div>
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 rounded-lg" style={{ background: "rgba(59,130,246,0.1)", color: "#3B82F6" }}>
                    <Package weight="bold" size={20} />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/10 text-white">{pedidos.filter(p => !["cancelado","entregado"].includes(p.estado)).length} activos</span>
                </div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Órdenes de Compra</p>
                <p className="text-2xl font-black">{pedidos.length}</p>
                <p className="text-[9px] text-gray-500 mt-2">Pedidos procesados este mes</p>
              </div>

              {/* Empresas */}
              <div className="section-card p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full" style={{ background: "#A855F7" }}></div>
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 rounded-lg" style={{ background: "rgba(168,85,247,0.1)", color: "#A855F7" }}>
                    <Users weight="bold" size={20} />
                  </div>
                </div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Nuevas Empresas</p>
                <p className="text-2xl font-black">{clientes.length}</p>
                <p className="text-[9px] text-gray-500 mt-2">Cuentas corporativas dadas de alta</p>
              </div>

              {/* Conversión */}
              <div className="section-card p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full" style={{ background: "#10B981" }}></div>
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 rounded-lg" style={{ background: "rgba(16,185,129,0.1)", color: "#10B981" }}>
                    <TrendUp weight="bold" size={20} />
                  </div>
                </div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Tasa de Conversión</p>
                <p className="text-2xl font-black">{tasaConversion}%</p>
                <p className="text-[9px] text-gray-500 mt-2">Pedidos cerrados vs totales</p>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* LEFT: Ranking */}
            <div className="lg:col-span-4 space-y-6">
              <div className="section-card flex flex-col h-full">
                <div className="p-5 border-b border-white/5 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black flex items-center gap-2">
                      <Ranking weight="bold" color="#FF5E3A" size={18} />
                      Ranking de Ventas
                    </h3>
                    <span className="help-pill mt-1">Rendimiento Individual</span>
                  </div>
                  <button onClick={() => setTab("vendedores")} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all">
                    <Funnel size={14} />
                  </button>
                </div>

                <div className="p-4 space-y-2 overflow-y-auto max-h-[500px]">
                  {topVendedores.length === 0 ? (
                    <div className="py-8 text-center text-gray-600">
                      <span className="mx-auto mb-2 opacity-20 block"><Users size={32} /></span>
                      <p className="text-xs">Sin vendedores asignados</p>
                    </div>
                  ) : topVendedores.map((v: any, idx: number) => {
                    const m = metricasVendedor(v.id);
                    const vPedidos = pedidos.filter(p => p.vendedor_id === v.id);
                    const ultimaActividad = vPedidos.length > 0
                      ? Math.ceil((Date.now() - new Date(vPedidos[0].created_at).getTime()) / 86400000)
                      : null;
                    const enRiesgo = m.ventas === 0 || (ultimaActividad !== null && ultimaActividad > 30);
                    const isTop = idx === 0;
                    return (
                      <div key={v.id} onClick={() => { setTab("vendedores"); setExpandedVendedor(v.id); }}
                        className={`p-3 rounded-xl flex items-center gap-4 group cursor-pointer transition-all ${isTop ? "border" : "border border-white/5 hover:border-white/20"}`}
                        style={isTop ? { background: "rgba(255,94,58,0.05)", borderColor: "rgba(255,94,58,0.2)" } : enRiesgo ? { background: "rgba(239,68,68,0.03)", borderColor: "rgba(239,68,68,0.1)" } : {}}>
                        <div className={`w-8 h-8 rounded-lg font-black flex items-center justify-center text-xs ${isTop ? "text-black" : enRiesgo ? "text-red-400" : "text-gray-400"}`}
                          style={{ background: isTop ? "#FF5E3A" : enRiesgo ? "rgba(239,68,68,0.2)" : "#1f2937" }}>
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate">{v.nombre}</p>
                          <p className={`text-[9px] font-black uppercase tracking-tighter ${isTop ? "text-emerald-400" : enRiesgo ? "text-red-400" : "text-gray-500"}`}>
                            {enRiesgo ? "Inactivo +30d" : isTop ? "Socio Master" : (v.nivel_vendedor || "Nuevo")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-xs font-black ${enRiesgo ? "text-red-400" : "text-white"}`}>{enRiesgo ? (ultimaActividad !== null ? `${ultimaActividad} Días` : "Sin ventas") : fmtMoney(m.ventas)}</p>
                          <p className="text-[8px] text-gray-500">{enRiesgo ? "Requiere atención" : `Meta: ${Math.min(110, Math.round((m.ventas / 1000000) * 10))}%`}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Gráfico distribución */}
                <div className="p-5 mt-auto border-t border-white/5" style={{ background: "rgba(255,255,255,0.01)" }}>
                  <div className="flex justify-between items-end gap-1 h-12">
                    {barHeights.map((h, i) => (
                      <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${h}%`, background: i === 0 ? "#FF5E3A" : `rgba(255,94,58,${0.6 - i * 0.1})` }}></div>
                    ))}
                  </div>
                  <p className="text-[8px] text-gray-500 text-center mt-2 font-bold uppercase">Distribución de Carga de Ventas</p>
                </div>
              </div>
            </div>

            {/* RIGHT: Monitor + Clientes */}
            <div className="lg:col-span-8 space-y-6">

              {/* Monitor de Órdenes */}
              <div className="section-card">
                <div className="p-5 border-b border-white/5 flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h3 className="text-sm font-black flex items-center gap-2">
                      <ShoppingCart weight="bold" color="#FF5E3A" size={18} />
                      Monitor de Órdenes Recientes
                    </h3>
                    <span className="help-pill mt-1">Flujo de Caja en Tiempo Real</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"><MagnifyingGlass size={14} /></span>
                    <input type="text" placeholder="Filtrar pedido..." onChange={e => { setBusquedaCliente(e.target.value); setTab("pedidos"); }}
                      className="bg-[#111319] border border-white/5 rounded-lg py-1.5 pl-8 pr-4 text-[10px] focus:outline-none focus:border-[#FF5E3A] w-48 text-white" />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-white/[0.02]" style={{ fontSize: "9px", fontWeight: 900, textTransform: "uppercase", color: "#94A3B8", letterSpacing: "0.1em" }}>
                      <tr>
                        <th className="px-6 py-4">ID / Fecha</th>
                        <th className="px-6 py-4">Entidad / CUIT</th>
                        <th className="px-6 py-4 text-center">Responsable</th>
                        <th className="px-6 py-4 text-right">Monto Neto</th>
                        <th className="px-6 py-4 text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {pedidos.slice(0, 8).map((p: any) => {
                        const v = getVendedor(p.vendedor_id);
                        return (
                          <tr key={p.id} className="hover:bg-white/[0.01] transition-colors group cursor-pointer"
                            onClick={() => { setFiltroVendedor(p.vendedor_id || "todos"); setTab("pedidos"); }}>
                            <td className="px-6 py-4">
                              <p className="text-xs font-bold text-white">#{p.id.slice(-6).toUpperCase()}</p>
                              <p className="text-[9px] text-gray-500">{new Date(p.created_at).toLocaleDateString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-xs font-medium">{p.datos_cliente?.nombre || "—"}</p>
                              <p className="text-[9px] text-gray-500">{p.datos_cliente?.cuit ? `CUIT ${p.datos_cliente.cuit}` : ""}</p>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-5 h-5 rounded flex items-center justify-center text-[8px] font-black"
                                  style={{ background: `${NIVEL_COLORS[v?.nivel_vendedor] || "#3B82F6"}20`, color: NIVEL_COLORS[v?.nivel_vendedor] || "#3B82F6" }}>
                                  {v?.nombre?.slice(0, 2).toUpperCase() || "—"}
                                </div>
                                <span className="text-[10px] text-gray-400">{v?.nombre?.split(" ")[0] || "—"}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className="text-xs font-black text-white">{fmtMoney(p.total)}</span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              {p.estado_pago === "pagado" ? (
                                <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase" style={{ background: "rgba(16,185,129,0.1)", color: "#10B981" }}>Liquidado</span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase italic" style={{ background: "rgba(255,94,58,0.1)", color: "#FF5E3A" }}>Pendiente Pago</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {pedidos.length === 0 && (
                        <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-600 text-sm">Sin pedidos aún</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Clientes Corporativos */}
              <div className="section-card">
                <div className="p-5 border-b border-white/5 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black flex items-center gap-2">
                      <Buildings weight="bold" color="#FF5E3A" size={18} />
                      Base de Clientes Corporativos
                    </h3>
                    <span className="help-pill mt-1">Directorio de Empresas</span>
                  </div>
                </div>
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {clientesFiltrados.slice(0, 6).map((c: any, idx: number) => {
                    const v = equipo.find((vv: any) => vv.id === c.vendedor_referente_id);
                    const cPedidos = pedidos.filter(p => p.datos_cliente?.cliente_id === c.id);
                    const cTotal = cPedidos.filter(p => p.estado !== "cancelado").reduce((s: number, p: any) => s + p.total, 0);
                    const esVip = cTotal > 500000;
                    const Icono = idx % 2 === 0 ? Truck : HardHat;
                    const iconoColor = idx % 2 === 0 ? "#3B82F6" : "#A855F7";
                    return (
                      <div key={c.id} className="bg-[#161920] p-4 rounded-xl border border-white/5 hover:border-[#FF5E3A]/40 transition-all flex gap-4">
                        <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#08090D", color: "#94A3B8" }}>
                          <Icono weight="fill" size={24} />
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <div className="flex justify-between items-start">
                            <h4 className="text-xs font-black text-white truncate">{c.nombre}</h4>
                            <span className="text-[7px] font-black px-1.5 py-0.5 rounded uppercase" style={{ background: esVip ? "rgba(255,94,58,0.1)" : "rgba(255,255,255,0.05)", color: esVip ? "#FF5E3A" : "#94A3B8" }}>{esVip ? "Premium" : "Standard"}</span>
                          </div>
                          <p className="text-[9px] text-gray-500 mt-0.5 uppercase font-bold">CUIT: {c.cuit || "—"}</p>
                          <div className="mt-3 flex items-center justify-between">
                            <div className="text-[9px]">
                              <span className="text-gray-500 block uppercase font-bold">{cPedidos.length > 0 ? "Última Compra" : "Cartera"}</span>
                              <span className="text-white font-bold">{cPedidos.length > 0 ? fmtMoney(cTotal) : "Sin compras"}</span>
                            </div>
                            <div className="text-[9px] text-right">
                              <span className="text-gray-500 block uppercase font-bold">Asignado</span>
                              <span className="font-bold" style={{ color: "#FF5E3A" }}>{v?.nombre?.split(" ")[0] || "Sin asignar"}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {clientes.length === 0 && (
                    <div className="col-span-2 py-8 text-center text-gray-600">
                      <span className="mx-auto mb-2 opacity-20 block"><Users size={32} /></span>
                      <p className="text-sm">Sin clientes registrados</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </>)}

        {/* ── TAB VENDEDORES ── */}
        {tab === "vendedores" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-black">Equipo de Ventas <span className="text-gray-500 font-normal text-xs">({equipo.length})</span></h2>
            </div>
            {equipo.length === 0 ? (
              <div className="rounded-xl p-12 text-center text-gray-600 border border-dashed border-white/[0.08]">
                <span className="mx-auto mb-3 opacity-20 block"><Users size={40} /></span>
                <p className="text-sm">No tenés vendedores asignados</p>
              </div>
            ) : equipoOrdenado.map((v: any, idx: number) => {
              const m = metricasVendedor(v.id);
              const isExp = expandedVendedor === v.id;
              const vPedidos = pedidos.filter(p => p.vendedor_id === v.id);
              return (
                <div key={v.id} className="rounded-xl overflow-hidden border border-white/[0.06]">
                  <button className="w-full px-5 py-4 text-left" onClick={() => setExpandedVendedor(isExp ? null : v.id)}>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-base font-black shrink-0 w-6 text-center" style={{ color: idx === 0 ? "#f59e0b" : idx === 1 ? "#94a3b8" : idx === 2 ? "#b45309" : "#374151" }}>
                        {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}`}
                      </span>
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-sm shrink-0"
                        style={{ background: `${NIVEL_COLORS[v.nivel_vendedor] || "#10b981"}18`, color: NIVEL_COLORS[v.nivel_vendedor] || "#10b981", border: `1px solid ${NIVEL_COLORS[v.nivel_vendedor] || "#10b981"}35` }}>
                        {v.nombre.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-black text-white">{v.nombre}</p>
                          <span className="text-[9px] px-2 py-0.5 rounded-full font-bold capitalize" style={{ background: `${NIVEL_COLORS[v.nivel_vendedor] || "#10b981"}15`, color: NIVEL_COLORS[v.nivel_vendedor] || "#10b981", border: `1px solid ${NIVEL_COLORS[v.nivel_vendedor] || "#10b981"}30` }}>
                            <Star size={10} /> {v.nivel_vendedor || "nuevo"}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{v.email} · <span className="font-mono">{v.codigo_referido}</span> · {v.comision_pct}% com.</p>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <p className="text-sm font-black text-emerald-400">{fmtMoney(m.ventas)}</p>
                          <p className="text-[10px] text-orange-400">Tu parte: {fmtMoney(m.comisionG)}</p>
                        </div>
                        {isExp ? <CaretUp size={16} /> : <CaretDown size={16} />}
                      </div>
                    </div>
                  </button>
                  <div className="grid grid-cols-4 border-t border-white/[0.05]" style={{ background: "rgba(0,0,0,0.15)" }}>
                    {[
                      { label: "Pedidos", value: m.total, color: "#8b5cf6" },
                      { label: "Pagados", value: m.pagados, color: "#10b981" },
                      { label: "Despachados", value: m.despachados, color: "#3b82f6" },
                      { label: "Clientes", value: m.clientes.length, color: "#f97316" },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="p-3 text-center border-r border-white/[0.04]">
                        <p className="text-[9px] text-gray-600 uppercase font-bold mb-0.5">{label}</p>
                        <p className="text-base font-black" style={{ color }}>{value}</p>
                      </div>
                    ))}
                  </div>
                  {isExp && (
                    <div className="border-t border-white/[0.05] space-y-4 p-4" style={{ background: "rgba(0,0,0,0.12)" }}>
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
            <div className="flex items-center justify-between flex-wrap gap-4">
              <h2 className="text-sm font-black">Clientes del Equipo <span className="text-gray-500 font-normal text-xs">({clientes.length})</span></h2>
              <div className="relative group max-w-sm w-full">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#FF5E3A] transition-colors"><MagnifyingGlass size={14} /></span>
                <input type="text" placeholder="Buscar cliente por nombre o CUIT..." value={busquedaCliente} onChange={e => setBusquedaCliente(e.target.value)}
                  className="w-full rounded-xl py-3 pl-10 pr-4 text-xs outline-none focus:border-[#FF5E3A] text-white"
                  style={{ background: "#08090D", border: "1px solid rgba(255,255,255,0.08)" }} />
              </div>
            </div>
            {clientesFiltrados.length === 0 ? (
              <div className="py-12 text-center text-gray-600">
                <span className="mx-auto mb-3 opacity-20 block"><Users size={40} /></span>
                <p className="text-sm">Sin clientes{busquedaCliente ? " con ese filtro" : " registrados"}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {clientesFiltrados.map((c: any, idx: number) => {
                  const v = equipo.find((vv: any) => vv.id === c.vendedor_referente_id);
                  const cPedidos = pedidos.filter(p => p.datos_cliente?.cliente_id === c.id);
                  const cTotal = cPedidos.filter(p => p.estado !== "cancelado").reduce((s: number, p: any) => s + p.total, 0);
                  const esVip = cTotal > 500000;
                  const Icono = idx % 2 === 0 ? Truck : HardHat;
                  const iconoColor = idx % 2 === 0 ? "#3B82F6" : "#A855F7";
                  return (
                    <div key={c.id} className="bg-[#111319] p-5 rounded-xl border transition-all cursor-pointer group"
                      style={{ borderColor: idx % 2 === 0 ? "rgba(59,130,246,0.1)" : "rgba(168,85,247,0.1)" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = idx % 2 === 0 ? "rgba(59,130,246,0.3)" : "rgba(168,85,247,0.3)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = idx % 2 === 0 ? "rgba(59,130,246,0.1)" : "rgba(168,85,247,0.1)"; }}>
                      <div className="flex justify-between items-start mb-5">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${iconoColor}10`, color: iconoColor }}>
                          <Icono size={20} />
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full"
                          style={esVip ? { background: "rgba(0,255,102,0.1)", color: "#00FF66" } : { background: "rgba(255,255,255,0.05)", color: "#64748b", border: "1px solid rgba(255,255,255,0.1)" }}>
                          {esVip ? "VIP Buyer" : "Standard"}
                        </span>
                      </div>
                      <h4 className="text-base font-black group-hover:text-[#3B82F6] transition-colors truncate">{c.nombre}</h4>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">{c.cuit ? `CUIT: ${c.cuit}` : c.email}</p>
                      <div className="mt-5 pt-5 border-t border-white/5 flex items-center justify-between">
                        <div>
                          <p className="text-[9px] text-gray-500 font-black uppercase tracking-wider mb-1">Compras Totales</p>
                          <p className="text-sm font-black text-white">{fmtMoney(cTotal)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] text-gray-500 font-black uppercase tracking-wider mb-1">Responsable</p>
                          <p className="text-xs font-bold underline underline-offset-4" style={{ color: "#FF5E3A" }}>{v?.nombre?.split(" ")[0] || "—"}</p>
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
            <div className="rounded-xl p-4 flex flex-wrap gap-3 items-center" style={{ background: "rgba(10,11,16,0.8)", border: "1px solid rgba(255,255,255,0.06)" }}>
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
              <div className="h-6 w-px bg-white/[0.06]" />
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
                <span className="mx-auto mb-3 opacity-20 block"><Package size={40} /></span>
                <p className="text-sm">Sin pedidos con ese filtro</p>
              </div>
            ) : (
              <div className="section-card overflow-hidden">
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
                      {pedidosFiltrados.map((p: any) => {
                        const v = getVendedor(p.vendedor_id);
                        const isExpanded = expandedId === p.id;
                        return (
                          <>
                            <tr key={p.id} className="cursor-pointer transition-colors hover:bg-white/[0.02] group"
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
                                    style={{ background: `${NIVEL_COLORS[v?.nivel_vendedor] || "#3B82F6"}20`, color: NIVEL_COLORS[v?.nivel_vendedor] || "#3B82F6" }}>
                                    {v?.nombre?.slice(0, 2).toUpperCase() || "—"}
                                  </div>
                                  <span className="text-xs text-gray-400 font-medium">{v?.nombre?.split(" ")[0] || "—"}</span>
                                </div>
                              </td>
                              <td className="px-8 py-6 text-center">
                                <p className="text-sm font-black" style={{ color: p.estado_pago === "pagado" ? "#10B981" : "#fff" }}>{fmtMoney(p.total)}</p>
                              </td>
                              <td className="px-8 py-6 text-center">
                                {p.estado_pago === "pagado" ? (
                                  <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest" style={{ background: "rgba(16,185,129,0.1)", color: "#10B981" }}>Pagado</span>
                                ) : (
                                  <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest" style={{ background: "rgba(255,94,58,0.1)", color: "#FF5E3A" }}>Pendiente</span>
                                )}
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr style={{ background: "rgba(0,0,0,0.2)" }}>
                                <td colSpan={5} className="px-8 py-3">
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
      <div className="fixed bottom-6 right-6 z-[200]">
        <button onClick={() => router.push("/catalogo/vendedor/dashboard")}
          className="group flex items-center gap-3 bg-white text-black pl-5 pr-1 py-1 rounded-full shadow-2xl hover:scale-105 transition-all active:scale-95">
          <span className="text-[10px] font-black uppercase tracking-widest">Nueva Gestión</span>
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "#FF5E3A" }}>
            <Plus weight="bold" size={20} color="#000" />
          </div>
        </button>
      </div>
    </div>
  );
}
