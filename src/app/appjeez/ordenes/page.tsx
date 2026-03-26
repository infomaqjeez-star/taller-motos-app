"use client";
import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Truck, ShoppingCart, Package, ChevronDown, ChevronUp, Store, AlertCircle, Clock, CheckCircle2, DollarSign } from "lucide-react";

function fmt(n: number, c = "ARS") { return new Intl.NumberFormat("es-AR", { style: "currency", currency: c, maximumFractionDigits: 0 }).format(n); }
function timeAgo(d: string) { const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000); if (m < 60) return `hace ${m}m`; const h = Math.floor(m/60); if (h < 24) return `hace ${h}h`; return `hace ${Math.floor(h/24)}d`; }

interface OrderItem { title: string; thumbnail: string | null; qty: number; price: number; }
interface Order { id: number; status: string; date: string; total: number; currency: string; buyer: string; shipping_id: number | null; items: OrderItem[]; }
interface Shipment { id: number; status: string; substatus: string; date: string; tracking_number: string | null; address: string; zip: string; }
interface AccountData { account: string; meli_user_id: string; orders: { total: number; amount: number; results: Order[] }; shipments: { total: number; results: Shipment[] }; error?: string; }

function OrderCard({ order }: { order: Order }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "#121212", border: "1px solid rgba(255,255,255,0.06)" }}>
      <button onClick={() => setOpen(o => !o)} className="w-full p-3 text-left">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate">{order.buyer}</p>
            <p className="text-[10px]" style={{ color: "#6B7280" }}>{order.items.length} producto{order.items.length > 1 ? "s" : ""} · {timeAgo(order.date)}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-black text-sm" style={{ color: "#39FF14" }}>{fmt(order.total, order.currency)}</span>
            {open ? <ChevronUp className="w-3.5 h-3.5 text-gray-500" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-500" />}
          </div>
        </div>
      </button>
      {open && (
        <div className="px-3 pb-3 border-t space-y-2" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          {order.items.map((item, i) => (
            <div key={i} className="flex items-center gap-2 pt-2">
              {item.thumbnail
                ? <img src={item.thumbnail.replace("http://","https://")} alt="" className="w-10 h-10 rounded-lg object-contain" style={{ background: "#1a1a1a" }} />
                : <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "#1a1a1a" }}><Package className="w-4 h-4 text-gray-600" /></div>}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white line-clamp-1">{item.title}</p>
                <p className="text-[10px]" style={{ color: "#6B7280" }}>x{item.qty} · {fmt(item.price, order.currency)}</p>
              </div>
            </div>
          ))}
          {order.shipping_id && (
            <p className="text-[10px] pt-1" style={{ color: "#00E5FF" }}>
              <Truck className="w-3 h-3 inline mr-1" />Envío #{order.shipping_id}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ShipCard({ ship }: { ship: Shipment }) {
  return (
    <div className="rounded-xl p-3" style={{ background: "#121212", border: "1px solid rgba(0,229,255,0.2)" }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-white truncate">{ship.address}</p>
          <p className="text-[10px]" style={{ color: "#6B7280" }}>CP {ship.zip} · {timeAgo(ship.date)}</p>
          {ship.tracking_number && <p className="text-[10px] mt-0.5" style={{ color: "#00E5FF" }}>Track: {ship.tracking_number}</p>}
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: "#00E5FF18", color: "#00E5FF" }}>
          Despachar
        </span>
      </div>
    </div>
  );
}

function AccountPanel({ data }: { data: AccountData }) {
  const [tab, setTab]   = useState<"orders"|"shipments">("orders");
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-2xl overflow-hidden mb-4" style={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.07)" }}>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-5 py-4 text-left" style={{ background: "#1a1a1a" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-black" style={{ background: "linear-gradient(135deg,#FFE600,#FF9800)" }}>
            <Store className="w-5 h-5" />
          </div>
          <div>
            <p className="font-black text-white">@{data.account}</p>
            <p className="text-xs" style={{ color: "#6B7280" }}>{data.orders?.total ?? 0} ventas · {data.shipments?.total ?? 0} para despachar</p>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
      </button>

      {open && (
        <div className="p-4">
          {data.error && <div className="p-3 rounded-xl mb-3 text-sm" style={{ background: "#ef444418", color: "#ef4444" }}>Error: {data.error}</div>}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { label: "Ventas hoy",    val: data.orders?.total ?? 0,                    color: "#39FF14", icon: <ShoppingCart className="w-4 h-4" /> },
              { label: "Facturado",     val: fmt(data.orders?.amount ?? 0),              color: "#FFE600", icon: <DollarSign className="w-4 h-4" /> },
              { label: "A despachar",   val: data.shipments?.total ?? 0,                 color: "#00E5FF", icon: <Truck className="w-4 h-4" /> },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: "#121212" }}>
                <div className="flex justify-center mb-1" style={{ color: s.color }}>{s.icon}</div>
                <p className="font-black text-sm" style={{ color: s.color }}>{s.val}</p>
                <p className="text-[9px] mt-0.5" style={{ color: "#6B7280" }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-3">
            {(["orders","shipments"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                style={tab === t ? { background: "#FFE600", color: "#121212" } : { background: "#121212", color: "#6B7280" }}>
                {t === "orders" ? `Órdenes (${data.orders?.results?.length ?? 0})` : `Envíos (${data.shipments?.results?.length ?? 0})`}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="space-y-2">
            {tab === "orders" && (
              (data.orders?.results?.length ?? 0) === 0
                ? <p className="text-center py-6 text-sm" style={{ color: "#6B7280" }}>Sin ventas hoy</p>
                : data.orders.results.map(o => <OrderCard key={o.id} order={o} />)
            )}
            {tab === "shipments" && (
              (data.shipments?.results?.length ?? 0) === 0
                ? <p className="text-center py-6 text-sm" style={{ color: "#6B7280" }}>Sin envíos pendientes</p>
                : data.shipments.results.map(s => <ShipCard key={s.id} ship={s} />)
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function OrdenesInner() {
  const [accounts, setAccounts] = useState<AccountData[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/meli-orders");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setAccounts(await res.json());
      setLastUpdate(new Date());
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalOrders   = accounts.reduce((s, a) => s + (a.orders?.total ?? 0), 0);
  const totalAmount   = accounts.reduce((s, a) => s + (a.orders?.amount ?? 0), 0);
  const totalShipments = accounts.reduce((s, a) => s + (a.shipments?.total ?? 0), 0);

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
              <ShoppingCart className="w-5 h-5" style={{ color: "#39FF14" }} /> Órdenes y Envíos
            </h1>
            <p className="text-[10px]" style={{ color: "#6B7280" }}>{lastUpdate ? `Actualizado ${lastUpdate.toLocaleTimeString("es-AR")}` : "Cargando..."}</p>
          </div>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold disabled:opacity-40"
          style={{ background: "#1F1F1F", color: "#39FF14", border: "1px solid #39FF1433" }}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-4 pt-4">
        {!loading && accounts.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: "Ventas hoy",     val: totalOrders,       color: "#39FF14" },
              { label: "Facturado hoy",  val: fmt(totalAmount),  color: "#FFE600" },
              { label: "A despachar",    val: totalShipments,    color: "#00E5FF" },
            ].map(s => (
              <div key={s.label} className="rounded-2xl p-3 text-center" style={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.07)" }}>
                <p className="text-2xl font-black" style={{ color: s.color }}>{s.val}</p>
                <p className="text-[10px] mt-0.5" style={{ color: "#6B7280" }}>{s.label}</p>
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

        {loading && [1,2].map(i => <div key={i} className="rounded-2xl p-5 h-48 mb-4 animate-pulse" style={{ background: "#1F1F1F" }} />)}
        {!loading && accounts.map(acc => <AccountPanel key={acc.meli_user_id} data={acc} />)}
      </div>
    </main>
  );
}

export default function OrdenesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{ background: "#121212" }}><RefreshCw className="w-6 h-6 animate-spin" style={{ color: "#39FF14" }} /></div>}>
      <OrdenesInner />
    </Suspense>
  );
}
