"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useClienteAuth } from "@/components/cliente/ClienteAuthContext";
import {
  ArrowLeft, Package, Clock, CheckCircle, XCircle, Truck, Banknote,
  Copy, Upload, AlertTriangle, User, LogOut, ShoppingBag, ChevronRight,
  FileText, Eye, Loader2, Hash, RefreshCw,
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

  if (authLoading) {
    return (
      <div className="min-h-screen" style={{ background: "#020617" }}>
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-4 animate-pulse">
          <div className="h-14 rounded-2xl bg-slate-800/60" />
          <div className="h-48 rounded-2xl bg-slate-800/40" />
          <div className="h-10 rounded-xl bg-slate-800/30" />
          <div className="h-20 rounded-2xl bg-slate-800/40" />
          <div className="h-20 rounded-2xl bg-slate-800/30" />
        </div>
      </div>
    );
  }

  if (!cliente) return null;

  return (
    <div className="min-h-screen" style={{ background: "#020617", color: "#e2e8f0" }}>
      {/* ── HEADER ── */}
      <header className="sticky top-0 z-30 border-b" style={{ background: "rgba(2,6,23,0.9)", backdropFilter: "blur(12px)", borderColor: "rgba(255,255,255,0.07)" }}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/catalogo" className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <p className="text-xs text-slate-500 font-medium">Mi cuenta</p>
              <p className="text-sm font-bold text-white leading-none">{cliente.nombre}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/catalogo/checkout" className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-orange-400 border border-orange-400/30 hover:bg-orange-400/10 transition-colors">
              <ShoppingBag className="h-3.5 w-3.5" /> Ir al catálogo
            </Link>
            <button onClick={() => { logout(); router.push("/catalogo"); }}
              className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-colors" title="Cerrar sesión">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* ── TARJETA BIENVENIDA ── */}
        <div className="rounded-2xl p-5 flex items-center gap-4"
          style={{ background: "linear-gradient(135deg, rgba(249,115,22,0.12), rgba(249,115,22,0.04))", border: "1px solid rgba(249,115,22,0.3)" }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(249,115,22,0.2)", border: "1px solid rgba(249,115,22,0.4)" }}>
            <User className="h-6 w-6 text-orange-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-white text-lg leading-none">{cliente.nombre}</p>
            <p className="text-xs text-slate-400 mt-1">{cliente.email}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-slate-500 font-medium">Descuento fijo</p>
            <p className="text-xl font-black text-orange-400">-{cliente.descuento_cliente_pct || 3}%</p>
          </div>
        </div>

        {/* ── DATOS DE TRANSFERENCIA ── */}
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(59,130,246,0.3)" }}>
          <div className="px-5 py-4 flex items-center gap-2" style={{ background: "rgba(59,130,246,0.1)" }}>
            <Banknote className="h-5 w-5 text-blue-400" />
            <h2 className="font-black text-white text-base">Datos para Transferencia</h2>
          </div>
          <div className="p-4 space-y-2" style={{ background: "rgba(2,6,23,0.5)" }}>
            <p className="text-xs text-slate-400 mb-3">Usá estos datos para pagar tus pedidos por transferencia bancaria. Luego subí el comprobante en el pedido correspondiente.</p>
            {[
              { label: "Banco",         value: DATOS_TRANSFERENCIA.banco,        key: "db" },
              { label: "Tipo de cuenta", value: DATOS_TRANSFERENCIA.tipoCuenta,  key: "dt" },
              { label: "N° de cuenta",  value: DATOS_TRANSFERENCIA.numeroCuenta, key: "dn" },
              { label: "CBU",           value: DATOS_TRANSFERENCIA.cbu,          key: "dc" },
              { label: "Alias",         value: DATOS_TRANSFERENCIA.alias,        key: "da" },
              { label: "CUIT",          value: DATOS_TRANSFERENCIA.cuit,         key: "dq" },
            ].map(({ label, value, key }) => (
              <div key={key} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">{label}</p>
                  <p className="text-sm font-mono font-bold text-white truncate">{value}</p>
                </div>
                <button type="button" onClick={() => copyToClipboard(value, key)}
                  className="shrink-0 p-2 rounded-lg transition-colors hover:bg-white/10" title="Copiar">
                  {copiedField === key
                    ? <CheckCircle className="h-4 w-4 text-emerald-400" />
                    : <Copy className="h-4 w-4 text-slate-400" />}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── MIS PEDIDOS ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-orange-400" />
              <h2 className="font-black text-white text-base">Mis Pedidos</h2>
              {!loadingPedidos && (
                <span className="text-xs text-slate-500 font-medium px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  {pedidos.length}
                </span>
              )}
            </div>
            <button onClick={fetchPedidos} disabled={loadingPedidos}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-40">
              <RefreshCw className={`h-4 w-4 ${loadingPedidos ? "animate-spin" : ""}`} />
            </button>
          </div>

          {loadingPedidos ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 text-orange-400 animate-spin" />
            </div>
          ) : pedidos.length === 0 ? (
            <div className="rounded-2xl p-10 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <Package className="h-10 w-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">Aún no tenés pedidos</p>
              <p className="text-slate-600 text-sm mt-1">Tus compras aparecerán acá automáticamente</p>
              <Link href="/catalogo" className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl text-sm font-bold text-orange-400 border border-orange-400/30 hover:bg-orange-400/10 transition-colors">
                <ShoppingBag className="h-4 w-4" /> Ir al catálogo
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {pedidos.map((p) => {
                const nroOrden = numeroOrden(p.id, p.created_at);
                const estado = ESTADO_CONFIG[p.estado] || ESTADO_CONFIG["pendiente"];
                const esPago = p.datos_cliente?.formaPago === "Transferencia";
                const comprobante = p.datos_cliente?.comprobante;
                const isExpanded = expandedOrder === p.id;

                return (
                  <div key={p.id} className="rounded-2xl overflow-hidden transition-all"
                    style={{ border: `1px solid ${isExpanded ? "rgba(249,115,22,0.4)" : "rgba(255,255,255,0.08)"}`, background: "rgba(15,23,42,0.5)" }}>

                    {/* Cabecera del pedido */}
                    <button type="button" onClick={() => setExpandedOrder(isExpanded ? null : p.id)}
                      className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/3 transition-colors">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: "rgba(249,115,22,0.15)", border: "1px solid rgba(249,115,22,0.3)" }}>
                        <Hash className="h-4 w-4 text-orange-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-black text-white text-sm font-mono">{nroOrden}</p>
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${estado.color}`}>
                            {estado.icon} {estado.label}
                          </span>
                          {esPago && !comprobante && (
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

                    {/* Detalle expandido */}
                    {isExpanded && (
                      <div className="border-t px-4 pb-4 pt-3 space-y-4" style={{ borderColor: "rgba(255,255,255,0.07)" }}>

                        {/* Número de orden grande */}
                        <div className="rounded-xl p-3 flex items-center gap-3"
                          style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)" }}>
                          <Hash className="h-5 w-5 text-orange-400 shrink-0" />
                          <div>
                            <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wide">Número de Orden</p>
                            <p className="font-black text-white text-lg font-mono">{nroOrden}</p>
                          </div>
                          <button onClick={() => copyToClipboard(nroOrden, `ord-${p.id}`)}
                            className="ml-auto p-2 rounded-lg hover:bg-white/10 transition-colors">
                            {copiedField === `ord-${p.id}`
                              ? <CheckCircle className="h-4 w-4 text-emerald-400" />
                              : <Copy className="h-4 w-4 text-slate-400" />}
                          </button>
                        </div>

                        {/* Items */}
                        {Array.isArray(p.items) && p.items.length > 0 && (
                          <div>
                            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-2">Productos</p>
                            <div className="space-y-1.5">
                              {p.items.map((item: any, i: number) => (
                                <div key={i} className="flex items-center justify-between text-sm rounded-lg px-3 py-2"
                                  style={{ background: "rgba(255,255,255,0.04)" }}>
                                  <span className="text-slate-300 truncate flex-1">{item.nombre || item.sku}</span>
                                  <span className="text-slate-500 text-xs ml-2 shrink-0">x{item.cantidad}</span>
                                  <span className="text-white font-bold ml-3 shrink-0">{fmtMoney(item.precio * item.cantidad)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Info pago */}
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)" }}>
                            <p className="text-[10px] text-slate-500 uppercase font-semibold">Forma de pago</p>
                            <p className="text-white font-bold mt-0.5">{p.datos_cliente?.formaPago || "—"}</p>
                          </div>
                          <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)" }}>
                            <p className="text-[10px] text-slate-500 uppercase font-semibold">Total</p>
                            <p className="text-orange-400 font-black mt-0.5 text-base">{fmtMoney(p.total || 0)}</p>
                          </div>
                        </div>

                        {/* Sección comprobante (solo transferencia) */}
                        {esPago && (
                          <div className="rounded-xl p-4 space-y-3"
                            style={{ background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.25)" }}>
                            <div className="flex items-center gap-2">
                              <Banknote className="h-4 w-4 text-blue-400" />
                              <p className="text-sm font-bold text-blue-300">Comprobante de Transferencia</p>
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
                                <p className="text-[10px] text-slate-500">¿Equivocado? Podés reemplazarlo subiendo uno nuevo.</p>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.3)" }}>
                                <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0" />
                                <p className="text-xs text-yellow-300 font-semibold">Pendiente de comprobante</p>
                              </div>
                            )}

                            {/* Upload */}
                            <div>
                              <input
                                type="file"
                                accept="image/*,.pdf"
                                ref={(el) => { fileRefs.current[p.id] = el; }}
                                style={{ display: "none" }}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleUploadComprobante(p.id, file);
                                  e.target.value = "";
                                }}
                              />
                              <button
                                type="button"
                                disabled={uploadingId === p.id}
                                onClick={() => fileRefs.current[p.id]?.click()}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                                style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.4)", color: "#93c5fd" }}>
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

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-xs text-slate-600">
            ¿Consultas? WhatsApp{" "}
            <a href="https://wa.me/5491121816064" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline font-semibold">
              11-2181-6064
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
