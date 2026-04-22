"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Printer, Download, Search, Calendar, Package,
  ChevronLeft, ChevronRight, History, ExternalLink
} from "lucide-react";
import Image from "next/image";

interface LabelHistoryItem {
  id: string;
  shipment_id: number;
  order_id: number;
  tracking_number: string;
  printed_at: string;
  reprint_count: number;
  account_nickname: string;
  buyer_name: string;
  buyer_nickname: string;
  item_title: string;
  item_thumbnail: string;
  total_amount: number;
  shipping_cost: number;
}

interface LabelHistoryProps {
  accountFilter?: string;
}

export function LabelHistory({ accountFilter }: LabelHistoryProps) {
  const [history, setHistory] = useState<LabelHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  
  const ITEMS_PER_PAGE = 20;

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error("No hay sesión activa");
      }

      const params = new URLSearchParams({
        limit: ITEMS_PER_PAGE.toString(),
        offset: (page * ITEMS_PER_PAGE).toString(),
      });

      if (accountFilter) {
        params.append("account_id", accountFilter);
      }

      if (searchTerm) {
        params.append("search", searchTerm);
      }

      const response = await fetch(`/api/label-history?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}`);
      }

      const data = await response.json();
      setHistory(data.data || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, [page, accountFilter, searchTerm]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleReprint = async (item: LabelHistoryItem) => {
    // TODO: Implementar reimpresión
    console.log("Reimprimir:", item.shipment_id);
  };

  const handleDownload = async (item: LabelHistoryItem) => {
    // TODO: Implementar descarga
    console.log("Descargar:", item.shipment_id);
  };

  const toggleSelection = (id: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    if (selectedItems.size === history.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(history.map(item => item.id)));
    }
  };

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  return (
    <div className="space-y-4">
      {/* Header con búsqueda */}
      <div className="flex flex-wrap gap-3 items-center justify-between p-4 rounded-2xl" 
        style={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div className="flex items-center gap-2">
          <History className="w-5 h-5" style={{ color: "#00E5FF" }} />
          <div>
            <h3 className="text-sm font-bold text-white">Historial de Etiquetas</h3>
            <p className="text-[10px]" style={{ color: "#6B7280" }}>
              {total} etiquetas impresas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-2 rounded-xl text-sm text-white placeholder-gray-500 outline-none"
              style={{ background: "#121212", border: "1px solid rgba(255,255,255,0.1)" }}
            />
          </div>

          {/* Seleccionar todo */}
          {history.length > 0 && (
            <button
              onClick={selectAll}
              className="px-3 py-2 rounded-xl text-xs font-bold text-white"
              style={{ background: "#2a2a2a" }}
            >
              {selectedItems.size === history.length ? "Deseleccionar" : "Seleccionar todo"}
            </button>
          )}
        </div>
      </div>

      {/* Acciones batch */}
      {selectedItems.size > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-xl" 
          style={{ background: "#FFE60018", border: "1px solid #FFE60044" }}
        >
          <span className="text-sm text-white">{selectedItems.size} seleccionadas</span>
          <div className="flex-1" />
          <button
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-black"
            style={{ background: "#FFE600" }}
          >
            <Printer className="w-3.5 h-3.5" />
            Reimprimir
          </button>
          <button
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
            style={{ background: "#2a2a2a" }}
          >
            <Download className="w-3.5 h-3.5" />
            Descargar ZIP
          </button>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: "#1F1F1F" }} />
          ))}
        </div>
      ) : error ? (
        <div className="p-6 text-center rounded-2xl" style={{ background: "#ef444418" }}>
          <p className="text-white">{error}</p>
          <button 
            onClick={loadHistory}
            className="mt-2 px-4 py-2 rounded-lg text-sm font-bold bg-red-500 text-white"
          >
            Reintentar
          </button>
        </div>
      ) : history.length === 0 ? (
        <div className="p-10 text-center rounded-2xl" style={{ background: "#1F1F1F" }}>
          <Package className="w-12 h-12 mx-auto mb-2" style={{ color: "#6B7280" }} />
          <p className="text-white font-bold">No hay etiquetas en el historial</p>
          <p className="text-sm mt-1" style={{ color: "#6B7280" }}>
            Las etiquetas impresas aparecerán aquí
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map(item => (
            <div 
              key={item.id}
              className={`p-4 rounded-2xl transition-all ${selectedItems.has(item.id) ? 'ring-2' : ''}`}
              style={{ 
                background: "#1F1F1F", 
                border: "1px solid rgba(255,255,255,0.07)",
                ringColor: selectedItems.has(item.id) ? "#FFE600" : undefined
              }}
            >
              <div className="flex items-start gap-3">
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={selectedItems.has(item.id)}
                  onChange={() => toggleSelection(item.id)}
                  className="mt-1 w-4 h-4 rounded"
                />

                {/* Imagen */}
                {item.item_thumbnail ? (
                  <img
                    src={item.item_thumbnail}
                    alt={item.item_title}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg flex items-center justify-center" style={{ background: "#2a2a2a" }}>
                    <Package className="w-6 h-6" style={{ color: "#6B7280" }} />
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: "#FFE60018", color: "#FFE600" }}
                    >
                      @{item.account_nickname}
                    </span>
                    <span className="text-[10px]" style={{ color: "#6B7280" }}>
                      #{item.shipment_id}
                    </span>
                    {item.reprint_count > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: "#FF572218", color: "#FF5722" }}
                      >
                        Reimpresa {item.reprint_count}x
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-white font-medium truncate">{item.item_title}</p>

                  <div className="flex items-center gap-3 text-xs" style={{ color: "#6B7280" }}>
                    <span>{item.buyer_nickname || item.buyer_name}</span>
                    {item.tracking_number && (
                      <span>Tracking: {item.tracking_number}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs">
                      ${item.total_amount?.toLocaleString("es-AR")}
                    </span>
                    <span className="text-[10px]" style={{ color: "#6B7280" }}>
                      {new Date(item.printed_at).toLocaleDateString("es-AR")}
                    </span>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex flex-col gap-2"
003e
                  <button
                    onClick={() => handleReprint(item)}
                    className="p-2 rounded-lg text-white"
                    style={{ background: "#2a2a2a" }}
                    title="Reimprimir"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDownload(item)}
                    className="p-2 rounded-lg text-white"
                    style={{ background: "#2a2a2a" }}
                    title="Descargar"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="p-2 rounded-lg disabled:opacity-40"
            style={{ background: "#2a2a2a" }}
          >
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
          
          <span className="text-sm text-white">
            Página {page + 1} de {totalPages}
          </span>
          
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="p-2 rounded-lg disabled:opacity-40"
            style={{ background: "#2a2a2a" }}
          >
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
        </div>
      )}
    </div>
  );
}
