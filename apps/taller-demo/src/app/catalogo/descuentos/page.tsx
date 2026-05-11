"use client";

import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Percent,
  Truck,
  UserCircle,
  Gift,
  Store,
  ChevronRight,
  Copy,
  Check,
  ShoppingCart,
  Users,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { useState } from "react";

export default function DescuentosPage() {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const portalVendedor = `https://appjeezpro.store/catalogo/vendedor/login`;

  return (
    <main
      className="min-h-screen pb-20"
      style={{ background: "#020617", color: "#e2e8f0" }}
    >
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 space-y-8">

        {/* ── HEADER ── */}
        <header>
          <button
            onClick={() => router.push("/catalogo")}
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Volver al catálogo
          </button>

          <div className="flex items-center gap-4 mb-1">
            <div
              className="p-3 rounded-xl shadow-lg"
              style={{
                background: "linear-gradient(to bottom right, #eab308, #f97316)",
                boxShadow: "0 8px 24px rgba(249,115,22,0.2)",
              }}
            >
              <Gift className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
                Descuentos y Beneficios
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Conocé todas las ventajas exclusivas para clientes y vendedores asociados de MaqJeez.
              </p>
            </div>
          </div>
        </header>

        {/* ── HERO BANNER ── */}
        <section
          className="relative overflow-hidden rounded-3xl p-6 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6"
          style={{
            background: "linear-gradient(to right, rgba(16,185,129,0.15), #0f172a)",
            border: "1px solid rgba(16,185,129,0.3)",
            boxShadow: "0 0 40px rgba(16,185,129,0.08)",
          }}
        >
          <div
            className="absolute -right-20 -top-20 w-64 h-64 rounded-full pointer-events-none"
            style={{ background: "rgba(74,222,128,0.15)", filter: "blur(80px)" }}
          />

          <div className="relative z-10 w-full md:w-2/3">
            <span
              className="inline-block text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded mb-3"
              style={{ background: "#10b981", color: "#0f172a" }}
            >
              Resumen de Ahorro Máximo
            </span>
            <h2 className="text-3xl md:text-5xl font-black text-white leading-tight mb-3">
              Llevate hasta{" "}
              <span
                className="text-emerald-400"
                style={{ textShadow: "0 0 20px rgba(74,222,128,0.5)" }}
              >
                21% OFF
              </span>
              <br />+ Envío Gratis
            </h2>
            <p className="text-slate-300 text-sm md:text-base flex flex-wrap items-center gap-2">
              <span className="text-emerald-400 font-bold">15% Volumen</span>
              <span className="text-slate-600">+</span>
              <span className="text-emerald-400 font-bold">3% Cliente Reg.</span>
              <span className="text-slate-600">+</span>
              <span className="text-emerald-400 font-bold">3% Link Vendedor</span>
            </p>
          </div>

          <div className="relative z-10 w-full md:w-1/3 flex justify-end">
            <div
              className="p-4 rounded-2xl text-center shadow-2xl w-full max-w-xs"
              style={{
                background: "rgba(15,23,42,0.85)",
                border: "1px solid #334155",
                backdropFilter: "blur(8px)",
                transform: "rotate(2deg)",
              }}
            >
              <p className="text-xs text-slate-400 font-bold uppercase mb-1">Ejemplo de compra</p>
              <p className="text-slate-500 line-through text-lg font-medium">De $150.000</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-white text-sm">Pagás:</span>
                <span className="text-emerald-400 font-black text-3xl">$118.500</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── DOS COLUMNAS ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">

          {/* ═══════════════════════════════════
              COLUMNA IZQUIERDA: COMPRADORES
          ═══════════════════════════════════ */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 pb-4" style={{ borderBottom: "1px solid #1e293b" }}>
              <ShoppingCart className="h-6 w-6 text-blue-400" />
              <h3 className="text-2xl font-bold text-white">Para Compradores</h3>
            </div>

            {/* Descuento por volumen */}
            <div
              className="rounded-2xl p-6"
              style={{
                background: "linear-gradient(145deg, rgba(15,23,42,0.9), rgba(15,23,42,0.4))",
                border: "1px solid rgba(255,255,255,0.05)",
                backdropFilter: "blur(10px)",
              }}
            >
              <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                <span
                  className="p-1.5 rounded-lg"
                  style={{ background: "rgba(59,130,246,0.15)", color: "#60a5fa" }}
                >
                  <Percent className="h-4 w-4" />
                </span>
                Descuento por volumen de compra
              </h4>

              <div
                className="rounded-xl overflow-hidden"
                style={{ background: "rgba(2,6,23,0.5)", border: "1px solid #1e293b" }}
              >
                {[
                  { label: "Más de $100.000", badge: "10% OFF", highlight: false },
                  { label: "Más de $250.000", badge: "15% OFF", highlight: false },
                  { label: "Más de $1.000.000", badge: "20% OFF", highlight: true },
                ].map((row, i, arr) => (
                  <div
                    key={row.label}
                    className="flex justify-between items-center px-4 py-3.5 transition-colors hover:bg-white/[0.02]"
                    style={{
                      borderBottom: i < arr.length - 1 ? "1px solid #1e293b" : undefined,
                      background: row.highlight ? "rgba(59,130,246,0.04)" : undefined,
                    }}
                  >
                    <span className={`text-sm font-medium ${row.highlight ? "text-white font-bold" : "text-slate-300"}`}>
                      {row.label}
                    </span>
                    <span
                      className="px-3 py-1 rounded-md text-sm font-bold"
                      style={
                        row.highlight
                          ? { background: "#3b82f6", color: "#fff", boxShadow: "0 0 14px rgba(59,130,246,0.4)" }
                          : { background: "rgba(59,130,246,0.12)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.3)" }
                      }
                    >
                      {row.badge}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Costos de envío */}
            <div
              className="rounded-2xl p-6"
              style={{
                background: "linear-gradient(145deg, rgba(15,23,42,0.9), rgba(15,23,42,0.4))",
                border: "1px solid rgba(255,255,255,0.05)",
                backdropFilter: "blur(10px)",
              }}
            >
              <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                <span
                  className="p-1.5 rounded-lg"
                  style={{ background: "rgba(100,116,139,0.2)", color: "#cbd5e1" }}
                >
                  <Truck className="h-4 w-4" />
                </span>
                Costos de envío
              </h4>

              <div
                className="rounded-xl overflow-hidden"
                style={{ background: "rgba(2,6,23,0.5)", border: "1px solid #1e293b" }}
              >
                {[
                  { label: "Menos de $30.000", value: "$10.000", free: false },
                  { label: "Menos de $50.000", value: "$8.000", free: false },
                  { label: "Menos de $100.000", value: "$5.000", free: false },
                  { label: "Más de $100.000", value: "¡Gratis!", free: true },
                ].map((row, i, arr) => (
                  <div
                    key={row.label}
                    className="flex justify-between items-center px-4 py-3.5 hover:bg-white/[0.02] transition-colors"
                    style={{
                      borderBottom: i < arr.length - 1 ? "1px solid #1e293b" : undefined,
                      background: row.free ? "rgba(16,185,129,0.06)" : undefined,
                      borderTop: row.free ? "1px solid rgba(16,185,129,0.25)" : undefined,
                    }}
                  >
                    <span className={`text-sm font-medium flex items-center gap-2 ${row.free ? "text-white font-bold" : "text-slate-400"}`}>
                      {row.free && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                      {row.label}
                    </span>
                    <span
                      className={`text-sm font-bold ${row.free ? "text-emerald-400 uppercase tracking-widest" : "text-slate-300 font-mono"}`}
                    >
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Descuentos acumulables */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                className="rounded-2xl p-5 transition-colors hover:border-slate-500"
                style={{ background: "rgba(30,41,59,0.4)", border: "1px solid #334155" }}
              >
                <UserCircle className="h-8 w-8 text-slate-400 mb-2" />
                <h4 className="text-white font-bold text-sm mb-1">Cliente Registrado</h4>
                <p className="text-slate-400 text-xs mb-4">
                  Obtené un <strong className="text-emerald-400">3% OFF adicional</strong> fijo en todo el catálogo.
                </p>
                <button
                  onClick={() => router.push("/catalogo/cliente/login")}
                  className="text-xs font-bold px-3 py-1.5 rounded flex items-center gap-1 transition-colors"
                  style={{ background: "#334155", color: "#fff" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#475569")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#334155")}
                >
                  Registrate <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <div
                className="rounded-2xl p-5 transition-colors hover:border-slate-500"
                style={{ background: "rgba(30,41,59,0.4)", border: "1px solid #334155" }}
              >
                <Store className="h-8 w-8 text-orange-400 mb-2" />
                <h4 className="text-white font-bold text-sm mb-1">Comprá a un Vendedor</h4>
                <p className="text-slate-400 text-xs">
                  Ingresando por el link de un vendedor oficial sumás otro{" "}
                  <strong className="text-emerald-400">3% OFF extra</strong> a tu carrito.
                </p>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════
              COLUMNA DERECHA: VENDEDORES
          ═══════════════════════════════════ */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 pb-4" style={{ borderBottom: "1px solid #1e293b" }}>
              <Users className="h-6 w-6 text-orange-400" />
              <h3 className="text-2xl font-bold text-white">Para Vendedores</h3>
            </div>

            {/* Card principal vendedores */}
            <div
              className="rounded-2xl p-6 relative overflow-hidden"
              style={{
                background: "linear-gradient(145deg, rgba(15,23,42,0.9), rgba(15,23,42,0.4))",
                border: "1px solid rgba(249,115,22,0.3)",
                boxShadow: "0 0 30px rgba(249,115,22,0.05)",
                backdropFilter: "blur(10px)",
              }}
            >
              <div
                className="absolute -right-10 -top-10 w-40 h-40 rounded-full pointer-events-none"
                style={{ background: "rgba(249,115,22,0.08)", filter: "blur(50px)" }}
              />

              {/* Encabezado */}
              <div className="flex items-start gap-4 mb-6 relative z-10">
                <div
                  className="p-3 rounded-xl shrink-0"
                  style={{
                    background: "linear-gradient(to bottom right, #f97316, #dc2626)",
                    boxShadow: "0 8px 20px rgba(249,115,22,0.2)",
                  }}
                >
                  <Percent className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-white">10% de comisión pura</h4>
                  <p className="text-slate-400 text-sm mt-1">
                    Ganás el 10% del total de cada pedido exitoso que realicen tus referidos.
                  </p>
                </div>
              </div>

              {/* Timeline */}
              <div
                className="rounded-xl p-5 mb-6 relative z-10"
                style={{ background: "rgba(2,6,23,0.8)", border: "1px solid #1e293b" }}
              >
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-4">
                  ¿Cómo funciona?
                </p>
                <div className="space-y-4">
                  {[
                    { n: "1", text: <>Te <strong className="text-white">registrás</strong> gratis como vendedor oficial.</> },
                    { n: "2", text: <>Compartís tu <strong className="text-orange-400">Link Único</strong> en redes o WhatsApp.</> },
                    { n: "3", text: <>Tus clientes compran con descuento (gracias a vos).</> },
                    { n: "4", text: <>Vos cobrás tu <strong className="text-emerald-400">10% de comisión</strong>.</>, highlight: true },
                  ].map((step, i, arr) => (
                    <div key={step.n} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                          style={
                            step.highlight
                              ? { background: "#f97316", boxShadow: "0 0 10px rgba(249,115,22,0.5)" }
                              : { background: "#1e293b", border: "1px solid #475569" }
                          }
                        >
                          {step.n}
                        </div>
                        {i < arr.length - 1 && (
                          <div className="w-px flex-1 my-1" style={{ background: "#1e293b" }} />
                        )}
                      </div>
                      <p className={`text-sm pb-2 ${step.highlight ? "text-white font-medium" : "text-slate-300"}`}>
                        {step.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Input portal */}
              <div className="relative z-10 mb-4">
                <label className="block text-xs text-slate-500 mb-1 ml-1">Portal de vendedores</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    readOnly
                    value={portalVendedor}
                    className="w-full text-xs rounded-lg p-3 font-mono outline-none"
                    style={{ background: "#0f172a", border: "1px solid #334155", color: "#94a3b8" }}
                  />
                  <button
                    onClick={() => copyToClipboard(portalVendedor)}
                    className="shrink-0 font-bold py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
                    style={{ background: "#334155", color: "#fff" }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#475569")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#334155")}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={() => router.push("/catalogo/vendedor/login")}
                className="w-full relative z-10 font-black py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
                style={{
                  background: "#4ade80",
                  color: "#0f172a",
                  boxShadow: "0 0 20px rgba(74,222,128,0.3)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "#86efac";
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "#4ade80";
                  (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                }}
              >
                ¡Quiero ser vendedor oficial! <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* Disclaimer */}
            <div
              className="rounded-xl p-4"
              style={{ background: "rgba(120,53,15,0.2)", border: "1px solid rgba(120,53,15,0.5)" }}
            >
              <h5 className="text-amber-500 font-bold text-xs uppercase flex items-center gap-1.5 mb-2">
                <AlertTriangle className="h-4 w-4" /> Reglas de seguridad
              </h5>
              <ul className="list-disc list-inside text-xs text-slate-400 space-y-1.5 ml-1">
                <li>No podés ser vendedor con un email ya registrado como cliente.</li>
                <li>El DNI/CUIT debe ser único y verificable por cuenta.</li>
                <li>Las comisiones se acreditan automáticamente una vez confirmado el pago del pedido.</li>
              </ul>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
