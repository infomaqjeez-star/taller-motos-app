"use client";

import { useState, useRef, useEffect } from "react";
import {
  X, Send, MailOpen, Mail, Trash2, User, Volume2, MessageCircle,
} from "lucide-react";
import { MessageTaller } from "@/lib/types";

// ── Sonidos MSN con Web Audio API ────────────────────────────
function playSound(type: string) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const sounds: Record<string, () => void> = {
      ding: () => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.frequency.setValueAtTime(880, ctx.currentTime);
        o.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.05);
        g.gain.setValueAtTime(0.4, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        o.start(); o.stop(ctx.currentTime + 0.5);
      },
      nudge: () => {
        // Vibración rápida: 3 beeps cortos
        [0, 0.12, 0.24].forEach(offset => {
          const o = ctx.createOscillator(), g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.frequency.value = 660;
          g.gain.setValueAtTime(0.3, ctx.currentTime + offset);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.08);
          o.start(ctx.currentTime + offset);
          o.stop(ctx.currentTime + offset + 0.08);
        });
      },
      online: () => {
        // Sonido "usuario conectado" - dos notas ascendentes
        [[523, 0], [659, 0.15], [784, 0.30]].forEach(([freq, offset]) => {
          const o = ctx.createOscillator(), g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.frequency.value = freq as number;
          g.gain.setValueAtTime(0.25, ctx.currentTime + (offset as number));
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (offset as number) + 0.2);
          o.start(ctx.currentTime + (offset as number));
          o.stop(ctx.currentTime + (offset as number) + 0.2);
        });
      },
      error: () => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = "sawtooth";
        o.connect(g); g.connect(ctx.destination);
        o.frequency.setValueAtTime(220, ctx.currentTime);
        o.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.3);
        g.gain.setValueAtTime(0.2, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        o.start(); o.stop(ctx.currentTime + 0.3);
      },
    };
    sounds[type]?.();
  } catch {}
}

// ── Emojis MSN clásicos ───────────────────────────────────────
const MSN_EMOJIS = [
  { emoji: "😊", label: "Feliz" },
  { emoji: "😢", label: "Triste" },
  { emoji: "😉", label: "Guiño" },
  { emoji: "😎", label: "Cool" },
  { emoji: "😡", label: "Enojado" },
  { emoji: "😮", label: "Sorpresa" },
  { emoji: "😂", label: "Risa" },
  { emoji: "❤️", label: "Amor" },
  { emoji: "👍", label: "OK" },
  { emoji: "👎", label: "No" },
  { emoji: "🎉", label: "Fiesta" },
  { emoji: "🔥", label: "Fuego" },
  { emoji: "💪", label: "Fuerza" },
  { emoji: "🙏", label: "Gracias" },
  { emoji: "🤔", label: "Hmm" },
  { emoji: "😴", label: "Dormido" },
];

const MSN_SOUNDS = [
  { id: "nudge",  label: "Sacudida",  icon: "📳" },
  { id: "ding",   label: "Ding",      icon: "🔔" },
  { id: "online", label: "Conectado", icon: "🟢" },
  { id: "error",  label: "Error",     icon: "🔴" },
];

interface MessengerPanelProps {
  open: boolean;
  onClose: () => void;
  messages: MessageTaller[];
  unreadCount: number;
  onSend: (autor: string, contenido: string) => void;
  onMarkAllRead: () => void;
  onDelete: (id: string) => void;
}

