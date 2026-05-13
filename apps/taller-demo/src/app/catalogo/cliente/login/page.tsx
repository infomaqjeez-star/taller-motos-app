"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useClienteAuth } from "@/components/cliente/ClienteAuthContext";
import {
  ArrowLeft, User, Mail, Phone, Lock, Loader2,
  Eye, EyeOff, Store, ChevronRight,
  ShoppingBag, TrendingUp, CheckCircle, XCircle,
} from "lucide-react";

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
  "🛒 Constructora Sur se unió como Comprador VIP",
  "💰 3% de descuento fijo en todas tus compras",
  "🔥 Nuevo lote de repuestos CAT con 15% OFF extra",
  "⭐ Más de 387 empresas ya compran en MaqJeez",
  "🚚 Entregas a todo el país en 24-72 hs",
];

export default function ClienteLoginPage() {
  const router = useRouter();
  const { login, register } = useClienteAuth();
  const [tab, setTab] = useState<"login" | "register">("register");
  const [roleStep, setRoleStep] = useState<null | "comprador">(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [dni, setDni] = useState("");
  const [password, setPassword] = useState("");
  const [vendedorSeleccionado, setVendedorSeleccionado] = useState("");
  const [refInfo, setRefInfo] = useState<{ codigo: string; nombre: string; vendedor_id: string } | null>(null);
  const [codigoManual, setCodigoManual] = useState("");
  const [codigoStatus, setCodigoStatus] = useState<"idle" | "checking" | "ok" | "error">("idle");
  const [codigoNombre, setCodigoNombre] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ahorro = useCounter(3210500, 3500, 700);
  const empresas = useCounter(387, 2000, 400);

  useEffect(() => {
    const codigo = localStorage.getItem("ref_codigo");
    const refNombre = localStorage.getItem("ref_nombre");
    const vendedor_id = localStorage.getItem("ref_vendedor_id");
    if (codigo && refNombre && vendedor_id) {
      setRefInfo({ codigo, nombre: refNombre, vendedor_id });
      setVendedorSeleccionado(vendedor_id);
    }
    const t = setTimeout(() => setShowToast(true), 4000);
    const t2 = setTimeout(() => setShowToast(false), 8500);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, []);

  const handleCodigoManual = (val: string) => {
    const upper = val.toUpperCase().trim();
    setCodigoManual(upper);
    setCodigoStatus("idle");
    setCodigoNombre("");
    if (!upper) { setVendedorSeleccionado(refInfo?.vendedor_id || ""); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setCodigoStatus("checking");
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/vendedor/public?codigo=${encodeURIComponent(upper)}`);
        const data = await res.json();
        if (data.vendedor) {
          setCodigoStatus("ok");
          setCodigoNombre(data.vendedor.nombre);
          setVendedorSeleccionado(data.vendedor.id);
        } else {
          setCodigoStatus("error");
          setVendedorSeleccionado("");
        }
      } catch {
        setCodigoStatus("error");
        setVendedorSeleccionado("");
      }
    }, 500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (tab === "login") {
        await login(email, password);
      } else {
        await register({ nombre, email, telefono, dni, password, vendedor_referente_id: vendedorSeleccionado || refInfo?.vendedor_id || undefined });
      }
      router.push("/catalogo");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (t: "login" | "register") => { setTab(t); setError(""); };

  const inputCls = "w-full py-3.5 pl-12 pr-4 text-sm text-white placeholder-slate-500 rounded-xl outline-none transition-colors";
  const inputStyle = { background: "rgba(5,10,25,0.8)", border: "1px solid rgba(71,85,105,0.4)" };
  const onFocusIn  = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => (e.currentTarget.style.borderColor = "#FF5E3A");
  const onFocusOut = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => (e.currentTarget.style.borderColor = "rgba(71,85,105,0.4)");

  const showForm = tab === "login" || roleStep === "comprador";

  return (
    <div className="min-h-screen flex flex-col relative" style={{ background: "#030305", color: "#fff" }}>
      <style>{`
        @keyframes blob{0%{transform:translate(0,0) scale(1)}33%{transform:translate(30px,-50px) scale(1.1)}66%{transform:translate(-20px,20px) scale(0.9)}100%{transform:translate(0,0) scale(1)}}
        @keyframes marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        @keyframes fadeUp{0%{opacity:0;transform:translateY(20px)}100%{opacity:1;transform:translateY(0)}}
        @keyframes slideUp{0%{opacity:0;transform:translateY(14px)}100%{opacity:1;transform:translateY(0)}}
        @keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
        .anim-fade-up{animation:fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) forwards}
        .anim-slide-up{animation:slideUp 0.4s cubic-bezier(0.16,1,0.3,1) forwards}
        .shimmer-btn:hover .shimmer-layer{animation:shimmer 0.8s ease forwards}
        @media(max-width:1023px){.orb-dsk{display:none!important}}
        @media(prefers-reduced-motion:reduce){.orb-dsk,.tkr{animation:none!important}}
        .role-c{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);transition:all 0.3s}
        .role-c.sel{background:linear-gradient(135deg,rgba(255,94,58,0.06),transparent);border-color:#FF5E3A;box-shadow:0 0 0 1px #FF5E3A,0 10px 30px -10px rgba(255,94,58,0.15)}
        .login-card{background:rgba(10,11,16,0.6);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.06);box-shadow:0 25px 50px -12px rgba(0,0,0,0.8),inset 0 1px 0 rgba(255,255,255,0.05)}
      `}</style>

      {/* Mesh */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{ background: "radial-gradient(at 0% 0%, rgba(255,94,58,0.05) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(0,255,102,0.04) 0px, transparent 50%)" }} />

      {/* Orbes desktop */}
      <div className="orb-dsk fixed top-0 left-1/4 w-80 h-80 rounded-full pointer-events-none" style={{ background: "rgba(255,94,58,0.07)", filter: "blur(80px)", animation: "blob 10s infinite", mixBlendMode: "screen" }} />
      <div className="orb-dsk fixed bottom-0 right-1/4 w-80 h-80 rounded-full pointer-events-none" style={{ background: "rgba(0,255,102,0.05)", filter: "blur(80px)", animation: "blob 10s infinite 2s", mixBlendMode: "screen" }} />

      {/* Ticker */}
      <div className="relative z-50 overflow-hidden border-b" style={{ background: "#FF5E3A", borderColor: "rgba(255,94,58,0.4)", boxShadow: "0 0 20px rgba(255,94,58,0.2)" }}>
        <div className="tkr flex whitespace-nowrap py-1.5" style={{ animation: "marquee 28s linear infinite" }}>
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={i} className="inline-flex items-center px-6 text-[11px] sm:text-xs font-black text-white uppercase tracking-wide gap-2">
              {item} <span className="w-1 h-1 rounded-full bg-white/40 inline-block" />
            </span>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row relative z-10">

        {/* LEFT: stats */}
        <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 flex-col justify-center p-12 xl:p-20 border-r" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="max-w-xl opacity-0 anim-fade-up" style={{ animationDelay: "0.1s" }}>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-8" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "#FF5E3A" }} />
                <span className="relative inline-flex rounded-full h-3 w-3" style={{ background: "#FF5E3A" }} />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-300">Catálogo B2B MaqJeez</span>
            </div>

            <h1 className="text-5xl xl:text-7xl font-black leading-[1.1] mb-5 tracking-tight">
              El motor de tu<br />
              <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(to right, #fff, #e5e7eb, #9ca3af)" }}>negocio.</span>
            </h1>
            <p className="text-gray-400 text-lg leading-relaxed mb-10 font-medium">
              Repuestos con <strong className="text-white">precios corporativos</strong> y 3% OFF fijo. Los números hablan por sí solos.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl relative overflow-hidden group" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="absolute inset-0 transition-opacity duration-500 opacity-0 group-hover:opacity-100" style={{ background: "rgba(255,94,58,0.04)" }} />
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: "#FF5E3A", boxShadow: "0 0 8px #FF5E3A" }} />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Clientes</p>
                </div>
                <p className="text-2xl sm:text-3xl font-black">{empresas.toLocaleString("es-AR")}</p>
                <p className="text-xs font-semibold mt-1 flex items-center gap-1" style={{ color: "#FF5E3A" }}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                  Clientes activos hoy
                </p>
              </div>

              <div className="p-5 rounded-2xl relative overflow-hidden group" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="absolute inset-0 transition-opacity duration-500 opacity-0 group-hover:opacity-100" style={{ background: "rgba(0,255,102,0.04)" }} />
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: "#00FF66", boxShadow: "0 0 8px #00FF66" }} />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Descuento</p>
                </div>
                <p className="text-2xl sm:text-3xl font-black">3%</p>
                <p className="text-xs font-semibold mt-1 flex items-center gap-1" style={{ color: "#00FF66" }}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                  OFF fijo siempre
                </p>
              </div>

              <div className="col-span-2 p-5 sm:p-6 rounded-2xl relative overflow-hidden group" style={{ background: "linear-gradient(135deg,rgba(10,11,16,0.9),rgba(3,3,5,0.9))", border: "1px solid rgba(255,94,58,0.2)" }}>
                <div className="absolute right-0 top-0 w-32 h-32 rounded-full transition-all duration-700" style={{ background: "rgba(255,94,58,0.08)", filter: "blur(40px)" }} />
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Ahorro generado para compradores</p>
                <div className="flex items-baseline gap-1 sm:gap-2">
                  <span className="text-3xl sm:text-4xl font-extrabold" style={{ color: "#FF5E3A" }}>$</span>
                  <span className="text-4xl sm:text-5xl font-black tracking-tight">{ahorro.toLocaleString("es-AR")}</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-600 mt-8">&copy; 2026 MaqJeez · Carlos Spegazzini, Buenos Aires</p>
          </div>
        </div>

        {/* RIGHT: form */}
        <div className="w-full lg:w-7/12 xl:w-1/2 flex items-center justify-center px-4 sm:px-8 lg:px-12 py-8 sm:py-10">
          <div className="w-full max-w-[500px]">

            <div className="flex items-center justify-between mb-5 lg:hidden">
              <Link href="/catalogo" className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-400 hover:text-white transition-colors">
                <ArrowLeft className="h-4 w-4" /> Catálogo
              </Link>
              <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#6b7280" }}>
                🔒 Seguro
              </span>
            </div>

            <div className="login-card rounded-[1.75rem] sm:rounded-[2rem] p-6 sm:p-10 relative overflow-hidden opacity-0 anim-fade-up" style={{ animationDelay: "0.25s" }}>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px pointer-events-none" style={{ background: "linear-gradient(to right, transparent, rgba(255,255,255,0.1), transparent)" }} />

              <div className="text-center mb-7">
                <h2 className="text-2xl sm:text-3xl font-black mb-1.5">
                  {!showForm ? "Únete al ecosistema" : tab === "login" ? "Bienvenido de nuevo" : "Crear cuenta"}
                </h2>
                <p className="text-sm text-gray-400 font-medium">
                  {!showForm ? "Paso 1 de 3 — ¿Cómo usarás la plataforma?" : tab === "login" ? "Ingresá a tu cuenta para continuar." : <>Registrate y obtené <strong style={{ color: "#FF5E3A" }}>3% OFF</strong> fijo en todas tus compras.</>}
                </p>
              </div>

              {/* ── SELECTOR ROL ── */}
              {tab === "register" && roleStep === null && (
                <div className="space-y-3 mb-2">
                  {/* COMPRADOR */}
                  <button type="button" onClick={() => setRoleStep("comprador")}
                    className="role-c sel w-full rounded-xl sm:rounded-2xl p-4 sm:p-5 flex items-start gap-4 text-left active:scale-[0.98] transition-transform relative overflow-hidden">
                    <div className="absolute top-0 right-0 text-[9px] font-black px-3 py-1 rounded-bl-xl rounded-tr-2xl uppercase tracking-wider" style={{ background: "#FF5E3A", color: "#fff" }}>
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-white animate-pulse mr-1" />3% OFF fijo
                    </div>
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(255,94,58,0.1)", border: "1px solid rgba(255,94,58,0.2)", color: "#FF5E3A" }}>
                      <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="font-black text-white text-sm sm:text-base mb-0.5">Soy Comprador B2B</p>
                      <p className="text-xs text-gray-400 leading-snug mb-2.5">Adquirí repuestos con precios corporativos y descuentos exclusivos.</p>
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-[10px] px-2 py-0.5 rounded-md font-bold" style={{ background: "rgba(255,94,58,0.08)", color: "#FF5E3A", border: "1px solid rgba(255,94,58,0.2)" }}>3% OFF siempre</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md font-bold" style={{ background: "rgba(255,94,58,0.08)", color: "#FF5E3A", border: "1px solid rgba(255,94,58,0.2)" }}>Historial de pedidos</span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 mt-1 text-orange-400" />
                  </button>

                  {/* VENDEDOR */}
                  <button type="button" onClick={() => router.push("/catalogo/vendedor/login")}
                    className="role-c w-full rounded-xl sm:rounded-2xl p-4 sm:p-5 flex items-start gap-4 text-left active:scale-[0.98] transition-transform">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(0,255,102,0.08)", border: "1px solid rgba(0,255,102,0.15)", color: "#00FF66" }}>
                      <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="font-black text-white text-sm sm:text-base mb-0.5">Quiero Vender y Ganar</p>
                      <p className="text-xs text-gray-400 leading-snug mb-2.5">Compartí tu link y cobrá comisiones por cada venta generada.</p>
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-[10px] px-2 py-0.5 rounded-md font-bold" style={{ background: "rgba(0,255,102,0.08)", color: "#00FF66", border: "1px solid rgba(0,255,102,0.2)" }}>Comisiones 10–15%</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md font-bold" style={{ background: "rgba(0,255,102,0.08)", color: "#00FF66", border: "1px solid rgba(0,255,102,0.2)" }}>Panel de ventas</span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 mt-1 text-emerald-400" />
                  </button>

                  <p className="text-center text-xs text-gray-500 pt-1">
                    ¿Ya tenés cuenta?{" "}
                    <button type="button" onClick={() => switchTab("login")} className="font-bold hover:underline" style={{ color: "#FF5E3A" }}>Iniciá sesión</button>
                  </p>
                </div>
              )}

              {/* ── FORMULARIO ── */}
              {showForm && (
                <div className="anim-slide-up">
                  {tab === "register" && roleStep === "comprador" && (
                    <button type="button" onClick={() => setRoleStep(null)} className="mb-4 flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors">
                      <ArrowLeft className="h-3.5 w-3.5" /> Cambiar rol
                    </button>
                  )}

                  <div className="flex p-1.5 rounded-xl mb-5 relative" style={{ background: "rgba(5,10,25,0.8)", border: "1px solid rgba(30,41,59,0.8)" }}>
                    <div className="absolute top-1.5 bottom-1.5 rounded-lg transition-all duration-300" style={{ width: "calc(50% - 6px)", background: "#0f172a", border: "1px solid rgba(100,116,139,0.3)", left: tab === "login" ? "6px" : "calc(50%)" }} />
                    <button type="button" onClick={() => switchTab("login")} className="w-1/2 py-2 text-sm font-bold relative z-10 transition-colors" style={{ color: tab === "login" ? "#fff" : "#64748b" }}>Ingresar</button>
                    <button type="button" onClick={() => { setRoleStep("comprador"); switchTab("register"); }} className="w-1/2 py-2 text-sm font-bold relative z-10 transition-colors" style={{ color: tab === "register" ? "#fff" : "#64748b" }}>Registrarse</button>
                  </div>

                  {error && (
                    <p className="mb-4 px-3 py-2 rounded-lg text-sm text-red-400" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>{error}</p>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-3">
                    {tab === "register" && (
                      <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-orange-400 transition-colors" />
                        <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} required placeholder="Nombre completo" className={inputCls} style={inputStyle} onFocus={onFocusIn} onBlur={onFocusOut} />
                      </div>
                    )}

                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-orange-400 transition-colors" />
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="Correo electrónico" className={inputCls} style={inputStyle} onFocus={onFocusIn} onBlur={onFocusOut} />
                    </div>

                    {tab === "register" && (
                      <>
                        <div className="relative group">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-orange-400 transition-colors" />
                          <input type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Teléfono (opcional)" className={inputCls} style={inputStyle} onFocus={onFocusIn} onBlur={onFocusOut} />
                        </div>
                        <div className="relative group">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-orange-400 transition-colors" />
                          <input type="text" value={dni} onChange={(e) => setDni(e.target.value)} placeholder="DNI (opcional)" className={inputCls} style={inputStyle} onFocus={onFocusIn} onBlur={onFocusOut} />
                        </div>
                        {/* Código de vendedor referente */}
                        {refInfo ? (
                          <div className="flex items-center gap-2 px-4 py-3 rounded-xl" style={{ background: "rgba(255,94,58,0.06)", border: "1px solid rgba(255,94,58,0.25)" }}>
                            <CheckCircle className="h-4 w-4 shrink-0" style={{ color: "#FF5E3A" }} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-gray-400">Referido por</p>
                              <p className="text-sm font-bold text-white truncate">{refInfo.nombre} <span className="font-mono text-xs" style={{ color: "#FF5E3A" }}>({refInfo.codigo})</span></p>
                            </div>
                            <button type="button" onClick={() => { setRefInfo(null); setVendedorSeleccionado(""); localStorage.removeItem("ref_codigo"); localStorage.removeItem("ref_nombre"); localStorage.removeItem("ref_vendedor_id"); }} className="text-gray-600 hover:text-gray-300 transition-colors text-xs">✕</button>
                          </div>
                        ) : (
                          <div>
                            <div className="relative group">
                              <Store className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-orange-400 transition-colors" />
                              <input
                                type="text"
                                value={codigoManual}
                                onChange={(e) => handleCodigoManual(e.target.value)}
                                placeholder="Código de vendedor (opcional)"
                                className={`${inputCls} pr-10`}
                                style={{ ...inputStyle, borderColor: codigoStatus === "ok" ? "rgba(34,197,94,0.6)" : codigoStatus === "error" ? "rgba(239,68,68,0.5)" : undefined }}
                                maxLength={20}
                              />
                              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                {codigoStatus === "checking" && <Loader2 className="h-4 w-4 animate-spin text-gray-500" />}
                                {codigoStatus === "ok" && <CheckCircle className="h-4 w-4" style={{ color: "#22c55e" }} />}
                                {codigoStatus === "error" && <XCircle className="h-4 w-4 text-red-400" />}
                              </div>
                            </div>
                            {codigoStatus === "ok" && (
                              <p className="mt-1.5 text-xs pl-1 font-semibold" style={{ color: "#22c55e" }}>✓ Vendedor encontrado: <span className="text-white">{codigoNombre}</span></p>
                            )}
                            {codigoStatus === "error" && (
                              <p className="mt-1.5 text-xs pl-1 text-red-400">Código no válido o vendedor inactivo</p>
                            )}
                          </div>
                        )}
                      </>
                    )}

                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-orange-400 transition-colors" />
                      <input type={showPass ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Contraseña" className={`${inputCls} pr-12`} style={inputStyle} onFocus={onFocusIn} onBlur={onFocusOut} />
                      <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                        {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>

                    {tab === "login" && (
                      <div className="text-right -mt-1">
                        <button type="button" className="text-xs font-semibold transition-colors" style={{ color: "#FF5E3A" }}>¿Olvidaste tu contraseña?</button>
                      </div>
                    )}

                    <button type="submit" disabled={loading}
                      className="shimmer-btn relative overflow-hidden w-full font-extrabold py-4 px-4 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-1 disabled:opacity-50 text-base group"
                      style={{ background: "#fff", color: "#000" }}>
                      <span className="relative z-10 flex items-center gap-2">
                        {loading
                          ? <><Loader2 className="h-4 w-4 animate-spin" /> {tab === "login" ? "Ingresando…" : "Registrando…"}</>
                          : <>{tab === "login" ? "Comenzar ahora" : "Crear cuenta"} <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg></>
                        }
                      </span>
                      <div className="shimmer-layer absolute inset-0 -translate-x-full" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)" }} />
                    </button>
                  </form>

                    <div className="mt-4 relative flex items-center justify-center">
                      <div className="absolute w-full border-t" style={{ borderColor: "rgba(71,85,105,0.3)" }} />
                      <div className="relative px-3 text-xs font-medium text-gray-600" style={{ background: "rgba(10,11,16,0.97)" }}>O continuar con</div>
                    </div>

                    <button type="button"
                      className="w-full font-semibold py-3.5 px-4 rounded-xl flex items-center justify-center gap-3 text-gray-300 transition-colors"
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

                  {refInfo && tab === "register" && (
                    <div className="mt-2 px-4 py-2.5 rounded-xl text-center" style={{ background: "rgba(255,94,58,0.06)", border: "1px solid rgba(255,94,58,0.2)" }}>
                      <p className="text-xs text-gray-400 flex items-center justify-center gap-1.5">
                        <Store className="h-3 w-3 text-orange-400" />
                        Comprando con: <strong className="text-white font-mono">{refInfo.codigo}</strong> ({refInfo.nombre})
                      </p>
                    </div>
                  )}

                  {tab === "register" && !refInfo && (
                    <div className="mt-2 px-4 py-2.5 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <p className="text-xs text-gray-500 flex items-center justify-center gap-1.5">
                        <Lock className="h-3 w-3" /> Registro seguro y sin spam
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toast FOMO */}
      {showToast && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 flex items-center gap-3 rounded-2xl px-4 py-3 z-50 anim-slide-up max-w-[calc(100vw-2rem)] sm:max-w-xs" style={{ background: "rgba(10,11,16,0.95)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 20px 40px rgba(0,0,0,0.6)" }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(255,94,58,0.15)", border: "1px solid rgba(255,94,58,0.3)" }}>
            <span className="text-base">🛒</span>
          </div>
          <div>
            <p className="text-sm font-semibold">Constructora Sur <span className="text-gray-400 font-normal">desde Mendoza</span></p>
            <p className="text-xs font-bold" style={{ color: "#FF5E3A" }}>Acaba de hacer su primer pedido</p>
          </div>
        </div>
      )}
    </div>
  );
}
