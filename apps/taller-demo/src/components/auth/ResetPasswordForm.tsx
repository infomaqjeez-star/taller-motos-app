"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, Eye, EyeOff, CheckCircle, AlertTriangle, Loader2, ArrowLeft, KeyRound } from "lucide-react";

interface Props {
  rol: "cliente" | "vendedor" | "admin";
  loginUrl: string;
}

type Stage = "validating" | "invalid" | "form" | "success";

export default function ResetPasswordForm({ rol, loginUrl }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [stage, setStage] = useState<Stage>("validating");
  const [emailMask, setEmailMask] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [invalidMsg, setInvalidMsg] = useState("");

  useEffect(() => {
    if (!token) {
      setStage("invalid");
      setInvalidMsg("No se encontró el token de recuperación. Solicitá un nuevo link.");
      return;
    }

    fetch(`/api/auth/reset-password?token=${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.valid) {
          // Enmascarar email: john@example.com → j***@example.com
          const parts = data.email.split("@");
          const masked = parts[0].charAt(0) + "***@" + parts[1];
          setEmailMask(masked);
          setStage("form");
        } else {
          setInvalidMsg(data.error || "El link es inválido o ya expiró.");
          setStage("invalid");
        }
      })
      .catch(() => {
        setInvalidMsg("Error de red. Intentá de nuevo.");
        setStage("invalid");
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al restablecer la contraseña.");
        return;
      }
      setStage("success");
      setTimeout(() => router.push(loginUrl), 3000);
    } catch {
      setError("Error de red. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const rolLabel = { cliente: "Cliente", vendedor: "Vendedor", admin: "Admin" }[rol];

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16"
      style={{ background: "linear-gradient(135deg, #080c16 0%, #0a0f1e 100%)" }}>

      <div className="w-full max-w-md">
        {/* Back */}
        <Link href={loginUrl}
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" /> Volver al login
        </Link>

        {/* Card */}
        <div className="rounded-2xl p-8" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 25px 50px rgba(0,0,0,0.5)" }}>

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,94,58,0.12)", border: "1px solid rgba(255,94,58,0.25)" }}>
              <KeyRound className="h-5 w-5" style={{ color: "#FF5E3A" }} />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">Nueva contraseña</h1>
              <p className="text-xs text-gray-500 mt-0.5">{rolLabel} · MaqJeez</p>
            </div>
          </div>

          {/* VALIDATING */}
          {stage === "validating" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#FF5E3A" }} />
              <p className="text-sm text-gray-400">Validando link…</p>
            </div>
          )}

          {/* INVALID */}
          {stage === "invalid" && (
            <div className="space-y-5">
              <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-red-400 mb-1">Link inválido o expirado</p>
                  <p className="text-xs text-red-300/70">{invalidMsg}</p>
                </div>
              </div>
              <Link href={loginUrl}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-sm text-white transition-colors"
                style={{ background: "#FF5E3A" }}>
                Ir al login y solicitar nuevo link
              </Link>
            </div>
          )}

          {/* FORM */}
          {stage === "form" && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <p className="text-sm text-gray-400 -mt-2 mb-1">
                Creá una nueva contraseña para <span className="text-white font-semibold">{emailMask}</span>
              </p>

              {error && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-red-400"
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">
                  Nueva contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full pl-10 pr-10 py-3 rounded-xl text-sm text-white placeholder-gray-600 outline-none transition-colors"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    placeholder="Repetí la contraseña"
                    className="w-full pl-10 pr-10 py-3 rounded-xl text-sm text-white placeholder-gray-600 outline-none transition-colors"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: `1px solid ${confirm && confirm !== password ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.08)"}`,
                    }}
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirm && confirm !== password && (
                  <p className="text-[10px] text-red-400 mt-1">Las contraseñas no coinciden</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !password || !confirm}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-extrabold text-sm text-white transition-all disabled:opacity-50"
                style={{ background: "#FF5E3A" }}>
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando…</> : "Restablecer contraseña"}
              </button>
            </form>
          )}

          {/* SUCCESS */}
          {stage === "success" && (
            <div className="flex flex-col items-center text-center gap-4 py-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "rgba(0,255,102,0.1)", border: "1px solid rgba(0,255,102,0.3)" }}>
                <CheckCircle className="h-8 w-8" style={{ color: "#00FF66" }} />
              </div>
              <div>
                <p className="text-lg font-black text-white mb-1">¡Contraseña actualizada!</p>
                <p className="text-sm text-gray-400">Te redirigimos al login en unos segundos…</p>
              </div>
              <Link href={loginUrl}
                className="text-sm font-bold transition-colors"
                style={{ color: "#FF5E3A" }}>
                Ir al login ahora
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
