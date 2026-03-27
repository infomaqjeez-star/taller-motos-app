"use client";
import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import {
  ArrowLeft, RefreshCw, Printer, Download, CheckCircle2,
  Package, Truck, Zap, AlertCircle, ChevronDown, ChevronRight, Clock,
} from "lucide-react";

type UrgencyType  = "delayed" | "today" | "upcoming";
type LogisticType = "flex" | "turbo" | "correo" | "full";
type MainTab      = "despachar" | "full" | "demorados" | "impresas";
type HistPeriod   = "today" | "yesterday" | "week";

interface ShipmentInfo {
  shipment_id:    number;
  order_id:       number | null;
  order_date:     string | null;
  account:        string;
  meli_user_id:   string;
  type:           LogisticType;
  buyer:          string;
  buyer_nickname: string | null;
  title:          string;
  quantity:       number;
  unit_price:     number | null;
  seller_sku:     string | null;
  status:         string;
  status_label:   string | null;
  substatus:      string | null;
  urgency:        UrgencyType;
  delivery_date:  string | null;
  dispatch_date:  string | null;
  thumbnail:      string | null;
  item_id:        string | null;
  printed_at?:    string;
}
interface Summary {
  correo: number; flex: number; turbo: number; full: number;
  delayed_unshipped: number; delayed_in_transit: number;
}
interface LabelData {
  shipments:          ShipmentInfo[];
  full:               ShipmentInfo[];
  delayed_unshipped:  ShipmentInfo[];
  delayed_in_transit: ShipmentInfo[];
  summary:            Summary;
}

/* ── Colores por tipo ── */
const TYPE_CFG: Record<LogisticType, { color: string; label: string; icon: React.ReactNode }> = {
  correo: { color: "#FF9800", label: "CORREO",  icon: <Truck className="w-3.5 h-3.5" /> },
  flex:   { color: "#00E5FF", label: "FLEX",    icon: <Truck className="w-3.5 h-3.5" /> },
  turbo:  { color: "#A855F7", label: "TURBO",   icon: <Zap   className="w-3.5 h-3.5" /> },
  full:   { color: "#FFE600", label: "FULL",    icon: <span className="text-xs">⚡</span> },
};

/* ── Tarjeta de resumen ── */
function SummaryCard({ type, count, active, onClick }: {
  type: LogisticType; count: number; active?: boolean; onClick?: () => void;
}) {
  const cfg = TYPE_CFG[type];
  return (
    <button onClick={onClick}
      className="flex-1 min-w-0 rounded-2xl p-3 text-center transition-all"
      style={{
        background: active ? `${cfg.color}22` : "#1A1A1A",
        border: `1.5px solid ${active ? cfg.color : cfg.color + "30"}`,
      }}>
      <p className="text-xl font-black" style={{ color: cfg.color }}>{count}</p>
      <p className="text-[10px] font-black text-white mt-0.5 flex items-center justify-center gap-1">
        {cfg.icon}{cfg.label}
      </p>
    </button>
  );
}

/* ── Badge tipo ── */
function TypeBadge({ type }: { type: LogisticType }) {
  const cfg = TYPE_CFG[type];
  return (
    <span className="text-[9px] font-black px-1.5 py-0.5 rounded"
      style={{ background: cfg.color, color: "#121212" }}>
      {cfg.label}
    </span>
  );
}

