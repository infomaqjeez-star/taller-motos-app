"use client";
import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import {
  ArrowLeft, RefreshCw, Printer, Download, CheckCircle2,
  Package, Truck, Zap, AlertCircle, Search, Clock, History,
} from "lucide-react";

type UrgencyType = "delayed" | "today" | "upcoming";
type LogisticType = "flex" | "turbo" | "correo";
type TabType = "pending" | "upcoming" | "history";

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
}
interface Summary {
  total: number; correo: number; turbo: number; flex: number;
  delayed: number; today: number; upcoming: number;
}
interface LabelData {
  shipments: ShipmentInfo[];
  summary: Summary;
}

function TypeBadge({ type }: { type: string }) {
  const cfg =
    type === "flex"  ? { bg: "#00E5FF", label: "FLEX" } :
    type === "turbo" ? { bg: "#A855F7", label: "TURBO" } :
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
      style={{ background: "#ef444422", color: "#ef4444", border: "1px solid #ef444444" }}>
      DEMORADO
    </span>
  );
  if (urgency === "today") return (
    <span className="text-[9px] font-black px-1.5 py-0.5 rounded"
      style={{ background: "#FF980022", color: "#FF9800", border: "1px solid #FF980044" }}>
      HOY
    </span>
  );
  return null;
}

function urgencyBorder(urgency: UrgencyType) {
  if (urgency === "delayed") return "1px solid #ef444455";
  if (urgency === "today")   return "1px solid #FF980055";
  return "1px solid transparent";
}

function ShipmentRow({
  s, selected, onToggle,
}: { s: ShipmentInfo; selected: boolean; onToggle: (id: number) => void }) {
  return (
    <div
      onClick={() => onToggle(s.shipment_id)}
      className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-all rounded-xl mb-1"
      style={{
        background: selected ? "#FFE60008" : "transparent",
        border: urgencyBorder(s.urgency),
      }}>
      <div
        className="w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center border-2"
        style={{
          borderColor: selected ? "#FFE600" : "#4B5563",
          background: selected ? "#FFE600" : "transparent",
        }}>
        {selected && <CheckCircle2 className="w-3.5 h-3.5 text-black" />}
      </div>
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

function TypeBlock({
  label, icon, color, items, selected, onToggle, onPrint, downloading,
}: {
  label: string; icon: React.ReactNode; color: string;
  items: ShipmentInfo[]; selected: Set<number>; onToggle: (id: number) => void;
  onPrint: (format: "pdf" | "zpl", ids: number[]) => void;
  downloading: boolean;
}) {
  if (!items.length) return null;
  const blockIds = items.map(s => s.shipment_id);
  const selectedInBlock = blockIds.filter(id => selected.has(id));
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: "#1F1F1F", border: `1px solid ${color}22` }}>
      <div className="px-4 py-2.5 flex items-center gap-2 border-b"
        style={{ borderColor: `${color}22` }}>
        <span style={{ color }}>{icon}</span>
        <span className="font-black text-sm" style={{ color }}>{label}</span>
        <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ background: `${color}22`, color }}>
          {items.length}
        </span>
      </div>
      <div className="px-2 py-2 space-y-0">
        {items.map(s => (
          <ShipmentRow key={s.shipment_id} s={s}
            selected={selected.has(s.shipment_id)}
            onToggle={onToggle} />
        ))}
      </div>
      {/* Botones de impresión propios del bloque */}
      <div className="px-3 pb-3 flex gap-2">
        <button
          onClick={() => onPrint("pdf", selectedInBlock)}
          disabled={selectedInBlock.length === 0 || downloading}
          className="flex-1 py-2 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-40"
          style={{ background: color, color: "#121212" }}>
          {downloading
            ? <><RefreshCw className="w-3 h-3 animate-spin" /> Generando...</>
            : <><Printer className="w-3 h-3" /> PDF ({selectedInBlock.length})</>}
        </button>
        <button
          onClick={() => onPrint("zpl", selectedInBlock)}
          disabled={selectedInBlock.length === 0 || downloading}
          className="flex-1 py-2 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-40"
          style={{ background: "transparent", color, border: `1px solid ${color}44` }}>
          <Download className="w-3 h-3" /> ZPL
        </button>
      </div>
    </div>
  );
}

