import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ordersService } from '@/services/meli/orders.service';
import type { MeliOrder } from '@/types/meli';

const ORDERS_QUERY_KEY = 'meli-orders';

// ============================================
// QUERIES
// ============================================

/**
 * Hook para obtener órdenes de un vendedor
 */
export function useMeliOrders(
  accountId: string | null,
  sellerId: string | null,
  options: {
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    offset?: number;
    limit?: number;
    enabled?: boolean;
  } = {}
) {
  return useQuery({
    queryKey: [
      ORDERS_QUERY_KEY,
      accountId,
      sellerId,
      options.status,
      options.dateFrom,
      options.dateTo,
      options.offset,
      options.limit,
    ],
    queryFn: async () => {
      if (!accountId || !sellerId) {
        throw new Error('Se requiere accountId y sellerId');
      }
      return ordersService.getOrders(accountId, sellerId, options);
    },
    enabled: !!accountId && !!sellerId && options.enabled !== false,
    staleTime: 3 * 60 * 1000, // 3 minutos
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Hook para obtener una orden específica
 */
export function useMeliOrder(
  accountId: string | null,
  orderId: string | null
) {
  return useQuery({
    queryKey: [ORDERS_QUERY_KEY, 'detail', accountId, orderId],
    queryFn: async () => {
      if (!accountId || !orderId) {
        throw new Error('Se requiere accountId y orderId');
      }
      return ordersService.getOrderById(accountId, orderId);
    },
    enabled: !!accountId && !!orderId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook para obtener órdenes recientes
 */
export function useMeliRecentOrders(
  accountId: string | null,
  sellerId: string | null,
  options: {
    days?: number;
    limit?: number;
    enabled?: boolean;
  } = {}
) {
  return useQuery({
    queryKey: [ORDERS_QUERY_KEY, 'recent', accountId, sellerId, options.days],
    queryFn: async () => {
      if (!accountId || !sellerId) {
        throw new Error('Se requiere accountId y sellerId');
      }
      return ordersService.getRecentOrders(accountId, sellerId, options);
    },
    enabled: !!accountId && !!sellerId && options.enabled !== false,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook para obtener órdenes pendientes
 */
export function useMeliPendingOrders(
  accountId: string | null,
  sellerId: string | null,
  options: {
    limit?: number;
    enabled?: boolean;
  } = {}
) {
  return useQuery({
    queryKey: [ORDERS_QUERY_KEY, 'pending', accountId, sellerId],
    queryFn: async () => {
      if (!accountId || !sellerId) {
        throw new Error('Se requiere accountId y sellerId');
      }
      return ordersService.getPendingOrders(accountId, sellerId, options);
    },
    enabled: !!accountId && !!sellerId && options.enabled !== false,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook para obtener órdenes enviadas
 */
export function useMeliShippedOrders(
  accountId: string | null,
  sellerId: string | null,
  options: {
    limit?: number;
    enabled?: boolean;
  } = {}
) {
  return useQuery({
    queryKey: [ORDERS_QUERY_KEY, 'shipped', accountId, sellerId],
    queryFn: async () => {
      if (!accountId || !sellerId) {
        throw new Error('Se requiere accountId y sellerId');
      }
      return ordersService.getShippedOrders(accountId, sellerId, options);
    },
    enabled: !!accountId && !!sellerId && options.enabled !== false,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook para obtener órdenes entregadas
 */
export function useMeliDeliveredOrders(
  accountId: string | null,
  sellerId: string | null,
  options: {
    limit?: number;
    enabled?: boolean;
  } = {}
) {
  return useQuery({
    queryKey: [ORDERS_QUERY_KEY, 'delivered', accountId, sellerId],
    queryFn: async () => {
      if (!accountId || !sellerId) {
        throw new Error('Se requiere accountId y sellerId');
      }
      return ordersService.getDeliveredOrders(accountId, sellerId, options);
    },
    enabled: !!accountId && !!sellerId && options.enabled !== false,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para obtener órdenes de múltiples cuentas
 */
export function useMeliOrdersFromMultipleAccounts(
  accounts: Array<{
    id: string;
    sellerId: string;
    nickname: string;
  }> | null,
  options: {
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    enabled?: boolean;
  } = {}
) {
  return useQuery({
    queryKey: [
      ORDERS_QUERY_KEY,
      'multi-account',
      accounts?.map(a => a.id).join(','),
      options.status,
    ],
    queryFn: async () => {
      if (!accounts || accounts.length === 0) {
        return [];
      }
      return ordersService.getOrdersFromMultipleAccounts(accounts, options);
    },
    enabled: !!accounts && accounts.length > 0 && options.enabled !== false,
    staleTime: 3 * 60 * 1000,
  });
}

// ============================================
// HELPERS
// ============================================

/**
 * Obtiene el color del estado de la orden
 */
export function getOrderStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    'confirmed': 'bg-blue-500',
    'paid': 'bg-green-500',
    'shipped': 'bg-purple-500',
    'delivered': 'bg-emerald-500',
    'cancelled': 'bg-red-500',
    'payment_required': 'bg-orange-500',
    'payment_in_process': 'bg-yellow-500',
  };

  return colorMap[status] || 'bg-gray-500';
}

/**
 * Obtiene el icono del estado de la orden
 */
export function getOrderStatusIcon(status: string): string {
  const iconMap: Record<string, string> = {
    'confirmed': 'CheckCircle',
    'paid': 'DollarSign',
    'shipped': 'Truck',
    'delivered': 'Package',
    'cancelled': 'XCircle',
    'payment_required': 'AlertCircle',
    'payment_in_process': 'Clock',
  };

  return iconMap[status] || 'FileText';
}

/**
 * Obtiene el label del estado de la orden
 */
export function getOrderStatusLabel(status: string): string {
  const labelMap: Record<string, string> = {
    'confirmed': 'Confirmada',
    'payment_required': 'Pago requerido',
    'payment_in_process': 'Pago en proceso',
    'partially_paid': 'Parcialmente pagada',
    'paid': 'Pagada',
    'cancelled': 'Cancelada',
    'invalid': 'Inválida',
    'shipped': 'Enviada',
    'delivered': 'Entregada',
  };

  return labelMap[status] || status;
}

/**
 * Formatea el monto de la orden
 */
export function formatOrderAmount(amount: number, currency: string = 'ARS'): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

/**
 * Formatea la fecha de la orden
 */
export function formatOrderDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Calcula estadísticas de órdenes
 */
export function calculateOrderStats(orders: MeliOrder[]): {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  ordersByStatus: Record<string, number>;
} {
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, order) => {
    return sum + (order.total_amount || 0);
  }, 0);
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const ordersByStatus: Record<string, number> = {};
  orders.forEach((order) => {
    const status = order.status || 'unknown';
    ordersByStatus[status] = (ordersByStatus[status] || 0) + 1;
  });

  return {
    totalOrders,
    totalRevenue,
    averageOrderValue,
    ordersByStatus,
  };
}
