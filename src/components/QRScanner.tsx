"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import jsQR from "jsqr";
import { FlexZona, FLEX_LOCALIDADES } from "@/lib/types";
import { X, Zap, Search, ChevronRight, AlertTriangle } from "lucide-react";

const ZONA_COLORS: Record<FlexZona, string> = {
  cercana: "bg-green-500/20 text-green-300 border-green-500/40",
  media:   "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
  lejana:  "bg-red-500/20 text-red-300 border-red-500/40",
};
const ZONA_LABELS: Record<FlexZona, string> = {
  cercana: "Cercana", media: "Media", lejana: "Lejana",
};

function beep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 1200;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);
  } catch (_) {}
}

function vibrate() {
  try { navigator.vibrate?.(80); } catch (_) {}
}

function extractShipmentId(qrData: string): string {
  // ML QRs: URL con shipment_id, o ID directo
  const match = qrData.match(/shipment[_-]?id[=:]?\s*([A-Za-z0-9_-]+)/i)
    ?? qrData.match(/\/envios\/([A-Za-z0-9_-]+)/i)
    ?? qrData.match(/([A-Za-z0-9]{8,})/);
  return match ? match[1] : qrData.slice(0, 30);
}

function detectLocalidad(qrData: string): string | null {
  const upper = qrData.toUpperCase();
  const sorted = [...FLEX_LOCALIDADES].sort((a, b) => b.nombre.length - a.nombre.length);
  for (const loc of sorted) {
    if (upper.includes(loc.nombre.toUpperCase())) return loc.nombre;
  }
  return null;
}

export interface PaqueteQR {
  tempId: string;
  qrRaw: string;
  shipmentId: string;
  localidad: string | null;
  zona: FlexZona | null;
  precioML: number;
  pagoFlete: number;
  ganancia: number;
}

