"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MessageCircle, MessageSquare, Truck, Tag, TrendingUp,
  Star, AlertTriangle, CheckCircle, CheckCircle2, RefreshCw, Settings,
  ChevronDown, ChevronUp, ShoppingCart, DollarSign,
  Package, Clock, XCircle, BarChart2, ExternalLink,
  Bell, Store, Menu, X, Copy, Pencil, Check, Zap,
  LogOut, User, Mail, Lock, Eye, EyeOff, Shield, AlertCircle, Home
} from "lucide-react";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { useNotificationStream } from "@/hooks/useNotificationStream";
import { supabase } from "@/lib/supabase";
import AccountSelector from "@/components/AccountSelector";
import AccountDetailsPanel from "@/components/AccountDetailsPanel";
import UnifiedPostSalePanel from "@/components/UnifiedPostSalePanel";
import KpiBar from "@/components/KpiBar";

interface Reputation {
  level_id: string | null;
  power_seller_status: string | null;
  transactions_total: number;
  transactions_completed: number;
  ratings_positive: number;
  ratings_negative: number;
  ratings_neutral: number;
  delayed_handling_time: number;
  claims: number;
  cancellations: number;
  immediate_payment: boolean;
}

interface AccountDash {
  account: string;
  meli_user_id: string;
  unanswered_questions: number;
  pending_messages: number;
  ready_to_ship: number;
  total_items: number;
  today_orders: number;
  today_sales_amount: number;
  claims_count: number;
  measurement_date: string;
  metrics_period: string;
  reputation: Reputation;
  error?: string;
}

function fmt(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
}

function pct(n: number) { return `${(n * 100).toFixed(1)}%`; }

const LEVEL_COLORS: Record<string, string> = {
  "1_red":       "#ef4444",
  "2_orange":    "#FF5722",
  "3_yellow":    "#FFE600",
  "4_light_green": "#7CFC00",
  "5_green":     "#39FF14",
};
const LEVEL_LABELS: Record<string, string> = {
  "1_red":       "Rojo",
  "2_orange":    "Naranja",
  "3_yellow":    "Amarillo",
  "4_light_green": "Verde claro",
  "5_green":     "Verde",
};

function RepoBadge({ level }: { level: string | null }) {
  if (!level) return <span className="text-xs text-gray-500">Sin datos</span>;
  const color = LEVEL_COLORS[level] ?? "#6B7280";
  const label = LEVEL_LABELS[level] ?? level;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
      style={{ background: color + "22", color, border: `1px solid ${color}44` }}
    >
      <Star className="w-3 h-3" /> {label}
    </span>
  );
}

function MetricCard({
  icon, label, value, color, sublabel, urgent,
}: {
  icon: React.ReactNode; label: string; value: number | string;
  color: string; sublabel?: string; urgent?: boolean;
}) {
  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-2 relative overflow-hidden"
      style={{
        background: urgent && Number(value) > 0 ? color + "18" : "#1F1F1F",
        border: `1px solid ${urgent && Number(value) > 0 ? color + "55" : "rgba(255,255,255,0.07)"}`,
      }}
    >
      {urgent && Number(value) > 0 && (
        <span
          className="absolute top-2 right-2 w-2 h-2 rounded-full animate-pulse"
          style={{ background: color }}
        />
      )}
      <div className="flex items-center gap-2" style={{ color }}>
        {icon}
        <span className="text-xs font-semibold text-gray-400">{label}</span>
      </div>
      <p className="text-3xl font-black" style={{ color: Number(value) > 0 && urgent ? color : "#fff" }}>
        {value}
      </p>
      {sublabel && <p className="text-[10px]" style={{ color: "#6B7280" }}>{sublabel}</p>}
    </div>
  );
}

