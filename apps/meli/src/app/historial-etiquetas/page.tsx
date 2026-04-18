"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { 
  ArrowLeft, Download, Search, Loader2, RefreshCw, 
  Package, Zap, Truck, Warehouse, Filter, Calendar, User, History,
  CheckSquare, Square, Printer, ChevronDown, Trash2
} from "lucide-react";

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
type FiltroFecha = "todos" | "hoy" | "semana" | "mes";

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

export default function HistorialEtiquetasPage() {
  const [etiquetas, setEtiquetas] = useState<EtiquetaHistorial[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TipoEnvio>("todas");
  const [filtroFecha, setFiltroFecha] = useState<FiltroFecha>("todos");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [descargando, setDescargando] = useState(false);
  const [imprimiendo, setImprimiendo] = useState(false);

  // Cargar todas las etiquetas del historial (60 días)
  const loadEtiquetas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/etiquetas-historial");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setEtiquetas(data.data || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEtiquetas();
  }, [loadEtiquetas]);

  // Filtrar por fecha
  const filtrarPorFecha = (etiquetas: EtiquetaHistorial[]) => {
    if (filtroFecha === "todos") return etiquetas;
    
    const ahora = new Date();
    return etiquetas.filter(e => {
      const fecha = new Date(e.fecha_creacion);
      const diffDias = Math.floor((ahora.getTime() - fecha.getTime()) / (1000 * 60 * 60 * 24));
      
      switch (filtroFecha) {
        case "hoy": return diffDias === 0;
        case "semana": return diffDias <= 7;
        case "mes": return diffDias <= 30;
        default: return true;
      }
    });
  };

  // Filtrar por búsqueda, tipo y fecha
  const filteredEtiquetas = useMemo(() => {
    let filtered = etiquetas;

    // Filtro de búsqueda
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

    // Filtro por tipo de envío
    if (activeTab !== "todas") {
      filtered = filtered.filter((e) => e.tipo_envio === activeTab);
    }

    // Filtro por fecha
    filtered = filtrarPorFecha(filtered);

    return filtered;
  }, [etiquetas, query, activeTab, filtroFecha]);

  // Contar por tipo
  const typeCounts = useMemo(() => {
    const filtradasPorFecha = filtrarPorFecha(etiquetas);
    return {
      todas: filtradasPorFecha.length,
      FLEX: filtradasPorFecha.filter((e) => e.tipo_envio === "FLEX").length,
      CORREO: filtradasPorFecha.filter((e) => e.tipo_envio === "CORREO").length,
      TURBO: filtradasPorFecha.filter((e) => e.tipo_envio === "TURBO").length,
      FULL: filtradasPorFecha.filter((e) => e.tipo_envio === "FULL").length,
    };
  }, [etiquetas, filtroFecha]);

  // Seleccionar/Deseleccionar todas
  const toggleSeleccionarTodas = () => {
    if (selectedIds.size === filteredEtiquetas.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredEtiquetas.map(e => e.id)));
    }
  };

  // Seleccionar/Deseleccionar una etiqueta
  const toggleSeleccionar = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Descargar seleccionadas
  const descargarSeleccionadas = async () => {
    if (selectedIds.size === 0) return;
    
    setDescargando(true);
    const seleccionadas = etiquetas.filter(e => selectedIds.has(e.id));
    
    // Descargar una por una
    for (const etiqueta of seleccionadas) {
      try {
        // Aquí iría la lógica para descargar el PDF
        console.log(`Descargando etiqueta ${etiqueta.order_id}`);
      } catch (error) {
        console.error(`Error descargando ${etiqueta.order_id}:`, error);
      }
    }
    
    setDescargando(false);
  };

  // Imprimir seleccionadas
  const imprimirSeleccionadas = async () => {
    if (selectedIds.size === 0) return;
    
    setImprimiendo(true);
    const seleccionadas = etiquetas.filter(e => selectedIds.has(e.id));
    
    // Abrir ventana de impresión con las etiquetas seleccionadas
    const ventanaImpresion = window.open('', '_blank');
    if (ventanaImpresion) {
      ventanaImpresion.document.write(`
        <html>
          <head><title>Etiquetas a imprimir</title></head>
          <body>
            <h1>Etiquetas seleccionadas (${seleccionadas.length})</h1>
            <ul>
              ${seleccionadas.map(e => `
                <li>
                  Orden: ${e.order_id} - ${e.titulo_producto} - ${e.comprador_nombre}
                </li>
              `).join('')}
            </ul>
            <p>Funcionalidad de impresión en desarrollo...</p>
          </body>
        </html>
      `);
      ventanaImpresion.document.close();
    }
    
    setImprimiendo(false);
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

  const todasSeleccionadas = selectedIds.size === filteredEtiquetas.length && filteredEtiquetas.length > 0;
  const algunaSeleccionada = selectedIds.size > 0;

  return (
    <div className="min-h-screen bg-[#020203] text-zinc-200">
      {/* Header */}
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
            </p>
          </div>
        </div>
        <button
          onClick={loadEtiquetas}
          disabled={loading}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
        >
          <RefreshCw className={`w-5 h-5 text-zinc-400 ${loading ? "animate-spin" : ""}`} />
        </button>
      </header>

      <main className="max-w-6xl mx-auto p-4">
        {/* Barra de acciones */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {/* Seleccionar todas */}
          <button
            onClick={toggleSeleccionarTodas}
            disabled={filteredEtiquetas.length === 0}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all
              ${todasSeleccionadas 
                ? "bg-amber-500 text-black" 
                : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"}`}
          >
            {todasSeleccionadas ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            {todasSeleccionadas ? "Desmarcar Todas" : "Marcar Todas"}
          </button>

          {/* Acciones sobre seleccionadas */}
          {algunaSeleccionada && (
            <>
              <button
                onClick={descargarSeleccionadas}
                disabled={descargando}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30 transition-all"
              >
                {descargando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Descargar ({selectedIds.size})
              </button>
              
              <button
                onClick={imprimirSeleccionadas}
                disabled={imprimiendo}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/40 hover:bg-blue-500/30 transition-all"
              >
                {imprimiendo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          {/* Búsqueda */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar por orden, producto, comprador o cuenta..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* Filtro de fecha */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <select
              value={filtroFecha}
              onChange={(e) => setFiltroFecha(e.target.value as FiltroFecha)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:border-amber-500 focus:outline-none appearance-none cursor-pointer"
            >
              <option value="todos">Todas las fechas</option>
              <option value="hoy">Hoy</option>
              <option value="semana">Última semana</option>
              <option value="mes">Último mes</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
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
                  ${isActive 
                    ? "bg-amber-500 text-black" 
                    : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"}`}
              >
                {tipo !== "todas" && config && <config.icon className="w-3.5 h-3.5" />}
                {tipo === "todas" ? "Todas" : config?.label}
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/20">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4 text-red-400 text-sm">
            Error: {error}
          </div>
        )}

        {/* Lista */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          </div>
        ) : filteredEtiquetas.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">
            <Package className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-bold">No hay etiquetas en el historial</p>
            <p className="text-sm mt-2">Las etiquetas se guardan automáticamente desde la página de Etiquetas</p>
            <Link 
              href="/etiquetas"
              className="inline-block mt-4 px-4 py-2 bg-amber-500 text-black rounded-xl font-bold text-sm"
            >
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
                    {/* Checkbox */}
                    <div className="flex-shrink-0 pt-0.5">
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-amber-400" />
                      ) : (
                        <Square className="w-5 h-5 text-zinc-600" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${config.bg} ${config.color} ${config.border} border`}
                        >
                          <Icon className="w-3 h-3 inline mr-1" />
                          {config.label}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          #{etiqueta.order_id}
                        </span>
                        <span className="text-[9px] text-zinc-600">
                          {etiqueta.cuenta_origen}
                        </span>
                      </div>
                      
                      <h3 className="text-sm font-bold text-white mb-1 truncate"
                      >
                        {etiqueta.titulo_producto || "Sin título"}
                      </h3>
                      
                      <div className="flex items-center gap-3 text-[10px] text-zinc-500"
                      >
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {etiqueta.comprador_nombre || "Sin nombre"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatearFecha(etiqueta.fecha_creacion)}
                        </span>
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
