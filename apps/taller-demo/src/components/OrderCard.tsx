"use client";

import {
  WorkOrder,
  REPAIR_STATUS_LABELS,
  REPAIR_STATUS_COLORS,
  CLIENT_NOTIFICATION_LABELS,
  MOTOR_TYPE_LABELS,
} from "@/lib/types";
import {
  formatDate,
  formatCurrency,
  isOverdue90Days,
  daysWaitingForPickup,
  buildWhatsAppUrl,
  buildWhatsAppMessage,
} from "@/lib/utils";
import {
  Phone,
  Calendar,
  Clock,
  DollarSign,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  Printer,
  User,
  Camera,
  Image as ImageIcon,
} from "lucide-react";
import { useState } from "react";
import { exportOrderDetailPDF } from "@/lib/exportPDF";
import PaymentModal from "@/components/PaymentModal";
import PrintOrder from "@/components/PrintOrder";
import ClientHistory from "@/components/ClientHistory";
import PhotoManager from "@/components/PhotoManager";
import BudgetImage from "@/components/BudgetImage";
import { ordersDb } from "@/lib/db";

interface OrderCardProps {
  order: WorkOrder;
  onEdit: (order: WorkOrder) => void;
  onDelete: (id: string) => void;
}

const NOTIFICATION_COLORS: Record<string, string> = {
  pendiente_de_aviso: "text-yellow-400",
  avisado: "text-green-400",
  sin_respuesta: "text-red-400",
};

