"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Wrench, Package, ShoppingCart, Truck,
  BarChart2, Users, ArrowRight, Zap, Shield, Smartphone,
} from "lucide-react";

const FEATURES = [
  {
    href: "/taller",
    icon: Wrench,
    color: "#FF5722",
    glow: "rgba(255,87,34,0.30)",
    border: "rgba(255,87,34,0.45)",
    title: "Taller",
    desc: "Gestión completa de órdenes de trabajo. Registrá equipos, seguí el estado de reparaciones y alertas de retiro.",
    tags: ["Órdenes activas", "Historial", "Alertas 90 días"],
  },
  {
    href: "/inventario",
    icon: Package,
    color: "#FDB71A",
    glow: "rgba(253,183,26,0.25)",
    border: "rgba(253,183,26,0.45)",
    title: "Inventario",
    desc: "Control de stock de repuestos en tiempo real. Alertas de stock bajo y pedidos pendientes automáticos.",
    tags: ["Stock bajo", "Pedidos", "Categorías"],
  },
  {
    href: "/ventas",
    icon: ShoppingCart,
    color: "#39FF14",
    glow: "rgba(57,255,20,0.22)",
    border: "rgba(57,255,20,0.45)",
    title: "Vender",
    desc: "Registrá ventas con múltiples productos, elegí método de pago y consultá los movimientos del día.",
    tags: ["Multi-producto", "5 métodos de pago", "Movimientos diarios"],
  },
  {
    href: "/flex",
    icon: Truck,
    color: "#00E5FF",
    glow: "rgba(0,229,255,0.22)",
    border: "rgba(0,229,255,0.45)",
    title: "Flex Logística",
    desc: "Escáner OCR + QR para cargar envíos de Mercado Libre. Detección automática de zona y precio por CP.",
    tags: ["OCR / QR", "Zonas automáticas", "Anti-duplicados"],
  },
  {
    href: "/estadisticas",
    icon: BarChart2,
    color: "#A855F7",
    glow: "rgba(168,85,247,0.22)",
    border: "rgba(168,85,247,0.45)",
    title: "Estadísticas",
    desc: "Dashboard con métricas de ventas, facturación, motores más reparados y rendimiento del taller.",
    tags: ["Gráficos", "Filtros por fecha", "Exportar Excel/PDF"],
  },
  {
    href: "/agenda",
    icon: Users,
    color: "#F59E0B",
    glow: "rgba(245,158,11,0.22)",
    border: "rgba(245,158,11,0.45)",
    title: "Agenda",
    desc: "Ficha de clientes con historial de reparaciones y compras. Identificá a tus mejores clientes.",
    tags: ["Historial", "Clientes frecuentes", "WhatsApp"],
  },
];

const HIGHLIGHTS = [
  { icon: Smartphone, text: "100% optimizada para celular" },
  { icon: Zap,        text: "Datos en tiempo real con Supabase" },
  { icon: Shield,     text: "Anti-duplicados y validación OCR" },
];

export default function LandingPage() {
  return (
    <div
      className="min-h-screen"
      style={{ background: "linear-gradient(160deg, #0a0a0a 0%, #121212 50%, #0f1a2e 100%)" }}
    >
      {/* ── Hero ── */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 pt-16 pb-12 overflow-hidden">
        {/* Glow de fondo */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-[120px] opacity-20 pointer-events-none"
          style={{ background: "radial-gradient(ellipse, #FDB71A 0%, transparent 70%)" }}
        />

        {/* Logo */}
        <div className="relative z-10 mb-6">
          <Image
            src="/logo-maqjeez.png"
            alt="MAQJEEZ"
            width={200}
            height={68}
            className="object-contain mx-auto"
            priority
          />
        </div>

        <h1 className="relative z-10 text-3xl sm:text-5xl font-black text-white leading-tight mb-3">
          Tu taller,{" "}
          <span style={{ color: "#FDB71A", textShadow: "0 0 30px rgba(253,183,26,0.60)" }}>
            en un solo lugar
          </span>
        </h1>
        <p className="relative z-10 text-gray-400 text-base sm:text-lg max-w-xl mb-8">
          Sistema integral de gestión para talleres de motoherramientas. Órdenes, inventario, ventas y logística Flex — todo conectado a Supabase.
        </p>

        {/* CTA principal */}
        <Link
          href="/taller"
          className="relative z-10 group inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-lg text-white transition-all"
          style={{
            background: "#FF5722",
            boxShadow: "0 0 30px rgba(255,87,34,0.50), 0 4px 24px rgba(0,0,0,0.40)",
          }}
        >
          <Wrench className="w-6 h-6" />
          Ingresar al Taller
          <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
        </Link>

        {/* Highlights */}
        <div className="relative z-10 flex flex-wrap justify-center gap-4 mt-8">
          {HIGHLIGHTS.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2 text-sm text-gray-500">
              <Icon className="w-4 h-4 text-[#FDB71A]" />
              {text}
            </div>
          ))}
        </div>
      </section>

      {/* ── Feature Cards ── */}
      <section className="px-4 pb-16 max-w-4xl mx-auto">
        <h2 className="text-center text-xl font-bold text-gray-400 mb-6 uppercase tracking-widest text-sm">
          Módulos del sistema
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(({ href, icon: Icon, color, glow, border, title, desc, tags }) => (
            <Link
              key={href}
              href={href}
              className="group relative flex flex-col p-5 rounded-2xl transition-all duration-200 hover:-translate-y-1"
              style={{
                background: "rgba(31,31,31,0.85)",
                backdropFilter: "blur(12px)",
                border: `1px solid ${border}`,
                boxShadow: `0 0 20px ${glow}`,
              }}
            >
              {/* Glow hover */}
              <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{ background: `radial-gradient(ellipse at top left, ${glow} 0%, transparent 60%)` }}
              />

              <div className="relative z-10">
                {/* Ícono */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: color + "20", border: `1px solid ${border}` }}
                >
                  <Icon className="w-6 h-6" style={{ color }} />
                </div>

                {/* Título */}
                <h3 className="text-lg font-black text-white mb-2">{title}</h3>

                {/* Descripción */}
                <p className="text-sm text-gray-400 leading-relaxed mb-4">{desc}</p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {tags.map(tag => (
                    <span
                      key={tag}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: color + "15",
                        border: `1px solid ${color}40`,
                        color,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Flecha */}
                <div className="flex items-center gap-1 mt-4 text-xs font-semibold" style={{ color }}>
                  Abrir módulo
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 py-6 text-center">
        <p className="text-gray-700 text-xs">
          MAQJEEZ Repuestos · Sistema de Gestión v2.0 · 2026
        </p>
      </footer>
    </div>
  );
}
