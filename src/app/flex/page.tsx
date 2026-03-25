"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import FlexRafaga from "@/components/FlexRafaga";
import OCRScanner, { PaqueteOCR } from "@/components/OCRScanner";
import { flexDb } from "@/lib/db";
import {
  FlexEnvio, FlexZona,
  FLEX_LOCALIDADES, FLEX_TARIFAS,
} from "@/lib/types";
import {
  Truck, Plus, Trash2, TrendingUp, DollarSign,
  MapPin, Package, ChevronDown, X, BarChart2, Settings, Zap, Camera,
} from "lucide-react";

const fmt = (n: number) =>
  "$" + n.toLocaleString("es-AR", { minimumFractionDigits: 0 });

const ZONA_COLORS: Record<FlexZona, string> = {
  cercana: "bg-green-500/20 text-green-300 border-green-500/40",
  media:   "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
  lejana:  "bg-red-500/20 text-red-300 border-red-500/40",
};
const ZONA_LABELS: Record<FlexZona, string> = {
  cercana: "Cercana",
  media:   "Media",
  lejana:  "Lejana",
};

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ─── Tarifas editables (con override local) ─────────────────
function useTarifas() {
  const [tarifas, setTarifas] = useState(
    FLEX_TARIFAS.reduce((acc, t) => ({ ...acc, [t.zona]: t.precio }), {} as Record<FlexZona, number>)
  );
  const update = (zona: FlexZona, precio: number) =>
    setTarifas(prev => ({ ...prev, [zona]: precio }));
  return { tarifas, update };
}

// ─── Formulario ──────────────────────────────────────────────
interface FormState {
  localidad: string;
  descripcion: string;
  nroSeguimiento: string;
  fecha: string;
}

function defaultForm(): FormState {
  return {
    localidad: "",
    descripcion: "",
    nroSeguimiento: "",
    fecha: new Date().toISOString().slice(0, 10),
  };
}

