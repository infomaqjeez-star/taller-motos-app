"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { FlexZona, FLEX_LOCALIDADES } from "@/lib/types";
import {
  X, Camera, Search, ChevronRight, AlertTriangle,
  CheckCircle2, Loader2, Save, DollarSign, TrendingUp, Package,
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

// ─── Mapa de códigos postales a localidades (datos oficiales ML Flex) ────────
// CABA se detecta por rango 1000-1499 en detectCPFromText (no se lista aquí)
const CP_MAP: Record<string, string> = {
  // ── CERCANA ($4490) ───────────────────────────────────────────────────────
  "1804": "Ezeiza",
  // ── MEDIA ($6490) ─────────────────────────────────────────────────────────
  "1842": "Esteban Echeverría",
  "1759": "La Matanza Sur", "1761": "La Matanza Sur",
  // ── LEJANA ($8490) ────────────────────────────────────────────────────────
  // (CABA 1000-1499 se detecta por rango, ver función detectCPFromText)
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

// Detectar localidad por CP numérico — busca "CP: 1888", "CP 1888", "1888" suelto, etc.
// CABA se detecta por rango 1000-1499 sin necesidad de listarlo en CP_MAP.
function detectCPFromText(text: string): string | null {
  const patterns = [
    /CP[:\s.]*(\d{4})/i,
    /C\.P\.[:\s]*(\d{4})/i,
    /\bCP(\d{4})\b/i,
    /\b(\d{4})\b/g,
  ];
  for (const pattern of patterns) {
    if (pattern.flags.includes("g")) {
      // Para el patrón global, usar exec en bucle (compatible con ES5)
      const re = new RegExp(pattern.source, pattern.flags);
      let match = re.exec(text);
      while (match !== null) {
        const cp = parseInt(match[1], 10);
        // CABA: rango 1000-1499
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

  // 1. Primero intentar por CP (muy confiable)
  const byCP = detectCPFromText(upper);
  if (byCP) return byCP;

  // 2. Ordenar por longitud descendente para priorizar nombres más largos
  const sorted = [...FLEX_LOCALIDADES].sort((a, b) => b.nombre.length - a.nombre.length);
  for (const loc of sorted) {
    const name = loc.nombre.toUpperCase()
      .replace(/\./g, "")
      .replace(/\s+/g, "\\s+");
    const regex = new RegExp(name);
    if (regex.test(upper)) return loc.nombre;
  }

  // 3. Aliases y variaciones comunes en etiquetas ML
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
    "ING MASCHWITZ": "Ing. Maschwitz",
    "INGENIERO MASCHWITZ": "Ing. Maschwitz",
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
    "DERQUI": "Derqui",
    "GUERNICA": "Guernica",
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

// Preprocesar canvas: escala de grises con contraste suave (NO binarización dura)
function preprocessCanvas(src: HTMLCanvasElement): HTMLCanvasElement {
  const dst = document.createElement("canvas");
  dst.width = src.width; dst.height = src.height;
  const ctx = dst.getContext("2d")!;
  ctx.drawImage(src, 0, 0);
  const imgData = ctx.getImageData(0, 0, dst.width, dst.height);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    // Contraste suave: estira el rango 50-220 a 0-255
    const contrasted = Math.min(255, Math.max(0, ((gray - 50) / 170) * 255));
    d[i] = d[i + 1] = d[i + 2] = contrasted;
  }
  ctx.putImageData(imgData, 0, 0);
  return dst;
}

export interface PaqueteOCR {
  id: string;
  localidad: string | null;
  zona: FlexZona | null;
  precioML: number;
  pagoFlete: number;
  ganancia: number;
  fotoDataUrl: string;
  ocrText: string;
  estado: "ok" | "sin_zona" | "procesando";
}

interface Props {
  tarifas: Record<FlexZona, number>;
  onFinish: (paquetes: PaqueteOCR[]) => void;
  onClose: () => void;
}

export default function OCRScanner({ tarifas, onFinish, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [paquetes, setPaquetes] = useState<PaqueteOCR[]>([]);
  const [camError, setCamError] = useState("");
  const [capturing, setCapturing] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [workerReady, setWorkerReady] = useState(false);
  const workerRef = useRef<unknown>(null);

  const localidadesFiltradas = busqueda.trim()
    ? FLEX_LOCALIDADES.filter(l => l.nombre.toLowerCase().includes(busqueda.toLowerCase()))
    : FLEX_LOCALIDADES;

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

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  // Inicializar Tesseract worker — inglés + español para mejor lectura de texto de impresora
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { createWorker } = await import("tesseract.js");
        const w = await createWorker("eng+spa", 1, {
          workerPath: "https://unpkg.com/tesseract.js@5.1.1/dist/worker.min.js",
          langPath: "https://tessdata.projectnaptha.com/4.0.0_fast",
          corePath: "https://unpkg.com/tesseract.js-core@5.1.1/tesseract-core-simd-lstm.wasm.js",
          logger: () => {},
        });
        if (!cancelled) {
          // Configurar para texto de impresora (PSMODE_SINGLE_BLOCK mejora rendimiento)
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

  const capturar = useCallback(async () => {
    if (capturing || paquetes.length >= MAX) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    setCapturing(true);
    navigator.vibrate?.(60);

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0);
    const fotoDataUrl = canvas.toDataURL("image/jpeg", 0.8);

    const id = generateId();
    const nuevo: PaqueteOCR = {
      id, localidad: null, zona: null, precioML: 0, pagoFlete: 0, ganancia: 0,
      fotoDataUrl, ocrText: "", estado: "procesando",
    };
    setPaquetes(prev => [...prev, nuevo]);
    setCapturing(false);

    // OCR en background
    (async () => {
      let localidad: string | null = null;
      let ocrText = "";

      try {
        if (workerRef.current) {
          const worker = workerRef.current as {
            recognize: (img: HTMLCanvasElement) => Promise<{ data: { text: string } }>
          };

          // INTENTO 1: Escanear la imagen completa preprocesada
          const processed = preprocessCanvas(canvas);
          const result1 = await worker.recognize(processed);
          ocrText = result1.data.text;
          localidad = detectLocalidadFromText(ocrText);

          // INTENTO 2: Si no encontró, escanear la imagen original sin preprocesar
          if (!localidad) {
            const result2 = await worker.recognize(canvas);
            ocrText += " " + result2.data.text;
            localidad = detectLocalidadFromText(ocrText);
          }

          // INTENTO 3: Si aún no encontró, recorte zona media de la foto
          if (!localidad) {
            const cropCanvas = document.createElement("canvas");
            cropCanvas.width = canvas.width;
            cropCanvas.height = Math.floor(canvas.height * 0.5);
            const cropCtx = cropCanvas.getContext("2d")!;
            cropCtx.drawImage(
              canvas,
              0, Math.floor(canvas.height * 0.25),
              canvas.width, cropCanvas.height,
              0, 0, cropCanvas.width, cropCanvas.height
            );
            const result3 = await worker.recognize(preprocessCanvas(cropCanvas));
            ocrText += " " + result3.data.text;
            localidad = detectLocalidadFromText(ocrText);
          }
        }
      } catch (_) {}

      const calc = localidad ? calcPaquete(localidad, tarifas) : { zona: null, precioML: 0, pagoFlete: 0, ganancia: 0 };
      setPaquetes(prev => prev.map(p => p.id === id ? {
        ...p,
        localidad,
        zona: calc.zona as FlexZona | null,
        precioML: calc.precioML,
        pagoFlete: calc.pagoFlete,
        ganancia: calc.ganancia,
        ocrText,
        estado: localidad ? "ok" : "sin_zona",
      } : p));
      if (localidad) beep();
    })();
  }, [capturing, paquetes.length, tarifas]);

  const editarLocalidad = (idx: number, localidad: string) => {
    const calc = calcPaquete(localidad, tarifas);
    setPaquetes(prev => prev.map((p, i) => i === idx ? {
      ...p, localidad, zona: calc.zona as FlexZona, precioML: calc.precioML,
      pagoFlete: calc.pagoFlete, ganancia: calc.ganancia, estado: "ok",
    } : p));
    setEditIdx(null); setBusqueda("");
  };

  const procesandoCount = paquetes.filter(p => p.estado === "procesando").length;
  const sinZonaCount = paquetes.filter(p => p.estado === "sin_zona").length;
  const okCount = paquetes.filter(p => p.estado === "ok").length;
  const totalML = paquetes.reduce((s, p) => s + p.precioML, 0);
  const totalGanancia = paquetes.reduce((s, p) => s + p.ganancia, 0);
  const totalFlete = paquetes.reduce((s, p) => s + p.pagoFlete, 0);

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/90 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-yellow-400" />
          <div>
            <p className="text-white font-bold text-sm">Escáner OCR</p>
            <p className="text-gray-400 text-xs">
              {procesandoCount > 0
                ? `Procesando ${procesandoCount}...`
                : `${paquetes.length}/${MAX} fotos · ${okCount} detectadas`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {paquetes.length > 0 && (
            <button
              onClick={() => { stopCamera(); onFinish(paquetes); }}
              className="bg-yellow-500 text-black font-bold px-3 py-1.5 rounded-xl text-sm flex items-center gap-1"
            >
              <Save className="w-4 h-4" /> Guardar {okCount > 0 ? `(${okCount})` : ""}
            </button>
          )}
          <button onClick={() => { stopCamera(); onClose(); }} className="p-2 text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Cámara */}
      <div className="relative flex-shrink-0" style={{ height: "55vw", maxHeight: "320px" }}>
        {camError ? (
          <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center text-center px-6">
            <AlertTriangle className="w-10 h-10 text-red-400 mb-3" />
            <p className="text-red-300 text-sm">{camError}</p>
          </div>
        ) : (
          <>
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            <canvas ref={canvasRef} className="hidden" />

            {/* Marco de enfoque */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-72 h-40">
                <div className="absolute top-0 left-0 w-7 h-7 border-yellow-400" style={{ borderWidth: "3px 0 0 3px" }} />
                <div className="absolute top-0 right-0 w-7 h-7 border-yellow-400" style={{ borderWidth: "3px 3px 0 0" }} />
                <div className="absolute bottom-0 left-0 w-7 h-7 border-yellow-400" style={{ borderWidth: "0 0 3px 3px" }} />
                <div className="absolute bottom-0 right-0 w-7 h-7 border-yellow-400" style={{ borderWidth: "0 3px 3px 0" }} />
                <p className="absolute -bottom-7 inset-x-0 text-center text-yellow-300 text-xs font-semibold">
                  Encuadrar la etiqueta completa — ciudad y CP visibles
                </p>
              </div>
            </div>

            {/* Contador */}
            <div className={`absolute top-3 right-3 rounded-xl px-3 py-1.5 text-center ${
              paquetes.length >= MAX ? "bg-red-600" : "bg-black/70"
            }`}>
              <p className="text-white font-black text-2xl leading-none">{paquetes.length}</p>
              <p className="text-gray-300 text-[10px]">/{MAX}</p>
            </div>

            {/* Indicador OCR cargando */}
            {!workerReady && (
              <div className="absolute top-3 left-3 bg-blue-600/90 rounded-xl px-3 py-1.5 flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                <span className="text-white text-xs font-bold">Cargando OCR...</span>
              </div>
            )}
            {workerReady && procesandoCount > 0 && (
              <div className="absolute top-3 left-3 bg-blue-600/80 rounded-xl px-3 py-1.5 flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                <span className="text-white text-xs font-bold">OCR {procesandoCount}</span>
              </div>
            )}

            {/* Botón capturar */}
            <button
              onPointerDown={capturar}
              disabled={capturing || paquetes.length >= MAX || !workerReady}
              className="absolute bottom-4 inset-x-0 flex justify-center pointer-events-auto"
            >
              <div className={`w-16 h-16 rounded-full border-4 flex items-center justify-center transition-all ${
                capturing
                  ? "border-gray-500 bg-gray-700"
                  : paquetes.length >= MAX
                  ? "border-red-600 bg-red-900/50"
                  : !workerReady
                  ? "border-yellow-500/50 bg-yellow-900/30"
                  : "border-white bg-white/20 active:bg-white/40"
              }`}>
                {capturing || (!workerReady) ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <Camera className="w-7 h-7 text-white" />
                )}
              </div>
            </button>
          </>
        )}
      </div>

      {/* Lista de paquetes */}
      <div className="flex-1 overflow-y-auto bg-gray-950">
        {paquetes.length > 0 && (
          <div className="sticky top-0 bg-gray-900/95 border-b border-gray-700 px-4 py-2 flex justify-between z-10">
            <p className="text-xs text-gray-400">
              {sinZonaCount > 0 && <span className="text-red-400 font-bold">{sinZonaCount} sin zona · </span>}
              ML: <span className="text-white font-bold">{fmt(totalML)}</span>
            </p>
            <p className="text-green-300 font-black text-sm">Ganancia: {fmt(totalGanancia)}</p>
          </div>
        )}

        {paquetes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6 space-y-3">
            <Camera className="w-12 h-12 text-yellow-400/30 mb-1" />
            <p className="text-gray-400 text-sm font-semibold">Apuntá a la etiqueta completa</p>
            <p className="text-gray-600 text-xs">El OCR detecta la ciudad o el código postal (CP)</p>
            <div className="bg-gray-800/60 rounded-xl p-3 text-xs text-gray-400 space-y-1 text-left max-w-xs w-full">
              <p className="text-yellow-400 font-bold mb-1">Consejos para mejor lectura:</p>
              <p>• Buena luz sobre la etiqueta</p>
              <p>• La ciudad debe verse nítida</p>
              <p>• Incluir el CP: 1888 también sirve</p>
              <p>• Mantener el celular quieto al sacar la foto</p>
            </div>
            {!workerReady && <p className="text-yellow-400/60 text-xs">Cargando motor OCR...</p>}
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {/* Resumen total */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="bg-gray-800 rounded-xl p-2.5 text-center">
                <DollarSign className="w-3.5 h-3.5 text-yellow-400 mx-auto mb-0.5" />
                <p className="text-[10px] text-gray-400">Total ML</p>
                <p className="text-white font-black text-sm">{fmt(totalML)}</p>
              </div>
              <div className="bg-gray-800 rounded-xl p-2.5 text-center">
                <Package className="w-3.5 h-3.5 text-blue-400 mx-auto mb-0.5" />
                <p className="text-[10px] text-gray-400">Flete 80%</p>
                <p className="text-white font-black text-sm">{fmt(totalFlete)}</p>
              </div>
              <div className="bg-green-900/40 rounded-xl border border-green-700/50 p-2.5 text-center">
                <TrendingUp className="w-3.5 h-3.5 text-green-400 mx-auto mb-0.5" />
                <p className="text-[10px] text-gray-400">Ganancia</p>
                <p className="text-green-300 font-black text-sm">{fmt(totalGanancia)}</p>
              </div>
            </div>

            {[...paquetes].reverse().map((p, revIdx) => {
              const idx = paquetes.length - 1 - revIdx;
              return (
                <div key={p.id} className={`rounded-xl border overflow-hidden ${
                  p.estado === "sin_zona" ? "border-red-600/50 bg-red-900/10" :
                  p.estado === "procesando" ? "border-blue-600/30 bg-blue-900/10" :
                  "border-gray-700 bg-gray-800/50"
                }`}>
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
                          {p.estado === "procesando" ? (
                            <span className="text-blue-300 text-xs flex items-center gap-1">
                              <Loader2 className="w-3 h-3 animate-spin" /> Leyendo...
                            </span>
                          ) : p.localidad ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                              <span className="text-white text-sm font-semibold">{p.localidad}</span>
                              {p.zona && <span className={`text-xs px-2 py-0.5 rounded-full border ${ZONA_COLORS[p.zona]}`}>{ZONA_LABELS[p.zona]}</span>}
                            </>
                          ) : (
                            <span className="text-red-400 text-sm font-bold">Sin zona — tocá para asignar</span>
                          )}
                        </div>
                        {p.localidad && (
                          <p className="text-gray-500 text-[10px] mt-0.5">{fmt(p.precioML)} · Gan: {fmt(p.ganancia)}</p>
                        )}
                      </div>
                      <button onClick={() => { setEditIdx(idx); setBusqueda(""); }}
                        className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
                          p.estado === "sin_zona"
                            ? "bg-red-600 text-white animate-pulse"
                            : "bg-gray-700 text-gray-400 hover:text-yellow-300"
                        }`}>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
