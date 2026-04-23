"use client";

import { useEffect, useRef, useCallback } from "react";

interface UseAutoRefreshReturn {
  isRefreshing: boolean;
  lastRefresh: Date | null;
  manualRefresh: () => Promise<void>;
}

/**
 * Hook para auto-refresh de datos con polling
 * 
 * @param fetchFn - Función asíncrona para cargar datos
 * @param enableAutomatic - Si debe hacer polling automático
 * @param interval - Intervalo en ms (default: 180000 = 3 min)
 */
export function useAutoRefresh(
  fetchFn: () => Promise<void>,
  enableAutomatic: boolean = false,
  interval: number = 180000
): UseAutoRefreshReturn {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRefreshingRef = useRef(false);
  const lastRefreshRef = useRef<Date | null>(null);
  const fetchFnRef = useRef(fetchFn);
  
  // Actualizar la referencia de fetchFn cuando cambie
  useEffect(() => {
    fetchFnRef.current = fetchFn;
  }, [fetchFn]);

  const manualRefresh = useCallback(async () => {
    if (isRefreshingRef.current) return;

    isRefreshingRef.current = true;
    try {
      await fetchFnRef.current();
      lastRefreshRef.current = new Date();
      console.log(`[REFRESH] Sincronización completada a las ${new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}`);
    } catch (error) {
      console.error("[REFRESH] Error:", error);
    } finally {
      isRefreshingRef.current = false;
    }
  }, []); // Sin dependencias - usa la ref

  useEffect(() => {
    if (!enableAutomatic) {
      console.log("[REFRESH] Polling automático DESACTIVADO");
      return;
    }

    console.log(`[REFRESH] Polling automático ACTIVADO cada ${interval/1000}s`);
    
    // Ejecutar inmediatamente la primera vez
    manualRefresh();

    // Configurar intervalo
    intervalRef.current = setInterval(() => {
      manualRefresh();
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableAutomatic, interval]); // Sin manualRefresh en dependencias

  return {
    isRefreshing: isRefreshingRef.current,
    lastRefresh: lastRefreshRef.current,
    manualRefresh,
  };
}