function formatTime(ts: string) {
  const d = new Date(ts);
  return d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(ts: string) {
  const d = new Date(ts);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  if (isToday) return "Hoy";
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
}

export default function MessengerPanel({
  open,
  onClose,
  messages,
  unreadCount,
  onSend,
  onMarkAllRead,
  onDelete,
}: MessengerPanelProps) {
  const [autor, setAutor] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("taller_nombre") || "Técnico";
    return "Técnico";
  });
  const [texto, setTexto] = useState("");
  const [showEmojis, setShowEmojis] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Guardar nombre de usuario en localStorage
  const handleAutorChange = (v: string) => {
    setAutor(v);
    if (typeof window !== "undefined") localStorage.setItem("taller_nombre", v);
  };

  // Scroll al final cuando abre o llega mensaje nuevo
  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [open, messages.length]);

  // Marcar todo como leído al abrir
  useEffect(() => {
    if (open && unreadCount > 0) {
      onMarkAllRead();
    }
  }, [open]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!texto.trim()) return;
    onSend(autor.trim() || "Técnico", texto.trim());
    setTexto("");
  };

  const insertEmoji = (emoji: string) => {
    setTexto(prev => prev + emoji);
    setShowEmojis(false);
    inputRef.current?.focus();
  };

  const sendSound = (soundId: string, label: string) => {
    playSound(soundId);
    onSend(autor.trim() || "Técnico", `🔊 ${label}`);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-end p-4 sm:p-6 pointer-events-none">
      {/* Panel */}
      <div
        className="w-full max-w-md pointer-events-auto flex flex-col overflow-hidden"
        style={{
          height: "min(600px, 80vh)",
          background: "#18181b",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "1rem",
          boxShadow: "0 24px 64px -8px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04)",
        }}
      >
        {/* Header estilo MSN */}
        <div
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{
            background: "linear-gradient(to right, #1e1e24, #18181b)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}
            >
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white leading-tight">Mensajería del Taller</h3>
              <p className="text-[11px] text-gray-500">
                {messages.length} mensaje{messages.length !== 1 ? "s" : ""}
                {unreadCount > 0 && (
                  <span className="text-blue-400 ml-1">• {unreadCount} sin leer</span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Área de mensajes */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)" }}
              >
                <MailOpen className="w-6 h-6 text-blue-400" />
              </div>
              <p className="text-gray-500 text-sm">No hay mensajes todavía</p>
              <p className="text-gray-600 text-xs">Escribí el primero para avisar al equipo</p>
            </div>
          ) : (
            [...messages].reverse().map((msg) => {
              const isUnread = !msg.leido;
              return (
                <div
                  key={msg.id}
                  className="group flex gap-2.5"
                >
                  {/* Avatar */}
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.25)" }}
                  >
                    <User className="w-3.5 h-3.5 text-blue-400" />
                  </div>

                  {/* Burbuja */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-bold text-blue-300">{msg.autor}</span>
                      <span className="text-[10px] text-gray-600">{formatDate(msg.createdAt)} {formatTime(msg.createdAt)}</span>
                      {isUnread && (
                        <span className="ml-auto flex items-center gap-1 text-[10px] font-bold text-blue-400">
                          <Mail className="w-3 h-3" /> Nuevo
                        </span>
                      )}
                    </div>
                    <div
                      className="rounded-lg px-3 py-2 text-sm text-gray-200 relative"
                      style={{
                        background: isUnread
                          ? "linear-gradient(to right, rgba(59,130,246,0.08), rgba(59,130,246,0.03))"
                          : "rgba(255,255,255,0.03)",
                        border: isUnread
                          ? "1px solid rgba(59,130,246,0.15)"
                          : "1px solid rgba(255,255,255,0.04)",
                      }}
                    >
                      {msg.contenido}
                    </div>
                    {/* Acciones */}
                    <div className="flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onDelete(msg.id)}
                        className="text-[10px] text-gray-600 hover:text-red-400 flex items-center gap-1 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" /> Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input área */}
        <div
          className="shrink-0 p-3 space-y-2"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "#111113" }}
        >
          {/* Nombre de usuario */}
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-gray-500" />
            <input
              type="text"
              value={autor}
              onChange={(e) => handleAutorChange(e.target.value)}
              placeholder="Tu nombre"
              className="flex-1 bg-transparent text-xs text-gray-300 placeholder-gray-600 outline-none"
              style={{ minWidth: 0 }}
            />
          </div>

          {/* Barra de sonidos MSN */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {MSN_SOUNDS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => sendSound(s.id, s.label)}
                className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium whitespace-nowrap transition-colors"
                style={{ background: "#1a1a1f", border: "1px solid rgba(255,255,255,0.08)", color: "#9ca3af" }}
                title={s.label}
              >
                <Volume2 className="w-2.5 h-2.5" />
                {s.icon} {s.label}
              </button>
            ))}
          </div>

          {/* Picker de emojis MSN */}
          {showEmojis && (
            <div
              className="grid grid-cols-8 gap-1 p-2 rounded-lg"
              style={{ background: "#1a1a1f", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              {MSN_EMOJIS.map(({ emoji, label }) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => insertEmoji(emoji)}
                  className="text-xl hover:scale-125 transition-transform"
                  title={label}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSend} className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowEmojis(v => !v)}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0 transition-colors"
              style={{ background: showEmojis ? "rgba(59,130,246,0.2)" : "#1a1a1f", border: "1px solid rgba(255,255,255,0.08)" }}
              title="Emojis MSN"
            >
              😊
            </button>
            <input
              ref={inputRef}
              type="text"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Escribí un mensaje..."
              className="flex-1 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none transition-all"
              style={{
                background: "#1a1a1f",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(59,130,246,0.4)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
            />
            <button
              type="submit"
              disabled={!texto.trim()}
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
              style={{
                background: texto.trim() ? "linear-gradient(135deg, #3b82f6, #8b5cf6)" : "#27272a",
                boxShadow: texto.trim() ? "0 2px 12px -2px rgba(59,130,246,0.4)" : "none",
              }}
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
