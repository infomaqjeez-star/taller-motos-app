"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useVendedorAuth } from "@/components/vendedor/VendedorAuthContext";
import {
  Users, DollarSign, ShoppingBag, TrendingUp, Check, Timer,
  Package, LogOut, Store, ChevronDown, ChevronUp, Loader2,
  Award, Star, UserCheck, Truck, CreditCard, RefreshCw,
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
  const [tab, setTab] = useState<"resumen" | "equipo" | "pedidos">("resumen");
  const [filtroVendedor, setFiltroVendedor] = useState<string>("todos");
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedVendedor, setExpandedVendedor] = useState<string | null>(null);

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

  const TABS = [
    { id: "resumen" as const, label: "Resumen", icon: TrendingUp },
    { id: "equipo" as const, label: `Equipo (${equipo.length})`, icon: Users },
    { id: "pedidos" as const, label: `Pedidos (${pedidos.length})`, icon: ShoppingBag },
  ];

  return (
    <main className="min-h-screen pb-20" style={{ background: "#030305", color: "#fff", fontFamily: "var(--font-montserrat), sans-serif" }}>
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">

        {/* Header */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-lg" style={{ background: "linear-gradient(135deg, #f97316, #dc2626)" }}>
              {vendedor.nombre.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-white">Panel de Gerente</h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full border font-bold" style={{ color: "#fb923c", borderColor: "rgba(249,115,22,0.4)", background: "rgba(249,115,22,0.1)" }}>👑 GERENTE</span>
              </div>
              <p className="text-xs text-gray-500">{vendedor.nombre} · <span className="font-mono">{vendedor.codigo_referido}</span> · {(vendedor as any).comision_pct}% com.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={cargar} className="p-2 rounded-lg text-gray-500 hover:text-white transition-colors" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => router.push("/catalogo/vendedor/dashboard")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-gray-400 hover:text-white transition-colors"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <Store className="h-3.5 w-3.5" /> Mi Dashboard
            </button>
            <button onClick={logout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-gray-400 hover:text-white transition-colors"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <LogOut className="h-3.5 w-3.5" /> Salir
            </button>
          </div>
        </header>

        {/* Alerta urgente */}
        {alertasUrgentes.length > 0 && (
          <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
            <Timer className="h-4 w-4 text-red-400 shrink-0" />
            <p className="text-sm text-red-300 font-bold">{alertasUrgentes.length} comisión{alertasUrgentes.length > 1 ? "es" : ""} por vencer en ≤3 días — revisá la pestaña Pedidos</p>
          </div>
        )}

        {/* TABS */}
        <div className="flex gap-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
              style={tab === id
                ? { background: "rgba(249,115,22,0.15)", border: "1px solid rgba(249,115,22,0.4)", color: "#fb923c" }
                : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: "#64748b" }}>
              <Icon className="h-4 w-4" />{label}
            </button>
          ))}
        </div>

        {/* ── TAB RESUMEN ── */}
        {tab === "resumen" && (
          <div className="space-y-4">
            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Vendedores", value: resumen?.total_vendedores ?? equipo.length, icon: Users, color: "#f97316" },
                { label: "Clientes equipo", value: resumen?.total_clientes ?? clientes.length, icon: UserCheck, color: "#3b82f6" },
                { label: "Ventas equipo", value: fmtMoney(resumen?.total_ventas ?? 0), icon: TrendingUp, color: "#10b981" },
                { label: "Tu comisión pend.", value: fmtMoney(resumen?.comision_pendiente ?? 0), icon: DollarSign, color: "#f59e0b" },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-4 w-4" style={{ color }} />
                    <p className="text-[10px] text-gray-500 uppercase font-bold">{label}</p>
                  </div>
                  <p className="text-xl font-black text-white">{value}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total pedidos", value: pedidos.length, icon: ShoppingBag, color: "#8b5cf6" },
                { label: "Pagados", value: resumen?.pedidos_pagados ?? 0, icon: CreditCard, color: "#10b981" },
                { label: "Despachados", value: resumen?.pedidos_despachados ?? 0, icon: Truck, color: "#3b82f6" },
                { label: "Tu comisión cobrada", value: fmtMoney(resumen?.comision_pagada ?? 0), icon: Check, color: "#34d399" },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-4 w-4" style={{ color }} />
                    <p className="text-[10px] text-gray-500 uppercase font-bold">{label}</p>
                  </div>
                  <p className="text-xl font-black text-white">{value}</p>
                </div>
              ))}
            </div>

            {/* Ranking vendedores del equipo */}
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="px-4 py-3 flex items-center gap-2" style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <Award className="h-4 w-4 text-amber-400" />
                <p className="text-xs font-black text-white uppercase tracking-wide">Ranking del equipo</p>
              </div>
              {equipo.length === 0 ? (
                <div className="p-8 text-center text-gray-600 text-sm">Sin vendedores asignados</div>
              ) : (
                <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                  {[...equipo].sort((a, b) => {
                    const va = metricasVendedor(a.id).ventas;
                    const vb = metricasVendedor(b.id).ventas;
                    return vb - va;
                  }).map((v, idx) => {
                    const m = metricasVendedor(v.id);
                    return (
                      <div key={v.id} className="flex items-center gap-3 px-4 py-3" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                        <span className="text-lg font-black shrink-0" style={{ color: idx === 0 ? "#f59e0b" : idx === 1 ? "#94a3b8" : idx === 2 ? "#b45309" : "#374151", minWidth: 20 }}>
                          {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}`}
                        </span>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0"
                          style={{ background: `${NIVEL_COLORS[v.nivel_vendedor] || "#10b981"}20`, color: NIVEL_COLORS[v.nivel_vendedor] || "#10b981", border: `1px solid ${NIVEL_COLORS[v.nivel_vendedor] || "#10b981"}40` }}>
                          {v.nombre.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-white truncate">{v.nombre}</p>
                            <span className="text-[9px] px-1.5 py-0.5 rounded font-bold capitalize" style={{ background: `${NIVEL_COLORS[v.nivel_vendedor] || "#10b981"}15`, color: NIVEL_COLORS[v.nivel_vendedor] || "#10b981" }}>{v.nivel_vendedor || "nuevo"}</span>
                            {m.urgentes > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-red-500/15 text-red-400">⚠ {m.urgentes} urgente{m.urgentes > 1 ? "s" : ""}</span>}
                          </div>
                          <p className="text-[10px] text-gray-600">{v.comision_pct}% com. · {m.total} pedidos · {m.clientes.length} clientes</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-black text-emerald-400">{fmtMoney(m.ventas)}</p>
                          <p className="text-[10px] text-orange-400">Tu parte: {fmtMoney(m.comisionG)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB EQUIPO ── */}
        {tab === "equipo" && (
          <div className="space-y-3">
            {equipo.length === 0 ? (
              <div className="rounded-xl p-10 text-center text-gray-600" style={{ border: "1px dashed rgba(255,255,255,0.08)" }}>
                <Users className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No tenés vendedores asignados a tu equipo</p>
              </div>
            ) : equipo.map((v: any) => {
              const m = metricasVendedor(v.id);
              const isExp = expandedVendedor === v.id;
              const vPedidos = pedidos.filter(p => p.vendedor_id === v.id);
              return (
                <div key={v.id} className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                  {/* Card header vendedor */}
                  <button className="w-full px-4 py-4 text-left" onClick={() => setExpandedVendedor(isExp ? null : v.id)}>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-base shrink-0"
                        style={{ background: `${NIVEL_COLORS[v.nivel_vendedor] || "#10b981"}18`, color: NIVEL_COLORS[v.nivel_vendedor] || "#10b981", border: `1px solid ${NIVEL_COLORS[v.nivel_vendedor] || "#10b981"}35` }}>
                        {v.nombre.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-black text-white">{v.nombre}</p>
                          <span className="text-[9px] px-2 py-0.5 rounded-full font-bold capitalize" style={{ background: `${NIVEL_COLORS[v.nivel_vendedor] || "#10b981"}15`, color: NIVEL_COLORS[v.nivel_vendedor] || "#10b981", border: `1px solid ${NIVEL_COLORS[v.nivel_vendedor] || "#10b981"}30` }}>
                            <Star className="inline h-2.5 w-2.5 mr-0.5" />{v.nivel_vendedor || "nuevo"}
                          </span>
                          {m.urgentes > 0 && <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-red-500/12 text-red-400 border border-red-500/20">⚠ {m.urgentes} urgente{m.urgentes > 1 ? "s" : ""}</span>}
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

                  {/* Métricas rápidas */}
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

                  {/* Detalle expandido: clientes + pedidos recientes */}
                  {isExp && (
                    <div className="border-t space-y-4 p-4" style={{ borderColor: "rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.12)" }}>

                      {/* Clientes del vendedor */}
                      <div>
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2">
                          Clientes registrados ({m.clientes.length})
                        </p>
                        {m.clientes.length === 0 ? (
                          <p className="text-xs text-gray-700 italic">Sin clientes registrados aún</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {m.clientes.map((c: any) => {
                              const cPedidos = vPedidos.filter(p => p.datos_cliente?.cliente_id === c.id);
                              const cTotal = cPedidos.filter(p => p.estado !== "cancelado").reduce((s: number, p: any) => s + p.total, 0);
                              return (
                                <div key={c.id} className="rounded-lg px-3 py-2" style={{ background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.15)" }}>
                                  <p className="text-xs font-bold text-white">{c.nombre}</p>
                                  <p className="text-[10px] text-gray-500">{c.email}</p>
                                  <p className="text-[10px] text-orange-400 font-bold mt-0.5">{fmtMoney(cTotal)} · {cPedidos.length} pedidos</p>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Pedidos recientes del vendedor */}
                      <div>
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2">
                          Pedidos recientes
                        </p>
                        <div className="space-y-1.5">
                          {vPedidos.slice(0, 5).map((p: any) => {
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
                                  <Badge estado={p.estado_envio || ""} tipo="envio" />
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-xs font-black text-white">{fmtMoney(p.total)}</p>
                                  <p className={`text-[10px] ${p.comision_estado === "pagada" ? "text-emerald-400" : dias !== null && dias <= 3 ? "text-red-400 font-bold" : "text-amber-400"}`}>
                                    {p.comision_estado === "pagada" ? "✓" : dias !== null && dias <= 3 ? `⚠ ${dias}d` : "⏳"} {fmtMoney(p.comision_monto)}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                          {vPedidos.length > 5 && (
                            <button onClick={() => { setFiltroVendedor(v.id); setTab("pedidos"); }}
                              className="w-full text-xs text-center py-2 text-orange-400 hover:text-white transition-colors">
                              Ver los {vPedidos.length - 5} pedidos restantes →
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

        {/* ── TAB PEDIDOS ── */}
        {tab === "pedidos" && (
          <div className="space-y-3">
            {/* Filtros */}
            <div className="flex flex-wrap gap-2">
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => setFiltroVendedor("todos")}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all"
                  style={{ background: filtroVendedor === "todos" ? "rgba(249,115,22,0.12)" : "rgba(255,255,255,0.03)", border: `1px solid ${filtroVendedor === "todos" ? "rgba(249,115,22,0.35)" : "rgba(255,255,255,0.07)"}`, color: filtroVendedor === "todos" ? "#fb923c" : "#64748b" }}>
                  Todos
                </button>
                {equipo.map(v => (
                  <button key={v.id} onClick={() => setFiltroVendedor(filtroVendedor === v.id ? "todos" : v.id)}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all"
                    style={{ background: filtroVendedor === v.id ? "rgba(249,115,22,0.12)" : "rgba(255,255,255,0.03)", border: `1px solid ${filtroVendedor === v.id ? "rgba(249,115,22,0.35)" : "rgba(255,255,255,0.07)"}`, color: filtroVendedor === v.id ? "#fb923c" : "#64748b" }}>
                    {v.nombre.split(" ")[0]}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5 border-l border-white/5 pl-2">
                {["pendiente", "confirmado", "pagado", "enviado", "entregado", "cancelado"].map(e => (
                  <button key={e} onClick={() => setFiltroEstado(filtroEstado === e ? "todos" : e)}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-bold capitalize transition-all"
                    style={{ background: filtroEstado === e ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.02)", border: `1px solid ${filtroEstado === e ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.06)"}`, color: filtroEstado === e ? "#a5b4fc" : "#64748b" }}>
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[11px] text-gray-600">{pedidosFiltrados.length} pedidos</p>

            {pedidosFiltrados.length === 0 ? (
              <div className="text-center py-12 text-gray-600">
                <Package className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Sin pedidos con ese filtro</p>
              </div>
            ) : pedidosFiltrados.map((p) => {
              const diasRestantes = p.fecha_limite_pago
                ? Math.ceil((new Date(p.fecha_limite_pago).getTime() - Date.now()) / 86400000)
                : 0;
              const comisionUrgente = p.comision_estado !== "pagada" && p.fecha_limite_pago && diasRestantes <= 3;
              const isExpanded = expandedId === p.id;
              const v = getVendedor(p.vendedor_id);

              return (
                <div key={p.id} className="rounded-xl overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${comisionUrgente ? "rgba(239,68,68,0.25)" : "rgba(255,255,255,0.06)"}` }}>
                  <button className="w-full flex flex-wrap items-center gap-3 px-4 py-3 text-left"
                    onClick={() => setExpandedId(isExpanded ? null : p.id)}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-white truncate">{p.datos_cliente?.nombre || "Cliente"}</p>
                        {v && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                            style={{ background: `${NIVEL_COLORS[v.nivel_vendedor] || "#10b981"}15`, color: NIVEL_COLORS[v.nivel_vendedor] || "#10b981" }}>
                            {v.nombre.split(" ")[0]}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5">{new Date(p.created_at).toLocaleDateString("es-AR")}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge estado={p.estado} tipo="pedido" />
                      <Badge estado={p.estado_pago || ""} tipo="pago" />
                      <Badge estado={p.estado_envio || ""} tipo="envio" />
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-2">
                      <p className="text-sm font-black text-white">{fmtMoney(p.total)}</p>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-600" /> : <ChevronDown className="h-4 w-4 text-gray-600" />}
                    </div>
                  </button>

                  {/* Fila comisión */}
                  <div className={`flex items-center justify-between px-4 py-2 border-t`}
                    style={{ borderColor: comisionUrgente ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.04)", background: comisionUrgente ? "rgba(239,68,68,0.05)" : p.comision_estado === "pagada" ? "rgba(16,185,129,0.04)" : "rgba(245,158,11,0.04)" }}>
                    <div className="flex items-center gap-2">
                      <DollarSign className={`h-3.5 w-3.5 ${p.comision_estado === "pagada" ? "text-emerald-400" : comisionUrgente ? "text-red-400" : "text-amber-400"}`} />
                      <span className="text-xs font-bold" style={{ color: p.comision_estado === "pagada" ? "#34d399" : comisionUrgente ? "#f87171" : "#fbbf24" }}>
                        {p.comision_estado === "pagada" ? "Comisión pagada" : "Comisión pendiente"}: {fmtMoney(p.comision_monto)}
                        {p.comision_gerente_monto > 0 && <span className="ml-2 text-orange-400">· Tu parte: {fmtMoney(p.comision_gerente_monto)}</span>}
                      </span>
                    </div>
                    <div className="text-right text-[10px]">
                      {p.comision_estado === "pagada" && p.fecha_pago_comision && (
                        <span className="text-gray-500"><Check className="inline h-3 w-3 mr-0.5" />{new Date(p.fecha_pago_comision).toLocaleDateString("es-AR")}</span>
                      )}
                      {p.comision_estado !== "pagada" && p.fecha_limite_pago && (
                        <span className={diasRestantes <= 3 ? "text-red-400 font-bold" : "text-gray-500"}>
                          <Timer className="inline h-3 w-3 mr-0.5" />{diasRestantes > 0 ? `${diasRestantes}d restantes` : "Vencido"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Detalle expandido */}
                  {isExpanded && (
                    <div className="border-t px-4 py-3" style={{ borderColor: "rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.15)" }}>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { label: "Vendedor", value: getNombreVendedor(p.vendedor_id), bg: "rgba(255,255,255,0.03)", color: "text-white" },
                          { label: "Cliente", value: p.datos_cliente?.nombre || "—", bg: "rgba(255,255,255,0.03)", color: "text-white" },
                          p.fecha_pago ? { label: "Fecha pago", value: new Date(p.fecha_pago).toLocaleDateString("es-AR"), bg: "rgba(16,185,129,0.06)", color: "text-emerald-400" } : null,
                          p.fecha_despacho ? { label: "Fecha despacho", value: new Date(p.fecha_despacho).toLocaleDateString("es-AR"), bg: "rgba(59,130,246,0.06)", color: "text-blue-400" } : null,
                          p.fecha_entrega ? { label: "Fecha entrega", value: new Date(p.fecha_entrega).toLocaleDateString("es-AR"), bg: "rgba(16,185,129,0.06)", color: "text-emerald-400" } : null,
                        ].filter(Boolean).map((item: any) => (
                          <div key={item.label} className="rounded-lg p-2" style={{ background: item.bg }}>
                            <p className="text-[10px] text-gray-600 uppercase font-bold mb-0.5">{item.label}</p>
                            <p className={`text-xs font-bold ${item.color}`}>{item.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </div>
    </main>
  );
}
