"use client";

import { MessageCircle, MessageSquare, Truck, AlertTriangle } from "lucide-react";

interface UrgentMetricsProps {
  questions: number;
  messages: number;
  shipments: number;
  claims: number;
  onQuestionsClick?: () => void;
  onMessagesClick?: () => void;
  onShipmentsClick?: () => void;
  onClaimsClick?: () => void;
}

export default function UrgentMetrics({
  questions,
  messages,
  shipments,
  claims,
  onQuestionsClick,
  onMessagesClick,
  onShipmentsClick,
  onClaimsClick,
}: UrgentMetricsProps) {
  const metrics = [
    {
      icon: <MessageCircle className="w-4 h-4" />,
      label: "Preguntas",
      value: questions,
      color: "#FF5722",
      onClick: onQuestionsClick,
    },
    {
      icon: <MessageSquare className="w-4 h-4" />,
      label: "Mensajes",
      value: messages,
      color: "#FF9800",
      onClick: onMessagesClick,
    },
    {
      icon: <Truck className="w-4 h-4" />,
      label: "Envíos",
      value: shipments,
      color: "#00E5FF",
      onClick: onShipmentsClick,
    },
    {
      icon: <AlertTriangle className="w-4 h-4" />,
      label: "Reclamos",
      value: claims,
      color: "#EF4444",
      onClick: onClaimsClick,
    },
  ];

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#6B7280" }}>
        Pendientes Urgentes
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {metrics.map((metric, idx) => (
          <button
            key={idx}
            onClick={metric.onClick}
            className="rounded-lg p-3 flex flex-col gap-1.5 transition-all hover:scale-105 active:scale-95"
            style={{
              background: metric.value > 0 ? metric.color + "18" : "#1F1F1F",
              border: `1px solid ${metric.value > 0 ? metric.color + "55" : "rgba(255,255,255,0.07)"}`,
              cursor: metric.onClick ? "pointer" : "default",
            }}
          >
            {/* Ícono + Valor */}
            <div className="flex items-center justify-between">
              <span style={{ color: metric.value > 0 ? metric.color : "#6B7280" }}>
                {metric.icon}
              </span>
              <span
                className="text-xl font-black"
                style={{ color: metric.value > 0 ? metric.color : "#6B7280" }}
              >
                {metric.value}
              </span>
            </div>

            {/* Label */}
            <span className="text-[9px] font-semibold text-gray-400 text-left">
              {metric.label}
            </span>

            {/* Indicador pulsante si hay urgencias */}
            {metric.value > 0 && (
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse self-start"
                style={{ background: metric.color }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
