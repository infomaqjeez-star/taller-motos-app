import { useQuery, useQueryClient } from '@tanstack/react-query';
import { itemsService } from '@/services/meli/items.service';
import type { MeliItem } from '@/services/meli/items.service';

const ITEMS_QUERY_KEY = 'meli-items';

// ============================================
// QUERIES
// ============================================

/**
 * Hook para obtener items de un vendedor
 */
export function useItems(
  accountId: string | null,
  sellerId: string | null,
  options: {
    status?: string;
    offset?: number;
    limit?: number;
    enabled?: boolean;
  } = {}
) {
  return useQuery({
    queryKey: [
      ITEMS_QUERY_KEY,
      accountId,
      sellerId,
      options.status,
      options.offset,
      options.limit,
    ],
    queryFn: async () => {
      if (!accountId || !sellerId) {
        throw new Error('Se requiere accountId y sellerId');
      }
      return itemsService.getItems(accountId, sellerId, options);
    },
    enabled: !!accountId && !!sellerId && options.enabled !== false,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 15 * 60 * 1000,
  });
}

/**
 * Hook para obtener un item específico
 */
export function useItem(
  accountId: string | null,
  itemId: string | null
) {
  return useQuery({
    queryKey: [ITEMS_QUERY_KEY, 'detail', accountId, itemId],
    queryFn: async () => {
      if (!accountId || !itemId) {
        throw new Error('Se requiere accountId y itemId');
      }
      return itemsService.getItemById(accountId, itemId);
    },
    enabled: !!accountId && !!itemId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para obtener múltiples items
 */
export function useMultipleItems(
  accountId: string | null,
  itemIds: string[] | null
) {
  return useQuery({
    queryKey: [ITEMS_QUERY_KEY, 'multiple', accountId, itemIds?.join(',')],
    queryFn: async () => {
      if (!accountId || !itemIds || itemIds.length === 0) {
        return [];
      }
      return itemsService.getMultipleItems(accountId, itemIds);
    },
    enabled: !!accountId && !!itemIds && itemIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para obtener items activos
 */
export function useActiveItems(
  accountId: string | null,
  sellerId: string | null,
  options: {
    offset?: number;
    limit?: number;
    enabled?: boolean;
  } = {}
) {
  return useQuery({
    queryKey: [ITEMS_QUERY_KEY, 'active', accountId, sellerId],
    queryFn: async () => {
      if (!accountId || !sellerId) {
        throw new Error('Se requiere accountId y sellerId');
      }
      return itemsService.getActiveItems(accountId, sellerId, options);
    },
    enabled: !!accountId && !!sellerId && options.enabled !== false,
    staleTime: 3 * 60 * 1000,
  });
}

/**
 * Hook para obtener items pausados
 */
export function usePausedItems(
  accountId: string | null,
  sellerId: string | null,
  options: {
    offset?: number;
    limit?: number;
    enabled?: boolean;
  } = {}
) {
  return useQuery({
    queryKey: [ITEMS_QUERY_KEY, 'paused', accountId, sellerId],
    queryFn: async () => {
      if (!accountId || !sellerId) {
        throw new Error('Se requiere accountId y sellerId');
      }
      return itemsService.getPausedItems(accountId, sellerId, options);
    },
    enabled: !!accountId && !!sellerId && options.enabled !== false,
    staleTime: 3 * 60 * 1000,
  });
}

/**
 * Hook para obtener items de múltiples cuentas
 */
export function useItemsFromMultipleAccounts(
  accounts: Array<{
    id: string;
    sellerId: string;
    nickname: string;
  }> | null,
  options: {
    status?: string;
    limit?: number;
    enabled?: boolean;
  } = {}
) {
  return useQuery({
    queryKey: [
      ITEMS_QUERY_KEY,
      'multi-account',
      accounts?.map(a => a.id).join(','),
      options.status,
    ],
    queryFn: async () => {
      if (!accounts || accounts.length === 0) {
        return [];
      }
      return itemsService.getItemsFromMultipleAccounts(accounts, options);
    },
    enabled: !!accounts && accounts.length > 0 && options.enabled !== false,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================
// HELPERS
// ============================================

/**
 * Obtiene el color del estado del item
 */
export function getItemStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    'active': 'bg-green-500',
    'paused': 'bg-yellow-500',
    'closed': 'bg-red-500',
    'under_review': 'bg-orange-500',
    'inactive': 'bg-gray-500',
    'payment_required': 'bg-purple-500',
  };

  return colorMap[status] || 'bg-gray-500';
}

/**
 * Obtiene el icono del estado del item
 */
export function getItemStatusIcon(status: string): string {
  const iconMap: Record<string, string> = {
    'active': 'CheckCircle',
    'paused': 'PauseCircle',
    'closed': 'XCircle',
    'under_review': 'AlertCircle',
    'inactive': 'Circle',
    'payment_required': 'CreditCard',
  };

  return iconMap[status] || 'FileText';
}

/**
 * Obtiene el label del estado del item
 */
export function getItemStatusLabel(status: string): string {
  const labelMap: Record<string, string> = {
    'active': 'Activa',
    'paused': 'Pausada',
    'closed': 'Cerrada',
    'under_review': 'En revisión',
    'inactive': 'Inactiva',
    'payment_required': 'Pago requerido',
  };

  return labelMap[status] || status;
}

/**
 * Obtiene el label de la condición del item
 */
export function getItemConditionLabel(condition: string): string {
  const labelMap: Record<string, string> = {
    'new': 'Nuevo',
    'used': 'Usado',
    'not_specified': 'No especificado',
  };

  return labelMap[condition] || condition;
}

/**
 * Formatea el precio del item
 */
export function formatItemPrice(price: number, currency: string = 'ARS'): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: currency,
  }).format(price);
}

/**
 * Calcula estadísticas de items
 */
export function calculateItemStats(items: MeliItem[]): {
  totalItems: number;
  totalStock: number;
  totalSold: number;
  averagePrice: number;
  itemsByStatus: Record<string, number>;
  totalRevenue: number;
} {
  const totalItems = items.length;
  const totalStock = items.reduce((sum, item) => sum + (item.available_quantity || 0), 0);
  const totalSold = items.reduce((sum, item) => sum + (item.sold_quantity || 0), 0);
  const totalRevenue = items.reduce((sum, item) => {
    return sum + ((item.price || 0) * (item.sold_quantity || 0));
  }, 0);
  const averagePrice = totalItems > 0 
    ? items.reduce((sum, item) => sum + (item.price || 0), 0) / totalItems 
    : 0;

  const itemsByStatus: Record<string, number> = {};
  items.forEach((item) => {
    const status = item.status || 'unknown';
    itemsByStatus[status] = (itemsByStatus[status] || 0) + 1;
  });

  return {
    totalItems,
    totalStock,
    totalSold,
    averagePrice,
    itemsByStatus,
    totalRevenue,
  };
}
