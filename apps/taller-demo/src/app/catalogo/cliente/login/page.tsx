"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useClienteAuth } from "@/components/cliente/ClienteAuthContext";
import {
  ArrowLeft, User, Mail, Phone, Lock, Loader2,
  Eye, EyeOff, Store, ChevronRight, ChevronDown,
  ShoppingBag, TrendingUp, CheckCircle, XCircle,
  BookOpen, Receipt, BadgeCheck, Truck, Share2, Wallet, Users, KeyRound,
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
  const [showForgot, setShowForgot] = useState(false);

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

                  {/* ── COMO FUNCIONA ── */}
                  <div className="pt-3 mt-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                    <div className="flex items-center gap-2 mb-3">
                      <BookOpen className="h-3.5 w-3.5 text-gray-500" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                        Antes de elegir, conocé cómo funciona
                      </span>
                    </div>

                    {/* Tutorial COMPRADOR */}
                    <details className="group rounded-xl mb-2 overflow-hidden" style={{ background: "rgba(255,94,58,0.04)", border: "1px solid rgba(255,94,58,0.15)" }}>
                      <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition">
                        <span className="flex items-center gap-2.5 min-w-0">
                          <ShoppingBag className="h-4 w-4 shrink-0" style={{ color: "#FF5E3A" }} />
                          <span className="text-sm font-bold text-white truncate">Cómo funciona si soy Comprador</span>
                        </span>
                        <ChevronDown className="h-4 w-4 text-gray-500 shrink-0 group-open:rotate-180 transition-transform" />
                      </summary>
                      <ol className="px-4 pb-4 pt-1 space-y-2.5 text-xs text-gray-300 leading-relaxed">
                        <li className="flex gap-2.5">
                          <span className="font-mono text-[10px] text-gray-500 mt-0.5 w-5 shrink-0">01</span>
                          <div>
                            <strong className="text-white">Te registrás</strong> con email y contraseña. Si tenés código de un vendedor, lo cargás acá.
                          </div>
                        </li>
                        <li className="flex gap-2.5">
                          <span className="font-mono text-[10px] text-gray-500 mt-0.5 w-5 shrink-0">02</span>
                          <div>
                            <strong className="text-white">Navegás el catálogo</strong> con precios B2B ya con 3% OFF aplicado, más las ofertas vigentes.
                          </div>
                        </li>
                        <li className="flex gap-2.5">
                          <span className="font-mono text-[10px] text-gray-500 mt-0.5 w-5 shrink-0">03</span>
                          <div>
                            <strong className="text-white">Agregás al carrito</strong> y confirmás el pedido. Recibís número de orden y datos de transferencia.
                          </div>
                        </li>
                        <li className="flex gap-2.5">
                          <span className="font-mono text-[10px] text-gray-500 mt-0.5 w-5 shrink-0">04</span>
                          <div>
                            <strong className="text-white">Pagás y subís el comprobante</strong> desde tu panel. El equipo valida en 1 a 4 horas hábiles.
                          </div>
                        </li>
                        <li className="flex gap-2.5">
                          <span className="font-mono text-[10px] text-gray-500 mt-0.5 w-5 shrink-0">05</span>
                          <div>
                            <strong className="text-white">Recibís el pedido</strong> en 24 a 72hs (CABA/GBA) o 3 a 7 días hábiles al interior. Seguís el estado desde tu cuenta.
                          </div>
                        </li>
                      </ol>
                    </details>

                    {/* Tutorial VENDEDOR */}
                    <details className="group rounded-xl mb-2 overflow-hidden" style={{ background: "rgba(0,255,102,0.04)", border: "1px solid rgba(0,255,102,0.15)" }}>
                      <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition">
                        <span className="flex items-center gap-2.5 min-w-0">
                          <TrendingUp className="h-4 w-4 shrink-0" style={{ color: "#00FF66" }} />
                          <span className="text-sm font-bold text-white truncate">Cómo funciona si soy Vendedor</span>
                        </span>
                        <ChevronDown className="h-4 w-4 text-gray-500 shrink-0 group-open:rotate-180 transition-transform" />
                      </summary>
                      <ol className="px-4 pb-4 pt-1 space-y-2.5 text-xs text-gray-300 leading-relaxed">
                        <li className="flex gap-2.5">
                          <span className="font-mono text-[10px] text-gray-500 mt-0.5 w-5 shrink-0">01</span>
                          <div>
                            <strong className="text-white">Te das de alta</strong> como vendedor y recibís un código único + tu link de referido.
                          </div>
                        </li>
                        <li className="flex gap-2.5">
                          <span className="font-mono text-[10px] text-gray-500 mt-0.5 w-5 shrink-0">02</span>
                          <div>
                            <strong className="text-white">Compartís tu link</strong> con clientes por WhatsApp, mail o redes. Quien se registra usando tu link queda asociado a vos.
                          </div>
                        </li>
                        <li className="flex gap-2.5">
                          <span className="font-mono text-[10px] text-gray-500 mt-0.5 w-5 shrink-0">03</span>
                          <div>
                            <strong className="text-white">Tus clientes compran</strong> en el catálogo. Vos no tenés que hacer nada, ellos pagan a MaqJeez directo.
                          </div>
                        </li>
                        <li className="flex gap-2.5">
                          <span className="font-mono text-[10px] text-gray-500 mt-0.5 w-5 shrink-0">04</span>
                          <div>
                            <strong className="text-white">Cobrás comisión 10 a 15%</strong> sobre cada pedido pagado. Lo ves en tiempo real en tu panel.
                          </div>
                        </li>
                        <li className="flex gap-2.5">
                          <span className="font-mono text-[10px] text-gray-500 mt-0.5 w-5 shrink-0">05</span>
                          <div>
                            <strong className="text-white">Se te liquida</strong> según el ciclo del taller. Las comisiones aprobadas pasan a "disponibles para retiro".
                          </div>
                        </li>
                      </ol>
                    </details>

                    <Link
                      href="/ayuda"
                      className="flex items-center justify-between px-4 py-3 rounded-xl text-xs text-gray-400 hover:text-white transition group"
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
                    >
                      <span className="flex items-center gap-2.5">
                        <BookOpen className="h-3.5 w-3.5" />
                        Ver el centro de ayuda completo (33 tutoriales)
                      </span>
                      <ChevronRight className="h-4 w-4 text-gray-500 group-hover:text-white transition" />
                    </Link>
                  </div>
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
                        <button type="button" onClick={() => setShowForgot(true)} className="text-xs font-semibold transition-colors" style={{ color: "#FF5E3A" }}>¿Olvidaste tu contraseña?</button>
                      </div>
                    )}

                    {showForgot && <ForgotPasswordModal rol="cliente" onClose={() => setShowForgot(false)} />}

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
