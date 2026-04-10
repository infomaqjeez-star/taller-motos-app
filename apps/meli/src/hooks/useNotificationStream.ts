"use client";

import { useEffect, useState, useCallback, useRef } from "react";

interface MeliNotification {
  user_id: string;
  topic: string;
  resource: string;
  data: any;
  timestamp: string;
}

interface UseNotificationStreamReturn {
  connected: boolean;
  error: Error | null;
}

/**
 * Hook React para conectarse al stream SSE de notificaciones en tiempo real
 * Se reconecta automÃ¡ticamente cada 5s si la conexiÃ³n cae
 */
export function useNotificationStream(
  onNotification: (data: MeliNotification) => void,
  enabled: boolean = true
): UseNotificationStreamReturn {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCleaningUp = useRef(false);
  const reconnectAttempts = useRef(0);

  const connect = useCallback(() => {
    if (!enabled || isCleaningUp.current) return;

    try {
      // Obtener URL base - IMPORTANTE: usar solo la ruta relativa
      const url = "/api/notifications/stream";

      console.log(`[SSE] Intentando conectar a ${url}...`);

      // Crear conexiÃ³n SSE
      const eventSource = new EventSource(url, { withCredentials: false });

      // Listener: conexiÃ³n establecida
      eventSource.addEventListener("open", () => {
        console.log("[SSE] âœ… ConexiÃ³n establecida correctamente");
        setConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
      });

      // Listener: evento de notificaciÃ³n MeLi
      eventSource.addEventListener("notificacion_meli", (event: Event) => {
        try {
          const customEvent = event as MessageEvent;
          const notification = JSON.parse(customEvent.data) as MeliNotification;
          onNotification(notification);
          console.log("[SSE] ðŸ”” NotificaciÃ³n recibida:", notification);
        } catch (parseError) {
          console.error("[SSE] âŒ Error parseando notificaciÃ³n:", parseError);
        }
      });

      // Listener: errores
      eventSource.addEventListener("error", (event) => {
        console.warn(`[SSE] âš ï¸ Error en conexiÃ³n (readyState: ${eventSource.readyState})`);
        console.warn("[SSE] Event:", event);

        if (eventSource.readyState === EventSource.CLOSED) {
          console.log("[SSE] ðŸ”´ ConexiÃ³n cerrada");
          setConnected(false);
          setError(new Error("SSE connection closed"));
          eventSource.close();
          eventSourceRef.current = null;

          // Intentar reconectar en 5s
          reconnectAttempts.current++;
          console.log(`[SSE] Intento de reconexiÃ³n #${reconnectAttempts.current} en 5s...`);

          if (!isCleaningUp.current && reconnectAttempts.current < 10) {
            reconnectTimeoutRef.current = setTimeout(connect, 5000);
          } else if (reconnectAttempts.current >= 10) {
            console.error("[SSE] âŒ MÃ¡ximo nÃºmero de intentos de reconexiÃ³n alcanzado");
            setError(new Error("Max reconnection attempts reached"));
          }
        }
      });

      eventSourceRef.current = eventSource;
      console.log("[SSE] EventSource creado");
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error("[SSE] âŒ Error crÃ­tico conectando:", error);
      setError(error);
      setConnected(false);

      // Reintentar en 5s
      reconnectAttempts.current++;
      if (!isCleaningUp.current && reconnectAttempts.current < 10) {
        console.log(`[SSE] Intento de reconexiÃ³n #${reconnectAttempts.current} en 5s...`);
        reconnectTimeoutRef.current = setTimeout(connect, 5000);
      }
    }
  }, [enabled, onNotification]);

  useEffect(() => {
    if (!enabled) {
      console.log("[SSE] Hook desactivado por prop enabled=false");
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      setConnected(false);
      return;
    }

    console.log("[SSE] ðŸŸ¢ Inicializando useNotificationStream...");
    isCleaningUp.current = false;
    reconnectAttempts.current = 0;
    
    connect();

    // Cleanup al desmontar
    return () => {
      console.log("[SSE] ðŸ›‘ Limpiando useNotificationStream...");
      isCleaningUp.current = true;

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      setConnected(false);
    };
  }, [enabled, connect]);

  return {
    connected,
    error,
  };
}
