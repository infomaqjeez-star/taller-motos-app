"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus, CheckCircle, Clock, User, AlertCircle, Calendar,
  Play, Trash2, Eye, EyeOff, ArrowRight,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import { tareasDb } from "@/lib/db";
import { generateId } from "@/lib/utils";
import { Tarea, TareaStatus } from "@/lib/types";

// ─── Helpers ─────────────────────────────────────────────────

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_COLORS: Record<TareaStatus, { bg: string; text: string; border: string }> = {
  pendiente: { bg: "bg-yellow-900/30", text: "text-yellow-400", border: "border-yellow-600" },
  en_progreso: { bg: "bg-blue-900/30", text: "text-blue-400", border: "border-blue-600" },
  completada: { bg: "bg-green-900/30", text: "text-green-400", border: "border-green-600" },
};

const PRIORIDAD_COLORS: Record<Tarea["prioridad"], { bg: string; text: string }> = {
  baja: { bg: "bg-gray-700/50", text: "text-gray-300" },
  media: { bg: "bg-orange-700/50", text: "text-orange-300" },
  alta: { bg: "bg-red-700/50", text: "text-red-300" },
};

// ─── Componente: Tarjeta de Tarea ───────────────────────────────

function TareaCard({
  tarea,
  onIniciar,
  onCompletar,
  onDelete,
}: {
  tarea: Tarea;
  onIniciar: (id: string) => void;
  onCompletar: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const statusColor = STATUS_COLORS[tarea.status];
  const prioridadColor = PRIORIDAD_COLORS[tarea.prioridad];

  // Calcular tiempos
  const tiempoCreacionInicio = tarea.iniciadaEn
    ? new Date(tarea.iniciadaEn).getTime() - new Date(tarea.creadaEn).getTime()
    : null;

  const tiempoInicioFin = tarea.completadaEn && tarea.iniciadaEn
    ? new Date(tarea.completadaEn).getTime() - new Date(tarea.iniciadaEn).getTime()
    : null;

  const tiempoTotal = tarea.completadaEn
    ? new Date(tarea.completadaEn).getTime() - new Date(tarea.creadaEn).getTime()
    : null;

  return (
    <div className={`card border ${statusColor.border} ${!tarea.vista ? "ring-2 ring-blue-500" : ""}`}>
      <div className="flex items-start gap-3 cursor-pointer" onClick={() => setOpen(o => !o)}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-bold text-white truncate">{tarea.titulo}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${prioridadColor.bg} ${prioridadColor.text}`}>
              {tarea.prioridad.toUpperCase()}
            </span>
            {!tarea.vista && (
              <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-blue-600 text-white">
                NUEVA
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-400">
            <User className="w-3.5 h-3.5" />
            <span>{tarea.asignadoA}</span>
          </div>
          <div className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-bold border ${statusColor.bg} ${statusColor.text} ${statusColor.border}`}>
            {tarea.status === "pendiente" && "Pendiente"}
            {tarea.status === "en_progreso" && "En Progreso"}
            {tarea.status === "completada" && "Completada"}
          </div>
        </div>
        <ArrowRight className={`w-5 h-5 text-gray-500 transition-transform ${open ? "rotate-90" : ""}`} />
      </div>

      {open && (
        <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
          <p className="text-sm text-gray-300">{tarea.descripcion}</p>

          <div className="space-y-2 text-xs text-gray-400">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" />
              <span>Creada: {formatDate(tarea.creadaEn)}</span>
            </div>
            {tarea.iniciadaEn && (
              <div className="flex items-center gap-2">
                <Play className="w-3.5 h-3.5 text-blue-400" />
                <span>Iniciada: {formatDate(tarea.iniciadaEn)}</span>
              </div>
            )}
            {tarea.completadaEn && (
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                <span>Completada: {formatDate(tarea.completadaEn)}</span>
              </div>
            )}
          </div>

          {/* Tiempos */}
          <div className="bg-black/30 rounded-lg p-3 space-y-2">
            {tiempoCreacionInicio && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Creación → Inicio:</span>
                <span className="text-blue-400 font-mono font-bold">{formatDuration(tiempoCreacionInicio)}</span>
              </div>
            )}
            {tiempoInicioFin && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Inicio → Fin:</span>
                <span className="text-green-400 font-mono font-bold">{formatDuration(tiempoInicioFin)}</span>
              </div>
            )}
            {tiempoTotal && (
              <div className="flex justify-between text-xs border-t border-white/10 pt-2">
                <span className="text-gray-400 font-semibold">Tiempo Total:</span>
                <span className="text-white font-mono font-bold">{formatDuration(tiempoTotal)}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pt-2">
            {tarea.status === "pendiente" && (
              <button
                onClick={() => onIniciar(tarea.id)}
                className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
              >
                <Play className="w-4 h-4" /> Iniciar
              </button>
            )}
            {tarea.status === "en_progreso" && (
              <button
                onClick={() => onCompletar(tarea.id)}
                className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors"
              >
                <CheckCircle className="w-4 h-4" /> Completar
              </button>
            )}
            <button
              onClick={() => {
                if (confirm("¿Eliminar esta tarea?")) {
                  onDelete(tarea.id);
                }
              }}
              className="py-2 px-3 rounded-lg bg-red-600/20 hover:bg-red-600/40 text-red-400 text-sm font-semibold transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Modal de Nueva Tarea ─────────────────────────────────────

function NuevaTareaModal({
  onClose,
  onCrear,
}: {
  onClose: () => void;
  onCrear: (tarea: Omit<Tarea, "id" | "creadaEn">) => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [asignadoA, setAsignadoA] = useState("");
  const [prioridad, setPrioridad] = useState<Tarea["prioridad"]>("media");

  const handleSubmit = () => {
    if (!titulo.trim() || !asignadoA.trim()) return;
    onCrear({
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      asignadoA: asignadoA.trim(),
      status: "pendiente",
      vista: false,
      prioridad,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}>
      <div className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl overflow-hidden"
        style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.10)", maxHeight: "90vh", overflowY: "auto" }}>

        <div className="flex items-center justify-between p-4 border-b border-white/10 sticky top-0"
          style={{ background: "#1a1a1a" }}>
          <h2 className="text-base font-black text-white flex items-center gap-2">
            <Plus className="w-4 h-4 text-green-400" /> Nueva Tarea
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-gray-400">
            <EyeOff className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="label">Título</label>
            <input
              className="input"
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              placeholder="Ej: Cambiar aceite de motosierra"
            />
          </div>

          <div>
            <label className="label">Descripción</label>
            <textarea
              className="input min-h-[100px]"
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              placeholder="Detalles de la tarea..."
            />
          </div>

          <div>
            <label className="label">Asignado a</label>
            <input
              className="input"
              value={asignadoA}
              onChange={e => setAsignadoA(e.target.value)}
              placeholder="Nombre del empleado"
            />
          </div>

          <div>
            <label className="label">Prioridad</label>
            <div className="grid grid-cols-3 gap-2">
              {(["baja", "media", "alta"] as Tarea["prioridad"][]).map(p => (
                <button
                  key={p}
                  onClick={() => setPrioridad(p)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                    prioridad === p ? "border-current" : "border-white/10 text-gray-500"
                  }`}
                  style={prioridad === p ? {
                    backgroundColor: PRIORIDAD_COLORS[p].bg,
                    color: PRIORIDAD_COLORS[p].text,
                  } : {}}
                >
                  {p.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl bg-gray-600 hover:bg-gray-700 text-white font-bold transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={!titulo.trim() || !asignadoA.trim()}
              className="flex-1 py-3 px-4 rounded-xl bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold transition-colors"
            >
              Crear Tarea
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────

export default function TareasPage() {
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState<string>("todas");

  const loadTareas = useCallback(async () => {
    setLoading(true);
    try {
      const data = await tareasDb.getAll();
      setTareas(data);

      // Marcar tareas nuevas como vistas
      const nuevasIds = data.filter(t => !t.vista).map(t => t.id);
      if (nuevasIds.length > 0) {
        await tareasDb.marcarVistas(nuevasIds);
        // Recargar para actualizar el estado local
        const updated = await tareasDb.getAll();
        setTareas(updated);
      }
    } catch (e) {
      console.error("Error cargando tareas:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTareas();
  }, [loadTareas]);

  const handleCrear = async (tarea: Omit<Tarea, "id" | "creadaEn">) => {
    try {
      await tareasDb.create(tarea);
      setShowModal(false);
      loadTareas();
    } catch (e) {
      console.error("Error creando tarea:", e);
      alert("Error al crear tarea");
    }
  };

  const handleIniciar = async (id: string) => {
    try {
      await tareasDb.iniciarTarea(id);
      loadTareas();
    } catch (e) {
      console.error("Error iniciando tarea:", e);
      alert("Error al iniciar tarea");
    }
  };

  const handleCompletar = async (id: string) => {
    try {
      await tareasDb.completarTarea(id);
      loadTareas();
    } catch (e) {
      console.error("Error completando tarea:", e);
      alert("Error al completar tarea");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await tareasDb.delete(id);
      loadTareas();
    } catch (e) {
      console.error("Error eliminando tarea:", e);
      alert("Error al eliminar tarea");
    }
  };

  const filteredTareas = tareas.filter(t => {
    if (filter === "todas") return true;
    return t.status === filter;
  });

  const stats = {
    todas: tareas.length,
    pendientes: tareas.filter(t => t.status === "pendiente").length,
    en_progreso: tareas.filter(t => t.status === "en_progreso").length,
    completadas: tareas.filter(t => t.status === "completada").length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black pb-20 sm:pb-0">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-[#E09A00]" />
              Tareas
            </h1>
            <p className="text-sm text-gray-400 mt-1">Gestión de tareas del equipo</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 py-2 px-4 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold transition-colors"
          >
            <Plus className="w-5 h-5" /> Nueva Tarea
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Todas", value: stats.todas, color: "text-white", bg: "bg-white/10" },
            { label: "Pendientes", value: stats.pendientes, color: "text-yellow-400", bg: "bg-yellow-900/30" },
            { label: "En Progreso", value: stats.en_progreso, color: "text-blue-400", bg: "bg-blue-900/30" },
            { label: "Completadas", value: stats.completadas, color: "text-green-400", bg: "bg-green-900/30" },
          ].map(s => (
            <div key={s.label} className={`card border border-white/10 ${s.bg}`}>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">{s.label}</p>
              <p className={`text-2xl font-black mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {[
            { key: "todas" as const, label: "Todas" },
            { key: "pendientes" as const, label: "Pendientes" },
            { key: "en_progreso" as const, label: "En Progreso" },
            { key: "completadas" as const, label: "Completadas" },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`py-2 px-4 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${
                filter === f.key
                  ? "bg-[#E09A00] text-black"
                  : "bg-white/10 text-gray-400 hover:bg-white/20"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Lista de Tareas */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">
            <Clock className="w-8 h-8 mx-auto mb-2 animate-spin" />
            <p>Cargando tareas...</p>
          </div>
        ) : filteredTareas.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-semibold">No hay tareas</p>
            <p className="text-sm mt-1">Crea una nueva tarea para comenzar</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTareas.map(t => (
              <TareaCard
                key={t.id}
                tarea={t}
                onIniciar={handleIniciar}
                onCompletar={handleCompletar}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      <BottomNav />

      {showModal && (
        <NuevaTareaModal
          onClose={() => setShowModal(false)}
          onCrear={handleCrear}
        />
      )}
    </div>
  );
}
