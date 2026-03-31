"use client";

import { useEffect, useState, useCallback, useRef } from "react";

interface UseAutoRefreshReturn {
  isRefreshing: boolean;
  lastRefresh: Date | null;
  manualRefresh: () => Promise<void>;
}

/**
 * Hook para auto-refresh cada N segundos con sincronización de estado
 * - Ejecuta fetchFn cada `interval` ms
 * - Actualiza estado sin recargar página
 * - Logging en consola
 * - Cleanup automático al desmontar
 */
export function useAutoRefresh(
  fetchFn: () => Promise<void>,
  enabled: boolean = true,
  interval: number = 60000 // 60 segundos por defecto
): UseAutoRefreshReturn {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const manualRefresh = useCallback(async () => {
    if (isRefreshing) return; // Evitar multiples llamadas simultáneas

    setIsRefreshing(true);
    try {
      await fetchFn();
      setLastRefresh(new Date());
      console.log(`[AUTO-REFRESH] Sincronización completada a las ${new Date().toLocaleTimeString("es-AR")}`);
    } catch (error) {
      console.error("[AUTO-REFRESH] Error:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchFn, isRefreshing]);

  useEffect(() => {
    if (!enabled) return;

    // Ejecutar refresh inicial
    manualRefresh();

    // Configurar intervalo
    intervalRef.current = setInterval(() => {
      manualRefresh();
    }, interval);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, interval, manualRefresh]);

  return {
    isRefreshing,
    lastRefresh,
    manualRefresh,
  };
}
