"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  RefreshCw,
  ExternalLink,
  Package,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Search,
  Store,
} from "lucide-react";

interface MeliItem {
  id: string;
  title: string;
  price: number;
  available_quantity: number;
  sold_quantity: number;
  status: string;
  thumbnail: string;
  permalink: string;
  currency_id: string;
}

interface AccountData {
  account: string;
  meli_user_id: string;
  items: MeliItem[];
  error?: string;
}

function fmt(n: number, currency = "ARS") {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    active:   { label: "Activa",   color: "#39FF14", icon: <CheckCircle2 className="w-3 h-3" /> },
    paused:   { label: "Pausada",  color: "#FF9800", icon: <Clock className="w-3 h-3" /> },
    closed:   { label: "Cerrada",  color: "#ef4444", icon: <AlertCircle className="w-3 h-3" /> },
    inactive: { label: "Inactiva", color: "#6B7280", icon: <AlertCircle className="w-3 h-3" /> },
  };
  const s = map[status] ?? { label: status, color: "#6B7280", icon: null };
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ background: s.color + "22", color: s.color, border: `1px solid ${s.color}44` }}
    >
      {s.icon} {s.label}
    </span>
  );
}

function AccountSection({ data }: { data: AccountData }) {
  const [open, setOpen] = useState(true);
  const [search, setSearch] = useState("");

  const filtered = data.items.filter(i =>
    i.title.toLowerCase().includes(search.toLowerCase()) || i.id.includes(search)
  );

  const totalStock = data.items.reduce((s, i) => s + i.available_quantity, 0);
  const totalSold  = data.items.reduce((s, i) => s + i.sold_quantity, 0);
  const active     = data.items.filter(i => i.status === "active").length;

  return (
    <div
      className="rounded-2xl overflow-hidden mb-4"
      style={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      {/* Account header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
        style={{ background: "linear-gradient(135deg, #1F1F1F 0%, #2a2a2a 100%)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-black font-black text-sm"
            style={{ background: "linear-gradient(135deg, #FFE600 0%, #FF9800 100%)" }}
          >
            <Store className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-white text-base">@{data.account}</p>
            <p className="text-xs" style={{ color: "#6B7280" }}>ID: {data.meli_user_id}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex gap-4 text-xs">
            <span style={{ color: "#39FF14" }}>{active} activas</span>
            <span style={{ color: "#00E5FF" }}>{totalSold} vendidos</span>
            <span style={{ color: "#FFE600" }}>{totalStock} stock</span>
          </div>
          {open ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4">
          {data.error && (
            <div className="mt-3 p-3 rounded-xl text-sm" style={{ background: "#ef444422", color: "#ef4444" }}>
              Error al cargar publicaciones: {data.error}
            </div>
          )}

          {/* Stats strip (mobile) */}
          <div className="flex gap-3 mt-3 mb-3 sm:hidden">
            {[
              { label: "Activas", val: active, color: "#39FF14" },
              { label: "Vendidos", val: totalSold, color: "#00E5FF" },
              { label: "Stock", val: totalStock, color: "#FFE600" },
            ].map(s => (
              <div key={s.label} className="flex-1 rounded-xl p-2 text-center" style={{ background: "#121212" }}>
                <p className="text-lg font-black" style={{ color: s.color }}>{s.val}</p>
                <p className="text-[10px]" style={{ color: "#6B7280" }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Search */}
          {data.items.length > 0 && (
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Buscar publicación..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl text-sm text-white placeholder-gray-500 outline-none"
                style={{ background: "#121212", border: "1px solid rgba(255,255,255,0.08)" }}
              />
            </div>
          )}

          {/* Items grid */}
          {filtered.length === 0 && !data.error && (
            <p className="text-center py-6 text-sm" style={{ color: "#6B7280" }}>
              {data.items.length === 0 ? "No hay publicaciones en esta cuenta." : "Sin resultados para esa búsqueda."}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(item => (
              <div
                key={item.id}
                className="rounded-xl overflow-hidden flex flex-col"
                style={{ background: "#121212", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                {item.thumbnail && (
                  <img
                    src={item.thumbnail.replace("http://", "https://")}
                    alt={item.title}
                    className="w-full h-32 object-contain"
                    style={{ background: "#1a1a1a" }}
                  />
                )}
                <div className="p-3 flex flex-col gap-2 flex-1">
                  <p className="text-xs font-semibold text-white line-clamp-2 leading-tight">{item.title}</p>
                  <div className="flex items-center justify-between">
                    <span className="font-black text-base" style={{ color: "#FFE600" }}>
                      {fmt(item.price, item.currency_id)}
                    </span>
                    <StatusBadge status={item.status} />
                  </div>
                  <div className="flex gap-3 text-[11px]">
                    <span style={{ color: "#6B7280" }}>
                      <Package className="w-3 h-3 inline mr-0.5" />
                      Stock: <b className="text-white">{item.available_quantity}</b>
                    </span>
                    <span style={{ color: "#6B7280" }}>
                      <TrendingUp className="w-3 h-3 inline mr-0.5" />
                      Vend: <b style={{ color: "#39FF14" }}>{item.sold_quantity}</b>
                    </span>
                  </div>
                  <a
                    href={item.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-auto flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-bold transition-opacity hover:opacity-80"
                    style={{ background: "#FFE60022", color: "#FFE600", border: "1px solid #FFE60044" }}
                  >
                    Ver en MeLi <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AppJeezPage() {
  const params    = useSearchParams();
  const router    = useRouter();
  const connected = params.get("connected") === "true";

  const [accounts, setAccounts] = useState<AccountData[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/meli-publications");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as AccountData[];
      setAccounts(data);
      setLastUpdate(new Date());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalItems = accounts.reduce((s, a) => s + a.items.length, 0);
  const totalSold  = accounts.reduce((s, a) => s + a.items.reduce((x, i) => x + i.sold_quantity, 0), 0);
  const totalStock = accounts.reduce((s, a) => s + a.items.reduce((x, i) => x + i.available_quantity, 0), 0);

  return (
    <main className="min-h-screen pb-20" style={{ background: "#121212" }}>
      {/* Header */}
      <div
        className="sticky top-0 z-30 px-4 py-3 flex items-center justify-between"
        style={{
          background: "rgba(18,18,18,0.96)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <div className="flex items-center gap-3">
          <Link href="/" className="p-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }}>
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </Link>
          <div>
            <h1 className="font-black text-white text-lg leading-tight">AppJeez Panel</h1>
            <p className="text-xs" style={{ color: "#6B7280" }}>
              {lastUpdate ? `Actualizado ${lastUpdate.toLocaleTimeString("es-AR")}` : "Cargando..."}
            </p>
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
          style={{ background: "#1F1F1F", color: "#00E5FF", border: "1px solid rgba(0,229,255,0.3)" }}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "..." : "Actualizar"}
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-4">
        {/* Welcome banner if just connected */}
        {connected && (
          <div
            className="rounded-2xl p-4 mb-4 flex items-center gap-3"
            style={{ background: "#39FF1422", border: "1px solid #39FF1444" }}
          >
            <CheckCircle2 className="w-6 h-6 flex-shrink-0" style={{ color: "#39FF14" }} />
            <div>
              <p className="font-bold text-white text-sm">Cuenta conectada exitosamente</p>
              <p className="text-xs" style={{ color: "#39FF14" }}>Mercado Libre vinculado. Ya podes ver tus publicaciones.</p>
            </div>
          </div>
        )}

        {/* Global stats */}
        {!loading && accounts.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: "Publicaciones", val: totalItems, color: "#00E5FF" },
              { label: "Total vendidos", val: totalSold,  color: "#39FF14" },
              { label: "Stock total",    val: totalStock, color: "#FFE600" },
            ].map(s => (
              <div
                key={s.label}
                className="rounded-2xl p-3 text-center"
                style={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <p className="text-2xl font-black" style={{ color: s.color }}>{s.val}</p>
                <p className="text-[11px] mt-0.5" style={{ color: "#6B7280" }}>{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="rounded-2xl p-5 text-center mb-4" style={{ background: "#ef444422", border: "1px solid #ef444444" }}>
            <AlertCircle className="w-8 h-8 mx-auto mb-2" style={{ color: "#ef4444" }} />
            <p className="text-white font-semibold">Error al cargar publicaciones</p>
            <p className="text-sm mt-1" style={{ color: "#ef4444" }}>{error}</p>
            <button
              onClick={load}
              className="mt-3 px-4 py-2 rounded-xl text-sm font-bold"
              style={{ background: "#ef4444", color: "#fff" }}
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="rounded-2xl p-5 animate-pulse" style={{ background: "#1F1F1F" }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full" style={{ background: "#2a2a2a" }} />
                  <div className="flex-1">
                    <div className="h-4 rounded w-32 mb-1" style={{ background: "#2a2a2a" }} />
                    <div className="h-3 rounded w-20" style={{ background: "#2a2a2a" }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map(j => (
                    <div key={j} className="h-32 rounded-xl" style={{ background: "#2a2a2a" }} />
                  ))}
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
              Conecta una cuenta de Mercado Libre para ver tus publicaciones aquí.
            </p>
            <Link
              href="/configuracion/meli"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm"
              style={{ background: "#FFE600", color: "#121212" }}
            >
              Conectar Mercado Libre
            </Link>
          </div>
        )}

        {/* Accounts list */}
        {!loading && accounts.map(acc => (
          <AccountSection key={acc.meli_user_id} data={acc} />
        ))}

        {/* Actions */}
        {!loading && accounts.length > 0 && (
          <div className="mt-2 mb-6 flex flex-col sm:flex-row gap-3">
            <Link
              href="/configuracion/meli"
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm"
              style={{ background: "#1F1F1F", color: "#FFE600", border: "1px solid rgba(255,230,0,0.3)" }}
            >
              <Store className="w-4 h-4" /> Administrar cuentas
            </Link>
            <Link
              href="/"
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm"
              style={{ background: "#1F1F1F", color: "#6B7280", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <ArrowLeft className="w-4 h-4" /> Volver al inicio
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