function calcPaquete(localidad: string, tarifas: Record<FlexZona, number>): {
  zona: FlexZona; precioML: number; pagoFlete: number; ganancia: number;
} {
  const loc = FLEX_LOCALIDADES.find(l => l.nombre === localidad);
  const zona: FlexZona = loc?.zona ?? "lejana";
  const precioML = tarifas[zona];
  return { zona, precioML, pagoFlete: Math.round(precioML * 0.8), ganancia: Math.round(precioML * 0.2) };
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

interface Props {
  tarifas: Record<FlexZona, number>;
  maxPaquetes?: number;
  onFinish: (paquetes: PaqueteQR[]) => void;
  onClose: () => void;
}

export default function QRScanner({ tarifas, maxPaquetes = 50, onFinish, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animRef = useRef<number>(0);
  const scannedIds = useRef<Set<string>>(new Set());

  const [paquetes, setPaquetes] = useState<PaqueteQR[]>([]);
  const [scanning, setScanning] = useState(true);
  const [lastScan, setLastScan] = useState<string>("");
  const [camError, setCamError] = useState<string>("");
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [cooldown, setCooldown] = useState(false);

  const localidadesFiltradas = busqueda.trim()
    ? FLEX_LOCALIDADES.filter(l => l.nombre.toLowerCase().includes(busqueda.toLowerCase()))
    : FLEX_LOCALIDADES;

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        scanLoop();
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setCamError("No se pudo acceder a la cámara: " + msg);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const onQRDetected = useCallback((qrData: string) => {
    if (cooldown) return;
    const shipmentId = extractShipmentId(qrData);
    if (scannedIds.current.has(shipmentId)) {
      // Duplicado — vibración larga
      navigator.vibrate?.([80, 80, 80]);
      setLastScan("DUPLICADO: " + shipmentId);
      return;
    }
    scannedIds.current.add(shipmentId);
    beep();
    vibrate();
    setCooldown(true);
    setTimeout(() => setCooldown(false), 800);

    const localidad = detectLocalidad(qrData);
    const calc = localidad ? calcPaquete(localidad, tarifas) : { zona: null as FlexZona | null, precioML: 0, pagoFlete: 0, ganancia: 0 };

    const nuevo: PaqueteQR = {
      tempId:     generateId(),
      qrRaw:      qrData,
      shipmentId,
      localidad,
      zona:       calc.zona,
      precioML:   calc.precioML,
      pagoFlete:  calc.pagoFlete,
      ganancia:   calc.ganancia,
    };

    setPaquetes(prev => {
      const updated = [...prev, nuevo];
      setLastScan(shipmentId + (localidad ? ` → ${localidad}` : " → Sin zona"));
      if (updated.length >= maxPaquetes) {
        setScanning(false);
        stopCamera();
      }
      return updated;
    });
  }, [cooldown, tarifas, maxPaquetes, stopCamera]);

  const scanLoop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animRef.current = requestAnimationFrame(scanLoop);
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });
    if (code) onQRDetected(code.data);
    animRef.current = requestAnimationFrame(scanLoop);
  }, [onQRDetected]);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const editarLocalidad = (idx: number, localidad: string) => {
    const calc = calcPaquete(localidad, tarifas);
    setPaquetes(prev => prev.map((p, i) => i === idx
      ? { ...p, localidad, zona: calc.zona, precioML: calc.precioML, pagoFlete: calc.pagoFlete, ganancia: calc.ganancia }
      : p
    ));
    setEditIdx(null);
    setBusqueda("");
  };

  const totalGanancia = paquetes.reduce((s, p) => s + p.ganancia, 0);
  const totalML = paquetes.reduce((s, p) => s + p.precioML, 0);
  const sinZona = paquetes.filter(p => !p.localidad).length;
  const fmt = (n: number) => "$" + n.toLocaleString("es-AR");

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-sm flex-shrink-0 z-10">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" />
          <div>
            <p className="text-white font-bold text-sm">Escáner QR Ráfaga</p>
            <p className="text-gray-400 text-xs">{paquetes.length}/{maxPaquetes} escaneados</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(paquetes.length > 0 || !scanning) && (
            <button
              onClick={() => { stopCamera(); onFinish(paquetes); }}
              className="bg-yellow-500 text-black font-bold px-3 py-1.5 rounded-xl text-sm"
            >
              Finalizar →
            </button>
          )}
          <button onClick={() => { stopCamera(); onClose(); }} className="p-2 text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Contador gigante + cámara */}
      <div className="relative flex-shrink-0" style={{ height: "55vw", maxHeight: "320px" }}>
        {camError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-center px-6">
            <AlertTriangle className="w-10 h-10 text-red-400 mb-3" />
            <p className="text-red-300 text-sm font-semibold">{camError}</p>
            <p className="text-gray-500 text-xs mt-2">Usá el modo manual (botón Ráfaga)</p>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Overlay de escaneo */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-48 h-48">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-yellow-400 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-yellow-400 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-yellow-400 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-yellow-400 rounded-br-lg" />
                {scanning && (
                  <div className="absolute inset-x-0 top-0 h-0.5 bg-yellow-400 opacity-80 animate-scan" />
                )}
              </div>
            </div>

            {/* Contador en esquina */}
            <div className={`absolute top-3 right-3 rounded-2xl px-4 py-2 text-center shadow-lg ${
              paquetes.length >= maxPaquetes ? "bg-red-600" : "bg-black/70 backdrop-blur-sm"
            }`}>
              <p className="text-white font-black text-3xl leading-none">{paquetes.length}</p>
              <p className="text-gray-300 text-xs">/{maxPaquetes}</p>
            </div>

            {/* Último scan */}
            {lastScan && (
              <div className="absolute bottom-3 left-3 right-3 bg-black/80 backdrop-blur-sm rounded-xl px-3 py-2">
                <p className="text-yellow-300 text-xs font-mono truncate">{lastScan}</p>
              </div>
            )}

            {!scanning && paquetes.length >= maxPaquetes && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-white font-black text-xl">Límite alcanzado</p>
                  <p className="text-yellow-300 text-sm">Tocá &quot;Finalizar&quot; arriba</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Lista de paquetes escaneados */}
      <div className="flex-1 overflow-y-auto bg-gray-950">

        {/* Barra resumen */}
        {paquetes.length > 0 && (
          <div className="sticky top-0 bg-gray-900 border-b border-gray-700 px-4 py-2 flex items-center justify-between z-10">
            <p className="text-gray-400 text-xs">
              {sinZona > 0 && <span className="text-red-400 font-bold">{sinZona} sin zona · </span>}
              ML: <span className="text-white font-bold">{fmt(totalML)}</span>
            </p>
            <p className="text-green-300 font-black text-sm">Ganancia: {fmt(totalGanancia)}</p>
          </div>
        )}

        {paquetes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-6">
            <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-yellow-500/40 flex items-center justify-center mb-4">
              <Zap className="w-8 h-8 text-yellow-400/50" />
            </div>
            <p className="text-gray-400 text-sm">Apuntá la cámara al código QR del paquete</p>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {[...paquetes].reverse().map((p, revIdx) => {
              const idx = paquetes.length - 1 - revIdx;
              return (
                <div
                  key={p.tempId}
                  className={`rounded-xl border p-3 ${
                    !p.localidad ? "bg-red-900/20 border-red-600/50" : "bg-gray-800/60 border-gray-700"
                  }`}
                >
                  {editIdx === idx ? (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400" />
                        <input
                          autoFocus
                          type="text"
                          placeholder="Buscar localidad..."
                          value={busqueda}
                          onChange={e => setBusqueda(e.target.value)}
                          className="w-full bg-gray-700 text-white rounded-lg pl-8 pr-3 py-2 text-sm border border-yellow-400 outline-none"
                        />
                      </div>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {localidadesFiltradas.map(loc => (
                          <button
                            key={loc.nombre}
                            onClick={() => editarLocalidad(idx, loc.nombre)}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-left"
                          >
                            <span className="text-white text-sm">{loc.nombre}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${ZONA_COLORS[loc.zona]}`}>
                              {ZONA_LABELS[loc.zona]}
                            </span>
                          </button>
                        ))}
                      </div>
                      <button onClick={() => { setEditIdx(null); setBusqueda(""); }} className="text-xs text-gray-500">Cancelar</button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-gray-500 text-xs font-bold">#{idx + 1}</span>
                          {p.localidad ? (
                            <>
                              <span className="text-white text-sm font-semibold">{p.localidad}</span>
                              {p.zona && (
                                <span className={`text-xs px-2 py-0.5 rounded-full border ${ZONA_COLORS[p.zona]}`}>
                                  {ZONA_LABELS[p.zona]}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-red-400 text-sm font-bold">Sin zona — tocar para asignar</span>
                          )}
                        </div>
                        <p className="text-gray-600 text-[10px] font-mono truncate mt-0.5">{p.shipmentId}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {p.localidad && (
                          <div className="text-right">
                            <p className="text-white text-xs font-bold">{fmt(p.precioML)}</p>
                            <p className="text-green-300 text-[10px]">{fmt(p.ganancia)}</p>
                          </div>
                        )}
                        <button
                          onClick={() => { setEditIdx(idx); setBusqueda(""); }}
                          className={`p-1.5 rounded-lg text-sm font-bold transition-colors ${
                            !p.localidad
                              ? "bg-red-600 text-white animate-pulse"
                              : "bg-gray-700 text-gray-400 hover:text-yellow-300"
                          }`}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        @keyframes scan {
          0% { transform: translateY(0); }
          50% { transform: translateY(184px); }
          100% { transform: translateY(0); }
        }
        .animate-scan { animation: scan 1.5s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
