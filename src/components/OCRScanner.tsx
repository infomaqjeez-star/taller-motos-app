"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { FlexZona, FLEX_LOCALIDADES } from "@/lib/types";
import {
  X, Camera, Search, ChevronRight,
  CheckCircle2, Loader2, Save, DollarSign, TrendingUp, Package,
  AlertTriangle,
} from "lucide-react";

const MAX = 50;

const ZONA_COLORS: Record<FlexZona, string> = {
  cercana: "bg-green-500/20 text-green-300 border-green-500/40",
  media:   "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
  lejana:  "bg-red-500/20 text-red-300 border-red-500/40",
};
const ZONA_LABELS: Record<FlexZona, string> = { cercana: "Cercana", media: "Media", lejana: "Lejana" };
const fmt = (n: number) => "$" + n.toLocaleString("es-AR");

function generateId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

function beep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 1100;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.start(); osc.stop(ctx.currentTime + 0.15);
  } catch (_) {}
}

// ─── Base de datos oficial ML Flex ───────────────────────────────────────────
const CP_MAP: Record<string, string> = {
  "1804": "Ezeiza",
  "1842": "Esteban Echeverría",
  "1759": "La Matanza Sur", "1761": "La Matanza Sur",
  "1870": "Avellaneda",
  "1824": "Lanús",
  "1832": "Lomas de Zamora",
  "1878": "Quilmes",
  "1880": "Berazategui", "1884": "Berazategui",
  "1888": "Florencio Varela",
  "1846": "Alte. Brown",
  "1650": "San Martín",
  "1675": "Tres de Febrero",
  "1708": "Morón",
  "1686": "Hurlingham",
  "1714": "Ituzaingó",
  "1663": "San Miguel",
  "1642": "San Isidro",
  "1602": "Vicente López",
  "1644": "San Fernando",
  "1648": "Tigre",
  "1613": "Malvinas Argentinas",
  "1665": "José C. Paz",
  "1722": "Merlo",
  "1744": "Moreno",
  "1629": "Pilar",
  "1625": "Escobar",
  "1900": "La Plata Centro",
  "1925": "Ensenada",
  "1923": "Berisso",
  "6700": "Luján",
  "1748": "Gral. Rodríguez",
  "1727": "Marcos Paz",
  "1806": "Cañuelas",
  "1865": "San Vicente",
  "1862": "Guernica",
  "2804": "Campana",
  "2800": "Zárate",
};

// Detectar localidad por CP — CABA por rango 1000-1499
function detectCPFromText(text: string): string | null {
  const patterns = [
    /CP[:\s.]*(\d{4})/i,
    /C\.P\.[:\s]*(\d{4})/i,
    /\bCP(\d{4})\b/i,
    /\b(\d{4})\b/g,
  ];
  for (const pattern of patterns) {
    if (pattern.flags.includes("g")) {
      const re = new RegExp(pattern.source, pattern.flags);
      let match = re.exec(text);
      while (match !== null) {
        const cp = parseInt(match[1], 10);
        if (cp >= 1000 && cp <= 1499) return "CABA";
        const loc = CP_MAP[match[1]];
        if (loc) return loc;
        match = re.exec(text);
      }
    } else {
      const match = text.match(pattern);
      if (match) {
        const cp = parseInt(match[1], 10);
        if (cp >= 1000 && cp <= 1499) return "CABA";
        const loc = CP_MAP[match[1]];
        if (loc) return loc;
      }
    }
  }
  return null;
}

