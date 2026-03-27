"use client";
import { useState, Suspense } from "react";
import Link from "next/link";
import {
  ArrowLeft, Search, DollarSign, RefreshCw, AlertTriangle,
  CheckCircle2, XCircle, Tag, ShieldAlert, Eye,
} from "lucide-react";

interface PriceResult {
  account: string;
  item_id: string;
  title: string;
  old_price: number;
  new_price: number;
  status: "updated" | "skipped" | "error" | "catalog_warning" | "promo_blocked";
  reason?: string;
  variations_updated?: number;
}

interface PriceResponse {
  keyword: string;
  target_price: number;
  dry_run: boolean;
  results: PriceResult[];
  summary: {
    total_items_scanned: number; cache_hits_skipped: number; items_checked: number;
    matched: number; updated: number; skipped: number; errors: number;
  };
}

const STATUS_CFG: Record<string, { color: string; label: string }> = {
  updated:         { color: "#39FF14", label: "ACTUALIZADO" },
  catalog_warning: { color: "#FFE600", label: "CATALOGO" },
  skipped:         { color: "#6B7280", label: "OMITIDO" },
  error:           { color: "#EF4444", label: "ERROR" },
  promo_blocked:   { color: "#F97316", label: "EN PROMO" },
};

function PreciosInner() {
  const [keyword, setKeyword]         = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [loading, setLoading]         = useState(false);
  const [data, setData]               = useState<PriceResponse | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [accounts, setAccounts]       = useState<Array<{ id: string; nickname: string }>>([]);
  const [selectedAcc, setSelectedAcc] = useState("all");

  useState(() => {
    fetch("/api/meli-accounts").then(r => r.json()).then(d => {
      if (Array.isArray(d)) setAccounts(d.filter((a: { status: string }) => a.status === "active"));
    }).catch(() => {});
  });

  const run = async (dryRun: boolean) => {
    if (!keyword.trim() || !targetPrice) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const payload: Record<string, unknown> = {
        keyword: keyword.trim(),
        target_price: Number(targetPrice),
        dry_run: dryRun,
      };
      if (selectedAcc !== "all") payload.account_ids = [selectedAcc];

      const res = await fetch("/api/meli-price-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json();
      setData(d as PriceResponse);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen pb-24" style={{ background: "#121212" }}>
      <div className="sticky top-0 z-30 px-4 py-3 flex items-center gap-3 border-b"
        style={{ background: "rgba(18,18,18,0.97)", backdropFilter: "blur(16px)", borderColor: "rgba(255,255,255,0.07)" }}>
        <Link href="/appjeez" className="p-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }}>
          <ArrowLeft className="w-5 h-5 text-gray-400" />
        </Link>
        <div>
          <h1 className="font-black text-white text-base flex items-center gap-2">
            <DollarSign className="w-5 h-5" style={{ color: "#39FF14" }} />
            Actualizar Precios
          </h1>
          <p className="text-[10px]" style={{ color: "#6B7280" }}>Ajuste masivo por palabra clave</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-5 space-y-4">
        <div className="rounded-2xl p-4 space-y-4" style={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div>
            <label className="text-xs font-bold text-gray-400 mb-1.5 block">Palabra clave en el titulo</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#6B7280" }} />
              <input
                value={keyword} onChange={e => setKeyword(e.target.value)}
                placeholder='Ej: "Remera Lisa", "Kit Cadena"'
                className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm text-white outline-none"
                style={{ background: "#121212", border: "1px solid rgba(255,255,255,0.1)" }}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-400 mb-1.5 block">Precio objetivo (piso)</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#39FF14" }} />
              <input
                type="number" value={targetPrice} onChange={e => setTargetPrice(e.target.value)}
                placeholder="15000"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm text-white outline-none"
                style={{ background: "#121212", border: "1px solid rgba(255,255,255,0.1)" }}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-400 mb-1.5 block">Cuenta</label>
            <select
              value={selectedAcc} onChange={e => setSelectedAcc(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none appearance-none"
              style={{ background: "#121212", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <option value="all">Todas las cuentas</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.nickname}</option>
              ))}
            </select>
          </div>

          <div className="rounded-xl p-3 flex items-start gap-2" style={{ background: "#FFE60010", border: "1px solid #FFE60025" }}>
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#FFE600" }} />
            <p className="text-xs" style={{ color: "#FFE600" }}>
              Solo sube precios que esten POR DEBAJO del objetivo. Los precios iguales o superiores no se tocan.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => run(true)}
              disabled={loading || !keyword.trim() || !targetPrice}
              className="flex-1 py-3 rounded-xl font-black text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ background: "#1a1a1a", color: "#FFE600", border: "1px solid #FFE60033" }}>
              <Eye className="w-4 h-4" />
              Vista previa
            </button>
            <button
              onClick={() => run(false)}
              disabled={loading || !keyword.trim() || !targetPrice}
              className="flex-1 py-3 rounded-xl font-black text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ background: "#39FF14", color: "#121212" }}>
              {loading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Procesando...</> : <><DollarSign className="w-4 h-4" /> Actualizar precios</>}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: "#ef444418", border: "1px solid #ef444440" }}>
            <XCircle className="w-5 h-5 flex-shrink-0" style={{ color: "#ef4444" }} />
            <p className="text-sm text-white">{error}</p>
          </div>
        )}

        {data && (
          <>
            <div className="rounded-2xl p-3 space-y-1" style={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: "#6B7280" }}>Items escaneados</span>
                <span className="font-bold text-white">{data.summary.total_items_scanned.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: "#6B7280" }}>Saltados por cache</span>
                <span className="font-bold" style={{ color: "#00E5FF" }}>{data.summary.cache_hits_skipped.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: "#6B7280" }}>Consultados a MeLi</span>
                <span className="font-bold text-white">{data.summary.items_checked.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: "#6B7280" }}>Coincidencias</span>
                <span className="font-bold" style={{ color: "#FFE600" }}>{data.summary.matched}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-2xl p-3 text-center" style={{ background: "#1F1F1F", border: "1px solid #39FF1422" }}>
                <p className="text-2xl font-black" style={{ color: "#39FF14" }}>{data.summary.updated}</p>
                <p className="text-[10px] font-bold text-white">{data.dry_run ? "A actualizar" : "Actualizados"}</p>
              </div>
              <div className="rounded-2xl p-3 text-center" style={{ background: "#1F1F1F", border: "1px solid #6B728022" }}>
                <p className="text-2xl font-black" style={{ color: "#6B7280" }}>{data.summary.skipped}</p>
                <p className="text-[10px] font-bold text-white">Omitidos</p>
              </div>
              <div className="rounded-2xl p-3 text-center" style={{ background: "#1F1F1F", border: "1px solid #EF444422" }}>
                <p className="text-2xl font-black" style={{ color: "#EF4444" }}>{data.summary.errors}</p>
                <p className="text-[10px] font-bold text-white">Errores</p>
              </div>
            </div>

            {data.dry_run && data.summary.updated > 0 && (
              <div className="rounded-xl p-3 flex items-center gap-2" style={{ background: "#39FF1410", border: "1px solid #39FF1425" }}>
                <Eye className="w-4 h-4" style={{ color: "#39FF14" }} />
                <p className="text-xs text-white font-bold">
                  VISTA PREVIA — Hace clic en &quot;Actualizar precios&quot; para aplicar los cambios
                </p>
              </div>
            )}

            <div className="rounded-2xl overflow-hidden" style={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                <p className="text-sm font-bold text-white">
                  {data.results.length} publicaciones encontradas con &quot;{data.keyword}&quot;
                </p>
              </div>
              <div className="max-h-96 overflow-y-auto divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                {data.results.map((r, i) => {
                  const cfg = STATUS_CFG[r.status] ?? STATUS_CFG.error;
                  return (
                    <div key={`${r.item_id}-${i}`} className="px-4 py-3 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded" style={{ background: cfg.color, color: "#121212" }}>
                          {cfg.label}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#FFE60018", color: "#FFE600" }}>
                          {r.account}
                        </span>
                        {r.variations_updated != null && (
                          <span className="text-[10px] text-gray-500">
                            <Tag className="w-3 h-3 inline" /> {r.variations_updated} vars
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white font-medium line-clamp-1">{r.title}</p>
                      <div className="flex items-center gap-2 text-xs">
                        <span style={{ color: "#6B7280" }}>${r.old_price.toLocaleString()}</span>
                        {r.status !== "skipped" && (
                          <>
                            <span style={{ color: "#6B7280" }}>→</span>
                            <span style={{ color: "#39FF14" }} className="font-bold">${r.new_price.toLocaleString()}</span>
                          </>
                        )}
                      </div>
                      {r.reason && (
                        <p className="text-[10px] flex items-center gap-1" style={{ color: r.status === "catalog_warning" ? "#FFE600" : "#6B7280" }}>
                          {r.status === "catalog_warning" && <ShieldAlert className="w-3 h-3" />}
                          {r.reason}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default function PreciosPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#121212" }}>
        <RefreshCw className="w-6 h-6 animate-spin" style={{ color: "#39FF14" }} />
      </div>
    }>
      <PreciosInner />
    </Suspense>
  );
}
