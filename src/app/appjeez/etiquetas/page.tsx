"use client";
import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import {
  ArrowLeft, RefreshCw, Printer, Download, CheckCircle2,
  Package, Truck, Zap, AlertCircle, Search, History,
  Clock, Star,
} from "lucide-react";

type UrgencyType = "delayed" | "today" | "upcoming";
type LogisticType = "flex" | "turbo" | "correo" | "full";
type MainTab = "pending" | "history" | "full";
type HistoryPeriod = "today" | "week" | "all";

interface ShipmentInfo {
  shipment_id: number;
  account: string;
  meli_user_id: string;
  type: LogisticType;
  buyer: string;
  title: string;
  status: string;
  urgency: UrgencyType;
  delivery_date: string | null;
  printed_at?: string;
}
interface Summary {
  total: number; correo: number; turbo: number; flex: number; full: number;
  delayed: number; today: number; upcoming: number;
}
interface LabelData {
  shipments: ShipmentInfo[];
  full: ShipmentInfo[];
  summary: Summary;
}

/* ── Badges ── */
function TypeBadge({ type }: { type: string }) {
  const cfg =
    type === "flex"  ? { bg: "#00E5FF", label: "FLEX" } :
    type === "turbo" ? { bg: "#A855F7", label: "TURBO" } :
    type === "full"  ? { bg: "#39FF14", label: "FULL" } :
                       { bg: "#FF9800", label: "CORREO" };
  return (
    <span className="text-[9px] font-black px-1.5 py-0.5 rounded"
      style={{ background: cfg.bg, color: "#121212" }}>
      {cfg.label}
    </span>
  );
}

function UrgencyBadge({ urgency }: { urgency: UrgencyType }) {
  if (urgency === "delayed") return (
    <span className="text-[9px] font-black px-1.5 py-0.5 rounded"
      style={{ background: "#ef444422", color: "#ef4444", border: "1px solid #ef444455" }}>
      DEMORADO
    </span>
  );
  if (urgency === "today") return (
    <span className="text-[9px] font-black px-1.5 py-0.5 rounded"
      style={{ background: "#FF980022", color: "#FF9800", border: "1px solid #FF980055" }}>
      HOY
    </span>
  );
  return null;
}

function rowBorder(urgency: UrgencyType) {
  if (urgency === "delayed") return "1px solid #ef444455";
  if (urgency === "today")   return "1px solid #FF980055";
  return "1px solid transparent";
}

