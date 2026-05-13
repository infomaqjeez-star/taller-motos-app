"use client";

import { useState } from "react";
import { X, Mail, Loader2, CheckCircle, AlertTriangle, KeyRound } from "lucide-react";

interface Props {
  rol: "cliente" | "vendedor" | "admin";
  onClose: () => void;
}

export default function ForgotPasswordModal({ rol, onClose }: Props) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), rol }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al enviar el email.");
        return;
      }
      setSent(true);
    } catch {
      setError("Error de red. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 space-y-5"
        style={{ background: "#0a0b10", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 25px 50px rgba(0,0,0,0.8)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,94,58,0.12)", border: "1px solid rgba(255,94,58,0.25)" }}>
              <KeyRound className="h-4 w-4" style={{ color: "#FF5E3A" }} />
            </div>
            <div>
              <p className="font-black text-white text-sm">Olvidé mi contraseña</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Te enviamos un link por email</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white transition-colors"
            style={{ background: "rgba(255,255,255,0.04)" }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!sent ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs text-gray-400 leading-relaxed">
              Ingresá el email de tu cuenta y te enviamos un link para crear una nueva contraseña.
              El link expira en <span className="text-white font-semibold">1 hora</span>.
            </p>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs text-red-400"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {error}
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="tu@email.com"
                className="w-full pl-10 pr-3 py-3 rounded-xl text-sm text-white placeholder-gray-600 outline-none"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-extrabold text-sm text-white transition-all disabled:opacity-50"
              style={{ background: "#FF5E3A" }}
            >
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando…</> : "Enviar link de recuperación"}
            </button>
          </form>
        ) : (
          <div className="flex flex-col items-center text-center gap-3 py-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "rgba(0,255,102,0.08)", border: "1px solid rgba(0,255,102,0.25)" }}>
              <CheckCircle className="h-7 w-7" style={{ color: "#00FF66" }} />
            </div>
            <div>
              <p className="font-black text-white text-sm mb-1">¡Email enviado!</p>
              <p className="text-xs text-gray-400 leading-relaxed">
                Si <span className="text-white font-semibold">{email}</span> está registrado, vas a recibir un link en los próximos minutos.
              </p>
            </div>
            <p className="text-[10px] text-gray-600">Revisá también la carpeta de spam.</p>
            <button onClick={onClose} className="text-sm font-bold mt-1" style={{ color: "#FF5E3A" }}>
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
