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
      {/* ── Ventana MSN Messenger clásica ── */}
      <div
        className="w-full max-w-lg pointer-events-auto flex flex-col overflow-hidden"
        style={{
          height: "min(580px, 85vh)",
          background: "#d4e0f0",
          border: "2px solid #2152a3",
          borderRadius: "6px",
          boxShadow: "4px 4px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.6)",
          fontFamily: "Arial, Tahoma, sans-serif",
        }}
      >
        {/* ── Barra de título Windows XP ── */}
        <div
          className="flex items-center justify-between px-2 py-1 shrink-0 select-none"
          style={{
            background: "linear-gradient(to bottom, #4a90d9, #1a5faa 40%, #1749a0)",
            borderBottom: "1px solid #0f3a8a",
          }}
        >
          <div className="flex items-center gap-1.5">
            <svg width="16" height="16" viewBox="0 0 48 48" fill="none">
              <ellipse cx="17" cy="13" rx="5.5" ry="6" fill="#4ade80"/>
              <ellipse cx="17" cy="13" rx="4" ry="4.5" fill="#86efac"/>
              <path d="M8 34c0-6 4-10 9-10s9 4 9 10" fill="#4ade80"/>
              <ellipse cx="15" cy="10.5" rx="2" ry="1.5" fill="white" opacity="0.5" transform="rotate(-20 15 10.5)"/>
              <ellipse cx="27" cy="15" rx="6.5" ry="7" fill="#bae6fd"/>
              <ellipse cx="27" cy="15" rx="4.5" ry="5" fill="#e0f2fe"/>
              <path d="M17 38c0-7 4.5-12 10-12s10 5 10 12" fill="#bae6fd"/>
              <ellipse cx="24.5" cy="12" rx="2.5" ry="1.8" fill="white" opacity="0.6" transform="rotate(-20 24.5 12)"/>
            </svg>
            <span className="text-white text-[11px] font-bold" style={{ textShadow: "0 1px 1px rgba(0,0,0,0.5)" }}>
              Mensajería del Taller — MSN
            </span>
            {unreadCount > 0 && (
              <span className="bg-yellow-300 text-black text-[9px] font-black px-1 py-0.5 rounded" style={{ border: "1px solid #ca8a04" }}>
                {unreadCount} nuevo{unreadCount > 1 ? "s" : ""}
              </span>
            )}
          </div>
          {/* Botones XP */}
          <div className="flex gap-1">
            <button
              onClick={onClose}
              className="w-[18px] h-[14px] rounded-sm flex items-center justify-center text-white text-[10px] font-black transition-all hover:brightness-110"
              style={{ background: "linear-gradient(to bottom, #f87171, #dc2626)", border: "1px solid #991b1b", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3)" }}
              title="Cerrar"
            >✕</button>
          </div>
        </div>

        {/* ── Barra To: ── */}
        <div
          className="flex items-center gap-2 px-2 py-1 shrink-0"
          style={{ background: "#eef4fb", borderBottom: "1px solid #b8cfe8" }}
        >
          <span className="text-[11px] text-gray-600 font-bold">Para:</span>
          <span className="text-[11px] text-blue-700 font-bold">Equipo del Taller</span>
          <div className="ml-auto flex items-center gap-1">
            <User className="w-3 h-3 text-gray-500" />
            <input
              type="text"
              value={autor}
              onChange={(e) => handleAutorChange(e.target.value)}
              className="text-[11px] text-blue-700 font-bold bg-transparent outline-none border-b border-blue-300"
              placeholder="Tu nombre"
              style={{ width: "80px" }}
            />
          </div>
        </div>

        {/* ── Zona superior: mensajes (izq) + avatar (der) ── */}
        <div className="flex shrink-0" style={{ height: "52%", borderBottom: "2px solid #5a8fd0" }}>
          {/* Historial de mensajes */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-2"
            style={{ background: "#ffffff", borderRight: "1px solid #b8cfe8" }}
          >
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2">
                <MailOpen className="w-7 h-7 text-blue-300" />
                <p className="text-[11px] text-gray-400 text-center">No hay mensajes todavía.<br/>Escribí el primero.</p>
              </div>
            ) : (
              [...messages].reverse().map((msg) => {
                const isUnread = !msg.leido;
                return (
                  <div key={msg.id} className="group mb-1.5">
                    <div className="flex items-baseline gap-1 flex-wrap">
                      <span className="text-[11px] font-bold" style={{ color: "#1a56c4" }}>{msg.autor}</span>
                      <span className="text-[10px] text-gray-400">dice ({formatTime(msg.createdAt)})</span>
                      {isUnread && <span className="text-[9px] font-black text-orange-500">●NUEVO</span>}
                      <button onClick={() => onDelete(msg.id)} className="ml-auto opacity-0 group-hover:opacity-100">
                        <Trash2 className="w-2.5 h-2.5 text-gray-300 hover:text-red-500" />
                      </button>
                    </div>
                    <div className="text-[12px] text-gray-800 pl-1 pb-1.5" style={{ borderBottom: "1px solid #e5e7eb" }}>
                      {msg.contenido}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Avatar / foto del taller */}
          <div
            className="shrink-0 flex flex-col items-center justify-start pt-3 gap-2"
            style={{ width: "80px", background: "#eef4fb" }}
          >
            {/* Muñequito MSN grande */}
            <div
              className="w-16 h-16 rounded flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #dbeafe, #eff6ff)", border: "1px solid #bfdbfe" }}
            >
              <svg width="52" height="52" viewBox="0 0 48 48" fill="none">
                <ellipse cx="17" cy="13" rx="5.5" ry="6" fill="#4ade80"/>
                <ellipse cx="17" cy="13" rx="4" ry="4.5" fill="#86efac"/>
                <path d="M8 34c0-6 4-10 9-10s9 4 9 10" fill="#4ade80"/>
                <ellipse cx="15" cy="10.5" rx="2" ry="1.5" fill="white" opacity="0.5" transform="rotate(-20 15 10.5)"/>
                <ellipse cx="27" cy="15" rx="6.5" ry="7" fill="#38bdf8"/>
                <ellipse cx="27" cy="15" rx="4.5" ry="5" fill="#7dd3fc"/>
                <path d="M17 38c0-7 4.5-12 10-12s10 5 10 12" fill="#38bdf8"/>
                <ellipse cx="24.5" cy="12" rx="2.5" ry="1.8" fill="white" opacity="0.55" transform="rotate(-20 24.5 12)"/>
              </svg>
            </div>
            <span className="text-[9px] text-blue-600 font-bold text-center leading-tight">Taller<br/>Maqjeez</span>
          </div>
        </div>

        {/* ── Zona inferior: escritura ── */}
        <div className="flex flex-col flex-1 min-h-0" style={{ background: "#ffffff" }}>
          {/* Toolbar estilo MSN */}
          <div
            className="flex items-center gap-0.5 px-2 py-1 shrink-0"
            style={{ background: "#dbeafe", borderBottom: "1px solid #93c5fd" }}
          >
            {/* Formato texto */}
            <button className="text-[13px] font-black text-blue-800 px-1 hover:bg-blue-200 rounded" title="Negrita">A</button>
            <div className="w-px h-4 bg-blue-300 mx-1" />
            {/* Emojis */}
            <button
              type="button"
              onClick={() => setShowEmojis(v => !v)}
              className="text-sm px-0.5 hover:scale-110 transition-transform"
              title="Emoticones"
            >😊</button>
            {/* Voice Clip label */}
            <button
              onClick={() => sendSound("nudge", "Sacudida")}
              className="flex items-center gap-0.5 text-[10px] text-blue-700 hover:bg-blue-200 rounded px-1 py-0.5 font-bold"
              title="Nudge - Sacudir"
            >
              <Volume2 className="w-3 h-3" /> Nudge
            </button>
            <div className="w-px h-4 bg-blue-300 mx-1" />
            {/* Sonidos */}
            {MSN_SOUNDS.slice(1).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => sendSound(s.id, s.label)}
                className="text-sm hover:scale-110 transition-transform px-0.5"
                title={s.label}
              >{s.icon}</button>
            ))}
          </div>

          {/* Picker emojis */}
          {showEmojis && (
            <div
              className="shrink-0 grid grid-cols-8 gap-0.5 p-2"
              style={{ background: "#eff6ff", borderBottom: "1px solid #bfdbfe" }}
            >
              {MSN_EMOJIS.map(({ emoji, label }) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => insertEmoji(emoji)}
                  className="text-lg hover:scale-125 transition-transform text-center"
                  title={label}
                >{emoji}</button>
              ))}
            </div>
          )}

          {/* Textarea */}
          <textarea
            ref={inputRef as any}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (texto.trim()) { onSend(autor.trim() || "Técnico", texto.trim()); setTexto(""); }
              }
            }}
            placeholder="Escribí tu mensaje aquí..."
            className="flex-1 resize-none px-2 py-1.5 text-[13px] text-gray-800 outline-none min-h-0"
            style={{ background: "#ffffff", fontFamily: "Arial, sans-serif" }}
          />

          {/* Botón Enviar estilo XP */}
          <div
            className="flex items-center justify-end px-2 py-1.5 gap-2 shrink-0"
            style={{ background: "#dbeafe", borderTop: "1px solid #93c5fd" }}
          >
            <span className="text-[10px] text-gray-500">Enter para enviar</span>
            <button
              type="button"
              disabled={!texto.trim()}
              onClick={() => {
                if (!texto.trim()) return;
                onSend(autor.trim() || "Técnico", texto.trim());
                setTexto("");
              }}
              className="flex items-center gap-1 px-3 py-1 text-[11px] font-bold rounded transition-all disabled:opacity-40"
              style={{
                background: "linear-gradient(to bottom, #f0f7ff, #c8dff7)",
                border: "1px solid #5a8fd0",
                color: "#1a3a6e",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8), 0 1px 2px rgba(0,0,0,0.2)",
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