function EtiquetasInner() {
  const [data, setData]             = useState<LabelData | null>(null);
  const [history, setHistory]       = useState<ShipmentInfo[]>([]);
  const [loading, setLoading]       = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [selected, setSelected]     = useState<Set<number>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const [tab, setTab]               = useState<TabType>("pending");
  const [search, setSearch]         = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/meli-labels?action=list");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d: LabelData = await res.json();
      setData(d);
      const pending = (d.shipments ?? []).filter(s => s.urgency !== "upcoming");
      setSelected(new Set(pending.map(s => s.shipment_id)));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/meli-labels?action=history");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json();
      setHistory(d.shipments ?? []);
    } catch { /* ignore */ } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (tab === "history") loadHistory();
  }, [tab, loadHistory]);

  const applySearch = (items: ShipmentInfo[]) =>
    !search ? items : items.filter(s =>
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.buyer.toLowerCase().includes(search.toLowerCase()) ||
      s.account.toLowerCase().includes(search.toLowerCase())
    );

  const pendingShipments  = applySearch((data?.shipments ?? []).filter(s => s.urgency !== "upcoming"));
  const upcomingShipments = applySearch((data?.shipments ?? []).filter(s => s.urgency === "upcoming"));

  const toggleItem = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const activeItems = tab === "pending" ? pendingShipments : upcomingShipments;
  const selectAll   = () => setSelected(new Set(activeItems.map(s => s.shipment_id)));
  const deselectAll = () => setSelected(new Set());

  const getBlock = (items: ShipmentInfo[], type: LogisticType) =>
    items.filter(s => s.type === type);

  const handleDownload = useCallback(async (format: "pdf" | "zpl", ids?: number[]) => {
    const targetIds = ids ?? Array.from(selected);
    if (!targetIds.length) return;
    setDownloading(true);
    try {
      const idsStr = targetIds.join(",");
      const res = await fetch(`/api/meli-labels?action=download&format=${format}&ids=${idsStr}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);

      if (format === "pdf") {
        const win = window.open(url, "_blank");
        if (win) win.print();
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.download = "etiquetas-appjeez.zpl";
        a.click();
      }
      URL.revokeObjectURL(url);

      const printedShipments = (data?.shipments ?? []).filter(s => targetIds.includes(s.shipment_id));
      await fetch("/api/meli-labels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shipment_ids: targetIds,
          shipments: printedShipments.map(s => ({
            shipment_id: s.shipment_id,
            account: s.account,
            type: s.type,
            buyer: s.buyer,
            title: s.title,
          })),
        }),
      });
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDownloading(false);
    }
  }, [selected, data, load]);

  const summary = data?.summary;

  return (
    <main className="min-h-screen pb-24" style={{ background: "#121212" }}>
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
            <p className="text-white font-bold">Buscando envíos...</p>
            <p className="text-xs mt-1" style={{ color: "#6B7280" }}>Consultando todas las cuentas</p>
          </div>
        )}

        {error && (
          <div className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: "#ef444418", border: "1px solid #ef444440" }}>
            <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: "#ef4444" }} />
            <p className="text-sm text-white">{error}</p>
          </div>
        )}

        {!loading && data && (
          <>
            {/* Resumen de urgencia */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-2xl p-3 text-center"
                style={{ background: "#1F1F1F", border: "1px solid #ef444430" }}>
                <p className="text-2xl font-black" style={{ color: "#ef4444" }}>{summary?.delayed ?? 0}</p>
                <p className="text-[10px] font-bold text-white mt-0.5">Demorados</p>
              </div>
              <div className="rounded-2xl p-3 text-center"
                style={{ background: "#1F1F1F", border: "1px solid #FF980030" }}>
                <p className="text-2xl font-black" style={{ color: "#FF9800" }}>{summary?.today ?? 0}</p>
                <p className="text-[10px] font-bold text-white mt-0.5">Hoy</p>
              </div>
              <div className="rounded-2xl p-3 text-center"
                style={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.08)" }}>
                <p className="text-2xl font-black text-white">{summary?.upcoming ?? 0}</p>
                <p className="text-[10px] font-bold mt-0.5" style={{ color: "#6B7280" }}>Próximos</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 rounded-2xl" style={{ background: "#1F1F1F" }}>
              {([
                ["pending",  `Pendientes (${(summary?.delayed ?? 0) + (summary?.today ?? 0)})`, <AlertCircle key="p" className="w-3.5 h-3.5" />],
                ["upcoming", `Próximos (${summary?.upcoming ?? 0})`,                             <Clock key="u" className="w-3.5 h-3.5" />],
                ["history",  "Historial",                                                         <History key="h" className="w-3.5 h-3.5" />],
              ] as const).map(([v, label, icon]) => (
                <button key={v} onClick={() => setTab(v as TabType)}
                  className="flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                  style={tab === v
                    ? { background: "#FFE600", color: "#121212" }
                    : { color: "#6B7280" }}>
                  {icon}{label}
                </button>
              ))}
            </div>

            {/* Buscador */}
            {tab !== "history" && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: "#6B7280" }} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar por producto, comprador o cuenta..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl text-xs text-white outline-none"
                  style={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.08)" }}
                />
              </div>
            )}

            {/* --- TAB: Pendientes y Próximos --- */}
            {tab !== "history" && (
              <>
                {/* Seleccionar todo */}
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-white">
                    {activeItems.length} envíos · {selected.size} seleccionados
                  </p>
                  <div className="flex gap-2">
                    <button onClick={selectAll}
                      className="text-xs font-bold px-2 py-1 rounded-lg"
                      style={{ background: "#FFE60018", color: "#FFE600" }}>
                      Todas
                    </button>
                    <button onClick={deselectAll}
                      className="text-xs font-bold px-2 py-1 rounded-lg"
                      style={{ background: "#1a1a1a", color: "#6B7280" }}>
                      Ninguna
                    </button>
                  </div>
                </div>

                {/* Bloque CORREO */}
                <TypeBlock
                  label="CORREO" color="#FF9800" icon={<Truck className="w-4 h-4" />}
                  items={getBlock(activeItems, "correo")}
                  selected={selected} onToggle={toggleItem}
                  onPrint={handleDownload} downloading={downloading}
                />

                {/* Bloque TURBO */}
                <TypeBlock
                  label="TURBO" color="#A855F7" icon={<Zap className="w-4 h-4" />}
                  items={getBlock(activeItems, "turbo")}
                  selected={selected} onToggle={toggleItem}
                  onPrint={handleDownload} downloading={downloading}
                />

                {/* Bloque FLEX */}
                <TypeBlock
                  label="FLEX" color="#00E5FF" icon={<Truck className="w-4 h-4" />}
                  items={getBlock(activeItems, "flex")}
                  selected={selected} onToggle={toggleItem}
                  onPrint={handleDownload} downloading={downloading}
                />

                {activeItems.length === 0 && (
                  <div className="rounded-2xl p-10 text-center" style={{ background: "#1F1F1F" }}>
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2" style={{ color: "#39FF14" }} />
                    <p className="text-white font-bold text-sm">Sin envíos en esta sección</p>
                  </div>
                )}

                {activeItems.length > 0 && (
                  <p className="text-[10px] text-center pb-2" style={{ color: "#6B7280" }}>
                    Al imprimir, los envíos se mueven a Historial automáticamente
                  </p>
                )}
              </>
            )}

            {/* --- TAB: Historial --- */}
            {tab === "history" && (
              <div className="space-y-2">
                {loadingHistory && (
                  <div className="rounded-2xl p-8 text-center" style={{ background: "#1F1F1F" }}>
                    <RefreshCw className="w-6 h-6 mx-auto animate-spin" style={{ color: "#FFE600" }} />
                  </div>
                )}
                {!loadingHistory && history.length === 0 && (
                  <div className="rounded-2xl p-10 text-center" style={{ background: "#1F1F1F" }}>
                    <Package className="w-8 h-8 mx-auto mb-2" style={{ color: "#6B7280" }} />
                    <p className="text-white font-bold text-sm">Sin historial de impresión</p>
                  </div>
                )}
                {history.map(s => (
                  <div key={s.shipment_id}
                    className="rounded-xl px-4 py-3 flex items-center gap-3"
                    style={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: "#39FF14" }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <TypeBadge type={s.type ?? "correo"} />
                        <span className="text-[10px]" style={{ color: "#6B7280" }}>{s.account}</span>
                      </div>
                      <p className="text-xs text-white font-medium line-clamp-1">{s.title ?? `Envío #${s.shipment_id}`}</p>
                      <p className="text-[10px]" style={{ color: "#6B7280" }}>#{s.shipment_id}</p>
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
