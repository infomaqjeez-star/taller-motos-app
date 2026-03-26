"use client";
import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Package, TrendingUp, ExternalLink, Search, ChevronDown, ChevronUp, Store, AlertCircle } from "lucide-react";

interface MeliItem { id: string; title: string; price: number; available_quantity: number; sold_quantity: number; status: string; thumbnail: string; secure_thumbnail: string; permalink: string; currency_id: string; }
interface AccountData { account: string; meli_user_id: string; items: MeliItem[]; total: number; error?: string; }

function fmt(n: number, c = "ARS") { return new Intl.NumberFormat("es-AR", { style: "currency", currency: c, maximumFractionDigits: 0 }).format(n); }

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  active:   { label: "Activa",    color: "#39FF14" },
  paused:   { label: "Pausada",   color: "#FF9800" },
  closed:   { label: "Cerrada",   color: "#ef4444" },
  inactive: { label: "Inactiva",  color: "#6B7280" },
};

function AccountSection({ data }: { data: AccountData }) {
  const [open, setOpen]     = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all"|"active"|"paused"|"closed">("all");

  const filtered = data.items.filter(i => {
    const matchSearch = i.title.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || i.status === filter;
    return matchSearch && matchFilter;
  });

  const activeCount = data.items.filter(i => i.status === "active").length;
  const totalStock  = data.items.reduce((s, i) => s + i.available_quantity, 0);
  const totalSold   = data.items.reduce((s, i) => s + i.sold_quantity, 0);

  return (
    <div className="rounded-2xl overflow-hidden mb-4" style={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.07)" }}>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-5 py-4 text-left" style={{ background: "#1a1a1a" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-black font-black" style={{ background: "linear-gradient(135deg,#FFE600,#FF9800)" }}>
            <Store className="w-5 h-5" />
          </div>
          <div>
            <p className="font-black text-white">@{data.account}</p>
            <p className="text-xs" style={{ color: "#6B7280" }}>{data.total} publicaciones totales</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span style={{ color: "#39FF14" }}>{activeCount} activas</span>
          <span style={{ color: "#00E5FF" }}>{totalSold} vendidos</span>
          <span style={{ color: "#FFE600" }}>{totalStock} stock</span>
          {open ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
        </div>
      </button>

      {open && (
        <div className="p-4">
          {data.error && <div className="p-3 rounded-xl mb-3 text-sm" style={{ background: "#ef444418", color: "#ef4444" }}>Error: {data.error}</div>}

          {/* Filtros + búsqueda */}
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input type="text" placeholder="Buscar publicación..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl text-sm text-white placeholder-gray-500 outline-none"
                style={{ background: "#121212", border: "1px solid rgba(255,255,255,0.08)" }} />
            </div>
            <div className="flex gap-2">
              {(["all","active","paused","closed"] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className="px-3 py-2 rounded-xl text-xs font-bold transition-all"
                  style={filter === f
                    ? { background: "#FFE600", color: "#121212" }
                    : { background: "#121212", color: "#6B7280", border: "1px solid rgba(255,255,255,0.08)" }}>
                  {f === "all" ? "Todas" : STATUS_MAP[f]?.label}
                </button>
              ))}
            </div>
          </div>

          {/* Grid de items */}
          {filtered.length === 0
            ? <p className="text-center py-8 text-sm" style={{ color: "#6B7280" }}>Sin publicaciones</p>
            : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {filtered.map(item => {
                  const st = STATUS_MAP[item.status] ?? { label: item.status, color: "#6B7280" };
                  const thumb = (item.secure_thumbnail || item.thumbnail || "").replace("http://", "https://");
                  return (
                    <div key={item.id} className="rounded-xl overflow-hidden flex flex-col"
                      style={{ background: "#121212", border: "1px solid rgba(255,255,255,0.06)" }}>
                      {/* Foto */}
                      <div className="relative w-full h-32 flex items-center justify-center" style={{ background: "#1a1a1a" }}>
                        {thumb
                          ? <img src={thumb} alt={item.title} className="w-full h-full object-contain p-1" />
                          : <Package className="w-10 h-10 text-gray-600" />}
                        <span className="absolute top-1.5 right-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ background: st.color + "22", color: st.color, border: `1px solid ${st.color}44` }}>
                          {st.label}
                        </span>
                      </div>
                      {/* Info */}
                      <div className="p-2.5 flex flex-col gap-1.5 flex-1">
                        <p className="text-[11px] font-semibold text-white line-clamp-2 leading-tight">{item.title}</p>
                        <p className="text-base font-black" style={{ color: "#FFE600" }}>{fmt(item.price, item.currency_id)}</p>
                        <div className="flex gap-2 text-[10px]">
                          <span style={{ color: "#6B7280" }}>Stock: <b className="text-white">{item.available_quantity}</b></span>
                          <span style={{ color: "#6B7280" }}>
                            <TrendingUp className="w-2.5 h-2.5 inline" /> <b style={{ color: "#39FF14" }}>{item.sold_quantity}</b>
                          </span>
                        </div>
                        <a href={item.permalink} target="_blank" rel="noopener noreferrer"
                          className="mt-auto flex items-center justify-center gap-1 py-1 rounded-lg text-[10px] font-bold hover:opacity-80"
                          style={{ background: "#FFE60018", color: "#FFE600" }}>
                          Ver en MeLi <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
        </div>
      )}
    </div>
  );
}

function PublicacionesInner() {
  const [accounts, setAccounts] = useState<AccountData[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/meli-publications");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setAccounts(await res.json());
      setLastUpdate(new Date());
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalItems = accounts.reduce((s, a) => s + (a.total ?? a.items.length), 0);
  const totalSold  = accounts.reduce((s, a) => s + a.items.reduce((x, i) => x + i.sold_quantity, 0), 0);

  return (
    <main className="min-h-screen pb-24" style={{ background: "#121212" }}>
      <div className="sticky top-0 z-30 px-4 py-3 flex items-center justify-between border-b"
        style={{ background: "rgba(18,18,18,0.97)", backdropFilter: "blur(16px)", borderColor: "rgba(255,255,255,0.07)" }}>
        <div className="flex items-center gap-3">
          <Link href="/appjeez" className="p-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }}>
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </Link>
          <div>
            <h1 className="font-black text-white text-base flex items-center gap-2">
              <Package className="w-5 h-5" style={{ color: "#FFE600" }} /> Publicaciones
            </h1>
            <p className="text-[10px]" style={{ color: "#6B7280" }}>{lastUpdate ? `Actualizado ${lastUpdate.toLocaleTimeString("es-AR")}` : "Cargando..."}</p>
          </div>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold disabled:opacity-40"
          style={{ background: "#1F1F1F", color: "#FFE600", border: "1px solid #FFE60033" }}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-4">
        {!loading && accounts.length > 0 && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: "Total publicaciones", val: totalItems, color: "#FFE600" },
              { label: "Total vendidos",       val: totalSold,  color: "#39FF14" },
            ].map(s => (
              <div key={s.label} className="rounded-2xl p-4 text-center" style={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.07)" }}>
                <p className="text-3xl font-black" style={{ color: s.color }}>{s.val}</p>
                <p className="text-xs mt-1" style={{ color: "#6B7280" }}>{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-2xl p-5 text-center mb-4" style={{ background: "#ef444418", border: "1px solid #ef444440" }}>
            <AlertCircle className="w-8 h-8 mx-auto mb-2" style={{ color: "#ef4444" }} />
            <p className="text-white font-semibold">{error}</p>
            <button onClick={load} className="mt-2 px-4 py-2 rounded-xl text-sm font-bold bg-red-500 text-white">Reintentar</button>
          </div>
        )}

        {loading && (
          <div className="space-y-3">
            {[1,2].map(i => <div key={i} className="rounded-2xl p-5 h-48 animate-pulse" style={{ background: "#1F1F1F" }} />)}
          </div>
        )}

        {!loading && accounts.map(acc => <AccountSection key={acc.meli_user_id} data={acc} />)}
      </div>
    </main>
  );
}

export default function PublicacionesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{ background: "#121212" }}><RefreshCw className="w-6 h-6 animate-spin" style={{ color: "#FFE600" }} /></div>}>
      <PublicacionesInner />
    </Suspense>
  );
}
