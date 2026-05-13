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
  const [minimized, setMinimized] = useState(false);
  const [maximized, setMaximized] = useState(false);
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
    <div className="fixed inset-0 z-[60] flex items-end justify-end p-3 sm:p-5 pointer-events-none">
      {/* ── Ventana MSN Messenger 7 ── */}
      <div
        className="pointer-events-auto flex flex-col overflow-hidden"
        style={{
          width: maximized ? "100vw" : "min(520px, 100vw)",
          height: minimized ? "auto" : maximized ? "100vh" : "min(600px, 90vh)",
          maxWidth: maximized ? "100vw" : undefined,
          position: maximized ? "fixed" : undefined,
          inset: maximized ? 0 : undefined,
          margin: maximized ? 0 : undefined,
          background: "#ecf3fb",
          border: "2px solid #4a7db5",
          borderRadius: maximized ? 0 : "4px 4px 2px 2px",
          boxShadow: "3px 3px 12px rgba(0,0,0,0.45)",
          fontFamily: "Tahoma, Arial, sans-serif",
          fontSize: "11px",
          zIndex: maximized ? 9999 : undefined,
        }}
      >
        {/* ── Barra de título Windows XP ── */}
        <div className="flex items-center justify-between px-2 py-[3px] shrink-0 select-none"
          style={{ background: "linear-gradient(to bottom, #5b9bd5 0%, #3578c0 45%, #2b6cb0 100%)", borderBottom: "1px solid #1e4d8c" }}>
          <div className="flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 48 48" fill="none">
              <ellipse cx="17" cy="13" rx="5.5" ry="6" fill="#4ade80"/><ellipse cx="17" cy="13" rx="4" ry="4.5" fill="#86efac"/>
              <path d="M8 34c0-6 4-10 9-10s9 4 9 10" fill="#4ade80"/>
              <ellipse cx="27" cy="15" rx="6.5" ry="7" fill="#bae6fd"/><ellipse cx="27" cy="15" rx="4.5" ry="5" fill="#e0f2fe"/>
              <path d="M17 38c0-7 4.5-12 10-12s10 5 10 12" fill="#bae6fd"/>
            </svg>
            <span className="text-white text-[11px] font-bold drop-shadow">Taller Maqjeez — Conversación</span>
            {unreadCount > 0 && <span className="bg-yellow-300 text-black text-[9px] font-black px-1 rounded">{unreadCount} nuevo{unreadCount>1?"s":""}</span>}
          </div>
          <div className="flex gap-[2px]">
            <div
              onClick={() => { setMinimized(v => !v); setMaximized(false); }}
              className="w-[16px] h-[13px] rounded-[2px] flex items-center justify-center text-white text-[9px] font-black cursor-pointer hover:brightness-125"
              style={{ background: "linear-gradient(to bottom, #7ab3e0, #4a85c0)", border: "1px solid #2563a0", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)" }}
              title="Minimizar"
            >─</div>
            <div
              onClick={() => { setMaximized(v => !v); setMinimized(false); }}
              className="w-[16px] h-[13px] rounded-[2px] flex items-center justify-center text-white text-[9px] font-black cursor-pointer hover:brightness-125"
              style={{ background: "linear-gradient(to bottom, #7ab3e0, #4a85c0)", border: "1px solid #2563a0", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)" }}
              title={maximized ? "Restaurar" : "Maximizar"}
            >{maximized ? "❐" : "□"}</div>
            <div onClick={onClose} className="w-[16px] h-[13px] rounded-[2px] flex items-center justify-center text-white text-[9px] font-black cursor-pointer hover:brightness-125"
              style={{ background: "linear-gradient(to bottom, #e87a7a, #c0392b)", border: "1px solid #8b1a1a", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)" }}
              title="Cerrar"
            >✕</div>
          </div>
        </div>

        {/* Contenido colapsable — oculto si minimizado */}
        {!minimized && (<>
        {/* ── Barra de menú ── */}
        <div className="flex items-center gap-3 px-2 py-[2px] shrink-0"
          style={{ background: "#d6e8f8", borderBottom: "1px solid #b0c8e8" }}>
          {["Archivo","Acciones","Extras"].map(m => (
            <span key={m} className="text-[11px] text-gray-700 hover:bg-blue-100 px-1 cursor-default rounded">{m}</span>
          ))}
        </div>

        {/* ── Toolbar grande con iconos ── */}
        <div className="flex items-end gap-3 px-3 pt-2 pb-1 shrink-0"
          style={{ background: "linear-gradient(to bottom, #e8f2fc, #d0e4f5)", borderBottom: "1px solid #a0bcd8" }}>
          {[
            { icon: "👤", label: "Invitar" },
            { icon: "📂", label: "Archivos" },
            { icon: "📹", label: "Video" },
            { icon: "🎵", label: "Audio" },
            { icon: "🎮", label: "Juegos" },
          ].map(({ icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-0.5 cursor-default opacity-70 hover:opacity-100 transition-opacity">
              <span className="text-2xl">{icon}</span>
              <span className="text-[10px] text-gray-600">{label}</span>
            </div>
          ))}
          {/* Logo MSN derecha */}
          <div className="ml-auto flex flex-col items-end">
            <span className="text-blue-700 font-black italic text-lg leading-none" style={{ fontFamily: "Arial Black, sans-serif" }}>msn</span>
            <svg width="14" height="14" viewBox="0 0 20 20">
              <ellipse cx="7" cy="10" rx="4" ry="6" fill="#22c55e" opacity="0.85"/>
              <ellipse cx="13" cy="10" rx="4" ry="6" fill="#f97316" opacity="0.85"/>
              <ellipse cx="10" cy="7" rx="4" ry="6" fill="#3b82f6" opacity="0.85"/>
              <ellipse cx="10" cy="13" rx="4" ry="6" fill="#eab308" opacity="0.85"/>
            </svg>
          </div>
        </div>

        {/* ── An: barra destinatario ── */}
        <div className="flex items-center px-2 py-[3px] shrink-0"
          style={{ background: "#eef5fc", borderBottom: "1px solid #b0c8e8" }}>
          <span className="text-[11px] text-gray-500 mr-1">An:</span>
          <span className="text-[11px] font-bold text-black">Equipo del Taller</span>
          <span className="text-[11px] text-gray-400 ml-1">&lt;taller@maqjeez.com&gt;</span>
          <div className="ml-auto flex items-center gap-1">
            <User className="w-3 h-3 text-gray-400"/>
            <input type="text" value={autor} onChange={e=>handleAutorChange(e.target.value)}
              className="text-[11px] font-bold text-blue-700 bg-transparent outline-none border-b border-blue-300 w-20" placeholder="Tu nombre"/>
          </div>
        </div>

        {/* ── Cuerpo: mensajes izq + fotos der ── */}
        <div className="flex min-h-0" style={{ flex: "1 1 0", borderBottom: "2px solid #7aafd4" }}>
          {/* Historial mensajes */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 min-h-0"
            style={{ background: "#ffffff", borderRight: "1px solid #b0c8e8" }}>
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2">
                <MailOpen className="w-8 h-8 text-blue-200"/>
                <p className="text-[11px] text-gray-400 text-center">No hay mensajes todavía.<br/>Escribí el primero abajo.</p>
              </div>
            ) : (
              [...messages].reverse().map((msg) => {
                const isUnread = !msg.leido;
                return (
                  <div key={msg.id} className="group mb-2">
                    <div className="flex items-baseline gap-1 flex-wrap">
                      <span className="text-[11px] font-bold" style={{ color: "#1a56c4" }}>{msg.autor} dice:</span>
                      <span className="text-[10px] text-gray-400">({formatTime(msg.createdAt)})</span>
                      {isUnread && <span className="text-[9px] font-black text-orange-500 ml-1">●NUEVO</span>}
                      <button onClick={()=>onDelete(msg.id)} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-2.5 h-2.5 text-gray-300 hover:text-red-500"/>
                      </button>
                    </div>
                    <div className="text-[12px] text-gray-900 leading-snug pl-1">{msg.contenido}</div>
                  </div>
                );
              })
            )}
          </div>

          {/* Columna derecha: fotos/avatar */}
          <div className="shrink-0 flex flex-col gap-1 p-1.5 overflow-y-auto"
            style={{ width: "90px", background: "#dce9f5" }}>
            {/* Avatar muñequito MSN */}
            <div className="w-full aspect-square rounded flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #bfdbfe, #dbeafe)", border: "1px solid #93c5fd" }}>
              <svg width="56" height="56" viewBox="0 0 48 48" fill="none">
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
            <p className="text-[9px] text-blue-600 font-bold text-center">Taller Maqjeez</p>
            {/* Segundo panel */}
            <div className="w-full aspect-square rounded mt-1 flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #d1fae5, #a7f3d0)", border: "1px solid #6ee7b7" }}>
              <span className="text-3xl">🔧</span>
            </div>
            <p className="text-[9px] text-green-700 font-bold text-center">En línea</p>
          </div>
        </div>

        {/* ── Toolbar de formato (como MSN) ── */}
        <div className="flex items-center gap-1 px-2 py-[3px] shrink-0"
          style={{ background: "#d6e8f8", borderBottom: "1px solid #a8c4e0" }}>
          <span className="text-[14px] font-black text-blue-900 px-1 cursor-default hover:bg-blue-200 rounded leading-none">A</span>
          <div className="w-px h-3.5 bg-blue-300 mx-0.5"/>
          <button type="button" onClick={()=>setShowEmojis(v=>!v)}
            className={`text-sm px-0.5 hover:scale-110 transition-transform rounded ${showEmojis?"bg-blue-200":""}`} title="Emoticones">😊</button>
          <div className="w-px h-3.5 bg-blue-300 mx-0.5"/>
          <button onClick={()=>sendSound("nudge","Sacudida")}
            className="flex items-center gap-0.5 text-[10px] text-blue-800 hover:bg-blue-200 rounded px-1 py-0.5 font-bold">
            <Volume2 className="w-3 h-3"/> Nudge
          </button>
          <div className="w-px h-3.5 bg-blue-300 mx-0.5"/>
          {MSN_SOUNDS.slice(1).map(s => (
            <button key={s.id} type="button" onClick={()=>sendSound(s.id,s.label)}
              className="text-sm hover:scale-110 transition-transform px-0.5" title={s.label}>{s.icon}</button>
          ))}
        </div>

        {/* Picker emojis */}
        {showEmojis && (
          <div className="shrink-0 grid grid-cols-8 gap-0.5 p-1.5"
            style={{ background: "#eef5fc", borderBottom: "1px solid #b0c8e8" }}>
            {MSN_EMOJIS.map(({ emoji, label }) => (
              <button key={emoji} type="button" onClick={()=>insertEmoji(emoji)}
                className="text-lg hover:scale-125 transition-transform text-center" title={label}>{emoji}</button>
            ))}
          </div>
        )}

        {/* ── Área de escritura + Enviar/Buscar ── */}
        <div className="flex shrink-0" style={{ height: "90px", background: "#fff" }}>
          <textarea
            ref={inputRef as any}
            value={texto}
            onChange={e=>setTexto(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (texto.trim()) { onSend(autor.trim()||"Técnico", texto.trim()); setTexto(""); }
              }
            }}
            placeholder="Escribí tu mensaje aquí..."
            className="flex-1 resize-none px-2 py-1.5 text-[12px] text-gray-900 outline-none"
            style={{ background: "#ffffff", fontFamily: "Tahoma, Arial, sans-serif", borderRight: "1px solid #b0c8e8" }}
          />
          {/* Columna botones */}
          <div className="flex flex-col gap-1 p-1.5 shrink-0 justify-start"
            style={{ width: "72px", background: "#dce9f5" }}>
            <button type="button" disabled={!texto.trim()}
              onClick={() => { if (!texto.trim()) return; onSend(autor.trim()||"Técnico",texto.trim()); setTexto(""); }}
              className="w-full py-1 text-[11px] font-bold rounded transition-all disabled:opacity-40"
              style={{
                background: "linear-gradient(to bottom, #f0f7ff, #c8dff7)",
                border: "1px solid #5a8fd0",
                color: "#1a3a6e",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)",
              }}>Enviar</button>
          </div>
        </div>

        {/* ── Barra de estado ── */}
        <div className="flex items-center px-2 py-[2px] shrink-0 gap-2"
          style={{ background: "#c8ddf0", borderTop: "1px solid #a0bcd8" }}>
          <span className="text-[10px] text-gray-600 flex-1 truncate">
            {messages.length > 0
              ? `Último mensaje: ${formatTime(messages[0].createdAt)} • ${messages.length} mensaje${messages.length>1?"s":""}`
              : "Sin mensajes — escribí el primero"}
          </span>
          <User className="w-3 h-3 text-blue-500"/>
          <span className="text-[10px] font-bold text-blue-700">{autor}</span>
        </div>
        </>)}
      </div>
    </div>
  );
}
