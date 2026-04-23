"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, MessageCircle, ShoppingCart, AlertTriangle, Package } from "lucide-react";

interface Notification {
  id: string;
  type: "question" | "sale" | "claim" | "shipment";
  title: string;
  message: string;
  account: string;
  timestamp: Date;
  read: boolean;
}

interface AlertSystemProps {
  accounts: Array<{ id: string; nickname: string }>;
}

export function AlertSystem({ accounts }: AlertSystemProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [audioEnabled, setAudioEnabled] = useState(true);

  // Sonido de alerta
  const playAlertSound = useCallback(() => {
    if (!audioEnabled) return;
    
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
      console.warn("No se pudo reproducir sonido:", e);
    }
  }, [audioEnabled]);

  // Agregar notificación
  const addNotification = useCallback((notification: Omit<Notification, "id" | "timestamp" | "read">) => {
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      read: false,
    };
    
    setNotifications(prev => [newNotification, ...prev].slice(0, 50)); // Max 50
    setUnreadCount(prev => prev + 1);
    playAlertSound();
  }, [playAlertSound]);

  // Marcar como leída
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  // Marcar todas como leídas
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  // Icono según tipo
  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "question": return <MessageCircle className="w-5 h-5 text-blue-400" />;
      case "sale": return <ShoppingCart className="w-5 h-5 text-green-400" />;
      case "claim": return <AlertTriangle className="w-5 h-5 text-red-400" />;
      case "shipment": return <Package className="w-5 h-5 text-purple-400" />;
    }
  };

  // Color de borde según tipo
  const getBorderColor = (type: Notification["type"]) => {
    switch (type) {
      case "question": return "border-blue-500/30";
      case "sale": return "border-green-500/30";
      case "claim": return "border-red-500/30";
      case "shipment": return "border-purple-500/30";
    }
  };

  return (
    <div className="relative">
      {/* Botón de campana */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl bg-zinc-900/80 border border-zinc-800 hover:border-yellow-500/50 transition-all group"
      >
        <Bell className={`w-5 h-5 transition-colors ${unreadCount > 0 ? "text-yellow-400" : "text-zinc-400 group-hover:text-zinc-200"}`} />
        
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Panel de notificaciones */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40"
            />
            
            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 top-full mt-2 w-96 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl shadow-black/50 z-50 overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50">
                <div>
                  <h3 className="font-semibold text-white">Notificaciones</h3>
                  <p className="text-xs text-zinc-500">{unreadCount} sin leer</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAudioEnabled(!audioEnabled)}
                    className={`p-1.5 rounded-lg text-xs transition-colors ${audioEnabled ? "bg-green-500/20 text-green-400" : "bg-zinc-800 text-zinc-500"}`}
                  >
                    {audioEnabled ? "🔊" : "🔇"}
                  </button>
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-zinc-400 hover:text-white transition-colors"
                  >
                    Marcar todo
                  </button>
                </div>
              </div>

              {/* Lista */}
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-zinc-500">
                    <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No hay notificaciones</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={() => markAsRead(notification.id)}
                      className={`p-4 border-b border-zinc-800/50 cursor-pointer transition-all hover:bg-zinc-900/50 ${
                        notification.read ? "opacity-50" : "bg-zinc-900/30"
                      } ${getBorderColor(notification.type)} border-l-2`}
                    >
                      <div className="flex gap-3">
                        <div className="mt-0.5">{getIcon(notification.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium text-sm text-white truncate">
                              {notification.title}
                            </p>
                            <span className="text-xs text-zinc-500 whitespace-nowrap">
                              {new Date(notification.timestamp).toLocaleTimeString("es-AR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <p className="text-sm text-zinc-400 mt-0.5">{notification.message}</p>
                          <p className="text-xs text-zinc-600 mt-1">{notification.account}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export type { Notification };
