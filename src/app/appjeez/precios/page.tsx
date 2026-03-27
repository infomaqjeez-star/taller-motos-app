"use client";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import {
  ArrowLeft, Search, DollarSign, RefreshCw, AlertTriangle,
  XCircle, Tag, ShieldAlert, Eye, Percent, Plus, TrendingUp,
} from "lucide-react";

type AdjustmentType = "percentage" | "fixed_floor" | "fixed_add";

interface PriceResult {
  account: string;
  item_id: string;
  title: string;
  old_price: number;
  new_price: number;
  adjustment_type: AdjustmentType;
  adjustment_value: number;
  status: "updated" | "skipped" | "error" | "catalog_warning" | "promo_blocked";
  reason?: string;
  variations_updated?: number;
}
interface PriceResponse {
  keyword: string;
  adjustment_type: AdjustmentType;
  adjustment_value: number;
  adjustment_label: string;
  dry_run: boolean;
  results: PriceResult[];
  summary: {
    total_items_scanned: number; cache_hits_skipped: number;
    items_checked: number; matched: number; updated: number; skipped: number; errors: number;
  };
}

const STATUS_CFG: Record<string, { color: string; label: string }> = {
  updated:         { color: "#39FF14", label: "ACTUALIZADO" },
  catalog_warning: { color: "#FFE600", label: "CATALOGO" },
  skipped:         { color: "#6B7280", label: "OMITIDO" },
  error:           { color: "#EF4444", label: "ERROR" },
  promo_blocked:   { color: "#F97316", label: "EN PROMO" },
};

const ADJ_TYPES: Array<{
  value: AdjustmentType; label: string; desc: string;
  icon: React.ReactNode; color: string; placeholder: string; prefix: string;
}> = [
  {
    value: "fixed_floor",
    label: "Precio Piso",
    desc: "Solo sube si está por debajo del valor",
    icon: <TrendingUp className="w-4 h-4" />,
    color: "#39FF14",
    placeholder: "15000",
    prefix: "$",
  },
  {
    value: "percentage",
    label: "Porcentaje",
    desc: "Multiplica el precio actual × (1 + %/100)",
    icon: <Percent className="w-4 h-4" />,
    color: "#FFE600",
    placeholder: "10",
    prefix: "%",
  },
  {
    value: "fixed_add",
    label: "Suma Fija",
    desc: "Agrega un monto exacto al precio actual",
    icon: <Plus className="w-4 h-4" />,
    color: "#00E5FF",
    placeholder: "500",
    prefix: "$+",
  },
];

