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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Cuentas Activas */}
      <StatCard
        icon={<Store className="w-16 h-16 text-white" />}
        label="Cuentas Activas"
        value={accountsCount}
      />

      {/* Ventas Hoy */}
      <StatCard
        icon={<ShoppingCart className="w-16 h-16 text-jeez-success" />}
        label="Ventas Hoy"
        value={salesToday}
        sublabel={salesToday > 0 ? `↑ ${salesToday}` : undefined}
        variant="success"
      />

      {/* Facturado Hoy */}
      <StatCard
        icon={<DollarSign className="w-16 h-16 text-jeez-gold" />}
        label="Facturado Hoy"
        value={fmt(totalAmount)}
        variant="gold"
      />

      {/* Pendientes Urgentes */}
      <StatCard
        icon={<AlertTriangle className="w-16 h-16 text-jeez-danger" />}
        label="Pendientes Urgentes"
        value={urgentAlerts}
        variant={urgentAlerts > 0 ? "danger" : "default"}
      />
    </div>
  );
}
