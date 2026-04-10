"use client";

interface MetricsBarProps {
  claims: number;                    // Tasa de reclamos (0-1, ej: 0.0126 = 1.26%)
  cancellations: number;             // Tasa de cancelaciones (0-1)
  delayedHandlingTime: number;       // Tasa de demora en despacho (0-1)
  claimsLimit?: number;              // LÃ­mite para advertencia (default 0.015 = 1.5%)
  cancellationsLimit?: number;       // LÃ­mite para advertencia (default 0.005 = 0.5%)
  delayLimit?: number;               // LÃ­mite para advertencia (default 0.10 = 10%)
  measurementPeriod?: string;        // Ej: "Ãšltimos 60 dÃ­as"
}

export default function MetricsBar({
  claims,
  cancellations,
  delayedHandlingTime,
  claimsLimit = 0.015,
  cancellationsLimit = 0.005,
  delayLimit = 0.10,
  measurementPeriod = "Ãšltimos 60 dÃ­as",
}: MetricsBarProps) {
  // Determinar estado visual (rojo si crÃ­tico, amarillo si advertencia, verde si OK)
  const getStatus = (value: number, warn: number, critical: number) => {
    if (value >= critical) return { color: "#ef4444", icon: "ðŸ”´", label: "CrÃ­tico" };
    if (value >= warn) return { color: "#FFE600", icon: "ðŸŸ¡", label: "Advertencia" };
    return { color: "#39FF14", icon: "ðŸŸ¢", label: "OK" };
  };

  const claimsStatus = getStatus(claims, claimsLimit * 0.75, claimsLimit);
  const cancellationsStatus = getStatus(cancellations, cancellationsLimit, cancellationsLimit * 2);
  const delayStatus = getStatus(delayedHandlingTime, delayLimit, delayLimit);

  const metrics = [
    {
      label: "Reclamos",
      value: claims,
      limit: claimsLimit,
      status: claimsStatus,
    },
    {
      label: "Canceladas",
      value: cancellations,
      limit: cancellationsLimit,
      status: getStatus(cancellations, cancellationsLimit, cancellationsLimit * 2),
    },
    {
      label: "Demora EnvÃ­os",
      value: delayedHandlingTime,
      limit: delayLimit,
      status: delayStatus,
    },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#6B7280" }}>
          ReputaciÃ³n ({measurementPeriod})
        </p>
      </div>

      <div className="space-y-2">
        {metrics.map((metric, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-gray-300 flex items-center gap-1">
                  {metric.status.icon}
                  {metric.label}
                </span>
                <span
                  className="text-xs font-bold"
                  style={{ color: metric.status.color }}
                >
                  {(metric.value * 100).toFixed(2)}%
                </span>
              </div>
              {/* Barra de progreso */}
              <div
                className="h-2 rounded-full overflow-hidden"
                style={{ background: "rgba(255,255,255,0.1)" }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min((metric.value / metric.limit) * 100, 100)}%`,
                    background: metric.status.color,
                  }}
                />
              </div>
              <span className="text-[9px] text-gray-500">
                LÃ­mite: {(metric.limit * 100).toFixed(2)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
