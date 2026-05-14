"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useVendedorAuth } from "@/components/vendedor/VendedorAuthContext";
import {
  Users, DollarSign, ShoppingBag, TrendingUp, Check, Timer,
  Package, LogOut, Store, ChevronDown, ChevronUp, AlertTriangle, Loader2,
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

export default function GerenteDashboardPage() {
  const router = useRouter();
  const { vendedor, logout, loading: authLoading } = useVendedorAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filtroVendedor, setFiltroVendedor] = useState<string>("todos");
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!vendedor) { router.push("/catalogo/vendedor/login"); return; }
    if (!(vendedor as any).es_gerente) { router.push("/catalogo/vendedor/dashboard"); return; }
    cargar();
  }, [vendedor, authLoading]);

  const cargar = async () => {
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
  const resumen = data?.resumen;

  const pedidosFiltrados = pedidos
    .filter(p => filtroVendedor === "todos" || p.vendedor_id === filtroVendedor)
    .filter(p => filtroEstado === "todos" || p.estado === filtroEstado);

  const getNombreVendedor = (id: string) => equipo.find((v: any) => v.id === id)?.nombre || "—";

  return (
    <main className="min-h-screen pb-20" style={{ background: "#030305", color: "#fff", fontFamily: "var(--font-montserrat), sans-serif" }}>
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(to bottom right, #f97316, #dc2626)" }}>
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">Panel de Gerente</h1>
              <p className="text-xs text-gray-500">{vendedor.nombre} · {vendedor.codigo_referido}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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

        {/* Stats */}
        {resumen && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Vendedores", value: resumen.total_vendedores, icon: Users, color: "#f97316" },
              { label: "Pedidos", value: resumen.total_pedidos, icon: ShoppingBag, color: "#3b82f6" },
              { label: "Ventas equipo", value: fmtMoney(resumen.total_ventas), icon: TrendingUp, color: "#10b981" },
              { label: "Comisión pendiente", value: fmtMoney(resumen.comision_pendiente), icon: DollarSign, color: "#f59e0b" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="h-4 w-4" style={{ color }} />
                  <p className="text-[10px] text-gray-500 uppercase font-bold">{label}</p>
                </div>
                <p className="text-lg font-black text-white">{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Equipo */}
        {equipo.length > 0 && (
          <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <p className="text-xs font-black text-gray-400 uppercase mb-3">Tu equipo</p>
            <div className="flex flex-wrap gap-2">
              {equipo.map((v: any) => {
                const vPedidos = pedidos.filter(p => p.vendedor_id === v.id);
                const vVentas = vPedidos.filter(p => p.estado !== "cancelado").reduce((s: number, p: any) => s + p.total, 0);
                return (
                  <button key={v.id}
                    onClick={() => setFiltroVendedor(filtroVendedor === v.id ? "todos" : v.id)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all"
                    style={{
                      background: filtroVendedor === v.id ? "rgba(249,115,22,0.1)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${filtroVendedor === v.id ? "rgba(249,115,22,0.4)" : "rgba(255,255,255,0.08)"}`,
                      color: filtroVendedor === v.id ? "#fb923c" : "#94a3b8",
                    }}>
                    <span className="w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px]"
                      style={{ background: "rgba(249,115,22,0.15)", color: "#fb923c" }}>
                      {v.nombre.charAt(0)}
                    </span>
                    <span>{v.nombre}</span>
                    <span className="font-mono text-[10px] text-gray-600">{v.codigo_referido}</span>
                    <span className="ml-1 text-[10px]" style={{ color: "#10b981" }}>{fmtMoney(vVentas)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Filtros estado */}
        <div className="flex flex-wrap gap-2">
          {["todos", "pendiente", "confirmado", "pagado", "enviado", "entregado", "cancelado"].map(e => (
            <button key={e}
              onClick={() => setFiltroEstado(e)}
              className="px-3 py-1.5 rounded-lg text-[11px] font-bold capitalize transition-all"
              style={{
                background: filtroEstado === e ? "rgba(249,115,22,0.12)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${filtroEstado === e ? "rgba(249,115,22,0.35)" : "rgba(255,255,255,0.07)"}`,
                color: filtroEstado === e ? "#fb923c" : "#64748b",
              }}>
              {e === "todos" ? `Todos (${pedidosFiltrados.length})` : e}
            </button>
          ))}
        </div>

        {/* Pedidos */}
        <div className="space-y-2">
          {pedidosFiltrados.length === 0 ? (
            <div className="text-center py-12 text-gray-600">
              <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No hay pedidos con ese filtro</p>
            </div>
          ) : pedidosFiltrados.map((p) => {
            const diasRestantes = p.fecha_limite_pago
              ? Math.ceil((new Date(p.fecha_limite_pago).getTime() - Date.now()) / 86400000)
              : 0;
            const comisionUrgente = p.comision_estado !== "pagada" && p.fecha_limite_pago && diasRestantes <= 3;
            const isExpanded = expandedId === p.id;

            return (
              <div key={p.id} className="rounded-xl overflow-hidden"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>

                {/* Fila resumen */}
                <button className="w-full flex flex-wrap items-center gap-3 px-4 py-3 text-left"
                  onClick={() => setExpandedId(isExpanded ? null : p.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-white truncate">{p.datos_cliente?.nombre || "Cliente"}</p>
                      <span className="text-[10px] text-gray-500 font-mono">{getNombreVendedor(p.vendedor_id)}</span>
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

                {/* Fila comisión gerente */}
                <div className={`flex items-center justify-between px-4 py-2 border-t ${comisionUrgente ? "border-red-500/20" : "border-white/[0.04]"}`}
                  style={{ background: comisionUrgente ? "rgba(239,68,68,0.05)" : p.comision_estado === "pagada" ? "rgba(16,185,129,0.04)" : "rgba(245,158,11,0.04)" }}>
                  <div className="flex items-center gap-2">
                    <DollarSign className={`h-3.5 w-3.5 ${p.comision_estado === "pagada" ? "text-emerald-400" : comisionUrgente ? "text-red-400" : "text-amber-400"}`} />
                    <span className="text-xs font-bold" style={{ color: p.comision_estado === "pagada" ? "#34d399" : comisionUrgente ? "#f87171" : "#fbbf24" }}>
                      {p.comision_estado === "pagada"
                        ? `Comisión equipo pagada: ${fmtMoney(p.comision_monto)}`
                        : `Comisión equipo pendiente: ${fmtMoney(p.comision_monto)}`}
                      {p.comision_gerente_monto > 0 && (
                        <span className="ml-2 text-orange-400">· Tu parte: {fmtMoney(p.comision_gerente_monto)}</span>
                      )}
                    </span>
                  </div>
                  <div className="text-right">
                    {p.comision_estado === "pagada" && p.fecha_pago_comision && (
                      <p className="text-[10px] text-gray-500">
                        <Check className="inline h-3 w-3 mr-0.5" />
                        {new Date(p.fecha_pago_comision).toLocaleDateString("es-AR")}
                      </p>
                    )}
                    {p.comision_estado !== "pagada" && p.fecha_limite_pago && (
                      <p className={`text-[10px] ${diasRestantes <= 3 ? "text-red-400 font-bold" : "text-gray-500"}`}>
                        <Timer className="inline h-3 w-3 mr-0.5" />
                        {diasRestantes > 0 ? `${diasRestantes}d restantes` : "Vencido"}
                      </p>
                    )}
                  </div>
                </div>

                {/* Detalle expandido */}
                {isExpanded && (
                  <div className="border-t px-4 py-3 space-y-2" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.2)" }}>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="rounded-lg p-2" style={{ background: "rgba(255,255,255,0.03)" }}>
                        <p className="text-[10px] text-gray-600 uppercase font-bold mb-0.5">Vendedor</p>
                        <p className="text-white font-bold">{getNombreVendedor(p.vendedor_id)}</p>
                      </div>
                      <div className="rounded-lg p-2" style={{ background: "rgba(255,255,255,0.03)" }}>
                        <p className="text-[10px] text-gray-600 uppercase font-bold mb-0.5">Cliente</p>
                        <p className="text-white font-bold">{p.datos_cliente?.nombre || "—"}</p>
                      </div>
                      {p.fecha_pago && (
                        <div className="rounded-lg p-2" style={{ background: "rgba(16,185,129,0.06)" }}>
                          <p className="text-[10px] text-gray-600 uppercase font-bold mb-0.5">Fecha pago</p>
                          <p className="text-emerald-400 font-bold">{new Date(p.fecha_pago).toLocaleDateString("es-AR")}</p>
                        </div>
                      )}
                      {p.fecha_despacho && (
                        <div className="rounded-lg p-2" style={{ background: "rgba(59,130,246,0.06)" }}>
                          <p className="text-[10px] text-gray-600 uppercase font-bold mb-0.5">Fecha despacho</p>
                          <p className="text-blue-400 font-bold">{new Date(p.fecha_despacho).toLocaleDateString("es-AR")}</p>
                        </div>
                      )}
                      {p.fecha_entrega && (
                        <div className="rounded-lg p-2" style={{ background: "rgba(16,185,129,0.06)" }}>
                          <p className="text-[10px] text-gray-600 uppercase font-bold mb-0.5">Fecha entrega</p>
                          <p className="text-emerald-400 font-bold">{new Date(p.fecha_entrega).toLocaleDateString("es-AR")}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </main>
  );
}
