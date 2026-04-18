"use client";

import { Store, ShoppingCart, DollarSign, AlertTriangle } from "lucide-react";
import { StatCard } from "./StatCard";

interface Props {
  accountsCount: number;
  salesToday: number;
  totalAmount: number;
  urgentAlerts: number;
}

function fmt(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
}

export default function KpiBar({ accountsCount, salesToday, totalAmount, urgentAlerts }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
      {/* Cuentas Activas */}
      <StatCard
        icon={<Store className="w-16 h-16 text-white" />}
        label="Cuentas Activas"
        value={accountsCount}
      />

      {/* Ventas Hoy */}
      <StatCard
        icon={<ShoppingCart className="w-16 h-16 text-emerald-400" />}
        label="Ventas Hoy"
        value={salesToday}
        sublabel={salesToday > 0 ? `↑ ${salesToday}` : undefined}
        variant="green"
      />

      {/* Facturado Hoy */}
      <StatCard
        icon={<DollarSign className="w-16 h-16 text-amber-400" />}
        label="Facturado Hoy"
        value={fmt(totalAmount)}
        variant="amber"
      />

      {/* Pendientes Urgentes */}
      <StatCard
        icon={<AlertTriangle className="w-16 h-16 text-red-400" />}
        label="Pendientes Urgentes"
        value={urgentAlerts}
        variant={urgentAlerts > 0 ? "red" : "neutral"}
      />
    </div>
  );
}
