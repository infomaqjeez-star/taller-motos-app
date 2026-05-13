"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { MessageTaller } from "@/lib/types";
import { mensajesDb } from "@/lib/db";

// ── Sonido MSN Messenger real (archivo MP3) ───────────────────
let msnAudio: HTMLAudioElement | null = null;

function playMSNDing() {
  try {
    // Si ya está sonando, no volver a reproducir
    if (msnAudio && !msnAudio.paused) return;
    if (!msnAudio) {
      msnAudio = new Audio("/msn-sound.mp3");
      msnAudio.volume = 0.8;
    }
    msnAudio.currentTime = 0;
    msnAudio.play().catch(() => {
      // Browser bloqueó autoplay sin interacción previa
    });
  } catch {
    // Fallback silencioso
  }
}

// ── Notificación nativa del browser ─────────────────────────
function showBrowserNotification(autor: string, contenido: string) {
  if (typeof window === "undefined") return;
  if (Notification.permission === "granted") {
    new Notification(`💬 ${autor} — Taller`, {
      body: contenido,
      icon: "/favicon.ico",
      tag: "msn-taller",
      requireInteraction: false,
    });
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then((perm) => {
      if (perm === "granted") {
        new Notification(`💬 ${autor} — Taller`, {
          body: contenido,
          icon: "/favicon.ico",
          tag: "msn-taller",
        });
      }
    });
  }
}

export function useMessaging() {
  const [messages, setMessages] = useState<MessageTaller[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessageAlert, setNewMessageAlert] = useState(false); // para animar el botón
  const prevIdsRef = useRef<Set<string>>(new Set());
  const originalTitleRef = useRef<string>("");
  const blinkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Parpadeo del título de la pestaña ────────────────────
  const startBlink = useCallback((count: number) => {
    if (typeof window === "undefined") return;
    if (blinkIntervalRef.current) return; // ya está parpadeando
    originalTitleRef.current = document.title;
    let visible = true;
    blinkIntervalRef.current = setInterval(() => {
      document.title = visible
        ? `(${count}) 💬 Mensaje nuevo — Taller`
        : originalTitleRef.current;
      visible = !visible;
    }, 1000);
  }, []);

  const stopBlink = useCallback(() => {
    if (blinkIntervalRef.current) {
      clearInterval(blinkIntervalRef.current);
      blinkIntervalRef.current = null;
    }
    if (originalTitleRef.current) {
      document.title = originalTitleRef.current;
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const data = await mensajesDb.getAll();

      // Detectar IDs nuevas respecto al estado anterior
      const currentIds = new Set(data.map((m) => m.id));
      const isFirstLoad = prevIdsRef.current.size === 0;

      if (!isFirstLoad) {
        const nuevos = data.filter(
          (m) => !prevIdsRef.current.has(m.id) && !m.leido
        );
        if (nuevos.length > 0) {
          playMSNDing();
          setNewMessageAlert(true);
          setTimeout(() => setNewMessageAlert(false), 1500);
          showBrowserNotification(
            nuevos[0].autor,
            nuevos.length > 1
              ? `${nuevos.length} mensajes nuevos`
              : nuevos[0].contenido
          );
          const unreadAfter = data.filter((m) => !m.leido).length;
          startBlink(unreadAfter);
        }
      }

      prevIdsRef.current = currentIds;
      setMessages(data);
    } catch (e) {
      console.error("Error cargando mensajes:", e);
    } finally {
      setLoading(false);
    }
  }, [startBlink]);

  useEffect(() => {
    // Pedir permiso de notificaciones al montar
    if (typeof window !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
    refresh();
    const interval = setInterval(refresh, 3000);
    return () => {
      clearInterval(interval);
      stopBlink();
    };
  }, [refresh, stopBlink]);

  const unreadCount = messages.filter((m) => !m.leido).length;

  // Detener parpadeo si no quedan no leídos
  useEffect(() => {
    if (unreadCount === 0) stopBlink();
  }, [unreadCount, stopBlink]);

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
    stopBlink();
  }, [messages, stopBlink]);

  const remove = useCallback(
    async (id: string) => {
      await mensajesDb.delete(id);
      setMessages((prev) => prev.filter((m) => m.id !== id));
    },
    []
  );

  return { messages, loading, unreadCount, newMessageAlert, send, markAsRead, markAllAsRead, remove, refresh };
}