/* ── Tarjeta de envío ── */
function ShipmentCard({ s, selected, onToggle, showCheckbox = true }: {
  s: ShipmentInfo; selected?: boolean; onToggle?: (id: number) => void; showCheckbox?: boolean;
}) {
  const borderColor =
    s.urgency === "delayed" ? "#ef4444" :
    s.urgency === "today"   ? "#FF9800" : "rgba(255,255,255,0.06)";

  const formattedDate = s.order_date
    ? new Date(s.order_date).toLocaleString("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
    : null;
  const deliveryStr = s.delivery_date
    ? new Date(s.delivery_date).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })
    : null;

  return (
    <div onClick={() => onToggle?.(s.shipment_id)}
      className={`rounded-2xl mb-2 overflow-hidden transition-all ${onToggle ? "cursor-pointer" : ""}`}
      style={{
        background: selected ? "rgba(255,230,0,0.05)" : "#1A1A1A",
        border: `1px solid ${selected ? "#FFE60050" : borderColor}`,
      }}>

      {/* Fila superior */}
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5 flex-wrap"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        {showCheckbox && onToggle && (
          <div className="w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border-2 transition-all"
            style={{ borderColor: selected ? "#FFE600" : "#374151", background: selected ? "#FFE600" : "transparent" }}>
            {selected && <CheckCircle2 className="w-3 h-3 text-black" />}
          </div>
        )}
        <span className="text-[10px] font-black px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ background: "#FFE60020", color: "#FFE600" }}>{s.account}</span>
        {s.order_id && (
          <span className="text-[10px] font-bold flex-shrink-0" style={{ color: "#9CA3AF" }}>
            #{s.order_id}
          </span>
        )}
        {formattedDate && (
          <span className="text-[10px] flex-shrink-0" style={{ color: "#6B7280" }}>{formattedDate} hs</span>
        )}
        <TypeBadge type={s.type} />
        {s.urgency === "delayed" && (
          <span className="text-[9px] font-black px-1.5 py-0.5 rounded"
            style={{ background: "#ef444422", color: "#ef4444", border: "1px solid #ef444440" }}>DEMORADO</span>
        )}
        {s.urgency === "today" && (
          <span className="text-[9px] font-black px-1.5 py-0.5 rounded"
            style={{ background: "#FF980022", color: "#FF9800", border: "1px solid #FF980040" }}>HOY</span>
        )}
        <div className="ml-auto text-right flex-shrink-0">
          <p className="text-[10px] font-bold text-white leading-tight">{s.buyer}</p>
          {s.buyer_nickname && <p className="text-[9px]" style={{ color: "#6B7280" }}>{s.buyer_nickname}</p>}
        </div>
      </div>

      {/* Fila inferior */}
      <div className="px-3 py-2">
        <div className="mb-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[11px] font-black text-white">{s.status_label ?? s.status}</p>
            {s.substatus && s.substatus !== "null" && (s.substatus === "printed" || s.substatus === "label_printed") && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                style={{ background: "#39FF1420", color: "#39FF14", border: "1px solid #39FF1440" }}>
                ✓ Impresa en MeLi
              </span>
            )}
          </div>
          {s.dispatch_date && (
            <p className="text-[10px] font-semibold" style={{ color: "#FF9800" }}>
              Despachar antes del {new Date(s.dispatch_date).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          )}
          {deliveryStr && (
            <p className="text-[10px]" style={{ color: "#9CA3AF" }}>Llega el {deliveryStr}</p>
          )}
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-lg flex-shrink-0 overflow-hidden"
            style={{ background: "#2A2A2A", border: "1px solid rgba(255,255,255,0.07)" }}>
            {s.thumbnail
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={s.thumbnail} alt={s.title} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-4 h-4" style={{ color: "#4B5563" }} />
                </div>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white font-medium line-clamp-2 leading-tight">{s.title}</p>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              {s.unit_price != null && (
                <span className="text-[11px] font-black" style={{ color: "#39FF14" }}>
                  ${s.unit_price.toLocaleString("es-AR")}
                </span>
              )}
              <span className="text-[10px]" style={{ color: "#6B7280" }}>
                {s.quantity} unidad{s.quantity > 1 ? "es" : ""}
              </span>
              {s.seller_sku && (
                <span className="text-[10px]" style={{ color: "#6B7280" }}>SKU: {s.seller_sku}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Acordeón por tipo ── */
function TypeAccordion({ type, items, selected, onToggle, onPrint, downloading, defaultOpen = true, readOnly = false }: {
  type: LogisticType; items: ShipmentInfo[]; selected?: Set<number>;
  onToggle?: (id: number) => void; onPrint?: (fmt: "pdf" | "zpl", ids: number[]) => void;
  downloading?: boolean; defaultOpen?: boolean; readOnly?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (!items.length) return null;
  const cfg      = TYPE_CFG[type];
  const blockIds = items.map(s => s.shipment_id);
  const selIn    = selected ? blockIds.filter(id => selected.has(id)) : [];
  const allSel   = selIn.length === blockIds.length;

  const toggleAll = () => {
    if (!onToggle) return;
    allSel ? blockIds.forEach(onToggle) : blockIds.filter(id => !selected?.has(id)).forEach(onToggle);
  };

  return (
    <div className="rounded-2xl overflow-hidden mb-3"
      style={{ background: "#161616", border: `1px solid ${cfg.color}25` }}>
      <button className="w-full px-4 py-3 flex items-center gap-2 text-left"
        style={{ borderBottom: open ? `1px solid ${cfg.color}20` : "none" }}
        onClick={() => setOpen(v => !v)}>
        <span style={{ color: cfg.color }}>{cfg.icon}</span>
        <span className="font-black text-sm flex-1" style={{ color: cfg.color }}>{cfg.label}</span>
        <span className="text-xs font-black px-2 py-0.5 rounded-full mr-2"
          style={{ background: `${cfg.color}20`, color: cfg.color }}>{items.length}</span>
        {open
          ? <ChevronDown  className="w-4 h-4 flex-shrink-0" style={{ color: cfg.color }} />
          : <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: cfg.color }} />}
      </button>
      {open && (
        <>
          {!readOnly && onToggle && (
            <div className="px-4 pt-2 pb-1 flex items-center justify-between">
              <span className="text-[11px]" style={{ color: "#6B7280" }}>
                {selIn.length} de {items.length} seleccionados
              </span>
              <button onClick={toggleAll}
                className="text-[11px] font-bold px-2.5 py-1 rounded-lg"
                style={{ background: `${cfg.color}15`, color: cfg.color }}>
                {allSel ? "Deseleccionar todas" : "Seleccionar todas"}
              </button>
            </div>
          )}
          <div className="px-2 pt-1">
            {items.map(s => (
              <ShipmentCard key={s.shipment_id} s={s}
                selected={selected?.has(s.shipment_id)}
                onToggle={readOnly ? undefined : onToggle}
                showCheckbox={!readOnly} />
            ))}
          </div>
          {!readOnly && onPrint && (
            <div className="px-3 pb-3 pt-1 flex gap-2">
              <button onClick={() => onPrint("pdf", selIn)}
                disabled={selIn.length === 0 || downloading}
                className="flex-1 py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 disabled:opacity-30"
                style={{ background: cfg.color, color: "#121212" }}>
                {downloading
                  ? <><RefreshCw className="w-3 h-3 animate-spin" />Generando...</>
                  : <><Printer className="w-3 h-3" />PDF ({selIn.length})</>}
              </button>
              <button onClick={() => onPrint("zpl", selIn)}
                disabled={selIn.length === 0 || downloading}
                className="py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 disabled:opacity-30"
                style={{ background: "transparent", color: cfg.color, border: `1px solid ${cfg.color}44` }}>
                <Download className="w-3 h-3" />ZPL
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ── Página principal ── */
function EtiquetasInner() {
  const [data,        setData]        = useState<LabelData | null>(null);
  const [history,     setHistory]     = useState<ShipmentInfo[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [loadingHist, setLoadingHist] = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [selected,    setSelected]    = useState<Set<number>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const [mainTab,     setMainTab]     = useState<MainTab>("despachar");
  const [histPeriod,  setHistPeriod]  = useState<HistPeriod>("today");
  const [activeType,  setActiveType]  = useState<LogisticType | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/meli-labels?action=list");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d: LabelData = await res.json();
      setData(d);
      // Pre-seleccionar urgentes (demorados + hoy)
      const urgent = (d.shipments ?? []).filter(s => s.urgency !== "upcoming");
      setSelected(new Set(urgent.map(s => s.shipment_id)));
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, []);

  const loadHistory = useCallback(async (period: HistPeriod) => {
    setLoadingHist(true);
    try {
      const res = await fetch(`/api/meli-labels?action=history&period=${period}`);
      if (!res.ok) throw new Error();
      const d = await res.json();
      setHistory(d.shipments ?? []);
    } catch { /* ignore */ }
    finally { setLoadingHist(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (mainTab === "impresas") loadHistory(histPeriod); }, [mainTab, histPeriod, loadHistory]);

  const toggleItem = (id: number) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handlePrint = useCallback(async (format: "pdf" | "zpl", ids: number[]) => {
    if (!ids.length) return;
    setDownloading(true);
    try {
      const res = await fetch(`/api/meli-labels?action=download&format=${format}&ids=${ids.join(",")}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      if (format === "pdf") { const w = window.open(url, "_blank"); if (w) w.print(); }
      else { const a = document.createElement("a"); a.href = url; a.download = "etiquetas.zpl"; a.click(); }
      URL.revokeObjectURL(url);
      const printed = (data?.shipments ?? []).filter(s => ids.includes(s.shipment_id));
      await fetch("/api/meli-labels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shipment_ids: ids,
          shipments: printed.map(s => ({ shipment_id: s.shipment_id, account: s.account, type: s.type, buyer: s.buyer, title: s.title })),
        }),
      });
      load();
    } catch (e) { setError((e as Error).message); }
    finally { setDownloading(false); }
  }, [data, load]);

  const all      = data?.shipments ?? [];
  const fullItems = data?.full      ?? [];
  const delayedU  = data?.delayed_unshipped  ?? [];
  const delayedT  = data?.delayed_in_transit ?? [];
  const summary   = data?.summary;

  const pending   = all.filter(s => s.urgency !== "upcoming");
  const upcoming  = all.filter(s => s.urgency === "upcoming");

  // Filtro por tipo activo en resumen
  const visiblePending = activeType ? pending.filter(s => s.type === activeType) : pending;

  const tabs = [
    { id: "despachar" as MainTab, label: "A Despachar", badge: pending.length,   badgeColor: pending.filter(s=>s.urgency==="delayed").length > 0 ? "#ef4444" : "#FF9800" },
    { id: "full"      as MainTab, label: "⚡ Full",      badge: fullItems.length, badgeColor: "#FFE600" },
    { id: "demorados" as MainTab, label: "Demorados",   badge: delayedU.length + delayedT.length, badgeColor: "#ef4444" },
    { id: "impresas"  as MainTab, label: "Impresas",    badge: null,             badgeColor: "#39FF14" },
  ];

  return (
    <main className="min-h-screen pb-28" style={{ background: "#121212" }}>

      {/* Header */}
      <div className="sticky top-0 z-30 px-4 py-3 flex items-center justify-between border-b"
        style={{ background: "rgba(18,18,18,0.97)", backdropFilter: "blur(16px)", borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-3">
          <Link href="/appjeez" className="p-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }}>
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </Link>
          <div>
            <h1 className="font-black text-white text-base flex items-center gap-2">
              <Printer className="w-5 h-5" style={{ color: "#FFE600" }} />
              Etiquetas de Envío
            </h1>
            <p className="text-[10px]" style={{ color: "#6B7280" }}>Panel de despacho multicuenta</p>
          </div>
        </div>
        <button onClick={load} disabled={loading} className="p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }}>
          <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-3">

        {loading && (
          <div className="rounded-2xl p-10 text-center" style={{ background: "#1A1A1A" }}>
            <RefreshCw className="w-8 h-8 mx-auto animate-spin mb-3" style={{ color: "#FFE600" }} />
            <p className="text-white font-bold">Consultando todas las cuentas...</p>
            <p className="text-xs mt-1" style={{ color: "#6B7280" }}>Correo · Flex · Turbo · Full</p>
          </div>
        )}

        {error && !loading && (
          <div className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: "#ef444418", border: "1px solid #ef444440" }}>
            <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: "#ef4444" }} />
            <p className="text-sm text-white">{error}</p>
          </div>
        )}

        {!loading && data && (
          <>
            {/* Tarjetas de resumen */}
            <div className="grid grid-cols-4 gap-2">
              {(["correo", "flex", "turbo", "full"] as LogisticType[]).map(t => (
                <SummaryCard key={t} type={t}
                  count={t === "full" ? (summary?.full ?? 0) : (summary?.[t as "correo"|"flex"|"turbo"] ?? 0)}
                  active={activeType === t && mainTab === "despachar"}
                  onClick={() => {
                    if (t === "full") { setMainTab("full"); setActiveType(null); return; }
                    setMainTab("despachar");
                    setActiveType(prev => prev === t ? null : t);
                  }} />
              ))}
            </div>

            {/* Alerta demorados */}
            {(delayedU.length > 0 || delayedT.length > 0) && mainTab !== "demorados" && (
              <button onClick={() => setMainTab("demorados")}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left"
                style={{ background: "#ef444415", border: "1px solid #ef444440" }}>
                <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: "#ef4444" }} />
                <div>
                  <p className="text-sm font-black" style={{ color: "#ef4444" }}>
                    {delayedU.length + delayedT.length} envío{delayedU.length+delayedT.length>1?"s":""} demorado{delayedU.length+delayedT.length>1?"s":""}
                  </p>
                  <p className="text-[10px]" style={{ color: "#9CA3AF" }}>
                    {delayedU.length} sin despachar · {delayedT.length} en tránsito retrasado
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 ml-auto flex-shrink-0" style={{ color: "#ef4444" }} />
              </button>
            )}

            {/* Tabs */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
              {tabs.map(tab => {
                const active = mainTab === tab.id;
                return (
                  <button key={tab.id} onClick={() => setMainTab(tab.id)}
                    className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap"
                    style={active
                      ? { background: "#FFE600", color: "#121212" }
                      : { background: "#1A1A1A", color: "#9CA3AF", border: "1px solid rgba(255,255,255,0.06)" }}>
                    {tab.label}
                    {tab.badge !== null && tab.badge > 0 && (
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[20px] text-center"
                        style={active
                          ? { background: "rgba(0,0,0,0.2)", color: "#121212" }
                          : { background: tab.badgeColor + "25", color: tab.badgeColor }}>
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* ══ TAB A DESPACHAR ══ */}
            {mainTab === "despachar" && (
              <>
                {activeType && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold" style={{ color: TYPE_CFG[activeType].color }}>
                      Filtrando: {TYPE_CFG[activeType].label}
                    </span>
                    <button onClick={() => setActiveType(null)}
                      className="text-xs px-2 py-0.5 rounded-lg"
                      style={{ background: "rgba(255,255,255,0.08)", color: "#9CA3AF" }}>
                      Ver todos
                    </button>
                  </div>
                )}
                {visiblePending.length === 0 && upcoming.length === 0 ? (
                  <div className="rounded-2xl p-10 text-center" style={{ background: "#1A1A1A" }}>
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2" style={{ color: "#39FF14" }} />
                    <p className="text-white font-bold text-sm">¡Todo al día!</p>
                    <p className="text-xs mt-1" style={{ color: "#6B7280" }}>Sin envíos urgentes pendientes</p>
                  </div>
                ) : (
                  <>
                    {(["correo", "flex", "turbo"] as LogisticType[]).map(t => (
                      <TypeAccordion key={t} type={t}
                        items={visiblePending.filter(s => s.type === t)}
                        selected={selected} onToggle={toggleItem}
                        onPrint={handlePrint} downloading={downloading} />
                    ))}
                    {upcoming.filter(s => !activeType || s.type === activeType).length > 0 && (
                      <details className="rounded-2xl overflow-hidden"
                        style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <summary className="px-4 py-3 cursor-pointer font-bold text-sm flex items-center gap-2"
                          style={{ color: "#6B7280" }}>
                          <Clock className="w-4 h-4" />
                          Próximos días ({upcoming.filter(s => !activeType || s.type === activeType).length})
                        </summary>
                        <div className="px-2 pt-1 pb-2">
                          {upcoming.filter(s => !activeType || s.type === activeType).map(s => (
                            <ShipmentCard key={s.shipment_id} s={s}
                              selected={selected.has(s.shipment_id)} onToggle={toggleItem} />
                          ))}
                        </div>
                      </details>
                    )}
                    <p className="text-[10px] text-center pt-1" style={{ color: "#4B5563" }}>
                      Al imprimir, los envíos se mueven a Impresas automáticamente
                    </p>
                  </>
                )}
              </>
            )}

            {/* ══ TAB FULL ══ */}
            {mainTab === "full" && (
              <div className="space-y-3">
                {/* Banner informativo */}
                <div className="rounded-2xl p-5 text-center"
                  style={{ background: "#FFE60010", border: "2px solid #FFE60030" }}>
                  <span className="text-5xl block mb-2">⚡</span>
                  <p className="font-black text-white text-base mb-1">Mercado Envíos Full</p>
                  <p className="text-xs leading-relaxed" style={{ color: "#9CA3AF" }}>
                    Estos envíos son gestionados por el depósito de MercadoLibre.<br />
                    <strong style={{ color: "#FFE600" }}>No requieren impresión de etiqueta</strong> por tu parte.
                    MeLi retira y despacha directamente desde su bodega.
                  </p>
                </div>
                {fullItems.length === 0 ? (
                  <div className="rounded-2xl p-8 text-center" style={{ background: "#1A1A1A" }}>
                    <p className="text-white font-bold text-sm">Sin envíos Full pendientes</p>
                  </div>
                ) : (
                  <div className="space-y-0">
                    {fullItems.map(s => (
                      <ShipmentCard key={s.shipment_id} s={s} showCheckbox={false} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ══ TAB DEMORADOS ══ */}
            {mainTab === "demorados" && (
              <div className="space-y-3">
                {/* Sin despachar */}
                {delayedU.length > 0 && (
                  <div className="rounded-2xl overflow-hidden"
                    style={{ background: "#161616", border: "2px solid #ef444440" }}>
                    <div className="px-4 py-3" style={{ borderBottom: "1px solid #ef444430" }}>
                      <p className="font-black text-sm flex items-center gap-2" style={{ color: "#ef4444" }}>
                        <AlertCircle className="w-4 h-4" />
                        Sin Despachar ({delayedU.length})
                      </p>
                      <p className="text-[10px] mt-0.5" style={{ color: "#9CA3AF" }}>
                        El paquete está en tu local — buscarlo y despacharlo urgente
                      </p>
                    </div>
                    <div className="px-2 pt-1 pb-2">
                      {delayedU.map(s => (
                        <ShipmentCard key={s.shipment_id} s={s}
                          selected={selected.has(s.shipment_id)} onToggle={toggleItem} />
                      ))}
                    </div>
                    <div className="px-3 pb-3">
                      <button
                        onClick={() => handlePrint("pdf", delayedU.filter(s => selected.has(s.shipment_id)).map(s => s.shipment_id))}
                        disabled={delayedU.filter(s => selected.has(s.shipment_id)).length === 0 || downloading}
                        className="w-full py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 disabled:opacity-30"
                        style={{ background: "#ef4444", color: "#fff" }}>
                        <Printer className="w-3.5 h-3.5" />
                        Imprimir Demorados Seleccionados ({delayedU.filter(s => selected.has(s.shipment_id)).length})
                      </button>
                    </div>
                  </div>
                )}

                {/* En tránsito retrasado */}
                {delayedT.length > 0 && (
                  <div className="rounded-2xl overflow-hidden"
                    style={{ background: "#161616", border: "2px solid #FF980040" }}>
                    <div className="px-4 py-3" style={{ borderBottom: "1px solid #FF980030" }}>
                      <p className="font-black text-sm flex items-center gap-2" style={{ color: "#FF9800" }}>
                        <Truck className="w-4 h-4" />
                        En Tránsito con Retraso ({delayedT.length})
                      </p>
                      <p className="text-[10px] mt-0.5" style={{ color: "#9CA3AF" }}>
                        Ya despachados — la demora es del correo. Podés gestionar un reclamo a MeLi.
                      </p>
                    </div>
                    <div className="px-2 pt-1 pb-2">
                      {delayedT.map(s => (
                        <ShipmentCard key={s.shipment_id} s={s} showCheckbox={false} />
                      ))}
                    </div>
                  </div>
                )}

                {delayedU.length === 0 && delayedT.length === 0 && (
                  <div className="rounded-2xl p-10 text-center" style={{ background: "#1A1A1A" }}>
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2" style={{ color: "#39FF14" }} />
                    <p className="text-white font-bold text-sm">Sin envíos demorados</p>
                  </div>
                )}
              </div>
            )}

            {/* ══ TAB IMPRESAS ══ */}
            {mainTab === "impresas" && (
              <div className="space-y-3">
                {/* Filtro de período */}
                <div className="flex gap-2">
                  {(["today", "yesterday", "week"] as HistPeriod[]).map(p => (
                    <button key={p} onClick={() => setHistPeriod(p)}
                      className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                      style={histPeriod === p
                        ? { background: "#39FF14", color: "#121212" }
                        : { background: "#1A1A1A", color: "#6B7280", border: "1px solid rgba(255,255,255,0.06)" }}>
                      {p === "today" ? "Hoy" : p === "yesterday" ? "Ayer" : "Esta semana"}
                    </button>
                  ))}
                </div>
                {loadingHist ? (
                  <div className="rounded-2xl p-8 text-center" style={{ background: "#1A1A1A" }}>
                    <RefreshCw className="w-5 h-5 mx-auto animate-spin" style={{ color: "#39FF14" }} />
                  </div>
                ) : history.length === 0 ? (
                  <div className="rounded-2xl p-10 text-center" style={{ background: "#1A1A1A" }}>
                    <Package className="w-8 h-8 mx-auto mb-2" style={{ color: "#6B7280" }} />
                    <p className="text-white font-bold text-sm">
                      Sin etiquetas impresas {histPeriod === "today" ? "hoy" : histPeriod === "yesterday" ? "ayer" : "esta semana"}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 py-1">
                      <CheckCircle2 className="w-4 h-4" style={{ color: "#39FF14" }} />
                      <span className="text-sm font-black" style={{ color: "#39FF14" }}>
                        {history.length} etiqueta{history.length > 1 ? "s" : ""} impresa{history.length > 1 ? "s" : ""}
                      </span>
                    </div>
                    {(["correo", "flex", "turbo"] as LogisticType[]).map(t => (
                      <TypeAccordion key={t} type={t}
                        items={history.filter(s => s.type === t)}
                        readOnly defaultOpen={false} />
                    ))}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

export default function EtiquetasPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#121212" }}>
        <RefreshCw className="w-6 h-6 animate-spin" style={{ color: "#FFE600" }} />
      </div>
    }>
      <EtiquetasInner />
    </Suspense>
  );
}
