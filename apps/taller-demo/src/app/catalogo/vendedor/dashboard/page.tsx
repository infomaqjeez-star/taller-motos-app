"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useVendedorAuth } from "@/components/vendedor/VendedorAuthContext";
import {
  Store, LogOut, Copy, Check, DollarSign, ShoppingBag, TrendingUp, Clock, Users, ArrowLeft, Award, Timer, Calendar, ChevronDown, Star, Target, Activity, TrendingDown, Shield, AlertTriangle
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

  const getColorNivel = (nivel?: string): string => {
    const colors: Record<string, string> = {
      nuevo: "text-gray-400 border-gray-500/30 bg-gray-500/10",
      junior: "text-blue-400 border-blue-500/30 bg-blue-500/10",
      senior: "text-purple-400 border-purple-500/30 bg-purple-500/10",
      senior_pro: "text-orange-400 border-orange-500/30 bg-orange-500/10",
      master: "text-[#FF5722] border-[#FF5722]/30 bg-[#FF5722]/10",
    };
    return colors[nivel || "nuevo"] || colors.nuevo;
  };

  const getDiasMaximosNivel = (nivel?: string): number => {
    const dias: Record<string, number> = {
      nuevo: 30,
      junior: 30,
      senior: 20,
      senior_pro: 15,
      master: 7,
    };
    return dias[nivel || "nuevo"] || 30;
  };

  if (authLoading || loading) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#FF5722] border-t-transparent mx-auto" />
        <p className="mt-3 text-gray-400">Cargando dashboard…</p>
      </main>
    );
  }

  if (!vendedor) return null;

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 pb-20">
      <button
        onClick={() => router.push("/catalogo")}
        className="mb-4 flex items-center gap-1 text-sm text-gray-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al catálogo
      </button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Store className="h-6 w-6 text-[#FDB71A]" />
          <div>
            <h1 className="text-xl font-black text-white">Dashboard de vendedor</h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-gray-400">{vendedor.nombre} — {vendedor.codigo_referido}</p>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] capitalize ${getColorNivel(vendedor.comision_pct >= 10 ? 'nuevo' : undefined)}`}>
                <Award className="inline h-3 w-3 mr-0.5" />
                {(vendedor as any).nivel_vendedor?.replace('_', ' ') || 'nuevo'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Comisiones se pagan en máximo {getDiasMaximosNivel((vendedor as any).nivel_vendedor)} días
            </p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-gray-400 hover:bg-white/5 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Salir
        </button>
      </div>

      {/* Link de referido */}
      <div className="mt-5 rounded-xl border border-[#39FF14]/30 bg-[#39FF14]/5 p-4">
        <p className="text-sm font-medium text-[#39FF14]">Tu link de referido</p>
        <p className="mt-1 text-xs text-gray-400">
          Compartí este link con tus clientes. Cuando compren usando tu link, ganás comisión.
        </p>
        <div className="mt-2 flex items-center gap-2">
          <input
            readOnly
            value={referralLink}
            className="input input-sm flex-1 bg-black/30 text-xs"
          />
          <button
            onClick={copyLink}
            className="flex shrink-0 items-center gap-1 rounded-lg bg-[#FF5722] px-3 py-2 text-sm font-bold text-white hover:bg-[#E64A19]"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copiado" : "Copiar"}
          </button>
        </div>
      </div>

      {/* NIVELES DE VENDEDOR */}
      {vendedor && (
        <NivelesVendedor
          vendedor={vendedor}
          ventasTotales={resumen?.total_ventas || 0}
        />
      )}

      {/* MANTENIMIENTO DE NIVEL */}
      {vendedor && (
        <MantenimientoNivel
          pedidos={pedidos}
          nivel={vendedor.nivel_vendedor || "nuevo"}
        />
      )}

      {/* Stats */}
      {resumen && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<ShoppingBag className="h-5 w-5 text-blue-400" />}
            label="Pedidos"
            value={String(resumen.total_pedidos)}
          />
          <StatCard
            icon={<TrendingUp className="h-5 w-5 text-[#39FF14]" />}
            label="Ventas totales"
            value={fmtMoney(resumen.total_ventas)}
          />
          <StatCard
            icon={<DollarSign className="h-5 w-5 text-yellow-400" />}
            label="Comisión pendiente"
            value={fmtMoney(resumen.comision_pendiente)}
            highlight
          />
          <StatCard
            icon={<Check className="h-5 w-5 text-[#39FF14]" />}
            label="Comisión pagada"
            value={fmtMoney(resumen.comision_pagada)}
          />
        </div>
      )}

      {/* Pedidos */}
      <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold text-gray-300">
          <Clock className="h-4 w-4 text-[#FDB71A]" />
          Tus pedidos
        </h2>
        {pedidos.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">Aún no tenés pedidos registrados.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {pedidos.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-200">
                    {p.datos_cliente?.nombre || "Cliente"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(p.created_at).toLocaleDateString("es-AR")} — {p.estado}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-white">{fmtMoney(p.total)}</p>
                  {p.comision_estado === "pagada" ? (
                    <p className="text-xs text-[#39FF14]">
                      <Check className="inline h-3 w-3 mr-0.5" />
                      Comisión pagada
                      {p.fecha_pago_comision && ` - ${new Date(p.fecha_pago_comision).toLocaleDateString('es-AR')}`}
                    </p>
                  ) : (
                    <div className="text-xs">
                      <p className="text-yellow-400">
                        Comisión: {fmtMoney(p.comision_monto)}
                      </p>
                      {p.fecha_limite_pago && (
                        <p className={`${calcularDiasRestantes(p.fecha_limite_pago) <= 3 ? 'text-red-400' : 'text-gray-500'}`}>
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
      </div>
    </main>
  );
}

function NivelesVendedor({ vendedor, ventasTotales }: { vendedor: { nivel_vendedor?: string; comision_pct?: number }; ventasTotales: number }) {
  const [tablaOpen, setTablaOpen] = useState(false);

  const niveles = [
    { id: "nuevo", nombre: "Nuevo", comision: 10, requisito: 0, color: "text-gray-400", bg: "bg-gray-500/10", border: "border-gray-500/30", dias: 30 },
    { id: "junior", nombre: "Junior", comision: 11, requisito: 10000000, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30", dias: 30 },
    { id: "senior", nombre: "Senior", comision: 12, requisito: 30000000, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/30", dias: 20 },
    { id: "senior_pro", nombre: "Senior Pro", comision: 12, requisito: 50000000, color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30", dias: 15 },
    { id: "master", nombre: "Master", comision: 15, requisito: 100000000, color: "text-[#FF5722]", bg: "bg-[#FF5722]/10", border: "border-[#FF5722]/30", dias: 7 },
  ];

  const nivelActual = vendedor.nivel_vendedor || "nuevo";
  const idxActual = niveles.findIndex((n) => n.id === nivelActual);
  const infoActual = niveles[idxActual];
  const siguiente = idxActual < niveles.length - 1 ? niveles[idxActual + 1] : null;

  // Progreso hacia siguiente nivel
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
    <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-4">
      {/* Header nivel actual */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Star className={`h-5 w-5 ${infoActual.color}`} />
          <div>
            <h2 className="text-lg font-black text-white">Nivel {infoActual.nombre}</h2>
            <p className="text-xs text-gray-400">
              {siguiente
                ? `${fmtMoney(restante)} para subir a ${siguiente.nombre}`
                : "¡Nivel máximo alcanzado!"}
            </p>
          </div>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-bold ${infoActual.border} ${infoActual.bg} ${infoActual.color}`}>
          {infoActual.comision}% comisión
        </span>
      </div>

      {/* Barra de progreso */}
      {siguiente && (
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Ventas: {fmtMoney(ventasTotales)}</span>
            <span>Meta: {fmtMoney(siguiente.requisito)}</span>
          </div>
          <div className="h-3 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#39FF14] to-[#FF5722] transition-all"
              style={{ width: `${progresoPct}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-gray-500 text-right">{progresoPct}% completado</p>
        </div>
      )}

      {/* Beneficios del nivel actual */}
      <div className={`rounded-lg border ${infoActual.border} ${infoActual.bg} p-3 space-y-2`}>
        <p className={`text-sm font-bold ${infoActual.color}`}>Beneficios de {infoActual.nombre}</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1 text-gray-300">
            <DollarSign className={`h-3 w-3 ${infoActual.color}`} />
            {infoActual.comision}% por venta
          </div>
          <div className="flex items-center gap-1 text-gray-300">
            <Timer className={`h-3 w-3 ${infoActual.color}`} />
            Pago en {infoActual.dias} días
          </div>
        </div>
      </div>

      {/* Tabla de niveles desplegable */}
      <button
        onClick={() => setTablaOpen(!tablaOpen)}
        className="flex w-full items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-xs text-gray-400 hover:bg-white/10"
      >
        <span className="flex items-center gap-1">
          <Target className="h-3 w-3" />
          Ver todos los niveles y requisitos
        </span>
        <ChevronDown className={`h-3 w-3 transition-transform ${tablaOpen ? "rotate-180" : ""}`} />
      </button>

      {tablaOpen && (
        <div className="space-y-2">
          {niveles.map((n, i) => {
            const esActual = n.id === nivelActual;
            const esFuturo = i > idxActual;
            return (
              <div
                key={n.id}
                className={`flex items-center gap-3 rounded-lg border p-2.5 ${
                  esActual
                    ? `${n.border} ${n.bg}`
                    : esFuturo
                    ? "border-white/5 bg-white/[0.02] opacity-60"
                    : "border-white/10 bg-white/[0.03]"
                }`}
              >
                <div className={`flex h-8 w-8 items-center justify-center rounded-full ${esActual ? n.bg : "bg-white/5"}`}>
                  <span className={`text-xs font-bold ${esActual ? n.color : "text-gray-500"}`}>{i + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${esActual ? n.color : "text-gray-300"}`}>{n.nombre}</span>
                    {esActual && (
                      <span className="rounded bg-[#39FF14]/20 px-1.5 py-0.5 text-[10px] text-[#39FF14] font-bold">ACTUAL</span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500">
                    {n.requisito === 0 ? "Inicio" : `Requisito: ${fmtMoney(n.requisito)} en ventas`} · {n.comision}% comisión · {n.dias} días pago
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MantenimientoNivel({ pedidos, nivel }: { pedidos: Pedido[]; nivel: string }) {
  // Calcular días desde última venta
  const ultimaVenta = pedidos.length > 0
    ? Math.max(...pedidos.map((p) => new Date(p.created_at).getTime()))
    : null;
  const diasDesdeUltimaVenta = ultimaVenta
    ? Math.floor((new Date().getTime() - ultimaVenta) / (1000 * 60 * 60 * 24))
    : 999;

  // Para mantener el nivel: al menos 1 venta cada 15 días
  const DIAS_REQUERIDOS = 15;
  const estaActivo = diasDesdeUltimaVenta <= DIAS_REQUERIDOS;

  // Progreso de actividad (0-15 días)
  const progresoActividad = Math.min(100, Math.max(0, Math.round(((DIAS_REQUERIDOS - diasDesdeUltimaVenta) / DIAS_REQUERIDOS) * 100)));

  // Meses consecutivos sin cumplir (simulado basado en historial de pedidos)
  // En producción esto vendría del backend
  const mesesSinCumplir = !estaActivo && diasDesdeUltimaVenta > 45 ? 1 : 0;
  const enRiesgoDeBajar = mesesSinCumplir >= 2;

  // Color según estado
  let estadoColor = "text-[#39FF14]";
  let estadoBg = "bg-[#39FF14]/10";
  let estadoBorder = "border-[#39FF14]/30";
  let estadoTexto = "ACTIVO";
  let estadoIcono = <Shield className="h-4 w-4 text-[#39FF14]" />;

  if (enRiesgoDeBajar) {
    estadoColor = "text-red-400";
    estadoBg = "bg-red-500/10";
    estadoBorder = "border-red-500/30";
    estadoTexto = "RIESGO DE BAJAR";
    estadoIcono = <TrendingDown className="h-4 w-4 text-red-400" />;
  } else if (!estaActivo) {
    estadoColor = "text-yellow-400";
    estadoBg = "bg-yellow-500/10";
    estadoBorder = "border-yellow-500/30";
    estadoTexto = "EN RIESGO";
    estadoIcono = <AlertTriangle className="h-4 w-4 text-yellow-400" />;
  }

  return (
    <div className={`mt-5 rounded-xl border ${estadoBorder} ${estadoBg} p-4 space-y-4`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Activity className={`h-5 w-5 ${estadoColor}`} />
          <div>
            <h2 className="text-lg font-black text-white">Mantenimiento de Nivel</h2>
            <p className="text-xs text-gray-400">
              {nivel === "master" ? "Master — Mínimo: 1 venta cada 15 días" : `${nivel.replace('_', ' ')} — Mínimo: 1 venta cada 15 días`}
            </p>
          </div>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-bold ${estadoBorder} ${estadoBg} ${estadoColor}`}>
          {estadoIcono} {estadoTexto}
        </span>
      </div>

      {/* Barra de actividad (estilo Mercado Libre) */}
      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Actividad requerida: 1 venta cada 15 días</span>
          <span>
            {ultimaVenta
              ? `Última venta: hace ${diasDesdeUltimaVenta} día${diasDesdeUltimaVenta !== 1 ? 's' : ''}`
              : "Sin ventas registradas"}
          </span>
        </div>
        <div className="h-4 w-full rounded-full bg-white/10 overflow-hidden relative">
          <div
            className={`h-full rounded-full transition-all ${
              estaActivo
                ? "bg-gradient-to-r from-[#39FF14] to-green-500"
                : enRiesgoDeBajar
                ? "bg-gradient-to-r from-red-600 to-red-400"
                : "bg-gradient-to-r from-yellow-600 to-yellow-400"
            }`}
            style={{ width: `${progresoActividad}%` }}
          />
          {/* Marcadores de días */}
          <div className="absolute inset-0 flex justify-between px-1">
            {[0, 5, 10, 15].map((dia) => (
              <div key={dia} className="flex flex-col items-center">
                <div className="h-full w-px bg-white/20" />
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-between text-[10px] text-gray-500 mt-1">
          <span>Hoy</span>
          <span>5 días</span>
          <span>10 días</span>
          <span>15 días</span>
        </div>
      </div>

      {/* Información de riesgo */}
      {!estaActivo && (
        <div className="rounded-lg bg-white/5 p-3 space-y-2">
          <p className="text-sm font-bold text-yellow-400">⚠ Atención</p>
          <p className="text-xs text-gray-400">
            No registrás ventas hace <span className="font-bold text-white">{diasDesdeUltimaVenta} días</span>.
            Para mantener tu nivel de {nivel.replace('_', ' ')}, necesitás al menos una venta cada 15 días.
          </p>
          {mesesSinCumplir > 0 && (
            <p className="text-xs text-yellow-400">
              Meses sin cumplir: {mesesSinCumplir}. Si llegás a 2 meses seguidos, vas a bajar de nivel.
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <Link href="/catalogo/promo" className="rounded-lg bg-[#FF5722] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#E64A19]">
              Promocionar mi link
            </Link>
          </div>
        </div>
      )}

      {estaActivo && (
        <div className="rounded-lg bg-white/5 p-3 space-y-1">
          <p className="text-xs text-[#39FF14]">✓ Estás activo. Tu última venta fue hace {diasDesdeUltimaVenta} días.</p>
          <p className="text-xs text-gray-500">
            Para mantener tu nivel actual, asegurate de tener al menos una venta cada 15 días.
          </p>
        </div>
      )}

      {/* Reglas de bajada de nivel */}
      <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 space-y-1">
        <p className="text-xs font-bold text-gray-300">Reglas de mantenimiento</p>
        <ul className="space-y-1 text-[11px] text-gray-400">
          <li>• Mínimo 1 venta cada 15 días para mantener el nivel</li>
          <li>• Se revisa cada 6 meses automáticamente</li>
          <li>• Bajás de nivel solo si no cumplís por 2 meses seguidos</li>
          <li>• Si sos Master y cumplís, te mantenés como Master</li>
        </ul>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        highlight
          ? "border-yellow-500/30 bg-yellow-500/5"
          : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs text-gray-400">{label}</span>
      </div>
      <p className="mt-1 text-lg font-black text-white">{value}</p>
    </div>
  );
}
