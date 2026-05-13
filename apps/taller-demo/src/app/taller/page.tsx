"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus, Wrench, AlertTriangle, Package, CheckSquare, Clock,
  FileSpreadsheet, FileText, CheckCircle, MessageCircle, Trophy, Medal,
  BookOpen, ChevronRight, Phone, Mail,
} from "lucide-react";
import { WorkOrder, MOTOR_TYPE_LABELS, CLIENT_NOTIFICATION_LABELS, ClientNotification } from "@/lib/types";
import { useOrders } from "@/hooks/useOrders";
import { useInventory } from "@/hooks/useInventory";
import { useNotifications } from "@/hooks/useNotifications";
import { useMessaging } from "@/hooks/useMessaging";
import { generateId } from "@/lib/utils";
import { exportOrdersToExcel } from "@/lib/exportExcel";
import { exportOrdersReportPDF } from "@/lib/exportPDF";
import { clearSentLog } from "@/lib/notifications";
import { agendaDb, historialDb } from "@/lib/db";
import Navbar from "@/components/Navbar";
import FiltersBar from "@/components/FiltersBar";
import OrderCard from "@/components/OrderCard";
import OrderForm from "@/components/OrderForm";
import NotificationsPanel from "@/components/NotificationsPanel";
import TemplateManager from "@/components/TemplateManager";
import MessengerPanel from "@/components/MessengerPanel";
import BottomNav from "@/components/BottomNav";

/* ── Tarjeta de estado AAA ── */
function StatCard({
  label,
  value,
  icon: Icon,
  accentColor,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  accentColor: string;
}) {
  return (
    <div
      className="rounded-xl p-5 relative overflow-hidden group cursor-pointer transition-all duration-200"
      style={{
        background: "#18181b",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 4px 24px -4px rgba(0,0,0,0.5), inset 0 1px 0 0 rgba(255,255,255,0.05)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
        (e.currentTarget as HTMLElement).style.borderColor = accentColor + "66";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)";
      }}
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: `linear-gradient(to bottom right, ${accentColor}0D, transparent)` }} />
      <div className="flex items-start justify-between mb-4 relative z-10">
        <div className="w-8 h-8 rounded flex items-center justify-center" style={{ background: "#27272a", border: "1px solid rgba(255,255,255,0.08)" }}>
          <Icon className="w-4 h-4" style={{ color: accentColor }} />
        </div>
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "#a1a1aa" }}>{label}</span>
      </div>
      <div className="font-mono text-3xl font-bold text-white relative z-10">{value}</div>
    </div>
  );
}

/* ── Badge de fase de fidelización ── */
function FaseBadge({ compras }: { compras: number }) {
  if (compras >= 50) return (
    <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full border border-yellow-400/60 text-gold" style={{ background: "rgba(255,215,0,0.12)", textShadow: "0 0 6px rgba(255,215,0,0.7)" }}>
      <Trophy className="w-3 h-3" /> ORO
    </span>
  );
  if (compras >= 10) return (
    <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full border border-gray-300/60 text-gray-200" style={{ background: "rgba(200,200,200,0.12)" }}>
      <Medal className="w-3 h-3" /> PLATA
    </span>
  );
  if (compras >= 3) return (
    <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full border border-orange-400/60 text-orange-400" style={{ background: "rgba(255,87,34,0.12)" }}>
      <Medal className="w-3 h-3" /> BRONCE
    </span>
  );
  return null;
}

