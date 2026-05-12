"use client";

import { OrderFilters } from "@/hooks/useOrders";
import { RepairStatus, MotorType, REPAIR_STATUS_LABELS } from "@/lib/types";
import { Search, AlertTriangle, X } from "lucide-react";

interface FiltersBarProps {
  filters: OrderFilters;
  onChange: (f: OrderFilters) => void;
  totalCount: number;
  filteredCount: number;
}

const MOTOR_OPTIONS: { value: MotorType | "all"; label: string; emoji: string }[] = [
  { value: "all",               label: "Todos",            emoji: "⚙️" },
  { value: "desmalezadora",     label: "Desmalezadora",    emoji: "🌿" },
  { value: "motosierra",        label: "Motosierra",       emoji: "🪚" },
  { value: "grupo_electrogeno", label: "Grupo Elec.",      emoji: "⚡" },
  { value: "otros",             label: "Otros",            emoji: "🔧" },
];

const STATUS_OPTIONS: { value: RepairStatus | "all"; label: string }[] = [
  { value: "all", label: "Todos los estados" },
  { value: "ingresado", label: REPAIR_STATUS_LABELS.ingresado },
  { value: "diagnosticando", label: REPAIR_STATUS_LABELS.diagnosticando },
  { value: "esperando_repuesto", label: REPAIR_STATUS_LABELS.esperando_repuesto },
  { value: "en_reparacion", label: REPAIR_STATUS_LABELS.en_reparacion },
  { value: "listo_para_retiro", label: REPAIR_STATUS_LABELS.listo_para_retiro },
  { value: "entregado", label: REPAIR_STATUS_LABELS.entregado },
];

export default function FiltersBar({ filters, onChange, totalCount, filteredCount }: FiltersBarProps) {
  const hasActiveFilters =
    filters.motorType !== "all" ||
    filters.status !== "all" ||
    filters.search !== "" ||
    filters.overdueOnly;

  const reset = () =>
    onChange({ motorType: "all", status: "all", search: "", overdueOnly: false });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col lg:flex-row gap-4 items-center">
        {/* Búsqueda */}
        <div className="relative w-full lg:w-[400px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por cliente, marca, modelo..."
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            className="w-full rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 outline-none transition-all"
            style={{ background: "#111113", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "inset 0 2px 4px 0 rgba(0,0,0,0.2)" }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
          />
          {filters.search && (
            <button onClick={() => onChange({ ...filters, search: "" })} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Píldoras de filtro */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:flex-1">
          {MOTOR_OPTIONS.map(({ value, label, emoji }) => (
            <button
              key={value}
              onClick={() => onChange({ ...filters, motorType: value as MotorType | "all" })}
              className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all border ${
                filters.motorType === value
                  ? "bg-[#27272a] border-white/20 text-white"
                  : "bg-[#111113] border-white/[0.08] text-gray-400 hover:bg-[#27272a] hover:text-white"
              }`}
            >
              <span>{emoji}</span> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-between items-center border-t border-white/[0.06] pt-4 mt-2">
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">Mostrando <span className="text-white font-medium">{filteredCount}</span> de <span className="text-white font-medium">{totalCount}</span> órdenes</span>
          <select
            value={filters.status}
            onChange={(e) => onChange({ ...filters, status: e.target.value as RepairStatus | "all" })}
            className="rounded-md pl-3 pr-8 py-1 text-xs text-white appearance-none cursor-pointer hidden sm:block"
            style={{ background: "#111113", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            {STATUS_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button onClick={reset} className="px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-colors bg-[#111113] border border-white/[0.08] text-gray-400 hover:bg-[#27272a] hover:text-white">
              <X className="w-3 h-3" /> Limpiar
            </button>
          )}
          <button
            onClick={() => onChange({ ...filters, overdueOnly: !filters.overdueOnly })}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-colors border ${
              filters.overdueOnly
                ? "bg-red-600/20 text-red-400 border-red-600"
                : "bg-[#111113] border-white/[0.08] text-gray-400 hover:bg-[#27272a] hover:text-white"
            }`}
          >
            <AlertTriangle className="w-3 h-3" /> +90d
          </button>
        </div>
      </div>
    </div>
  );
}
