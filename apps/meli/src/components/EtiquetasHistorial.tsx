"use client";

import { useState, useEffect } from "react";
import { 
  History, Download, Package, Zap, Truck, Warehouse, 
  X, Filter, Calendar, User, FileText 
} from "lucide-react";
import { InteractiveCard } from "./InteractiveCard";

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

interface Props {
  accountName?: string;
  accessToken?: string;
}

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

export function EtiquetasHistorial({ accountName, accessToken }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [etiquetas, setEtiquetas] = useState<EtiquetaHistorial[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState<string>("");
  const [descargando, setDescargando] = useState<string | null>(null);

  const cargarHistorial = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (accountName) params.append("cuenta", accountName);
      if (filtroTipo) params.append("tipo", filtroTipo);
      
      const res = await fetch(`/api/etiquetas-historial?${params}`);
      const data = await res.json();
      
      if (data.data) {
        setEtiquetas(data.data);
      }
    } catch (error) {
      console.error("Error cargando historial:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      cargarHistorial();
    }
  }, [isOpen, filtroTipo]);

  const descargarPDF = async (etiqueta: EtiquetaHistorial) => {
    if (!accessToken) {
      alert("No hay token de acceso disponible");
      return;
    }
    
    setDescargando(etiqueta.shipping_id);
    try {
      const res = await fetch(
        `/api/etiquetas-pdf?shipping_id=${etiqueta.shipping_id}&access_token=${accessToken}`
      );
      
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `etiqueta-${etiqueta.order_id}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert("Error descargando PDF. El link puede haber expirado.");
      }
    } catch (error) {
      console.error("Error descargando PDF:", error);
      alert("Error descargando PDF");
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
    <>
      {/* Botón para abrir historial */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-gradient-to-r from-amber-500/20 to-amber-600/20 
                   border border-amber-500/40 text-amber-400 hover:text-amber-300
                   px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest
                   transition-all hover:scale-105 shadow-[0_0_20px_rgba(251,191,36,0.15)]"
      >
        <History className="w-4 h-4" />
        Historial (60 Días)
      </button>

      {/* Modal del historial */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <InteractiveCard 
            className="bg-[#0a0a0c] border border-white/10 rounded-[2rem] w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl"
            glowColor="rgba(251, 191, 36, 0.1)"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                  <History className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">Historial de Etiquetas</h2>
                  <p className="text-xs text-zinc-500 uppercase tracking-widest">Últimos 60 días · {accountName || "Todas las cuentas"}</p>
                </div>
              </div>
              
              <button 
                onClick={() => setIsOpen(false)}
                className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filtros */}
            <div className="flex items-center gap-3 p-4 border-b border-white/5 bg-white/[0.02]">
              <Filter className="w-4 h-4 text-zinc-500" />
              <span className="text-xs text-zinc-500 uppercase font-bold">Filtrar por tipo:</span>
              
              {["", "FLEX", "CORREO", "TURBO", "FULL"].map((tipo) => (
                <button
                  key={tipo || "todos"}
                  onClick={() => setFiltroTipo(tipo)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all
                    ${filtroTipo === tipo 
                      ? "bg-amber-500 text-black shadow-[0_0_10px_rgba(251,191,36,0.4)]" 
                      : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"}`}
                >
                  {tipo || "Todos"}
                </button>
              ))}
            </div>

            {/* Lista de etiquetas */}
            <div className="overflow-y-auto max-h-[60vh] p-4 space-y-3 custom-scrollbar">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : etiquetas.length === 0 ? (
                <div className="text-center py-12 text-zinc-500">
                  <Package className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-sm font-bold">No hay etiquetas en el historial</p>
                  <p className="text-xs mt-1">Las etiquetas se guardarán automáticamente al imprimir</p>
                </div>
              ) : (
                etiquetas.map((etiqueta) => {
                  const config = tipoEnvioConfig[etiqueta.tipo_envio] || tipoEnvioConfig.CORREO;
                  const Icon = config.icon;
                  
                  return (
                    <div 
                      key={etiqueta.id}
                      className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 hover:border-amber-500/30 transition-all group"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${config.bg} ${config.color} ${config.border} border`}>
                              <Icon className="w-3 h-3 inline mr-1" />
                              {config.label}
                            </span>
                            <span className="text-[10px] text-zinc-500 font-mono">
                              #{etiqueta.order_id}
                            </span>
                          </div>
                          
                          <h4 className="text-sm font-bold text-white truncate mb-1">
                            {etiqueta.titulo_producto || "Producto sin título"}
                          </h4>
                          
                          <div className="flex items-center gap-4 text-[10px] text-zinc-500">
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
                        
                        <button
                          onClick={() => descargarPDF(etiqueta)}
                          disabled={descargando === etiqueta.shipping_id}
                          className="flex-shrink-0 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 
                                     text-white px-4 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest
                                     transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed
                                     shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center gap-2"
                        >
                          {descargando === etiqueta.shipping_id ? (
                            <>
                              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Descargando...
                            </>
                          ) : (
                            <>
                              <Download className="w-3.5 h-3.5" />
                              PDF
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 bg-white/[0.02] flex justify-between items-center">
              <span className="text-[10px] text-zinc-500">
                Total: <strong className="text-white">{etiquetas.length}</strong> etiquetas
              </span>
              <button
                onClick={cargarHistorial}
                className="text-[10px] text-amber-400 hover:text-amber-300 font-bold uppercase tracking-widest transition-colors"
              >
                Actualizar lista
              </button>
            </div>
          </InteractiveCard>
        </div>
      )}
    </>
  );
}