export default function DashboardPage() {
  const {
    orders,
    filtered,
    filters,
    setFilters,
    create,
    update,
    remove,
    overdueCount,
    loading,
  } = useOrders();
  const { lowStockCount } = useInventory();
  const { pending, sentLog, markSent, unsentCount, refresh: refreshNotifications } =
    useNotifications(orders);

  const [showForm, setShowForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<WorkOrder | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showMessenger, setShowMessenger] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const { messages, unreadCount, newMessageAlert, send, markAllAsRead, remove: removeMsg } = useMessaging();

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), type === "error" ? 8000 : 3500);
  };

  const handleSave = async (order: WorkOrder) => {
    try {
      if (editingOrder) {
        await update(order.id, order);
        agendaDb.upsertByPhone(order.clientName, order.clientPhone).then(async () => {
          const clientes = await agendaDb.getAll();
          const cliente = clientes.find(c => c.telefono === order.clientPhone.trim());
          if (cliente) historialDb.upsert(cliente.id, order).catch(() => {});
        }).catch(() => {});
        showToast("Orden actualizada con éxito");
      } else {
        const newOrder = { ...order, id: generateId(), entryDate: new Date().toISOString() };
        await create(newOrder);
        agendaDb.upsertByPhone(newOrder.clientName, newOrder.clientPhone).then(async () => {
          const clientes = await agendaDb.getAll();
          const cliente = clientes.find(c => c.telefono === newOrder.clientPhone.trim());
          if (cliente) historialDb.upsert(cliente.id, newOrder).catch(() => {});
        }).catch(() => {});
        showToast("¡Orden guardada con éxito!");
      }
      setShowForm(false);
      setEditingOrder(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Error: ${msg}`, "error");
    }
  };

  const handleEdit = (order: WorkOrder) => {
    setEditingOrder(order);
    setShowForm(true);
  };

  const handleClose = () => {
    setShowForm(false);
    setEditingOrder(null);
  };

  const activeOrders       = orders.filter((o) => o.status !== "entregado");
  const readyOrders        = orders.filter((o) => o.status === "listo_para_retiro");
  const inRepairOrders     = orders.filter((o) => o.status === "en_reparacion");
  const waitingPartsOrders = orders.filter((o) => o.status === "esperando_repuesto");

  return (
    <>
      <Navbar
        overdueCount={overdueCount}
        lowStockCount={lowStockCount}
        notificationCount={unsentCount}
        onOpenNotifications={() => setShowNotifications(true)}
      />

      <main className="flex-1 overflow-y-auto p-6 md:p-8" style={{ background: "#09090b" }}>
        <div className="max-w-7xl mx-auto flex flex-col gap-8 pb-12 relative z-10">

          {/* ── KPIs estilo AAA ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Activas" value={activeOrders.length} icon={Wrench} accentColor="#ef4444" />
            <StatCard label="En Reparación" value={inRepairOrders.length} icon={Clock} accentColor="#3b82f6" />
            <StatCard label="Retiro" value={readyOrders.length} icon={CheckSquare} accentColor="#10b981" />
            <StatCard label="Repuestos" value={waitingPartsOrders.length} icon={Package} accentColor="#f59e0b" />
          </div>

        <Link
          href="/catalogo"
          className="card group flex items-center justify-between gap-3 border border-[#FDB71A]/35 bg-[#FDB71A]/5 p-4 transition-colors hover:border-[#FDB71A]/60 hover:bg-[#FDB71A]/10"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#FDB71A]/20 text-[#FDB71A] ring-1 ring-[#FDB71A]/40">
              <BookOpen className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="font-black text-white">Catálogo de precios Maqjeez</p>
              <p className="text-sm text-gray-400">
                Catálogo público (sin datos del taller). Fotos 480×480 en{" "}
                <span className="font-mono text-gray-500">public/catalogo/</span>
              </p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-[#FDB71A] transition-transform group-hover:translate-x-0.5" />
        </Link>

        {/* ── Alerta 90 días ── */}
        {overdueCount > 0 && (
          <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-300 font-bold text-sm">{overdueCount} equipo{overdueCount > 1 ? "s" : ""} con más de 90 días esperando retiro</p>
              <button onClick={() => setFilters({ ...filters, overdueOnly: true })} className="mt-1 text-xs text-red-300 hover:text-red-200 underline underline-offset-2">Ver solo esas órdenes →</button>
            </div>
          </div>
        )}

        {/* ── Filtros + Exportar + Plantillas ── */}
        <FiltersBar filters={filters} onChange={setFilters} totalCount={orders.length} filteredCount={filtered.length} />
        <div className="flex flex-wrap gap-2">
          {filtered.length > 0 && (
            <>
              <button onClick={() => exportOrdersToExcel(filtered)} className="px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-colors" style={{ background: "#111113", border: "1px solid rgba(255,255,255,0.08)", color: "#9ca3af" }}>
                <FileSpreadsheet className="w-3 h-3 text-green-400" /> Excel <span className="text-gray-500">({filtered.length})</span>
              </button>
              <button onClick={() => { const label = filters.motorType !== "all" ? (MOTOR_TYPE_LABELS[filters.motorType] ?? filters.motorType) : filters.status !== "all" ? `Estado: ${filters.status}` : filters.overdueOnly ? "Más de 90 días" : "Todas las órdenes"; exportOrdersReportPDF(filtered, label); }} className="px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-colors" style={{ background: "#111113", border: "1px solid rgba(255,255,255,0.08)", color: "#9ca3af" }}>
                <FileText className="w-3 h-3 text-red-400" /> PDF <span className="text-gray-500">({filtered.length})</span>
              </button>
            </>
          )}
          <button onClick={() => setShowTemplates(true)} className="px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-colors" style={{ background: "#111113", border: "1px solid rgba(255,255,255,0.08)", color: "#9ca3af" }}>
            <MessageCircle className="w-3 h-3 text-green-400" /> Plantillas
          </button>
          <div className="w-px h-6 bg-white/10 mx-1" />
          {/* ── Filtros rápidos por estado de notificación ── */}
          {([
            { key: "pendiente_de_aviso", color: "#eab308", label: CLIENT_NOTIFICATION_LABELS.pendiente_de_aviso },
            { key: "avisado", color: "#22c55e", label: CLIENT_NOTIFICATION_LABELS.avisado },
            { key: "sin_respuesta", color: "#ef4444", label: CLIENT_NOTIFICATION_LABELS.sin_respuesta },
          ] as { key: ClientNotification; color: string; label: string }[]).map((notif) => {
            const count = orders.filter((o) => o.clientNotification === notif.key).length;
            const active = filters.clientNotification === notif.key;
            return (
              <button
                key={notif.key}
                onClick={() => setFilters({ ...filters, clientNotification: active ? "all" : notif.key })}
                className="px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-all border"
                style={{
                  background: active ? `${notif.color}15` : "#111113",
                  borderColor: active ? `${notif.color}60` : "rgba(255,255,255,0.08)",
                  color: active ? notif.color : "#9ca3af",
                }}
                title={`${notif.label} (${count})`}
              >
                <Phone className="w-3 h-3" style={{ color: active ? notif.color : "#9ca3af" }} />
                {notif.label} <span className="font-mono" style={{ color: active ? notif.color : "#6b7280" }}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* ── Lista de órdenes ── */}
        <div className="flex flex-col gap-4">
          {loading ? (
            <div className="flex flex-col items-center py-16 text-center" style={{ background: "#18181b", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "0.75rem" }}>
              <div className="w-10 h-10 border-4 border-[#FF5722] border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-gray-400 font-semibold">Cargando órdenes...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-4" style={{ background: "#18181b", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "0.75rem" }}>
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "rgba(255,87,34,0.12)", border: "2px solid rgba(255,87,34,0.40)" }}>
                <Wrench className="w-8 h-8 text-orange-neon" />
              </div>
              <div>
                <p className="text-gray-300 font-bold text-lg">{orders.length === 0 ? "No hay órdenes de trabajo todavía" : "No se encontraron órdenes con esos filtros"}</p>
                <p className="text-gray-600 text-sm mt-1">{orders.length === 0 ? "Tocá el botón naranja para ingresar tu primer equipo" : "Probá ajustar los filtros"}</p>
              </div>
            </div>
          ) : (
            filtered.map((order) => (
              <OrderCard key={order.id} order={order} onEdit={handleEdit} onDelete={remove} />
            ))
          )}
        </div>
      </div>
      </main>

      {/* ── FAB — Nueva orden (Naranja Maqjeez con glow) ── */}
      <button
        onClick={() => { setEditingOrder(null); setShowForm(true); }}
        className="fixed bottom-[88px] sm:bottom-6 right-4 sm:right-6
                   btn-primary rounded-2xl
                   h-14 w-14 sm:h-auto sm:w-auto sm:px-6 z-40"
        aria-label="Nueva orden"
      >
        <Plus className="w-6 h-6 flex-shrink-0" />
        <span className="hidden sm:inline text-base font-bold">Nueva Orden</span>
      </button>

      {/* ── Botón Mensajería del Taller (estilo MSN) ── */}
      <button
        onClick={() => setShowMessenger(true)}
        className="fixed bottom-[160px] sm:bottom-[80px] right-4 sm:right-6 z-[55]
                   flex items-center justify-center gap-2 relative
                   h-14 w-14 sm:h-12 sm:w-auto sm:px-5
                   rounded-full sm:rounded-2xl"
        style={{
          background: "linear-gradient(135deg, #2563eb, #7c3aed)",
          border: "2px solid rgba(139,92,246,0.6)",
          boxShadow: "0 4px 24px -4px rgba(59,130,246,0.6), 0 0 0 1px rgba(255,255,255,0.05)",
          animation: newMessageAlert ? "msnBounce 0.4s ease 3" : "none",
        }}
        aria-label="Mensajería del taller"
        title="Chat del taller"
      >
        {/* Ícono dos muñequitos estilo MSN Messenger */}
        <svg
          width="28" height="28" viewBox="0 0 48 48" fill="none"
          style={{ filter: newMessageAlert ? "drop-shadow(0 0 8px #fff)" : "none", flexShrink: 0 }}
        >
          {/* Muñequito verde (fondo) */}
          <ellipse cx="17" cy="13" rx="5.5" ry="6" fill="#4ade80" />
          <ellipse cx="17" cy="13" rx="4" ry="4.5" fill="#86efac" />
          <path d="M8 34c0-6 4-10 9-10s9 4 9 10" fill="#4ade80"/>
          <path d="M9 34c0-5.5 3.5-9 8-9s8 3.5 8 9" fill="#86efac" opacity="0.6"/>
          {/* Brillo muñequito verde */}
          <ellipse cx="15" cy="10.5" rx="2" ry="1.5" fill="white" opacity="0.5" transform="rotate(-20 15 10.5)" />
          {/* Muñequito azul (frente) */}
          <ellipse cx="27" cy="15" rx="6.5" ry="7" fill="#38bdf8" />
          <ellipse cx="27" cy="15" rx="4.5" ry="5" fill="#7dd3fc" />
          <path d="M17 38c0-7 4.5-12 10-12s10 5 10 12" fill="#38bdf8"/>
          <path d="M18 38c0-6.5 4-10.5 9-10.5s9 4 9 10.5" fill="#7dd3fc" opacity="0.6"/>
          {/* Brillo muñequito azul */}
          <ellipse cx="24.5" cy="12" rx="2.5" ry="1.8" fill="white" opacity="0.55" transform="rotate(-20 24.5 12)" />
        </svg>
        <span className="hidden sm:inline text-sm font-bold text-white">
          Chat
        </span>
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 min-w-[22px] h-[22px] px-1 rounded-full bg-red-500 text-white text-[11px] font-black flex items-center justify-center border-2 border-[#09090b] shadow-lg">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Keyframe para el rebote MSN inyectado inline */}
      <style>{`
        @keyframes msnBounce {
          0%   { transform: translateY(0); }
          25%  { transform: translateY(-14px); }
          50%  { transform: translateY(0); }
          75%  { transform: translateY(-7px); }
          100% { transform: translateY(0); }
        }
      `}</style>

      <MessengerPanel
        open={showMessenger}
        onClose={() => setShowMessenger(false)}
        messages={messages}
        unreadCount={unreadCount}
        onSend={send}
        onMarkAllRead={markAllAsRead}
        onDelete={removeMsg}
      />

      {showForm && (
        <OrderForm
          initial={editingOrder ?? undefined}
          onSave={handleSave}
          onClose={handleClose}
        />
      )}

      {showNotifications && (
        <NotificationsPanel
          pending={pending}
          sentLog={sentLog}
          onSend={(n, msg) => markSent(n, msg)}
          onClearLog={() => { clearSentLog(); refreshNotifications(); }}
          onClose={() => setShowNotifications(false)}
        />
      )}

      {showTemplates && (
        <TemplateManager onClose={() => setShowTemplates(false)} />
      )}

      <BottomNav
        notificationCount={unsentCount}
        onOpenNotifications={() => setShowNotifications(true)}
      />

      {toast && (
        <div
          className={`fixed bottom-28 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3
            px-5 py-3.5 rounded-2xl shadow-2xl text-white font-semibold text-sm
            ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}
        >
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          {toast.msg}
        </div>
      )}
    </>
  );
}