export default function OrderCard({ order, onEdit, onDelete }: OrderCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showPhotos, setShowPhotos] = useState(false);
  const [showBudget, setShowBudget] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(order);

  const overdue = isOverdue90Days(currentOrder);
  const waitingDays = daysWaitingForPickup(currentOrder);
  const waUrl = buildWhatsAppUrl(currentOrder.clientPhone, buildWhatsAppMessage(currentOrder));

  const handleDelete = () => {
    if (confirm(`¿Eliminar la orden de ${currentOrder.clientName}?`)) {
      onDelete(currentOrder.id);
    }
  };

  const statusBorderColor = overdue
    ? "rgba(239,68,68,0.8)"
    : currentOrder.status === "en_reparacion"
    ? "rgba(59,130,246,0.8)"
    : currentOrder.status === "listo_para_retiro"
    ? "rgba(16,185,129,0.8)"
    : currentOrder.status === "esperando_repuesto"
    ? "rgba(245,158,11,0.8)"
    : "rgba(239,68,68,0.6)";

  return (
    <>
      <div
        className="rounded-xl p-5 flex flex-col md:flex-row gap-6 relative group transition-all duration-200 overflow-hidden"
        style={{
          background: "#18181b",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 4px 24px -4px rgba(0,0,0,0.5), inset 0 1px 0 0 rgba(255,255,255,0.05)",
          borderLeft: `3px solid ${statusBorderColor}`,
        }}
      >
        {/* Alerta 90 días */}
        {overdue && waitingDays !== null && (
          <div className="absolute top-0 left-0 right-0 px-4 py-1.5 flex items-center gap-2" style={{ background: "rgba(239,68,68,0.9)" }}>
            <AlertTriangle className="w-3 h-3 text-white flex-shrink-0" />
            <span className="text-white text-xs font-bold">ALERTA: {waitingDays} días esperando retiro</span>
          </div>
        )}

        {/* Columna Izquierda: Info Principal */}
        <div className="flex-1 flex flex-col pl-2" style={{ paddingTop: overdue ? "2rem" : "0" }}>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)", color: "#a1a1aa" }}>
              {MOTOR_TYPE_LABELS[currentOrder.motorType as keyof typeof MOTOR_TYPE_LABELS] ?? currentOrder.motorType}
              {currentOrder.motorType === "otros" && (currentOrder as WorkOrder & { machineTypeOther?: string }).machineTypeOther ? `: ${(currentOrder as WorkOrder & { machineTypeOther?: string }).machineTypeOther}` : ""}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white text-black">
              {REPAIR_STATUS_LABELS[currentOrder.status]}
            </span>
            {currentOrder.budgetAccepted && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-green-600 text-green-400" style={{ background: "rgba(16,185,129,0.1)" }}>
                <CheckCircle className="w-3 h-3 inline mr-1" />Presup. OK
              </span>
            )}
            {(currentOrder.photoUrls?.length ?? 0) > 0 && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-purple-600 text-purple-400" style={{ background: "rgba(168,85,247,0.1)" }}>
                <Camera className="w-3 h-3 inline mr-1" />{currentOrder.photoUrls.length}
              </span>
            )}
            <span className={`ml-auto flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded border ${
              currentOrder.clientNotification === "pendiente_de_aviso"
                ? "text-yellow-400 bg-yellow-400/10 border-yellow-400/20"
                : currentOrder.clientNotification === "avisado"
                ? "text-green-400 bg-green-400/10 border-green-400/20"
                : "text-red-400 bg-red-400/10 border-red-400/20"
            }`}>
              <Phone className="w-3 h-3" />
              {CLIENT_NOTIFICATION_LABELS[currentOrder.clientNotification]}
            </span>
          </div>

          <h2 className="text-lg font-bold text-white tracking-tight">{currentOrder.clientName}</h2>
          <div className="flex items-center gap-3 text-sm mt-1">
            <span className="text-gray-400 font-medium">{currentOrder.brand} {currentOrder.model}</span>
            <span className="text-white/10">•</span>
            <div className="flex items-center gap-1.5 text-gray-500">
              <Calendar className="w-3 h-3" />
              <span className="font-mono text-xs">{formatDate(currentOrder.entryDate)}</span>
            </div>
          </div>

          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-4 text-xs font-medium text-gray-500 hover:text-white transition-colors flex items-center gap-1 w-max"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? "Ver menos" : "Ver detalle"}
          </button>

          {expanded && (
            <div className="mt-3 pt-3 space-y-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Fallas reportadas</span>
                <p className="text-gray-300 text-sm mt-0.5 whitespace-pre-wrap">{currentOrder.reportedIssues}</p>
              </div>
              {currentOrder.internalNotes && (
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notas internas</span>
                  <p className="text-gray-300 text-sm mt-0.5 whitespace-pre-wrap">{currentOrder.internalNotes}</p>
                </div>
              )}
              {currentOrder.budget !== null && (
                <p className="text-xs text-gray-500">Presupuesto: <span className="text-gray-200 font-semibold">{formatCurrency(currentOrder.budget)}</span></p>
              )}
              {currentOrder.completionDate && (
                <p className="text-xs text-gray-500">Listo: <span className="text-gray-300">{formatDate(currentOrder.completionDate)}</span></p>
              )}
              {currentOrder.deliveryDate && (
                <p className="text-xs text-gray-500">Entregado: <span className="text-gray-300">{formatDate(currentOrder.deliveryDate)}</span></p>
              )}
              {(currentOrder.photoUrls?.length ?? 0) > 0 && (
                <div className="flex gap-2 mt-1 overflow-x-auto pb-1">
                  {currentOrder.photoUrls.map((url, i) => (
                    <img key={i} src={url} alt={`Foto ${i + 1}`} className="h-16 w-16 object-cover rounded-lg border border-gray-700 flex-shrink-0" />
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-600">ID: {currentOrder.id}</p>
            </div>
          )}
        </div>

        {/* Columna Derecha: Acciones */}
        <div className="flex flex-col justify-between gap-3 md:w-[320px] shrink-0 border-t md:border-t-0 md:border-l border-white/[0.06] pt-4 md:pt-0 md:pl-6">
          <div className="flex gap-2">
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-white px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2"
              style={{
                background: "linear-gradient(to bottom, #25D366, #1da851)",
                boxShadow: "0 2px 8px -2px rgba(0,0,0,0.8), inset 0 1px 0 0 rgba(255,255,255,0.1)",
              }}
              title="WhatsApp"
            >
              <MessageCircle className="w-4 h-4" /> Notificar
            </a>
            <button
              onClick={() => onEdit(currentOrder)}
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
              style={{ background: "#27272a", border: "1px solid rgba(255,255,255,0.08)" }}
              title="Editar"
            >
              <Edit2 className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setShowBudget(true)}
              className="px-2 py-1.5 rounded-md text-[11px] font-semibold transition-colors flex items-center justify-center gap-1.5"
              style={{ background: "linear-gradient(to bottom, #27272a, #18181b)", border: "1px solid rgba(255,255,255,0.08)", color: "#FACC15" }}
            >
              <ImageIcon className="w-3 h-3" /> Presupuesto
            </button>
            <button
              onClick={() => setShowPayment(true)}
              className="px-2 py-1.5 rounded-md text-[11px] font-medium transition-colors flex items-center justify-center gap-1.5"
              style={{ background: "#27272a", border: "1px solid rgba(255,255,255,0.08)", color: "#fff" }}
            >
              <DollarSign className="w-3 h-3 text-green-400" /> Pagos
            </button>
            <button
              onClick={() => setShowPrint(true)}
              className="px-2 py-1.5 rounded-md text-[11px] font-medium transition-colors flex items-center justify-center gap-1.5"
              style={{ background: "#27272a", border: "1px solid rgba(255,255,255,0.08)", color: "#fff" }}
            >
              <Printer className="w-3 h-3 text-gray-400" /> Imprimir
            </button>
            <button
              onClick={handleDelete}
              className="px-2 py-1.5 rounded-md text-[11px] font-medium transition-colors flex items-center justify-center gap-1.5"
              style={{ background: "#27272a", border: "1px solid rgba(255,255,255,0.08)", color: "#fff" }}
              title="Eliminar"
            >
              <Trash2 className="w-3 h-3 text-red-400 opacity-70" /> Borrar
            </button>
          </div>
        </div>
      </div>

      {showPayment && <PaymentModal order={currentOrder} onClose={() => setShowPayment(false)} />}
      {showPrint && (
        <PrintOrder
          order={currentOrder}
          onClose={() => setShowPrint(false)}
          onSave={async (updates) => {
            await ordersDb.update(currentOrder.id, updates);
            setCurrentOrder(prev => ({
              ...prev,
              ...(updates.budget !== undefined ? { budget: updates.budget } : {}),
              ...(updates.extraMachines !== undefined ? { extraMachines: updates.extraMachines } : {}),
            }));
          }}
        />
      )}
      {showBudget && <BudgetImage order={currentOrder} onClose={() => setShowBudget(false)} />}
      {showHistory && (
        <ClientHistory
          phone={currentOrder.clientPhone}
          clientName={currentOrder.clientName}
          onClose={() => setShowHistory(false)}
          onSelect={(o) => onEdit(o)}
        />
      )}
      {showPhotos && (
        <PhotoManager
          order={currentOrder}
          onClose={() => setShowPhotos(false)}
          onUpdated={(urls) => setCurrentOrder((prev) => ({ ...prev, photoUrls: urls }))}
        />
      )}
    </>
  );
}