export default function FlexPage() {
  const [envios, setEnvios] = useState<FlexEnvio[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showRafaga, setShowRafaga] = useState(false);
  const [showOCR, setShowOCR] = useState(false);
  const [form, setForm] = useState<FormState>(defaultForm());
  const [saving, setSaving] = useState(false);
  const { tarifas, update: updateTarifa } = useTarifas();
  const [settingEdit, setSettingEdit] = useState<Record<FlexZona, string>>({
    cercana: "4490", media: "6490", lejana: "8490",
  });
  const [filterZona, setFilterZona] = useState<FlexZona | "todas">("todas");

  const load = async () => {
    setLoading(true);
    try { setEnvios(await flexDb.getAll()); } catch (_) { setEnvios([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Calcular valores automáticos según localidad seleccionada
  const localidadData = useMemo(() => {
    if (!form.localidad) return null;
    const loc = FLEX_LOCALIDADES.find(l => l.nombre === form.localidad);
    if (!loc) return null;
    const precioML = tarifas[loc.zona];
    const pagoFlete = Math.round(precioML * 0.8);
    const ganancia  = precioML - pagoFlete;
    return { zona: loc.zona, precioML, pagoFlete, ganancia };
  }, [form.localidad, tarifas]);

  const handleSave = async () => {
    if (!form.localidad || !localidadData) return;
    setSaving(true);
    try {
      await flexDb.create({
        id:             generateId(),
        fecha:          form.fecha,
        localidad:      form.localidad,
        zona:           localidadData.zona,
        precioML:       localidadData.precioML,
        pagoFlete:      localidadData.pagoFlete,
        ganancia:       localidadData.ganancia,
        descripcion:    form.descripcion,
        nroSeguimiento: form.nroSeguimiento,
        createdAt:      new Date().toISOString(),
      });
      await load();
      setForm(defaultForm());
      setShowForm(false);
    } catch (e) {
      alert("Error al guardar: " + e);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este envío?")) return;
    await flexDb.delete(id);
    await load();
  };

  const handleOCRFinish = async (paquetes: PaqueteOCR[]) => {
    setShowOCR(false);
    const hoy = new Date().toISOString().slice(0, 10);
    const validos = paquetes.filter(p => p.localidad && p.estado === "ok");
    for (const p of validos) {
      try {
        await flexDb.create({
          id:             generateId(),
          fecha:          hoy,
          localidad:      p.localidad!,
          zona:           p.zona ?? "lejana",
          precioML:       p.precioML,
          pagoFlete:      p.pagoFlete,
          ganancia:       p.ganancia,
          descripcion:    "",
          nroSeguimiento: "",
          createdAt:      new Date().toISOString(),
        });
      } catch (_) {}
    }
    await load();
    if (validos.length > 0) alert(`✓ ${validos.length} envíos guardados correctamente.`);
  };

  // Estadísticas por zona
  const stats = useMemo(() => {
    const filtered = filterZona === "todas" ? envios : envios.filter(e => e.zona === filterZona);
    const totalML       = filtered.reduce((s, e) => s + e.precioML, 0);
    const totalFlete    = filtered.reduce((s, e) => s + e.pagoFlete, 0);
    const totalGanancia = filtered.reduce((s, e) => s + e.ganancia, 0);
    const porZona = (["cercana", "media", "lejana"] as FlexZona[]).map(z => ({
      zona: z,
      count:    envios.filter(e => e.zona === z).length,
      ganancia: envios.filter(e => e.zona === z).reduce((s, e) => s + e.ganancia, 0),
    }));
    // Top localidades
    const byLoc: Record<string, { count: number; ganancia: number }> = {};
    envios.forEach(e => {
      if (!byLoc[e.localidad]) byLoc[e.localidad] = { count: 0, ganancia: 0 };
      byLoc[e.localidad].count++;
      byLoc[e.localidad].ganancia += e.ganancia;
    });
    const topLocalidades = Object.entries(byLoc)
      .sort((a, b) => b[1].ganancia - a[1].ganancia)
      .slice(0, 5);
    return { totalML, totalFlete, totalGanancia, porZona, topLocalidades, filtered };
  }, [envios, filterZona]);

  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-6 pb-24 sm:pb-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-500 rounded-xl p-2.5">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Logística Flex</h1>
              <p className="text-gray-400 text-sm">Mercado Libre — Control de envíos y ganancias</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2.5 rounded-xl bg-gray-800 text-gray-400 hover:text-white border border-gray-700 transition-colors"
              title="Configurar tarifas"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowOCR(true)}
              className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold px-3 py-2.5 rounded-xl transition-colors"
            >
              <Camera className="w-4 h-4" /> Escanear
            </button>
            <button
              onClick={() => setShowRafaga(true)}
              className="flex items-center gap-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 font-bold px-3 py-2.5 rounded-xl border border-yellow-500/40 transition-colors"
            >
              <Zap className="w-4 h-4" /> Ráfaga
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-4 py-2.5 rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" /> Nuevo Envío
            </button>
          </div>
        </div>

        {/* Panel de tarifas editables */}
        {showSettings && (
          <div className="bg-gray-800/80 rounded-2xl border border-gray-700 p-5 space-y-4">
            <h2 className="text-white font-bold flex items-center gap-2">
              <Settings className="w-4 h-4 text-yellow-400" /> Configurar Tarifas de Zonas
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(["cercana", "media", "lejana"] as FlexZona[]).map(zona => (
                <div key={zona} className="space-y-1">
                  <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                    Zona {ZONA_LABELS[zona]}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={settingEdit[zona]}
                      onChange={e => setSettingEdit(prev => ({ ...prev, [zona]: e.target.value }))}
                      className="flex-1 bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 focus:border-yellow-400 outline-none"
                    />
                    <button
                      onClick={() => {
                        const val = parseInt(settingEdit[zona]);
                        if (val > 0) updateTarifa(zona, val);
                      }}
                      className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-3 rounded-lg text-sm transition-colors"
                    >
                      OK
                    </button>
                  </div>
                  <p className="text-yellow-300 text-xs font-semibold">{fmt(tarifas[zona])}</p>
                </div>
              ))}
            </div>
            <p className="text-gray-500 text-xs">Los cambios aplican solo en esta sesión. Para guardar permanente, ejecutá el SQL de actualización en Supabase.</p>
          </div>
        )}

        {/* Cards resumen */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-800/60 rounded-2xl border border-gray-700 p-4 text-center">
            <DollarSign className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
            <p className="text-xs text-gray-400">Cobrado a ML</p>
            <p className="text-white font-black text-lg">{fmt(stats.totalML)}</p>
          </div>
          <div className="bg-gray-800/60 rounded-2xl border border-gray-700 p-4 text-center">
            <Truck className="w-5 h-5 text-blue-400 mx-auto mb-1" />
            <p className="text-xs text-gray-400">Pago Flete (80%)</p>
            <p className="text-white font-black text-lg">{fmt(stats.totalFlete)}</p>
          </div>
          <div className="bg-green-900/40 rounded-2xl border border-green-700/50 p-4 text-center">
            <TrendingUp className="w-5 h-5 text-green-400 mx-auto mb-1" />
            <p className="text-xs text-gray-400">Ganancia (20%)</p>
            <p className="text-green-300 font-black text-lg">{fmt(stats.totalGanancia)}</p>
          </div>
        </div>

        {/* Gráfico por zonas */}
        <div className="bg-gray-800/60 rounded-2xl border border-gray-700 p-5 space-y-3">
          <h2 className="text-white font-bold flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-yellow-400" /> Envíos por Zona
          </h2>
          <div className="space-y-3">
            {stats.porZona.map(({ zona, count, ganancia }) => {
              const maxCount = Math.max(...stats.porZona.map(z => z.count), 1);
              const pct = Math.round((count / maxCount) * 100);
              return (
                <div key={zona} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${ZONA_COLORS[zona]}`}>
                      {ZONA_LABELS[zona]} — {fmt(tarifas[zona])}
                    </span>
                    <span className="text-gray-400">{count} envíos · <span className="text-green-300 font-semibold">{fmt(ganancia)}</span></span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        zona === "cercana" ? "bg-green-500" : zona === "media" ? "bg-yellow-500" : "bg-red-500"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top localidades */}
        {stats.topLocalidades.length > 0 && (
          <div className="bg-gray-800/60 rounded-2xl border border-gray-700 p-5 space-y-3">
            <h2 className="text-white font-bold flex items-center gap-2">
              <MapPin className="w-4 h-4 text-yellow-400" /> Top Localidades más Rentables
            </h2>
            <div className="space-y-2">
              {stats.topLocalidades.map(([loc, data], i) => {
                const zona = FLEX_LOCALIDADES.find(l => l.nombre === loc)?.zona ?? "lejana";
                return (
                  <div key={loc} className="flex items-center gap-3 py-2 border-b border-gray-700/50 last:border-0">
                    <span className="text-gray-500 text-sm font-bold w-5">#{i + 1}</span>
                    <div className="flex-1">
                      <p className="text-white text-sm font-semibold">{loc}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${ZONA_COLORS[zona]}`}>
                        {ZONA_LABELS[zona]}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-green-300 font-bold text-sm">{fmt(data.ganancia)}</p>
                      <p className="text-gray-400 text-xs">{data.count} envíos</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Filtro por zona + lista */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-gray-400 text-sm">Filtrar:</span>
            {(["todas", "cercana", "media", "lejana"] as const).map(z => (
              <button
                key={z}
                onClick={() => setFilterZona(z)}
                className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                  filterZona === z
                    ? "bg-yellow-500 text-black border-yellow-500"
                    : "bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500"
                }`}
              >
                {z === "todas" ? "Todas" : ZONA_LABELS[z]}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : stats.filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-semibold">Sin envíos registrados</p>
              <p className="text-sm">Tocá &quot;Nuevo Envío&quot; para empezar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.filtered.map(envio => (
                <div key={envio.id} className="bg-gray-800/60 rounded-2xl border border-gray-700 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-bold ${ZONA_COLORS[envio.zona]}`}>
                          {ZONA_LABELS[envio.zona]}
                        </span>
                        <span className="text-white font-semibold">{envio.localidad}</span>
                        <span className="text-gray-500 text-xs">{new Date(envio.fecha).toLocaleDateString("es-AR")}</span>
                      </div>
                      {envio.descripcion && (
                        <p className="text-gray-400 text-sm">{envio.descripcion}</p>
                      )}
                      {envio.nroSeguimiento && (
                        <p className="text-gray-500 text-xs mt-0.5">Nro: {envio.nroSeguimiento}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-white text-sm">ML: <span className="font-bold">{fmt(envio.precioML)}</span></p>
                      <p className="text-blue-300 text-xs">Flete: {fmt(envio.pagoFlete)}</p>
                      <p className="text-green-300 text-xs font-bold">Gan: {fmt(envio.ganancia)}</p>
                    </div>
                    <button
                      onClick={() => handleDelete(envio.id)}
                      className="p-2 rounded-xl text-gray-600 hover:text-red-400 hover:bg-red-900/20 transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modal Nuevo Envío */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-bold text-lg flex items-center gap-2">
                <Truck className="w-5 h-5 text-yellow-400" /> Nuevo Envío Flex
              </h2>
              <button onClick={() => setShowForm(false)} className="p-2 text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selector localidad */}
            <div className="space-y-1.5">
              <label className="text-sm text-gray-300 font-semibold">Localidad *</label>
              <div className="relative">
                <select
                  value={form.localidad}
                  onChange={e => setForm(f => ({ ...f, localidad: e.target.value }))}
                  className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 border border-gray-600 focus:border-yellow-400 outline-none appearance-none pr-10"
                >
                  <option value="">-- Seleccionar localidad --</option>
                  <optgroup label="Cercana ($4.490)">
                    {FLEX_LOCALIDADES.filter(l => l.zona === "cercana").map(l => (
                      <option key={l.nombre} value={l.nombre}>{l.nombre}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Media ($6.490)">
                    {FLEX_LOCALIDADES.filter(l => l.zona === "media").map(l => (
                      <option key={l.nombre} value={l.nombre}>{l.nombre}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Lejana ($8.490)">
                    {FLEX_LOCALIDADES.filter(l => l.zona === "lejana").map(l => (
                      <option key={l.nombre} value={l.nombre}>{l.nombre}</option>
                    ))}
                  </optgroup>
                </select>
                <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Resumen automático */}
            {localidadData && (
              <div className="bg-gray-800/80 rounded-xl border border-yellow-500/30 p-4 space-y-2">
                <p className="text-yellow-300 text-xs font-bold uppercase tracking-wider">Resumen automático</p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-xs text-gray-400">Cobro a ML</p>
                    <p className="text-white font-black">{fmt(localidadData.precioML)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Pago Flete</p>
                    <p className="text-blue-300 font-black">{fmt(localidadData.pagoFlete)}</p>
                    <p className="text-gray-500 text-[10px]">80%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Ganancia</p>
                    <p className="text-green-300 font-black">{fmt(localidadData.ganancia)}</p>
                    <p className="text-gray-500 text-[10px]">20%</p>
                  </div>
                </div>
                <div className={`text-center mt-1`}>
                  <span className={`text-xs px-3 py-1 rounded-full border font-bold ${ZONA_COLORS[localidadData.zona]}`}>
                    {ZONA_LABELS[localidadData.zona]} — {form.localidad}
                  </span>
                </div>
              </div>
            )}

            {/* Fecha */}
            <div className="space-y-1.5">
              <label className="text-sm text-gray-300 font-semibold">Fecha</label>
              <input
                type="date"
                value={form.fecha}
                onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 border border-gray-600 focus:border-yellow-400 outline-none"
              />
            </div>

            {/* Nro seguimiento */}
            <div className="space-y-1.5">
              <label className="text-sm text-gray-300 font-semibold">Nro. de Seguimiento</label>
              <input
                type="text"
                placeholder="Ej: ML-123456789"
                value={form.nroSeguimiento}
                onChange={e => setForm(f => ({ ...f, nroSeguimiento: e.target.value }))}
                className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 border border-gray-600 focus:border-yellow-400 outline-none"
              />
            </div>

            {/* Descripción */}
            <div className="space-y-1.5">
              <label className="text-sm text-gray-300 font-semibold">Descripción del paquete</label>
              <textarea
                rows={2}
                placeholder="Ej: Carburador Honda CG 150"
                value={form.descripcion}
                onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 border border-gray-600 focus:border-yellow-400 outline-none resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={!form.localidad || saving}
                className="flex-1 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-bold py-3 rounded-xl transition-colors"
              >
                {saving ? "Guardando..." : "Guardar Envío"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRafaga && (
        <FlexRafaga
          tarifas={tarifas}
          onClose={() => setShowRafaga(false)}
          onSaved={() => { load(); }}
        />
      )}

      {showOCR && (
        <OCRScanner
          tarifas={tarifas}
          onFinish={handleOCRFinish}
          onClose={() => setShowOCR(false)}
        />
      )}

      <BottomNav />
    </>
  );
}
