"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useClienteAuth } from "@/components/cliente/ClienteAuthContext";
import {
  ArrowLeft, User, Mail, Phone, Lock, Loader2,
  Eye, EyeOff, Wrench, Tag, Clock, Store, ChevronRight,
  ShoppingBag, TrendingUp,
} from "lucide-react";

export default function ClienteLoginPage() {
  const router = useRouter();
  const { login, register } = useClienteAuth();
  const [tab, setTab] = useState<"login" | "register">("register");
  const [roleStep, setRoleStep] = useState<null | "comprador" | "vendedor">(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [dni, setDni] = useState("");
  const [password, setPassword] = useState("");
  const [vendedores, setVendedores] = useState<{ id: string; nombre: string; codigo_referido: string }[]>([]);
  const [vendedorSeleccionado, setVendedorSeleccionado] = useState("");

  const [refInfo, setRefInfo] = useState<{ codigo: string; nombre: string; vendedor_id: string } | null>(null);

  useEffect(() => {
    const codigo = localStorage.getItem("ref_codigo");
    const refNombre = localStorage.getItem("ref_nombre");
    const vendedor_id = localStorage.getItem("ref_vendedor_id");
    if (codigo && refNombre && vendedor_id) {
      setRefInfo({ codigo, nombre: refNombre, vendedor_id });
      setVendedorSeleccionado(vendedor_id);
    }
    // Cargar lista de vendedores activos
    fetch("/api/vendedor/public?lista=1")
      .then((r) => r.json())
      .then((data) => {
        if (data.vendedores) setVendedores(data.vendedores);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (tab === "login") {
        await login(email, password);
      } else {
        await register({
          nombre,
          email,
          telefono,
          dni,
          password,
          vendedor_referente_id: vendedorSeleccionado || refInfo?.vendedor_id || undefined,
        });
      }
      router.push("/catalogo");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (t: "login" | "register") => {
    setTab(t);
    setError("");
  };

  return (
    <div
      className="min-h-screen flex flex-col lg:flex-row relative overflow-x-hidden"
      style={{ background: "#020617", color: "#e2e8f0" }}
    >
      {/* ── ORBES ANIMADOS DE FONDO ── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div
          className="absolute rounded-full"
          style={{
            top: "10%", left: "20%", width: 380, height: 380,
            background: "rgba(249,115,22,0.18)",
            filter: "blur(120px)",
            animation: "blob 7s infinite",
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            top: "20%", right: "20%", width: 380, height: 380,
            background: "rgba(59,130,246,0.15)",
            filter: "blur(120px)",
            animation: "blob 7s infinite 2s",
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            bottom: "-10%", left: "40%", width: 380, height: 380,
            background: "rgba(16,185,129,0.15)",
            filter: "blur(120px)",
            animation: "blob 7s infinite 4s",
          }}
        />
        <style>{`
          @keyframes blob {
            0%   { transform: translate(0px, 0px) scale(1); }
            33%  { transform: translate(30px, -50px) scale(1.1); }
            66%  { transform: translate(-20px, 20px) scale(0.9); }
            100% { transform: translate(0px, 0px) scale(1); }
          }
        `}</style>
      </div>

      {/* ══════════════════════════════════
          COLUMNA IZQUIERDA (solo desktop)
      ══════════════════════════════════ */}
      <div
        className="hidden lg:flex lg:w-5/12 xl:w-1/2 relative flex-col justify-between p-12 overflow-hidden z-10"
        style={{
          background: "rgba(2,6,23,0.5)",
          backdropFilter: "blur(8px)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="relative z-10">
          <Link
            href="/catalogo"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-semibold mb-12"
          >
            <ArrowLeft className="h-4 w-4" /> Volver al catálogo
          </Link>

          <div className="flex items-center gap-3 mb-8">
            <div
              className="p-3 rounded-xl"
              style={{
                background: "linear-gradient(to bottom right, #f97316, #dc2626)",
                boxShadow: "0 8px 20px rgba(249,115,22,0.2)",
              }}
            >
              <Wrench className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter">
              MAQ<span style={{ color: "#f97316" }}>JEEZ</span>
            </h1>
          </div>

          <h2 className="text-3xl xl:text-4xl font-bold text-white leading-tight mb-4">
            El motor de tu negocio no puede detenerse.
          </h2>
          <p className="text-slate-300 text-lg max-w-md">
            Accedé al catálogo de repuestos para moto-implementos más completo, con precios exclusivos para profesionales.
          </p>
        </div>

        <div className="relative z-10 space-y-4">
          {[
            {
              icon: <Tag className="h-5 w-5 text-emerald-400" />,
              bg: "rgba(16,185,129,0.15)",
              border: "rgba(16,185,129,0.25)",
              title: "3% de Descuento Fijo",
              desc: "Al registrar tu cuenta, obtenés automáticamente un 3% OFF en todas tus compras del catálogo.",
            },
            {
              icon: <Clock className="h-5 w-5 text-blue-400" />,
              bg: "rgba(59,130,246,0.15)",
              border: "rgba(59,130,246,0.25)",
              title: "Historial de Pedidos",
              desc: "Guardá tus repuestos frecuentes, repetí órdenes con un clic y descargá tus comprobantes fácilmente.",
            },
          ].map((b) => (
            <div
              key={b.title}
              className="flex items-start gap-4 p-5 rounded-2xl transition-colors"
              style={{
                background: "rgba(15,23,42,0.5)",
                border: "1px solid rgba(255,255,255,0.07)",
                backdropFilter: "blur(8px)",
              }}
            >
              <div className="p-2.5 rounded-lg shrink-0" style={{ background: b.bg, border: `1px solid ${b.border}` }}>
                {b.icon}
              </div>
              <div>
                <h3 className="text-white font-bold mb-1">{b.title}</h3>
                <p className="text-slate-400 text-sm">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="relative z-10 text-xs text-slate-500 font-medium">
          &copy; 2026 MaqJeez. Todos los derechos reservados.<br />
          Carlos Spegazzini, Buenos Aires, Argentina.
        </div>
      </div>

      {/* ══════════════════════════════════
          COLUMNA DERECHA: FORMULARIO
      ══════════════════════════════════ */}
      <div className="w-full lg:w-7/12 xl:w-1/2 flex items-center justify-center p-4 sm:p-12 relative z-10 py-10">
        <div className="w-full max-w-[440px]">

          {/* Badge seguridad + back mobile */}
          <div className="mb-6 flex justify-between items-center">
            <Link
              href="/catalogo"
              className="lg:hidden inline-flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Catálogo
            </Link>
            <div className="hidden lg:block" />
            <div
              className="flex items-center gap-1.5 text-xs text-slate-500 px-2.5 py-1 rounded-full"
              style={{ background: "rgba(15,23,42,0.6)", border: "1px solid #1e293b", backdropFilter: "blur(8px)" }}
            >
              <Lock className="h-3 w-3" /> Seguro
            </div>
          </div>

          {/* TARJETA GLASSMORPHISM */}
          <div
            className="rounded-[2rem] p-8 md:p-10 relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(15,23,42,0.75) 0%, rgba(15,23,42,0.35) 100%)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              borderTop: "1px solid rgba(255,255,255,0.14)",
              borderLeft: "1px solid rgba(255,255,255,0.1)",
              borderRight: "1px solid rgba(255,255,255,0.05)",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.7)",
            }}
          >
            {/* Brillo superior interno */}
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px pointer-events-none"
              style={{ background: "linear-gradient(to right, transparent, rgba(255,255,255,0.18), transparent)" }}
            />

            {/* Título */}
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{
                    background: "linear-gradient(to bottom right, #f97316, #dc2626)",
                    boxShadow: "0 8px 20px rgba(249,115,22,0.3)",
                  }}
                >
                  <Wrench className="h-6 w-6 text-white" />
                </div>
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight mb-2">
                {tab === "login" ? "Bienvenido de nuevo" : "Crear cuenta"}
              </h1>
              <p className="text-sm text-slate-400 leading-relaxed">
                {tab === "login"
                  ? "Ingresá a tu cuenta para continuar."
                  : <>Registrate y obtené un <strong className="text-emerald-400">3% de descuento</strong> fijo en todas tus compras.</>}
              </p>
            </div>

            {/* ── SELECTOR DE ROL (solo al registrarse, antes del form) ── */}
            {tab === "register" && roleStep === null && (
              <div className="space-y-3 mb-6">
                <p className="text-center text-sm font-bold text-white mb-4">
                  ¿Cómo querés usar MaqJeez?
                  <span className="block text-xs font-normal text-slate-400 mt-1">Este es el primer paso — elegí tu rol</span>
                </p>

                {/* Comprador */}
                <button
                  type="button"
                  onClick={() => setRoleStep("comprador")}
                  className="w-full flex items-center gap-4 rounded-2xl p-4 text-left transition-all hover:scale-[1.01]"
                  style={{
                    background: "linear-gradient(135deg, rgba(249,115,22,0.12), rgba(249,115,22,0.06))",
                    border: "2px solid rgba(249,115,22,0.5)",
                  }}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "rgba(249,115,22,0.2)", border: "1px solid rgba(249,115,22,0.4)" }}>
                    <ShoppingBag className="h-6 w-6 text-orange-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-white text-base">SOY COMPRADOR</p>
                    <p className="text-xs text-slate-400 mt-0.5">Quiero comprar repuestos y accesorios con descuentos exclusivos</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(249,115,22,0.15)", color: "#fb923c", border: "1px solid rgba(249,115,22,0.3)" }}>3% OFF siempre</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(249,115,22,0.15)", color: "#fb923c", border: "1px solid rgba(249,115,22,0.3)" }}>Historial de pedidos</span>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-orange-400 shrink-0" />
                </button>

                {/* Vendedor */}
                <button
                  type="button"
                  onClick={() => router.push("/catalogo/vendedor/login")}
                  className="w-full flex items-center gap-4 rounded-2xl p-4 text-left transition-all hover:scale-[1.01]"
                  style={{
                    background: "linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.06))",
                    border: "2px solid rgba(16,185,129,0.4)",
                  }}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "rgba(16,185,129,0.2)", border: "1px solid rgba(16,185,129,0.4)" }}>
                    <TrendingUp className="h-6 w-6 text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-white text-base">SOY VENDEDOR</p>
                    <p className="text-xs text-slate-400 mt-0.5">Quiero vender y ganar comisiones por cada pedido que genere</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(16,185,129,0.15)", color: "#34d399", border: "1px solid rgba(16,185,129,0.3)" }}>Comisiones 10-15%</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(16,185,129,0.15)", color: "#34d399", border: "1px solid rgba(16,185,129,0.3)" }}>Panel de ventas</span>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-emerald-400 shrink-0" />
                </button>

                <p className="text-center text-xs text-slate-500 pt-1">
                  ¿Ya tenés cuenta?{" "}
                  <button type="button" onClick={() => switchTab("login")} className="text-orange-400 font-bold hover:underline">
                    Iniciá sesión
                  </button>
                </p>
              </div>
            )}

            {/* Toggle animado (solo si ya eligió rol o está en login) */}
            {(tab === "login" || roleStep === "comprador") && (
              <>
              {tab === "register" && roleStep === "comprador" && (
                <button type="button" onClick={() => setRoleStep(null)}
                  className="mb-4 flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors">
                  <ArrowLeft className="h-3.5 w-3.5" /> Cambiar rol
                </button>
              )}
            </>
            )}

            {/* Toggle animado */}
            {(tab === "login" || roleStep === "comprador") && (<>
            <div
              className="p-1.5 rounded-xl flex mb-8 relative"
              style={{
                background: "rgba(2,6,23,0.6)",
                border: "1px solid rgba(30,41,59,0.8)",
                backdropFilter: "blur(8px)",
              }}
            >
              <div
                className="absolute top-1.5 bottom-1.5 rounded-lg transition-all duration-300 ease-out"
                style={{
                  width: "calc(50% - 6px)",
                  background: "#1e293b",
                  border: "1px solid rgba(100,116,139,0.4)",
                  left: tab === "login" ? "6px" : "calc(50%)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
                }}
              />
              <button
                type="button"
                onClick={() => switchTab("login")}
                className="w-1/2 py-2 text-sm font-bold relative z-10 transition-colors"
                style={{ color: tab === "login" ? "#fff" : "#94a3b8" }}
              >
                Ingresar
              </button>
              <button
                type="button"
                onClick={() => switchTab("register")}
                className="w-1/2 py-2 text-sm font-bold relative z-10 transition-colors"
                style={{ color: tab === "register" ? "#fff" : "#94a3b8" }}
              >
                Registrarse
              </button>
            </div>

            {/* Error */}
            {error && (
              <p
                className="mb-4 px-3 py-2 rounded-lg text-sm text-red-400"
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}
              >
                {error}
              </p>
            )}

            {/* FORMULARIO */}
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Nombre (solo register) */}
              <div
                className="overflow-hidden transition-all duration-300"
                style={{ maxHeight: tab === "register" ? "80px" : "0", opacity: tab === "register" ? 1 : 0 }}
              >
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-orange-400 transition-colors" />
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    required={tab === "register"}
                    placeholder="Nombre completo"
                    className="w-full py-3.5 pl-12 pr-4 text-sm text-white placeholder-slate-500 rounded-xl outline-none transition-all"
                    style={{
                      background: "rgba(2,6,23,0.5)",
                      border: "1px solid rgba(71,85,105,0.5)",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#f97316")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(71,85,105,0.5)")}
                  />
                </div>
              </div>

              {/* Email */}
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-orange-400 transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Correo electrónico"
                  className="w-full py-3.5 pl-12 pr-4 text-sm text-white placeholder-slate-500 rounded-xl outline-none transition-all"
                  style={{ background: "rgba(2,6,23,0.5)", border: "1px solid rgba(71,85,105,0.5)" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#f97316")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(71,85,105,0.5)")}
                />
              </div>

              {/* Teléfono (solo register) */}
              <div
                className="overflow-hidden transition-all duration-300"
                style={{ maxHeight: tab === "register" ? "80px" : "0", opacity: tab === "register" ? 1 : 0 }}
              >
                <div className="relative group">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-orange-400 transition-colors" />
                  <input
                    type="tel"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="Teléfono (Opcional)"
                    className="w-full py-3.5 pl-12 pr-4 text-sm text-white placeholder-slate-500 rounded-xl outline-none transition-all"
                    style={{ background: "rgba(2,6,23,0.5)", border: "1px solid rgba(71,85,105,0.5)" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#f97316")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(71,85,105,0.5)")}
                  />
                </div>
              </div>

              {/* DNI (solo register) */}
              <div
                className="overflow-hidden transition-all duration-300"
                style={{ maxHeight: tab === "register" ? "80px" : "0", opacity: tab === "register" ? 1 : 0 }}
              >
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-orange-400 transition-colors" />
                  <input
                    type="text"
                    value={dni}
                    onChange={(e) => setDni(e.target.value)}
                    placeholder="DNI (Opcional)"
                    className="w-full py-3.5 pl-12 pr-4 text-sm text-white placeholder-slate-500 rounded-xl outline-none transition-all"
                    style={{ background: "rgba(2,6,23,0.5)", border: "1px solid rgba(71,85,105,0.5)" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#f97316")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(71,85,105,0.5)")}
                  />
                </div>
              </div>

              {/* Selector de vendedor (solo register) */}
              <div
                className="overflow-hidden transition-all duration-300"
                style={{ maxHeight: tab === "register" ? "80px" : "0", opacity: tab === "register" ? 1 : 0 }}
              >
                <div className="relative">
                  <Store className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <select
                    value={vendedorSeleccionado}
                    onChange={(e) => setVendedorSeleccionado(e.target.value)}
                    className="w-full py-3.5 pl-12 pr-4 text-sm text-white rounded-xl outline-none transition-all appearance-none"
                    style={{ background: "rgba(2,6,23,0.5)", border: "1px solid rgba(71,85,105,0.5)" }}
                  >
                    <option value="" className="bg-slate-900 text-slate-400">Elegir un vendedor (opcional)</option>
                    {vendedores.map((v) => (
                      <option key={v.id} value={v.id} className="bg-slate-900">
                        {v.nombre} ({v.codigo_referido})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Contraseña */}
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-orange-400 transition-colors" />
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Contraseña"
                  className="w-full py-3.5 pl-12 pr-12 text-sm text-white placeholder-slate-500 rounded-xl outline-none transition-all"
                  style={{ background: "rgba(2,6,23,0.5)", border: "1px solid rgba(71,85,105,0.5)" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#f97316")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(71,85,105,0.5)")}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Olvidé contraseña (solo login) */}
              {tab === "login" && (
                <div className="text-right -mt-1">
                  <button type="button" className="text-xs font-semibold transition-colors" style={{ color: "#f97316" }}>
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
              )}

              {/* Botón submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full font-bold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
                style={{
                  background: "linear-gradient(to right, #f97316, #fb923c)",
                  color: "#fff",
                  boxShadow: "0 10px 20px -10px rgba(249,115,22,0.5)",
                  border: "1px solid rgba(251,146,60,0.4)",
                }}
                onMouseEnter={(e) => !loading && ((e.currentTarget as HTMLElement).style.transform = "translateY(-1px)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.transform = "translateY(0)")}
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> {tab === "login" ? "Ingresando…" : "Registrando…"}</>
                ) : (
                  <>{tab === "login" ? "Ingresar" : "Registrarse"} <ChevronRight className="h-4 w-4" /></>
                )}
              </button>
            </form>

            {/* Separador */}
            <div className="mt-8 relative flex items-center justify-center">
              <div className="absolute w-full border-t" style={{ borderColor: "rgba(71,85,105,0.4)" }} />
              <div className="relative px-3 text-xs font-medium text-slate-500" style={{ background: "transparent" }}>
                O continuar con
              </div>
            </div>

            {/* Google */}
            <button
              type="button"
              className="mt-6 w-full font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-3 text-slate-300"
              style={{ background: "rgba(15,23,42,0.5)", border: "1px solid rgba(71,85,105,0.5)" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(30,41,59,0.8)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(15,23,42,0.5)")}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google
            </button>

            {/* Banner referido (solo register) */}
            {tab === "register" && refInfo && (
              <div
                className="mt-6 px-4 py-3 rounded-xl text-center"
                style={{
                  background: "rgba(16,185,129,0.06)",
                  border: "1px solid rgba(16,185,129,0.25)",
                }}
              >
                <p className="text-xs text-slate-400 flex items-center justify-center gap-1.5">
                  <Store className="h-3.5 w-3.5 text-orange-400" />
                  Comprando mediante:{" "}
                  <strong className="text-white font-mono tracking-wider">{refInfo.codigo}</strong>
                  {" "}({refInfo.nombre})
                </p>
              </div>
            )}

            {tab === "register" && !refInfo && (
              <div
                className="mt-6 px-4 py-2.5 rounded-xl text-center"
                style={{ background: "rgba(15,23,42,0.4)", border: "1px solid rgba(30,41,59,0.8)" }}
              >
                <p className="text-xs text-slate-500 flex items-center justify-center gap-1.5">
                  <Lock className="h-3 w-3" /> Registro seguro y sin spam
                </p>
              </div>
            )}
            </>)}

          </div>
        </div>
      </div>
    </div>
  );
}