function detectLocalidadFromText(text: string): string | null {
  const upper = text.toUpperCase().replace(/\n/g, " ").replace(/\s+/g, " ");

  const byCP = detectCPFromText(upper);
  if (byCP) return byCP;

  const sorted = [...FLEX_LOCALIDADES].sort((a, b) => b.nombre.length - a.nombre.length);
  for (const loc of sorted) {
    const name = loc.nombre.toUpperCase().replace(/\./g, "").replace(/\s+/g, "\\s+");
    if (new RegExp(name).test(upper)) return loc.nombre;
  }

  const aliases: Record<string, string> = {
    "FLORENCIO VARELA": "Florencio Varela",
    "TRES DE FEBRERO": "Tres de Febrero",
    "MARCOS PAZ": "Marcos Paz",
    "JOSE C PAZ": "José C. Paz",
    "JOSE C. PAZ": "José C. Paz",
    "ALTE BROWN": "Alte. Brown",
    "ALMIRANTE BROWN": "Alte. Brown",
    "GRAL RODRIGUEZ": "Gral. Rodríguez",
    "GENERAL RODRIGUEZ": "Gral. Rodríguez",
    "LA PLATA": "La Plata Centro",
    "VICENTE LOPEZ": "Vicente López",
    "LOMAS DE ZAMORA": "Lomas de Zamora",
    "SAN MARTIN": "San Martín",
    "SAN ISIDRO": "San Isidro",
    "SAN FERNANDO": "San Fernando",
    "SAN MIGUEL": "San Miguel",
    "SAN VICENTE": "San Vicente",
    "ITUZAINGO": "Ituzaingó",
    "MORON": "Morón",
    "LUJAN": "Luján",
    "ZARATE": "Zárate",
    "CANUELAS": "Cañuelas",
    "BERISSO": "Berisso",
    "ENSENADA": "Ensenada",
    "QUILMES": "Quilmes",
    "LANUS": "Lanús",
    "AVELLANEDA": "Avellaneda",
    "TIGRE": "Tigre",
    "PILAR": "Pilar",
    "CAMPANA": "Campana",
    "GARIN": "Garín",
    "NORDELTA": "Nordelta",
    "ESCOBAR": "Escobar",
    "HURLINGHAM": "Hurlingham",
    "MERLO": "Merlo",
    "MORENO": "Moreno",
    "BERAZATEGUI": "Berazategui",
    "EZEIZA": "Ezeiza",
    "GUERNICA": "Guernica",
    "FLORENCIO": "Florencio Varela",
  };
  for (const [alias, localidad] of Object.entries(aliases)) {
    if (upper.includes(alias)) return localidad;
  }
  return null;
}

function calcPaquete(localidad: string, tarifas: Record<FlexZona, number>) {
  const loc = FLEX_LOCALIDADES.find(l => l.nombre === localidad);
  const zona: FlexZona = loc?.zona ?? "lejana";
  const precioML = tarifas[zona];
  return { zona, precioML, pagoFlete: Math.round(precioML * 0.8), ganancia: Math.round(precioML * 0.2) };
}

function preprocessCanvas(src: HTMLCanvasElement): HTMLCanvasElement {
  const dst = document.createElement("canvas");
  dst.width = src.width; dst.height = src.height;
  const ctx = dst.getContext("2d")!;
  ctx.drawImage(src, 0, 0);
  const imgData = ctx.getImageData(0, 0, dst.width, dst.height);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const contrasted = Math.min(255, Math.max(0, ((gray - 50) / 170) * 255));
    d[i] = d[i + 1] = d[i + 2] = contrasted;
  }
  ctx.putImageData(imgData, 0, 0);
  return dst;
}

export interface PaqueteOCR {
  id: string;
  localidad: string;
  zona: FlexZona;
  precioML: number;
  pagoFlete: number;
  ganancia: number;
  fotoDataUrl: string;
  estado: "ok";
}

interface Props {
  tarifas: Record<FlexZona, number>;
  onFinish: (paquetes: PaqueteOCR[]) => void;
  onClose: () => void;
}

