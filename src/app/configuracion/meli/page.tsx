"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle, XCircle, RefreshCw, ExternalLink,
  ShieldCheck, Zap, ArrowLeft, User, Clock, Pencil, Check,
  Plus, Trash2, Power
} from "lucide-react";
import { supabase } from "@/lib/supabase";

// ── Tipos ──────────────────────────────────────────────────────
interface LinkedAccount {
  id: string;
  user_id: string;
  meli_user_id: string;
  meli_nickname: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  token_status: 'valid' | 'expiring_soon' | 'expired';
}

// ── Helpers ────────────────────────────────────────────────────
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "hace un momento";
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} días`;
}

function getTokenStatusColor(status: string): string {
  switch (status) {
    case 'valid': return 'text-green-400 bg-green-500/15';
    case 'expiring_soon': return 'text-yellow-400 bg-yellow-500/15';
    case 'expired': return 'text-red-400 bg-red-500/15';
    default: return 'text-gray-400 bg-gray-500/15';
  }
}

function getTokenStatusText(status: string): string {
  switch (status) {
    case 'valid': return 'Token válido';
    case 'expiring_soon': return 'Expira pronto';
    case 'expired': return 'Token expirado';
    default: return 'Desconocido';
  }
}

// ── Componente interno ─────────────────────────────────────────
function ConfigMeliContent() {
  const params = useSearchParams();
  const status = params.get("status");
  const userId = params.get("user_id");
  const nickname = params.get("nickname");
  const message = params.get("message");

  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  // Obtener usuario actual de Supabase Auth
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      } else {
        // Redirigir al login si no hay sesión
        window.location.href = "/login?redirect=/configuracion/meli";
      }
    };
    getUser();
  }, []);

  // Cargar cuentas vinculadas
  const loadAccounts = async () => {
    if (!currentUserId) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/linked-accounts?user_id=${currentUserId}`);
      const data = await res.json();
      if (data.accounts) setAccounts(data.accounts);
    } catch (err) {
      console.error("Error cargando cuentas:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAccounts();
    if (status === "success") {
      showToast(`Cuenta @${nickname || userId} vinculada correctamente`);
    }
    if (status === "error") {
      showToast(`Error: ${message || "desconocido"}`, false);
    }
  }, [currentUserId]);

  // Iniciar OAuth vinculación
  const handleLinkAccount = () => {
    if (!currentUserId) {
      showToast("Debes iniciar sesión primero", false);
      return;
    }
    window.location.href = `/api/auth/login?user_id=${currentUserId}`;
  };

  // Desactivar cuenta
  const handleDeactivate = async (accountId: string, meliNickname: string) => {
    if (!confirm(`¿Desactivar la cuenta @${meliNickname}? Los datos se mantienen pero no se sincronizarán.`)) return;
    
    try {
      const res = await fetch("/api/linked-accounts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_id: accountId, user_id: currentUserId }),
      });
      
      if (!res.ok) throw new Error("Error al desactivar");
      showToast(`@${meliNickname} desactivada`);
      loadAccounts();
    } catch {
      showToast("Error al desactivar", false);
    }
  };

  // Eliminar cuenta
  const handleDelete = async (accountId: string, meliNickname: string) => {
    if (!confirm(`¿ELIMINAR permanentemente @${meliNickname}? No se puede deshacer.`)) return;
    
    try {
      const res = await fetch("/api/linked-accounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_id: accountId, user_id: currentUserId }),
      });
      
      if (!res.ok) throw new Error("Error al eliminar");
      showToast(`@${meliNickname} eliminada`);
      loadAccounts();
    } catch {
      showToast("Error al eliminar", false);
    }
  };

  // Renombrar cuenta (client-side only por ahora)
  const handleRename = async (accountId: string) => {
    // TODO: Implementar renombrado vía API
    setEditing(null);
    showToast("Función de renombrado en desarrollo");
  };

  return (
    <div className="min-h-screen pb-24" style={{ background: "#121212" }}>
      {/* Header */}
      <div className="sticky top-0 z-30 px-4 py-4 flex items-center gap-3 border-b border-white/10"
        style={{ background: "rgba(18,18,18,0.95)", backdropFilter: "blur(12px)" }}>
        <Link href="/" className="p-2 rounded-xl hover:bg-white/10 text-gray-400">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-base font-black text-white">Mis Cuentas MeLi</h1>
          <p className="text-xs text-gray-500">Vincula múltiples cuentas de Mercado Libre</p>
        </div>
        <a
          href="https://web-production-86c137.up.railway.app/"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
          style={{ background: "#FF572222", color: "#FF5722", border: "1px solid #FF572244" }}
        >
          Ir al Panel →
        </a>
      </div>

      <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
        {/* Banner resultado OAuth */}
        {status === "success" && (
          <div className="flex items-center gap-3 p-4 rounded-2xl border border-green-500/30"
            style={{ background: "rgba(57,255,20,0.08)" }}>
            <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-green-400">¡Cuenta vinculada exitosamente!</p>
              <p className="text-xs text-gray-400 mt-0.5">{nickname ? `@${nickname}` : `ID: ${userId}`}</p>
            </div>
          </div>
        )}
        {status === "error" && (
          <div className="flex items-center gap-3 p-4 rounded-2xl border border-red-500/30"
            style={{ background: "rgba(255,50,50,0.08)" }}>
            <XCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-red-400">Error al vincular</p>
              <p className="text-xs text-gray-400 mt-0.5">{message || "Intentá de nuevo"}</p>
            </div>
          </div>
        )}

        {/* Botón vincular nueva cuenta */}
        <div className="rounded-2xl border border-white/10 p-5 space-y-4"
          style={{ background: "#1a1a1a" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFE600] flex items-center justify-center flex-shrink-0">
              <span className="text-[#003087] font-black text-[9px] leading-tight text-center">
                mercado<br/>libre
              </span>
            </div>
            <div>
              <p className="text-sm font-black text-white">Vincular Nueva Cuenta</p>
              <p className="text-xs text-gray-500">Conecta otra cuenta de vendedor</p>
            </div>
          </div>

          <button
            onClick={handleLinkAccount}
            disabled={!currentUserId}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-all disabled:opacity-50"
            style={{ background: "#FFE600", color: "#003087", boxShadow: "0 0 20px rgba(255,230,0,0.30)" }}
          >
            <Plus className="w-4 h-4" />
            Vincular Cuenta MeLi
          </button>

          <div className="flex items-center gap-4 pt-1">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
              Conexión cifrada
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Zap className="w-3.5 h-3.5 text-yellow-500" />
              Renovación automática
            </div>
          </div>
        </div>

        {/* Lista de cuentas vinculadas */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-black text-white">Cuentas Vinculadas ({accounts.length})</p>
            <button onClick={loadAccounts}
              className="p-2 rounded-lg hover:bg-white/10 text-gray-500">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-600 text-sm">Cargando...</div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-10 rounded-2xl border border-white/5"
              style={{ background: "#1a1a1a" }}>
              <User className="w-10 h-10 text-gray-700 mx-auto mb-2" />
              <p className="text-gray-500 text-sm font-semibold">Sin cuentas vinculadas</p>
              <p className="text-gray-600 text-xs mt-1">Vinculá tu primera cuenta MeLi arriba</p>
            </div>
          ) : (
            <div className="space-y-3">
              {accounts.map((acc) => (
                <div key={acc.id}
                  className="rounded-2xl border p-4 space-y-3"
                  style={{
                    background: "#1a1a1a",
                    borderColor: acc.token_status === 'valid' 
                      ? "rgba(57,255,20,0.20)" 
                      : "rgba(255,80,80,0.20)",
                  }}>
                  {/* Cabecera */}
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#FFE600] flex items-center justify-center flex-shrink-0">
                      <span className="text-[#003087] font-black text-[7px]">ML</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      {editing === acc.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleRename(acc.id)}
                            className="text-sm font-black text-white bg-transparent border-b border-yellow-400 outline-none w-full"
                            autoFocus
                          />
                          <button onClick={() => handleRename(acc.id)} className="p-1 rounded hover:bg-white/10">
                            <Check className="w-4 h-4 text-green-400" />
                          </button>
                          <button onClick={() => setEditing(null)} className="p-1 rounded hover:bg-white/10">
                            <XCircle className="w-3.5 h-3.5 text-gray-500" />
                          </button>
                        </div>
                      ) : (
                        <p className="text-sm font-black text-white truncate flex items-center gap-1.5">
                          @{acc.meli_nickname}
                          <button
                            onClick={() => { setEditing(acc.id); setEditName(acc.meli_nickname); }}
                            className="p-0.5 rounded hover:bg-white/10"
                          >
                            <Pencil className="w-3 h-3 text-gray-500" />
                          </button>
                        </p>
                      )}
                      <p className="text-xs text-gray-500">ID MeLi: {acc.meli_user_id}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getTokenStatusColor(acc.token_status)}`}>
                      {getTokenStatusText(acc.token_status)}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Vinculada {timeAgo(acc.created_at)}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Reconectar si token expirado */}
                    {(acc.token_status === 'expired' || acc.token_status === 'expiring_soon') && (
                      <button
                        onClick={handleLinkAccount}
                        className="text-xs text-yellow-400 hover:text-yellow-300 font-semibold flex items-center gap-1"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Reconectar
                      </button>
                    )}
                    
                    {/* Desactivar */}
                    <button
                      onClick={() => handleDeactivate(acc.id, acc.meli_nickname)}
                      className="text-xs text-orange-400 hover:text-orange-300 font-semibold flex items-center gap-1"
                    >
                      <Power className="w-3.5 h-3.5" /> Desactivar
                    </button>
                    
                    {/* Eliminar */}
                    <button
                      onClick={() => handleDelete(acc.id, acc.meli_nickname)}
                      className="text-xs text-red-500 hover:text-red-400 font-semibold flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Botón volver al panel */}
        <a
          href="https://web-production-86c137.up.railway.app/"
          className="flex items-center justify-center gap-2 text-sm font-bold px-4 py-3 rounded-2xl w-full transition-opacity hover:opacity-80"
          style={{ background: "#FFE60018", color: "#FFE600", border: "1px solid #FFE60033" }}
        >
          🏠 Inicio Maqjeez
        </a>

        {/* Info de seguridad */}
        <div className="rounded-2xl border border-white/5 p-4" style={{ background: "#161616" }}>
          <p className="text-xs font-bold text-gray-400 mb-2 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-green-500" /> Seguridad Multi-Cuenta
          </p>
          <ul className="space-y-1 text-xs text-gray-600">
            <li>• Cada usuario MaqJeez puede vincular múltiples cuentas MeLi</li>
            <li>• Los datos están aislados entre usuarios de la plataforma</li>
            <li>• Tokens encriptados con AES-256-GCM</li>
            <li>• Renovación automática cada 50 minutos</li>
          </ul>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-white shadow-xl ${toast.ok ? "bg-green-700" : "bg-red-700"}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ── Página exportada con Suspense boundary ─────────────────────
export default function ConfigMeliPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#121212" }}>
        <p className="text-gray-500 text-sm">Cargando...</p>
      </div>
    }>
      <ConfigMeliContent />
    </Suspense>
  );
}
