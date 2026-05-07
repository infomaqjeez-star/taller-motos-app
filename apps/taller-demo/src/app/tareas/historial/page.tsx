"use client";

import { useState, useEffect, useCallback } from "react";
import { Calendar, Clock, User, ChevronLeft, ChevronRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import { tareasDb } from "@/lib/db";
import { Tarea } from "@/lib/types";

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Periodo = "dia" | "semana" | "mes";

export default function HistorialPage() {
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(false);
  const [periodo, setPeriodo] = useState<Periodo>("dia");
  const [fechaActual, setFechaActual] = useState(new Date());

  const loadTareas = useCallback(async () => {
    setLoading(true);
    try {
      const data = await tareasDb.getAll();
      setTareas(data);
    } catch (e) {
      console.error("Error cargando tareas:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTareas();
  }, [loadTareas]);

  const filtrarTareasPorPeriodo = (): Tarea[] => {
    const now = fechaActual;
    const inicioDia = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const finDia = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const inicioSemana = new Date(now);
    inicioSemana.setDate(now.getDate() - now.getDay()); // Domingo
    inicioSemana.setHours(0, 0, 0, 0);

    const finSemana = new Date(inicioSemana);
    finSemana.setDate(inicioSemana.getDate() + 7); // Sábado siguiente

    const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
    const finMes = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    return tareas.filter(t => {
      const fechaTarea = new Date(t.creadaEn);

      switch (periodo) {
        case "dia":
          return fechaTarea >= inicioDia && fechaTarea < finDia;
        case "semana":
          return fechaTarea >= inicioSemana && fechaTarea < finSemana;
        case "mes":
          return fechaTarea >= inicioMes && fechaTarea < finMes;
        default:
          return true;
      }
    });
  };

  const tareasFiltradas = filtrarTareasPorPeriodo();

  const cambiarFecha = (dias: number) => {
    const nuevaFecha = new Date(fechaActual);
    nuevaFecha.setDate(fechaActual.getDate() + dias);
    setFechaActual(nuevaFecha);
  };

  const cambiarSemana = (semanas: number) => {
    const nuevaFecha = new Date(fechaActual);
    nuevaFecha.setDate(fechaActual.getDate() + (semanas * 7));
    setFechaActual(nuevaFecha);
  };

  const cambiarMes = (meses: number) => {
    const nuevaFecha = new Date(fechaActual);
    nuevaFecha.setMonth(fechaActual.getMonth() + meses);
    setFechaActual(nuevaFecha);
  };

  const getTituloPeriodo = (): string => {
    switch (periodo) {
      case "dia":
        return fechaActual.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
      case "semana":
        const inicioSemana = new Date(fechaActual);
        inicioSemana.setDate(fechaActual.getDate() - fechaActual.getDay());
        const finSemana = new Date(inicioSemana);
        finSemana.setDate(inicioSemana.getDate() + 6);
        return `${inicioSemana.toLocaleDateString("es-AR", { day: "numeric", month: "short" })} - ${finSemana.toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })}`;
      case "mes":
        return fechaActual.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
    }
  };

  const cambiarPeriodo = (nuevoPeriodo: Periodo) => {
    setPeriodo(nuevoPeriodo);
  };

  const tareasCompletadas = tareasFiltradas.filter(t => t.status === "completada");
  const tareasPendientes = tareasFiltradas.filter(t => t.status !== "completada");

  return (
    <>
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8 pb-24">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-6 h-6 text-[#FDB71A]" />
            Historial de Tareas
          </h1>
          <p className="text-sm text-gray-400 mt-1">Registro de tareas realizadas por el equipo</p>
        </div>

        {/* Selector de Período */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { key: "dia" as Periodo, label: "Día" },
            { key: "semana" as Periodo, label: "Semana" },
            { key: "mes" as Periodo, label: "Mes" },
          ].map(p => (
            <button
              key={p.key}
              onClick={() => cambiarPeriodo(p.key)}
              className={`py-2 px-4 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${
                periodo === p.key
                  ? "bg-[#FDB71A] text-black"
                  : "bg-white/10 text-gray-400 hover:bg-white/20"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Navegación de Fecha */}
        <div className="card border border-white/10 mb-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                if (periodo === "dia") cambiarFecha(-1);
                else if (periodo === "semana") cambiarSemana(-1);
                else cambiarMes(-1);
              }}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-center">
              <h2 className="text-lg font-bold text-white capitalize">{getTituloPeriodo()}</h2>
            </div>
            <button
              onClick={() => {
                if (periodo === "dia") cambiarFecha(1);
                else if (periodo === "semana") cambiarSemana(1);
                else cambiarMes(1);
              }}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats del Período */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="card border border-white/10 bg-green-900/30">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Completadas</p>
            <p className="text-2xl font-black mt-1 text-green-400">{tareasCompletadas.length}</p>
          </div>
          <div className="card border border-white/10 bg-yellow-900/30">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Pendientes</p>
            <p className="text-2xl font-black mt-1 text-yellow-400">{tareasPendientes.length}</p>
          </div>
        </div>

        {/* Lista de Tareas */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">
            <Clock className="w-8 h-8 mx-auto mb-2 animate-spin" />
            <p>Cargando historial...</p>
          </div>
        ) : tareasFiltradas.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-semibold">No hay tareas en este período</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tareasFiltradas.map(t => (
              <div key={t.id} className="card border border-white/10">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-white">{t.titulo}</h3>
                    <p className="text-sm text-gray-400 mt-1">{t.descripcion}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {t.asignadoA}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(t.creadaEn)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(t.creadaEn)}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-gray-400">
                      <span>Creador: <strong className="text-white">{t.creador}</strong></span>
                      {t.iniciador && <span> • Iniciador: <strong className="text-white">{t.iniciador}</strong></span>}
                      {t.completador && <span> • Completador: <strong className="text-white">{t.completador}</strong></span>}
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                    t.status === "completada" ? "bg-green-900/30 text-green-400 border border-green-600" :
                    t.status === "en_progreso" ? "bg-blue-900/30 text-blue-400 border border-blue-600" :
                    "bg-yellow-900/30 text-yellow-400 border border-yellow-600"
                  }`}>
                    {t.status === "completada" ? "Completada" :
                     t.status === "en_progreso" ? "En Progreso" : "Pendiente"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
