"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

interface Notification {
  id: string;
  type: "question" | "message" | "order";
  meli_id: string;
  account_id: string;
  data: any;
  created_at: string;
}

export function useRealtimeNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const isConnectingRef = useRef(false);

  const connect = useCallback(async () => {
    // Evitar conexiones simultáneas
    if (isConnectingRef.current) return;
    isConnectingRef.current = true;
    
    try {
      // Cerrar conexión anterior si existe
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        isConnectingRef.current = false;
        return;
      }

      const url = `/api/sse/notifications`;
      const authUrl = `${url}?token=${session.access_token}`;
      
      console.log("[SSE] Intentando conectar...");
      const es = new EventSource(authUrl);

      es.onopen = () => {
        console.log("[SSE] Conectado");
        setConnected(true);
        isConnectingRef.current = false;
      };

      es.addEventListener("connected", (e) => {
        console.log("[SSE] Conexión confirmada:", e.data);
      });

      es.addEventListener("notification", (e) => {
        try {
          const notification: Notification = JSON.parse(e.data);
          console.log("[SSE] Notificación recibida:", notification);
          setNotifications((prev) => [notification, ...prev]);
        } catch (err) {
          console.error("[SSE] Error parseando notificación:", err);
        }
      });

      es.addEventListener("heartbeat", () => {
        // Heartbeat recibido, conexión viva
      });

      es.onerror = (err) => {
        console.error("[SSE] Error:", err);
        setConnected(false);
        isConnectingRef.current = false;
        es.close();
        
        // Reconectar en 5 segundos solo si no hay otro intento en progreso
        if (!reconnectTimeoutRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = undefined;
            connect();
          }, 5000);
        }
      };

      eventSourceRef.current = es;
    } catch (err) {
      console.error("[SSE] Error en connect:", err);
      isConnectingRef.current = false;
    }
  }, []);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }
    isConnectingRef.current = false;
    setConnected(false);
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  useEffect(() => {
    // Solo conectar una vez al montar
    const timeoutId = setTimeout(() => {
      connect();
    }, 100); // Pequeño delay para evitar bloqueo inicial
    
    return () => {
      clearTimeout(timeoutId);
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Sin dependencias para evitar re-renders infinitos

  return {
    notifications,
    connected,
    connect,
    disconnect,
    clearNotifications,
  };
}
