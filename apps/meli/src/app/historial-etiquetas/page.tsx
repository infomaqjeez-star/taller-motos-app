"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { 
  ArrowLeft, Download, Search, Loader2, RefreshCw, 
  Package, Zap, Truck, Warehouse, Filter, Calendar, User, History 
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
  const [descargando, setDescargando] = useState<string | null>(null);

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

  // Filtrar por búsqueda y tipo
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

    return filtered;
  }, [etiquetas, query, activeTab]);

  // Contar por tipo
  const typeCounts = useMemo(() => {
    return {
      todas: etiquetas.length,
      FLEX: etiquetas.filter((e) => e.tipo_envio === "FLEX").length,
      CORREO: etiquetas.filter((e) => e.tipo_envio === "CORREO").length,
      TURBO: etiquetas.filter((e) => e.tipo_envio === "TURBO").length,
      FULL: etiquetas.filter((e) => e.tipo_envio === "FULL").length,
    };
  }, [etiquetas]);

  const descargarPDF = async (etiqueta: EtiquetaHistorial) => {
    setDescargando(etiqueta.shipping_id);
    try {
      // Obtener el access_token de alguna cuenta vinculada
      // Por ahora, mostramos un mensaje indicando que debe imprimirse desde la página de etiquetas
      alert(`Para descargar el PDF de la etiqueta ${etiqueta.order_id}, por favor ve a la página de Etiquetas y selecciona la cuenta ${etiqueta.cuenta_origen}`);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setDescargando(null);
    }
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
              <History className="w-5 h-5 text-amber-400" /
              Historial de Etiquetas
            </h1>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
              Últimos 60 días · {etiquetas.length} etiquetas guardadas
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
        {/* Búsqueda */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar por orden, producto, comprador o cuenta..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
          />
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
          <div className="space-y-3">
            {filteredEtiquetas.map((etiqueta) => {
              const config = tipoEnvioConfig[etiqueta.tipo_envio] || tipoEnvioConfig.CORREO;
              const Icon = config.icon;
              
              return (
                <div 
                  key={etiqueta.id}
                  className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 hover:border-amber-500/30 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${config.bg} ${config.color} ${config.border} border`}
                        >
                          <Icon className="w-3.5 h-3.5 inline mr-1" />
                          {config.label}
                        </span>
                        <span className="text-[11px] text-zinc-500 font-mono">
                          #{etiqueta.order_id}
                        </span>
                        <span className="text-[10px] text-zinc-600">
                          {etiqueta.cuenta_origen}
                        </span>
                      </div>
                      
                      <h3 className="text-base font-bold text-white mb-2 truncate"
                      >
                        {etiqueta.titulo_producto || "Sin título"}
                      </h3>
                      
                      <div className="flex items-center gap-4 text-xs text-zinc-500"
                      >
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          {etiqueta.comprador_nombre || "Sin nombre"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatearFecha(etiqueta.fecha_creacion)}
                        </span>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => descargarPDF(etiqueta)}
                      disabled={descargando === etiqueta.shipping_id}
                      className="flex-shrink-0 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-400 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      {descargando === etiqueta.shipping_id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          PDF
                        </>
                      )}
                    </button>
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
