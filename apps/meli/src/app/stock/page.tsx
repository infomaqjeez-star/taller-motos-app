"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  RefreshCw,
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  Save,
  X,
  Download,
  Upload,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface StockItem {
  id: string;
  sku: string;
  nombre: string;
  cantidad: number;
  precio: number;
  item_id?: string;
  cuenta_id?: string;
  meli_sku?: string;
  created_at: string;
  updated_at: string;
}

export default function StockPage() {
  const router = useRouter();
  const [stock, setStock] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<StockItem>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({
    sku: "",
    nombre: "",
    cantidad: 0,
    precio: 0,
  });

  // Cargar stock
  const loadStock = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch("/api/stock", {
        headers: session?.access_token 
          ? { Authorization: `Bearer ${session.access_token}` }
          : {},
      });

      if (!response.ok) throw new Error("Error cargando stock");
      
      const data = await response.json();
      setStock(data.stock || []);
    } catch (err: any) {
      toast.error(err.message || "Error cargando stock");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStock();
  }, [loadStock]);

  // Sincronizar con MeLi
  const syncWithMeli = async () => {
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch("/api/stock/sync", {
        method: "POST",
        headers: session?.access_token 
          ? { Authorization: `Bearer ${session.access_token}` }
          : {},
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error sincronizando");
      }
      
      const data = await response.json();
      toast.success(`Sincronización completada: ${data.procesados} items`);
      loadStock();
    } catch (err: any) {
      toast.error(err.message || "Error sincronizando");
    } finally {
      setSyncing(false);
    }
  };

  // Guardar edición
  const saveEdit = async () => {
    if (!editingId) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch("/api/stock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: session?.access_token ? `Bearer ${session.access_token}` : "",
        },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) throw new Error("Error guardando");
      
      toast.success("Item actualizado");
      setEditingId(null);
      loadStock();
    } catch (err: any) {
      toast.error(err.message || "Error guardando");
    }
  };

  // Eliminar item
  const deleteItem = async (sku: string) => {
    if (!confirm(`¿Eliminar item ${sku}?`)) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`/api/stock?sku=${sku}`, {
        method: "DELETE",
        headers: session?.access_token 
          ? { Authorization: `Bearer ${session.access_token}` }
          : {},
      });

      if (!response.ok) throw new Error("Error eliminando");
      
      toast.success("Item eliminado");
      loadStock();
    } catch (err: any) {
      toast.error(err.message || "Error eliminando");
    }
  };

  // Crear nuevo item
  const createItem = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch("/api/stock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: session?.access_token ? `Bearer ${session.access_token}` : "",
        },
        body: JSON.stringify(newItem),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error creando");
      }
      
      toast.success("Item creado");
      setShowAddForm(false);
      setNewItem({ sku: "", nombre: "", cantidad: 0, precio: 0 });
      loadStock();
    } catch (err: any) {
      toast.error(err.message || "Error creando");
    }
  };

  // Filtrar stock
  const filteredStock = stock.filter(item =>
    item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.meli_sku?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  return (
    <div className="min-h-screen bg-[#020203]">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#020203]/95 backdrop-blur-sm border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-zinc-400" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-white">Stock Unificado</h1>
                <p className="text-sm text-zinc-500">MAQJEEZ I - Depósito General</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={syncWithMeli}
                disabled={syncing}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-400 text-black font-medium rounded-xl hover:bg-yellow-300 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Sincronizando..." : "Sincronizar con MeLi"}
              </button>

              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800 text-white font-medium rounded-xl hover:bg-zinc-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Nuevo
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 rounded-lg">
              <Package className="w-4 h-4 text-zinc-400" />
              <span className="text-sm text-zinc-300">{stock.length} items</span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 rounded-lg">
              <span className="text-sm text-zinc-300">
                {stock.reduce((sum, item) => sum + item.cantidad, 0)} unidades
              </span>
            </div>

            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por SKU o nombre..."
                className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-yellow-500/50"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 text-yellow-400 animate-spin" />
          </div>
        ) : (
          <>
            {/* Formulario nuevo item */}
            <AnimatePresence>
              {showAddForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6 p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl"
                >
                  <h3 className="text-sm font-medium text-white mb-4">Nuevo Item</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <input
                      type="text"
                      placeholder="SKU (ej: MAQ-00001)"
                      value={newItem.sku}
                      onChange={(e) => setNewItem({ ...newItem, sku: e.target.value })}
                      className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-yellow-500/50"
                    />
                    <input
                      type="text"
                      placeholder="Nombre del producto"
                      value={newItem.nombre}
                      onChange={(e) => setNewItem({ ...newItem, nombre: e.target.value })}
                      className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-yellow-500/50"
                    />
                    <input
                      type="number"
                      placeholder="Cantidad"
                      value={newItem.cantidad}
                      onChange={(e) => setNewItem({ ...newItem, cantidad: parseInt(e.target.value) || 0 })}
                      className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-yellow-500/50"
                    />
                    <input
                      type="number"
                      placeholder="Precio"
                      value={newItem.precio}
                      onChange={(e) => setNewItem({ ...newItem, precio: parseFloat(e.target.value) || 0 })}
                      className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-yellow-500/50"
                    />
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={createItem}
                      className="flex items-center gap-2 px-4 py-2 bg-yellow-400 text-black text-sm font-medium rounded-lg hover:bg-yellow-300 transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      Guardar
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tabla de stock */}
            <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="grid grid-cols-12 gap-4 p-4 bg-zinc-900/50 border-b border-zinc-800 text-xs font-medium text-zinc-400 uppercase">
                <div className="col-span-2">SKU</div>
                <div className="col-span-4">Nombre</div>
                <div className="col-span-2 text-center">Cantidad</div>
                <div className="col-span-2 text-right">Precio</div>
                <div className="col-span-2 text-right">Acciones</div>
              </div>

              <div className="divide-y divide-zinc-800/50">
                {filteredStock.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-zinc-900/50 transition-colors"
                  >
                    {editingId === item.id ? (
                      <>
                        <div className="col-span-2">
                          <input
                            type="text"
                            value={editForm.sku || item.sku}
                            onChange={(e) => setEditForm({ ...editForm, sku: e.target.value })}
                            className="w-full px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-sm text-white"
                          />
                        </div>
                        <div className="col-span-4">
                          <input
                            type="text"
                            value={editForm.nombre || item.nombre}
                            onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
                            className="w-full px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-sm text-white"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            value={editForm.cantidad ?? item.cantidad}
                            onChange={(e) => setEditForm({ ...editForm, cantidad: parseInt(e.target.value) || 0 })}
                            className="w-full px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-sm text-white text-center"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            value={editForm.precio ?? item.precio}
                            onChange={(e) => setEditForm({ ...editForm, precio: parseFloat(e.target.value) || 0 })}
                            className="w-full px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-sm text-white text-right"
                          />
                        </div>
                        <div className="col-span-2 flex justify-end gap-2">
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1 text-zinc-400 hover:text-white"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <button
                            onClick={saveEdit}
                            className="p-1 text-green-400 hover:text-green-300"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="col-span-2 font-mono text-sm text-yellow-400">{item.sku}</div>
                        <div className="col-span-4 text-sm text-white truncate" title={item.nombre}>{item.nombre}</div>
                        <div className={`col-span-2 text-center text-sm font-medium ${item.cantidad <= 5 ? 'text-red-400' : 'text-green-400'}`}>
                          {item.cantidad}
                        </div>
                        <div className="col-span-2 text-right text-sm text-zinc-300">
                          ${item.precio?.toLocaleString()}
                        </div>
                        <div className="col-span-2 flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingId(item.id);
                              setEditForm(item);
                            }}
                            className="p-1 text-zinc-400 hover:text-white"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteItem(item.sku)}
                            className="p-1 text-zinc-400 hover:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
