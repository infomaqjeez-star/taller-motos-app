"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useClienteAuth } from "@/components/cliente/ClienteAuthContext";
import { ArrowLeft, User, Mail, Phone, Lock, Loader2, Users } from "lucide-react";

export default function ClienteLoginPage() {
  const router = useRouter();
  const { login, register } = useClienteAuth();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [password, setPassword] = useState("");

  // Detectar vendedor referente del localStorage
  const [refInfo, setRefInfo] = useState<{ codigo: string; nombre: string; vendedor_id: string } | null>(null);

  useEffect(() => {
    const codigo = localStorage.getItem("ref_codigo");
    const nombre = localStorage.getItem("ref_nombre");
    const vendedor_id = localStorage.getItem("ref_vendedor_id");
    if (codigo && nombre && vendedor_id) {
      setRefInfo({ codigo, nombre, vendedor_id });
    }
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
          password,
          vendedor_referente_id: refInfo?.vendedor_id,
        });
      }
      router.push("/catalogo");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <Link href="/catalogo" className="mb-6 flex items-center gap-1 text-sm text-gray-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" />
        Volver al catálogo
      </Link>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h1 className="text-xl font-black text-white">{tab === "login" ? "Iniciar sesión" : "Crear cuenta"}</h1>
        <p className="mt-1 text-sm text-gray-400">
          {tab === "login"
            ? "Accedé a tu cuenta para obtener un 3% de descuento adicional."
            : "Registrate y obtené un 3% de descuento en todas las compras."}
        </p>

        {/* Tabs */}
        <div className="mt-4 flex rounded-lg bg-white/5 p-1">
          <button
            onClick={() => { setTab("login"); setError(""); }}
            className={`flex-1 rounded-md py-2 text-sm font-semibold transition-colors ${
              tab === "login" ? "bg-[#FF5722] text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            Ingresar
          </button>
          <button
            onClick={() => { setTab("register"); setError(""); }}
            className={`flex-1 rounded-md py-2 text-sm font-semibold transition-colors ${
              tab === "register" ? "bg-[#FF5722] text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            Registrarse
          </button>
        </div>

        {/* Banner vendedor referente */}
      {tab === "register" && refInfo && (
        <div className="mt-4 rounded-xl border border-[#39FF14]/30 bg-[#39FF14]/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[#39FF14]" />
            <p className="text-sm text-gray-300">
              Te referencia el vendedor{" "}
              <span className="font-bold text-[#39FF14]">{refInfo.nombre}</span>{" "}
              ({refInfo.codigo})
            </p>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Al registrarte, vas a estar asociado a este vendedor para futuras compras.
          </p>
        </div>
      )}

      {error && (
          <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          {tab === "register" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-400">Nombre completo</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                  className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-sm text-white placeholder-gray-500 focus:border-[#FF5722] focus:outline-none"
                  placeholder="Juan Pérez"
                />
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-sm text-white placeholder-gray-500 focus:border-[#FF5722] focus:outline-none"
                placeholder="tu@email.com"
              />
            </div>
          </div>

          {tab === "register" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-400">Teléfono (opcional)</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-sm text-white placeholder-gray-500 focus:border-[#FF5722] focus:outline-none"
                  placeholder="+54 11 2345 6789"
                />
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-sm text-white placeholder-gray-500 focus:border-[#FF5722] focus:outline-none"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF5722] py-3 font-bold text-white hover:bg-[#E64A19] disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {tab === "login" ? "Ingresando…" : "Registrando…"}
              </>
            ) : (
              tab === "login" ? "Iniciar sesión" : "Crear cuenta"
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
