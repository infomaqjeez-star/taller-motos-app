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
      {/* Ventana MSN */}
      <div
        className="w-full max-w-lg pointer-events-auto flex flex-col overflow-hidden"
        style={{
          height: "min(620px, 85vh)",
          background: "#0f0f12",
          border: "1px solid rgba(59,130,246,0.25)",
          borderRadius: "0.75rem",
          boxShadow: "0 32px 80px -8px rgba(0,0,0,0.9), 0 0 0 1px rgba(59,130,246,0.1)",
        }}
      >
        {/* ── Barra de título estilo MSN (gradiente azul) ── */}
        <div
          className="flex items-center justify-between px-3 py-2 shrink-0 select-none"
          style={{
            background: "linear-gradient(to right, #1d4ed8, #3b82f6, #2563eb)",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <div className="flex items-center gap-2">
            {/* Ícono dos muñequitos MSN pequeño */}
            <svg width="20" height="20" viewBox="0 0 48 48" fill="none">
              <ellipse cx="17" cy="13" rx="5.5" ry="6" fill="#4ade80" />
              <ellipse cx="17" cy="13" rx="4" ry="4.5" fill="#86efac" />
              <path d="M8 34c0-6 4-10 9-10s9 4 9 10" fill="#4ade80"/>
              <ellipse cx="15" cy="10.5" rx="2" ry="1.5" fill="white" opacity="0.5" transform="rotate(-20 15 10.5)" />
              <ellipse cx="27" cy="15" rx="6.5" ry="7" fill="#bae6fd" />
              <ellipse cx="27" cy="15" rx="4.5" ry="5" fill="#e0f2fe" />
              <path d="M17 38c0-7 4.5-12 10-12s10 5 10 12" fill="#bae6fd"/>
              <ellipse cx="24.5" cy="12" rx="2.5" ry="1.8" fill="white" opacity="0.6" transform="rotate(-20 24.5 12)" />
            </svg>
            <span className="text-white text-xs font-bold tracking-wide">Mensajería del Taller</span>
            {unreadCount > 0 && (
              <span className="bg-yellow-400 text-black text-[10px] font-black px-1.5 py-0.5 rounded-full">{unreadCount} nuevo{unreadCount > 1 ? "s" : ""}</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-5 h-5 rounded flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 transition-colors text-xs font-black"
            title="Cerrar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ── Zona superior: historial de mensajes (60%) ── */}
        <div
          ref={scrollRef}
          className="overflow-y-auto p-3 space-y-1"
          style={{
            flex: "1 1 0",
            minHeight: 0,
            background: "#fafafa",
            borderBottom: "3px solid #1d4ed8",
          }}
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-2 py-8">
              <MailOpen className="w-8 h-8 text-blue-300" />
              <p className="text-gray-400 text-sm">No hay mensajes todavía</p>
            </div>
          ) : (
            [...messages].reverse().map((msg) => {
              const isUnread = !msg.leido;
              return (
                <div key={msg.id} className="group">
                  {/* Encabezado de mensaje estilo MSN */}
                  <div className="flex items-baseline gap-1.5">
                    <span
                      className="text-[11px] font-bold"
                      style={{ color: "#1d4ed8" }}
                    >
                      {msg.autor}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {formatDate(msg.createdAt)} {formatTime(msg.createdAt)}
                    </span>
                    {isUnread && (
                      <span className="text-[10px] font-bold text-orange-500 ml-1">● nuevo</span>
                    )}
                    <button
                      onClick={() => onDelete(msg.id)}
                      className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3 text-gray-300 hover:text-red-400" />
                    </button>
                  </div>
                  {/* Texto del mensaje */}
                  <div
                    className="text-sm ml-0 pb-1.5"
                    style={{
                      color: "#111",
                      borderBottom: "1px dashed #e5e7eb",
                      paddingBottom: "6px",
                      marginBottom: "2px",
                    }}
                  >
                    {msg.contenido}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Zona inferior: área de escritura (40%) ── */}
        <div
          className="flex flex-col shrink-0"
          style={{
            height: "42%",
            background: "#ffffff",
            borderTop: "none",
          }}
        >
          {/* Barra de herramientas MSN */}
          <div
            className="flex items-center gap-1 px-2 py-1.5 shrink-0"
            style={{ background: "#dbeafe", borderBottom: "1px solid #bfdbfe" }}
          >
            {/* Nombre */}
            <User className="w-3 h-3 text-blue-600" />
            <input
              type="text"
              value={autor}
              onChange={(e) => handleAutorChange(e.target.value)}
              className="text-[11px] font-bold text-blue-700 bg-transparent outline-none w-20"
              style={{ minWidth: 0 }}
            />
            <div className="w-px h-4 bg-blue-300 mx-1" />
            {/* Botón emojis */}
            <button
              type="button"
              onClick={() => setShowEmojis(v => !v)}
              className="text-base hover:scale-110 transition-transform px-0.5"
              title="Emojis"
            >😊</button>
            <div className="w-px h-4 bg-blue-300 mx-1" />
            {/* Sonidos */}
            {MSN_SOUNDS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => sendSound(s.id, s.label)}
                className="text-sm hover:scale-110 transition-transform px-0.5"
                title={`${s.label} (reproduce sonido)`}
              >
                {s.icon}
              </button>
            ))}
          </div>

          {/* Picker emojis flotante */}
          {showEmojis && (
            <div
              className="absolute bottom-[42%] left-0 right-0 mx-3 grid grid-cols-8 gap-1 p-2 rounded-t-lg z-10"
              style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderBottom: "none" }}
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

          {/* Textarea de escritura */}
          <textarea
            ref={inputRef as any}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (texto.trim()) {
                  onSend(autor.trim() || "Técnico", texto.trim());
                  setTexto("");
                }
              }
            }}
            placeholder="Escribí tu mensaje aquí... (Enter para enviar, Shift+Enter nueva línea)"
            className="flex-1 resize-none px-3 py-2 text-sm text-gray-800 outline-none"
            style={{ background: "#ffffff", fontFamily: "Arial, sans-serif" }}
          />

          {/* Footer con botón enviar */}
          <div
            className="flex items-center justify-end gap-2 px-3 py-2 shrink-0"
            style={{ background: "#eff6ff", borderTop: "1px solid #bfdbfe" }}
          >
            <span className="text-[10px] text-gray-400">Enter para enviar</span>
            <button
              type="button"
              disabled={!texto.trim()}
              onClick={() => {
                if (!texto.trim()) return;
                onSend(autor.trim() || "Técnico", texto.trim());
                setTexto("");
              }}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-bold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: texto.trim() ? "linear-gradient(to bottom, #3b82f6, #1d4ed8)" : "#93c5fd",
                border: "1px solid #1e40af",
                boxShadow: texto.trim() ? "0 1px 4px rgba(29,78,216,0.4)" : "none",
              }}
            >
              <Send className="w-3 h-3" /> Enviar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
