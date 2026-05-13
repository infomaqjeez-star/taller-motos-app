"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageTaller } from "@/lib/types";
import { mensajesDb } from "@/lib/db";

export function useMessaging() {
  const [messages, setMessages] = useState<MessageTaller[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await mensajesDb.getAll();
      setMessages(data);
    } catch (e) {
      console.error("Error cargando mensajes:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 3000); // polling cada 3 segundos
    return () => clearInterval(interval);
  }, [refresh]);

  const unreadCount = messages.filter((m) => !m.leido).length;

  const send = useCallback(
    async (autor: string, contenido: string) => {
      await mensajesDb.create({ autor, contenido });
      await refresh();
    },
    [refresh]
  );

  const markAsRead = useCallback(
    async (id: string) => {
      await mensajesDb.marcarLeido(id);
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, leido: true } : m))
      );
    },
    []
  );

  const markAllAsRead = useCallback(async () => {
    const unread = messages.filter((m) => !m.leido);
    await Promise.all(unread.map((m) => mensajesDb.marcarLeido(m.id)));
    setMessages((prev) => prev.map((m) => ({ ...m, leido: true })));
  }, [messages]);

  const remove = useCallback(
    async (id: string) => {
      await mensajesDb.delete(id);
      setMessages((prev) => prev.filter((m) => m.id !== id));
    },
    []
  );

  return { messages, loading, unreadCount, send, markAsRead, markAllAsRead, remove, refresh };
}
