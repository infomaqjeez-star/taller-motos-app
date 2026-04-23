"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { 
  ArrowLeft, Download, Search, Loader2, RefreshCw, 
  Package, Zap, Truck, Warehouse, Filter, Calendar, User, History,
  CheckSquare, Square, Printer, ChevronDown, Trash2, ChevronLeft, ChevronRight,
  Clock
} from "lucide-react";
import { getNowBA, getTodayBA, isSameDayBA } from "@/lib/date-utils";
import { supabase } from "@/lib/supabase";

interface EtiquetaHistorial {
  id: number;
  order_id: string;
  shipping_id: string;
  cuenta_origen: string;
  comprador_nombre: string;
  titulo_producto: string;
  tipo_envio: "FLEX" | "CORREO" | "TURBO" | "FULL";
  fecha_creacion: string;
  pdf_generado: boolean;
}

type TipoEnvio = "todas" | "FLEX" | "CORREO" | "TURBO" | "FULL";

const tipoEnvioConfig = {
  FLEX: { 
    color: "text-cyan-400", 
    bg: "bg-cyan-500/10", 
    border: "border-cyan-500/30",
    icon: Zap,
    label: "⚡ Flex"
  },
  CORREO: { 
    color: "text-orange-400", 
    bg: "bg-orange-500/10", 
    border: "border-orange-500/30",
    icon: Package,
    label: "📦 Correo"
  },
  TURBO: { 
    color: "text-purple-400", 
    bg: "bg-purple-500/10", 
    border: "border-purple-500/30",
    icon: Truck,
    label: "🚀 Turbo"
  },
  FULL: { 
    color: "text-emerald-400", 
    bg: "bg-emerald-500/10", 
    border: "border-emerald-500/30",
    icon: Warehouse,
    label: "🏭 Full"
  }
};