function RepuCard({ rep }: { rep: Reputation }) {
  const good = rep.level_id === "5_green" || rep.level_id === "4_light_green";
  return (
    <div className="rounded-2xl p-4" style={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Star className="w-4 h-4" style={{ color: "#FFE600" }} /> Reputación
        </h3>
        <RepoBadge level={rep.level_id} />
      </div>

      {/* Barra de colores MeLi */}
      <div className="flex h-2 rounded-full overflow-hidden mb-3">
        {["1_red","2_orange","3_yellow","4_light_green","5_green"].map(lvl => (
          <div
            key={lvl}
            className="flex-1 transition-all"
            style={{
              background: LEVEL_COLORS[lvl],
              opacity: rep.level_id === lvl ? 1 : 0.25,
            }}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: "Envíos con demora", val: pct(rep.delayed_handling_time), max: "Máx 18%", color: rep.delayed_handling_time > 0.18 ? "#ef4444" : "#39FF14" },
          { label: "Reclamos", val: pct(rep.claims), max: "Máx 2%", color: rep.claims > 0.02 ? "#ef4444" : "#39FF14" },
          { label: "Cancelaciones", val: pct(rep.cancellations), max: "Máx 2%", color: rep.cancellations > 0.02 ? "#ef4444" : "#39FF14" },
        ].map(m => (
          <div key={m.label} className="rounded-xl p-2" style={{ background: "#121212" }}>
            <p className="text-lg font-black" style={{ color: m.color }}>{m.val}</p>
            <p className="text-[9px] leading-tight" style={{ color: "#6B7280" }}>{m.label}</p>
            <p className="text-[9px]" style={{ color: "#374151" }}>{m.max}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 flex gap-3 text-xs justify-center">
        <span style={{ color: "#39FF14" }}>✓ {pct(rep.ratings_positive)} positivas</span>
        <span style={{ color: "#6B7280" }}>○ {pct(rep.ratings_neutral)} neutras</span>
        <span style={{ color: "#ef4444" }}>✕ {pct(rep.ratings_negative)} negativas</span>
      </div>
    </div>
  );
}

function ActivityCard({ orders, amount }: { orders: number; amount: number }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.07)" }}>
      <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
        <BarChart2 className="w-4 h-4" style={{ color: "#00E5FF" }} /> Actividad del día
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-3 text-center" style={{ background: "#121212" }}>
          <ShoppingCart className="w-5 h-5 mx-auto mb-1" style={{ color: "#00E5FF" }} />
          <p className="text-2xl font-black text-white">{orders}</p>
          <p className="text-[10px]" style={{ color: "#6B7280" }}>Ventas</p>
        </div>
        <div className="rounded-xl p-3 text-center" style={{ background: "#121212" }}>
          <DollarSign className="w-5 h-5 mx-auto mb-1" style={{ color: "#39FF14" }} />
          <p className="text-lg font-black" style={{ color: "#39FF14" }}>{fmt(amount)}</p>
          <p className="text-[10px]" style={{ color: "#6B7280" }}>Facturación</p>
        </div>
      </div>
    </div>
  );
}

function AccountPanel({ data, defaultOpen, editingNick, editNickVal, setEditingNick, setEditNickVal, handleRenameAccount }: {
  data: AccountDash; defaultOpen?: boolean;
  editingNick: string | null; editNickVal: string;
  setEditingNick: (v: string | null) => void; setEditNickVal: (v: string) => void;
  handleRenameAccount: (meliUserId: string, newName: string) => void;
}) {
  const [open, setOpen] = useState(defaultOpen ?? true);
  const urgentTotal = (data.unanswered_questions ?? 0) + (data.ready_to_ship ?? 0) + (data.pending_messages ?? 0);

  return (
    <div
      className="rounded-2xl overflow-hidden mb-4"
      style={{ background: "#181818", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      {/* Account Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-5 py-4 flex items-center justify-between text-left"
        style={{ background: "linear-gradient(90deg,#1F1F1F,#1a1a1a)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center font-black text-xl text-black"
            style={{ background: "linear-gradient(135deg,#FFE600,#FF9800)" }}
          >
            <Store className="w-5 h-5" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-black text-white text-base flex items-center gap-1.5">
                {editingNick === data.meli_user_id ? (
                  <>
                    <input
                      value={editNickVal}
                      onChange={e => setEditNickVal(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleRenameAccount(data.meli_user_id, editNickVal)}
                      className="font-black text-white text-base bg-transparent border-b border-yellow-400 outline-none w-32"
                      autoFocus
                    />
                    <button onClick={() => handleRenameAccount(data.meli_user_id, editNickVal)} className="p-0.5 rounded hover:bg-white/10">
                      <Check className="w-4 h-4 text-green-400" />
                    </button>
                    <button onClick={() => setEditingNick(null)} className="p-0.5 rounded hover:bg-white/10">
                      <XCircle className="w-3.5 h-3.5 text-gray-500" />
                    </button>
                  </>
                ) : (
                  <>
                    @{data.account}
                    <button
                      onClick={() => { setEditingNick(data.meli_user_id); setEditNickVal(data.account); }}
                      className="p-0.5 rounded hover:bg-white/10"
                    >
                      <Pencil className="w-3 h-3 text-gray-500" />
                    </button>
                  </>
                )}
              </p>
              {data.reputation?.power_seller_status && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "#FFE60022", color: "#FFE600" }}>
                  {data.reputation.power_seller_status.toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <RepoBadge level={data.reputation?.level_id ?? null} />
              <span className="text-xs" style={{ color: "#6B7280" }}>{data.total_items ?? 0} publicaciones</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {urgentTotal > 0 && (
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-black animate-pulse"
              style={{ background: "#FF5722" }}
            >
              {urgentTotal}
            </span>
          )}
          {open ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
        </div>
      </button>

      {open && (
        <div className="p-4 space-y-4">
          {data.error && (
            <div className="p-4 rounded-xl text-sm" style={{ background: "#ef444422", color: "#ef4444", border: "1px solid #ef444455" }}>
              <p className="font-bold mb-1">⚠️ Error al cargar cuenta</p>
              {data.error === "token_expired" && (
                <p>El token de acceso ha expirado. Por favor, reconecta la cuenta en <a href="/configuracion/meli" className="underline hover:text-red-300">Configuración</a>.</p>
              )}
              {data.error === "http_451_blocked" && (
                <p>MercadoLibre ha bloqueado el acceso a esta cuenta (HTTP 451). Verifica tu conexión o contacta al soporte de MeLi.</p>
              )}
              {!["token_expired", "http_451_blocked"].includes(data.error) && (
                <p>{data.error}</p>
              )}
            </div>
          )}

          {/* Indicadores urgentes */}
          <div>
            <p className="text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: "#6B7280" }}>
              Indicadores — Panel de Control
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MetricCard icon={<MessageCircle className="w-4 h-4" />} label="Preguntas sin responder"
                value={data.unanswered_questions ?? 0} color="#FF5722" urgent />
              <MetricCard icon={<MessageSquare className="w-4 h-4" />} label="Mensajes pendientes"
                value={data.pending_messages ?? 0} color="#FF9800" urgent />
              <MetricCard icon={<Truck className="w-4 h-4" />} label="Envíos pendientes"
                value={data.ready_to_ship ?? 0} color="#00E5FF" urgent />
              <MetricCard icon={<Package className="w-4 h-4" />} label="Publicaciones activas"
                value={data.total_items ?? 0} color="#39FF14" />
            </div>
          </div>

          {/* Reputación + Actividad */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <RepuCard rep={data.reputation ?? { level_id: null, power_seller_status: null, transactions_total: 0, transactions_completed: 0, ratings_positive: 0, ratings_negative: 0, ratings_neutral: 0, delayed_handling_time: 0, claims: 0, cancellations: 0, immediate_payment: false }} />
            <ActivityCard orders={data.today_orders ?? 0} amount={data.today_sales_amount ?? 0} />
          </div>

          {/* Acciones rápidas */}
          <div>
            <p className="text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: "#6B7280" }}>
              Acciones rápidas
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: "Ver preguntas",    color: "#FF5722", href: `/mensajes`, icon: <MessageCircle className="w-4 h-4" />, badge: data.unanswered_questions },
                { label: "Estadísticas",     color: "#39FF14", href: `/estadisticas`,  icon: <TrendingUp className="w-4 h-4" /> },
                { label: "Ver etiquetas",    color: "#00E5FF", href: `/etiquetas`,     icon: <Tag className="w-4 h-4" /> },
                { label: "Ver publicaciones",color: "#FFE600", href: `/publicaciones`, icon: <Package className="w-4 h-4" /> },
              ].map(a => (
                <a
                  key={a.label}
                  href={a.href}
                  target={a.href.startsWith("http") ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className="relative flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-opacity hover:opacity-80"
                  style={{ background: a.color + "18", color: a.color, border: `1px solid ${a.color}33` }}
                >
                  {a.icon} {a.label}
                  {a.href.startsWith("http") && <ExternalLink className="w-3 h-3" />}
                  {"badge" in a && (a as { badge?: number }).badge! > 0 && (
                    <span
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white"
                      style={{ background: "#FF5722" }}
                    >
                      {(a as { badge?: number }).badge! > 9 ? "9+" : (a as { badge?: number }).badge}
                    </span>
                  )}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileModal({ user, onClose }: { user: any, onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'info' | 'password' | 'recover'>('info');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  // Estados para cambiar email
  const [newEmail, setNewEmail] = useState("");
  const [currentPasswordForEmail, setCurrentPasswordForEmail] = useState("");
  const [showPasswordForEmail, setShowPasswordForEmail] = useState(false);

  // Estados para cambiar contraseña
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Estados para recuperar
  const [recoveryEmail, setRecoveryEmail] = useState(user?.email || "");
  const [recoverySent, setRecoverySent] = useState(false);

  // Cambiar Email
  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPasswordForEmail,
      });

      if (signInError) {
        setMessage({ type: "error", text: "Contraseña actual incorrecta" });
        setSaving(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({ email: newEmail });

      if (error) {
        setMessage({ type: "error", text: error.message });
      } else {
        setMessage({ type: "success", text: "Email actualizado. Revisa tu nuevo correo para confirmar." });
        setNewEmail("");
        setCurrentPasswordForEmail("");
      }
    } catch (err) {
      setMessage({ type: "error", text: "Error al actualizar email" });
    }

    setSaving(false);
  };

  // Cambiar Contraseña
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    if (newPassword !== confirmNewPassword) {
      setMessage({ type: "error", text: "Las contraseñas nuevas no coinciden" });
      setSaving(false);
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: "error", text: "La contraseña debe tener al menos 6 caracteres" });
      setSaving(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        setMessage({ type: "error", text: error.message });
      } else {
        setMessage({ type: "success", text: "Contraseña actualizada correctamente" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
      }
    } catch (err) {
      setMessage({ type: "error", text: "Error al actualizar contraseña" });
    }

    setSaving(false);
  };

  // Recuperar Contraseña
  const handlePasswordRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(recoveryEmail, {
        redirectTo: `${window.location.origin}/auth/callback`,
      });

      if (error) {
        setMessage({ type: "error", text: error.message });
      } else {
        setRecoverySent(true);
        setMessage({ type: "success", text: `Email de recuperación enviado a ${recoveryEmail}` });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Error al enviar email de recuperación" });
    }

    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg bg-[#1a1a1a] border border-white/10 rounded-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-bold">Configurar Perfil</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          {[
            { id: 'info', label: 'Mi Cuenta', icon: User },
            { id: 'password', label: 'Contraseña', icon: Lock },
            { id: 'recover', label: 'Recuperar', icon: Shield },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as any); setMessage(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition ${
                activeTab === tab.id 
                  ? 'text-[#FFE600] border-b-2 border-[#FFE600] bg-white/5' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Message */}
          {message && (
            <div className={`p-3 rounded-xl mb-4 flex items-center gap-2 ${
              message.type === "success" 
                ? "bg-green-500/10 border border-green-500/20 text-green-400" 
                : "bg-red-500/10 border border-red-500/20 text-red-400"
            }`}>
              {message.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <p className="text-sm">{message.text}</p>
            </div>
          )}

          {/* Info Tab */}
          {activeTab === 'info' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl">
                <div className="w-12 h-12 rounded-full bg-[#FFE600] flex items-center justify-center">
                  <User className="w-6 h-6 text-[#003087]" />
                </div>
                <div>
                  <p className="font-semibold">{user?.user_metadata?.full_name || "Usuario"}</p>
                  <p className="text-sm text-gray-400">{user?.email}</p>
                </div>
              </div>

              <form onSubmit={handleUpdateEmail} className="space-y-4 pt-4 border-t border-white/10">
                <h3 className="font-semibold flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#FFE600]" />
                  Cambiar Email
                </h3>
                
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="nuevo@email.com"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#FFE600]"
                  required
                />
                
                <div className="relative">
                  <input
                    type={showPasswordForEmail ? "text" : "password"}
                    value={currentPasswordForEmail}
                    onChange={(e) => setCurrentPasswordForEmail(e.target.value)}
                    placeholder="Contraseña actual"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#FFE600]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordForEmail(!showPasswordForEmail)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                  >
                    {showPasswordForEmail ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-3 bg-[#FFE600] text-[#003087] rounded-xl font-semibold hover:bg-[#ffd700] transition disabled:opacity-50"
                >
                  {saving ? "Guardando..." : "Actualizar Email"}
                </button>
              </form>
            </div>
          )}

          {/* Password Tab */}
          {activeTab === 'password' && (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Contraseña actual"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#FFE600]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nueva contraseña (mín. 6 caracteres)"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#FFE600]"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <input
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="Confirmar nueva contraseña"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#FFE600]"
                required
              />

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 bg-[#FFE600] text-[#003087] rounded-xl font-semibold hover:bg-[#ffd700] transition disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Cambiar Contraseña"}
              </button>
            </form>
          )}

          {/* Recover Tab */}
          {activeTab === 'recover' && (
            <div className="space-y-4">
              {recoverySent ? (
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-center">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2" />
                  <p className="font-semibold">Email enviado</p>
                  <p className="text-sm">Revisa tu bandeja de entrada</p>
                </div>
              ) : (
                <form onSubmit={handlePasswordRecovery} className="space-y-4">
                  <p className="text-gray-400 text-sm">
                    ¿Olvidaste tu contraseña? Ingresa tu email y te enviaremos un enlace para restablecerla.
                  </p>
                  
                  <input
                    type="email"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#FFE600]"
                    required
                  />

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full py-3 bg-white/10 text-white rounded-xl font-semibold hover:bg-white/20 transition disabled:opacity-50"
                  >
                    {saving ? "Enviando..." : "Enviar Email de Recuperación"}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AppJeezInner() {
  const params    = useSearchParams();
  const router    = useRouter();
  const connected = params.get("connected") === "true";

  const [accounts, setAccounts] = useState<AccountDash[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [totalQuestionsAlert, setTotalQuestionsAlert] = useState(0);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [editingNick, setEditingNick] = useState<string | null>(null);
  const [editNickVal, setEditNickVal] = useState("");
  
  // User auth state
  const [user, setUser] = useState<any>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/meli-dashboard");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: AccountDash[] = await res.json();
      setAccounts(data);
      setLastUpdate(new Date());
      const q = data.reduce((s, a) => s + (a.unanswered_questions ?? 0), 0);
      setTotalQuestionsAlert(q);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Inicializar selectedAccountId desde localStorage y preseleccionar primera cuenta
  useEffect(() => {
    if (accounts.length === 0) return;

    const saved = localStorage.getItem("selectedAccountId");
    if (saved && accounts.find(a => a.meli_user_id === saved)) {
      setSelectedAccountId(saved);
    } else if (accounts.length > 0) {
      // Preseleccionar primera cuenta
      setSelectedAccountId(accounts[0].meli_user_id);
    }
  }, [accounts]);

  // Guardar selectedAccountId en localStorage cuando cambia
  useEffect(() => {
    if (selectedAccountId) {
      localStorage.setItem("selectedAccountId", selectedAccountId);
    }
  }, [selectedAccountId]);

  // Obtener usuario actual
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  // Función de logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  // ⚠️ Polling automático DESACTIVADO - Usando SSE/Webhooks en su lugar
  const { isRefreshing, manualRefresh } = useAutoRefresh(
    load,
    false, // NO automático (era true cada 60s antes)
    60000
  );

  const handleNotification = useCallback((notification: any) => {
    console.log("[SSE] Notificación recibida:", notification);
    // Actualizar solo la cuenta del notification.user_id
    setAccounts(prev =>
      prev.map(acc =>
        acc.meli_user_id === notification.user_id
          ? {
              ...acc,
              unanswered_questions: (acc.unanswered_questions ?? 0) + 1,
            }
          : acc
      )
    );
    // Incrementar badge global
    setTotalQuestionsAlert(prev => prev + 1);
  }, []);

  // Conectar a SSE para notificaciones en tiempo real
  const { connected: streamConnected } = useNotificationStream(
    handleNotification,
    true // Enabled por defecto
  );

  // Handler para renombrar cuenta
  const handleRenameAccount = useCallback(async (meliUserId: string, newName: string) => {
    if (!newName.trim()) return;
    try {
      const res = await fetch("/api/meli-accounts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: meliUserId, nickname: newName.trim() }),
      });
      if (!res.ok) throw new Error("Error al renombrar");
      setAccounts(prev => prev.map(a =>
        a.meli_user_id === meliUserId ? { ...a, account: newName.trim() } : a
      ));
      setEditingNick(null);
    } catch (e) {
      console.error("Rename error:", e);
    }
  }, []);

  // Obtener cuenta seleccionada
  const selectedAccount = accounts.find(a => a.meli_user_id === selectedAccountId);

  const totalUrgent = accounts.reduce(
    (s, a) => s + (a.unanswered_questions ?? 0) + (a.ready_to_ship ?? 0) + (a.pending_messages ?? 0) + (a.claims_count ?? 0), 0
  );
  const totalSales = accounts.reduce((s, a) => s + (a.today_orders ?? 0), 0);
  const totalAmount = accounts.reduce((s, a) => s + (a.today_sales_amount ?? 0), 0);

  // Construir datos para el panel de post-venta unificado
  const postSaleMetrics = accounts.map(acc => {
    const claimsPercent = acc.claims_count ?? 0;
    let riskLevel: "low" | "medium" | "high" | "critical" = "low";

    if (claimsPercent > 2) {
      riskLevel = "critical";
    } else if (claimsPercent > 1.5) {
      riskLevel = "high";
    } else if (claimsPercent > 1) {
      riskLevel = "medium";
    }

    return {
      meli_user_id: acc.meli_user_id,
      account_name: acc.account,
      claims_count: acc.claims_count ?? 0,
      claims_percent: acc.reputation?.claims ? (acc.reputation.claims * 100) : undefined,
      mediations_count: 0, // TODO: Obtener de API
      mediations_percent: acc.reputation?.cancellations ? (acc.reputation.cancellations * 100) : undefined,
      delayed_shipments: 0, // TODO: Obtener de API
      cancellations_percent: acc.reputation?.delayed_handling_time ? (acc.reputation.delayed_handling_time * 100) : undefined,
      reputation_risk: riskLevel,
    };
  });

  const navItems = [
    { label: "Dashboard",       icon: <BarChart2 className="w-4 h-4" />,       href: "/",               active: true  },
    { label: "Estadísticas",    icon: <TrendingUp className="w-4 h-4" />,      href: "/estadisticas",  active: false },
    { label: "Mensajería",      icon: <MessageCircle className="w-4 h-4" />,   href: "/mensajes",      active: false },
    { label: "Etiquetas",       icon: <Tag className="w-4 h-4" />,             href: "/etiquetas",     active: false },
    { label: "Publicaciones",   icon: <Package className="w-4 h-4" />,         href: "/publicaciones", active: false },
    { label: "Sincronizar",     icon: <Copy className="w-4 h-4" />,            href: "/sincronizar",   active: false },
    { label: "Precios",         icon: <DollarSign className="w-4 h-4" />,     href: "/precios",       active: false },
    { label: "Promociones",     icon: <Zap className="w-4 h-4" />,            href: "/promociones",   active: false },
    { label: "Post-Venta",      icon: <AlertTriangle className="w-4 h-4" />,  href: "/post-venta",    active: false },
    { label: "Cuentas MeLi",    icon: <Store className="w-4 h-4" />,           href: "/configuracion/meli",    active: false },
    { label: "Inicio",          icon: <Home className="w-4 h-4" />,            href: "/",                    active: false, isHome: true },
  ];

  // Early return: si no hay usuario logueado, mostrar landing page con login
  if (!loading && !user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
        {/* Header */}
        <header className="border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#FFE600] rounded-lg flex items-center justify-center">
                <span className="text-[#003087] font-black text-xs">MJ</span>
              </div>
              <span className="font-bold text-xl">MaqJeez</span>
            </div>
            <div className="flex items-center gap-4">
              <a href="/login" className="text-sm text-gray-400 hover:text-white">
                Iniciar Sesión
              </a>
              <a href="/register" className="px-4 py-2 bg-[#FFE600] text-[#003087] rounded-lg font-semibold text-sm hover:bg-[#ffd700]">
                Registrarse
              </a>
            </div>
          </div>
        </header>

        {/* Hero */}
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-20">
          <div className="text-center max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-6">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-sm text-gray-400">Nuevo: Sistema Multi-Cuenta</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-bold mb-6">
              Gestiona tus cuentas de
              <span className="text-[#FFE600]"> Mercado Libre</span>
            </h1>
            
            <p className="text-gray-400 text-lg mb-8">
              Conecta múltiples cuentas, automatiza respuestas y controla todo desde un solo panel.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="/register" className="px-8 py-4 bg-[#FFE600] text-[#003087] rounded-xl font-bold hover:bg-[#ffd700]">
                Comenzar Gratis
              </a>
              <a href="/login" className="px-8 py-4 bg-white/10 text-white rounded-xl font-semibold hover:bg-white/20">
                Ya tengo cuenta
              </a>
            </div>

            <div className="mt-12 flex items-center justify-center gap-6 text-sm text-gray-500">
              <span>✓ 14 días gratis</span>
              <span>✓ Sin tarjeta</span>
              <span>✓ Cancela cuando quieras</span>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-white/10 py-6">
          <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
            © 2024 MaqJeez. Todos los derechos reservados.
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ background: "#121212" }}>
      {/* Sidebar desktop */}
      <aside
        className="hidden sm:flex flex-col w-56 flex-shrink-0 border-r"
        style={{ background: "#181818", borderColor: "rgba(255,255,255,0.06)" }}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <p className="font-black text-xl" style={{ color: "#FFE600" }}>AppJeez</p>
          <p className="text-[11px] mt-0.5" style={{ color: "#6B7280" }}>Panel Mercado Libre</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(n => (
            <Link
              key={n.label}
              href={n.href}
              onClick={() => n.isHome && handleLogout()}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              style={n.active
                ? { background: "#FFE60018", color: "#FFE600" }
                : { color: "#6B7280" }}
            >
              <span className="relative">
                {n.icon}
                {n.label === "Mensajería" && totalQuestionsAlert > 0 && (
                  <span
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-black"
                    style={{ background: "#FF5722" }}
                  >
                    {totalQuestionsAlert > 9 ? "9+" : totalQuestionsAlert}
                  </span>
                )}
              </span>
              {n.label}
            </Link>
          ))}
        </nav>
        
        {/* User section in Desktop Sidebar */}
        <div className="p-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
            <div className="w-8 h-8 rounded-full bg-[#FFE600] flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-[#003087]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{user?.email || "Usuario"}</p>
              <p className="text-[10px] text-gray-500">MaqJeez</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full mt-2 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-400 hover:bg-red-500/10 transition"
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="sm:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-64 flex flex-col" style={{ background: "#181818" }}>
            <div className="px-5 py-5 flex items-center justify-between border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <p className="font-black text-xl" style={{ color: "#FFE600" }}>AppJeez</p>
              <button onClick={() => setSidebarOpen(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
              {navItems.map(n => (
                <Link
                  key={n.label}
                  href={n.href}
                  onClick={() => {
                    setSidebarOpen(false);
                    if (n.isHome) handleLogout();
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold"
                  style={n.active 
                    ? { background: "#FFE60018", color: "#FFE600" } 
                    : { color: "#6B7280" }}
                >
                  {n.icon} {n.label}
                </Link>
              ))}
              
              {/* Logout Button in Mobile Sidebar */}
              <div className="pt-4 mt-4 border-t border-white/10">
                <button
                  onClick={() => {
                    setSidebarOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-400 hover:bg-red-500/10 transition"
                >
                  <LogOut className="w-4 h-4" />
                  Cerrar Sesión
                </button>
              </div>
            </nav>
            
            {/* User info in Mobile Sidebar */}
            <div className="p-4 border-t border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#FFE600] flex items-center justify-center">
                  <User className="w-4 h-4 text-[#003087]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user?.email || "Usuario"}</p>
                  <p className="text-xs text-gray-500">MaqJeez</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header
          className="sticky top-0 z-30 px-4 py-3 flex items-center justify-between border-b"
          style={{
            background: "rgba(24,24,24,0.97)",
            backdropFilter: "blur(16px)",
            borderColor: "rgba(255,255,255,0.06)",
          }}
        >
          <div className="flex items-center gap-3">
            <button
              className="sm:hidden p-1.5 rounded-lg"
              style={{ background: "rgba(255,255,255,0.05)" }}
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5 text-gray-400" />
            </button>
            <div>
              <h1 className="font-black text-white text-base sm:text-lg">Dashboard</h1>
              <p className="text-[10px]" style={{ color: "#6B7280" }}>
                {streamConnected ? (
                  <span style={{ color: "#39FF14" }}>🟢 En vivo</span>
                ) : (
                  <span style={{ color: "#ef4444" }}>🔴 Desconectado</span>
                )}
                {" "} • {lastUpdate ? `Cargado ${lastUpdate.toLocaleTimeString("es-AR")}` : "Cargando..."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedAccount && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-400">Cuenta:</span>
                <AccountSelector
                  accounts={accounts}
                  selectedId={selectedAccountId}
                  onSelect={setSelectedAccountId}
                  compact={true}
                />
              </div>
            )}
            {totalUrgent > 0 && (
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
                style={{ background: "#FF572222", color: "#FF5722", border: "1px solid #FF572244" }}
              >
                <Bell className="w-3.5 h-3.5" />
                {totalUrgent} pendientes
              </div>
            )}
            <button
              onClick={load}
              disabled={loading || isRefreshing}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold disabled:opacity-40"
              style={{ background: "#1F1F1F", color: "#00E5FF", border: "1px solid rgba(0,229,255,0.3)" }}
            >
              <RefreshCw className={`w-4 h-4 ${loading || isRefreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">{loading || isRefreshing ? "Actualizando..." : "Actualizar"}</span>
            </button>

            {/* User Info + Logout Button - VISIBLE ALWAYS */}
            <div className="flex items-center gap-2">
              {/* User Email Badge */}
              <div 
                className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                <div className="w-6 h-6 rounded-full bg-[#FFE600] flex items-center justify-center">
                  <User className="w-3 h-3 text-[#003087]" />
                </div>
                <span className="text-gray-300 max-w-[120px] truncate text-xs">
                  {user?.email || "Usuario"}
                </span>
              </div>

              {/* Logout Button - PROMINENT */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-105"
                style={{ 
                  background: "linear-gradient(135deg, #ef4444, #dc2626)", 
                  color: "#fff", 
                  border: "1px solid rgba(239,68,68,0.5)" 
                }}
                title="Cerrar Sesión"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Salir</span>
              </button>

              {/* Settings Button */}
              <button
                onClick={() => setShowProfileModal(true)}
                className="p-2 rounded-xl text-sm font-semibold transition-all hover:bg-white/10"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                title="Configurar Perfil"
              >
                <Settings className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 pb-24 sm:pb-6 max-w-5xl w-full mx-auto">
          {/* Welcome */}
          {connected && (
            <div
              className="rounded-2xl p-4 mb-4 flex items-center gap-3"
              style={{ background: "#39FF1418", border: "1px solid #39FF1440" }}
            >
              <CheckCircle2 className="w-6 h-6 flex-shrink-0" style={{ color: "#39FF14" }} />
              <div>
                <p className="font-bold text-white text-sm">Cuenta conectada exitosamente</p>
                <p className="text-xs" style={{ color: "#39FF14" }}>
                  Mercado Libre vinculado. Tus indicadores se actualizarán automáticamente.
                </p>
              </div>
            </div>
          )}

          {/* Global summary */}
          {!loading && accounts.length > 0 && (
            <>
              <KpiBar accountsCount={accounts.length} salesToday={totalSales} totalAmount={totalAmount} urgentAlerts={totalUrgent} />
              
              {/* Unified Post-Sale Panel - Gestión de problemas críticos */}
              <UnifiedPostSalePanel accounts={postSaleMetrics} isLoading={loading} />
            </>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-2xl p-5 text-center mb-4" style={{ background: "#ef444418", border: "1px solid #ef444440" }}>
              <XCircle className="w-8 h-8 mx-auto mb-2" style={{ color: "#ef4444" }} />
              <p className="text-white font-semibold">Error al cargar</p>
              <p className="text-sm mt-1 mb-3" style={{ color: "#ef4444" }}>{error}</p>
              <button onClick={load} className="px-4 py-2 rounded-xl text-sm font-bold bg-red-500 text-white">
                Reintentar
              </button>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="rounded-2xl p-5 animate-pulse" style={{ background: "#1F1F1F" }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-2xl" style={{ background: "#2a2a2a" }} />
                    <div className="flex-1">
                      <div className="h-4 rounded w-36 mb-1.5" style={{ background: "#2a2a2a" }} />
                      <div className="h-3 rounded w-24" style={{ background: "#2a2a2a" }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {[1,2,3,4].map(j => <div key={j} className="h-24 rounded-2xl" style={{ background: "#2a2a2a" }} />)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* No accounts */}
          {!loading && !error && accounts.length === 0 && (
            <div className="rounded-2xl p-10 text-center" style={{ background: "#1F1F1F" }}>
              <Store className="w-12 h-12 mx-auto mb-3" style={{ color: "#6B7280" }} />
              <p className="text-white font-bold text-lg">Sin cuentas conectadas</p>
              <p className="text-sm mt-1 mb-4" style={{ color: "#6B7280" }}>
                Conecta una cuenta de Mercado Libre para ver tus indicadores.
              </p>
              <Link
                href="/configuracion/meli"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-black"
                style={{ background: "#FFE600" }}
              >
                Conectar Mercado Libre
              </Link>
            </div>
          )}

          {/* Accounts Details Panel */}
          {!loading && accounts.length > 0 && (
            <>
              {/* Account Details Panel - Mostrar solo cuenta seleccionada */}
              {selectedAccount && (
                <AccountDetailsPanel
                  data={selectedAccount}
                  editingNick={editingNick}
                  editNickVal={editNickVal}
                  setEditingNick={setEditingNick}
                  setEditNickVal={setEditNickVal}
                  handleRenameAccount={handleRenameAccount}
                />
              )}
            </>
          )}
        </main>

        {/* Profile Modal */}
        {showProfileModal && (
          <ProfileModal 
            user={user} 
            onClose={() => setShowProfileModal(false)} 
          />
        )}
      </div>
    </div>
  );
}

export default function AppJeezPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#121212" }}>
        <div className="text-center">
          <div
            className="w-10 h-10 rounded-full border-2 animate-spin mx-auto mb-3"
            style={{ borderColor: "#FFE600", borderTopColor: "transparent" }}
          />
          <p className="text-sm" style={{ color: "#6B7280" }}>Cargando panel...</p>
        </div>
      </div>
    }>
      <AppJeezInner />
    </Suspense>
  );
}
