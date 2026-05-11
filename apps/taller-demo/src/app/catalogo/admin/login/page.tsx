"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/components/admin/AdminAuthContext";
import { Shield, ArrowLeft, Eye, EyeOff } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const { login } = useAdminAuth();
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ email: "", password: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await login(form.email, form.password);
    if (res.error) {
      setError(res.error);
      setLoading(false);
      return;
    }

    router.push("/catalogo/admin/pedidos");
  };

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <button
        onClick={() => router.push("/catalogo")}
        className="mb-6 flex items-center gap-1 text-sm text-gray-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al catálogo
      </button>

      <div className="flex items-center gap-2 text-[#FF5722]">
        <Shield className="h-8 w-8" />
        <h1 className="text-2xl font-black text-white">Admin Catalogo</h1>
      </div>
      <p className="mt-2 text-sm text-gray-400">
        Acceso exclusivo para administradores de Maqjeez.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-400">Email *</label>
          <input
            type="email"
            className="input input-sm w-full"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="admin@maqjeez.com"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-400">Contraseña *</label>
          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              className="input input-sm w-full pr-10"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Tu contraseña"
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

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF5722] px-4 py-3 font-bold text-white hover:bg-[#E64A19] disabled:opacity-50"
        >
          {loading ? "Cargando…" : "Ingresar"}
        </button>
      </form>
    </main>
  );
}