// Componente Calendario personalizado con día vigente marcado
function CalendarioPicker({ 
  fechaSeleccionada, 
  onChange, 
  onCerrar 
}: { 
  fechaSeleccionada: Date | null; 
  onChange: (fecha: Date) => void;
  onCerrar: () => void;
}) {
  const [mesActual, setMesActual] = useState(getNowBA());
  
  const hoy = getTodayBA();
  
  const maxFecha = getNowBA();
  const minFecha = getNowBA();
  minFecha.setDate(minFecha.getDate() - 60);
  
  const diasEnMes = new Date(mesActual.getFullYear(), mesActual.getMonth() + 1, 0).getDate();
  const primerDiaSemana = new Date(mesActual.getFullYear(), mesActual.getMonth(), 1).getDay();
  
  const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const diasSemana = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  
  const cambiarMes = (direccion: number) => {
    setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth() + direccion, 1));
  };
  
  const seleccionarFecha = (dia: number) => {
    const fecha = new Date(mesActual.getFullYear(), mesActual.getMonth(), dia, 12, 0, 0);
    onChange(fecha);
    onCerrar();
  };
  
  const esFechaValida = (dia: number) => {
    const fecha = new Date(mesActual.getFullYear(), mesActual.getMonth(), dia, 12, 0, 0);
    return fecha >= minFecha && fecha <= maxFecha;
  };
  
  const esFechaSeleccionada = (dia: number) => {
    if (!fechaSeleccionada) return false;
    return fechaSeleccionada.getDate() === dia && 
           fechaSeleccionada.getMonth() === mesActual.getMonth() &&
           fechaSeleccionada.getFullYear() === mesActual.getFullYear();
  };
  
  const esHoy = (dia: number) => {
    return hoy.getDate() === dia && 
           hoy.getMonth() === mesActual.getMonth() &&
           hoy.getFullYear() === mesActual.getFullYear();
  };
  
  return (
    <div className="absolute top-full left-0 mt-2 bg-[#1a1a1f] border border-white/10 rounded-xl p-4 shadow-2xl z-50 w-[280px]">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => cambiarMes(-1)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
          <ChevronLeft className="w-5 h-5 text-zinc-400" />
        </button>
        <span className="text-sm font-bold text-white">
          {meses[mesActual.getMonth()]} {mesActual.getFullYear()}
        </span>
        <button onClick={() => cambiarMes(1)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
          <ChevronRight className="w-5 h-5 text-zinc-400" />
        </button>
      </div>
      
      <div className="grid grid-cols-7 gap-1 mb-2">
        {diasSemana.map(dia => (
          <div key={dia} className="text-center text-[10px] text-zinc-500 font-bold py-1">{dia}</div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: primerDiaSemana }).map((_, i) => (
          <div key={`empty-${i}`} className="h-8" />
        ))}
        {Array.from({ length: diasEnMes }).map((_, i) => {
          const dia = i + 1;
          const valida = esFechaValida(dia);
          const seleccionada = esFechaSeleccionada(dia);
          const diaHoy = esHoy(dia);
          
          return (
            <button
              key={dia}
              onClick={() => valida && seleccionarFecha(dia)}
              disabled={!valida}
              className={`h-8 w-8 rounded-lg text-xs font-bold transition-all relative
                ${seleccionada ? "bg-amber-500 text-black" : valida ? "hover:bg-white/10 text-white" : "text-zinc-700 cursor-not-allowed"}
                ${diaHoy && !seleccionada ? "border-2 border-emerald-500 text-emerald-400" : ""}`}
            >
              {dia}
              {diaHoy && <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full" />}
            </button>
          );
        })}
      </div>
      
      <div className="mt-3 pt-3 border-t border-white/10 text-[10px] text-zinc-500 flex items-center justify-between">
        <span>Rango: Últimos 60 días</span>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
          <span>Hoy</span>
        </div>
      </div>
    </div>
  );
}

export default function HistorialEtiquetasPage() {
  const [etiquetas, setEtiquetas] = useState<EtiquetaHistorial[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TipoEnvio>("todas");
  const [fechaFiltro, setFechaFiltro] = useState<Date | null>(null);
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [procesando, setProcesando] = useState(false);
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(null);
  
  // Ref para el intervalo de polling
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Cargar todas las etiquetas del historial (60 días)
  const loadEtiquetas = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/etiquetas-historial");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setEtiquetas(data.data || []);
      setUltimaActualizacion(getNowBA());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  // Cargar inicialmente
  useEffect(() => {
    loadEtiquetas();
  }, [loadEtiquetas]);

  // Polling cada 15 minutos (900000 ms)
  useEffect(() => {
    pollingRef.current = setInterval(() => {
      console.log("[Historial] Polling cada 15 minutos...");
      loadEtiquetas(false); // No mostrar loading en polling automático
    }, 900000); // 15 minutos

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [loadEtiquetas]);

  // También recargar cuando la ventana vuelve a tener foco
  useEffect(() => {
    const handleFocus = () => {
      console.log("[Historial] Ventana enfocada, recargando...");
      loadEtiquetas(false);
    };
    
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [loadEtiquetas]);

  const filtrarPorFecha = useCallback((etiquetas: EtiquetaHistorial[]) => {
    if (!fechaFiltro) return etiquetas;
    return etiquetas.filter(e => {
      const fechaEtiqueta = new Date(e.fecha_creacion);
      return fechaEtiqueta.toDateString() === fechaFiltro.toDateString();
    });
  }, [fechaFiltro]);

  const filteredEtiquetas = useMemo(() => {
    let filtered = etiquetas;
    if (query.length >= 2) {
      const q = query.toLowerCase();
      filtered = filtered.filter((e) =>
        e.order_id.toLowerCase().includes(q) ||
        e.shipping_id.toLowerCase().includes(q) ||
        (e.comprador_nombre || "").toLowerCase().includes(q) ||
        (e.titulo_producto || "").toLowerCase().includes(q) ||
        (e.cuenta_origen || "").toLowerCase().includes(q)
      );
    }
    if (activeTab !== "todas") {
      filtered = filtered.filter((e) => e.tipo_envio === activeTab);
    }
    filtered = filtrarPorFecha(filtered);
    return filtered;
  }, [etiquetas, query, activeTab, fechaFiltro, filtrarPorFecha]);

  const typeCounts = useMemo(() => {
    const filtradasPorFecha = filtrarPorFecha(etiquetas);
    return {
      todas: filtradasPorFecha.length,
      FLEX: filtradasPorFecha.filter((e) => e.tipo_envio === "FLEX").length,
      CORREO: filtradasPorFecha.filter((e) => e.tipo_envio === "CORREO").length,
      TURBO: filtradasPorFecha.filter((e) => e.tipo_envio === "TURBO").length,
      FULL: filtradasPorFecha.filter((e) => e.tipo_envio === "FULL").length,
    };
  }, [etiquetas, fechaFiltro, filtrarPorFecha]);

  const toggleSeleccionarTodas = () => {
    if (selectedIds.size === filteredEtiquetas.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredEtiquetas.map(e => e.id)));
    }
  };

  const toggleSeleccionar = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const descargarSeleccionadas = async () => {
    if (selectedIds.size === 0) return;
    setProcesando(true);
    
    const seleccionadas = etiquetas.filter(e => selectedIds.has(e.id));
    
    try {
      // Obtener token de sesión
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      // Intentar descargar desde el backup primero (más confiable)
      // Si no existe en backup, intentar desde MeLi
      const res = await fetch("/api/etiquetas-download", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ etiquetas: seleccionadas }),
      });
      
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        if (seleccionadas.length === 1) {
          a.download = `etiqueta-${seleccionadas[0].order_id}.pdf`;
        } else {
          a.download = `etiquetas-${seleccionadas.length}.pdf`;
        }
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const error = await res.json();
        alert(`Error: ${error.error || "No se pudieron descargar las etiquetas"}`);
      }
    } catch (err) {
      console.error("Error descargando:", err);
      alert("Error al descargar etiquetas");
    } finally {
      setProcesando(false);
    }
  };

  const imprimirSeleccionadas = () => {
    if (selectedIds.size === 0) return;
    
    const seleccionadas = etiquetas.filter(e => selectedIds.has(e.id));
    
    const ventana = window.open('', '_blank');
    if (!ventana) {
      alert("Permite ventanas emergentes para imprimir");
      return;
    }
    
    ventana.document.write(`
      <html>
        <head>
          <title>Imprimir Etiquetas (${seleccionadas.length})</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
            .etiqueta { background: white; padding: 15px; margin-bottom: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); page-break-inside: avoid; }
            .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
            .tipo { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
            .tipo-FLEX { background: #06b6d4; color: white; }
            .tipo-CORREO { background: #f97316; color: white; }
            .tipo-TURBO { background: #8b5cf6; color: white; }
            .tipo-FULL { background: #10b981; color: white; }
            .titulo { font-size: 16px; font-weight: bold; margin-bottom: 8px; }
            .info { font-size: 12px; color: #666; }
            @media print { body { background: white; } .etiqueta { box-shadow: none; border: 1px solid #ddd; } }
          </style>
        </head>
        <body>
          <h1>Etiquetas a Imprimir (${seleccionadas.length})</h1>
          <p>Fecha: ${getNowBA().toLocaleString('es-AR')}</p>
          ${seleccionadas.map(e => `
            <div class="etiqueta">
              <div class="header">
                <span class="tipo tipo-${e.tipo_envio}">${e.tipo_envio}</span>
                <span>#${e.order_id}</span>
              </div>
              <div class="titulo">${e.titulo_producto || 'Sin título'}</div>
              <div class="info">
                <strong>Comprador:</strong> ${e.comprador_nombre || 'N/A'} <br/>
                <strong>Cuenta:</strong> ${e.cuenta_origen} <br/>
                <strong>Fecha:</strong> ${new Date(e.fecha_creacion).toLocaleString('es-AR')}
              </div>
            </div>
          `).join('')}
          <script>window.print();</script>
        </body>
      </html>
    `);
    ventana.document.close();
  };

  const limpiarFiltroFecha = () => {
    setFechaFiltro(null);
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const formatearFechaCorta = (fecha: Date) => {
    return fecha.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  };

  const todasSeleccionadas = selectedIds.size === filteredEtiquetas.length && filteredEtiquetas.length > 0;
  const algunaSeleccionada = selectedIds.size > 0;

  return (
    <div className="min-h-screen bg-[#020203] text-zinc-200">
      <header className="sticky top-0 z-30 px-4 py-3 flex items-center justify-between border-b bg-[#121212]/95 backdrop-blur border-white/[0.06]">
        <div className="flex items-center gap-3">
          <Link href="/etiquetas" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
            <ArrowLeft className="w-5 h-5 text-zinc-400" />
          </Link>
          <div>
            <h1 className="font-black text-white text-lg flex items-center gap-2">
              <History className="w-5 h-5 text-amber-400" />
              Historial de Etiquetas
            </h1>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
              {etiquetas.length} etiquetas · {selectedIds.size} seleccionadas
              {ultimaActualizacion && (
                <span className="ml-2 text-zinc-600">
                  · Actualizado {ultimaActualizacion.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[10px] text-zinc-500">
            <Clock className="w-3 h-3" />
            <span>Auto: 15min</span>
          </div>
          <button
            onClick={() => loadEtiquetas()}
            disabled={loading}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            <RefreshCw className={`w-5 h-5 text-zinc-400 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4">
        {/* Barra de acciones */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <button
            onClick={toggleSeleccionarTodas}
            disabled={filteredEtiquetas.length === 0}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all
              ${todasSeleccionadas ? "bg-amber-500 text-black" : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"}`}
          >
            {todasSeleccionadas ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            {todasSeleccionadas ? "Desmarcar Todas" : "Marcar Todas"}
          </button>

          {algunaSeleccionada && (
            <>
              <button
                onClick={descargarSeleccionadas}
                disabled={procesando}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30 transition-all disabled:opacity-50"
              >
                {procesando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Descargar ({selectedIds.size})
              </button>
              
              <button
                onClick={imprimirSeleccionadas}
                disabled={procesando}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/40 hover:bg-blue-500/30 transition-all disabled:opacity-50"
              >
                {procesando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                Imprimir ({selectedIds.size})
              </button>
              
              <button
                onClick={() => setSelectedIds(new Set())}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30 transition-all"
              >
                <Trash2 className="w-4 h-4" />
                Limpiar
              </button>
            </>
          )}
        </div>

        {/* Búsqueda y filtros */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar por orden, producto, comprador o cuenta..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="relative">
            <button
              onClick={() => setMostrarCalendario(!mostrarCalendario)}
              className="w-full flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl py-2.5 px-3 text-sm text-white hover:bg-white/10 transition-colors"
            >
              <Calendar className="w-4 h-4 text-zinc-500" />
              <span className={fechaFiltro ? "text-amber-400" : "text-zinc-400"}>
                {fechaFiltro ? formatearFechaCorta(fechaFiltro) : "Seleccionar fecha..."}
              </span>
              {fechaFiltro && (
                <button
                  onClick={(e) => { e.stopPropagation(); limpiarFiltroFecha(); }}
                  className="ml-auto text-zinc-500 hover:text-white"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </button>
            
            {mostrarCalendario && (
              <CalendarioPicker
                fechaSeleccionada={fechaFiltro}
                onChange={setFechaFiltro}
                onCerrar={() => setMostrarCalendario(false)}
              />
            )}
          </div>
        </div>

        {/* Filtros por tipo */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
          <Filter className="w-4 h-4 text-zinc-500 flex-shrink-0" />
          {(["todas", "FLEX", "CORREO", "TURBO", "FULL"] as TipoEnvio[]).map((tipo) => {
            const count = typeCounts[tipo];
            const isActive = activeTab === tipo;
            const config = tipoEnvioConfig[tipo as keyof typeof tipoEnvioConfig];
            
            return (
              <button
                key={tipo}
                onClick={() => setActiveTab(tipo)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap
                  ${isActive ? "bg-amber-500 text-black" : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"}`}
              >
                {tipo !== "todas" && config && <config.icon className="w-3.5 h-3.5" />}
                {tipo === "todas" ? "Todas" : config?.label}
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/20">{count}</span>
              </button>
            );
          })}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4 text-red-400 text-sm">
            Error: {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          </div>
        ) : filteredEtiquetas.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">
            <Package className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-bold">No hay etiquetas en el historial</p>
            <p className="text-sm mt-2">Las etiquetas se guardan automáticamente desde la página de Etiquetas</p>
            <Link href="/etiquetas" className="inline-block mt-4 px-4 py-2 bg-amber-500 text-black rounded-xl font-bold text-sm">
              Ir a Etiquetas
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredEtiquetas.map((etiqueta) => {
              const config = tipoEnvioConfig[etiqueta.tipo_envio] || tipoEnvioConfig.CORREO;
              const Icon = config.icon;
              const isSelected = selectedIds.has(etiqueta.id);
              
              return (
                <div 
                  key={etiqueta.id}
                  onClick={() => toggleSeleccionar(etiqueta.id)}
                  className={`bg-white/[0.03] border rounded-xl p-3 cursor-pointer transition-all hover:bg-white/[0.05]
                    ${isSelected ? "border-amber-500/50 bg-amber-500/5" : "border-white/10 hover:border-amber-500/30"}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 pt-0.5">
                      {isSelected ? <CheckSquare className="w-5 h-5 text-amber-400" /> : <Square className="w-5 h-5 text-zinc-600" />}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${config.bg} ${config.color} ${config.border} border`}
                        >
                          <Icon className="w-3 h-3 inline mr-1" />
                          {config.label}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">#{etiqueta.order_id}</span>
                        <span className="text-[9px] text-zinc-600">{etiqueta.cuenta_origen}</span>
                      </div>
                      
                      <h3 className="text-sm font-bold text-white mb-1 truncate">{etiqueta.titulo_producto || "Sin título"}</h3>
                      
                      <div className="flex items-center gap-3 text-[10px] text-zinc-500">
                        <span className="flex items-center gap-1"><User className="w-3 h-3" />{etiqueta.comprador_nombre || "Sin nombre"}</span>
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatearFecha(etiqueta.fecha_creacion)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
