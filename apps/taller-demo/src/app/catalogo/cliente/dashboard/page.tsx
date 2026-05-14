"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useClienteAuth } from "@/components/cliente/ClienteAuthContext";
import {
  ArrowLeft, Package, Clock, CheckCircle, XCircle, Truck, Banknote,
  Copy, Upload, AlertTriangle, User, LogOut, ShoppingBag, ChevronRight,
  FileText, Eye, Loader2, Hash, RefreshCw, Rocket, Users, UserCheck,
  X, Search,
} from "lucide-react";

const DATOS_TRANSFERENCIA = {
  banco: "Banco Francés (BBVA)",
  tipoCuenta: "Caja de Ahorro en $",
  cbu: "0170142140000008408477",
  alias: "MAQJEEZ06",
  numeroCuenta: "142-84084/7",
  cuit: "20-31264840-8",
};

const fmtMoney = (n: number) =>
  "$" + n.toLocaleString("es-AR", { maximumFractionDigits: 0 });

const fechaFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
});
const fmtFecha = (iso: string) => fechaFormatter.format(new Date(iso));

function numeroOrden(id: string, created_at: string) {
  // Genera MQ-YYYYMMDD-XXXX donde XXXX son los últimos 4 chars del UUID
  const d = new Date(created_at);
  const fecha = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const sufijo = id.replace(/-/g, "").slice(-4).toUpperCase();
  return `MQ-${fecha}-${sufijo}`;
}

