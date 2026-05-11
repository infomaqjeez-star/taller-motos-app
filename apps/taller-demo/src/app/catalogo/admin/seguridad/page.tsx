"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/components/admin/AdminAuthContext";
import {
  Shield, ArrowLeft, Lock, Unlock, Check, AlertTriangle,
  RefreshCw, Eye, EyeOff, Copy, CheckCheck
} from "lucide-react";

export default function AdminSeguridadPage() {
  const router = useRouter();
  const { admin, getToken, logout } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<{ enabled: boolean; email: string } | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [manualKey, setManualKey] = useState("");
  const [code, setCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [step, setStep] = useState<"view" | "setup" | "confirm">("view");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!admin) {
      router.push("/catalogo/admin/login");
      return;
    }
    fetchStatus();
  }, [admin, router]);

  const authHeaders = () => {
    const token = getToken();
    return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  };

  const fetchStatus = async () => {
    const token = getToken();
    if (!token) { logout(); return; }
    try {
      const res = await fetch("/api/admin/me", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { logout(); return; }
      const data = await res.json();
      setStatus({ enabled: data.totp_enabled, email: data.email });
    } catch {
      logout();
    }
    setLoading(false);
  };

  const generateQR = async () => {
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/setup-2fa", { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Error"); setLoading(false); return; }
      setQrUrl(data.qrDataUrl);
      setManualKey(data.manualEntryKey);
      setStep("setup");
    } catch {
      setError("Error de red");
    }
    setLoading(false);
  };

  const confirm2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/confirm-2fa", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Error"); setLoading(false); return; }
      setSuccess("2FA activado correctamente");
      setStep("view");
      setQrUrl(null);
      setCode("");
    } catch {
      setError("Error de red");
    }
    setLoading(false);
  };

  const disable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/disable-2fa", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ code: disableCode }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Error"); setLoading(false); return; }
      setSuccess("2FA desactivado");
      setDisableCode("");
    } catch {
      setError("Error de red");
    }
    setLoading(false);
  };

  const copyKey = () => {
    navigator.clipboard.writeText(manualKey.replace(/\s/g, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!admin) return null;

  return (
    <main className="mx-auto max-w-xl px-4 py-8 pb-20">
      <button
        onClick={() => router.push("/catalogo/admin/pedidos")}
        className="mb-4 flex items-center gap-1 text-sm text-gray-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a pedidos
      </button>

      <div className="flex items-center gap-2 mb-2">
        <Shield className="h-6 w-6 text-orange-500" />
        <h1 className="text-2xl font-black text-white">Seguridad</h1>
      </div>
      <p className="text-sm text-gray-400 mb-6">
        Administra la autenticacion de dos factores (2FA) de tu cuenta.
      </p>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 mb-4 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400 mb-4 flex items-center gap-2">
          <Check className="h-4 w-4 shrink-0" /> {success}
        </div>
      )}

      {/* Estado actual */}
      <div className="rounded-2xl border border-white/5 p-6 mb-6" style={{ background: "linear-gradient(145deg, rgba(15,23,42,0.9), rgba(15,23,42,0.5))" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <Lock className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-white">Autenticacion de dos factores</h3>
              <p className="text-xs text-gray-400">
                {status?.enabled ? "Protegida con Google Authenticator" : "Sin proteccion adicional"}
              </p>
            </div>
          </div>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${status?.enabled ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"}`}>
            {status?.enabled ? "ACTIVADO" : "INACTIVO"}
          </span>
        </div>
      </div>

      {/* Setup QR */}
      {step === "setup" && qrUrl && (
        <div className="rounded-2xl border border-white/5 p-6 mb-6 space-y-4" style={{ background: "linear-gradient(145deg, rgba(15,23,42,0.9), rgba(15,23,42,0.5))" }}>
          <h3 className="font-bold text-white flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-orange-400" /> Configurar Google Authenticator
          </h3>

          <div className="flex flex-col items-center gap-4">
            <img src={qrUrl} alt="QR 2FA" className="rounded-xl border border-white/10" />
            <p className="text-xs text-gray-400 text-center">
              Escanea este QR con la app Google Authenticator
            </p>
          </div>

          <div className="rounded-xl bg-black/30 border border-white/5 p-3">
            <p className="text-xs text-gray-400 mb-1">Clave manual (si no podes escanear):</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm font-mono text-orange-400 break-all">{manualKey}</code>
              <button onClick={copyKey} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400">
                {copied ? <CheckCheck className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <form onSubmit={confirm2FA} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-400">Ingresa el codigo de 6 digitos de la app</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="input input-sm w-full text-center tracking-widest text-lg mt-1"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep("view")}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-gray-300 font-bold text-sm hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="flex-1 py-2.5 rounded-xl bg-[#FF5722] text-white font-bold text-sm hover:bg-[#E64A19] disabled:opacity-50"
              >
                {loading ? "Verificando…" : "Activar 2FA"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Acciones */}
      {step === "view" && (
        <div className="space-y-3">
          {!status?.enabled ? (
            <button
              onClick={generateQR}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#FF5722] px-4 py-3 font-bold text-white hover:bg-[#E64A19] disabled:opacity-50"
            >
              <Shield className="h-4 w-4" />
              {loading ? "Cargando…" : "Activar 2FA con Google Authenticator"}
            </button>
          ) : (
            <div className="rounded-2xl border border-white/5 p-6 space-y-4" style={{ background: "linear-gradient(145deg, rgba(15,23,42,0.9), rgba(15,23,42,0.5))" }}>
              <h3 className="font-bold text-white flex items-center gap-2">
                <Unlock className="h-4 w-4 text-red-400" /> Desactivar 2FA
              </h3>
              <p className="text-xs text-gray-400">
                Para desactivar, ingresa un codigo actual de Google Authenticator.
              </p>
              <form onSubmit={disable2FA} className="space-y-3">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="Codigo actual"
                  className="input input-sm w-full text-center tracking-widest"
                />
                <button
                  type="submit"
                  disabled={loading || disableCode.length !== 6}
                  className="w-full py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-bold text-sm hover:bg-red-500/20 disabled:opacity-50"
                >
                  {loading ? "Verificando…" : "Desactivar 2FA"}
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
