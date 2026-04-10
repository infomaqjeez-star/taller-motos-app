import { WorkOrder } from "./types";
import { buildWhatsAppUrl, isOverdue90Days, daysWaitingForPickup } from "./utils";

// â”€â”€â”€ Notification types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type NotificationType =
  | "budget_ready"        // Presupuesto listo para comunicar
  | "repair_complete"     // Equipo listo para retirar
  | "no_response"         // Sin respuesta del cliente
  | "overdue_pickup"      // MÃ¡s de 90 dÃ­as esperando retiro
  | "waiting_parts"       // Esperando repuesto â€” avisar al cliente
  | "custom";             // Mensaje personalizado

export interface NotificationTemplate {
  type: NotificationType;
  label: string;
  icon: string;
  color: string;
  buildMessage: (order: WorkOrder) => string;
}

export interface SentNotification {
  id: string;
  orderId: string;
  clientName: string;
  clientPhone: string;
  type: NotificationType;
  message: string;
  sentAt: string; // ISO
}

// â”€â”€â”€ Message templates â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
  {
    type: "budget_ready",
    label: "Presupuesto listo",
    icon: "dollar",
    color: "blue",
    buildMessage: (o) =>
      `Hola ${o.clientName} ðŸ‘‹, le informamos que el presupuesto para su ${o.brand} ${o.model} estÃ¡ listo.\n\n` +
      `ðŸ’° Monto: $${o.budget ?? "a confirmar"}\n` +
      `â± Tiempo estimado: ${o.estimatedDays ? `${o.estimatedDays} dÃ­as` : "a confirmar"}\n\n` +
      `Por favor, confirme si acepta el presupuesto para iniciar la reparaciÃ³n.\n\nGracias â€” Taller MAQJEEZ`,
  },
  {
    type: "repair_complete",
    label: "Equipo listo para retiro",
    icon: "check",
    color: "green",
    buildMessage: (o) =>
      `Hola ${o.clientName} ðŸ‘‹, Â¡buenas noticias! Su ${o.brand} ${o.model} (${o.motorType}) ya estÃ¡ lista para ser retirada.\n\n` +
      `ðŸ“ Puede pasar por el taller en el horario de atenciÃ³n.\n\n` +
      `Gracias por confiar en Taller MAQJEEZ ðŸ”§`,
  },
  {
    type: "no_response",
    label: "Sin respuesta â€” seguimiento",
    icon: "phone",
    color: "yellow",
    buildMessage: (o) =>
      `Hola ${o.clientName}, le escribimos nuevamente desde Taller MAQJEEZ.\n\n` +
      `Intentamos contactarle por su ${o.brand} ${o.model} y no tuvimos respuesta.\n\n` +
      `Por favor, comunÃ­quese a la brevedad. Gracias.`,
  },
  {
    type: "overdue_pickup",
    label: "MÃ¡s de 90 dÃ­as â€” retiro urgente",
    icon: "alert",
    color: "red",
    buildMessage: (o) => {
      const days = daysWaitingForPickup(o) ?? 90;
      return (
        `Hola ${o.clientName}, le informamos que su ${o.brand} ${o.model} lleva ${days} dÃ­as en nuestro taller esperando ser retirado.\n\n` +
        `âš ï¸ Le pedimos que se comunique o pase a retirar el equipo a la brevedad para evitar inconvenientes.\n\n` +
        `Taller MAQJEEZ â€” Tel/WA: [su nÃºmero]`
      );
    },
  },
  {
    type: "waiting_parts",
    label: "Esperando repuesto",
    icon: "package",
    color: "orange",
    buildMessage: (o) =>
      `Hola ${o.clientName} ðŸ‘‹, le informamos que su ${o.brand} ${o.model} estÃ¡ en proceso de reparaciÃ³n.\n\n` +
      `ðŸ”§ Actualmente estamos esperando la llegada de un repuesto para continuar.\n` +
      `Le avisaremos en cuanto tengamos novedades.\n\nGracias â€” Taller MAQJEEZ`,
  },
];

// â”€â”€â”€ Auto-detect pending notifications â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface PendingNotification {
  order: WorkOrder;
  template: NotificationTemplate;
  whatsappUrl: string;
  alreadySent: boolean;
  sentAt?: string;
}

export function detectPendingNotifications(
  orders: WorkOrder[],
  sentLog: SentNotification[]
): PendingNotification[] {
  const pending: PendingNotification[] = [];

  for (const order of orders) {
    if (order.status === "entregado") continue;

    const addIfNeeded = (type: NotificationType) => {
      const template = NOTIFICATION_TEMPLATES.find((t) => t.type === type)!;
      const message = template.buildMessage(order);
      const lastSent = sentLog
        .filter((s) => s.orderId === order.id && s.type === type)
        .sort((a, b) => b.sentAt.localeCompare(a.sentAt))[0];

      pending.push({
        order,
        template,
        whatsappUrl: buildWhatsAppUrl(order.clientPhone, message),
        alreadySent: !!lastSent,
        sentAt: lastSent?.sentAt,
      });
    };

    // Budget ready but not yet notified & not accepted
    if (
      order.budget !== null &&
      !order.budgetAccepted &&
      (order.clientNotification === "pendiente_de_aviso" ||
        order.clientNotification === "sin_respuesta")
    ) {
      addIfNeeded("budget_ready");
    }

    // Repair complete â€” needs pickup notification
    if (
      order.status === "listo_para_retiro" &&
      order.clientNotification !== "avisado"
    ) {
      addIfNeeded("repair_complete");
    }

    // Overdue 90 days
    if (isOverdue90Days(order)) {
      addIfNeeded("overdue_pickup");
    }

    // No response follow-up
    if (order.clientNotification === "sin_respuesta") {
      addIfNeeded("no_response");
    }

    // Waiting for parts
    if (order.status === "esperando_repuesto") {
      addIfNeeded("waiting_parts");
    }
  }

  // Deduplicate: one entry per order+type, prefer unsent first
  const seen = new Set<string>();
  return pending.filter((p) => {
    const key = `${p.order.id}-${p.template.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// â”€â”€â”€ Sent log storage â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const SENT_LOG_KEY = "maqjeez_sent_notifications";

export function getSentLog(): SentNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SENT_LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addToSentLog(entry: SentNotification): void {
  const log = getSentLog();
  localStorage.setItem(SENT_LOG_KEY, JSON.stringify([entry, ...log]));
}

export function clearSentLog(): void {
  localStorage.removeItem(SENT_LOG_KEY);
}
