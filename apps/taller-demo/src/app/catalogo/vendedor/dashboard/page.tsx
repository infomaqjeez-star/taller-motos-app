"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useVendedorAuth } from "@/components/vendedor/VendedorAuthContext";
import {
  Store, LogOut, Copy, Check, DollarSign, ShoppingBag, TrendingUp,
  ArrowLeft, Award, Timer, Star, Target, TrendingDown,
  AlertTriangle, Megaphone, Info, Package, Globe, Clock
} from "lucide-react";

interface Pedido {
  id: string;
  total: number;
  estado: string;
  comision_monto: number;
  comision_estado: string;
  created_at: string;
  fecha_limite_pago?: string | null;
  fecha_pago_comision?: string | null;
  datos_cliente: { nombre?: string };
}

interface Resumen {
  total_pedidos: number;
  total_ventas: number;
  comision_pendiente: number;
  comision_pagada: number;
}

function fmtMoney(n: number) {
  return "$" + (n || 0).toLocaleString("es-AR", { maximumFractionDigits: 0 });
}

export default function VendedorDashboardPage() {
  const router = useRouter();
  const { vendedor, logout, loading: authLoading } = useVendedorAuth();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!vendedor) {
      router.push("/catalogo/vendedor/login");
      return;
    }
    cargarPedidos();
  }, [vendedor, authLoading, router]);

  const cargarPedidos = async () => {
    const token = localStorage.getItem("vendedor_token");
    if (!token) return;
    try {
      const res = await fetch("/api/vendedor/pedidos", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setPedidos(data.pedidos || []);
      setResumen(data.resumen || null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const referralLink = vendedor
    ? `https://appjeezpro.store/catalogo?ref=${vendedor.codigo_referido}`
    : "";

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const calcularDiasRestantes = (fechaLimite?: string | null): number => {
    if (!fechaLimite) return 0;
    const diff = new Date(fechaLimite).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getDiasMaximosNivel = (nivel?: string): number => {
    const dias: Record<string, number> = {
      nuevo: 30, junior: 30, senior: 20, senior_pro: 15, master: 7,
    };
    return dias[nivel || "nuevo"] || 30;
  };

  const nivelTexto = ((vendedor as any)?.nivel_vendedor || "nuevo").replace("_", " ");
  const nivelBadgeColor = (() => {
    const n = (vendedor as any)?.nivel_vendedor || "nuevo";
    if (n === "master") return "bg-orange-500/10 text-orange-400 border-orange-500/30";
    if (n === "senior_pro") return "bg-orange-500/10 text-orange-400 border-orange-500/30";
    if (n === "senior") return "bg-purple-500/10 text-purple-400 border-purple-500/30";
    if (n === "junior") return "bg-blue-500/10 text-blue-400 border-blue-500/30";
    return "bg-slate-800 text-slate-300 border-slate-700";
  })();

  if (authLoading || loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-16 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent mx-auto" />
        <p className="mt-3 text-slate-400">Cargando dashboard…</p>
      </main>
    );
  }

  if (!vendedor) return null;

  return (
    <main
      className="mx-auto max-w-6xl px-4 py-6 pb-20"
      style={{ fontFamily: "var(--font-montserrat), sans-serif" }}
    >
      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div
            className="p-3 rounded-xl shadow-lg"
            style={{ background: "linear-gradient(to bottom right, #f97316, #dc2626)", boxShadow: "0 10px 30px rgba(249,115,22,0.2)" }}
          >
            <Store className="text-2xl text-white h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Dashboard de Vendedor</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-slate-400 font-medium">{vendedor.nombre}</span>
              <span className="text-slate-600">—</span>
              <span
                className="font-bold font-mono px-2 py-0.5 rounded text-sm"
                style={{ background: "rgba(249,115,22,0.1)", color: "#fb923c" }}
              >
                {vendedor.codigo_referido}
              </span>
              <span className={`text-xs px-2 py-1 rounded-full border flex items-center gap-1 capitalize ${nivelBadgeColor}`}>
                <Award className="h-3 w-3" /> {nivelTexto}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
          <p className="text-xs text-slate-400 flex items-center gap-1">
            <Info className="h-3 w-3 text-slate-500" /> Comisiones: Máx. {getDiasMaximosNivel((vendedor as any).nivel_vendedor)} días
          </p>
          <button
            onClick={() => router.push("/catalogo")}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm font-semibold transition-colors text-slate-200"
          >
            <Store className="h-4 w-4" /> Catálogo
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm font-semibold transition-colors text-slate-200"
          >
            <LogOut className="h-4 w-4" /> Salir
          </button>
        </div>
      </header>

      {/* LINK DE REFERIDO */}
      <section
        className="rounded-2xl p-6 relative overflow-hidden mb-6"
        style={{
          background: "linear-gradient(145deg, rgba(15,23,42,0.9) 0%, rgba(15,23,42,0.4) 100%)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(16,185,129,0.3)",
          boxShadow: "0 0 30px rgba(16,185,129,0.05)",
        }}
      >
        <div
          className="absolute -right-20 -top-20 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: "rgba(16,185,129,0.1)", filter: "blur(60px)" }}
        />
        <div className="relative z-10">
          <h2 className="font-bold text-lg flex items-center gap-2 mb-2" style={{ color: "#10b981" }}>
            <Globe className="h-5 w-5" /> Tu link de referido
          </h2>
          <p className="text-slate-400 text-sm mb-4">
            Compartí este link con tus clientes. Cuando compren usando tu link, ganás comisión automáticamente.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Globe className="h-4 w-4 text-slate-500" />
              </div>
              <input
                type="text"
                readOnly
                value={referralLink}
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-xl block pl-10 p-3 font-mono focus:outline-none"
              />
            </div>
            <button
              onClick={copyLink}
              className="font-bold py-3 px-6 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap text-white"
              style={{ background: "#f97316", boxShadow: "0 10px 25px rgba(249,115,22,0.2)" }}
            >
              {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
              {copied ? "Copiado" : "Copiar Link"}
            </button>
          </div>
        </div>
      </section>

      {/* GRID: LEVEL & MAINTENANCE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* LEVEL PROGRESS */}
        {vendedor && (
          <NivelesVendedor
            vendedor={vendedor}
            ventasTotales={resumen?.total_ventas || 0}
          />
        )}

        {/* MAINTENANCE */}
        {vendedor && (
          <MantenimientoNivel
            pedidos={pedidos}
            nivel={(vendedor as any).nivel_vendedor || "nuevo"}
          />
        )}
      </div>

      {/* ORDERS */}
      <section
        className="rounded-2xl p-6"
        style={{
          background: "linear-gradient(145deg, rgba(15,23,42,0.9) 0%, rgba(15,23,42,0.4) 100%)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
          <ShoppingBag className="h-5 w-5 text-slate-400" /> Tus pedidos
        </h2>

        {pedidos.length === 0 ? (
          <div className="border border-slate-800 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center">
            <div className="p-4 rounded-full mb-4" style={{ background: "#1e293b" }}>
              <Package className="h-8 w-8 text-slate-500" />
            </div>
            <h3 className="text-slate-300 font-bold mb-1">Aún no tenés pedidos registrados</h3>
            <p className="text-slate-500 text-sm max-w-sm">
              Cuando tus clientes realicen compras a través de tu link de referido, aparecerán aquí con su estado y comisión.
            </p>
            <button
              onClick={() => router.push("/catalogo")}
              className="mt-6 text-orange-400 text-sm font-semibold hover:underline"
            >
              Ir al catálogo comercial
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {pedidos.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/5 px-4 py-3"
                style={{ background: "rgba(255,255,255,0.02)" }}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-200">
                    {p.datos_cliente?.nombre || "Cliente"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(p.created_at).toLocaleDateString("es-AR")} — {p.estado}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-white">{fmtMoney(p.total)}</p>
                  {p.comision_estado === "pagada" ? (
                    <p className="text-xs text-emerald-400">
                      <Check className="inline h-3 w-3 mr-0.5" />
                      Comisión pagada
                      {p.fecha_pago_comision && ` - ${new Date(p.fecha_pago_comision).toLocaleDateString("es-AR")}`}
                    </p>
                  ) : (
                    <div className="text-xs">
                      <p className="text-amber-400">Comisión: {fmtMoney(p.comision_monto)}</p>
                      {p.fecha_limite_pago && (
                        <p className={calcularDiasRestantes(p.fecha_limite_pago) <= 3 ? "text-red-400" : "text-slate-500"}>
                          <Timer className="inline h-3 w-3 mr-0.5" />
                          {calcularDiasRestantes(p.fecha_limite_pago)} días para cobrar
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function NivelesVendedor({ vendedor, ventasTotales }: { vendedor: { nivel_vendedor?: string; comision_pct?: number }; ventasTotales: number }) {
  const niveles = [
    { id: "nuevo",      nombre: "Nuevo",      comision: 10, requisito: 0,         accent: "#10b981", dias: 30 },
    { id: "junior",     nombre: "Junior",     comision: 11, requisito: 10000000,  accent: "#3b82f6", dias: 30 },
    { id: "senior",     nombre: "Senior",     comision: 12, requisito: 30000000,  accent: "#8b5cf6", dias: 20 },
    { id: "senior_pro", nombre: "Senior Pro", comision: 12, requisito: 50000000,  accent: "#f97316", dias: 15 },
    { id: "master",     nombre: "Master",     comision: 15, requisito: 100000000, accent: "#eab308", dias: 7  },
  ];

  const nivelActual = vendedor.nivel_vendedor || "nuevo";
  const idxActual   = niveles.findIndex((n) => n.id === nivelActual);
  const infoActual  = niveles[idxActual];
  const siguiente   = idxActual < niveles.length - 1 ? niveles[idxActual + 1] : null;

  let progresoPct = 100;
  let restante    = 0;
  if (siguiente) {
    const desde = infoActual.requisito;
    const hasta = siguiente.requisito;
    const avance = Math.max(0, ventasTotales - desde);
    progresoPct = Math.min(100, Math.round((avance / (hasta - desde)) * 100));
    restante = Math.max(0, hasta - ventasTotales);
  }

  const metaDisplay = siguiente ? siguiente.requisito : infoActual.requisito;

  return (
    <section className="lg:col-span-2 space-y-4">

      {/* ── HEADER DE PROGRESO ── */}
      <div
        className="rounded-3xl p-6 md:p-8 relative overflow-hidden"
        style={{
          background: "linear-gradient(145deg, rgba(15,23,42,0.9) 0%, rgba(15,23,42,0.5) 100%)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div
          className="absolute -top-24 -right-24 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: "rgba(16,185,129,0.08)", filter: "blur(80px)" }}
        />

        {/* Título + porcentaje */}
        <div className="flex justify-between items-end mb-4 relative z-10">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
              <Target className="h-3.5 w-3.5 text-emerald-400" /> Progreso de Ventas
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl md:text-4xl font-black text-white">{fmtMoney(ventasTotales)}</span>
              <span className="text-slate-500 font-medium text-sm">/ Meta: {fmtMoney(metaDisplay)}</span>
            </div>
          </div>
          <span
            className="font-bold px-3 py-1 rounded-lg text-sm border"
            style={{
              background: "rgba(16,185,129,0.15)",
              border: "1px solid rgba(16,185,129,0.3)",
              color: "#4ade80",
              boxShadow: "0 0 10px rgba(74,222,128,0.15)",
            }}
          >
            {progresoPct}% completado
          </span>
        </div>

        {/* Barra de progreso */}
        <div
          className="w-full rounded-full h-4 mb-6 overflow-hidden relative z-10 p-0.5"
          style={{ background: "#0f172a", border: "1px solid #1e293b" }}
        >
          <div
            className="h-full rounded-full relative transition-all duration-1000"
            style={{
              width: `${Math.max(2, progresoPct)}%`,
              background: "linear-gradient(to right, #10b981, #4ade80)",
              boxShadow: "0 0 12px rgba(74,222,128,0.4)",
            }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow-[0_0_6px_#fff]" />
          </div>
        </div>

        {/* Beneficios del nivel actual */}
        <div className="relative z-10">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
            Beneficios de tu nivel (<span style={{ color: infoActual.accent }}>{infoActual.nombre}</span>)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              className="rounded-xl p-4 flex items-center gap-4 transition-all hover:border-emerald-500/40"
              style={{ background: "rgba(2,6,23,0.5)", border: "1px solid #1e293b" }}
            >
              <div className="p-3 rounded-lg" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
                <DollarSign className="h-6 w-6" style={{ color: "#4ade80" }} />
              </div>
              <div>
                <p className="text-white font-bold text-xl leading-none mb-1">{infoActual.comision}%</p>
                <p className="text-slate-400 text-xs font-medium">Comisión por venta</p>
              </div>
            </div>
            <div
              className="rounded-xl p-4 flex items-center gap-4 transition-all hover:border-blue-500/40"
              style={{ background: "rgba(2,6,23,0.5)", border: "1px solid #1e293b" }}
            >
              <div className="p-3 rounded-lg" style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)" }}>
                <Clock className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <p className="text-white font-bold text-xl leading-none mb-1">{infoActual.dias} días</p>
                <p className="text-slate-400 text-xs font-medium">Plazo de pago</p>
              </div>
            </div>
          </div>

          {siguiente && (
            <p className="text-xs text-slate-500 mt-4 text-center">
              Te faltan <strong className="text-white">{fmtMoney(restante)}</strong> en ventas para subir a{" "}
              <span className="font-bold" style={{ color: siguiente.accent }}>{siguiente.nombre}</span>
            </p>
          )}
          {!siguiente && (
            <p className="text-xs text-center mt-4 font-bold" style={{ color: "#eab308" }}>
              ★ ¡Nivel máximo alcanzado!
            </p>
          )}
        </div>
      </div>

      {/* ── PLAN DE CARRERA (TIMELINE) ── */}
      <div
        className="rounded-3xl p-6 md:p-8"
        style={{
          background: "linear-gradient(145deg, rgba(15,23,42,0.9) 0%, rgba(15,23,42,0.5) 100%)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Award className="h-5 w-5 text-slate-400" /> Plan de Carrera
          </h3>
          <span className="text-xs text-slate-500 font-medium">5 niveles disponibles</span>
        </div>

        <div className="space-y-3 relative">
          {/* Línea vertical de timeline */}
          <div
            className="absolute left-5 top-0 bottom-0 w-0.5 pointer-events-none"
            style={{ background: "linear-gradient(to bottom, #10b981, #1e293b, #1e293b)" }}
          />

          {niveles.map((n, i) => {
            const esActual  = n.id === nivelActual;
            const esPasado  = i < idxActual;
            const esFuturo  = i > idxActual;

            return (
              <div key={n.id} className="relative flex items-start gap-4 group">

                {/* Ícono timeline */}
                <div
                  className="relative flex items-center justify-center w-10 h-10 rounded-full shrink-0 z-10 transition-all"
                  style={{
                    background:  esActual ? "#0f172a" : "#0f172a",
                    border:      esActual ? `3px solid ${n.accent}` : esPasado ? `2px solid ${n.accent}` : "2px solid #1e293b",
                    boxShadow:   esActual ? `0 0 14px ${n.accent}40` : "none",
                    color:       esActual ? n.accent : esPasado ? n.accent : "#475569",
                  }}
                >
                  {esActual && (
                    <div
                      className="absolute inset-0 rounded-full animate-ping opacity-30"
                      style={{ background: n.accent }}
                    />
                  )}
                  {n.id === "master"
                    ? <Star className="h-4 w-4 relative z-10" />
                    : <span className="text-sm font-black relative z-10">{i + 1}</span>}
                </div>

                {/* Tarjeta */}
                <div
                  className="flex-1 rounded-2xl p-4 relative overflow-hidden transition-all"
                  style={
                    esActual
                      ? { background: "#0f172a", border: `2px solid ${n.accent}`, boxShadow: `0 0 20px ${n.accent}15` }
                      : {
                          background: "rgba(15,23,42,0.4)",
                          border: "1px solid rgba(255,255,255,0.05)",
                          transform: esFuturo ? undefined : undefined,
                        }
                  }
                  onMouseEnter={(e) => {
                    if (!esActual) (e.currentTarget as HTMLElement).style.background = "rgba(30,41,59,0.6)";
                  }}
                  onMouseLeave={(e) => {
                    if (!esActual) (e.currentTarget as HTMLElement).style.background = "rgba(15,23,42,0.4)";
                  }}
                >
                  {/* Acento lateral de color */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
                    style={{ background: n.accent, opacity: esActual ? 1 : 0.4 }}
                  />
                  {/* Brillo master */}
                  {n.id === "master" && (
                    <div
                      className="absolute -right-8 -top-8 w-20 h-20 rounded-full pointer-events-none"
                      style={{ background: `${n.accent}18`, filter: "blur(20px)" }}
                    />
                  )}

                  <div className="flex justify-between items-start mb-1 relative z-10">
                    <h4 className="font-bold text-lg" style={{ color: esActual ? "#fff" : "#cbd5e1" }}>
                      {n.nombre}
                      {esFuturo && <span className="ml-2 text-slate-600 text-sm">🔒</span>}
                    </h4>
                    {esActual && (
                      <span
                        className="text-[10px] font-black uppercase px-2 py-0.5 rounded"
                        style={{ background: n.accent, color: "#0f172a" }}
                      >
                        Actual
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 mb-2 relative z-10">
                    {n.requisito === 0
                      ? "Punto de inicio."
                      : <>Requiere: <strong style={{ color: n.accent }}>{fmtMoney(n.requisito)}</strong> en ventas</>}
                  </p>

                  <div className="flex gap-2 relative z-10" style={{ opacity: esFuturo ? 0.6 : 1 }}>
                    <span
                      className="text-[10px] font-semibold px-2 py-1 rounded"
                      style={{ background: "#0f172a", color: n.id === "master" ? n.accent : "#cbd5e1", border: `1px solid ${n.id === "master" ? n.accent + "40" : "#1e293b"}` }}
                    >
                      {n.comision}% Comisión
                    </span>
                    <span
                      className="text-[10px] font-semibold px-2 py-1 rounded"
                      style={{ background: "#0f172a", color: "#cbd5e1", border: "1px solid #1e293b" }}
                    >
                      Pago: {n.dias} días
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function MantenimientoNivel({ pedidos, nivel }: { pedidos: Pedido[]; nivel: string }) {
  const ultimaVenta = pedidos.length > 0
    ? Math.max(...pedidos.map((p) => new Date(p.created_at).getTime()))
    : null;
  const diasDesdeUltimaVenta = ultimaVenta
    ? Math.floor((new Date().getTime() - ultimaVenta) / (1000 * 60 * 60 * 24))
    : 999;

  const DIAS_REQUERIDOS = 15;
  const estaActivo = diasDesdeUltimaVenta <= DIAS_REQUERIDOS;
  const mesesSinCumplir = !estaActivo && diasDesdeUltimaVenta > 45 ? 1 : 0;
  const enRiesgoDeBajar = mesesSinCumplir >= 2;

  let estadoTexto = "ACTIVO";
  let estadoColor = "#10b981";
  let estadoBg = "rgba(16,185,129,0.1)";
  let estadoBorder = "rgba(16,185,129,0.3)";
  let estadoIcon = <TrendingUp className="h-4 w-4" style={{ color: "#10b981" }} />;

  if (enRiesgoDeBajar) {
    estadoTexto = "RIESGO DE BAJAR";
    estadoColor = "#ef4444";
    estadoBg = "rgba(239,68,68,0.1)";
    estadoBorder = "rgba(239,68,68,0.3)";
    estadoIcon = <TrendingDown className="h-4 w-4 text-red-400" />;
  } else if (!estaActivo) {
    estadoTexto = "EN RIESGO";
    estadoColor = "#f59e0b";
    estadoBg = "rgba(245,158,11,0.1)";
    estadoBorder = "rgba(245,158,11,0.3)";
    estadoIcon = <AlertTriangle className="h-4 w-4 text-amber-400" />;
  }

  return (
    <section
      className="rounded-2xl p-6 relative overflow-hidden flex flex-col"
      style={{
        background: "linear-gradient(145deg, rgba(15,23,42,0.9) 0%, rgba(15,23,42,0.4) 100%)",
        backdropFilter: "blur(10px)",
        border: `1px solid ${estadoBorder}`,
        boxShadow: `0 0 20px ${estadoBg}`,
      }}
    >
      <div
        className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none"
        style={{ background: estadoBg, filter: "blur(40px)" }}
      />

      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <TrendingDown className="h-5 w-5" style={{ color: estadoColor }} /> Mantenimiento
          </h2>
          <p className="text-slate-400 text-xs mt-1">Mínimo: 1 venta cada 15 días</p>
        </div>
        <span
          className="text-xs font-bold px-2.5 py-1 rounded-md flex items-center gap-1 animate-pulse"
          style={{ background: estadoBg, border: `1px solid ${estadoBorder}`, color: estadoColor }}
        >
          {estadoIcon} {estadoTexto}
        </span>
      </div>

      {/* Alert Box */}
      {!estaActivo ? (
        <div
          className="rounded-xl p-4 mb-4 flex-grow"
          style={{ background: "rgba(69,26,3,0.4)", border: "1px solid rgba(146,64,14,0.3)" }}
        >
          <p className="text-sm text-slate-300 mb-2">
            No registrás ventas hace <strong className="font-bold px-1 rounded" style={{ color: "#fbbf24", background: "rgba(245,158,11,0.1)" }}>{diasDesdeUltimaVenta} días</strong>.
            Para mantener tu nivel de {nivel.replace("_", " ")}, necesitás al menos una venta cada 15 días.
          </p>
          {mesesSinCumplir > 0 && (
            <p className="text-sm font-medium p-2 rounded border" style={{ color: "#fbbf24", background: "rgba(245,158,11,0.1)", borderColor: "rgba(245,158,11,0.2)" }}>
              Meses sin cumplir: {mesesSinCumplir}. Si llegás a 2 meses seguidos, vas a bajar de nivel.
            </p>
          )}
        </div>
      ) : (
        <div
          className="rounded-xl p-4 mb-4 flex-grow"
          style={{ background: "rgba(6,78,59,0.3)", border: "1px solid rgba(16,185,129,0.2)" }}
        >
          <p className="text-sm" style={{ color: "#34d399" }}>✓ Estás activo. Tu última venta fue hace {diasDesdeUltimaVenta} días.</p>
          <p className="text-xs text-slate-500 mt-1">Para mantener tu nivel actual, asegurate de tener al menos una venta cada 15 días.</p>
        </div>
      )}

      {/* Timeline mini */}
      <div className="mb-4">
        <div className="flex justify-between text-[10px] text-slate-500 mb-1 px-1">
          <span>Hoy</span>
          <span>Día 15</span>
        </div>
        <div className="w-full rounded-full h-1.5 border" style={{ background: "#1e293b", borderColor: "#334155" }}>
          <div
            className="h-1.5 rounded-full transition-all"
            style={{
              width: `${Math.min(100, Math.max(5, ((DIAS_REQUERIDOS - diasDesdeUltimaVenta) / DIAS_REQUERIDOS) * 100))}%`,
              background: estaActivo ? "linear-gradient(to right, #10b981, #34d399)" : enRiesgoDeBajar ? "linear-gradient(to right, #ef4444, #f87171)" : "linear-gradient(to right, #d97706, #fbbf24)",
            }}
          />
        </div>
        <p className="text-[10px] text-center mt-1" style={{ color: estaActivo ? "#34d399" : "#fbbf24" }}>
          {ultimaVenta ? `Sin ventas hace ${diasDesdeUltimaVenta} días` : "Sin ventas registradas en el período"}
        </p>
      </div>

      <Link
        href="/catalogo/promo"
        className="w-full font-bold py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg text-center text-sm"
        style={{
          background: "#1e293b",
          border: "1px solid rgba(245,158,11,0.5)",
          color: "#fbbf24",
          boxShadow: "0 4px 15px rgba(245,158,11,0.05)",
        }}
      >
        <Megaphone className="h-4 w-4" /> Promocionar mi link
      </Link>

      <div className="mt-4 pt-4 border-t" style={{ borderColor: "#1e293b" }}>
        <p className="text-xs text-slate-500 hover:text-slate-300 cursor-pointer flex items-center gap-1 transition-colors">
          <Info className="h-3 w-3" /> Ver reglas de mantenimiento completas
        </p>
        <ul className="mt-2 space-y-1 text-[11px] text-slate-500">
          <li>• Mínimo 1 venta cada 15 días</li>
          <li>• Revisión cada 6 meses</li>
          <li>• Bajás si no cumplís por 2 meses seguidos</li>
        </ul>
      </div>
    </section>
  );
}
