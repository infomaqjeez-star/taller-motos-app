import { useCallback, useRef } from 'react';

export interface SalesByDay { date: string; orders: number; amount: number }
export interface TopProduct { title: string; sku: string; qty: number; revenue: number }
export interface ShipBreak { correo: number; flex: number; turbo: number; full: number; other: number }
export interface Reputation {
  account: string; meli_user_id: string; level_id: string;
  power_seller_status: string | null;
  claims_rate: number; cancellations_rate: number; delayed_rate: number;
  transactions_total: number; transactions_completed: number;
  ratings_positive: number; ratings_negative: number;
}
export interface PerAccount { account: string; meli_user_id: string; total_orders: number; total_amount: number; sales_by_day?: SalesByDay[] }

export interface StatsData {
  period: string;
  account_id: string;
  accounts_count: number;
  sales_by_day: SalesByDay[];
  sales_by_logistic: Record<string, { qty: number; amount: number }>;
  top_products: TopProduct[];
  shipping_breakdown: ShipBreak;
  reputation: Reputation[];
  totals: { total_orders: number; total_amount: number; avg_ticket: number; cancellation_count: number };
  per_account: PerAccount[];
  date_from?: string;
  date_to?: string;
}

interface CacheEntry {
  data: StatsData;
  timestamp: number;
}

const TTL = 5 * 60 * 1000; // 5 minutos en milisegundos

export const useCachedStats = () => {
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  const generateCacheKey = (period: string, accountId: string) => {
    return `${period}:${accountId}`;
  };

  const isExpired = (timestamp: number): boolean => {
    return Date.now() - timestamp > TTL;
  };

  const getOrFetch = useCallback(
    async (
      period: string,
      accountId: string,
      tzOffset: number,
      dateFrom?: string,
      dateTo?: string
    ): Promise<StatsData> => {
      // Generar key incluyendo fechas si existen
      const key = dateFrom && dateTo 
        ? `${period}:${accountId}:${dateFrom}:${dateTo}`
        : generateCacheKey(period, accountId);
      const cached = cacheRef.current.get(key);

      // SWR: Si existe en cache y no está expirado, retorna inmediatamente
      if (cached && !isExpired(cached.timestamp)) {
        return cached.data;
      }

      // Si expiró, fetch datos frescos
      return fetchStats(key, period, accountId, tzOffset, dateFrom, dateTo);
    },
    []
  );

  const fetchStats = async (
    key: string,
    period: string,
    accountId: string,
    tzOffset: number,
    dateFrom?: string,
    dateTo?: string
  ): Promise<StatsData> => {
    // Abort anterior si existe
    const oldController = abortControllersRef.current.get(key);
    if (oldController) oldController.abort();

    // Crear nuevo controller para esta request
    const controller = new AbortController();
    abortControllersRef.current.set(key, controller);

    try {
      // Construir URL con parámetros opcionales de fecha
      let url = `/api/meli-stats?period=${period}&account_id=${accountId}&tz_offset=${tzOffset}`;
      if (dateFrom) url += `&date_from=${dateFrom}`;
      if (dateTo) url += `&date_to=${dateTo}`;
      
      const res = await fetch(url, { signal: controller.signal });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data: StatsData = await res.json();

      // Guardar en cache
      cacheRef.current.set(key, {
        data,
        timestamp: Date.now(),
      });

      return data;
    } catch (error) {
      // Si fue abortado, no relanzar error (es esperado)
      if (error instanceof Error && error.name === 'AbortError') {
        return Promise.reject(error);
      }
      throw error;
    } finally {
      abortControllersRef.current.delete(key);
    }
  };

  const invalidate = useCallback((period: string, accountId: string) => {
    const key = generateCacheKey(period, accountId);
    cacheRef.current.delete(key);

    // Abort request en progreso si existe
    const controller = abortControllersRef.current.get(key);
    if (controller) controller.abort();
  }, []);

  const invalidateAll = useCallback(() => {
    cacheRef.current.clear();

    // Abort todos los requests en progreso
    abortControllersRef.current.forEach(controller => controller.abort());
    abortControllersRef.current.clear();
  }, []);

  return {
    getOrFetch,
    invalidate,
    invalidateAll,
  };
};
