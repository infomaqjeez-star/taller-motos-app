"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft, RefreshCw, Zap, CheckCircle2, XCircle,
  AlertCircle, ChevronDown, ChevronUp, Clock, List,
  Play, SkipForward, Plus, Tag, Calendar, Package,
  Trash2, Search, Sparkles, ChevronLeft, ChevronRight
} from "lucide-react";

interface Account {
  meli_user_id: string;
  nickname: string;
}
interface PromotionOffer {
  item_id: string;
  item_title: string;
  promotion_id: string;
  promotion_type: string;
  original_price: number;
  discount_seller_amount: number;
  discount_meli_amount: number;
  discount_pct: number;
  status: string;
}
interface ScanResult {
  account: string;
  meli_user_id: string;
  accepted: PromotionOffer[];
  skipped: PromotionOffer[];
  errors: PromotionOffer[];
  total: number;
}
interface ScanResponse {
  ok: boolean;
  dry_run: boolean;
  max_pct: number;
  summary: { accepted: number; skipped: number; errors: number };
  results: ScanResult[];
}
interface LogEntry {
  id: string;
  account: string;
  item_title: string;
  promotion_type: string;
  requested_discount_pct: number;
  max_allowed_pct: number;
  action: "accepted" | "skipped" | "error";
  reason: string;
  created_at: string;
}
interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
  start_date: string;
  end_date: string;
  benefits: {
    type: string;
    value?: number;
    min_quantity?: number;
  };
  items_count: number;
  account: string;
  meli_user_id: string;
}
interface Publication {
  id: string;
  title: string;
  price: number;
  permalink?: string;
  thumbnail?: string;
}

function PromotionTypeBadge({ type }: { type: string }) {
  const short =
    type === "MARKETPLACE_CAMPAIGN" ? "CAMPAIGN" :
    type === "LIGHTNING_DEAL"       ? "FLASH" :
    type === "VOLUME_ON_VOLUME"     ? "VOL×VOL" :
    type === "TRADITIONAL"          ? "TRAD" :
    type === "VOLUME"               ? "VOLUMEN" :
    type === "PRICE_DISCOUNT"       ? "DESC" :
    type.slice(0, 8).toUpperCase();
  const color =
    type === "LIGHTNING_DEAL"   ? "#A855F7" :
    type === "VOLUME_ON_VOLUME" ? "#00E5FF" :
    type === "TRADITIONAL"      ? "#39FF14" :
    type === "VOLUME"           ? "#00E5FF" :
                                   "#FF9800";
  return (
    <span className="text-[9px] font-black px-1.5 py-0.5 rounded"
      style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}>
      {short}
    </span>
  );
}