const ESTADO_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pendiente:  { label: "Pendiente",   color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30", icon: <Clock className="h-3.5 w-3.5" /> },
  confirmado: { label: "Confirmado",  color: "text-blue-400 bg-blue-400/10 border-blue-400/30",       icon: <CheckCircle className="h-3.5 w-3.5" /> },
  preparando: { label: "Preparando",  color: "text-orange-400 bg-orange-400/10 border-orange-400/30", icon: <Package className="h-3.5 w-3.5" /> },
  enviado:    { label: "Enviado",     color: "text-purple-400 bg-purple-400/10 border-purple-400/30", icon: <Truck className="h-3.5 w-3.5" /> },
  entregado:  { label: "Entregado",   color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30", icon: <CheckCircle className="h-3.5 w-3.5" /> },
  cancelado:  { label: "Cancelado",   color: "text-red-400 bg-red-400/10 border-red-400/30",          icon: <XCircle className="h-3.5 w-3.5" /> },
};

export default function ClienteDashboardPage() {
  const router = useRouter();
  const { cliente, loading: authLoading, logout } = useClienteAuth();

  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loadingPedidos, setLoadingPedidos] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  // Upload por pedido
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (!authLoading && !cliente) {
      router.push("/catalogo/cliente/login");
    }
  }, [authLoading, cliente, router]);

  const fetchPedidos = async () => {
    const token = localStorage.getItem("cliente_token");
    if (!token) return;
    setLoadingPedidos(true);
    try {
      const res = await fetch("/api/cliente/pedidos", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setPedidos(data.pedidos || []);
    } catch {
      setPedidos([]);
    } finally {
      setLoadingPedidos(false);
    }
  };

  useEffect(() => {
    if (cliente) fetchPedidos();
  }, [cliente]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(key);
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  const handleUploadComprobante = async (pedidoId: string, file: File) => {
    setUploadingId(pedidoId);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/comprobante/upload", { method: "POST", body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadData.url) throw new Error(uploadData.error || "Error al subir");

      const token = localStorage.getItem("cliente_token");
      await fetch("/api/cliente/pedidos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pedido_id: pedidoId, comprobante_url: uploadData.url }),
      });

      setUploadSuccess(pedidoId);
      setTimeout(() => setUploadSuccess(null), 3000);
      fetchPedidos();
    } catch (err: any) {
      alert("Error al subir comprobante: " + err.message);
    } finally {
      setUploadingId(null);
    }
  };

  // ── Vendedor referente ──
  const [vendedorReferente, setVendedorReferente] = useState<{ id: string; nombre: string; codigo_referido: string } | null>(
    (cliente as any)?.vendedor_referente || null
  );
  const [showCambiarVendedor, setShowCambiarVendedor] = useState(false);
  const [codigoInput, setCodigoInput] = useState("");
  const [codigoStatus, setCodigoStatus] = useState<"idle" | "checking" | "found" | "error">("idle");
  const [vendedorEncontrado, setVendedorEncontrado] = useState<{ id: string; nombre: string; codigo_referido: string } | null>(null);
  const [cambiandoVendedor, setCambiandoVendedor] = useState(false);
  const [vendedorMsg, setVendedorMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const codigoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (cliente && (cliente as any).vendedor_referente) {
      setVendedorReferente((cliente as any).vendedor_referente);
    }
  }, [cliente]);

  const handleCodigoChange = (val: string) => {
    setCodigoInput(val);
    setVendedorEncontrado(null);
    setVendedorMsg(null);
    if (codigoTimer.current) clearTimeout(codigoTimer.current);
    const code = val.trim().toUpperCase();
    if (!code || code.length < 3) { setCodigoStatus("idle"); return; }
    setCodigoStatus("checking");
    codigoTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/vendedor/public?codigo=${code}`);
        const data = await res.json();
        if (data.vendedor) {
          setVendedorEncontrado(data.vendedor);
          setCodigoStatus("found");
        } else {
          setCodigoStatus("error");
        }
      } catch { setCodigoStatus("error"); }
    }, 500);
  };

  const handleCambiarVendedor = async (vendedorId: string) => {
    const token = localStorage.getItem("cliente_token");
    if (!token) return;
    setCambiandoVendedor(true);
    setVendedorMsg(null);
    try {
      const res = await fetch("/api/cliente/cambiar-vendedor", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ vendedor_id: vendedorId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al cambiar vendedor");
      setVendedorReferente(data.vendedor);
      setVendedorMsg({ ok: true, text: `¡Listo! ${data.vendedor.nombre} es ahora tu vendedor referente.` });
      setTimeout(() => { setShowCambiarVendedor(false); setVendedorMsg(null); setCodigoInput(""); setCodigoStatus("idle"); setVendedorEncontrado(null); }, 2200);
    } catch (err: any) {
      setVendedorMsg({ ok: false, text: err.message });
    } finally {
      setCambiandoVendedor(false);
    }
  };

  const [toast, setToast] = useState(false);
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = () => {
    setToast(true);
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(false), 3000);
  };

  const copyToClipboardToast = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(key);
      showToast();
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen" style={{ background: "#030305" }}>
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-4 animate-pulse">
          <div className="h-16 rounded-2xl bg-white/5" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 space-y-4">
              <div className="h-64 rounded-2xl bg-white/5" />
              <div className="h-48 rounded-2xl bg-white/5" />
            </div>
            <div className="lg:col-span-8 space-y-4">
              <div className="h-72 rounded-2xl bg-white/5" />
              <div className="h-48 rounded-2xl bg-white/5" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!cliente) return null;

  const glassPanelStyle: React.CSSProperties = {
    background: "rgba(10,11,16,0.7)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.06)",
    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05)",
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden" style={{ background: "#030305", color: "#fff", fontFamily: "var(--font-montserrat), sans-serif" }}>

      {/* Fondo ambiental */}
      <div className="pointer-events-none fixed inset-0 z-0" style={{ backgroundImage: "radial-gradient(at 100% 0%, rgba(255,94,58,0.05) 0px, transparent 50%), radial-gradient(at 0% 100%, rgba(0,255,102,0.03) 0px, transparent 50%)" }} />
      <div className="pointer-events-none fixed top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full opacity-40" style={{ background: "rgba(255,94,58,0.08)", filter: "blur(100px)", mixBlendMode: "screen" }} />
      <div className="pointer-events-none fixed bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full opacity-40" style={{ background: "rgba(0,255,102,0.04)", filter: "blur(100px)", mixBlendMode: "screen" }} />

      {/* NAVBAR */}
      <header className="sticky top-0 z-50 border-b" style={{ background: "rgba(3,3,5,0.6)", backdropFilter: "blur(20px)", borderColor: "rgba(255,255,255,0.08)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/catalogo" className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-all" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(to bottom right, #1e293b, #0f172a)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <span className="text-xs font-black text-white">{cliente.nombre.charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <p className="text-sm font-black text-white leading-tight">{cliente.nombre}</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Mi Panel</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/catalogo" className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white transition-all" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <ShoppingBag className="h-4 w-4" /> Catálogo
            </Link>
            <button onClick={() => { logout(); router.push("/catalogo"); }}
              className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-400 hover:text-white transition-colors" title="Cerrar sesión"
              style={{ background: "rgba(255,255,255,0.03)" }}>
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* CONTENIDO */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">

          {/* ── COLUMNA IZQUIERDA ── */}
          <div className="lg:col-span-4 space-y-6">

            {/* Tarjeta Perfil */}
            <div className="rounded-2xl p-6 relative overflow-hidden group" style={glassPanelStyle}>
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none transition-colors" style={{ background: "rgba(255,94,58,0.05)", filter: "blur(30px)" }} />
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full p-1 mb-4 relative" style={{ background: "#030305", border: "2px solid rgba(255,255,255,0.1)", boxShadow: "0 0 20px rgba(0,0,0,0.5)" }}>
                  <div className="w-full h-full rounded-full flex items-center justify-center" style={{ background: "linear-gradient(to bottom right, #1e293b, #000)" }}>
                    <User className="h-8 w-8 text-gray-400" />
                  </div>
                  <span className="absolute bottom-1 right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "#00FF66" }} />
                    <span className="relative inline-flex rounded-full h-4 w-4 border-2" style={{ background: "#00FF66", borderColor: "#030305" }} />
                  </span>
                </div>
                <h2 className="text-xl font-black text-white mb-1">{cliente.nombre}</h2>
                <p className="text-xs text-gray-400 mb-6 font-medium">{cliente.email}</p>

                {/* Badge descuento */}
                <div className="w-full p-4 rounded-xl relative overflow-hidden" style={{ background: "#030305", border: "1px solid rgba(255,94,58,0.2)" }}>
                  <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(255,94,58,0.05), transparent)" }} />
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,94,58,0.1)" }}>
                        <Hash className="h-4 w-4" style={{ color: "#FF5E3A" }} />
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">Beneficio Activo</p>
                        <p className="text-sm font-semibold text-white">Descuento Cliente</p>
                      </div>
                    </div>
                    <span className="text-xl font-black" style={{ color: "#FF5E3A", textShadow: "0 0 8px rgba(255,94,58,0.4)" }}>-{cliente.descuento_cliente_pct || 3}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Mi Vendedor Referente ── */}
            <div className="rounded-2xl overflow-hidden" style={{ background: "linear-gradient(145deg, rgba(0,255,102,0.04) 0%, rgba(10,11,16,0.95) 100%)", border: "1px solid rgba(0,255,102,0.12)" }}>
              {/* Header */}
              <div className="flex items-center justify-between px-4 pt-4 pb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(0,255,102,0.1)", border: "1px solid rgba(0,255,102,0.2)" }}>
                    <Users className="h-3.5 w-3.5" style={{ color: "#00FF66" }} />
                  </div>
                  <p className="text-sm font-black text-white">Mi Vendedor Referente</p>
                </div>
                <button
                  onClick={() => { setShowCambiarVendedor(true); setCodigoInput(""); setCodigoStatus("idle"); setVendedorEncontrado(null); setVendedorMsg(null); }}
                  className="text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all"
                  style={{ background: "rgba(0,255,102,0.08)", border: "1px solid rgba(0,255,102,0.2)", color: "#00FF66" }}>
                  {vendedorReferente ? "Cambiar" : "Elegir"}
                </button>
              </div>

              {/* Body */}
              <div className="px-4 py-4">
                {vendedorReferente ? (
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 font-black text-base" style={{ background: "rgba(0,255,102,0.12)", color: "#00FF66", border: "2px solid rgba(0,255,102,0.3)" }}>
                      {vendedorReferente.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-white">{vendedorReferente.nombre}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(0,255,102,0.08)", color: "#00FF66", border: "1px solid rgba(0,255,102,0.2)" }}>{vendedorReferente.codigo_referido}</span>
                        <span className="text-[10px] text-gray-500">· Tu vendedor asignado</span>
                      </div>
                    </div>
                    <UserCheck className="h-5 w-5 shrink-0" style={{ color: "#00FF66" }} />
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.04)", border: "1px dashed rgba(255,255,255,0.12)" }}>
                      <Users className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-400">Sin vendedor asignado</p>
                      <p className="text-[11px] text-gray-600 mt-0.5">Tenés un código de referido? ¡Ingresálo y obtené beneficios!</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal elegir/cambiar vendedor por código */}
            {showCambiarVendedor && (
              <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
                style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}
                onClick={(e) => { if (e.target === e.currentTarget) { setShowCambiarVendedor(false); } }}>
                <div className="w-full max-w-sm rounded-2xl p-5 space-y-4" style={{ background: "#0a0b10", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 25px 60px rgba(0,0,0,0.9)" }}>

                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,255,102,0.1)", border: "1px solid rgba(0,255,102,0.2)" }}>
                        <Users className="h-4 w-4" style={{ color: "#00FF66" }} />
                      </div>
                      <div>
                        <p className="font-black text-white text-sm">{vendedorReferente ? "Cambiar vendedor" : "Elegir vendedor"}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">Ingresá el código de tu vendedor</p>
                      </div>
                    </div>
                    <button onClick={() => { setShowCambiarVendedor(false); setVendedorMsg(null); }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white transition-colors"
                      style={{ background: "rgba(255,255,255,0.04)" }}>
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Input código */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Código del vendedor</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
                      <input
                        value={codigoInput}
                        onChange={(e) => handleCodigoChange(e.target.value)}
                        placeholder="Ej: MAQ123"
                        maxLength={20}
                        className="w-full pl-9 pr-10 py-3 rounded-xl text-sm font-mono font-bold text-white placeholder-gray-600 outline-none uppercase"
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          border: `1px solid ${codigoStatus === "found" ? "rgba(0,255,102,0.4)" : codigoStatus === "error" ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.08)"}`,
                          letterSpacing: "0.08em",
                        }}
                        autoFocus
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {codigoStatus === "checking" && <Loader2 className="h-4 w-4 animate-spin text-gray-500" />}
                        {codigoStatus === "found" && <CheckCircle className="h-4 w-4" style={{ color: "#00FF66" }} />}
                        {codigoStatus === "error" && <AlertTriangle className="h-4 w-4 text-red-400" />}
                      </div>
                    </div>
                    {codigoStatus === "error" && (
                      <p className="text-[10px] text-red-400 mt-1.5 pl-1">Código no válido o vendedor inactivo</p>
                    )}
                  </div>

                  {/* Preview vendedor encontrado */}
                  {codigoStatus === "found" && vendedorEncontrado && (
                    <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: "rgba(0,255,102,0.06)", border: "1px solid rgba(0,255,102,0.2)" }}>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-black text-base" style={{ background: "rgba(0,255,102,0.12)", color: "#00FF66", border: "1px solid rgba(0,255,102,0.25)" }}>
                        {vendedorEncontrado.nombre.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-white">{vendedorEncontrado.nombre}</p>
                        <p className="text-[10px] font-mono mt-0.5" style={{ color: "#00FF66" }}>{vendedorEncontrado.codigo_referido}</p>
                      </div>
                      <CheckCircle className="h-4 w-4 shrink-0" style={{ color: "#00FF66" }} />
                    </div>
                  )}

                  {/* Mensaje resultado */}
                  {vendedorMsg && (
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold"
                      style={{ background: vendedorMsg.ok ? "rgba(0,255,102,0.08)" : "rgba(239,68,68,0.08)", border: `1px solid ${vendedorMsg.ok ? "rgba(0,255,102,0.2)" : "rgba(239,68,68,0.2)"}`, color: vendedorMsg.ok ? "#00FF66" : "#f87171" }}>
                      {vendedorMsg.ok ? <CheckCircle className="h-3.5 w-3.5 shrink-0" /> : <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
                      {vendedorMsg.text}
                    </div>
                  )}

                  {/* Botón confirmar */}
                  <button
                    onClick={() => vendedorEncontrado && handleCambiarVendedor(vendedorEncontrado.id)}
                    disabled={codigoStatus !== "found" || cambiandoVendedor || (vendedorReferente?.id === vendedorEncontrado?.id)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-extrabold text-sm transition-all disabled:opacity-40"
                    style={{ background: "#00FF66", color: "#000" }}>
                    {cambiandoVendedor ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Guardando…</>
                    ) : vendedorReferente?.id === vendedorEncontrado?.id ? (
                      "Ya es tu vendedor actual"
                    ) : (
                      vendedorReferente ? "Confirmar cambio" : "Confirmar vendedor"
                    )}
                  </button>

                  {vendedorReferente && (
                    <p className="text-center text-[10px] text-gray-600">
                      Vendedor actual: <span className="text-gray-400 font-semibold">{vendedorReferente.nombre}</span>
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Promo Card → Vendedor */}
            <div className="rounded-2xl relative mt-4" style={{
              background: "linear-gradient(145deg, rgba(0,255,102,0.05) 0%, rgba(10,11,16,0.9) 100%)",
              border: "1px solid rgba(0,255,102,0.2)",
              paddingTop: "2rem",
              paddingLeft: "1.5rem",
              paddingRight: "1.5rem",
              paddingBottom: "1.5rem",
              transition: "all 0.4s cubic-bezier(0.16,1,0.3,1)",
            }}>
              <div className="absolute -top-3 right-4 flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full z-20" style={{ background: "#00FF66", color: "#000", boxShadow: "0 0 15px rgba(0,255,102,0.6)" }}>
                🔥 Aumenta tus ingresos
              </div>
              <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                <div className="absolute top-0 -left-full w-1/2 h-full" style={{ background: "linear-gradient(to right, transparent, rgba(0,255,102,0.08), transparent)", transform: "skewX(-20deg)", animation: "shimmer 3s infinite" }} />
              </div>
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{ background: "rgba(0,255,102,0.1)", border: "1px solid rgba(0,255,102,0.3)", boxShadow: "0 0 20px rgba(0,255,102,0.15)" }}>
                  <Rocket className="h-6 w-6" style={{ color: "#00FF66" }} />
                </div>
                <h3 className="text-xl font-black text-white mb-2 leading-tight">¿Conocés gente que necesite repuestos?</h3>
                <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                  Activá tu rol de <strong className="text-white">Socio Vendedor</strong>. Compartí enlaces y ganá{" "}
                  <span className="font-bold px-1.5 py-0.5 rounded" style={{ color: "#00FF66", background: "rgba(0,255,102,0.1)" }}>10% a 15% de comisión</span>{" "}
                  en efectivo por cada venta generada.
                </p>
                <Link href="/catalogo/vendedor/login"
                  className="relative overflow-hidden w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-extrabold text-sm text-black transition-transform active:scale-[0.98] group"
                  style={{ background: "#fff" }}>
                  <span className="relative z-10 flex items-center gap-2">
                    Ser Vendedor Ahora <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "linear-gradient(to right, transparent, rgba(0,255,102,0.3), transparent)" }} />
                </Link>
                <p className="text-[10px] text-center text-gray-500 mt-3 font-medium">No requiere inversión inicial. Activación inmediata.</p>
              </div>
            </div>
          </div>

          {/* ── COLUMNA DERECHA ── */}
          <div className="lg:col-span-8 space-y-6">

            {/* Datos de Transferencia */}
            <div className="rounded-2xl p-6 sm:p-8" style={glassPanelStyle}>
              <div className="flex items-center gap-3 mb-6 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white" style={{ background: "linear-gradient(to bottom right, #1e293b, #0f172a)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <Banknote className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">Datos de Transferencia</h3>
                  <p className="text-xs text-gray-400 font-medium">Realizá el pago de tus pedidos y subí el comprobante.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {[
                  { label: "Banco",          value: DATOS_TRANSFERENCIA.banco,        key: "db", wide: false },
                  { label: "Tipo de Cuenta", value: DATOS_TRANSFERENCIA.tipoCuenta,   key: "dt", wide: false },
                  { label: "N° de Cuenta",   value: DATOS_TRANSFERENCIA.numeroCuenta, key: "dn", wide: true,  accent: true },
                  { label: "CBU",            value: DATOS_TRANSFERENCIA.cbu,          key: "dc", wide: true,  mono: true },
                  { label: "Alias",          value: DATOS_TRANSFERENCIA.alias,        key: "da", wide: false },
                  { label: "CUIT",           value: DATOS_TRANSFERENCIA.cuit,         key: "dq", wide: false },
                ].map(({ label, value, key, wide, accent, mono }) => (
                  <div key={key}
                    className={`group flex items-center justify-between p-4 rounded-xl transition-all${wide ? " sm:col-span-2" : ""}`}
                    style={{ background: "#030305", border: `1px solid ${accent ? "rgba(255,94,58,0.2)" : "rgba(255,255,255,0.06)"}` }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = accent ? "rgba(255,94,58,0.4)" : "rgba(255,255,255,0.15)")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = accent ? "rgba(255,94,58,0.2)" : "rgba(255,255,255,0.06)")}>
                    <div className="overflow-hidden">
                      <p className="text-[10px] font-black uppercase tracking-wider mb-0.5" style={{ color: accent ? "#FF5E3A" : "#64748b" }}>{label}</p>
                      <p className={`font-bold text-white truncate ${accent ? "text-lg" : "text-sm"} ${mono ? "font-mono tracking-widest" : ""}`}>{value}</p>
                    </div>
                    <button type="button" onClick={() => copyToClipboardToast(value, key)}
                      className="shrink-0 ml-3 flex items-center justify-center rounded-lg transition-all opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0"
                      style={{
                        width: accent ? "2.5rem" : "2rem", height: accent ? "2.5rem" : "2rem",
                        background: copiedField === key ? "#00FF66" : (accent ? "rgba(255,94,58,0.1)" : "rgba(255,255,255,0.05)"),
                        border: `1px solid ${copiedField === key ? "#00FF66" : (accent ? "rgba(255,94,58,0.3)" : "rgba(255,255,255,0.1)")}`,
                        color: copiedField === key ? "#000" : (accent ? "#FF5E3A" : "#94a3b8"),
                      }}>
                      {copiedField === key ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Mis Pedidos */}
            <div className="rounded-2xl p-6 sm:p-8" style={glassPanelStyle}>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-gray-400" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <FileText className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-black text-white flex items-center gap-2">
                    Mis Pedidos
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-bold" style={{ background: "#030305", border: "1px solid rgba(255,255,255,0.08)", color: "#64748b" }}>
                      {loadingPedidos ? "…" : pedidos.length}
                    </span>
                  </h3>
                </div>
                <button onClick={fetchPedidos} disabled={loadingPedidos}
                  className="text-gray-500 hover:text-white transition-all disabled:opacity-40" style={{ transitionDuration: "300ms" }}
                  title="Actualizar">
                  <RefreshCw className={`h-5 w-5 ${loadingPedidos ? "animate-spin" : ""}`} />
                </button>
              </div>

              {loadingPedidos ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#FF5E3A" }} />
                </div>
              ) : pedidos.length === 0 ? (
                /* Empty State */
                <div className="relative py-16 px-4 flex flex-col items-center text-center rounded-2xl overflow-hidden" style={{ background: "linear-gradient(to bottom, #030305, #0a0b10)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full pointer-events-none" style={{ background: "rgba(255,94,58,0.05)", filter: "blur(40px)" }} />
                  <div className="relative z-10 w-24 h-24 mb-6 flex items-center justify-center" style={{ animation: "float 3s ease-in-out infinite" }}>
                    <div className="absolute inset-0 rounded-2xl rotate-12" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }} />
                    <div className="absolute inset-0 -rotate-6 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(to bottom right, #1e293b, #030305)", border: "1px solid rgba(255,94,58,0.2)", boxShadow: "0 20px 40px rgba(0,0,0,0.5)" }}>
                      <Package className="h-12 w-12 text-gray-500" />
                    </div>
                  </div>
                  <h4 className="relative z-10 text-xl font-black text-white mb-3">Aún no hay pedidos registrados</h4>
                  <p className="relative z-10 text-sm text-gray-400 max-w-md mx-auto mb-8 leading-relaxed">
                    Tu historial está vacío por ahora. Recordá que tenés un <strong className="text-white">3% de descuento</strong> fijo esperando ser utilizado en tu próxima compra.
                  </p>
                  <Link href="/catalogo" className="relative z-10 group overflow-hidden rounded-xl p-px flex"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,94,58,0.4)" }}>
                    <div className="flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-white transition-colors" style={{ background: "#0a0b10" }}>
                      <ShoppingBag className="h-5 w-5" style={{ color: "#FF5E3A" }} />
                      Ir al catálogo
                    </div>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {pedidos.map((p) => {
                    const nroOrden = numeroOrden(p.id, p.created_at);
                    const estado = ESTADO_CONFIG[p.estado] || ESTADO_CONFIG["pendiente"];
                    const formaPago: string = p.datos_cliente?.formaPago || "";
                    const requiereComprobante = ["Transferencia", "Mercado Pago", "Depósito"].some(m => formaPago.toLowerCase().includes(m.toLowerCase())) || true;
                    const comprobante = p.datos_cliente?.comprobante;
                    const isExpanded = expandedOrder === p.id;

                    return (
                      <div key={p.id} className="rounded-2xl overflow-hidden transition-all"
                        style={{ border: `1px solid ${isExpanded ? "rgba(255,94,58,0.35)" : "rgba(255,255,255,0.06)"}`, background: "rgba(10,11,16,0.6)" }}>

                        <button type="button" onClick={() => setExpandedOrder(isExpanded ? null : p.id)}
                          className="w-full flex items-center gap-3 p-4 text-left transition-colors hover:bg-white/[0.02]">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: "rgba(255,94,58,0.1)", border: "1px solid rgba(255,94,58,0.25)" }}>
                            <Hash className="h-4 w-4" style={{ color: "#FF5E3A" }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-black text-white text-sm font-mono">{nroOrden}</p>
                              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${estado.color}`}>
                                {estado.icon} {estado.label}
                              </span>
                              {requiereComprobante && !comprobante && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border text-yellow-400 bg-yellow-400/10 border-yellow-400/30">
                                  <AlertTriangle className="h-3 w-3" /> Sin comprobante
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">{fmtFecha(p.created_at)}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-black text-white">{fmtMoney(p.total || 0)}</p>
                            <ChevronRight className={`h-4 w-4 text-slate-500 ml-auto mt-1 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="border-t px-4 pb-4 pt-3 space-y-4" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                            <div className="rounded-xl p-3 flex items-center gap-3"
                              style={{ background: "rgba(255,94,58,0.06)", border: "1px solid rgba(255,94,58,0.18)" }}>
                              <Hash className="h-5 w-5 shrink-0" style={{ color: "#FF5E3A" }} />
                              <div>
                                <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wide">Número de Orden</p>
                                <p className="font-black text-white text-lg font-mono">{nroOrden}</p>
                              </div>
                              <button onClick={() => copyToClipboardToast(nroOrden, `ord-${p.id}`)}
                                className="ml-auto p-2 rounded-lg hover:bg-white/10 transition-colors">
                                {copiedField === `ord-${p.id}` ? <CheckCircle className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4 text-slate-400" />}
                              </button>
                            </div>

                            {/* ── ESTADO DEL PEDIDO (transparencia) ── */}
                            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                              <div className="px-3 py-2 flex items-center gap-1.5" style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                                <Package className="h-3.5 w-3.5 text-gray-500" />
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Estado del pedido</p>
                              </div>
                              <div className="grid grid-cols-3">
                                {/* Estado general */}
                                <div className="p-3 text-center" style={{ borderRight: "1px solid rgba(255,255,255,0.05)" }}>
                                  <p className="text-[9px] text-gray-600 uppercase font-bold mb-1.5">Pedido</p>
                                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${estado.color}`}>
                                    {estado.icon} {estado.label}
                                  </span>
                                </div>
                                {/* Estado pago */}
                                <div className="p-3 text-center" style={{ borderRight: "1px solid rgba(255,255,255,0.05)" }}>
                                  <p className="text-[9px] text-gray-600 uppercase font-bold mb-1.5">Pago</p>
                                  {p.estado_pago === "pagado" ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border text-emerald-400 bg-emerald-400/10 border-emerald-400/30">
                                      <CheckCircle className="h-2.5 w-2.5" /> Pagado
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border text-yellow-400 bg-yellow-400/10 border-yellow-400/30">
                                      ⏳ Pendiente
                                    </span>
                                  )}
                                  {p.fecha_pago && (
                                    <p className="text-[9px] text-gray-600 mt-1">{new Date(p.fecha_pago).toLocaleDateString("es-AR")}</p>
                                  )}
                                </div>
                                {/* Estado envío */}
                                <div className="p-3 text-center">
                                  <p className="text-[9px] text-gray-600 uppercase font-bold mb-1.5">Envío</p>
                                  {p.estado_envio === "entregado" ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border text-emerald-400 bg-emerald-400/10 border-emerald-400/30">
                                      ✓ Entregado
                                    </span>
                                  ) : p.estado_envio === "enviado" ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border text-blue-400 bg-blue-400/10 border-blue-400/30">
                                      🚚 En camino
                                    </span>
                                  ) : p.estado === "confirmado" || p.estado === "pagado" ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border text-purple-400 bg-purple-400/10 border-purple-400/30">
                                      📦 Preparando
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border text-gray-400 bg-gray-400/10 border-gray-400/30">
                                      ⏳ Pendiente
                                    </span>
                                  )}
                                  {p.fecha_despacho && (
                                    <p className="text-[9px] text-gray-600 mt-1">Desp: {new Date(p.fecha_despacho).toLocaleDateString("es-AR")}</p>
                                  )}
                                </div>
                              </div>
                              {/* Tracking */}
                              {p.tracking && (
                                <div className="px-3 py-2 flex items-center gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.05)", background: "rgba(59,130,246,0.04)" }}>
                                  <Package className="h-3 w-3 text-blue-400 shrink-0" />
                                  <p className="text-[10px] text-gray-500">Tracking: <span className="text-blue-400 font-mono font-bold">{p.tracking}</span></p>
                                  {p.medio_envio && <span className="text-[9px] text-gray-600 ml-auto">{p.medio_envio}</span>}
                                </div>
                              )}
                            </div>

                            {/* Vendedor referente del pedido */}
                            {p.vendedor && (
                              <div className="rounded-xl p-3 flex items-center gap-2" style={{ background: "rgba(0,255,102,0.04)", border: "1px solid rgba(0,255,102,0.12)" }}>
                                <div className="w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shrink-0" style={{ background: "rgba(0,255,102,0.1)", color: "#00FF66" }}>
                                  {p.vendedor.nombre?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="text-[10px] text-gray-500 uppercase font-bold">Vendedor</p>
                                  <p className="text-xs font-bold text-white">{p.vendedor.nombre} <span className="font-mono text-[10px]" style={{ color: "#00FF66" }}>({p.vendedor.codigo_referido})</span></p>
                                </div>
                              </div>
                            )}

                            {Array.isArray(p.items) && p.items.length > 0 && (
                              <div>
                                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-2">Productos</p>
                                <div className="space-y-1.5">
                                  {p.items.map((item: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between text-sm rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.03)" }}>
                                      <span className="text-slate-300 truncate flex-1">{item.nombre || item.sku}</span>
                                      <span className="text-slate-500 text-xs ml-2 shrink-0">x{item.cantidad}</span>
                                      <span className="text-white font-bold ml-3 shrink-0">{fmtMoney(item.precio * item.cantidad)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-2">
                              <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)" }}>
                                <p className="text-[10px] text-slate-500 uppercase font-semibold">Forma de pago</p>
                                <p className="text-white font-bold mt-0.5">{p.datos_cliente?.formaPago || "—"}</p>
                              </div>
                              <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)" }}>
                                <p className="text-[10px] text-slate-500 uppercase font-semibold">Total</p>
                                <p className="font-black mt-0.5 text-base" style={{ color: "#FF5E3A" }}>{fmtMoney(p.total || 0)}</p>
                              </div>
                            </div>

                            {requiereComprobante && (
                              <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.2)" }}>
                                <div className="flex items-center gap-2">
                                  <Banknote className="h-4 w-4 text-blue-400" />
                                  <p className="text-sm font-bold text-blue-300">
                                    {formaPago ? `Comprobante · ${formaPago}` : "Comprobante de pago"}
                                  </p>
                                </div>
                                {comprobante ? (
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)" }}>
                                      <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                                      <p className="text-xs text-emerald-400 font-semibold">Comprobante adjunto</p>
                                    </div>
                                    {comprobante.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
                                      <img src={comprobante} alt="Comprobante" className="w-full max-h-48 object-contain rounded-xl border border-white/10" />
                                    ) : (
                                      <a href={comprobante} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-xs text-blue-400 hover:underline">
                                        <Eye className="h-3.5 w-3.5" /> Ver comprobante
                                      </a>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.3)" }}>
                                    <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0" />
                                    <p className="text-xs text-yellow-300 font-semibold">Pendiente de comprobante</p>
                                  </div>
                                )}
                                <div>
                                  <input type="file" accept="image/*,.pdf"
                                    ref={(el) => { fileRefs.current[p.id] = el; }}
                                    style={{ display: "none" }}
                                    onChange={(e) => { const file = e.target.files?.[0]; if (file) handleUploadComprobante(p.id, file); e.target.value = ""; }}
                                  />
                                  <button type="button" disabled={uploadingId === p.id}
                                    onClick={() => fileRefs.current[p.id]?.click()}
                                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                                    style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.35)", color: "#93c5fd" }}>
                                    {uploadingId === p.id
                                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Subiendo…</>
                                      : <><Upload className="h-4 w-4" /> {comprobante ? "Reemplazar comprobante" : "Subir comprobante"}</>}
                                  </button>
                                  {uploadSuccess === p.id && (
                                    <p className="text-xs text-emerald-400 text-center mt-2 font-semibold">✓ Comprobante subido correctamente</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      </main>

      {/* Toast */}
      <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-xl font-bold text-black transition-all duration-300 pointer-events-none ${toast ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
        style={{ background: "#fff", boxShadow: "0 10px 40px rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)" }}>
        <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "#00FF66" }}>
          <CheckCircle className="h-4 w-4 text-black" />
        </div>
        <span className="text-sm">Copiado al portapapeles</span>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%) skewX(-20deg); }
          100% { transform: translateX(300%) skewX(-20deg); }
        }
      `}</style>
    </div>
  );
}
