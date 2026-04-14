"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";

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
 * Se reconecta automáticamente cada 5s si la conexión cae
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

  const connect = useCallback(async () => {
    if (!enabled || isCleaningUp.current) return;

    try {
      // Obtener token para auth
      const { data: { session } } = await supabase.auth.getSession();
      const tokenParam = session?.access_token ? `?token=${session.access_token}` : "";
      const url = `/api/notifications/stream${tokenParam}`;

      console.log(`[SSE] Intentando conectar a ${url}...`);

      // Crear conexión SSE
      const eventSource = new EventSource(url, { withCredentials: false });

      // Listener: conexión establecida
      eventSource.addEventListener("open", () => {
        console.log("[SSE] ✅ Conexión establecida correctamente");
        setConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
      });

      // Listener: evento de notificación MeLi
      eventSource.addEventListener("notificacion_meli", (event: Event) => {
        try {
          const customEvent = event as MessageEvent;
          const notification = JSON.parse(customEvent.data) as MeliNotification;
          onNotification(notification);
          console.log("[SSE] 🔔 Notificación recibida:", notification);
        } catch (parseError) {
          console.error("[SSE] ❌ Error parseando notificación:", parseError);
        }
      });

      // Listener: errores
      eventSource.addEventListener("error", (event) => {
        console.warn(`[SSE] ⚠️ Error en conexión (readyState: ${eventSource.readyState})`);
        console.warn("[SSE] Event:", event);

        if (eventSource.readyState === EventSource.CLOSED) {
          console.log("[SSE] 🔴 Conexión cerrada");
          setConnected(false);
          setError(new Error("SSE connection closed"));
          eventSource.close();
          eventSourceRef.current = null;

          // Intentar reconectar en 5s
          reconnectAttempts.current++;
          console.log(`[SSE] Intento de reconexión #${reconnectAttempts.current} en 5s...`);

          if (!isCleaningUp.current && reconnectAttempts.current < 10) {
            reconnectTimeoutRef.current = setTimeout(connect, 5000);
          } else if (reconnectAttempts.current >= 10) {
            console.error("[SSE] ❌ Máximo número de intentos de reconexión alcanzado");
            setError(new Error("Max reconnection attempts reached"));
          }
        }
      });

      eventSourceRef.current = eventSource;
      console.log("[SSE] EventSource creado");
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error("[SSE] ❌ Error crítico conectando:", error);
      setError(error);
      setConnected(false);

      // Reintentar en 5s
      reconnectAttempts.current++;
      if (!isCleaningUp.current && reconnectAttempts.current < 10) {
        console.log(`[SSE] Intento de reconexión #${reconnectAttempts.current} en 5s...`);
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

    console.log("[SSE] 🟢 Inicializando useNotificationStream...");
    isCleaningUp.current = false;
    reconnectAttempts.current = 0;
    
    connect();

    // Cleanup al desmontar
    return () => {
      console.log("[SSE] 🛑 Limpiando useNotificationStream...");
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
