"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useVendedorAuth } from "@/components/vendedor/VendedorAuthContext";
import {
  Store, LogOut, Copy, Check, DollarSign, ShoppingBag, TrendingUp,
  ArrowLeft, Award, Timer, ChevronDown, Star, Target, TrendingDown,
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
  const [tablaOpen, setTablaOpen] = useState(false);

  const niveles = [
    { id: "nuevo", nombre: "Nuevo", comision: 10, requisito: 0, color: "text-gray-400", accent: "#9ca3af", dias: 30 },
    { id: "junior", nombre: "Junior", comision: 11, requisito: 10000000, color: "text-blue-400", accent: "#60a5fa", dias: 30 },
    { id: "senior", nombre: "Senior", comision: 12, requisito: 30000000, color: "text-purple-400", accent: "#c084fc", dias: 20 },
    { id: "senior_pro", nombre: "Senior Pro", comision: 12, requisito: 50000000, color: "text-orange-400", accent: "#fb923c", dias: 15 },
    { id: "master", nombre: "Master", comision: 15, requisito: 100000000, color: "text-orange-500", accent: "#f97316", dias: 7 },
  ];

  const nivelActual = vendedor.nivel_vendedor || "nuevo";
  const idxActual = niveles.findIndex((n) => n.id === nivelActual);
  const infoActual = niveles[idxActual];
  const siguiente = idxActual < niveles.length - 1 ? niveles[idxActual + 1] : null;

  let progresoPct = 100;
  let restante = 0;
  if (siguiente) {
    const desde = infoActual.requisito;
    const hasta = siguiente.requisito;
    const avance = Math.max(0, ventasTotales - desde);
    const rango = hasta - desde;
    progresoPct = Math.min(100, Math.round((avance / rango) * 100));
    restante = Math.max(0, hasta - ventasTotales);
  }

  return (
    <section
      className="rounded-2xl p-6 lg:col-span-2 flex flex-col justify-between"
      style={{
        background: "linear-gradient(145deg, rgba(15,23,42,0.9) 0%, rgba(15,23,42,0.4) 100%)",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div>
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Star className="h-5 w-5" style={{ color: infoActual.accent }} /> Nivel {infoActual.nombre}
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              {siguiente
                ? `${fmtMoney(restante)} para subir a ${siguiente.nombre}`
                : "¡Nivel máximo alcanzado!"}
            </p>
          </div>
          <span
            className="font-bold px-4 py-1.5 rounded-full text-sm border"
            style={{ background: "rgba(30,41,59,0.8)", borderColor: "#334155", color: "#e2e8f0" }}
          >
            {infoActual.comision}% comisión
          </span>
        </div>

        {/* Progress Bar */}
        {siguiente && (
          <div className="mb-6">
            <div className="flex justify-between text-sm font-medium mb-2">
              <span className="text-slate-300">Ventas: <span className="text-white font-bold">{fmtMoney(ventasTotales)}</span></span>
              <span className="text-slate-500">Meta: {fmtMoney(siguiente.requisito)}</span>
            </div>
            <div className="w-full rounded-full h-3 mb-2 overflow-hidden border" style={{ background: "#1e293b", borderColor: "#334155" }}>
              <div
                className="h-3 rounded-full transition-all"
                style={{ width: `${Math.max(2, progresoPct)}%`, background: "linear-gradient(to right, #10b981, #34d399)" }}
              />
            </div>
            <div className="text-right text-xs font-semibold" style={{ color: "#10b981" }}>{progresoPct}% completado</div>
          </div>
        )}
      </div>

      {/* Benefits */}
      <div className="rounded-xl p-4 border mb-4" style={{ background: "rgba(15,23,42,0.5)", borderColor: "#1e293b" }}>
        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-3">Beneficios de Nivel {infoActual.nombre}</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ background: "rgba(16,185,129,0.1)", color: "#10b981" }}>
              <DollarSign className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-slate-200">{infoActual.comision}% por venta</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ background: "rgba(59,130,246,0.1)", color: "#60a5fa" }}>
              <Clock className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-slate-200">Pago en {infoActual.dias} días</p>
          </div>
        </div>
      </div>

      <button
        onClick={() => setTablaOpen(!tablaOpen)}
        className="w-full text-center text-sm text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-1 py-2"
      >
        Ver todos los niveles y requisitos <ChevronDown className={`h-4 w-4 transition-transform ${tablaOpen ? "rotate-180" : ""}`} />
      </button>

      {tablaOpen && (
        <div className="space-y-2 mt-3">
          {niveles.map((n, i) => {
            const esActual = n.id === nivelActual;
            const esFuturo = i > idxActual;
            return (
              <div
                key={n.id}
                className="flex items-center gap-3 rounded-xl border p-2.5"
                style={{
                  background: esActual ? "rgba(30,41,59,0.6)" : esFuturo ? "rgba(15,23,42,0.3)" : "rgba(15,23,42,0.4)",
                  borderColor: esActual ? "#334155" : "rgba(255,255,255,0.05)",
                  opacity: esFuturo ? 0.6 : 1,
                }}
              >
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full"
                  style={{ background: esActual ? "rgba(30,41,59,0.8)" : "rgba(255,255,255,0.05)" }}
                >
                  <span className="text-xs font-bold" style={{ color: esActual ? n.accent : "#64748b" }}>{i + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold" style={{ color: esActual ? n.accent : "#cbd5e1" }}>{n.nombre}</span>
                    {esActual && (
                      <span className="rounded px-1.5 py-0.5 text-[10px] font-bold" style={{ background: "rgba(16,185,129,0.2)", color: "#34d399" }}>ACTUAL</span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500">
                    {n.requisito === 0 ? "Inicio" : `Requisito: ${fmtMoney(n.requisito)} en ventas`} · {n.comision}% comisión · {n.dias} días pago
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
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