function ActionBadge({ action }: { action: string }) {
  const cfg =
    action === "accepted" ? { color: "#39FF14", label: "ACEPTADA", bg: "#39FF1415" } :
    action === "skipped"  ? { color: "#FF9800", label: "OMITIDA",  bg: "#FF980015" } :
                            { color: "#ef4444", label: "ERROR",    bg: "#ef444415" };
  return (
    <span className="text-[9px] font-black px-1.5 py-0.5 rounded"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}44` }}>
      {cfg.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg =
    status === "active"   ? { color: "#39FF14", label: "ACTIVA" } :
    status === "paused"   ? { color: "#FF9800", label: "PAUSADA" } :
    status === "finished" ? { color: "#6B7280", label: "FINALIZADA" } :
                            { color: "#ef4444", label: status.toUpperCase() };
  return (
    <span className="text-[9px] font-black px-2 py-0.5 rounded-full"
      style={{ background: `${cfg.color}20`, color: cfg.color }}>
      {cfg.label}
    </span>
  );
}

export default function PromocionesPage() {
  const [activeTab, setActiveTab] = useState<"automatizadas" | "propias">("automatizadas");

  // Tab Automatizadas
  const [accounts, setAccounts]       = useState<Account[]>([]);
  const [selectedAcc, setSelectedAcc] = useState("all");
  const [maxPct, setMaxPct]           = useState(15);
  const [dryRun, setDryRun]           = useState(true);
  const [loading, setLoading]         = useState(false);
  const [scanResult, setScanResult]   = useState<ScanResponse | null>(null);
  const [logs, setLogs]               = useState<LogEntry[]>([]);
  const [showLogs, setShowLogs]       = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [nextRun, setNextRun]         = useState<Date | null>(null);
  const [expandedAcc, setExpandedAcc] = useState<string | null>(null);
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tab Propias
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [loadingPubs, setLoadingPubs] = useState(false);
  const [selectedPubs, setSelectedPubs] = useState<string[]>([]);
  const [pubSearch, setPubSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [createResult, setCreateResult] = useState<{ok: boolean; message: string} | null>(null);

  // Form crear campaña
  const [campaignForm, setCampaignForm] = useState({
    name: "",
    discount_percentage: 10,
    start_date: "",
    end_date: "",
    promotion_type: "TRADITIONAL" as "TRADITIONAL" | "VOLUME",
    min_quantity: 2,
  });

  // Calendario
  const [showCalendar, setShowCalendar] = useState<"start" | "end" | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Fechas disponibles (simulado - en producción vendría de MeLi)
  const getAvailableDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 60; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  };

  // Cargar cuentas
  useEffect(() => {
    fetch("/api/meli-accounts")
      .then(r => r.json())
      .then(d => {
        const list = Array.isArray(d) ? d : (d.accounts ?? []);
        setAccounts(list);
      })
      .catch(() => {});
  }, []);

  // Cargar campañas propias
  const loadCampaigns = useCallback(async () => {
    setLoadingCampaigns(true);
    try {
      const res = await fetch("/api/promociones-propias");
      const d = await res.json();
      if (d.ok) setCampaigns(d.campaigns ?? []);
    } catch { /* ignore */ } finally {
      setLoadingCampaigns(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "propias") loadCampaigns();
  }, [activeTab, loadCampaigns]);

  // Cargar publicaciones - Se ejecuta cuando cambia la cuenta seleccionada
  const loadPublications = useCallback(async () => {
    if (!selectedAcc || selectedAcc === "all") {
      setPublications([]);
      return;
    }
    setLoadingPubs(true);
    try {
      const res = await fetch(`/api/meli-publications?account_id=${selectedAcc}&limit=200&format=simple`);
      const d = await res.json();
      const pubs = d.publications ?? [];
      setPublications(pubs.map((p: Record<string, unknown>) => ({
        id: String(p.id ?? ""),
        title: String(p.title ?? ""),
        price: Number(p.price ?? 0),
        permalink: String(p.permalink ?? ""),
        thumbnail: String(p.thumbnail ?? ""),
      })));
    } catch (e) {
      console.error("Error cargando publicaciones:", e);
    } finally {
      setLoadingPubs(false);
    }
  }, [selectedAcc]);

  // Recargar publicaciones cuando cambia la cuenta en pestaña propias
  useEffect(() => {
    if (activeTab === "propias" && showCreateForm && selectedAcc !== "all") {
      loadPublications();
    }
  }, [activeTab, showCreateForm, selectedAcc, loadPublications]);

  const runScan = useCallback(async (auto = false) => {
    setLoading(true);
    setError(null);
    if (!auto) setScanResult(null);
    try {
      const params = new URLSearchParams({
        action:     "scan",
        max_pct:    String(maxPct),
        account_id: selectedAcc,
        dry_run:    String(dryRun),
      });
      const res = await fetch(`/api/meli-promotions?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d: ScanResponse = await res.json();
      setScanResult(d);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [maxPct, selectedAcc, dryRun]);

  const loadLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch("/api/meli-promotions?action=logs&limit=150");
      const d = await res.json();
      setLogs(d.logs ?? []);
    } catch { /* ignore */ } finally {
      setLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    if (showLogs) loadLogs();
  }, [showLogs, loadLogs]);

  // Auto cada 12 horas
  useEffect(() => {
    if (autoEnabled) {
      const ms = 12 * 60 * 60 * 1000;
      setNextRun(new Date(Date.now() + ms));
      autoRef.current = setInterval(() => {
        runScan(true);
        setNextRun(new Date(Date.now() + ms));
      }, ms);
    } else {
      if (autoRef.current) clearInterval(autoRef.current);
      setNextRun(null);
    }
    return () => { if (autoRef.current) clearInterval(autoRef.current); };
  }, [autoEnabled, runScan]);

  // Crear campaña propia
  const createCampaign = async () => {
    if (!campaignForm.name || !campaignForm.start_date || !campaignForm.end_date || selectedPubs.length === 0) {
      setCreateResult({ ok: false, message: "Completa todos los campos y selecciona al menos una publicación" });
      return;
    }
    setCreating(true);
    setCreateResult(null);
    try {
      const body: Record<string, unknown> = {
        account_id: selectedAcc,
        name: campaignForm.name,
        discount_percentage: campaignForm.discount_percentage,
        start_date: campaignForm.start_date,
        end_date: campaignForm.end_date,
        item_ids: selectedPubs,
        promotion_type: campaignForm.promotion_type,
      };
      if (campaignForm.promotion_type === "VOLUME") {
        body.volume_config = {
          min_quantity: campaignForm.min_quantity,
          discount_percentage: campaignForm.discount_percentage,
        };
      }
      const res = await fetch("/api/promociones-propias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (d.ok) {
        setCreateResult({ 
          ok: true, 
          message: `Campaña "${d.campaign.name}" creada con ${d.items_added} items` 
        });
        setCampaignForm({ ...campaignForm, name: "" });
        setSelectedPubs([]);
        loadCampaigns();
      } else {
        // Mejorar el mensaje de error con los detalles del backend
        let errorMsg = d.error || "Error al crear campaña";
        if (d.details?.message) errorMsg += `: ${d.details.message}`;
        if (d.details?.error) errorMsg += `: ${d.details.error}`;
        if (d.status) errorMsg += ` (HTTP ${d.status})`;
        setCreateResult({ ok: false, message: errorMsg });
      }
    } catch (e) {
      setCreateResult({ ok: false, message: (e as Error).message });
    } finally {
      setCreating(false);
    }
  };

  const filteredPubs = publications.filter(p => 
    p.title.toLowerCase().includes(pubSearch.toLowerCase()) ||
    p.id.includes(pubSearch)
  );

  const summary = scanResult?.summary;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
  };

  return (
    <main className="min-h-screen pb-28" style={{ background: "#121212" }}>
      {/* Header */}
      <div className="sticky top-0 z-30 px-4 py-3 flex items-center justify-between border-b"
        style={{ background: "rgba(18,18,18,0.97)", backdropFilter: "blur(16px)", borderColor: "rgba(255,255,255,0.07)" }}>
        <div className="flex items-center gap-3">
          <Link href="/" className="p-1.5 rounded-lg"
            style={{ background: "rgba(255,255,255,0.05)" }}>
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </Link>
          <div>
            <h1 className="font-black text-white text-base flex items-center gap-2">
              <Zap className="w-5 h-5" style={{ color: "#FFE600" }} /> Promociones
            </h1>
            <p className="text-[10px]" style={{ color: "#6B7280" }}>Automáticas y campañas propias</p>
          </div>
        </div>
      </div>

      {/* Tabs - Más chicos y centrados */}
      <div className="px-4 pt-4 flex justify-center">
        <div className="inline-flex gap-2 p-1 rounded-xl" style={{ background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.07)" }}>
          <button
            onClick={() => setActiveTab("automatizadas")}
            className="py-2 px-4 rounded-lg text-[11px] font-black transition-all flex items-center justify-center gap-1.5"
            style={activeTab === "automatizadas"
              ? { background: "#FFE600", color: "#121212" }
              : { color: "#9CA3AF" }}>
            <Sparkles className="w-3.5 h-3.5" /> Automáticas
          </button>
          <button
            onClick={() => setActiveTab("propias")}
            className="py-2 px-4 rounded-lg text-[11px] font-black transition-all flex items-center justify-center gap-1.5"
            style={activeTab === "propias"
              ? { background: "#39FF14", color: "#121212" }
              : { color: "#9CA3AF" }}>
            <Tag className="w-3.5 h-3.5" /> Mis Campañas
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">

        {/* TAB: AUTOMATIZADAS */}
        {activeTab === "automatizadas" && (
          <>
            {/* Configuración */}
            <div className="rounded-2xl p-4 space-y-4"
              style={{ background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.07)" }}>
              <p className="text-sm font-black text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4" style={{ color: "#FFE600" }} /> Piloto Automático
              </p>

              {/* Selector de cuenta */}
              <div>
                <label className="text-xs font-bold mb-2 block" style={{ color: "#6B7280" }}>
                  Cuentas a escanear
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedAcc("all")}
                    className="px-3 py-1.5 rounded-xl text-xs font-black transition-all border"
                    style={selectedAcc === "all"
                      ? { background: "#FFE600", color: "#121212", borderColor: "#FFE600" }
                      : { background: "transparent", color: "#9CA3AF", borderColor: "rgba(255,255,255,0.15)" }}>
                    ★ Todas
                  </button>
                  {accounts.map(a => (
                    <button
                      key={a.meli_user_id}
                      onClick={() => setSelectedAcc(String(a.meli_user_id))}
                      className="px-3 py-1.5 rounded-xl text-xs font-black transition-all border"
                      style={selectedAcc === String(a.meli_user_id)
                        ? { background: "#39FF14", color: "#121212", borderColor: "#39FF14" }
                        : { background: "transparent", color: "#9CA3AF", borderColor: "rgba(255,255,255,0.15)" }}>
                      {a.nickname}
                    </button>
                  ))}
                </div>
                {accounts.length === 0 && (
                  <p className="text-[10px] mt-1.5" style={{ color: "#4B5563" }}>Cargando cuentas...</p>
                )}
              </div>

              {/* Máximo % */}
              <div>
                <label className="text-xs font-bold mb-1.5 flex items-center justify-between" style={{ color: "#6B7280" }}>
                  <span>Descuento máximo a aceptar</span>
                  <span className="text-lg font-black" style={{ color: "#FFE600" }}>{maxPct}%</span>
                </label>
                <input
                  type="range" min={1} max={50} step={1}
                  value={maxPct}
                  onChange={e => setMaxPct(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{ accentColor: "#FFE600" }}
                />
                <div className="flex justify-between text-[10px] mt-1" style={{ color: "#4B5563" }}>
                  <span>1%</span><span>25%</span><span>50%</span>
                </div>
              </div>

              {/* Modo simulación */}
              <div className="flex items-center justify-between p-3 rounded-xl"
                style={{ background: "#121212", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div>
                  <p className="text-xs font-bold text-white">Modo Simulación</p>
                  <p className="text-[10px] mt-0.5" style={{ color: "#6B7280" }}>Ver qué se aceptaría sin ejecutar cambios reales</p>
                </div>
                <button onClick={() => setDryRun(!dryRun)}
                  className="w-12 h-6 rounded-full relative transition-all flex-shrink-0"
                  style={{ background: dryRun ? "#FFE600" : "#374151" }}>
                  <span className="absolute top-0.5 w-5 h-5 rounded-full transition-all"
                    style={{ background: "white", left: dryRun ? "calc(100% - 22px)" : "2px" }} />
                </button>
              </div>

              {/* Auto cada 12h */}
              <div className="flex items-center justify-between p-3 rounded-xl"
                style={{ background: "#121212", border: `1px solid ${autoEnabled ? "#39FF1430" : "rgba(255,255,255,0.07)"}` }}>
                <div>
                  <p className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" style={{ color: "#39FF14" }} /> Auto cada 12 horas
                  </p>
                  {nextRun && (
                    <p className="text-[10px] mt-0.5" style={{ color: "#39FF14" }}>
                      Próxima: {nextRun.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  )}
                  {!autoEnabled && (
                    <p className="text-[10px] mt-0.5" style={{ color: "#6B7280" }}>Requiere que la pestaña esté abierta</p>
                  )}
                </div>
                <button onClick={() => setAutoEnabled(!autoEnabled)}
                  className="w-12 h-6 rounded-full relative transition-all flex-shrink-0"
                  style={{ background: autoEnabled ? "#39FF14" : "#374151" }}>
                  <span className="absolute top-0.5 w-5 h-5 rounded-full transition-all"
                    style={{ background: "white", left: autoEnabled ? "calc(100% - 22px)" : "2px" }} />
                </button>
              </div>

              {/* Botón ejecutar */}
              <button
                onClick={() => runScan()}
                disabled={loading}
                className="w-full py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                style={{ background: dryRun ? "#FFE600" : "#39FF14", color: "#121212" }}>
                {loading
                  ? <><RefreshCw className="w-4 h-4 animate-spin" />Escaneando...</>
                  : dryRun
                    ? <><Play className="w-4 h-4" />Simular escaneo</>
                    : <><Zap className="w-4 h-4" />Ejecutar y aceptar</>}
              </button>
              {!dryRun && (
                <p className="text-[10px] text-center" style={{ color: "#ef4444" }}>
                  ⚠️ Modo real: las promociones dentro del límite se aceptarán en MeLi
                </p>
              )}
            </div>

            {error && (
              <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: "#ef444418", border: "1px solid #ef444440" }}>
                <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: "#ef4444" }} />
                <p className="text-sm text-white">{error}</p>
              </div>
            )}

            {/* Resumen del escaneo */}
            {scanResult && (
              <>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Aceptadas", val: summary?.accepted ?? 0, color: "#39FF14" },
                    { label: "Omitidas", val: summary?.skipped ?? 0, color: "#FF9800" },
                    { label: "Errores", val: summary?.errors ?? 0, color: "#ef4444" },
                  ].map(s => (
                    <div key={s.label} className="rounded-2xl p-3 text-center"
                      style={{ background: "#1A1A1A", border: `1px solid ${s.color}25` }}>
                      <p className="text-2xl font-black" style={{ color: s.color }}>{s.val}</p>
                      <p className="text-[10px] font-bold text-white mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
                {scanResult.dry_run && (
                  <div className="rounded-xl px-3 py-2 text-center" style={{ background: "#FFE60012", border: "1px solid #FFE60030" }}>
                    <p className="text-xs font-bold" style={{ color: "#FFE600" }}>SIMULACIÓN — ningún cambio fue aplicado en MeLi</p>
                  </div>
                )}

                {/* Detalle por cuenta */}
                {scanResult.results.map(r => (
                  <div key={r.meli_user_id} className="rounded-2xl overflow-hidden"
                    style={{ background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <button
                      onClick={() => setExpandedAcc(expandedAcc === r.meli_user_id ? null : r.meli_user_id)}
                      className="w-full px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-white">{r.account}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "#FFE60018", color: "#FFE600" }}>
                          {r.total} ofertas
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold" style={{ color: "#39FF14" }}>+{r.accepted.length}</span>
                        <span className="text-xs font-bold" style={{ color: "#FF9800" }}>~{r.skipped.length}</span>
                        {expandedAcc === r.meli_user_id
                          ? <ChevronUp className="w-4 h-4 text-gray-500" />
                          : <ChevronDown className="w-4 h-4 text-gray-500" />}
                      </div>
                    </button>

                    {expandedAcc === r.meli_user_id && (
                      <div className="px-3 pb-3 space-y-1 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                        {[...r.accepted, ...r.skipped, ...r.errors].map((offer, i) => (
                          <div key={`${offer.item_id}-${i}`} className="flex items-start gap-2 px-3 py-2.5 rounded-xl" style={{ background: "#121212" }}>
                            {offer.status === "accepted" || offer.status === "would_accept"
                              ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#39FF14" }} />
                              : offer.status === "skipped"
                                ? <SkipForward className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#FF9800" }} />
                                : <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#ef4444" }} />}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                                <PromotionTypeBadge type={offer.promotion_type} />
                                <span className="text-[10px] font-black"
                                  style={{ color: offer.discount_pct <= maxPct ? "#39FF14" : "#ef4444" }}>
                                  {offer.discount_pct}%
                                </span>
                              </div>
                              <p className="text-xs text-white line-clamp-1">{offer.item_title}</p>
                              <p className="text-[10px]" style={{ color: "#6B7280" }}>
                                Vendedor: ${offer.discount_seller_amount.toLocaleString("es-AR")} · MeLi: ${offer.discount_meli_amount.toLocaleString("es-AR")}
                              </p>
                            </div>
                          </div>
                        ))}
                        {r.accepted.length === 0 && r.skipped.length === 0 && r.errors.length === 0 && (
                          <p className="text-xs text-center py-4" style={{ color: "#6B7280" }}>Sin ofertas disponibles</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}

            {/* Historial */}
            <div className="rounded-2xl overflow-hidden" style={{ background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.07)" }}>
              <button onClick={() => setShowLogs(!showLogs)} className="w-full px-4 py-3 flex items-center justify-between">
                <span className="font-black text-sm text-white flex items-center gap-2">
                  <List className="w-4 h-4" style={{ color: "#FFE600" }} /> Historial de acciones
                </span>
                {showLogs ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
              </button>
              {showLogs && (
                <div className="border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  {loadingLogs && <div className="p-6 text-center"><RefreshCw className="w-5 h-5 mx-auto animate-spin" style={{ color: "#FFE600" }} /></div>}
                  {!loadingLogs && logs.length === 0 && <p className="text-xs text-center py-6" style={{ color: "#6B7280" }}>Sin historial aún</p>}
                  {!loadingLogs && logs.map(log => (
                    <div key={log.id} className="flex items-start gap-3 px-4 py-3 border-b last:border-0" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                      <ActionBadge action={log.action} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white line-clamp-1">{log.item_title}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: "#6B7280" }}>{log.account} · {log.reason}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[10px] font-black"
                          style={{ color: log.action === "accepted" ? "#39FF14" : log.action === "skipped" ? "#FF9800" : "#ef4444" }}>
                          {log.requested_discount_pct}%
                        </p>
                        <p className="text-[10px]" style={{ color: "#4B5563" }}>
                          {new Date(log.created_at).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Info stacking */}
            <div className="rounded-2xl p-4 space-y-2" style={{ background: "#1A1A1A", border: "1px solid #FF980025" }}>
              <p className="text-xs font-black" style={{ color: "#FF9800" }}>⚠️ Aviso sobre Stacking</p>
              <p className="text-[11px]" style={{ color: "#9CA3AF" }}>
                El % mostrado es el descuento que <strong className="text-white">vos absorbés</strong> como vendedor. 
                MeLi puede combinar este descuento con cupones propios.
              </p>
            </div>
          </>
        )}

        {/* TAB: PROMOCIONES PROPIAS */}
        {activeTab === "propias" && (
          <>
            {/* Botón crear - Más compacto */}
            <div className="flex justify-center">
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="py-2.5 px-6 rounded-xl font-black text-xs transition-all flex items-center gap-2"
                style={{ background: "#39FF14", color: "#121212" }}>
                {showCreateForm ? (
                  <><XCircle className="w-4 h-4" /> Cancelar</>
                ) : (
                  <><Plus className="w-4 h-4" /> Nueva Campaña</>
                )}
              </button>
            </div>

            {/* Form crear campaña */}
            {showCreateForm && (
              <div className="rounded-2xl p-4 space-y-4" style={{ background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.07)" }}>
                <p className="text-sm font-black text-white">Nueva Campaña de Descuento</p>

                {/* Selector cuenta */}
                <div>
                  <label className="text-xs font-bold mb-2 block" style={{ color: "#6B7280" }}>Cuenta</label>
                  <div className="flex flex-wrap gap-2">
                    {accounts.map(a => (
                      <button
                        key={a.meli_user_id}
                        onClick={() => setSelectedAcc(String(a.meli_user_id))}
                        className="px-3 py-1.5 rounded-xl text-xs font-black transition-all border"
                        style={selectedAcc === String(a.meli_user_id)
                          ? { background: "#39FF14", color: "#121212", borderColor: "#39FF14" }
                          : { background: "transparent", color: "#9CA3AF", borderColor: "rgba(255,255,255,0.15)" }}>
                        {a.nickname}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Nombre */}
                <div>
                  <label className="text-xs font-bold mb-1.5 block" style={{ color: "#6B7280" }}>Nombre de la campaña</label>
                  <input
                    type="text"
                    value={campaignForm.name}
                    onChange={e => setCampaignForm({ ...campaignForm, name: e.target.value })}
                    placeholder="Ej: Descuento Fin de Semana"
                    className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                    style={{ background: "#121212", border: "1px solid rgba(255,255,255,0.1)" }}
                  />
                </div>

                {/* Tipo */}
                <div>
                  <label className="text-xs font-bold mb-1.5 block" style={{ color: "#6B7280" }}>Tipo de promoción</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCampaignForm({ ...campaignForm, promotion_type: "TRADITIONAL" })}
                      className="flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all"
                      style={campaignForm.promotion_type === "TRADITIONAL"
                        ? { background: "#FFE600", color: "#121212" }
                        : { background: "#121212", color: "#9CA3AF", border: "1px solid rgba(255,255,255,0.1)" }}>
                      Descuento Tradicional
                    </button>
                    <button
                      onClick={() => setCampaignForm({ ...campaignForm, promotion_type: "VOLUME" })}
                      className="flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all"
                      style={campaignForm.promotion_type === "VOLUME"
                        ? { background: "#00E5FF", color: "#121212" }
                        : { background: "#121212", color: "#9CA3AF", border: "1px solid rgba(255,255,255,0.1)" }}>
                      Por Volumen (Llevá X, pagá Y)
                    </button>
                  </div>
                </div>

                {/* % Descuento */}
                <div>
                  <label className="text-xs font-bold mb-1.5 flex items-center justify-between" style={{ color: "#6B7280" }}>
                    <span>% de descuento</span>
                    <span className="text-lg font-black" style={{ color: "#39FF14" }}>{campaignForm.discount_percentage}%</span>
                  </label>
                  <input
                    type="range" min={1} max={50} step={1}
                    value={campaignForm.discount_percentage}
                    onChange={e => setCampaignForm({ ...campaignForm, discount_percentage: Number(e.target.value) })}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer"
                    style={{ accentColor: "#39FF14" }}
                  />
                </div>

                {/* Config volumen */}
                {campaignForm.promotion_type === "VOLUME" && (
                  <div>
                    <label className="text-xs font-bold mb-1.5 block" style={{ color: "#6B7280" }}>Cantidad mínima</label>
                    <input
                      type="number" min={2} max={10}
                      value={campaignForm.min_quantity}
                      onChange={e => setCampaignForm({ ...campaignForm, min_quantity: Number(e.target.value) })}
                      className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                      style={{ background: "#121212", border: "1px solid rgba(255,255,255,0.1)" }}
                    />
                    <p className="text-[10px] mt-1" style={{ color: "#6B7280" }}>El comprador debe llevar esta cantidad para aplicar el descuento</p>
                  </div>
                )}

                {/* Fechas tipo MeLi */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <label className="text-xs font-bold mb-1.5 block" style={{ color: "#6B7280" }}>Fecha inicio</label>
                    <button
                      onClick={() => setShowCalendar(showCalendar === "start" ? null : "start")}
                      className="w-full px-3 py-2.5 rounded-xl text-sm text-left flex items-center justify-between transition-all"
                      style={{ background: "#121212", border: "1px solid rgba(255,255,255,0.1)", color: campaignForm.start_date ? "white" : "#6B7280" }}
                    >
                      <span>{campaignForm.start_date ? new Date(campaignForm.start_date).toLocaleDateString("es-AR") : "Seleccionar fecha"}</span>
                      <Calendar className="w-4 h-4" style={{ color: "#6B7280" }} />
                    </button>
                    
                    {showCalendar === "start" && (
                      <CalendarPicker
                        selected={campaignForm.start_date}
                        onSelect={(date) => {
                          setCampaignForm({ ...campaignForm, start_date: date });
                          setShowCalendar(null);
                        }}
                        onClose={() => setShowCalendar(null)}
                      />
                    )}
                  </div>
                  <div className="relative">
                    <label className="text-xs font-bold mb-1.5 block" style={{ color: "#6B7280" }}>Fecha fin</label>
                    <button
                      onClick={() => setShowCalendar(showCalendar === "end" ? null : "end")}
                      className="w-full px-3 py-2.5 rounded-xl text-sm text-left flex items-center justify-between transition-all"
                      style={{ background: "#121212", border: "1px solid rgba(255,255,255,0.1)", color: campaignForm.end_date ? "white" : "#6B7280" }}
                    >
                      <span>{campaignForm.end_date ? new Date(campaignForm.end_date).toLocaleDateString("es-AR") : "Seleccionar fecha"}</span>
                      <Calendar className="w-4 h-4" style={{ color: "#6B7280" }} />
                    </button>
                    
                    {showCalendar === "end" && (
                      <CalendarPicker
                        selected={campaignForm.end_date}
                        onSelect={(date) => {
                          setCampaignForm({ ...campaignForm, end_date: date });
                          setShowCalendar(null);
                        }}
                        onClose={() => setShowCalendar(null)}
                        minDate={campaignForm.start_date}
                      />
                    )}
                  </div>
                </div>

                {/* Selector de publicaciones */}
                {selectedAcc !== "all" && (
                  <div>
                    {/* Header con botones de selección */}
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold" style={{ color: "#6B7280" }}>
                        Seleccionar publicaciones ({selectedPubs.length} de {filteredPubs.length})
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedPubs(filteredPubs.map(p => p.id))}
                          className="text-[10px] font-bold px-2 py-1 rounded-lg transition-all"
                          style={{ background: "rgba(57,255,20,0.15)", color: "#39FF14" }}
                        >
                          Seleccionar todo
                        </button>
                        {selectedPubs.length > 0 && (
                          <button
                            onClick={() => setSelectedPubs([])}
                            className="text-[10px] font-bold px-2 py-1 rounded-lg transition-all"
                            style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}
                          >
                            Deseleccionar
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* Buscador */}
                    <div className="relative mb-2">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#6B7280" }} />
                      <input
                        type="text"
                        value={pubSearch}
                        onChange={e => setPubSearch(e.target.value)}
                        placeholder="Buscar por título o ID..."
                        className="w-full pl-9 pr-3 py-2 rounded-xl text-xs text-white outline-none"
                        style={{ background: "#121212", border: "1px solid rgba(255,255,255,0.1)" }}
                      />
                    </div>
                    
                    {/* Lista de publicaciones con thumbnails */}
                    <div className="max-h-64 overflow-y-auto rounded-xl space-y-1 p-2"
                      style={{ background: "#121212", border: "1px solid rgba(255,255,255,0.07)" }}>
                      {loadingPubs && <p className="text-xs text-center py-4" style={{ color: "#6B7280" }}>Cargando...</p>}
                      {!loadingPubs && filteredPubs.length === 0 && (
                        <p className="text-xs text-center py-4" style={{ color: "#6B7280" }}>Sin publicaciones</p>
                      )}
                      {!loadingPubs && filteredPubs.map(pub => (
                        <label key={pub.id} className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-white/5">
                          <input
                            type="checkbox"
                            checked={selectedPubs.includes(pub.id)}
                            onChange={e => {
                              if (e.target.checked) setSelectedPubs([...selectedPubs, pub.id]);
                              else setSelectedPubs(selectedPubs.filter(id => id !== pub.id));
                            }}
                            className="w-4 h-4 rounded flex-shrink-0"
                            style={{ accentColor: "#39FF14" }}
                          />
                          {/* Thumbnail */}
                          <div className="w-10 h-10 rounded-lg flex-shrink-0 overflow-hidden bg-gray-800 flex items-center justify-center">
                            {pub.thumbnail ? (
                              <img 
                                src={pub.thumbnail} 
                                alt={pub.title}
                                className="w-full h-full object-cover"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            ) : (
                              <Package className="w-5 h-5" style={{ color: "#4B5563" }} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-white line-clamp-1">{pub.title}</p>
                            <p className="text-[10px]" style={{ color: "#6B7280" }}>${pub.price.toLocaleString("es-AR")}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resultado */}
                {createResult && (
                  <div className={`rounded-xl p-3 ${createResult.ok ? "bg-green-500/10 border border-green-500/30" : "bg-red-500/10 border border-red-500/30"}`}>
                    <p className={`text-xs ${createResult.ok ? "text-green-400" : "text-red-400"}`}>{createResult.message}</p>
                  </div>
                )}

                {/* Botón crear - Compacto */}
                <div className="flex justify-center">
                  <button
                    onClick={createCampaign}
                    disabled={creating || !campaignForm.name || !campaignForm.start_date || !campaignForm.end_date || selectedPubs.length === 0}
                    className="py-2.5 px-6 rounded-xl font-black text-xs transition-all disabled:opacity-50 flex items-center gap-2"
                    style={{ background: "#39FF14", color: "#121212" }}>
                    {creating ? <><RefreshCw className="w-4 h-4 animate-spin" />Creando...</> : <><Plus className="w-4 h-4" />Crear Campaña</>}
                  </button>
                </div>
              </div>
            )}

            {/* Lista de campañas */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-black text-white">Mis Campañas</p>
                <button onClick={loadCampaigns} className="p-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <RefreshCw className={`w-4 h-4 ${loadingCampaigns ? "animate-spin" : ""}`} style={{ color: "#FFE600" }} />
                </button>
              </div>

              {loadingCampaigns && <p className="text-xs text-center py-4" style={{ color: "#6B7280" }}>Cargando campañas...</p>}

              {!loadingCampaigns && campaigns.length === 0 && (
                <div className="rounded-2xl p-6 text-center" style={{ background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <Tag className="w-8 h-8 mx-auto mb-2" style={{ color: "#6B7280" }} />
                  <p className="text-sm text-white">No tenés campañas activas</p>
                  <p className="text-[11px] mt-1" style={{ color: "#6B7280" }}>Creá tu primera promoción propia</p>
                </div>
              )}

              {!loadingCampaigns && campaigns.map(campaign => (
                <div key={campaign.id} className="rounded-2xl p-4 space-y-3"
                  style={{ background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <PromotionTypeBadge type={campaign.type} />
                        <StatusBadge status={campaign.status} />
                      </div>
                      <p className="text-sm font-bold text-white">{campaign.name}</p>
                      <p className="text-[10px]" style={{ color: "#6B7280" }}>{campaign.account}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black" style={{ color: "#39FF14" }}>
                        {campaign.benefits?.value ?? campaign.benefits?.min_quantity ?? 0}%
                      </p>
                      <p className="text-[10px]" style={{ color: "#6B7280" }}>descuento</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-[10px]" style={{ color: "#6B7280" }}>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(campaign.start_date)} - {formatDate(campaign.end_date)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Package className="w-3 h-3" />
                      {campaign.items_count} items
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

      </div>
    </main>
  );
}

// Componente CalendarPicker tipo MeLi
interface CalendarPickerProps {
  selected: string;
  onSelect: (date: string) => void;
  onClose: () => void;
  minDate?: string;
}

function CalendarPicker({ selected, onSelect, onClose, minDate }: CalendarPickerProps) {
  const [currentMonth, setCurrentMonth] = useState(selected ? new Date(selected) : new Date());
  
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };
  
  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };
  
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  
  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }
  
  const handleDateClick = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (minDate && dateStr < minDate) return;
    onSelect(dateStr);
  };
  
  const isSelected = (day: number) => {
    if (!selected) return false;
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return dateStr === selected;
  };
  
  const isDisabled = (day: number) => {
    if (!minDate || !day) return false;
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return dateStr < minDate;
  };
  
  const prevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };
  
  const nextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };
  
  return (
    <div className="absolute z-50 mt-1 p-3 rounded-xl shadow-2xl" style={{ background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.1)", minWidth: "260px" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="p-1 rounded-lg hover:bg-white/10">
          <ChevronLeft className="w-4 h-4 text-white" />
        </button>
        <span className="text-sm font-black text-white">{monthNames[month]} {year}</span>
        <button onClick={nextMonth} className="p-1 rounded-lg hover:bg-white/10">
          <ChevronRight className="w-4 h-4 text-white" />
        </button>
      </div>
      
      {/* Day names */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map(day => (
          <div key={day} className="text-center text-[10px] font-bold" style={{ color: "#6B7280" }}>{day}</div>
        ))}
      </div>
      
      {/* Days */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => (
          <button
            key={i}
            onClick={() => day && handleDateClick(day)}
            disabled={!day || isDisabled(day)}
            className={`
              aspect-square rounded-lg text-xs font-black transition-all
              ${!day ? "invisible" : ""}
              ${isSelected(day!) ? "text-[#121212]" : "text-white"}
              ${isDisabled(day!) ? "opacity-30 cursor-not-allowed" : "hover:bg-white/10"}
            `}
            style={{
              background: isSelected(day!) ? "#FFE600" : "transparent",
            }}
          >
            {day}
          </button>
        ))}
      </div>
      
      {/* Close button */}
      <button
        onClick={onClose}
        className="w-full mt-3 py-2 rounded-lg text-xs font-black"
        style={{ background: "rgba(255,255,255,0.1)", color: "white" }}
      >
        Cancelar
      </button>
    </div>
  );
}
