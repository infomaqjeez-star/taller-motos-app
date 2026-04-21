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

  const connect = useCallback(async () => {
    // Cerrar conexión anterior si existe
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const url = `/api/sse/notifications`;
    
    // EventSource no soporta headers, usamos query param para auth
    const authUrl = `${url}?token=${session.access_token}`;
    const es = new EventSource(authUrl);

    es.onopen = () => {
      console.log("[SSE] Conectado");
      setConnected(true);
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
      es.close();
      
      // Reconectar en 5 segundos
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log("[SSE] Reconectando...");
        connect();
      }, 5000);
    };

    eventSourceRef.current = es;
  }, []);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    setConnected(false);
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    notifications,
    connected,
    connect,
    disconnect,
    clearNotifications,
  };
}
