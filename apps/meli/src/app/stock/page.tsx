"use client";

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Link2,
  Minus,
  Package,
  PencilLine,
  Plus,
  RefreshCw,
  Save,
  Search,
  Tags,
  Trash2,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface StockItem {
  id: string;
  sku: string;
  nombre: string;
  cantidad: number;
  precio: number;
  item_id?: string | null;
  cuenta_id?: string | null;
  meli_sku?: string | null;
  created_at: string;
  updated_at: string;
}

export default function StockPage() {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [assigningSkus, setAssigningSkus] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<StockItem>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({
    sku: "",
    nombre: "",
    cantidad: 0,
    precio: 0,
    meli_sku: "",
  });

  const getAuthHeaders = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return {
      "Content-Type": "application/json",
      Authorization: session?.access_token ? `Bearer ${session.access_token}` : "",
    };
  }, []);

  const loadStock = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch("/api/stock", {
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {},
      });

      if (!response.ok) {
        throw new Error("Error cargando stock");
      }

      const data = await response.json();
      setStock(data.stock || []);
    } catch (error: any) {
      toast.error(error.message || "Error cargando stock");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStock();
  }, [loadStock]);

  const syncWithMeli = async () => {
    setSyncing(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch("/api/stock/sync", {
        method: "POST",
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {},
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Error sincronizando");
      }

      toast.success(`Sincronización completada: ${data?.procesados ?? 0} items`);
      await loadStock();
    } catch (error: any) {
      toast.error(error.message || "Error sincronizando");
    } finally {
      setSyncing(false);
    }
  };

  const saveEdit = async () => {
    if (!editingId) {
      return;
    }

    try {
      const currentItem = stock.find((item) => item.id === editingId);
      const nextMeliSku = String(editForm.meli_sku ?? currentItem?.meli_sku ?? "").trim();
      const response = await fetch("/api/stock", {
        method: "PUT",
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          ...editForm,
          id: editingId,
          apply_to_all_same_meli_sku: nextMeliSku.length > 0,
          push_meli_sku: nextMeliSku.length > 0,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Error guardando");
      }

      toast.success("Item actualizado");
      setEditingId(null);
      setEditForm({});
      await loadStock();
    } catch (error: any) {
      toast.error(error.message || "Error guardando");
    }
  };

  const deleteItem = async (sku: string) => {
    if (!confirm(`¿Eliminar item ${sku}?`)) {
      return;
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch(`/api/stock?sku=${sku}`, {
        method: "DELETE",
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {},
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Error eliminando");
      }

      toast.success("Item eliminado");
      await loadStock();
    } catch (error: any) {
      toast.error(error.message || "Error eliminando");
    }
  };

  const createItem = async () => {
    try {
      const response = await fetch("/api/stock", {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify(newItem),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Error creando");
      }

      toast.success("Item creado");
      setShowAddForm(false);
      setNewItem({ sku: "", nombre: "", cantidad: 0, precio: 0, meli_sku: "" });
      await loadStock();
    } catch (error: any) {
      toast.error(error.message || "Error creando");
    }
  };

  const adjustStockQuick = async (item: StockItem, delta: number) => {
    try {
      const response = await fetch("/api/stock", {
        method: "PUT",
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          id: item.id,
          cantidad_delta: delta,
          apply_to_all_same_meli_sku: Boolean(item.meli_sku),
          meli_sku: item.meli_sku,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Error ajustando stock");
      }

      toast.success(delta > 0 ? "Stock aumentado" : "Stock descontado");
      await loadStock();
    } catch (error: any) {
      toast.error(error.message || "Error ajustando stock");
    }
  };

  const assignMissingMeliSkus = async () => {
    const assignments = stock
      .filter((item) => !item.meli_sku && item.item_id && item.cuenta_id)
      .map((item) => ({
        id: item.id,
        item_id: item.item_id,
        cuenta_id: item.cuenta_id,
        meli_sku: item.sku,
      }));

    if (assignments.length === 0) {
      toast.info("No hay publicaciones sin SKU MeLi para asignar");
      return;
    }

    setAssigningSkus(true);
    try {
      const response = await fetch("/api/stock", {
        method: "PATCH",
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          action: "bulk-assign-meli-sku",
          assignments,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Error asignando SKU MeLi");
      }

      const updatedCount = Array.isArray(data?.updated) ? data.updated.length : 0;
      const errorCount = Array.isArray(data?.errors) ? data.errors.length : 0;

      if (updatedCount > 0) {
        toast.success(`SKU MeLi asignados: ${updatedCount}`);
      }

      if (errorCount > 0) {
        toast.error(`Algunas publicaciones no se pudieron actualizar: ${errorCount}`);
      }

      await loadStock();
    } catch (error: any) {
      toast.error(error.message || "Error asignando SKU MeLi");
    } finally {
      setAssigningSkus(false);
    }
  };

  const filteredStock = useMemo(
    () =>
      stock.filter((item) => {
        const term = searchTerm.toLowerCase();
        return (
          item.sku.toLowerCase().includes(term) ||
          item.nombre.toLowerCase().includes(term) ||
          (item.meli_sku?.toLowerCase().includes(term) ?? false) ||
          (item.item_id?.toLowerCase().includes(term) ?? false)
        );
      }),
    [searchTerm, stock]
  );

  const totalUnits = useMemo(
    () => stock.reduce((sum, item) => sum + item.cantidad, 0),
    [stock]
  );

  const identifiedItems = useMemo(
    () => stock.filter((item) => item.meli_sku).length,
    [stock]
  );

  const pendingMeliSku = useMemo(
    () => stock.filter((item) => item.item_id && item.cuenta_id && !item.meli_sku).length,
    [stock]
  );

  return (
    <div className="min-h-screen bg-[#020203]">
      <div className="sticky top-0 z-30 bg-[#020203]/95 backdrop-blur-sm border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-zinc-400" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-white">Stock Unificado</h1>
                <p className="text-sm text-zinc-500">
                  Depósito general unificado para todas las cuentas
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={assignMissingMeliSkus}
                disabled={assigningSkus}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-500/15 text-cyan-300 font-medium rounded-xl hover:bg-cyan-500/25 transition-colors disabled:opacity-50"
              >
                <Tags className={`w-4 h-4 ${assigningSkus ? "animate-pulse" : ""}`} />
                {assigningSkus ? "Asignando..." : "Asignar SKU MeLi"}
              </button>

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

          <div className="flex flex-wrap items-center gap-3 mt-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 rounded-lg">
              <Package className="w-4 h-4 text-zinc-400" />
              <span className="text-sm text-zinc-300">{stock.length} items</span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 rounded-lg">
              <span className="text-sm text-zinc-300">{totalUnits} unidades</span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 rounded-lg">
              <span className="text-sm text-zinc-300">{identifiedItems} identificados</span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 rounded-lg">
              <span className="text-sm text-zinc-300">{pendingMeliSku} sin SKU MeLi</span>
            </div>

            <div className="relative flex-1 min-w-[240px] xl:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar por SKU interno, SKU MeLi, item_id o nombre..."
                className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-yellow-500/50"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 text-yellow-400 animate-spin" />
          </div>
        ) : (
          <>
            {showAddForm && (
              <div className="mb-6 p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                <h3 className="text-sm font-medium text-white mb-4">Nuevo item</h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <input
                    type="text"
                    placeholder="SKU interno"
                    value={newItem.sku}
                    onChange={(event) => setNewItem({ ...newItem, sku: event.target.value })}
                    className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white"
                  />
                  <input
                    type="text"
                    placeholder="Nombre del producto"
                    value={newItem.nombre}
                    onChange={(event) => setNewItem({ ...newItem, nombre: event.target.value })}
                    className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white"
                  />
                  <input
                    type="text"
                    placeholder="SKU MeLi opcional"
                    value={newItem.meli_sku}
                    onChange={(event) => setNewItem({ ...newItem, meli_sku: event.target.value })}
                    className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white"
                  />
                  <input
                    type="number"
                    placeholder="Cantidad"
                    value={newItem.cantidad}
                    onChange={(event) =>
                      setNewItem({ ...newItem, cantidad: parseInt(event.target.value, 10) || 0 })
                    }
                    className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white"
                  />
                  <input
                    type="number"
                    placeholder="Precio"
                    value={newItem.precio}
                    onChange={(event) =>
                      setNewItem({ ...newItem, precio: parseFloat(event.target.value) || 0 })
                    }
                    className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white"
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
              </div>
            )}

            <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="grid grid-cols-14 gap-4 p-4 bg-zinc-900/50 border-b border-zinc-800 text-xs font-medium text-zinc-400 uppercase">
                <div className="col-span-2">SKU interno</div>
                <div className="col-span-4">Producto</div>
                <div className="col-span-2">SKU MeLi</div>
                <div className="col-span-2 text-center">Cantidad</div>
                <div className="col-span-2 text-right">Precio</div>
                <div className="col-span-2 text-right">Acciones</div>
              </div>

              <div className="divide-y divide-zinc-800/50">
                {filteredStock.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-14 gap-4 p-4 items-center hover:bg-zinc-900/50 transition-colors"
                  >
                    {editingId === item.id ? (
                      <>
                        <div className="col-span-2">
                          <input
                            type="text"
                            value={editForm.sku || item.sku}
                            onChange={(event) => setEditForm({ ...editForm, sku: event.target.value })}
                            className="w-full px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-sm text-white"
                          />
                        </div>
                        <div className="col-span-4">
                          <input
                            type="text"
                            value={editForm.nombre || item.nombre}
                            onChange={(event) =>
                              setEditForm({ ...editForm, nombre: event.target.value })
                            }
                            className="w-full px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-sm text-white"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="text"
                            value={editForm.meli_sku ?? item.meli_sku ?? ""}
                            onChange={(event) =>
                              setEditForm({ ...editForm, meli_sku: event.target.value })
                            }
                            className="w-full px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-sm text-white"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            value={editForm.cantidad ?? item.cantidad}
                            onChange={(event) =>
                              setEditForm({
                                ...editForm,
                                cantidad: parseInt(event.target.value, 10) || 0,
                              })
                            }
                            className="w-full px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-sm text-white text-center"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            value={editForm.precio ?? item.precio}
                            onChange={(event) =>
                              setEditForm({
                                ...editForm,
                                precio: parseFloat(event.target.value) || 0,
                              })
                            }
                            className="w-full px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-sm text-white text-right"
                          />
                        </div>
                        <div className="col-span-2 flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingId(null);
                              setEditForm({});
                            }}
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
                        <div className="col-span-2">
                          <p className="font-mono text-sm text-yellow-400">{item.sku}</p>
                          <p className="text-[10px] text-zinc-500 truncate">
                            {item.item_id || "Sin item_id"}
                          </p>
                        </div>
                        <div className="col-span-4">
                          <p className="text-sm text-white truncate" title={item.nombre}>
                            {item.nombre}
                          </p>
                          <p className="text-[10px] text-zinc-500 truncate">
                            {item.cuenta_id || "Sin cuenta vinculada"}
                          </p>
                        </div>
                        <div className="col-span-2">
                          {item.meli_sku ? (
                            <p className="text-sm text-cyan-300 font-medium truncate">
                              {item.meli_sku}
                            </p>
                          ) : (
                            <p className="text-xs text-orange-300">Sin asignar</p>
                          )}
                        </div>
                        <div
                          className={`col-span-2 text-center text-sm font-medium ${
                            item.cantidad <= 5 ? "text-red-400" : "text-green-400"
                          }`}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => adjustStockQuick(item, -1)}
                              className="p-1 rounded bg-zinc-950 text-zinc-300 hover:text-red-400"
                              title="Descontar 1"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span>{item.cantidad}</span>
                            <button
                              onClick={() => adjustStockQuick(item, 1)}
                              className="p-1 rounded bg-zinc-950 text-zinc-300 hover:text-green-400"
                              title="Sumar 1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="col-span-2 text-right text-sm text-zinc-300">
                          ${item.precio?.toLocaleString("es-AR")}
                        </div>
                        <div className="col-span-2 flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingId(item.id);
                              setEditForm(item);
                            }}
                            className="p-1 text-zinc-400 hover:text-white"
                            title="Editar manualmente"
                          >
                            <PencilLine className="w-4 h-4" />
                          </button>
                          {item.item_id && (
                            <a
                              href={`https://articulo.mercadolibre.com.ar/${item.item_id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 text-zinc-400 hover:text-cyan-300"
                              title="Abrir publicación"
                            >
                              <Link2 className="w-4 h-4" />
                            </a>
                          )}
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