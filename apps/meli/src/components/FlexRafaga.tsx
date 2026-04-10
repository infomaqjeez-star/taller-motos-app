"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { flexDb } from "@/lib/db";
import {
  FlexEnvio, FlexZona,
  FLEX_LOCALIDADES, FLEX_TARIFAS,
} from "@/lib/types";
import {
  Zap, X, Check, AlertTriangle, Trash2,
  ChevronRight, Package, DollarSign, TrendingUp, Search,
  CheckCircle2, Save,
} from "lucide-react";

const MAX_PAQUETES = 50;

const ZONA_COLORS: Record<FlexZona, string> = {
  cercana: "bg-green-500/20 text-green-300 border-green-500/40",
  media:   "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
  lejana:  "bg-red-500/20 text-red-300 border-red-500/40",
};
const ZONA_LABELS: Record<FlexZona, string> = {
  cercana: "Cercana", media: "Media", lejana: "Lejana",
};

function fmt(n: number) {
  return "$" + n.toLocaleString("es-AR");
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

interface PaqueteRafaga {
  tempId: string;
  localidad: string | null;
  zona: FlexZona | null;
  precioML: number;
  pagoFlete: number;
  ganancia: number;
  nroSeguimiento: string;
}

function calcular(localidad: string, tarifas: Record<FlexZona, number>): {
  zona: FlexZona; precioML: number; pagoFlete: number; ganancia: number;
} {
  const loc = FLEX_LOCALIDADES.find(l => l.nombre === localidad);
  const zona: FlexZona = loc?.zona ?? "lejana";
  const precioML = tarifas[zona];
  const pagoFlete = Math.round(precioML * 0.8);
  return { zona, precioML, pagoFlete, ganancia: precioML - pagoFlete };
}

interface Props {
  tarifas: Record<FlexZona, number>;
  onClose: () => void;
  onSaved: () => void;
}

type Paso = "escaneo" | "revision" | "guardando" | "listo";

export default function FlexRafaga({ tarifas, onClose, onSaved }: Props) {
  const [paso, setPaso] = useState<Paso>("escaneo");
  const [paquetes, setPaquetes] = useState<PaqueteRafaga[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [nroActual, setNroActual] = useState("");
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [guardados, setGuardados] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const localidadesFiltradas = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    if (!q) return FLEX_LOCALIDADES;
    return FLEX_LOCALIDADES.filter(l => l.nombre.toLowerCase().includes(q));
  }, [busqueda]);

  const agregarPaquete = useCallback((localidad: string) => {
    if (paquetes.length >= MAX_PAQUETES) return;
    const calc = calcular(localidad, tarifas);
    setPaquetes(prev => [...prev, {
      tempId: generateId(),
      localidad,
      zona: calc.zona,
      precioML: calc.precioML,
      pagoFlete: calc.pagoFlete,
      ganancia: calc.ganancia,
      nroSeguimiento: nroActual.trim(),
    }]);
    setNroActual("");
    setBusqueda("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [paquetes.length, tarifas, nroActual]);

  const quitarPaquete = (tempId: string) => {
    setPaquetes(prev => prev.filter(p => p.tempId !== tempId));
  };

  const editarLocalidad = (idx: number, localidad: string) => {
    const calc = calcular(localidad, tarifas);
    setPaquetes(prev => prev.map((p, i) => i === idx
      ? { ...p, localidad, zona: calc.zona, precioML: calc.precioML, pagoFlete: calc.pagoFlete, ganancia: calc.ganancia }
      : p
    ));
    setEditIdx(null);
    setBusqueda("");
  };

  const totales = useMemo(() => ({
    totalML:       paquetes.reduce((s, p) => s + p.precioML, 0),
    totalFlete:    paquetes.reduce((s, p) => s + p.pagoFlete, 0),
    totalGanancia: paquetes.reduce((s, p) => s + p.ganancia, 0),
  }), [paquetes]);

  const guardarTodos = async () => {
    setGuardando(true);
    setPaso("guardando");
    const hoy = new Date().toISOString().slice(0, 10);
    let ok = 0;
    const batch: FlexEnvio[] = paquetes.map(p => ({
      id:                 generateId(),
      fecha:              hoy,
      localidad:          p.localidad ?? "Sin definir",
      zona:               p.zona ?? "lejana",
      precioML:           p.precioML,
      pagoFlete:          p.pagoFlete,
      ganancia:           p.ganancia,
      descripcion:        "",
      nroSeguimiento:     p.nroSeguimiento,
      usuarioML:          "",
      nombreDestinatario: "",
      direccion:          "",
      codigoPostal:       "",
      productoSku:        "",
      packId:             "",
      createdAt:          new Date().toISOString(),
    }));

    // Guardar en lotes de 10
    for (let i = 0; i < batch.length; i++) {
      try {
        await flexDb.create(batch[i]);
        ok++;
        setGuardados(ok);
      } catch (_) { /* continuar aunque falle uno */ }
    }

    setGuardando(false);
    setPaso("listo");
    onSaved();
  };

  const invalidos = paquetes.filter(p => !p.localidad).length;

  return (
    <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-700 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="bg-yellow-500 rounded-xl p-1.5">
            <Zap className="w-4 h-4 text-black" />
          </div>
          <div>
            <h2 className="text-white font-bold text-sm">Modo RÃ¡faga</h2>
            <p className="text-gray-400 text-xs">
              {paso === "escaneo" ? `${paquetes.length}/${MAX_PAQUETES} paquetes` :
               paso === "revision" ? "RevisiÃ³n final" :
               paso === "guardando" ? `Guardando ${guardados}/${paquetes.length}...` :
               "Â¡Completado!"}
            </p>
          </div>
        </div>
        {paso === "escaneo" && (
          <div className="flex items-center gap-2">
            {paquetes.length > 0 && (
              <button
                onClick={() => { setPaso("revision"); setBusqueda(""); }}
                className="flex items-center gap-1.5 bg-yellow-500 text-black font-bold px-3 py-2 rounded-xl text-sm"
              >
                <Check className="w-4 h-4" /> Finalizar
              </button>
            )}
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        {paso === "revision" && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setPaso("escaneo"); setBusqueda(""); }}
              className="px-3 py-2 bg-gray-700 text-white rounded-xl text-sm font-semibold"
            >
              â† Volver
            </button>
            <button
              onClick={guardarTodos}
              disabled={paquetes.length === 0}
              className="flex items-center gap-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold px-3 py-2 rounded-xl text-sm"
            >
              <Save className="w-4 h-4" /> Guardar {paquetes.length}
            </button>
          </div>
        )}
        {(paso === "guardando" || paso === "listo") && paso === "listo" && (
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* â”€â”€ PASO: ESCANEO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {paso === "escaneo" && (
        <div className="flex flex-col flex-1 overflow-hidden">

          {/* Barra lÃ­mite */}
          <div className="px-4 pt-3 flex-shrink-0">
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  paquetes.length >= MAX_PAQUETES ? "bg-red-500" :
                  paquetes.length >= 40 ? "bg-yellow-500" : "bg-green-500"
                }`}
                style={{ width: `${(paquetes.length / MAX_PAQUETES) * 100}%` }}
              />
            </div>
            {paquetes.length >= MAX_PAQUETES && (
              <p className="text-red-400 text-xs font-bold mt-1 text-center">
                LÃ­mite de 50 paquetes alcanzado â€” tocÃ¡ Finalizar
              </p>
            )}
          </div>

          {/* Nro seguimiento */}
          <div className="px-4 pt-3 flex-shrink-0">
            <input
              type="text"
              placeholder="Nro. seguimiento (opcional)"
              value={nroActual}
              onChange={e => setNroActual(e.target.value)}
              className="w-full bg-gray-800 text-white rounded-xl px-4 py-2.5 text-sm border border-gray-600 focus:border-yellow-400 outline-none"
            />
          </div>

          {/* Buscador de localidad */}
          <div className="px-4 pt-2 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                ref={inputRef}
                autoFocus
                type="text"
                placeholder="Buscar localidad..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                disabled={paquetes.length >= MAX_PAQUETES}
                className="w-full bg-gray-800 text-white rounded-xl pl-9 pr-4 py-3 text-sm border border-yellow-400/50 focus:border-yellow-400 outline-none disabled:opacity-50"
              />
            </div>
          </div>

          {/* Lista de localidades */}
          <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
            {localidadesFiltradas.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">Sin resultados</p>
            ) : localidadesFiltradas.map(loc => (
              <button
                key={loc.nombre}
                onClick={() => agregarPaquete(loc.nombre)}
                disabled={paquetes.length >= MAX_PAQUETES}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-gray-800/60 hover:bg-gray-700 active:bg-gray-600 border border-gray-700 hover:border-gray-500 transition-colors disabled:opacity-40"
              >
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-bold ${ZONA_COLORS[loc.zona]}`}>
                    {ZONA_LABELS[loc.zona]}
                  </span>
                  <span className="text-white font-semibold text-sm">{loc.nombre}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-yellow-300 font-bold text-sm">${tarifas[loc.zona].toLocaleString("es-AR")}</span>
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                </div>
              </button>
            ))}
          </div>

          {/* Paquetes en cola (mini lista al fondo) */}
          {paquetes.length > 0 && (
            <div className="border-t border-gray-700 bg-gray-900/95 px-4 py-3 flex-shrink-0 max-h-40 overflow-y-auto">
              <p className="text-gray-400 text-xs font-semibold mb-2">Cola ({paquetes.length})</p>
              <div className="space-y-1">
                {[...paquetes].reverse().map((p, i) => (
                  <div key={p.tempId} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">#{paquetes.length - i}</span>
                      <span className="text-white">{p.localidad}</span>
                      {p.nroSeguimiento && (
                        <span className="text-gray-500">{p.nroSeguimiento}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-300 font-bold">{fmt(p.ganancia)}</span>
                      <button onClick={() => quitarPaquete(p.tempId)} className="text-gray-600 hover:text-red-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* â”€â”€ PASO: REVISIÃ“N â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {paso === "revision" && (
        <div className="flex flex-col flex-1 overflow-hidden">

          {/* Resumen totales */}
          <div className="px-4 py-3 grid grid-cols-3 gap-2 flex-shrink-0">
            <div className="bg-gray-800 rounded-xl p-3 text-center">
              <DollarSign className="w-4 h-4 text-yellow-400 mx-auto mb-0.5" />
              <p className="text-[10px] text-gray-400">Cobro ML</p>
              <p className="text-white font-black text-sm">{fmt(totales.totalML)}</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-3 text-center">
              <Package className="w-4 h-4 text-blue-400 mx-auto mb-0.5" />
              <p className="text-[10px] text-gray-400">Pago Flete</p>
              <p className="text-white font-black text-sm">{fmt(totales.totalFlete)}</p>
            </div>
            <div className="bg-green-900/40 rounded-xl border border-green-700/50 p-3 text-center">
              <TrendingUp className="w-4 h-4 text-green-400 mx-auto mb-0.5" />
              <p className="text-[10px] text-gray-400">Ganancia</p>
              <p className="text-green-300 font-black text-sm">{fmt(totales.totalGanancia)}</p>
            </div>
          </div>

          {invalidos > 0 && (
            <div className="mx-4 mb-2 bg-red-900/30 border border-red-600/50 rounded-xl px-3 py-2 flex items-center gap-2 flex-shrink-0">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-red-300 text-xs font-semibold">
                {invalidos} paquete{invalidos > 1 ? "s" : ""} sin localidad â€” editÃ¡ antes de guardar
              </p>
            </div>
          )}

          {/* Lista revisiÃ³n */}
          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
            {paquetes.map((p, idx) => (
              <div
                key={p.tempId}
                className={`rounded-xl border p-3 ${
                  !p.localidad
                    ? "bg-red-900/20 border-red-600/60"
                    : "bg-gray-800/60 border-gray-700"
                }`}
              >
                {editIdx === idx ? (
                  <div className="space-y-2">
                    <p className="text-xs text-yellow-300 font-semibold">Elegir localidad para #{idx + 1}</p>
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400" />
                      <input
                        autoFocus
                        type="text"
                        placeholder="Buscar..."
                        value={busqueda}
                        onChange={e => setBusqueda(e.target.value)}
                        className="w-full bg-gray-700 text-white rounded-lg pl-8 pr-3 py-2 text-sm border border-yellow-400 outline-none"
                      />
                    </div>
                    <div className="max-h-36 overflow-y-auto space-y-1">
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
                    <button
                      onClick={() => { setEditIdx(null); setBusqueda(""); }}
                      className="text-xs text-gray-400 hover:text-white"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-gray-400 text-xs font-bold">#{idx + 1}</span>
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
                          <span className="text-red-400 text-sm font-bold">Sin localidad</span>
                        )}
                      </div>
                      {p.nroSeguimiento && (
                        <p className="text-gray-500 text-xs mt-0.5">{p.nroSeguimiento}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-white text-xs font-bold">{fmt(p.precioML)}</p>
                        <p className="text-green-300 text-xs">{fmt(p.ganancia)}</p>
                      </div>
                      <button
                        onClick={() => { setEditIdx(idx); setBusqueda(""); }}
                        className="p-1.5 rounded-lg bg-gray-700 hover:bg-yellow-500/20 text-gray-400 hover:text-yellow-300"
                        title="Editar localidad"
                      >
                        <Search className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => quitarPaquete(p.tempId)}
                        className="p-1.5 rounded-lg bg-gray-700 hover:bg-red-900/40 text-gray-400 hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* â”€â”€ PASO: GUARDANDO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {paso === "guardando" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8">
          <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
          <div className="text-center">
            <p className="text-white font-bold text-lg">Guardando en Supabase...</p>
            <p className="text-yellow-300 font-black text-3xl mt-2">{guardados} / {paquetes.length}</p>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-yellow-500 rounded-full transition-all duration-300"
              style={{ width: `${(guardados / paquetes.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* â”€â”€ PASO: LISTO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {paso === "listo" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8 text-center">
          <div className="bg-green-500/20 rounded-full p-6">
            <CheckCircle2 className="w-16 h-16 text-green-400" />
          </div>
          <div>
            <p className="text-white font-black text-2xl">Â¡RÃ¡faga completada!</p>
            <p className="text-gray-400 mt-1">{guardados} paquetes guardados</p>
          </div>
          <div className="bg-gray-800 rounded-2xl border border-gray-700 p-5 w-full space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Cobrado a ML</span>
              <span className="text-white font-bold">{fmt(totales.totalML)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Pago al Flete (80%)</span>
              <span className="text-blue-300 font-bold">{fmt(totales.totalFlete)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-700 pt-2 mt-2">
              <span className="text-gray-300 font-semibold">Tu Ganancia (20%)</span>
              <span className="text-green-300 font-black text-lg">{fmt(totales.totalGanancia)}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black py-4 rounded-2xl text-lg"
          >
            Listo
          </button>
        </div>
      )}
    </div>
  );
}
