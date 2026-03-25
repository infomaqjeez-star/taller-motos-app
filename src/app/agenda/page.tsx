"use client";

import { useState, useEffect, useMemo } from "react";
import { AgendaCliente, WorkOrder, REPAIR_STATUS_LABELS, REPAIR_STATUS_COLORS } from "@/lib/types";
import { agendaDb, ordersDb } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import Navbar from "@/components/Navbar";
import { Users, Search, Phone, ChevronRight, X, Clock, Wrench, Trash2, ChevronDown } from "lucide-react";

function ClienteModal({
  cliente,
  onClose,
}: {
  cliente: AgendaCliente;
  onClose: () => void;
}) {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ordersDb.getAll().then((all) => {
      const found = all
        .filter((o) => o.clientPhone === cliente.telefono)
        .sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime());
      setOrders(found);
      setLoading(false);
    });
  }, [cliente.telefono]);

  const totalGastado = orders.reduce((s, o) => s + (o.budget ?? 0), 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-gray-900 w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl border border-gray-700 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 rounded-xl p-2.5">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">{cliente.nombre}</h2>
              <p className="text-gray-400 text-xs flex items-center gap-1">
                <Phone className="w-3 h-3" /> {cliente.telefono}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost btn-sm p-2.5 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats */}
        {!loading && orders.length > 0 && (
          <div className="grid grid-cols-2 gap-3 px-5 pt-4">
            <div className="card py-3 text-center">
              <p className="text-2xl font-black text-orange-400">{orders.length}</p>
              <p className="text-xs text-gray-500">Reparaciones</p>
            </div>
            <div className="card py-3 text-center">
              <p className="text-2xl font-black text-green-400">
                ${totalGastado.toLocaleString("es-AR")}
              </p>
              <p className="text-xs text-gray-500">Total facturado</p>
            </div>
          </div>
        )}

        {/* Historial */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <Wrench className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>No hay reparaciones registradas</p>
            </div>
          ) : (
            <>
              <p className="text-gray-500 text-xs uppercase tracking-wide font-semibold">
                Historial completo — de más nuevo a más viejo
              </p>
              {orders.map((o, idx) => (
                <div key={o.id} className="card space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-gray-500">#{orders.length - idx}</span>
                      <span
                        className={`text-xs font-black px-2 py-0.5 rounded-lg border
                          ${o.motorType === "2T"
                            ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                            : "bg-orange-500/20 text-orange-300 border-orange-500/40"}`}
                      >
                        {o.motorType}
                      </span>
                      <span className={`badge ${REPAIR_STATUS_COLORS[o.status]}`}>
                        {REPAIR_STATUS_LABELS[o.status]}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 flex items-center gap-1 flex-shrink-0">
                      <Clock className="w-3 h-3" /> {formatDate(o.entryDate)}
                    </span>
                  </div>
                  <p className="text-white font-bold">
                    {o.brand} {o.model}
                  </p>
                  <p className="text-gray-400 text-sm leading-snug line-clamp-2">
                    {o.reportedIssues}
                  </p>
                  {o.budget !== null && (
                    <p className="text-green-400 text-sm font-semibold">
                      ${o.budget.toLocaleString("es-AR")}
                    </p>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AgendaPage() {
  const [clientes, setClientes] = useState<AgendaCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AgendaCliente | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setClientes(await agendaDb.getAll());
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return clientes;
    return clientes.filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        c.telefono.includes(q)
    );
  }, [clientes, search]);

  const handleDelete = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar a ${nombre} de la agenda? Sus órdenes no se borran.`)) return;
    await agendaDb.delete(id);
    await load();
  };

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Title */}
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 rounded-xl p-2.5">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Agenda de Clientes</h1>
            <p className="text-gray-400 text-sm">
              {clientes.length} cliente{clientes.length !== 1 ? "s" : ""} registrado{clientes.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Buscador */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            className="input pl-11"
            placeholder="Buscar por nombre o teléfono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Lista */}
        {loading ? (
          <div className="flex flex-col items-center py-20">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-400">Cargando agenda...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card text-center py-16">
            <Users className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-400 font-semibold">
              {search ? "No se encontraron clientes" : "La agenda está vacía"}
            </p>
            <p className="text-gray-600 text-sm mt-1">
              {search
                ? "Probá con otro nombre o teléfono"
                : "Los clientes se agregan automáticamente al crear órdenes"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {search && (
              <p className="text-gray-500 text-xs">
                {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
              </p>
            )}
            {filtered.map((c) => (
              <div
                key={c.id}
                className="card flex items-center justify-between gap-3 hover:border-blue-500/50 transition-colors cursor-pointer"
                onClick={() => setSelected(c)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-300 font-black text-base">
                      {c.nombre.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-bold truncate">{c.nombre}</p>
                    <p className="text-gray-400 text-sm flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {c.telefono}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(c.id, c.nombre); }}
                    className="p-2 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-900/30 transition-colors"
                    title="Eliminar de la agenda"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {selected && (
        <ClienteModal cliente={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
