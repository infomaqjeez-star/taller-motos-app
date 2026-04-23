"use client";

import { motion } from "framer-motion";
import { 
  MessageCircle, 
  ShoppingCart, 
  Package, 
  AlertTriangle,
  TrendingUp,
  Clock,
  Star,
  Zap
} from "lucide-react";

interface DashboardCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  trend?: { value: number; positive: boolean };
  onClick?: () => void;
}

function DashboardCard({ title, value, subtitle, icon, color, trend, onClick }: DashboardCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl p-5 cursor-pointer transition-all ${
        onClick ? "hover:shadow-lg" : ""
      }`}
      style={{ 
        background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`,
        border: `1px solid ${color}30`,
      }}
    >
      {/* Background glow */}
      <div 
        className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-30"
        style={{ background: color }}
      />
      
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-400 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-white mb-1">{value}</h3>
          {subtitle && (
            <p className="text-xs text-zinc-500">{subtitle}</p>
          )}
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-xs ${trend.positive ? "text-green-400" : "text-red-400"}`}>
              <TrendingUp className={`w-3 h-3 ${!trend.positive && "rotate-180"}`} />
              <span>{trend.value}%</span>
            </div>
          )}
        </div>
        <div 
          className="p-3 rounded-xl"
          style={{ background: `${color}20`, color }}
        >
          {icon}
        </div>
      </div>
    </motion.div>
  );
}

interface PremiumDashboardProps {
  stats: {
    totalQuestions: number;
    unansweredQuestions: number;
    totalSales: number;
    todaySales: number;
    pendingShipments: number;
    activeClaims: number;
    reputation: number;
    responseTime: number;
  };
  onCardClick?: (card: string) => void;
}

export function PremiumDashboard({ stats, onCardClick }: PremiumDashboardProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Dashboard</h2>
          <p className="text-sm text-zinc-500">Resumen de todas tus cuentas</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-zinc-400">Actualizado</span>
        </div>
      </div>

      {/* Grid de KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard
          title="Preguntas Sin Responder"
          value={stats.unansweredQuestions}
          subtitle={`${stats.totalQuestions} totales`}
          icon={<MessageCircle className="w-5 h-5" />}
          color="#3B82F6"
          trend={{ value: 12, positive: false }}
          onClick={() => onCardClick?.("questions")}
        />

        <DashboardCard
          title="Ventas Hoy"
          value={`$${stats.todaySales.toLocaleString()}`}
          subtitle={`${stats.totalSales} totales`}
          icon={<ShoppingCart className="w-5 h-5" />}
          color="#10B981"
          trend={{ value: 23, positive: true }}
          onClick={() => onCardClick?.("sales")}
        />

        <DashboardCard
          title="Envíos Pendientes"
          value={stats.pendingShipments}
          subtitle="Por despachar"
          icon={<Package className="w-5 h-5" />}
          color="#8B5CF6"
          onClick={() => onCardClick?.("shipments")}
        />

        <DashboardCard
          title="Reclamos Activos"
          value={stats.activeClaims}
          subtitle="Requieren atención"
          icon={<AlertTriangle className="w-5 h-5" />}
          color="#EF4444"
          onClick={() => onCardClick?.("claims")}
        />
      </div>

      {/* Segunda fila */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DashboardCard
          title="Reputación"
          value={`${stats.reputation}/5`}
          subtitle="Nivel: Verde"
          icon={<Star className="w-5 h-5" />}
          color="#F59E0B"
        />

        <DashboardCard
          title="Tiempo de Respuesta"
          value={`${stats.responseTime}m`}
          subtitle="Promedio últimas 24h"
          icon={<Clock className="w-5 h-5" />}
          color="#06B6D4"
        />

        <DashboardCard
          title="Eficiencia"
          value="94%"
          subtitle="Meta: 95%"
          icon={<Zap className="w-5 h-5" />}
          color="#EC4899"
          trend={{ value: 5, positive: true }}
        />
      </div>
    </div>
  );
}
