"use client";

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  RefreshCw,
  ShoppingBag,
  DollarSign,
  Package,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Users,
  Filter,
  TrendingUp,
  Calendar,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { useMeliAccounts } from "@/components/auth/MeliAccountsProvider";
import { ordersService } from "@/services/meli";
import { ORDER_STATUSES } from "@/lib/meli/constants";
import type { MeliOrder } from "@/types/meli";

// ============ TIPOS ============
interface UnifiedOrder {
  id: number;
  status: string;
  status_detail: string | null;
  date_created: string;
  date_closed: string;
  total_amount: number;
  gross_price?: number;
  currency_id: string;
  buyer: {
    id: string;
    nickname?: string;
    first_name?: string;
    last_name?: string;
  };
  order_items: Array<{
    item: {
      id: string;
      title: string;
    };
    quantity: number;
    unit_price: number;
  }>;
  shipping?: {
    id: number;
    status?: string;
  };
  tags: string[];
  account: {
    id: string;
    nickname: string;
    sellerId: string;
  };
}

interface SalesStats {
  totalSales: number;
  totalAmount: number;
  averageTicket: number;
  byAccount: Record<string, { sales: number; amount: number }>;
}

// ============ COMPONENTE PRINCIPAL ============
export default function VentasPage() {
  const router = useRouter();
  const { accounts, loading: accountsLoading } = useMeliAccounts();
  
  // Estados
  const [orders, setOrders] = useState<UnifiedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [accountFilter, setAccountFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  
  // Estadísticas
  const [stats, setStats] = useState<SalesStats>({
    totalSales: 0,
    totalAmount: 0,
    averageTicket: 0,
    byAccount: {},
  });

  // ============ CARGA DE ÓRDENES ============
  const loadAllOrders = useCallback(async () => {
    if (!accounts.length) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Calcular fechas por defecto (últimos 30 días)
      const today = new Date();
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const dateFromStr = dateFrom || thirtyDaysAgo.toISOString().split('T')[0];
      const dateToStr = dateTo || today.toISOString().split('T')[0];
      
      // Obtener órdenes de todas las cuentas
      const accountsData = accounts.map(acc => ({
        id: acc.id,
        sellerId: acc.meli_user_id,
        nickname: acc.meli_nickname,
      }));
      
      const results = await ordersService.getOrdersFromMultipleAccounts(
        accountsData,
        {
          status: statusFilter !== "all" ? statusFilter : undefined,
          dateFrom: dateFromStr,
          dateTo: dateToStr,
          limit: 100,
        }
      );
      
      // Unificar órdenes
      const unified: UnifiedOrder[] = [];
      
      for (const result of results) {
        const accountOrders = result.orders.map(o => ({
          ...o,
          account: {
            id: result.accountId,
            nickname: result.nickname,
            sellerId: result.sellerId,
          },
        }));
        
        unified.push(...accountOrders);
      }
      
      // Ordenar por fecha (más recientes primero)
      unified.sort((a, b) => 
        new Date(b.date_created).getTime() - new Date(a.date_created).getTime()
      );
      
      setOrders(unified);
      
      // Calcular estadísticas
      const salesStats = await ordersService.getSalesStats(
        accountsData,
        dateFromStr,
        dateToStr
      );
      setStats(salesStats);
      
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando ventas");
    } finally {
      setLoading(false);
    }
  }, [accounts, statusFilter, dateFrom, dateTo]);

  // Cargar al inicio
  useEffect(() => {
    loadAllOrders();
  }, [loadAllOrders]);

  // ============ FILTROS ============
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      // Filtro por cuenta
      if (accountFilter !== "all" && o.account.id !== accountFilter) return false;
      
      // Filtro por búsqueda
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          o.id.toString().includes(term) ||
          o.buyer.nickname?.toLowerCase().includes(term) ||
          o.order_items.some(item => 
            item.item.title.toLowerCase().includes(term)
          ) ||
          o.account.nickname.toLowerCase().includes(term)
        );
      }
      
      return true;
    });
  }, [orders, accountFilter, searchTerm]);

  // ============ RENDER ============
  return (
    <main className="min-h-screen pb-24" style={{ background: "#121212" }}>
      {/* Header */}
      <div className="sticky top-0 z-30 px-4 py-3 flex items-center justify-between border-b"
        style={{ background: "rgba(18,18,18,0.97)", backdropFilter: "blur(16px)", borderColor: "rgba(255,255,255,0.07)" }}>
        <div className="flex items-center gap-3">
          <Link href="/" className="p-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }}>
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </Link>
          <div>
            <h1 className="font-black text-white text-base flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" style={{ color: "#39FF14" }} />
              Ventas Unificadas
            </h1>
            <p className="text-[10px]" style={{ color: "#6B7280" }}>
              {accounts.length} cuentas · {lastUpdate ? `Actualizado ${lastUpdate.toLocaleTimeString()}` : "Cargando..."}
            </p>
          </div>
        </div>
        <button 
          onClick={loadAllOrders}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold disabled:opacity-40"
          style={{ background: "#1F1F1F", color: "#39FF14", border: "1px solid #39FF1422" }}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Sync..." : "Actualizar"}
        </button>
      </div>

      {/* Estadísticas */}
      <div className="max-w-6xl mx-auto px-4 pt-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {/* Total Ventas */}
          <div className="rounded-2xl p-4" style={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center gap-2 mb-1">
              <ShoppingBag className="w-4 h-4" style={{ color: "#39FF14" }} />
              <span className="text-xs" style={{ color: "#6B7280" }}>Ventas</span>
            </div>
            <p className="text-2xl font-black text-white">{stats.totalSales}</p>
          </div>
          
          {/* Total Recaudado */}
          <div className="rounded-2xl p-4" style={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4" style={{ color: "#00E5FF" }} />
              <span className="text-xs" style={{ color: "#6B7280" }}>Recaudado</span>
            </div>
            <p className="text-2xl font-black text-white">
              ${stats.totalAmount.toLocaleString("es-AR")}
            </p>
          </div>
          
          {/* Ticket Promedio */}
          <div className="rounded-2xl p-4" style={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4" style={{ color: "#FFE600" }} />
              <span className="text-xs" style={{ color: "#6B7280" }}>Ticket Promedio</span>
            </div>
            <p className="text-2xl font-black text-white">
              ${stats.averageTicket.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
            </p>
          </div>
          
          {/* Cuentas Activas */}
          <div className="rounded-2xl p-4" style={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4" style={{ color: "#FF5722" }} />
              <span className="text-xs" style={{ color: "#6B7280" }}>Cuentas</span>
            </div>
            <p className="text-2xl font-black text-white">{accounts.length}</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2 mb-4">
          {/* Búsqueda */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar por ID, comprador o producto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-500 outline-none"
              style={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.08)" }}
            />
          </div>
          
          {/* Filtro Estado */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl text-sm text-white outline-none"
            style={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <option value="all">Todos los estados</option>
            <option value="paid">Pagado</option>
            <option value="confirmed">Confirmado</option>
            <option value="payment_in_process">Pago en proceso</option>
            <option value="cancelled">Cancelado</option>
          </select>
          
          {/* Filtro Cuenta */}
          <select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl text-sm text-white outline-none"
            style={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <option value="all">Todas las cuentas</option>
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>@{acc.meli_nickname}</option>
            ))}
          </select>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-2xl p-4 mb-4 text-center" style={{ background: "#ef444418", border: "1px solid #ef444440" }}>
            <AlertTriangle className="w-7 h-7 mx-auto mb-1" style={{ color: "#ef4444" }} />
            <p className="text-sm text-white font-semibold">{error}</p>
            <button onClick={loadAllOrders} className="mt-2 px-4 py-1.5 rounded-lg text-xs font-bold bg-red-500 text-white">
              Reintentar
            </button>
          </div>
        )}

        {/* Lista de Órdenes */}
        <div className="space-y-3">
          {loading && orders.length === 0 ? (
            // Skeleton loading
            [1, 2, 3].map(i => (
              <div key={i} className="rounded-2xl p-4 animate-pulse" style={{ background: "#1F1F1F" }}>
                <div className="h-3 rounded w-24 mb-2" style={{ background: "#2a2a2a" }} />
                <div className="h-4 rounded w-3/4 mb-1" style={{ background: "#2a2a2a" }} />
                <div className="h-4 rounded w-1/2" style={{ background: "#2a2a2a" }} />
              </div>
            ))
          ) : filteredOrders.length === 0 ? (
            // Empty state
            <div className="rounded-2xl p-10 text-center" style={{ background: "#1F1F1F" }}>
              <ShoppingBag className="w-10 h-10 mx-auto mb-2" style={{ color: "#6B7280" }} />
              <p className="text-white font-bold">
                {searchTerm ? "Sin resultados" : "No hay ventas en el período"}
              </p>
              <p className="text-sm mt-1" style={{ color: "#6B7280" }}>
                {searchTerm ? "Intenta con otros filtros" : "No se encontraron órdenes en las cuentas conectadas"}
              </p>
            </div>
          ) : (
            // Órdenes
            filteredOrders.map(order => (
              <OrderCard key={order.id} order={order} />
            ))
          )}
        </div>
      </div>
    </main>
  );
}

// ============ COMPONENTE: TARJETA DE ORDEN ============
interface OrderCardProps {
  order: UnifiedOrder;
}

function OrderCard({ order }: OrderCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const isPaid = order.status === ORDER_STATUSES.PAID;
  const isCancelled = order.status === ORDER_STATUSES.CANCELLED;
  const hasFraudAlert = order.tags?.includes('fraud_risk_detected');
  
  const statusColors: Record<string, string> = {
    [ORDER_STATUSES.PAID]: "#39FF14",
    [ORDER_STATUSES.CONFIRMED]: "#00E5FF",
    [ORDER_STATUSES.PAYMENT_IN_PROCESS]: "#FFE600",
    [ORDER_STATUSES.PAYMENT_REQUIRED]: "#FF5722",
    [ORDER_STATUSES.CANCELLED]: "#ef4444",
    [ORDER_STATUSES.PENDING_CANCEL]: "#FF5722",
  };
  
  const statusLabels: Record<string, string> = {
    [ORDER_STATUSES.PAID]: "Pagado",
    [ORDER_STATUSES.CONFIRMED]: "Confirmado",
    [ORDER_STATUSES.PAYMENT_IN_PROCESS]: "Pago en proceso",
    [ORDER_STATUSES.PAYMENT_REQUIRED]: "Pago requerido",
    [ORDER_STATUSES.CANCELLED]: "Cancelado",
    [ORDER_STATUSES.PENDING_CANCEL]: "Pendiente de cancelación",
    [ORDER_STATUSES.PARTIALLY_PAID]: "Parcialmente pagado",
    [ORDER_STATUSES.PARTIALLY_REFUNDED]: "Parcialmente reembolsado",
  };

  const timeAgo = getTimeAgo(order.date_created);
  const totalItems = order.order_items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div 
      className="rounded-2xl overflow-hidden transition-all duration-300"
      style={{ 
        background: "#1F1F1F", 
        border: `1px solid ${hasFraudAlert ? "#ef444444" : "rgba(255,255,255,0.07)"}`,
      }}
    >
      {/* Header */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left p-4"
      >
        <div className="flex items-start gap-3">
          {/* Indicador de cuenta */}
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "#2a2a2a", border: "2px solid rgba(255,230,0,0.1)" }}
          >
            <span className="text-xs font-bold" style={{ color: "#FFE600" }}>
              {order.account.nickname.substring(0, 2).toUpperCase()}
            </span>
          </div>
          
          {/* Contenido */}
          <div className="flex-1 min-w-0">
            {/* Cuenta y estado */}
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span 
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: "#FFE60018", color: "#FFE600" }}
              >
                @{order.account.nickname}
              </span>
              <span 
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ 
                  background: `${statusColors[order.status] || "#6B7280"}22`, 
                  color: statusColors[order.status] || "#6B7280"
                }}
              >
                {statusLabels[order.status] || order.status}
              </span>
              {hasFraudAlert && (
                <span 
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "#ef444422", color: "#ef4444" }}
                >
                  <AlertTriangle className="w-3 h-3 inline mr-1" />
                  Fraude
                </span>
              )}
              <span className="text-[10px]" style={{ color: "#6B7280" }}>
                {timeAgo}
              </span>
            </div>
            
            {/* Info principal */}
            <div className="flex items-baseline gap-2">
              <p className="text-lg font-black text-white">
                ${order.total_amount.toLocaleString("es-AR")}
              </p>
              <p className="text-xs" style={{ color: "#6B7280" }}>
                Orden #{order.id}
              </p>
            </div>
            
            {/* Comprador */}
            <p className="text-xs mt-1" style={{ color: "#6B7280" }}>
              {order.buyer.nickname 
                ? `@${order.buyer.nickname}` 
                : `Comprador #${order.buyer.id}`}
              {order.buyer.first_name && ` · ${order.buyer.first_name} ${order.buyer.last_name || ""}`}
            </p>
            
            {/* Items */}
            <p className="text-xs mt-1 truncate" style={{ color: "#6B7280" }}>
              {totalItems} {totalItems === 1 ? "producto" : "productos"}
              {order.order_items.length > 0 && ` · ${order.order_items[0].item.title}`}
              {order.order_items.length > 1 && ` y ${order.order_items.length - 1} más`}
            </p>
          </div>
          
          {/* Chevron */}
          <div className="flex-shrink-0">
            <ChevronRight 
              className={`w-5 h-5 transition-transform ${isExpanded ? "rotate-90" : ""}`}
              style={{ color: "#6B7280" }}
            />
          </div>
        </div>
      </button>
      
      {/* Detalles expandibles */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          {/* Productos */}
          <div className="pt-3">
            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#6B7280" }}>
              Productos
            </p>
            
            <div className="space-y-2">
              {order.order_items.map((item, idx) => (
                <div key={idx} className="p-3 rounded-xl" style={{ background: "#121212" }}>
                  <p className="text-sm text-white font-medium">{item.item.title}</p>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs" style={{ color: "#6B7280" }}>
                      {item.quantity} x ${item.unit_price.toLocaleString("es-AR")}
                    </span>
                    <span className="text-sm font-bold text-white">
                      ${(item.quantity * item.unit_price).toLocaleString("es-AR")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Envío */}
          {order.shipping && (
            <div className="p-3 rounded-xl" style={{ background: "#121212" }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "#6B7280" }}>
                Envío
              </p>
              <p className="text-sm text-white">
                ID: {order.shipping.id}
              </p>
              {order.shipping.status && (
                <p className="text-xs mt-1" style={{ color: "#6B7280" }}>
                  Estado: {order.shipping.status}
                </p>
              )}
            </div>
          )}
          
          {/* Acciones */}
          <div className="flex gap-2 pt-2">
            <a 
              href={`https://www.mercadolibre.com.ar/ventas/${order.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-bold text-sm text-white"
              style={{ background: "#2a2a2a" }}
            >
              <ExternalLink className="w-4 h-4" />
              Ver en MeLi
            </a>
            
            <Link
              href={`/mensajes?order=${order.id}`}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-bold text-sm text-black"
              style={{ background: "#FFE600" }}
            >
              Mensajes
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ UTILIDADES ============
function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (minutes < 1) return "ahora";
  if (minutes < 60) return `hace ${minutes}m`;
  if (hours < 24) return `hace ${hours}h`;
  if (days < 7) return `hace ${days}d`;
  return date.toLocaleDateString("es-AR");
}
