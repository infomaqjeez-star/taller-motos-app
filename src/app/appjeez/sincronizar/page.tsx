"use client";
import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import {
  ArrowLeft, RefreshCw, Copy, CheckCircle2, AlertCircle,
  AlertTriangle, ChevronDown, ChevronUp, Zap, Package,
  SkipForward, XCircle, Store, Search,
} from "lucide-react";

function fmt(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
}

interface MeliItemPreview {
  id:                 string;
  title:              string;
  price:              number;
  currency_id:        string;
  available_quantity: number;
  sold_quantity:      number;
  thumbnail:          string | null;
  status:             string;
  permalink:          string;
}
interface AccountInfo { id: string; nickname: string; total: number; }
interface CompareData {
  origin:         AccountInfo;
  dest:           AccountInfo;
  can_clone:      MeliItemPreview[];
  already_exists: MeliItemPreview[];
  summary:        { origin_total: number; dest_total: number; can_clone: number; already_exists: number };
}
interface CloneResult {
  item_id: string;
  title:   string;
  status:  "cloned" | "skipped_duplicate" | "error";
  new_id?: string;
  reason?: string;
}
interface CloneSummary {
  origin: string; dest: string;
  results: CloneResult[];
  summary: { total: number; cloned: number; skipped_duplicate: number; errors: number };
}
interface Account { id: string; nickname: string; meli_user_id: string; }

function ItemRow({
  item, selected, onToggle,
}: { item: MeliItemPreview; selected: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
      style={{
        background: selected ? "#FFE60012" : "#121212",
        border:     selected ? "1px solid #FFE60044" : "1px solid rgba(255,255,255,0.05)",
      }}>
      <div
        className="w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center border-2 transition-all"
        style={{ borderColor: selected ? "#FFE600" : "#4B5563", background: selected ? "#FFE600" : "transparent" }}>
        {selected && <CheckCircle2 className="w-3.5 h-3.5 text-black" />}
      </div>
      {item.thumbnail
        ? <img src={item.thumbnail} alt="" className="w-10 h-10 rounded-lg object-contain flex-shrink-0" style={{ background: "#1a1a1a" }} />
        : <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#1a1a1a" }}>
            <Package className="w-4 h-4 text-gray-600" />
          </div>
      }
      <div className="flex-1 min-w-0">
        <p className="text-xs text-white font-medium line-clamp-1">{item.title}</p>
        <p className="text-[10px] mt-0.5" style={{ color: "#6B7280" }}>
          {fmt(item.price)} · Stock: {item.available_quantity} · Vendidos: {item.sold_quantity}
        </p>
      </div>
    </div>
  );
}

