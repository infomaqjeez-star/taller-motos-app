"use client";

interface ProgressBarProps {
  label: string;
  value: number;
  maxValue?: number;
  unit?: string;
  limit?: string;
  color?: "success" | "warning" | "danger";
  showMarker?: boolean;
  markerPosition?: number;
}

export function ProgressBar({
  label,
  value,
  maxValue = 100,
  unit = "%",
  limit,
  color = "success",
  showMarker = true,
  markerPosition
}: ProgressBarProps) {
  const percentage = Math.min((value / maxValue) * 100, 100);
  
  const colorStyles = {
    success: {
      dot: "bg-jeez-success shadow-[0_0_8px_#22c55e]",
      bar: "from-green-600 to-green-400 shadow-[0_0_10px_#22c55e]"
    },
    warning: {
      dot: "bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.8)]",
      bar: "from-yellow-600 to-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.5)]"
    },
    danger: {
      dot: "bg-jeez-danger shadow-[0_0_8px_#ef4444]",
      bar: "from-red-600 to-red-400 shadow-[0_0_10px_#ef4444]"
    }
  };

  const actualMarkerPosition = markerPosition ?? percentage;

  return (
    <div className="group">
      <div className="flex justify-between items-end mb-2">
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${colorStyles[color].dot}`}></span>
          <span className="text-sm font-bold text-gray-200 tracking-wide">{label}</span>
        </div>
        <div className="text-right">
          <span className={`font-black text-lg ${
            color === "success" ? "text-jeez-success" : 
            color === "warning" ? "text-yellow-500" : "text-jeez-danger"
          }`}>
            {value}{unit}
          </span>
        </div>
      </div>
      
      <div className="h-3 w-full bg-black rounded-full overflow-hidden border border-white/5 shadow-inner relative">
        {showMarker && (
          <div 
            className="absolute top-0 bottom-0 w-[1px] bg-white/30 z-20"
            style={{ left: `${actualMarkerPosition}%` }}
          />
        )}
        <div 
          className={`h-full bg-gradient-to-r ${colorStyles[color].bar} relative z-10 transition-all duration-1000 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      {limit && (
        <p className="text-[10px] text-gray-600 font-mono mt-2">Límite crítico: {limit}</p>
      )}
    </div>
  );
}