/* ── Fila de envío con checkbox ── */
function ShipmentRow({ s, selected, onToggle }: {
  s: ShipmentInfo; selected: boolean; onToggle?: (id: number) => void;
}) {
  return (
    <div
      onClick={() => onToggle?.(s.shipment_id)}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-all ${onToggle ? "cursor-pointer" : ""}`}
      style={{
        background: selected ? "#FFE60008" : "transparent",
        border: rowBorder(s.urgency),
      }}>
      {onToggle && (
        <div className="w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center border-2"
          style={{
            borderColor: selected ? "#FFE600" : "#4B5563",
            background: selected ? "#FFE600" : "transparent",
          }}>
          {selected && <CheckCircle2 className="w-3.5 h-3.5 text-black" />}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          <TypeBadge type={s.type} />
          <UrgencyBadge urgency={s.urgency} />
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: "#FFE60018", color: "#FFE600" }}>
            {s.account}
          </span>
        </div>
        <p className="text-xs text-white font-medium line-clamp-1">{s.title}</p>
        <p className="text-[10px]" style={{ color: "#6B7280" }}>
          {s.buyer} · #{s.shipment_id}
          {s.delivery_date && ` · ${new Date(s.delivery_date).toLocaleDateString("es-AR")}`}
        </p>
      </div>
    </div>
  );
}

/* ── Bloque por tipo con botones propios ── */
function TypeBlock({ label, icon, color, items, selected, onToggle, onPrint, downloading }: {
  label: string; icon: React.ReactNode; color: string;
  items: ShipmentInfo[]; selected: Set<number>;
  onToggle: (id: number) => void;
  onPrint: (format: "pdf" | "zpl", ids: number[]) => void;
  downloading: boolean;
}) {
  if (!items.length) return null;
  const blockIds = items.map(s => s.shipment_id);
  const selectedInBlock = blockIds.filter(id => selected.has(id));
  const allSelected = selectedInBlock.length === blockIds.length;
  const toggleAll = () => {
    if (allSelected) blockIds.forEach(onToggle);
    else blockIds.filter(id => !selected.has(id)).forEach(onToggle);
  };
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: "#1A1A1A", border: `1px solid ${color}25` }}>
      {/* Header del bloque */}
      <div className="px-4 py-2.5 flex items-center gap-2"
        style={{ background: `${color}10`, borderBottom: `1px solid ${color}25` }}>
        <span style={{ color }}>{icon}</span>
        <span className="font-black text-sm" style={{ color }}>{label}</span>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ background: `${color}22`, color }}>
          {items.length}
        </span>
        <button onClick={toggleAll}
          className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-lg"
          style={{ background: `${color}18`, color }}>
          {allSelected ? "Ninguna" : "Todas"}
        </button>
      </div>

      {/* Filas */}
      <div className="px-2 pt-2">
        {items.map(s => (
          <ShipmentRow key={s.shipment_id} s={s}
            selected={selected.has(s.shipment_id)}
            onToggle={onToggle} />
        ))}
      </div>

      {/* Botones del bloque */}
      <div className="px-3 pb-3 pt-1 flex gap-2">
        <button
          onClick={() => onPrint("pdf", selectedInBlock)}
          disabled={selectedInBlock.length === 0 || downloading}
          className="flex-1 py-2 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-35"
          style={{ background: color, color: "#121212" }}>
          {downloading
            ? <><RefreshCw className="w-3 h-3 animate-spin" />Generando...</>
            : <><Printer className="w-3 h-3" />PDF ({selectedInBlock.length})</>}
        </button>
        <button
          onClick={() => onPrint("zpl", selectedInBlock)}
          disabled={selectedInBlock.length === 0 || downloading}
          className="py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-35"
          style={{ background: "transparent", color, border: `1px solid ${color}44` }}>
          <Download className="w-3 h-3" />ZPL
        </button>
      </div>
    </div>
  );
}

/* ── Página principal ── */
function EtiquetasInner() {
  const [data, setData]               = useState<LabelData | null>(null);
  const [history, setHistory]         = useState<ShipmentInfo[]>([]);
  const [loading, setLoading]         = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [selected, setSelected]       = useState<Set<number>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const [mainTab, setMainTab]         = useState<MainTab>("pending");
  const [histPeriod, setHistPeriod]   = useState<HistoryPeriod>("today");
  const [histTypeFilter, setHistTypeFilter] = useState<"all" | "correo" | "turbo" | "flex">("all");
  const [search, setSearch]           = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/meli-labels?action=list");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d: LabelData = await res.json();
      setData(d);
      // Auto-seleccionar solo demoradas + hoy
      const urgent = (d.shipments ?? []).filter(s => s.urgency !== "upcoming");
      setSelected(new Set(urgent.map(s => s.shipment_id)));
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, []);

  const loadHistory = useCallback(async (period: HistoryPeriod) => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/meli-labels?action=history&period=${period}`);
      if (!res.ok) throw new Error();
      const d = await res.json();
      setHistory(d.shipments ?? []);
    } catch { /* ignore */ }
    finally { setLoadingHistory(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (mainTab === "history") loadHistory(histPeriod);
  }, [mainTab, histPeriod, loadHistory]);

  const toggleItem = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const applySearch = (items: ShipmentInfo[]) =>
    !search ? items : items.filter(s =>
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      (s.buyer ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (s.account ?? "").toLowerCase().includes(search.toLowerCase())
    );

  const pendingItems   = applySearch(data?.shipments ?? []);
  const urgentItems    = pendingItems.filter(s => s.urgency !== "upcoming");
  const upcomingItems  = pendingItems.filter(s => s.urgency === "upcoming");
  const fullItems      = applySearch(data?.full ?? []);
  const histItems      = applySearch(
    histTypeFilter === "all" ? history : history.filter(s => s.type === histTypeFilter)
  );
  const summary = data?.summary;

  const handleDownload = useCallback(async (format: "pdf" | "zpl", ids?: number[]) => {
    const targetIds = ids ?? Array.from(selected);
    if (!targetIds.length) return;
    setDownloading(true);
    try {
      const idsStr = targetIds.join(",");
      const res = await fetch(`/api/meli-labels?action=download&format=${format}&ids=${idsStr}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (format === "pdf") {
        const win = window.open(url, "_blank");
        if (win) win.print();
      } else {
        const a = document.createElement("a");
        a.href = url; a.download = "etiquetas-appjeez.zpl"; a.click();
      }
      URL.revokeObjectURL(url);
      // Marcar como impresos en DB
      const printed = (data?.shipments ?? []).filter(s => targetIds.includes(s.shipment_id));
      await fetch("/api/meli-labels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shipment_ids: targetIds,
          shipments: printed.map(s => ({
            shipment_id: s.shipment_id,
            account: s.account, type: s.type, buyer: s.buyer, title: s.title,
          })),
        }),
      });
      load();
    } catch (e) { setError((e as Error).message); }
    finally { setDownloading(false); }
  }, [selected, data, load]);

  return (
    <main className="min-h-screen pb-28" style={{ background: "#121212" }}>

      {/* Header */}
      <div className="sticky top-0 z-30 px-4 py-3 flex items-center justify-between border-b"
        style={{ background: "rgba(18,18,18,0.97)", backdropFilter: "blur(16px)", borderColor: "rgba(255,255,255,0.07)" }}>
        <div className="flex items-center gap-3">
          <Link href="/appjeez/envios" className="p-1.5 rounded-lg"
            style={{ background: "rgba(255,255,255,0.05)" }}>
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </Link>
          <div>
            <h1 className="font-black text-white text-base flex items-center gap-2">
              <Printer className="w-5 h-5" style={{ color: "#FFE600" }} /> Etiquetas de Envío
            </h1>
            <p className="text-[10px]" style={{ color: "#6B7280" }}>Impresión masiva multicuenta</p>
          </div>
        </div>
        <button onClick={load} disabled={loading}
          className="p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }}>
          <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-5 space-y-4">

        {loading && (
          <div className="rounded-2xl p-10 text-center" style={{ background: "#1F1F1F" }}>
            <RefreshCw className="w-8 h-8 mx-auto animate-spin mb-3" style={{ color: "#FFE600" }} />
            <p className="text-white font-bold">Consultando todas las cuentas...</p>
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
            {/* Contadores urgencia */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Demorados", val: summary?.delayed ?? 0, color: "#ef4444" },
                { label: "Hoy",       val: summary?.today ?? 0,   color: "#FF9800" },
                { label: "Próximos",  val: summary?.upcoming ?? 0, color: "#6B7280" },
                { label: "Full",      val: summary?.full ?? 0,    color: "#39FF14" },
              ].map(s => (
                <div key={s.label} className="rounded-2xl p-3 text-center"
                  style={{ background: "#1F1F1F", border: `1px solid ${s.color}25` }}>
                  <p className="text-xl font-black" style={{ color: s.color }}>{s.val}</p>
                  <p className="text-[10px] font-bold text-white mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Tabs principales */}
            <div className="flex gap-1 p-1 rounded-2xl" style={{ background: "#1A1A1A" }}>
              {([
                ["pending", "Pendientes", <Printer key="p" className="w-3.5 h-3.5" />,
                  (summary?.delayed ?? 0) + (summary?.today ?? 0) + (summary?.upcoming ?? 0)],
                ["history", "Historial",  <History key="h" className="w-3.5 h-3.5" />, null],
                ["full",    "Full",       <Star key="f" className="w-3.5 h-3.5" />, summary?.full ?? 0],
              ] as const).map(([v, label, icon, count]) => (
                <button key={v} onClick={() => setMainTab(v as MainTab)}
                  className="flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                  style={mainTab === v
                    ? { background: "#FFE600", color: "#121212" }
                    : { color: "#6B7280" }}>
                  {icon}{label}{count !== null && count > 0 && ` (${count})`}
                </button>
              ))}
            </div>

            {/* ══ TAB PENDIENTES ══ */}
            {mainTab === "pending" && (
              <div className="space-y-4">
                {/* Buscador */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                    style={{ color: "#6B7280" }} />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar producto, comprador o cuenta..."
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl text-xs text-white outline-none"
                    style={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.08)" }} />
                </div>

                {/* PRIORIDAD: Demorados + Hoy */}
                {urgentItems.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-4 h-4" style={{ color: "#ef4444" }} />
                      <span className="text-sm font-black" style={{ color: "#ef4444" }}>
                        PRIORIDAD — {urgentItems.length} envíos
                      </span>
                    </div>
                    <TypeBlock label="CORREO" color="#FF9800" icon={<Truck className="w-4 h-4" />}
                      items={urgentItems.filter(s => s.type === "correo")}
                      selected={selected} onToggle={toggleItem}
                      onPrint={handleDownload} downloading={downloading} />
                    <TypeBlock label="TURBO" color="#A855F7" icon={<Zap className="w-4 h-4" />}
                      items={urgentItems.filter(s => s.type === "turbo")}
                      selected={selected} onToggle={toggleItem}
                      onPrint={handleDownload} downloading={downloading} />
                    <TypeBlock label="FLEX" color="#00E5FF" icon={<Truck className="w-4 h-4" />}
                      items={urgentItems.filter(s => s.type === "flex")}
                      selected={selected} onToggle={toggleItem}
                      onPrint={handleDownload} downloading={downloading} />
                  </div>
                )}

                {/* PRÓXIMOS */}
                {upcomingItems.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4" style={{ color: "#6B7280" }} />
                      <span className="text-sm font-black text-white">
                        PRÓXIMOS — {upcomingItems.length} envíos
                      </span>
                    </div>
                    <TypeBlock label="CORREO" color="#FF9800" icon={<Truck className="w-4 h-4" />}
                      items={upcomingItems.filter(s => s.type === "correo")}
                      selected={selected} onToggle={toggleItem}
                      onPrint={handleDownload} downloading={downloading} />
                    <TypeBlock label="TURBO" color="#A855F7" icon={<Zap className="w-4 h-4" />}
                      items={upcomingItems.filter(s => s.type === "turbo")}
                      selected={selected} onToggle={toggleItem}
                      onPrint={handleDownload} downloading={downloading} />
                    <TypeBlock label="FLEX" color="#00E5FF" icon={<Truck className="w-4 h-4" />}
                      items={upcomingItems.filter(s => s.type === "flex")}
                      selected={selected} onToggle={toggleItem}
                      onPrint={handleDownload} downloading={downloading} />
                  </div>
                )}

                {pendingItems.length === 0 && (
                  <div className="rounded-2xl p-10 text-center" style={{ background: "#1F1F1F" }}>
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2" style={{ color: "#39FF14" }} />
                    <p className="text-white font-bold text-sm">Sin envíos pendientes</p>
                    <p className="text-xs mt-1" style={{ color: "#6B7280" }}>Todo impreso o sin órdenes</p>
                  </div>
                )}

                {pendingItems.length > 0 && (
                  <p className="text-[10px] text-center" style={{ color: "#6B7280" }}>
                    Al imprimir, los envíos pasan a Historial automáticamente
                  </p>
                )}
              </div>
            )}

            {/* ══ TAB HISTORIAL ══ */}
            {mainTab === "history" && (
              <div className="space-y-3">
                {/* Filtros período + tipo */}
                <div className="flex gap-2">
                  {(["today", "week", "all"] as HistoryPeriod[]).map(p => (
                    <button key={p} onClick={() => setHistPeriod(p)}
                      className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                      style={histPeriod === p
                        ? { background: "#FFE600", color: "#121212" }
                        : { background: "#1F1F1F", color: "#6B7280" }}>
                      {p === "today" ? "Hoy" : p === "week" ? "Esta semana" : "Todo"}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  {(["all", "correo", "turbo", "flex"] as const).map(t => (
                    <button key={t} onClick={() => setHistTypeFilter(t)}
                      className="flex-1 py-1.5 rounded-xl text-[11px] font-bold transition-all"
                      style={histTypeFilter === t
                        ? { background: "#FFE60022", color: "#FFE600", border: "1px solid #FFE60044" }
                        : { background: "#1A1A1A", color: "#6B7280" }}>
                      {t === "all" ? "Todos" : t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>

                {loadingHistory && (
                  <div className="rounded-2xl p-8 text-center" style={{ background: "#1F1F1F" }}>
                    <RefreshCw className="w-5 h-5 mx-auto animate-spin" style={{ color: "#FFE600" }} />
                  </div>
                )}

                {!loadingHistory && histItems.length === 0 && (
                  <div className="rounded-2xl p-10 text-center" style={{ background: "#1F1F1F" }}>
                    <Package className="w-8 h-8 mx-auto mb-2" style={{ color: "#6B7280" }} />
                    <p className="text-white font-bold text-sm">Sin historial</p>
                  </div>
                )}

                {!loadingHistory && histItems.map(s => (
                  <div key={s.shipment_id}
                    className="rounded-xl px-4 py-3 flex items-center gap-3"
                    style={{ background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: "#39FF14" }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <TypeBadge type={s.type ?? "correo"} />
                        <span className="text-[10px]" style={{ color: "#6B7280" }}>{s.account}</span>
                      </div>
                      <p className="text-xs text-white font-medium line-clamp-1">
                        {s.title ?? `Envío #${s.shipment_id}`}
                      </p>
                      <p className="text-[10px]" style={{ color: "#6B7280" }}>
                        #{s.shipment_id}
                        {s.printed_at && ` · ${new Date(s.printed_at).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}`}
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        const res = await fetch(`/api/meli-labels?action=download&format=pdf&ids=${s.shipment_id}`);
                        if (!res.ok) return;
                        const blob = await res.blob();
                        const url = URL.createObjectURL(blob);
                        const win = window.open(url, "_blank");
                        if (win) win.print();
                        URL.revokeObjectURL(url);
                      }}
                      className="text-[10px] font-bold px-2 py-1 rounded-lg flex-shrink-0"
                      style={{ background: "#FFE60018", color: "#FFE600" }}>
                      Re-imprimir
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* ══ TAB FULL ══ */}
            {mainTab === "full" && (
              <div className="space-y-3">
                <div className="rounded-2xl p-4"
                  style={{ background: "#39FF1410", border: "1px solid #39FF1430" }}>
                  <p className="text-xs font-bold" style={{ color: "#39FF14" }}>
                    Los envíos Full (Fulfillment) son gestionados por el depósito de Mercado Libre.
                    No requieren impresión de etiqueta por parte del vendedor.
                  </p>
                </div>

                {fullItems.length === 0 && (
                  <div className="rounded-2xl p-10 text-center" style={{ background: "#1F1F1F" }}>
                    <Star className="w-8 h-8 mx-auto mb-2" style={{ color: "#39FF14" }} />
                    <p className="text-white font-bold text-sm">Sin envíos Full pendientes</p>
                  </div>
                )}

                {fullItems.map(s => (
                  <ShipmentRow key={s.shipment_id} s={s} selected={false} />
                ))}
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
