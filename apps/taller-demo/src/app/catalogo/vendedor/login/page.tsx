"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useVendedorAuth } from "@/components/vendedor/VendedorAuthContext";
import {
  ArrowLeft, Eye, EyeOff, ChevronRight, Lock, Loader2,
  User, Mail, Phone, Store, ShoppingBag, TrendingUp,
} from "lucide-react";
import ForgotPasswordModal from "@/components/auth/ForgotPasswordModal";

function useCounter(target: number, duration: number, delay: number) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => {
      let start: number | null = null;
      const step = (ts: number) => {
        if (!start) start = ts;
        const p = Math.min((ts - start) / duration, 1);
        const ease = 1 - Math.pow(2, -10 * p);
        setVal(Math.floor(ease * target));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, delay);
    return () => clearTimeout(t);
  }, [target, duration, delay]);
  return val;
}

const TICKER_ITEMS = [
  "⚡ Taller Gómez ahorró $120.000 en su última compra",
  "💸 Juan M. acaba de generar $45.500 en comisiones",
  "🚀 Valeria R. alcanzó el nivel Socio Platino",
  "🔥 Nuevo lote de repuestos con 15% OFF extra",
  "💸 Comisiones pagadas hoy: +$245.000",
  "⚡ Carlos desde Córdoba retiró sus comisiones",
];

