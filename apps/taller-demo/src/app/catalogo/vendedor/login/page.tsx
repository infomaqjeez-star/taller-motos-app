"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useVendedorAuth } from "@/components/vendedor/VendedorAuthContext";
import {
  ArrowLeft, Store, Eye, EyeOff, Wrench, TrendingUp,
  ShoppingBag, ChevronRight, Lock, Loader2, User, Mail, Phone,
  DollarSign, BarChart2,
} from "lucide-react";

export default function VendedorLoginPage() {
  const router = useRouter();
  const { login, register } = useVendedorAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [roleStep, setRoleStep] = useState<null | "vendedor">(null);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  return (
    <div
      className="min-h-screen flex flex-col lg:flex-row relative overflow-x-hidden"
      style={{ background: "#020617", color: "#e2e8f0" }}
    >
      {/* ── ORBES ANIMADOS ── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute rounded-full" style={{ top: "10%", left: "20%", width: 380, height: 380, background: "rgba(16,185,129,0.15)", filter: "blur(120px)", animation: "blob 7s infinite" }} />
        <div className="absolute rounded-full" style={{ top: "20%", right: "20%", width: 380, height: 380, background: "rgba(249,115,22,0.12)", filter: "blur(120px)", animation: "blob 7s infinite 2s" }} />
        <div className="absolute rounded-full" style={{ bottom: "-10%", left: "40%", width: 380, height: 380, background: "rgba(59,130,246,0.12)", filter: "blur(120px)", animation: "blob 7s infinite 4s" }} />
        <style>{`@keyframes blob{0%{transform:translate(0px,0px) scale(1)}33%{transform:translate(30px,-50px) scale(1.1)}66%{transform:translate(-20px,20px) scale(0.9)}100%{transform:translate(0px,0px) scale(1)}}`}</style>
      </div>

      {/* ══ COLUMNA IZQUIERDA (desktop) ══ */}
      <div
        className="hidden lg:flex lg:w-5/12 xl:w-1/2 relative flex-col justify-between p-12 overflow-hidden z-10"
        style={{ background: "rgba(2,6,23,0.5)", backdropFilter: "blur(8px)", borderRight: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="relative z-10">
          <Link href="/catalogo" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-semibold mb-12">
            <ArrowLeft className="h-4 w-4" /> Volver al catálogo
          </Link>
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 rounded-xl" style={{ background: "linear-gradient(to bottom right, #10b981, #059669)", boxShadow: "0 8px 20px rgba(16,185,129,0.2)" }}>
              <Wrench className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter">MAQ<span style={{ color: "#f97316" }}>JEEZ</span></h1>
          </div>
          <h2 className="text-3xl xl:text-4xl font-bold text-white leading-tight mb-4">
            Vendé más, ganá más con cada pedido.
          </h2>
          <p className="text-slate-300 text-lg max-w-md">
            Sumáte a la red de vendedores de MaqJeez y comenzá a generar ingresos compartiendo tu link de referido.
          </p>
        </div>

        <div className="relative z-10 space-y-4">
          {[
            { icon: <DollarSign className="h-5 w-5 text-emerald-400" />, bg: "rgba(16,185,129,0.15)", border: "rgba(16,185,129,0.25)", title: "Comisiones 10–15%", desc: "Ganás una comisión por cada pedido generado a través de tu link. Cuanto más vendés, más ganás." },
            { icon: <BarChart2 className="h-5 w-5 text-blue-400" />, bg: "rgba(59,130,246,0.15)", border: "rgba(59,130,246,0.25)", title: "Panel de ventas propio", desc: "Seguí tus ventas, comisiones pendientes y pagadas en tiempo real desde tu dashboard." },
          ].map((b) => (
            <div key={b.title} className="flex items-start gap-4 p-5 rounded-2xl" style={{ background: "rgba(15,23,42,0.5)", border: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(8px)" }}>
              <div className="p-2.5 rounded-lg shrink-0" style={{ background: b.bg, border: `1px solid ${b.border}` }}>{b.icon}</div>
              <div>
                <h3 className="text-white font-bold mb-1">{b.title}</h3>
                <p className="text-slate-400 text-sm">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="relative z-10 text-xs text-slate-500 font-medium">
          &copy; 2026 MaqJeez. Todos los derechos reservados.<br />Carlos Spegazzini, Buenos Aires, Argentina.
        </div>
      </div>

      {/* ══ COLUMNA DERECHA: FORMULARIO ══ */}
      <div className="w-full lg:w-7/12 xl:w-1/2 flex items-center justify-center p-4 sm:p-12 relative z-10 py-10">
        <div className="w-full max-w-[440px]">

          {/* Badge seguridad + back mobile */}
          <div className="mb-6 flex justify-between items-center">
            <Link href="/catalogo" className="lg:hidden inline-flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="h-4 w-4" /> Catálogo
            </Link>
            <div className="hidden lg:block" />
            <div className="flex items-center gap-1.5 text-xs text-slate-500 px-2.5 py-1 rounded-full" style={{ background: "rgba(15,23,42,0.6)", border: "1px solid #1e293b", backdropFilter: "blur(8px)" }}>
              <Lock className="h-3 w-3" /> Seguro
            </div>
          </div>

          {/* TARJETA GLASSMORPHISM */}
          <div
            className="rounded-[2rem] p-8 md:p-10 relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(15,23,42,0.75) 0%, rgba(15,23,42,0.35) 100%)",
              backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
              borderTop: "1px solid rgba(255,255,255,0.14)", borderLeft: "1px solid rgba(255,255,255,0.1)",
              borderRight: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.7)",
            }}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px pointer-events-none" style={{ background: "linear-gradient(to right, transparent, rgba(255,255,255,0.18), transparent)" }} />

            {/* Título */}
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(to bottom right, #10b981, #059669)", boxShadow: "0 8px 20px rgba(16,185,129,0.3)" }}>
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight mb-2">
                {roleStep === null ? "Crear cuenta" : isRegister ? "Registro vendedor" : "Bienvenido de nuevo"}
              </h1>
              <p className="text-sm text-slate-400 leading-relaxed">
                {roleStep === null
                  ? "Primer paso — elegí tu rol"
                  : isRegister
                  ? <>Registrate y comenzá a <strong className="text-emerald-400">ganar comisiones</strong> hoy.</>
                  : "Ingresá a tu cuenta de vendedor."}
              </p>
            </div>

            {/* ── SELECTOR DE ROL ── */}
            {roleStep === null && (
              <div className="space-y-3 mb-2">
                <button type="button" onClick={() => router.push("/catalogo/cliente/login")}
                  className="w-full flex items-center gap-4 rounded-2xl p-4 text-left transition-all hover:scale-[1.01]"
                  style={{ background: "linear-gradient(135deg, rgba(249,115,22,0.12), rgba(249,115,22,0.06))", border: "2px solid rgba(249,115,22,0.5)" }}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(249,115,22,0.2)", border: "1px solid rgba(249,115,22,0.4)" }}>
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

                <button type="button" onClick={() => { setRoleStep("vendedor"); setIsRegister(true); }}
                  className="w-full flex items-center gap-4 rounded-2xl p-4 text-left transition-all hover:scale-[1.01]"
                  style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.06))", border: "2px solid rgba(16,185,129,0.4)" }}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(16,185,129,0.2)", border: "1px solid rgba(16,185,129,0.4)" }}>
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
                  <button type="button" onClick={() => { setRoleStep("vendedor"); setIsRegister(false); }} className="text-emerald-400 font-bold hover:underline">Iniciá sesión</button>
                </p>
              </div>
            )}

            {/* ── FORMULARIO ── */}
            {roleStep === "vendedor" && (<>
              {/* Botón cambiar rol */}
              <button type="button" onClick={() => setRoleStep(null)} className="mb-4 flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors">
                <ArrowLeft className="h-3.5 w-3.5" /> Cambiar rol
              </button>

              {/* Toggle Ingresar / Registrarse */}
              <div className="p-1.5 rounded-xl flex mb-6 relative" style={{ background: "rgba(2,6,23,0.6)", border: "1px solid rgba(30,41,59,0.8)", backdropFilter: "blur(8px)" }}>
                <div className="absolute top-1.5 bottom-1.5 rounded-lg transition-all duration-300 ease-out" style={{ width: "calc(50% - 6px)", background: "#1e293b", border: "1px solid rgba(100,116,139,0.4)", left: !isRegister ? "6px" : "calc(50%)", boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }} />
                <button type="button" onClick={() => switchTab(false)} className="w-1/2 py-2 text-sm font-bold relative z-10 transition-colors" style={{ color: !isRegister ? "#fff" : "#94a3b8" }}>Ingresar</button>
                <button type="button" onClick={() => switchTab(true)} className="w-1/2 py-2 text-sm font-bold relative z-10 transition-colors" style={{ color: isRegister ? "#fff" : "#94a3b8" }}>Registrarse</button>
              </div>

              {error && (
                <p className="mb-4 px-3 py-2 rounded-lg text-sm text-red-400" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>{error}</p>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Nombre */}
                <div className="overflow-hidden transition-all duration-300" style={{ maxHeight: isRegister ? "80px" : "0", opacity: isRegister ? 1 : 0 }}>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
                    <input type="text" value={form.nombre} onChange={(e) => update("nombre", e.target.value)} required={isRegister} placeholder="Nombre completo"
                      className="w-full py-3.5 pl-12 pr-4 text-sm text-white placeholder-slate-500 rounded-xl outline-none transition-all"
                      style={{ background: "rgba(2,6,23,0.5)", border: "1px solid rgba(71,85,105,0.5)" }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "#10b981")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(71,85,105,0.5)")} />
                  </div>
                </div>

                {/* Email */}
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
                  <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required placeholder="Correo electrónico"
                    className="w-full py-3.5 pl-12 pr-4 text-sm text-white placeholder-slate-500 rounded-xl outline-none transition-all"
                    style={{ background: "rgba(2,6,23,0.5)", border: "1px solid rgba(71,85,105,0.5)" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#10b981")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(71,85,105,0.5)")} />
                </div>

                {/* Teléfono */}
                <div className="overflow-hidden transition-all duration-300" style={{ maxHeight: isRegister ? "80px" : "0", opacity: isRegister ? 1 : 0 }}>
                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
                    <input type="tel" value={form.telefono} onChange={(e) => update("telefono", e.target.value)} placeholder="Teléfono (Opcional)"
                      className="w-full py-3.5 pl-12 pr-4 text-sm text-white placeholder-slate-500 rounded-xl outline-none transition-all"
                      style={{ background: "rgba(2,6,23,0.5)", border: "1px solid rgba(71,85,105,0.5)" }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "#10b981")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(71,85,105,0.5)")} />
                  </div>
                </div>

                {/* DNI/CUIT */}
                <div className="overflow-hidden transition-all duration-300" style={{ maxHeight: isRegister ? "90px" : "0", opacity: isRegister ? 1 : 0 }}>
                  <div className="relative group">
                    <Store className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
                    <input type="text" value={form.dni_cuit} onChange={(e) => update("dni_cuit", e.target.value)} required={isRegister} placeholder="DNI o CUIT"
                      className="w-full py-3.5 pl-12 pr-4 text-sm text-white placeholder-slate-500 rounded-xl outline-none transition-all"
                      style={{ background: "rgba(2,6,23,0.5)", border: "1px solid rgba(71,85,105,0.5)" }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "#10b981")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(71,85,105,0.5)")} />
                  </div>
                  <p className="mt-1 text-[10px] text-slate-600 pl-1">No podés registrar el mismo DNI/CUIT en otra cuenta de vendedor.</p>
                </div>

                {/* Contraseña */}
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
                  <input type={showPass ? "text" : "password"} value={form.password} onChange={(e) => update("password", e.target.value)} required placeholder="Contraseña"
                    className="w-full py-3.5 pl-12 pr-12 text-sm text-white placeholder-slate-500 rounded-xl outline-none transition-all"
                    style={{ background: "rgba(2,6,23,0.5)", border: "1px solid rgba(71,85,105,0.5)" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#10b981")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(71,85,105,0.5)")} />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {/* Confirmar contraseña */}
                <div className="overflow-hidden transition-all duration-300" style={{ maxHeight: isRegister ? "80px" : "0", opacity: isRegister ? 1 : 0 }}>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
                    <input type="password" value={form.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)} required={isRegister} placeholder="Repetí la contraseña"
                      className="w-full py-3.5 pl-12 pr-4 text-sm text-white placeholder-slate-500 rounded-xl outline-none transition-all"
                      style={{ background: "rgba(2,6,23,0.5)", border: "1px solid rgba(71,85,105,0.5)" }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "#10b981")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(71,85,105,0.5)")} />
                  </div>
                </div>

                {/* Submit */}
                <button type="submit" disabled={loading}
                  className="w-full font-bold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
                  style={{ background: "linear-gradient(to right, #10b981, #059669)", color: "#fff", boxShadow: "0 10px 20px -10px rgba(16,185,129,0.5)", border: "1px solid rgba(16,185,129,0.4)" }}
                  onMouseEnter={(e) => !loading && ((e.currentTarget as HTMLElement).style.transform = "translateY(-1px)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.transform = "translateY(0)")}>
                  {loading
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> {isRegister ? "Registrando…" : "Ingresando…"}</>
                    : <>{isRegister ? "Crear cuenta" : "Ingresar"} <ChevronRight className="h-4 w-4" /></>}
                </button>
              </form>
            </>)}

          </div>
        </div>
      </div>
    </div>
  );
}
