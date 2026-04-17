"use client";

import { ProgressBar } from "./ProgressBar";

interface MetricsBarProps {
  claims: number;                    // Tasa de reclamos (0-1, ej: 0.0126 = 1.26%)
  cancellations: number;             // Tasa de cancelaciones (0-1)
  delayedHandlingTime: number;       // Tasa de demora en despacho (0-1)
  claimsLimit?: number;              // Límite para advertencia (default 0.015 = 1.5%)
  cancellationsLimit?: number;       // Límite para advertencia (default 0.005 = 0.5%)
  delayLimit?: number;               // Límite para advertencia (default 0.10 = 10%)
  measurementPeriod?: string;        // Ej: "Últimos 60 días"
}

export default function MetricsBar({
  claims,
  cancellations,
  delayedHandlingTime,
  claimsLimit = 0.015,
  cancellationsLimit = 0.005,
  delayLimit = 0.10,
  measurementPeriod = "Últimos 60 días",
}: MetricsBarProps) {
  // Determinar color basado en el valor
  const getColor = (value: number, limit: number) => {
    const percentage = value / limit;
    if (percentage >= 0.9) return "danger";
    if (percentage >= 0.7) return "warning";
    return "success";
  };

  const metrics = [
    {
      label: "Reclamos",
      value: claims * 100,
      limit: claimsLimit * 100,
      color: getColor(claims, claimsLimit) as "success" | "warning" | "danger",
    },
    {
      label: "Canceladas",
      value: cancellations * 100,
      limit: cancellationsLimit * 100,
      color: getColor(cancellations, cancellationsLimit) as "success" | "warning" | "danger",
    },
    {
      label: "Demora Envíos",
      value: delayedHandlingTime * 100,
      limit: delayLimit * 100,
      color: getColor(delayedHandlingTime, delayLimit) as "success" | "warning" | "danger",
    },
  ];

  return (
    <div className="space-y-8">
      <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">
        Salud de la Cuenta ({measurementPeriod})
      </h3>
      
      {metrics.map((metric, idx) => (
        <ProgressBar
          key={idx}
          label={metric.label}
          value={metric.value}
          maxValue={metric.limit * 1.5}
          unit="%"
          limit={`${metric.limit.toFixed(2)}%`}
          color={metric.color}
          showMarker={true}
          markerPosition={(metric.limit / (metric.limit * 1.5)) * 100}
        />
      ))}
    </div>
  );
}