function PreciosInner() {
  const [keyword, setKeyword]           = useState("");
  const [adjType, setAdjType]           = useState<AdjustmentType>("fixed_floor");
  const [adjValue, setAdjValue]         = useState("");
  const [loading, setLoading]           = useState(false);
  const [data, setData]                 = useState<PriceResponse | null>(null);
  const [error, setError]               = useState<string | null>(null);
  const [accounts, setAccounts]         = useState<Array<{ meli_user_id: string; nickname: string }>>([]);
  const [selectedAcc, setSelectedAcc]   = useState("all");

  useEffect(() => {
    fetch("/api/meli-accounts")
      .then(r => r.json())
      .then(d => {
        const list = Array.isArray(d) ? d : (d.accounts ?? []);
        setAccounts(list);
      })
      .catch(() => {});
  }, []);

  const activeCfg = ADJ_TYPES.find(t => t.value === adjType)!;

  const previewFormula = () => {
    const v = Number(adjValue);
    if (!v) return null;
    const sample = 10000;
    let result: number;
    if (adjType === "percentage")   result = sample * (1 + v / 100);
    else if (adjType === "fixed_add") result = sample + v;
    else result = v; // floor
    return `Ej: $${sample.toLocaleString("es-AR")} → $${Math.round(result).toLocaleString("es-AR")}`;
  };

  const run = async (dryRun: boolean) => {
    if (!keyword.trim() || !adjValue) return;
    setLoading(true); setError(null); setData(null);
    try {
      const payload: Record<string, unknown> = {
        keyword:          keyword.trim(),
        adjustment_type:  adjType,
        adjustment_value: Number(adjValue),
        dry_run:          dryRun,
      };
      if (selectedAcc !== "all") payload.account_ids = [selectedAcc];

      const res = await fetch("/api/meli-price-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json() as PriceResponse);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const formula = previewFormula();

  return (
    <main className="min-h-screen pb-24" style={{ background: "#121212" }}>
      {/* Header */}
      <div className="sticky top-0 z-30 px-4 py-3 flex items-center gap-3 border-b"
        style={{ background: "rgba(18,18,18,0.97)", backdropFilter: "blur(16px)", borderColor: "rgba(255,255,255,0.07)" }}>
        <Link href="/appjeez" className="p-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }}>
          <ArrowLeft className="w-5 h-5 text-gray-400" />
        </Link>
        <div>
          <h1 className="font-black text-white text-base flex items-center gap-2">
            <DollarSign className="w-5 h-5" style={{ color: "#39FF14" }} /> Actualizar Precios
          </h1>
          <p className="text-[10px]" style={{ color: "#6B7280" }}>Ajuste masivo por palabra clave</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-5 space-y-4">

        {/* Formulario */}
        <div className="rounded-2xl p-4 space-y-4"
          style={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.07)" }}>

          {/* Palabra clave */}
          <div>
            <label className="text-xs font-bold text-gray-400 mb-1.5 block">Palabra clave en el título</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#6B7280" }} />
              <input
                value={keyword} onChange={e => setKeyword(e.target.value)}
                placeholder='Ej: "Cardan", "Kit Cadena", "Remera"'
                className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm text-white outline-none"
                style={{ background: "#121212", border: "1px solid rgba(255,255,255,0.1)" }}
              />
            </div>
            <p className="text-[10px] mt-1" style={{ color: "#6B7280" }}>
              No distingue mayúsculas, tildes ni caracteres especiales
            </p>
          </div>

          {/* Tipo de ajuste — 3 opciones */}
          <div>
            <label className="text-xs font-bold text-gray-400 mb-2 block">Tipo de ajuste</label>
            <div className="grid grid-cols-3 gap-2">
              {ADJ_TYPES.map(t => (
                <button key={t.value} onClick={() => setAdjType(t.value)}
                  className="p-3 rounded-xl text-center transition-all border"
                  style={adjType === t.value
                    ? { background: `${t.color}18`, borderColor: t.color, color: t.color }
                    : { background: "#121212", borderColor: "rgba(255,255,255,0.08)", color: "#6B7280" }}>
                  <div className="flex justify-center mb-1">{t.icon}</div>
                  <p className="text-[11px] font-black">{t.label}</p>
                  <p className="text-[9px] mt-0.5 leading-tight">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Valor del ajuste */}
          <div>
            <label className="text-xs font-bold mb-1.5 block" style={{ color: "#6B7280" }}>
              Valor del ajuste
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black"
                style={{ color: activeCfg.color }}>
                {activeCfg.prefix}
              </span>
              <input
                type="number" min="0" step="any"
                value={adjValue} onChange={e => setAdjValue(e.target.value)}
                placeholder={activeCfg.placeholder}
                className="w-full pl-10 pr-3 py-2.5 rounded-xl text-sm text-white outline-none"
                style={{ background: "#121212", border: `1px solid ${activeCfg.color}44` }}
              />
            </div>
            {formula && (
              <p className="text-[10px] mt-1 font-bold" style={{ color: activeCfg.color }}>
                {formula}
              </p>
            )}
          </div>

          {/* Selector de cuentas — chips */}
          <div>
            <label className="text-xs font-bold text-gray-400 mb-2 block">Cuentas</label>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setSelectedAcc("all")}
                className="px-3 py-1.5 rounded-xl text-xs font-black transition-all border"
                style={selectedAcc === "all"
                  ? { background: "#FFE600", color: "#121212", borderColor: "#FFE600" }
                  : { background: "transparent", color: "#9CA3AF", borderColor: "rgba(255,255,255,0.15)" }}>
                ★ Todas
              </button>
              {accounts.map(a => (
                <button key={a.meli_user_id}
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

          {/* Aviso contextual según tipo */}
          <div className="rounded-xl p-3 flex items-start gap-2"
            style={{ background: `${activeCfg.color}10`, border: `1px solid ${activeCfg.color}25` }}>
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: activeCfg.color }} />
            <p className="text-xs" style={{ color: activeCfg.color }}>
              {adjType === "fixed_floor" && "Solo actualiza publicaciones cuyo precio actual sea MENOR al valor ingresado."}
              {adjType === "percentage"  && "Multiplica el precio actual de TODAS las coincidencias. Aplica también a variaciones."}
              {adjType === "fixed_add"   && "Suma el monto exacto al precio actual de TODAS las coincidencias. Aplica también a variaciones."}
            </p>
          </div>

          {/* Botones */}
          <div className="flex gap-2">
            <button onClick={() => run(true)}
              disabled={loading || !keyword.trim() || !adjValue}
              className="flex-1 py-3 rounded-xl font-black text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ background: "#1a1a1a", color: "#FFE600", border: "1px solid #FFE60033" }}>
              <Eye className="w-4 h-4" /> Vista previa
            </button>
            <button onClick={() => run(false)}
              disabled={loading || !keyword.trim() || !adjValue}
              className="flex-1 py-3 rounded-xl font-black text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ background: activeCfg.color, color: "#121212" }}>
              {loading
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Procesando...</>
                : <><DollarSign className="w-4 h-4" /> Aplicar cambios</>}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: "#ef444418", border: "1px solid #ef444440" }}>
            <XCircle className="w-5 h-5 flex-shrink-0" style={{ color: "#ef4444" }} />
            <p className="text-sm text-white">{error}</p>
          </div>
        )}

        {data && (
          <>
            {/* Método aplicado */}
            <div className="rounded-xl px-4 py-2.5 flex items-center gap-2"
              style={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.07)" }}>
              <span className="text-xs font-bold text-white">Método:</span>
              <span className="text-xs font-black px-2 py-0.5 rounded"
                style={{ background: activeCfg.color, color: "#121212" }}>
                {data.adjustment_label}
              </span>
              {data.dry_run && (
                <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded"
                  style={{ background: "#FFE60020", color: "#FFE600" }}>SIMULACIÓN</span>
              )}
            </div>

            {/* Estadísticas */}
            <div className="rounded-2xl p-3 space-y-1"
              style={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.07)" }}>
              {[
                ["Items escaneados", data.summary.total_items_scanned.toLocaleString(), "text-white"],
                ["Saltados por caché", data.summary.cache_hits_skipped.toLocaleString(), "text-cyan-400"],
                ["Consultados a MeLi", data.summary.items_checked.toLocaleString(), "text-white"],
                ["Coincidencias", data.summary.matched.toString(), "text-yellow-400"],
              ].map(([label, val, cls]) => (
                <div key={label} className="flex items-center justify-between text-xs">
                  <span style={{ color: "#6B7280" }}>{label}</span>
                  <span className={`font-bold ${cls}`}>{val}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { label: data.dry_run ? "A actualizar" : "Actualizados", val: data.summary.updated, color: "#39FF14" },
                { label: "Omitidos",  val: data.summary.skipped, color: "#6B7280" },
                { label: "Errores",   val: data.summary.errors,  color: "#EF4444" },
              ].map(s => (
                <div key={s.label} className="rounded-2xl p-3 text-center"
                  style={{ background: "#1F1F1F", border: `1px solid ${s.color}22` }}>
                  <p className="text-2xl font-black" style={{ color: s.color }}>{s.val}</p>
                  <p className="text-[10px] font-bold text-white">{s.label}</p>
                </div>
              ))}
            </div>

            {data.dry_run && data.summary.updated > 0 && (
              <div className="rounded-xl p-3 flex items-center gap-2"
                style={{ background: "#39FF1410", border: "1px solid #39FF1425" }}>
                <Eye className="w-4 h-4" style={{ color: "#39FF14" }} />
                <p className="text-xs text-white font-bold">
                  VISTA PREVIA — clic en &quot;Aplicar cambios&quot; para ejecutar
                </p>
              </div>
            )}

            {/* Lista de resultados */}
            <div className="rounded-2xl overflow-hidden"
              style={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                <p className="text-sm font-bold text-white">
                  {data.results.length} publicaciones con &quot;{data.keyword}&quot;
                </p>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {data.results.map((r, i) => {
                  const cfg = STATUS_CFG[r.status] ?? STATUS_CFG.error;
                  const diff = r.new_price - r.old_price;
                  return (
                    <div key={`${r.item_id}-${i}`}
                      className="px-4 py-3 space-y-1 border-b last:border-0"
                      style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded"
                          style={{ background: cfg.color, color: "#121212" }}>
                          {cfg.label}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: "#FFE60018", color: "#FFE600" }}>
                          {r.account}
                        </span>
                        {r.variations_updated != null && r.variations_updated > 0 && (
                          <span className="text-[10px] text-gray-500">
                            <Tag className="w-3 h-3 inline mr-0.5" />{r.variations_updated} vars
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white font-medium line-clamp-1">{r.title}</p>
                      <div className="flex items-center gap-2 text-xs">
                        <span style={{ color: "#6B7280" }}>${r.old_price.toLocaleString("es-AR")}</span>
                        {r.status !== "skipped" && (
                          <>
                            <span style={{ color: "#6B7280" }}>→</span>
                            <span className="font-black" style={{ color: "#39FF14" }}>
                              ${r.new_price.toLocaleString("es-AR")}
                            </span>
                            {diff !== 0 && (
                              <span className="text-[10px] font-bold"
                                style={{ color: diff > 0 ? "#39FF14" : "#ef4444" }}>
                                ({diff > 0 ? "+" : ""}{diff.toLocaleString("es-AR")})
                              </span>
                            )}
                          </>
                        )}
                      </div>
                      {r.reason && (
                        <p className="text-[10px] flex items-center gap-1"
                          style={{ color: r.status === "catalog_warning" ? "#FFE600" : "#6B7280" }}>
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