export default function VendedorLoginPage() {
  const router = useRouter();
  const { login, register } = useVendedorAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [roleStep, setRoleStep] = useState<null | "vendedor">(null);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  const comisiones = useCounter(1845300, 3000, 600);
  const vendedores = useCounter(214, 2000, 400);

  useEffect(() => {
    const t = setTimeout(() => setShowToast(true), 4000);
    const t2 = setTimeout(() => setShowToast(false), 8500);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, []);

  const [form, setForm] = useState({
    nombre: "", email: "", telefono: "", dni_cuit: "", password: "", confirmPassword: "",
  });

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const switchTab = (reg: boolean) => { setIsRegister(reg); setError(""); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    if (isRegister) {
      if (!form.nombre || !form.email || !form.password) {
        setError("Completá todos los campos obligatorios");
        setLoading(false); return;
      }
      if (form.password !== form.confirmPassword) {
        setError("Las contraseñas no coinciden");
        setLoading(false); return;
      }
      const res = await register({ nombre: form.nombre, email: form.email, telefono: form.telefono, dni_cuit: form.dni_cuit, password: form.password });
      if (res.error) { setError(res.error); setLoading(false); return; }
      const loginRes = await login(form.email, form.password);
      if (loginRes.error) { setError(loginRes.error); setLoading(false); return; }
      router.push("/catalogo/vendedor/dashboard");
    } else {
      const res = await login(form.email, form.password);
      if (res.error) { setError(res.error); setLoading(false); return; }
      router.push("/catalogo/vendedor/dashboard");
    }
  };

  const inputCls = "w-full py-3.5 pl-12 pr-4 text-sm text-white placeholder-slate-500 rounded-xl outline-none transition-colors";
  const inputStyle = { background: "rgba(5,10,25,0.8)", border: "1px solid rgba(71,85,105,0.4)" };
  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => (e.currentTarget.style.borderColor = "#10b981");
  const onBlur  = (e: React.FocusEvent<HTMLInputElement>) => (e.currentTarget.style.borderColor = "rgba(71,85,105,0.4)");

  return (
    <div className="min-h-screen flex flex-col relative" style={{ background: "#030305", color: "#fff" }}>
      <style>{`
        @keyframes blob{0%{transform:translate(0,0) scale(1)}33%{transform:translate(30px,-50px) scale(1.1)}66%{transform:translate(-20px,20px) scale(0.9)}100%{transform:translate(0,0) scale(1)}}
        @keyframes marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        @keyframes fadeUp{0%{opacity:0;transform:translateY(20px)}100%{opacity:1;transform:translateY(0)}}
        @keyframes slideUp{0%{opacity:0;transform:translateY(16px)}100%{opacity:1;transform:translateY(0)}}
        @keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
        .anim-fade-up{animation:fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) forwards}
        .anim-slide-up{animation:slideUp 0.5s cubic-bezier(0.16,1,0.3,1) forwards}
        .shimmer-btn:hover .shimmer-layer{animation:shimmer 0.8s ease forwards}
        @media(max-width:1023px){.orb-dsk{display:none!important}}
        @media(prefers-reduced-motion:reduce){.orb-dsk,.ticker-inner{animation:none!important}}
        .role-card{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);transition:all 0.3s cubic-bezier(0.16,1,0.3,1)}
        .role-card.sel-green{background:linear-gradient(135deg,rgba(0,255,102,0.06),transparent);border-color:#00FF66;box-shadow:0 0 0 1px #00FF66,0 10px 30px -10px rgba(0,255,102,0.15)}
        .role-card.sel-orange{background:linear-gradient(135deg,rgba(255,94,58,0.06),transparent);border-color:#FF5E3A;box-shadow:0 0 0 1px #FF5E3A,0 10px 30px -10px rgba(255,94,58,0.15)}
        .login-card{background:rgba(10,11,16,0.6);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.06);box-shadow:0 25px 50px -12px rgba(0,0,0,0.8),inset 0 1px 0 rgba(255,255,255,0.05)}
      `}</style>

      {/* Mesh bg */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{ background: "radial-gradient(at 0% 0%, rgba(0,255,102,0.06) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(249,115,22,0.04) 0px, transparent 50%)" }} />

      {/* Orbes solo desktop */}
      <div className="orb-dsk fixed top-0 left-1/4 w-80 h-80 rounded-full pointer-events-none" style={{ background: "rgba(0,255,102,0.08)", filter: "blur(80px)", animation: "blob 10s infinite", mixBlendMode: "screen" }} />
      <div className="orb-dsk fixed bottom-0 right-1/4 w-80 h-80 rounded-full pointer-events-none" style={{ background: "rgba(249,115,22,0.07)", filter: "blur(80px)", animation: "blob 10s infinite 2s", mixBlendMode: "screen" }} />

      {/* ── TICKER ── */}
      <div className="relative z-50 overflow-hidden border-b" style={{ background: "#00FF66", borderColor: "rgba(0,255,102,0.4)", boxShadow: "0 0 20px rgba(0,255,102,0.2)" }}>
        <div className="ticker-inner flex whitespace-nowrap py-1.5" style={{ animation: "marquee 30s linear infinite" }}>
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={i} className="inline-flex items-center px-6 text-[11px] sm:text-xs font-black text-black uppercase tracking-wide gap-2">
              {item} <span className="w-1 h-1 rounded-full bg-black/30 inline-block" />
            </span>
          ))}
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="flex-1 flex flex-col lg:flex-row relative z-10">

        {/* ══ LEFT: stats ══ */}
        <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 flex-col justify-center p-12 xl:p-20 border-r" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="max-w-xl opacity-0 anim-fade-up" style={{ animationDelay: "0.1s" }}>

            {/* Live badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-8" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "#00FF66" }} />
                <span className="relative inline-flex rounded-full h-3 w-3" style={{ background: "#00FF66" }} />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-300">Red de mayor crecimiento en LATAM</span>
            </div>

            <h1 className="text-5xl xl:text-7xl font-black leading-[1.1] mb-5 tracking-tight">
              El futuro del<br />
              <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(to right, #fff, #e5e7eb, #9ca3af)" }}>comercio B2B.</span>
            </h1>
            <p className="text-gray-400 text-lg leading-relaxed mb-10 font-medium">
              Comparte tu enlace y <strong className="text-white">monetizá tus contactos</strong>. Los números hablan por sí solos.
            </p>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl relative overflow-hidden group" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="absolute inset-0 transition-opacity duration-500 opacity-0 group-hover:opacity-100" style={{ background: "rgba(0,255,102,0.04)" }} />
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: "#00FF66", boxShadow: "0 0 8px #00FF66" }} />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Vendedores</p>
                </div>
                <p className="text-2xl sm:text-3xl font-black">{vendedores.toLocaleString("es-AR")}</p>
                <p className="text-xs font-semibold mt-1 flex items-center gap-1" style={{ color: "#00FF66" }}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                  +28 este mes
                </p>
              </div>

              <div className="p-5 rounded-2xl relative overflow-hidden group" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="absolute inset-0 transition-opacity duration-500 opacity-0 group-hover:opacity-100" style={{ background: "rgba(255,94,58,0.04)" }} />
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: "#FF5E3A", boxShadow: "0 0 8px #FF5E3A" }} />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Compradores</p>
                </div>
                <p className="text-2xl sm:text-3xl font-black">387</p>
                <p className="text-xs font-semibold mt-1 flex items-center gap-1" style={{ color: "#FF5E3A" }}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                  Activos hoy
                </p>
              </div>

              <div className="col-span-2 p-5 sm:p-6 rounded-2xl relative overflow-hidden group" style={{ background: "linear-gradient(135deg,rgba(10,11,16,0.9),rgba(3,3,5,0.9))", border: "1px solid rgba(0,255,102,0.2)" }}>
                <div className="absolute right-0 top-0 w-32 h-32 rounded-full transition-all duration-700" style={{ background: "rgba(0,255,102,0.08)", filter: "blur(40px)" }} />
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Comisiones pagadas a la red</p>
                <div className="flex items-baseline gap-1 sm:gap-2">
                  <span className="text-3xl sm:text-4xl font-extrabold" style={{ color: "#00FF66" }}>$</span>
                  <span className="text-4xl sm:text-5xl font-black tracking-tight">{comisiones.toLocaleString("es-AR")}</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-600 mt-8">&copy; 2026 MaqJeez · Carlos Spegazzini, Buenos Aires</p>
          </div>
        </div>

        {/* ══ RIGHT: form ══ */}
        <div className="w-full lg:w-7/12 xl:w-1/2 flex items-center justify-center px-4 sm:px-8 lg:px-12 py-8 sm:py-10">
          <div className="w-full max-w-[500px]">

            {/* Mobile back */}
            <div className="flex items-center justify-between mb-5 lg:hidden">
              <Link href="/catalogo" className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-400 hover:text-white transition-colors">
                <ArrowLeft className="h-4 w-4" /> Catálogo
              </Link>
              <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#6b7280" }}>
                🔒 Seguro
              </span>
            </div>

            {/* Tarjeta */}
            <div className="login-card rounded-[1.75rem] sm:rounded-[2rem] p-6 sm:p-10 relative overflow-hidden opacity-0 anim-fade-up" style={{ animationDelay: "0.25s" }}>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px pointer-events-none" style={{ background: "linear-gradient(to right, transparent, rgba(255,255,255,0.12), transparent)" }} />

              {/* Header */}
              <div className="text-center mb-7">
                <h2 className="text-2xl sm:text-3xl font-black mb-1.5">
                  {roleStep === null ? "Únete al ecosistema" : isRegister ? "Crear cuenta vendedor" : "Bienvenido de nuevo"}
                </h2>
                <p className="text-sm text-gray-400 font-medium">
                  {roleStep === null ? "Paso 1 de 3 — ¿Cómo usarás la plataforma?" : isRegister ? <>Registrate y empezá a <strong className="text-emerald-400">ganar hoy</strong></> : "Ingresá a tu cuenta de vendedor"}
                </p>
              </div>

              {/* ── SELECTOR DE ROL ── */}
              {roleStep === null && (
                <div className="space-y-3 mb-2">
                  {/* VENDEDOR */}
                  <button type="button" onClick={() => { setRoleStep("vendedor"); setIsRegister(true); }}
                    className="role-card sel-green w-full rounded-xl sm:rounded-2xl p-4 sm:p-5 flex items-start gap-4 text-left active:scale-[0.98] transition-transform relative overflow-hidden">
                    <div className="absolute top-0 right-0 text-[9px] font-black px-3 py-1 rounded-bl-xl rounded-tr-2xl uppercase tracking-wider" style={{ background: "#00FF66", color: "#000" }}>
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-black animate-pulse mr-1" />Monetizá hoy
                    </div>
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 transition-all" style={{ background: "rgba(0,255,102,0.1)", border: "1px solid rgba(0,255,102,0.2)", color: "#00FF66" }}>
                      <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="font-black text-white text-sm sm:text-base mb-0.5">Quiero Vender y Ganar</p>
                      <p className="text-xs text-gray-400 leading-snug mb-2.5">Compartí tu link y recibí comisiones en efectivo por cada venta.</p>
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-[10px] px-2 py-0.5 rounded-md font-bold" style={{ background: "rgba(0,255,102,0.08)", color: "#00FF66", border: "1px solid rgba(0,255,102,0.2)" }}>Comisiones 10–15%</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md font-bold" style={{ background: "rgba(0,255,102,0.08)", color: "#00FF66", border: "1px solid rgba(0,255,102,0.2)" }}>Panel de ventas</span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 mt-1 text-emerald-400" />
                  </button>

                  {/* COMPRADOR */}
                  <button type="button" onClick={() => router.push("/catalogo/cliente/login")}
                    className="role-card w-full rounded-xl sm:rounded-2xl p-4 sm:p-5 flex items-start gap-4 text-left active:scale-[0.98] transition-transform">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 transition-all" style={{ background: "rgba(255,94,58,0.08)", border: "1px solid rgba(255,94,58,0.15)", color: "#FF5E3A" }}>
                      <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="font-black text-white text-sm sm:text-base mb-0.5">Soy Comprador B2B</p>
                      <p className="text-xs text-gray-400 leading-snug mb-2.5">Adquirí repuestos para tu maquinaria con precios corporativos.</p>
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-[10px] px-2 py-0.5 rounded-md font-bold" style={{ background: "rgba(255,94,58,0.08)", color: "#FF5E3A", border: "1px solid rgba(255,94,58,0.2)" }}>3% OFF siempre</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md font-bold" style={{ background: "rgba(255,94,58,0.08)", color: "#FF5E3A", border: "1px solid rgba(255,94,58,0.2)" }}>Descuentos exclusivos</span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 mt-1 text-orange-400" />
                  </button>

                  <p className="text-center text-xs text-gray-500 pt-1">
                    ¿Ya tenés cuenta?{" "}
                    <button type="button" onClick={() => { setRoleStep("vendedor"); setIsRegister(false); }} className="font-bold hover:underline" style={{ color: "#00FF66" }}>
                      Iniciá sesión
                    </button>
                  </p>
                </div>
              )}

              {/* ── FORMULARIO ── */}
              {roleStep === "vendedor" && (
                <div className="anim-slide-up">
                  <button type="button" onClick={() => setRoleStep(null)} className="mb-4 flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors">
                    <ArrowLeft className="h-3.5 w-3.5" /> Cambiar rol
                  </button>

                  {/* Toggle */}
                  <div className="flex p-1.5 rounded-xl mb-5 relative" style={{ background: "rgba(5,10,25,0.8)", border: "1px solid rgba(30,41,59,0.8)" }}>
                    <div className="absolute top-1.5 bottom-1.5 rounded-lg transition-all duration-300" style={{ width: "calc(50% - 6px)", background: "#0f172a", border: "1px solid rgba(100,116,139,0.3)", left: !isRegister ? "6px" : "calc(50%)" }} />
                    <button type="button" onClick={() => switchTab(false)} className="w-1/2 py-2 text-sm font-bold relative z-10 transition-colors" style={{ color: !isRegister ? "#fff" : "#64748b" }}>Ingresar</button>
                    <button type="button" onClick={() => switchTab(true)} className="w-1/2 py-2 text-sm font-bold relative z-10 transition-colors" style={{ color: isRegister ? "#fff" : "#64748b" }}>Registrarse</button>
                  </div>

                  {error && (
                    <p className="mb-4 px-3 py-2 rounded-lg text-sm text-red-400" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>{error}</p>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-3">
                    {isRegister && (
                      <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-emerald-400 transition-colors" />
                        <input type="text" value={form.nombre} onChange={(e) => update("nombre", e.target.value)} required placeholder="Nombre completo" className={inputCls} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                      </div>
                    )}

                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-emerald-400 transition-colors" />
                      <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required placeholder="Correo electrónico" className={inputCls} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                    </div>

                    {isRegister && (
                      <div className="relative group">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-emerald-400 transition-colors" />
                        <input type="tel" value={form.telefono} onChange={(e) => update("telefono", e.target.value)} placeholder="Teléfono (opcional)" className={inputCls} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                      </div>
                    )}

                    {isRegister && (
                      <div>
                        <div className="relative group">
                          <Store className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-emerald-400 transition-colors" />
                          <input type="text" value={form.dni_cuit} onChange={(e) => update("dni_cuit", e.target.value)} required placeholder="DNI o CUIT" className={inputCls} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                        </div>
                        <p className="mt-1 text-[10px] text-gray-600 pl-1">No podés registrar el mismo DNI/CUIT en otra cuenta de vendedor.</p>
                      </div>
                    )}

                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-emerald-400 transition-colors" />
                      <input type={showPass ? "text" : "password"} value={form.password} onChange={(e) => update("password", e.target.value)} required placeholder="Contraseña" className={`${inputCls} pr-12`} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                      <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                        {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>

                    {isRegister && (
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-emerald-400 transition-colors" />
                        <input type="password" value={form.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)} required placeholder="Repetí la contraseña" className={inputCls} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                      </div>
                    )}

                    {!isRegister && (
                      <div className="text-right -mt-1">
                        <button type="button" onClick={() => setShowForgot(true)} className="text-xs font-semibold transition-colors" style={{ color: "#00FF66" }}>¿Olvidaste tu contraseña?</button>
                      </div>
                    )}

                    {showForgot && <ForgotPasswordModal rol="vendedor" onClose={() => setShowForgot(false)} />}

                    <button type="submit" disabled={loading}
                      className="shimmer-btn relative overflow-hidden w-full font-extrabold py-4 px-4 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-1 disabled:opacity-50 text-base group"
                      style={{ background: "#fff", color: "#000" }}>
                      <span className="relative z-10 flex items-center gap-2">
                        {loading
                          ? <><Loader2 className="h-4 w-4 animate-spin" /> {isRegister ? "Registrando…" : "Ingresando…"}</>
                          : <>{isRegister ? "Crear cuenta" : "Comenzar ahora"} <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg></>
                        }
                      </span>
                      <div className="shimmer-layer absolute inset-0 -translate-x-full" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)" }} />
                    </button>
                  </form>

                  <div className="mt-4 relative flex items-center justify-center">
                    <div className="absolute w-full border-t" style={{ borderColor: "rgba(71,85,105,0.3)" }} />
                    <div className="relative px-3 text-xs font-medium text-gray-600" style={{ background: "rgba(3,3,5,0.97)" }}>O continuar con</div>
                  </div>

                  <button type="button"
                    className="mt-3 w-full font-semibold py-3.5 px-4 rounded-xl flex items-center justify-center gap-3 text-gray-300 transition-colors"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)")}>
                    <svg viewBox="0 0 24 24" className="w-5 h-5">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Google
                  </button>

                  {!isRegister && (
                    <div className="mt-3 px-4 py-2.5 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <p className="text-xs text-gray-600 flex items-center justify-center gap-1.5">
                        <Lock className="h-3 w-3" /> Acceso seguro y encriptado
                      </p>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* ── TOAST FOMO ── */}
      {showToast && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 flex items-center gap-3 rounded-2xl px-4 py-3 z-50 anim-slide-up max-w-[calc(100vw-2rem)] sm:max-w-xs" style={{ background: "rgba(10,11,16,0.95)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 20px 40px rgba(0,0,0,0.6)" }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(0,255,102,0.15)", border: "1px solid rgba(0,255,102,0.3)" }}>
            <span className="text-base">💸</span>
          </div>
          <div>
            <p className="text-sm font-semibold">Carlos desde <span className="text-gray-400 font-normal">Córdoba</span></p>
            <p className="text-xs font-bold" style={{ color: "#00FF66" }}>Retiró sus comisiones con éxito</p>
          </div>
        </div>
      )}
    </div>
  );
}
