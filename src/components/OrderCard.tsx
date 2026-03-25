"use client";

import {
  WorkOrder,
  REPAIR_STATUS_LABELS,
  REPAIR_STATUS_COLORS,
  CLIENT_NOTIFICATION_LABELS,
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
} from "lucide-react";
import { useState } from "react";
import { exportOrderDetailPDF } from "@/lib/exportPDF";

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
  const overdue = isOverdue90Days(order);
  const waitingDays = daysWaitingForPickup(order);
  const waUrl = buildWhatsAppUrl(order.clientPhone, buildWhatsAppMessage(order));

  const handleDelete = () => {
    if (confirm(`¿Eliminar la orden de ${order.clientName}? Esta acción no se puede deshacer.`)) {
      onDelete(order.id);
    }
  };

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 overflow-hidden
        ${overdue
          ? "bg-red-950/60 border-red-600 shadow-red-900/30 shadow-lg"
          : "bg-gray-900 border-gray-700"
        }`}
    >
      {/* Alerta 90 días */}
      {overdue && waitingDays !== null && (
        <div className="bg-red-600 px-4 py-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-white flex-shrink-0" />
          <span className="text-white text-sm font-bold">
            ALERTA: {waitingDays} días esperando retiro
          </span>
        </div>
      )}

      <div className="p-4">
        {/* Fila principal */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Tipo motor + estado */}
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span
                className={`text-xs font-black px-2.5 py-1 rounded-lg border
                  ${order.motorType === "2T"
                    ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                    : "bg-orange-500/20 text-orange-300 border-orange-500/40"
                  }`}
              >
                {order.motorType}
              </span>
              <span className={`badge ${REPAIR_STATUS_COLORS[order.status]}`}>
                {REPAIR_STATUS_LABELS[order.status]}
              </span>
              {order.budgetAccepted && (
                <span className="badge bg-green-900/50 text-green-400 border-green-600">
                  <CheckCircle className="w-3 h-3" />
                  Presup. OK
                </span>
              )}
            </div>

            {/* Cliente */}
            <h3 className="text-white font-bold text-lg leading-tight truncate">
              {order.clientName}
            </h3>
            <p className="text-gray-400 text-sm">
              {order.brand} {order.model}
            </p>
          </div>

          {/* Acciones rápidas */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Abrir WhatsApp"
              className="btn btn-whatsapp btn-sm px-3 rounded-xl"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="hidden sm:inline text-sm">WA</span>
            </a>
            <button
              onClick={() => exportOrderDetailPDF(order)}
              className="btn btn-sm px-3 rounded-xl bg-gray-800 text-red-400 hover:bg-red-900/30 border border-gray-700"
              title="Descargar PDF"
            >
              <FileText className="w-4 h-4" />
            </button>
            <button
              onClick={() => onEdit(order)}
              className="btn btn-secondary btn-sm px-3 rounded-xl"
              title="Editar"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleDelete}
              className="btn btn-sm px-3 rounded-xl bg-gray-800 text-gray-500 hover:text-red-400 hover:bg-red-900/30 border border-gray-700"
              title="Eliminar"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Fila info */}
        <div className="flex flex-wrap gap-3 mt-3 text-sm">
          <span className="flex items-center gap-1.5 text-gray-400">
            <Calendar className="w-3.5 h-3.5 text-gray-500" />
            Ingreso: <span className="text-gray-200">{formatDate(order.entryDate)}</span>
          </span>
          {order.budget !== null && (
            <span className="flex items-center gap-1.5 text-gray-400">
              <DollarSign className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-gray-200 font-semibold">{formatCurrency(order.budget)}</span>
            </span>
          )}
          {order.estimatedDays !== null && (
            <span className="flex items-center gap-1.5 text-gray-400">
              <Clock className="w-3.5 h-3.5 text-gray-500" />
              {order.estimatedDays}d estimado
            </span>
          )}
          <span className={`flex items-center gap-1.5 ${NOTIFICATION_COLORS[order.clientNotification] ?? "text-gray-400"}`}>
            <Phone className="w-3.5 h-3.5" />
            {CLIENT_NOTIFICATION_LABELS[order.clientNotification]}
          </span>
        </div>

        {/* Expandir / Contraer */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 mt-3 text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {expanded ? "Ver menos" : "Ver detalle"}
        </button>

        {expanded && (
          <div className="mt-3 pt-3 border-t border-gray-700/60 space-y-2">
            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Fallas reportadas</span>
              <p className="text-gray-300 text-sm mt-0.5 whitespace-pre-wrap">{order.reportedIssues}</p>
            </div>
            {order.internalNotes && (
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notas internas</span>
                <p className="text-gray-300 text-sm mt-0.5 whitespace-pre-wrap">{order.internalNotes}</p>
              </div>
            )}
            {order.completionDate && (
              <p className="text-xs text-gray-500">
                Listo para retiro: <span className="text-gray-300">{formatDate(order.completionDate)}</span>
              </p>
            )}
            {order.deliveryDate && (
              <p className="text-xs text-gray-500">
                Entregado: <span className="text-gray-300">{formatDate(order.deliveryDate)}</span>
              </p>
            )}
            <p className="text-xs text-gray-600">ID: {order.id}</p>
          </div>
        )}
      </div>
    </div>
  );
}
