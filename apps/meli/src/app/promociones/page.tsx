"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft, RefreshCw, Zap, CheckCircle2, XCircle,
  AlertCircle, ChevronDown, ChevronUp, Clock, List,
  Play, SkipForward, Percent,
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

function PromotionTypeBadge({ type }: { type: string }) {
  const short =
    type === "MARKETPLACE_CAMPAIGN" ? "CAMPAIGN" :
    type === "LIGHTNING_DEAL"       ? "FLASH" :
    type === "VOLUME_ON_VOLUME"     ? "VOL×VOL" :
    type.slice(0, 8).toUpperCase();
  const color =
    type === "LIGHTNING_DEAL"   ? "#A855F7" :
    type === "VOLUME_ON_VOLUME" ? "#00E5FF" :
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

export default function PromocionesPage() {
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

  // Cargar cuentas
  useEffect(() => {
    fetch("/api/meli-accounts")
      .then(r => r.json())
      .then(d => {
        // El endpoint retorna array directo o { accounts: [] }
        const list = Array.isArray(d) ? d : (d.accounts ?? []);
        setAccounts(list);
      })
      .catch(() => {});
  }, []);

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

  const summary = scanResult?.summary;

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
              <Zap className="w-5 h-5" style={{ color: "#FFE600" }} /> Promociones Automáticas
            </h1>
            <p className="text-[10px]" style={{ color: "#6B7280" }}>Acepta ofertas dentro de tu margen</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-5 space-y-4">

        {/* Configuración */}
        <div className="rounded-2xl p-4 space-y-4"
          style={{ background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.07)" }}>
          <p className="text-sm font-black text-white">Configuración</p>

          {/* Selector de cuenta — chips visuales */}
          <div>
            <label className="text-xs font-bold mb-2 block" style={{ color: "#6B7280" }}>
              Cuentas a escanear
            </label>
            <div className="flex flex-wrap gap-2">
              {/* Chip "Todas" */}
              <button
                onClick={() => setSelectedAcc("all")}
                className="px-3 py-1.5 rounded-xl text-xs font-black transition-all border"
                style={selectedAcc === "all"
                  ? { background: "#FFE600", color: "#121212", borderColor: "#FFE600" }
                  : { background: "transparent", color: "#9CA3AF", borderColor: "rgba(255,255,255,0.15)" }}>
                ★ Todas
              </button>
              {/* Chip por cada cuenta */}
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
              <p className="text-[10px] mt-1.5" style={{ color: "#4B5563" }}>
                Cargando cuentas...
              </p>
            )}
          </div>

          {/* Máximo % */}
          <div>
            <label className="text-xs font-bold mb-1.5 flex items-center justify-between"
              style={{ color: "#6B7280" }}>
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
              <p className="text-[10px] mt-0.5" style={{ color: "#6B7280" }}>
                Ver qué se aceptaría sin ejecutar cambios reales
              </p>
            </div>
            <button onClick={() => setDryRun(!dryRun)}
              className="w-12 h-6 rounded-full relative transition-all flex-shrink-0"
              style={{ background: dryRun ? "#FFE600" : "#374151" }}>
              <span className="absolute top-0.5 w-5 h-5 rounded-full transition-all"
                style={{
                  background: "white",
                  left: dryRun ? "calc(100% - 22px)" : "2px",
                }} />
            </button>
          </div>

          {/* Auto cada 12h */}
          <div className="flex items-center justify-between p-3 rounded-xl"
            style={{ background: "#121212", border: `1px solid ${autoEnabled ? "#39FF1430" : "rgba(255,255,255,0.07)"}` }}>
            <div>
              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" style={{ color: "#39FF14" }} />
                Auto cada 12 horas
              </p>
              {nextRun && (
                <p className="text-[10px] mt-0.5" style={{ color: "#39FF14" }}>
                  Próxima: {nextRun.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              )}
              {!autoEnabled && (
                <p className="text-[10px] mt-0.5" style={{ color: "#6B7280" }}>
                  Requiere que la pestaña esté abierta
                </p>
              )}
            </div>
            <button onClick={() => setAutoEnabled(!autoEnabled)}
              className="w-12 h-6 rounded-full relative transition-all flex-shrink-0"
              style={{ background: autoEnabled ? "#39FF14" : "#374151" }}>
              <span className="absolute top-0.5 w-5 h-5 rounded-full transition-all"
                style={{
                  background: "white",
                  left: autoEnabled ? "calc(100% - 22px)" : "2px",
                }} />
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
          <div className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: "#ef444418", border: "1px solid #ef444440" }}>
            <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: "#ef4444" }} />
            <p className="text-sm text-white">{error}</p>
          </div>
        )}

        {/* Resumen del escaneo */}
        {scanResult && (
          <>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Aceptadas",  val: summary?.accepted ?? 0, color: "#39FF14" },
                { label: "Omitidas",   val: summary?.skipped ?? 0,  color: "#FF9800" },
                { label: "Errores",    val: summary?.errors ?? 0,   color: "#ef4444" },
              ].map(s => (
                <div key={s.label} className="rounded-2xl p-3 text-center"
                  style={{ background: "#1A1A1A", border: `1px solid ${s.color}25` }}>
                  <p className="text-2xl font-black" style={{ color: s.color }}>{s.val}</p>
                  <p className="text-[10px] font-bold text-white mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
            {scanResult.dry_run && (
              <div className="rounded-xl px-3 py-2 text-center"
                style={{ background: "#FFE60012", border: "1px solid #FFE60030" }}>
                <p className="text-xs font-bold" style={{ color: "#FFE600" }}>
                  SIMULACIÓN — ningún cambio fue aplicado en MeLi
                </p>
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
                    <span className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ background: "#FFE60018", color: "#FFE600" }}>
                      {r.total} ofertas
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold" style={{ color: "#39FF14" }}>
                      +{r.accepted.length}
                    </span>
                    <span className="text-xs font-bold" style={{ color: "#FF9800" }}>
                      ~{r.skipped.length}
                    </span>
                    {expandedAcc === r.meli_user_id
                      ? <ChevronUp className="w-4 h-4 text-gray-500" />
                      : <ChevronDown className="w-4 h-4 text-gray-500" />}
                  </div>
                </button>

                {expandedAcc === r.meli_user_id && (
                  <div className="px-3 pb-3 space-y-1 border-t"
                    style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                    {[...r.accepted, ...r.skipped, ...r.errors].map((offer, i) => (
                      <div key={`${offer.item_id}-${i}`}
                        className="flex items-start gap-2 px-3 py-2.5 rounded-xl"
                        style={{ background: "#121212" }}>
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
                      <p className="text-xs text-center py-4" style={{ color: "#6B7280" }}>
                        Sin ofertas disponibles para esta cuenta
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {/* Historial de logs */}
        <div className="rounded-2xl overflow-hidden"
          style={{ background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.07)" }}>
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="w-full px-4 py-3 flex items-center justify-between">
            <span className="font-black text-sm text-white flex items-center gap-2">
              <List className="w-4 h-4" style={{ color: "#FFE600" }} />
              Historial de acciones
            </span>
            {showLogs
              ? <ChevronUp className="w-4 h-4 text-gray-500" />
              : <ChevronDown className="w-4 h-4 text-gray-500" />}
          </button>

          {showLogs && (
            <div className="border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              {loadingLogs && (
                <div className="p-6 text-center">
                  <RefreshCw className="w-5 h-5 mx-auto animate-spin" style={{ color: "#FFE600" }} />
                </div>
              )}
              {!loadingLogs && logs.length === 0 && (
                <p className="text-xs text-center py-6" style={{ color: "#6B7280" }}>
                  Sin historial aún
                </p>
              )}
              {!loadingLogs && logs.map(log => (
                <div key={log.id}
                  className="flex items-start gap-3 px-4 py-3 border-b last:border-0"
                  style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                  <ActionBadge action={log.action} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white line-clamp-1">{log.item_title}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: "#6B7280" }}>
                      {log.account} · {log.reason}
                    </p>
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

        {/* Info sobre stacking */}
        <div className="rounded-2xl p-4 space-y-2"
          style={{ background: "#1A1A1A", border: "1px solid #FF980025" }}>
          <p className="text-xs font-black" style={{ color: "#FF9800" }}>
            ⚠️ Aviso sobre Stacking de Promociones
          </p>
          <p className="text-[11px]" style={{ color: "#9CA3AF" }}>
            El % mostrado es el descuento que <strong className="text-white">vos absorbés</strong> como vendedor.
            MeLi puede combinar este descuento con cupones propios. Verificá en tu cuenta de MeLi que el descuento final mostrado al comprador no supere tu margen real antes de activar en modo real.
          </p>
          <p className="text-[11px]" style={{ color: "#9CA3AF" }}>
            Las <strong className="text-white">LIGHTNING_DEAL</strong> (ventas flash) tienen tiempo limitado. Una vez aceptadas, no se pueden retirar hasta que terminen.
          </p>
        </div>
      </div>
    </main>
  );
}