function SyncInner() {
  const [accounts,  setAccounts]  = useState<Account[]>([]);
  const [originId,  setOriginId]  = useState("");
  const [destId,    setDestId]    = useState("");
  const [comparing, setComparing] = useState(false);
  const [compareData, setCompareData] = useState<CompareData | null>(null);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [selected,  setSelected]  = useState<Set<string>>(new Set());
  const [cloning,   setCloning]   = useState(false);
  const [cloneResult, setCloneResult] = useState<CloneSummary | null>(null);
  const [cloneTab,  setCloneTab]  = useState<"results"|"skipped"|"errors">("results");
  const [search,    setSearch]    = useState("");

  // Cargar cuentas activas
  useEffect(() => {
    fetch("/api/meli-accounts")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setAccounts(d); })
      .catch(() => {});
  }, []);

  const handleCompare = useCallback(async () => {
    if (!originId || !destId || originId === destId) return;
    setComparing(true);
    setCompareData(null);
    setCompareError(null);
    setSelected(new Set());
    setCloneResult(null);
    try {
      const res = await fetch(`/api/meli-sync/compare?origin_id=${originId}&dest_id=${destId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setCompareData(await res.json());
    } catch (e) {
      setCompareError((e as Error).message);
    } finally {
      setComparing(false);
    }
  }, [originId, destId]);

  const toggleItem = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const ids = filtered.map(i => i.id);
    setSelected(new Set(ids));
  };
  const deselectAll = () => setSelected(new Set());

  const filtered = (compareData?.can_clone ?? []).filter(i =>
    i.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleClone = useCallback(async (itemIds: string[]) => {
    if (!itemIds.length || !originId || !destId) return;
    setCloning(true);
    setCloneResult(null);
    try {
      const res = await fetch("/api/meli-sync/clone", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ origin_id: originId, dest_id: destId, item_ids: itemIds }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setCloneResult(await res.json());
    } catch (e) {
      setCompareError((e as Error).message);
    } finally {
      setCloning(false);
    }
  }, [originId, destId]);

  const [openAlready, setOpenAlready] = useState(false);

  return (
    <main className="min-h-screen pb-24" style={{ background: "#121212" }}>
      {/* Header */}
      <div className="sticky top-0 z-30 px-4 py-3 flex items-center justify-between border-b"
        style={{ background: "rgba(18,18,18,0.97)", backdropFilter: "blur(16px)", borderColor: "rgba(255,255,255,0.07)" }}>
        <div className="flex items-center gap-3">
          <Link href="/appjeez" className="p-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }}>
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </Link>
          <div>
            <h1 className="font-black text-white text-base flex items-center gap-2">
              <Copy className="w-5 h-5" style={{ color: "#FFE600" }} /> Sincronizar Cuentas
            </h1>
            <p className="text-[10px]" style={{ color: "#6B7280" }}>Clona publicaciones entre tus cuentas MeLi</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-5 space-y-4">

        {/* Selector de cuentas */}
        <div className="rounded-2xl p-5 space-y-4" style={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.07)" }}>
          <p className="text-sm font-black text-white">Seleccionar Cuentas</p>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold mb-1.5 block" style={{ color: "#6B7280" }}>CUENTA ORIGEN (de donde se copian)</label>
              <select
                value={originId}
                onChange={e => { setOriginId(e.target.value); setCompareData(null); setCloneResult(null); }}
                className="w-full rounded-xl px-3 py-2.5 text-sm font-semibold text-white"
                style={{ background: "#121212", border: "1px solid rgba(255,255,255,0.1)" }}>
                <option value="">— Seleccionar cuenta origen —</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id} disabled={a.id === destId}>{a.nickname}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-center">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full" style={{ background: "#FFE60018", border: "1px solid #FFE60033" }}>
                <Copy className="w-3.5 h-3.5" style={{ color: "#FFE600" }} />
                <span className="text-xs font-bold" style={{ color: "#FFE600" }}>copia hacia</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold mb-1.5 block" style={{ color: "#6B7280" }}>CUENTA DESTINO (donde se publican)</label>
              <select
                value={destId}
                onChange={e => { setDestId(e.target.value); setCompareData(null); setCloneResult(null); }}
                className="w-full rounded-xl px-3 py-2.5 text-sm font-semibold text-white"
                style={{ background: "#121212", border: "1px solid rgba(255,255,255,0.1)" }}>
                <option value="">— Seleccionar cuenta destino —</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id} disabled={a.id === originId}>{a.nickname}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleCompare}
            disabled={!originId || !destId || originId === destId || comparing}
            className="w-full py-3 rounded-xl font-black text-sm transition-all disabled:opacity-40"
            style={{ background: "#FFE600", color: "#121212" }}>
            {comparing
              ? <span className="flex items-center justify-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" /> Analizando publicaciones...</span>
              : "Analizar y Comparar"}
          </button>
        </div>

        {/* Error */}
        {compareError && (
          <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: "#ef444418", border: "1px solid #ef444440" }}>
            <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: "#ef4444" }} />
            <p className="text-sm text-white">{compareError}</p>
          </div>
        )}

        {/* Resultado del análisis */}
        {compareData && !cloneResult && (
          <>
            {/* Resumen */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl p-4 text-center" style={{ background: "#39FF1410", border: "1px solid #39FF1430" }}>
                <p className="text-3xl font-black" style={{ color: "#39FF14" }}>{compareData.summary.can_clone}</p>
                <p className="text-xs font-bold text-white mt-1">Pueden clonarse</p>
                <p className="text-[10px] mt-0.5" style={{ color: "#6B7280" }}>No existen en destino</p>
              </div>
              <div className="rounded-2xl p-4 text-center" style={{ background: "#FF980010", border: "1px solid #FF980030" }}>
                <p className="text-3xl font-black" style={{ color: "#FF9800" }}>{compareData.summary.already_exists}</p>
                <p className="text-xs font-bold text-white mt-1">Ya existen</p>
                <p className="text-[10px] mt-0.5" style={{ color: "#6B7280" }}>Título duplicado detectado</p>
              </div>
            </div>

            {/* Info cuentas */}
            <div className="flex gap-3">
              {[compareData.origin, compareData.dest].map((acc, i) => (
                <div key={acc.id} className="flex-1 rounded-xl p-3 flex items-center gap-2"
                  style={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <Store className="w-4 h-4 flex-shrink-0" style={{ color: i === 0 ? "#00E5FF" : "#FFE600" }} />
                  <div>
                    <p className="text-xs font-bold text-white">{acc.nickname}</p>
                    <p className="text-[10px]" style={{ color: "#6B7280" }}>{acc.total} publicaciones</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Lista para clonar */}
            {compareData.can_clone.length > 0 && (
              <div className="rounded-2xl overflow-hidden" style={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="px-4 py-3 flex items-center justify-between border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                  <p className="text-sm font-black text-white">Publicaciones a clonar</p>
                  <div className="flex gap-2">
                    <button onClick={selectAll} className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: "#FFE60018", color: "#FFE600" }}>
                      Todas
                    </button>
                    <button onClick={deselectAll} className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: "#1a1a1a", color: "#6B7280" }}>
                      Ninguna
                    </button>
                  </div>
                </div>

                {/* Buscador */}
                <div className="px-4 py-2 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "#6B7280" }} />
                    <input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Buscar publicación..."
                      className="w-full pl-8 pr-3 py-2 rounded-lg text-xs text-white outline-none"
                      style={{ background: "#121212", border: "1px solid rgba(255,255,255,0.08)" }}
                    />
                  </div>
                </div>

                <div className="p-3 space-y-2 max-h-72 overflow-y-auto">
                  {filtered.map(item => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      selected={selected.has(item.id)}
                      onToggle={() => toggleItem(item.id)}
                    />
                  ))}
                  {filtered.length === 0 && (
                    <p className="text-center py-4 text-xs" style={{ color: "#6B7280" }}>Sin resultados para &quot;{search}&quot;</p>
                  )}
                </div>

                {/* Acciones */}
                <div className="p-4 border-t space-y-2" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                  <button
                    onClick={() => handleClone([...selected])}
                    disabled={selected.size === 0 || cloning}
                    className="w-full py-3 rounded-xl font-black text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                    style={{ background: "#39FF14", color: "#121212" }}>
                    {cloning
                      ? <><RefreshCw className="w-4 h-4 animate-spin" /> Clonando...</>
                      : <><Copy className="w-4 h-4" /> Clonar seleccionadas ({selected.size})</>}
                  </button>
                  <button
                    onClick={() => handleClone(compareData.can_clone.map(i => i.id))}
                    disabled={cloning}
                    className="w-full py-3 rounded-xl font-black text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                    style={{ background: "#FFE600", color: "#121212" }}>
                    {cloning
                      ? <><RefreshCw className="w-4 h-4 animate-spin" /> Clonando...</>
                      : <><Zap className="w-4 h-4" /> Sincronizar TODAS ({compareData.can_clone.length})</>}
                  </button>
                </div>
              </div>
            )}

            {compareData.can_clone.length === 0 && (
              <div className="rounded-2xl p-8 text-center" style={{ background: "#1F1F1F" }}>
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3" style={{ color: "#39FF14" }} />
                <p className="font-black text-white">Todo sincronizado</p>
                <p className="text-xs mt-1" style={{ color: "#6B7280" }}>Todas las publicaciones de origen ya existen en destino</p>
              </div>
            )}

            {/* Ya existen (colapsable) */}
            {compareData.already_exists.length > 0 && (
              <div className="rounded-2xl overflow-hidden" style={{ background: "#1F1F1F", border: "1px solid #FF980022" }}>
                <button onClick={() => setOpenAlready(o => !o)}
                  className="w-full flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" style={{ color: "#FF9800" }} />
                    <span className="text-sm font-bold text-white">
                      {compareData.already_exists.length} títulos ya existen en destino
                    </span>
                  </div>
                  {openAlready ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                </button>
                {openAlready && (
                  <div className="px-4 pb-4 space-y-2 max-h-64 overflow-y-auto">
                    {compareData.already_exists.map(item => (
                      <div key={item.id} className="flex items-center gap-2 py-2 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                        <SkipForward className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#FF9800" }} />
                        {item.thumbnail && <img src={item.thumbnail} alt="" className="w-8 h-8 rounded-lg object-contain" style={{ background: "#121212" }} />}
                        <p className="text-xs text-white line-clamp-1">{item.title}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Resultado de clonación */}
        {cloneResult && (
          <div className="space-y-4">
            {/* Resumen resultado */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Clonadas",    val: cloneResult.summary.cloned,             color: "#39FF14" },
                { label: "Omitidas",    val: cloneResult.summary.skipped_duplicate,  color: "#FF9800" },
                { label: "Con error",   val: cloneResult.summary.errors,             color: "#ef4444" },
              ].map(s => (
                <div key={s.label} className="rounded-2xl p-4 text-center" style={{ background: "#1F1F1F", border: `1px solid ${s.color}22` }}>
                  <p className="text-3xl font-black" style={{ color: s.color }}>{s.val}</p>
                  <p className="text-[10px] font-bold text-white mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl overflow-hidden" style={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                {(["results","skipped","errors"] as const).map(t => (
                  <button key={t} onClick={() => setCloneTab(t)}
                    className="flex-1 py-2.5 text-xs font-bold transition-all"
                    style={cloneTab === t ? { background: "#FFE600", color: "#121212" } : { color: "#6B7280" }}>
                    {t === "results" ? `✅ Clonadas (${cloneResult.summary.cloned})`
                      : t === "skipped" ? `⏭ Omitidas (${cloneResult.summary.skipped_duplicate})`
                      : `❌ Errores (${cloneResult.summary.errors})`}
                  </button>
                ))}
              </div>
              <div className="p-3 space-y-2 max-h-72 overflow-y-auto">
                {cloneResult.results
                  .filter(r =>
                    cloneTab === "results" ? r.status === "cloned"
                    : cloneTab === "skipped" ? r.status === "skipped_duplicate"
                    : r.status === "error"
                  )
                  .map((r, i) => (
                    <div key={i} className="flex items-start gap-2 py-2 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                      {r.status === "cloned"
                        ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#39FF14" }} />
                        : r.status === "skipped_duplicate"
                        ? <SkipForward  className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#FF9800" }} />
                        : <XCircle      className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#ef4444" }} />}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white line-clamp-1">{r.title}</p>
                        {r.new_id && <p className="text-[10px]" style={{ color: "#39FF14" }}>Nuevo ID: {r.new_id}</p>}
                        {r.reason && <p className="text-[10px]" style={{ color: "#6B7280" }}>{r.reason}</p>}
                      </div>
                    </div>
                  ))}
                {cloneResult.results.filter(r =>
                  cloneTab === "results" ? r.status === "cloned"
                  : cloneTab === "skipped" ? r.status === "skipped_duplicate"
                  : r.status === "error"
                ).length === 0 && (
                  <p className="text-center py-4 text-xs" style={{ color: "#6B7280" }}>Sin registros en esta categoría</p>
                )}
              </div>
            </div>

            <button onClick={() => { setCloneResult(null); setCompareData(null); setSelected(new Set()); }}
              className="w-full py-3 rounded-xl font-black text-sm"
              style={{ background: "#1F1F1F", color: "#FFE600", border: "1px solid #FFE60033" }}>
              Nueva Sincronización
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

export default function SincronizarPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#121212" }}>
        <RefreshCw className="w-6 h-6 animate-spin" style={{ color: "#FFE600" }} />
      </div>
    }>
      <SyncInner />
    </Suspense>
  );
}
