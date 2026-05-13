"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useVendedorAuth } from "@/components/vendedor/VendedorAuthContext";
import { Store, ArrowLeft, Eye, EyeOff, ShoppingBag, TrendingUp, ChevronRight } from "lucide-react";

export default function VendedorLoginPage() {
  const router = useRouter();
  const { login, register } = useVendedorAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [roleStep, setRoleStep] = useState<null | "vendedor">(null);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    nombre: "",
    email: "",
    telefono: "",
    dni_cuit: "",
    password: "",
    confirmPassword: "",
  });

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (isRegister) {
      if (!form.nombre || !form.email || !form.password) {
        setError("Completa todos los campos obligatorios");
        setLoading(false);
        return;
      }
      if (form.password !== form.confirmPassword) {
        setError("Las contraseñas no coinciden");
        setLoading(false);
        return;
      }
      const res = await register({
        nombre: form.nombre,
        email: form.email,
        telefono: form.telefono,
        dni_cuit: form.dni_cuit,
        password: form.password,
      });
      if (res.error) {
        setError(res.error);
        setLoading(false);
        return;
      }
      // Auto login after register
      const loginRes = await login(form.email, form.password);
      if (loginRes.error) {
        setError(loginRes.error);
        setLoading(false);
        return;
      }
      router.push("/catalogo/vendedor/dashboard");
    } else {
      const res = await login(form.email, form.password);
      if (res.error) {
        setError(res.error);
        setLoading(false);
        return;
      }
      router.push("/catalogo/vendedor/dashboard");
    }
  };

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <button
        onClick={() => roleStep === "vendedor" ? setRoleStep(null) : router.push("/catalogo")}
        className="mb-6 flex items-center gap-1 text-sm text-gray-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        {roleStep === "vendedor" ? "Cambiar rol" : "Volver al catálogo"}
      </button>

      {/* ── SELECTOR DE ROL ── */}
      {roleStep === null && (
        <div>
          <div className="flex items-center gap-2 text-[#FDB71A] mb-2">
            <Store className="h-7 w-7" />
            <h1 className="text-2xl font-black text-white">Crear cuenta</h1>
          </div>
          <p className="text-sm text-gray-400 mb-6">Primer paso: elige cómo querés usar MaqJeez</p>

          <div className="space-y-3">
            {/* Comprador */}
            <button
              type="button"
              onClick={() => router.push("/catalogo/cliente/login")}
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
                <p className="text-xs text-gray-400 mt-0.5">Quiero comprar repuestos con descuentos exclusivos</p>
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
              onClick={() => setRoleStep("vendedor")}
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
                <p className="text-xs text-gray-400 mt-0.5">Quiero vender y ganar comisiones por cada pedido</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(16,185,129,0.15)", color: "#34d399", border: "1px solid rgba(16,185,129,0.3)" }}>Comisiones 10-15%</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(16,185,129,0.15)", color: "#34d399", border: "1px solid rgba(16,185,129,0.3)" }}>Panel de ventas</span>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-emerald-400 shrink-0" />
            </button>

            <p className="text-center text-xs text-gray-500 pt-1">
              ¿Ya tenés cuenta?{" "}
              <button type="button" onClick={() => { setRoleStep("vendedor"); setIsRegister(false); }}
                className="text-[#FDB71A] font-bold hover:underline">Ingresá</button>
            </p>
          </div>
        </div>
      )}

      {/* ── FORMULARIO (solo si ya eligió vendedor) ── */}
      {roleStep === "vendedor" && (
      <>
      <div className="flex items-center gap-2 text-[#FDB71A]">
        <Store className="h-7 w-7" />
        <h1 className="text-2xl font-black text-white">
          {isRegister ? "Registro de vendedor" : "Área de vendedores"}
        </h1>
      </div>
      <p className="mt-2 text-sm text-gray-400">
        {isRegister
          ? "Creá tu cuenta para empezar a vender y ganar comisiones."
          : "Ingresá para ver tus ventas, comisiones y compartir tu link de referido."}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {isRegister && (
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">Nombre completo *</label>
            <input
              className="input input-sm w-full"
              value={form.nombre}
              onChange={(e) => update("nombre", e.target.value)}
              placeholder="Ej: Juan Pérez"
            />
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-400">Email *</label>
          <input
            type="email"
            className="input input-sm w-full"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="tu@email.com"
          />
        </div>

        {isRegister && (
          <>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-400">Teléfono</label>
              <input
                className="input input-sm w-full"
                value={form.telefono}
                onChange={(e) => update("telefono", e.target.value)}
                placeholder="11 2345 6789"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-400">DNI o CUIT *</label>
              <input
                required
                className="input input-sm w-full"
                value={form.dni_cuit}
                onChange={(e) => update("dni_cuit", e.target.value)}
                placeholder="Ej: 20333444556 o 33344455"
              />
              <p className="mt-1 text-[10px] text-gray-500">
                No podés registrar el mismo DNI/CUIT en otra cuenta de vendedor.
              </p>
            </div>
          </>
        )}

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-400">Contraseña *</label>
          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              className="input input-sm w-full pr-10"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              placeholder="Mínimo 6 caracteres"
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
            >
              {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {isRegister && (
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">Confirmar contraseña *</label>
            <input
              type="password"
              className="input input-sm w-full"
              value={form.confirmPassword}
              onChange={(e) => update("confirmPassword", e.target.value)}
              placeholder="Repetí la contraseña"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF5722] px-4 py-3 font-bold text-white hover:bg-[#E64A19] disabled:opacity-50"
        >
          {loading ? "Cargando…" : isRegister ? "Crear cuenta" : "Ingresar"}
        </button>
      </form>

      <div className="mt-4 text-center">
        <button
          onClick={() => {
            setIsRegister(!isRegister);
            setError("");
          }}
          className="text-sm text-[#FDB71A] hover:underline"
        >
          {isRegister ? "¿Ya tenés cuenta? Ingresá" : "¿No tenés cuenta? Registrate"}
        </button>
      </div>
      </>
      )}
    </main>
  );
}
