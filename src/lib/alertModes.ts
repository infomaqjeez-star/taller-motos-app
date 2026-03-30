/**
 * Configuración de Modos de Alerta Unificados
 * Define el comportamiento y estilo de alertas según el contexto (oficina, taller, urgente)
 */

export type AlertMode = "discreto" | "taller" | "urgente";

export interface AlertModeConfig {
  label: string;
  duration: number;
  style: string;
  icon: string;
  animation: string;
}

export const ALERT_MODES: Record<AlertMode, AlertModeConfig> = {
  discreto: {
    label: "Oficina (Discreto)",
    duration: 3000,
    style: "bg-blue-600",
    icon: "🔹",
    animation: "",
  },
  taller: {
    label: "Taller (Estándar)",
    duration: 8000,
    style: "bg-green-600",
    icon: "🔔",
    animation: "",
  },
  urgente: {
    label: "Ruidoso (Urgente)",
    duration: 25000, // Alerta extra larga de 25 segundos
    style: "bg-red-600",
    icon: "⚠️",
    animation: "animate-pulse", // Hace que la alerta parpadee
  },
};

// Key para localStorage
export const ALERT_MODE_STORAGE_KEY = "maqjeez_alert_mode";
