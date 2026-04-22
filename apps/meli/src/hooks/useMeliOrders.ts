import { useState, useCallback, useEffect } from 'react';
import { ordersService } from '@/services/meli';
import type { MeliOrder } from '@/types/meli';

interface UseMeliOrdersOptions {
  accountId: string;
  sellerId: string;
  status?: string[];
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseMeliOrdersReturn {
  orders: MeliOrder[];
  loading: boolean;
  error: string | null;
  total: number;
  hasFraudAlerts: boolean;
  refresh: () => Promise<void>;
  getOrder: (orderId: string) => Promise<MeliOrder>;
  getDiscounts: (orderId: string) => Promise<any>;
}

/**
 * Hook para gestionar órdenes/ventas de una cuenta de MeLi
 */
export function useMeliOrders({
  accountId,
  sellerId,
  status,
  autoRefresh = false,
  refreshInterval = 60000,
}: UseMeliOrdersOptions): UseMeliOrdersReturn {
  const [orders, setOrders] = useState<MeliOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [hasFraudAlerts, setHasFraudAlerts] = useState(false);

  const fetchOrders = useCallback(async () => {
    if (!accountId || !sellerId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await ordersService.searchOrders(accountId, sellerId, {
        status,
        limit: 50,
        sort: 'date_desc',
      });

      setOrders(data.results);
      setTotal(data.paging?.total || data.results.length);
      
      // Verificar alertas de fraude
      const hasAlerts = data.results.some(order => 
        ordersService.hasFraudRisk(order)
      );
      setHasFraudAlerts(hasAlerts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [accountId, sellerId, status]);

  const getOrder = useCallback(async (orderId: string) => {
    if (!accountId) throw new Error('No hay cuenta seleccionada');
    
    return await ordersService.getOrder(accountId, orderId);
  }, [accountId]);

  const getDiscounts = useCallback(async (orderId: string) => {
    if (!accountId) throw new Error('No hay cuenta seleccionada');
    
    return await ordersService.getOrderDiscounts(accountId, orderId);
  }, [accountId]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(fetchOrders, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchOrders]);

  return {
    orders,
    loading,
    error,
    total,
    hasFraudAlerts,
    refresh: fetchOrders,
    getOrder,
    getDiscounts,
  };
}