export default function OCRScanner({ tarifas, onFinish, onClose }: Props) {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const workerRef   = useRef<unknown>(null);
  const scanningRef = useRef(false);   // flag para el loop de análisis en tiempo real
  const lastScanRef = useRef(0);

  const [paquetes, setPaquetes]       = useState<PaqueteOCR[]>([]);
  const [camError, setCamError]       = useState("");
  const [capturing, setCapturing]     = useState(false);
  const [editIdx, setEditIdx]         = useState<number | null>(null);
  const [busqueda, setBusqueda]       = useState("");
  const [workerReady, setWorkerReady] = useState(false);

  // Estado del visor en tiempo real
  const [liveLocalidad, setLiveLocalidad] = useState<string | null>(null);
  const [liveScan, setLiveScan]           = useState<"scanning" | "found" | "notfound">("scanning");

  const localidadesFiltradas = busqueda.trim()
    ? FLEX_LOCALIDADES.filter(l => l.nombre.toLowerCase().includes(busqueda.toLowerCase()))
    : FLEX_LOCALIDADES;

  const stopCamera = useCallback(() => {
    scanningRef.current = false;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
    } catch (e: unknown) {
      setCamError("No se pudo acceder a la cámara: " + (e instanceof Error ? e.message : String(e)));
    }
  }, []);

  // Inicializar Tesseract
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { createWorker } = await import("tesseract.js");
        const w = await createWorker("eng+spa", 1, {
          workerPath: "https://unpkg.com/tesseract.js@5.1.1/dist/worker.min.js",
          langPath:   "https://tessdata.projectnaptha.com/4.0.0_fast",
          corePath:   "https://unpkg.com/tesseract.js-core@5.1.1/tesseract-core-simd-lstm.wasm.js",
          logger: () => {},
        });
        if (!cancelled) {
          await (w as unknown as { setParameters: (p: Record<string, string>) => Promise<void> }).setParameters({
            tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 :.-/",
          });
          workerRef.current = w;
          setWorkerReady(true);
        }
      } catch (_) {
        if (!cancelled) setWorkerReady(true);
      }
    })();
    return () => { cancelled = true; (workerRef.current as { terminate?: () => void })?.terminate?.(); };
  }, []);

  useEffect(() => { startCamera(); return () => stopCamera(); }, [startCamera, stopCamera]);

  // ─── Loop de análisis en tiempo real (cada 1.5s) ─────────────────────────
  useEffect(() => {
    if (!workerReady) return;
    scanningRef.current = true;

    const loop = async () => {
      if (!scanningRef.current) return;

      const now = Date.now();
      if (now - lastScanRef.current < 1500) {
        requestAnimationFrame(loop);
        return;
      }
      lastScanRef.current = now;

      const video  = videoRef.current;
      const canvas = canvasRef.current;
      const worker = workerRef.current as { recognize: (img: HTMLCanvasElement) => Promise<{ data: { text: string } }> } | null;

      if (!video || !canvas || !worker || video.readyState < 2) {
        requestAnimationFrame(loop);
        return;
      }

      // Captura frame reducido (640px) para velocidad
      const scale = Math.min(1, 640 / video.videoWidth);
      canvas.width  = Math.round(video.videoWidth  * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      try {
        const processed = preprocessCanvas(canvas);
        const { data: { text } } = await worker.recognize(processed);
        const loc = detectLocalidadFromText(text);

        if (!scanningRef.current) return;

        if (loc) {
          setLiveLocalidad(loc);
          setLiveScan("found");
        } else {
          setLiveLocalidad(null);
          setLiveScan("notfound");
        }
      } catch (_) {
        if (scanningRef.current) setLiveScan("scanning");
      }

      if (scanningRef.current) requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
    return () => { scanningRef.current = false; };
  }, [workerReady]);

  // ─── Capturar — solo guarda si hay zona válida detectada en tiempo real ───
  const capturar = useCallback(async () => {
    if (capturing || paquetes.length >= MAX) return;
    if (!liveLocalidad) return; // nada válido en visor → ignorar

    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    setCapturing(true);
    navigator.vibrate?.(60);

    // Captura a resolución completa para guardar la foto
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0);
    const fotoDataUrl = canvas.toDataURL("image/jpeg", 0.8);

    const calc = calcPaquete(liveLocalidad, tarifas);
    const nuevo: PaqueteOCR = {
      id:           generateId(),
      localidad:    liveLocalidad,
      zona:         calc.zona as FlexZona,
      precioML:     calc.precioML,
      pagoFlete:    calc.pagoFlete,
      ganancia:     calc.ganancia,
      fotoDataUrl,
      estado:       "ok",
    };
    setPaquetes(prev => [...prev, nuevo]);
    beep();
    setCapturing(false);
  }, [capturing, paquetes.length, liveLocalidad, tarifas]);

  const editarLocalidad = (idx: number, localidad: string) => {
    const calc = calcPaquete(localidad, tarifas);
    setPaquetes(prev => prev.map((p, i) => i === idx ? {
      ...p, localidad, zona: calc.zona as FlexZona,
      precioML: calc.precioML, pagoFlete: calc.pagoFlete, ganancia: calc.ganancia,
    } : p));
    setEditIdx(null); setBusqueda("");
  };

  const okCount       = paquetes.length;
  const totalML       = paquetes.reduce((s, p) => s + p.precioML, 0);
  const totalGanancia = paquetes.reduce((s, p) => s + p.ganancia, 0);
  const totalFlete    = paquetes.reduce((s, p) => s + p.pagoFlete, 0);

  // Color del marco según detección en tiempo real
  const frameColor = !workerReady
    ? "border-yellow-400"
    : liveScan === "found"
    ? "border-green-400"
    : liveScan === "notfound"
    ? "border-gray-500"
    : "border-yellow-400";

  const canCapture = workerReady && !!liveLocalidad && !capturing && paquetes.length < MAX;

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/90 backdrop-blur-sm flex-shrink-0 z-10">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-yellow-400" />
          <div>
            <p className="text-white font-bold text-sm">Escáner OCR</p>
            <p className="text-gray-400 text-xs">{paquetes.length}/{MAX} fotos · {okCount} guardadas</p>
          </div>
        </div>
        <div className="flex gap-2">
          {paquetes.length > 0 && (
            <button
              onClick={() => { stopCamera(); onFinish(paquetes); }}
              className="bg-yellow-500 text-black font-bold px-3 py-1.5 rounded-xl text-sm flex items-center gap-1"
            >
              <Save className="w-4 h-4" /> Guardar ({okCount})
            </button>
          )}
          <button onClick={() => { stopCamera(); onClose(); }} className="p-2 text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Cámara — ocupa todo el espacio disponible */}
      <div className="relative flex-1 overflow-hidden">
        {camError ? (
          <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center text-center px-6">
            <AlertTriangle className="w-10 h-10 text-red-400 mb-3" />
            <p className="text-red-300 text-sm">{camError}</p>
          </div>
        ) : (
          <>
            <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted />
            <canvas ref={canvasRef} className="hidden" />

            {/* Marco de enfoque — color dinámico según detección */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ paddingBottom: "140px" }}>
              <div className="relative w-72 h-44">
                {/* Esquinas del marco */}
                <div className={`absolute top-0 left-0 w-8 h-8 border-2 transition-colors duration-300 ${frameColor}`} style={{ borderWidth: "3px 0 0 3px" }} />
                <div className={`absolute top-0 right-0 w-8 h-8 border-2 transition-colors duration-300 ${frameColor}`} style={{ borderWidth: "3px 3px 0 0" }} />
                <div className={`absolute bottom-0 left-0 w-8 h-8 border-2 transition-colors duration-300 ${frameColor}`} style={{ borderWidth: "0 0 3px 3px" }} />
                <div className={`absolute bottom-0 right-0 w-8 h-8 border-2 transition-colors duration-300 ${frameColor}`} style={{ borderWidth: "0 3px 3px 0" }} />

                {/* Mensaje de detección dentro del marco */}
                <div className="absolute inset-0 flex items-center justify-center">
                  {liveScan === "found" && liveLocalidad ? (
                    <div className="bg-green-600/90 rounded-xl px-4 py-2 text-center">
                      <p className="text-white font-black text-base leading-tight">{liveLocalidad}</p>
                      <p className="text-green-200 text-xs mt-0.5">
                        {ZONA_LABELS[FLEX_LOCALIDADES.find(l => l.nombre === liveLocalidad)?.zona ?? "lejana"]} · {fmt(calcPaquete(liveLocalidad, tarifas).precioML)}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-black/60 rounded-xl px-3 py-1.5 flex items-center gap-2">
                      {!workerReady ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 text-yellow-400 animate-spin" />
                          <span className="text-yellow-300 text-xs font-semibold">Cargando OCR...</span>
                        </>
                      ) : (
                        <>
                          <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin" />
                          <span className="text-gray-300 text-xs">Buscando zona válida...</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Contador arriba derecha */}
            <div className={`absolute top-3 right-3 rounded-xl px-3 py-1.5 text-center ${
              paquetes.length >= MAX ? "bg-red-600" : "bg-black/70"
            }`}>
              <p className="text-white font-black text-2xl leading-none">{paquetes.length}</p>
              <p className="text-gray-300 text-[10px]">/{MAX}</p>
            </div>

            {/* ── BOTÓN CAPTURAR — fijo en parte inferior ── */}
            <div
              className="absolute bottom-0 inset-x-0 pb-8 pt-6 flex flex-col items-center gap-2"
              style={{ background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%)" }}
            >
              <p className={`text-xs font-semibold transition-colors ${canCapture ? "text-green-300" : "text-gray-400"}`}>
                {paquetes.length >= MAX
                  ? "Límite alcanzado"
                  : !workerReady
                  ? "Cargando motor OCR..."
                  : canCapture
                  ? `Tocá para guardar · ${liveLocalidad}`
                  : "Buscando zona válida..."}
              </p>

              <button
                onPointerDown={capturar}
                disabled={!canCapture}
                className="pointer-events-auto focus:outline-none"
              >
                <div className={`w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all duration-200 shadow-2xl ${
                  canCapture
                    ? "border-green-400 bg-green-600/30 active:scale-90 active:bg-green-600/60"
                    : "border-gray-600 bg-gray-800/50 opacity-50"
                }`}>
                  {capturing ? (
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  ) : (
                    <Camera className={`w-9 h-9 ${canCapture ? "text-green-300" : "text-gray-500"}`} />
                  )}
                </div>
              </button>

              {!canCapture && paquetes.length < MAX && workerReady && (
                <p className="text-gray-600 text-[10px]">El botón se activa cuando detecte una zona</p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Lista de paquetes — panel inferior, solo paquetes válidos */}
      {paquetes.length > 0 && (
        <div className="flex-shrink-0 bg-gray-950 overflow-y-auto" style={{ maxHeight: "40vh" }}>
          <div className="sticky top-0 bg-gray-900/95 border-b border-gray-700 px-4 py-2 flex justify-between z-10">
            <div className="flex gap-3 text-xs">
              {[
                { icon: <DollarSign className="w-3 h-3" />, label: "ML", value: fmt(totalML), color: "text-white" },
                { icon: <Package className="w-3 h-3" />, label: "Flete", value: fmt(totalFlete), color: "text-blue-300" },
                { icon: <TrendingUp className="w-3 h-3" />, label: "Gan.", value: fmt(totalGanancia), color: "text-green-300" },
              ].map(({ icon, label, value, color }) => (
                <div key={label} className="flex items-center gap-1">
                  <span className="text-gray-500">{icon}</span>
                  <span className="text-gray-400">{label}:</span>
                  <span className={`font-bold ${color}`}>{value}</span>
                </div>
              ))}
            </div>
            <span className="text-xs text-gray-500">{paquetes.length} paq.</span>
          </div>

          <div className="p-3 space-y-2">
            {[...paquetes].reverse().map((p, revIdx) => {
              const idx = paquetes.length - 1 - revIdx;
              return (
                <div key={p.id} className="rounded-xl border border-gray-700 bg-gray-800/50 overflow-hidden">
                  {editIdx === idx ? (
                    <div className="p-3 space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400" />
                        <input autoFocus type="text" placeholder="Buscar localidad..."
                          value={busqueda} onChange={e => setBusqueda(e.target.value)}
                          className="w-full bg-gray-700 text-white rounded-lg pl-8 pr-3 py-2 text-sm border border-yellow-400 outline-none"
                        />
                      </div>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {localidadesFiltradas.map(loc => (
                          <button key={loc.nombre} onClick={() => editarLocalidad(idx, loc.nombre)}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-left">
                            <span className="text-white text-sm">{loc.nombre}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${ZONA_COLORS[loc.zona]}`}>{ZONA_LABELS[loc.zona]}</span>
                          </button>
                        ))}
                      </div>
                      <button onClick={() => { setEditIdx(null); setBusqueda(""); }} className="text-xs text-gray-500">Cancelar</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.fotoDataUrl} alt="" className="w-12 h-12 object-cover rounded-lg flex-shrink-0 border border-gray-600" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-gray-500 text-xs font-bold">#{idx + 1}</span>
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                          <span className="text-white text-sm font-semibold">{p.localidad}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${ZONA_COLORS[p.zona]}`}>{ZONA_LABELS[p.zona]}</span>
                        </div>
                        <p className="text-gray-500 text-[10px] mt-0.5">
                          ML: {fmt(p.precioML)} · Flete: {fmt(p.pagoFlete)} · Gan: <span className="text-green-300">{fmt(p.ganancia)}</span>
                        </p>
                      </div>
                      <button onClick={() => { setEditIdx(idx); setBusqueda(""); }}
                        className="p-1.5 rounded-lg bg-gray-700 text-gray-400 hover:text-yellow-300 flex-shrink-0">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
