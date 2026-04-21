"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft, RefreshCw, MessageCircle, Send, Clock,
  CheckCircle2, AlertCircle, ChevronDown, ChevronUp,
  Search, Package, Settings, Plus, Trash2, Edit2, Check, X,
  Users, ShoppingBag, Mail, Bell, UserCircle, AlertTriangle, Shield
} from "lucide-react";
import QuestionSuggestion from "@/components/QuestionSuggestion";
import { supabase } from "@/lib/supabase";

const DEFAULT_TEMPLATES = [
  "¡Hola! Sí, el producto está disponible. ¿Tenés alguna consulta adicional?",
  "El envío es por Mercado Envíos y llega en 24-72hs hábiles.",
  "Sí, contamos con stock disponible. Podés comprarlo con total confianza.",
  "El producto es original de fábrica. Cualquier consulta estamos a disposición.",
];

function useTemplates() {
  const [templates, setTemplates] = useState<string[]>(DEFAULT_TEMPLATES);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("appjeez_quick_replies");
      if (saved) setTemplates(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  const save = (list: string[]) => {
    setTemplates(list);
    localStorage.setItem("appjeez_quick_replies", JSON.stringify(list));
  };

  return { templates, save };
}

interface Question {
  id: string;
  meli_question_id: number;
  meli_account_id: string;
  item_id: string;
  item_title: string;
  item_thumbnail: string;
  buyer_id: number;
  buyer_nickname: string;
  question_text: string;
  status: string;
  date_created: string;
  answer_text: string | null;
  meli_accounts: { nickname: string } | null;
}

interface Message {
  id: string;
  meli_message_id: string;
  meli_account_id: string;
  order_id: string;
  pack_id: string;
  buyer_id: number;
  buyer_nickname: string;
  item_id: string;
  item_title: string;
  item_thumbnail: string;
  message_text: string;
  status: "UNREAD" | "READ" | "SENT";
  message_type: "buyer" | "seller";
  date_created: string;
  date_read: string | null;
  attachments: string[];
  meli_accounts: { nickname: string } | null;
  order: { order_id: string; status: string; total_amount: number } | null;
}

type TabType = "questions" | "messages" | "claims";

interface ClaimMessage {
  id: string;
  sender_role: string;
  text: string;
  date_created: string;
}

interface Claim {
  id: string;
  claim_id: string;
  meli_account_id: string;
  meli_user_id: string;
  account_nickname: string;
  type: "claim" | "mediation";
  status: string;
  stage: string;
  reason_id: string;
  reason: string;
  resource_id: string;
  date_created: string;
  last_updated: string;
  buyer: { id: number; nickname: string };
  messages: ClaimMessage[];
  resolution: any;
  meli_accounts: { nickname: string } | null;
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "ahora";
  if (m < 60) return `hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
}

/* ── Gestor de plantillas ── */
function TemplatesManager({ onClose }: { onClose: () => void }) {
  const { templates, save } = useTemplates();
  const [list, setList]     = useState<string[]>(templates);
  const [editing, setEditing] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [newText, setNewText]   = useState("");

  const startEdit = (i: number) => { setEditing(i); setEditText(list[i]); };
  const confirmEdit = (i: number) => {
    if (!editText.trim()) return;
    const updated = [...list]; updated[i] = editText.trim();
    setList(updated); setEditing(null);
  };
  const remove = (i: number) => setList(list.filter((_, idx) => idx !== i));
  const add = () => {
    if (!newText.trim()) return;
    setList([...list, newText.trim()]); setNewText("");
  };
  const handleSave = () => { save(list); onClose(); };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.1)" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <h2 className="font-black text-white text-base flex items-center gap-2">
            <Settings className="w-5 h-5" style={{ color: "#00E5FF" }} />
            Respuestas Rápidas
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }}>
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
          {list.map((t, i) => (
            <div key={i} className="rounded-xl overflow-hidden" style={{ background: "#121212", border: "1px solid rgba(255,255,255,0.06)" }}>
              {editing === i ? (
                <div className="flex gap-2 p-2">
                  <textarea
                    rows={2}
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg text-sm text-white outline-none resize-none"
                    style={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.1)" }}
                  />
                  <div className="flex flex-col gap-1">
                    <button onClick={() => confirmEdit(i)} className="p-1.5 rounded-lg" style={{ background: "#39FF1422", color: "#39FF14" }}>
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditing(null)} className="p-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.05)", color: "#6B7280" }}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 p-3">
                  <p className="flex-1 text-sm text-gray-300">{t}</p>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => startEdit(i)} className="p-1.5 rounded-lg" style={{ background: "#00E5FF18", color: "#00E5FF" }}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => remove(i)} className="p-1.5 rounded-lg" style={{ background: "#ef444418", color: "#ef4444" }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="px-4 pb-2">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Nueva respuesta rápida..."
              value={newText}
              onChange={e => setNewText(e.target.value)}
              onKeyDown={e => e.key === "Enter" && add()}
              className="flex-1 px-3 py-2.5 rounded-xl text-sm text-white placeholder-gray-500 outline-none"
              style={{ background: "#121212", border: "1px solid rgba(255,255,255,0.1)" }}
            />
            <button onClick={add} disabled={!newText.trim()}
              className="px-3 py-2.5 rounded-xl font-bold text-sm disabled:opacity-40"
              style={{ background: "#00E5FF18", color: "#00E5FF", border: "1px solid #00E5FF33" }}>
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-4 pb-4 pt-2">
          <button onClick={handleSave}
            className="w-full py-3 rounded-xl font-black text-sm text-black"
            style={{ background: "#FFE600" }}>
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Tarjeta de pregunta ── */
function QuestionCard({ q, onAnswered }: { q: Question; onAnswered: (id: number) => void }) {
  const { templates } = useTemplates();
  const [open, setOpen]       = useState(false);
  const [text, setText]       = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);

  const FIRMA = "Atte.: MAQJEEZ";

  async function handleSend() {
    if (!text.trim()) return;

    let finalText = text.trim();
    if (!finalText.endsWith(FIRMA)) {
      finalText = finalText + "\n\n" + FIRMA;
    }

    if (finalText.length > 2000) {
      setError("El mensaje es demasiado largo para incluir la firma. Por favor, acorta el texto.");
      return;
    }

    setText(finalText);
    await new Promise(r => setTimeout(r, 300));

    setSending(true); setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authHeaders: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) {
        authHeaders["Authorization"] = `Bearer ${session.access_token}`;
      }
      const res = await fetch("/api/meli-answer", {
        method:  "POST",
        headers: authHeaders,
        body:    JSON.stringify({
          question_id: q.meli_question_id,
          answer_text: finalText,
          meli_account_id: q.meli_account_id, // Enviar ID de cuenta para respuesta directa
          pregunta_original: q.question_text,
        }),
      });
      const data = await res.json();
      if (data.status === "ok") {
        setAnswered(true);
        // Mostrar mensaje de éxito
        setSuccessMessage(`✅ Respuesta enviada exitosamente a ${q.meli_accounts?.nickname || 'comprador'}`);
        setTimeout(() => setSuccessMessage(null), 3000);
        // Notificar inmediatamente al componente padre para remover la pregunta
        onAnswered(q.meli_question_id);
      } else {
        setError(data.error ?? data.code ?? "Error al enviar");
      }
    } catch {
      setError("Error de red");
    } finally {
      setSending(false);
    }
  }

  const account = q.meli_accounts?.nickname ?? "—";

  return (
    <div className="rounded-2xl overflow-hidden transition-all duration-300"
      style={{ 
        background: "#1F1F1F", 
        border: answered ? "1px solid #39FF1444" : "1px solid rgba(255,255,255,0.07)",
        opacity: answered ? 0.6 : 1
      }}>
      <button onClick={() => setOpen(o => !o)} className="w-full text-left p-4">
        <div className="flex items-start gap-4">
          {/* Foto del producto — 80x80px — clickable a la publicación */}
          <a
            href={`https://articulo.mercadolibre.com.ar/${q.item_id.replace(/^([A-Z]+)(\d+)$/, "$1-$2")}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Ver publicación original"
            onClick={e => e.stopPropagation()}
            className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer relative group shadow-md"
            style={{ background: "#2a2a2a", border: "2px solid rgba(255,230,0,0.1)" }}>
            {q.item_thumbnail ? (
              <Image
                src={q.item_thumbnail}
                alt={q.item_title}
                width={80}
                height={80}
                loading="lazy"
                className="w-full h-full object-cover transition-opacity group-hover:opacity-75"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="w-8 h-8 text-gray-600" />
              </div>
            )}
            {/* Overlay al hover */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: "rgba(0,0,0,0.6)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </div>
          </a>

          {/* Info del producto + pregunta */}
          <div className="flex-1 min-w-0">
            {/* Título del producto */}
            <a
              href={`https://articulo.mercadolibre.com.ar/${q.item_id.replace(/^([A-Z]+)(\d+)$/, "$1-$2")}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="text-xs font-bold text-blue-400 hover:text-blue-300 hover:underline mb-1.5 block transition-colors line-clamp-2"
              title={q.item_title}
            >
              {q.item_title || q.item_id}
            </a>

            {/* Cuenta */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: "#FFE60018", color: "#FFE600" }}>
                @{account}
              </span>
              <span className="text-[10px]" style={{ color: "#6B7280" }}>
                de {q.buyer_nickname || "Usuario"}
              </span>
            </div>

            {/* Texto de la pregunta */}
            <p className="text-sm text-white font-medium leading-snug line-clamp-2">{q.question_text}</p>
          </div>

          {/* Tiempo y chevron */}
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <span className="text-[10px]" style={{ color: "#6B7280" }}>{timeAgo(q.date_created)}</span>
            {answered ? (
              <CheckCircle2 className="w-5 h-5" style={{ color: "#39FF14" }} />
            ) : (
              open ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </div>
        </div>
      </button>

      {open && !answered && (
        <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          {/* Pregunta completa */}
          <div className="pt-3 p-3 rounded-xl" style={{ background: "#121212" }}>
            <p className="text-xs font-semibold mb-1" style={{ color: "#6B7280" }}>Pregunta completa:</p>
            <p className="text-sm text-white">{q.question_text}</p>
          </div>

          {/* ✨ Componente de sugerencias basado en historial */}
          <QuestionSuggestion
            preguntaTexto={q.question_text}
            onUseSuggestion={(texto) => setText(texto)}
          />

          {templates.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#6B7280" }}>
                Respuestas rápidas
              </p>
              <div className="flex flex-col gap-1.5">
                {templates.map((t, i) => (
                  <button key={i} onClick={() => setText(t)}
                    className="text-left text-xs px-3 py-2 rounded-xl transition-opacity hover:opacity-80"
                    style={{ background: "#00E5FF12", color: "#00E5FF", border: "1px solid #00E5FF22" }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          <textarea
            rows={3}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Escribí tu respuesta..."
            className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-gray-500 outline-none resize-none"
            style={{ background: "#121212", border: "1px solid rgba(255,255,255,0.1)" }}
          />

          {successMessage && (
            <div className="mb-3 p-2 rounded-lg text-center text-sm font-medium" style={{ backgroundColor: "#10b981", color: "white" }}>
              {successMessage}
            </div>
          )}
          {error && <p className="text-xs" style={{ color: "#ef4444" }}>Error: {error}</p>}

          <button onClick={handleSend} disabled={sending || !text.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-black disabled:opacity-40"
            style={{ background: "#FFE600" }}>
            {sending
              ? <><RefreshCw className="w-4 h-4 animate-spin" /> Enviando...</>
              : <><Send className="w-4 h-4" /> Responder</>}
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Tarjeta de mensaje ── */
function MessageCard({ m, onMarkAsRead }: { m: Message; onMarkAsRead: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSendReply() {
    if (!replyText.trim()) return;
    
    setSending(true); setError(null);
    try {
      const res = await fetch("/api/meli-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: m.order_id,
          message_text: replyText,
          meli_account_id: m.meli_account_id,
        }),
      });
      const data = await res.json();
      if (data.status === "ok") {
        setReplyText("");
        setOpen(false);
      } else {
        setError(data.error ?? "Error al enviar");
      }
    } catch {
      setError("Error de red");
    } finally {
      setSending(false);
    }
  }

  // Marcar como leído al abrir
  useEffect(() => {
    if (open && m.status === "UNREAD") {
      onMarkAsRead(m.id);
    }
  }, [open, m.status, m.id, onMarkAsRead]);

  const account = m.meli_accounts?.nickname ?? "—";

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ 
        background: m.status === "UNREAD" ? "#FF572218" : "#1F1F1F", 
        border: `1px solid ${m.status === "UNREAD" ? "#FF572244" : "rgba(255,255,255,0.07)"}` 
      }}>
      <button onClick={() => setOpen(o => !o)} className="w-full text-left p-4">
        <div className="flex items-start gap-4">
          {/* Avatar del comprador */}
          <div className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "#2a2a2a", border: "2px solid rgba(255,87,34,0.3)" }}>
            <UserCircle className="w-10 h-10" style={{ color: "#FF5722" }} />
          </div>

          {/* Info del mensaje */}
          <div className="flex-1 min-w-0">
            {/* Cuenta y orden */}
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: "#FFE60018", color: "#FFE600" }}>
                @{account}
              </span>
              {m.status === "UNREAD" && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "#ef444418", color: "#ef4444" }}>
                  Nuevo
                </span>
              )}
            </div>

            {/* Nombre del comprador */}
            <p className="text-sm font-bold text-white mb-1">
              {m.buyer_nickname || "Comprador"}
            </p>

            {/* Producto */}
            <p className="text-xs text-blue-400 line-clamp-1 mb-1">
              {m.item_title || "Producto"}
            </p>

            {/* Preview del mensaje */}
            <p className="text-xs text-gray-400 line-clamp-2">{m.message_text}</p>
          </div>

          {/* Tiempo y orden info */}
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <span className="text-[10px]" style={{ color: "#6B7280" }}>{timeAgo(m.date_created)}</span>
            {m.order && (
              <span className="text-[10px] px-1.5 py-0.5 rounded" 
                style={{ background: "#39FF1418", color: "#39FF14" }}>
                ${m.order.total_amount?.toLocaleString("es-AR")}
              </span>
            )}
            {open ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
          </div>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          {/* Detalles del mensaje */}
          <div className="pt-3 p-3 rounded-xl" style={{ background: "#121212" }}>
            <p className="text-xs font-semibold mb-2" style={{ color: "#6B7280" }}>Mensaje completo:</p>
            <p className="text-sm text-white mb-3">{m.message_text}</p>
            
            <div className="flex flex-wrap gap-2 text-[10px]">
              <span style={{ color: "#6B7280" }}>
                Orden: <span className="text-white">{m.order_id}</span>
              </span>
              {m.order && (
                <span style={{ color: "#6B7280" }}>
                  Estado: <span className="text-white">{m.order.status}</span>
                </span>
              )}
            </div>
          </div>

          {/* Adjuntos si hay */}
          {m.attachments?.length > 0 && (
            <div className="p-3 rounded-xl" style={{ background: "#121212" }}>
              <p className="text-xs font-semibold mb-2" style={{ color: "#6B7280" }}>Adjuntos:</p>
              <div className="flex gap-2 flex-wrap">
                {m.attachments.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                    className="text-xs px-2 py-1 rounded-lg"
                    style={{ background: "#00E5FF18", color: "#00E5FF" }}>
                    Archivo {i + 1}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Respuesta */}
          <div className="pt-2">
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#6B7280" }}>
              Responder al comprador
            </p>
            <textarea
              rows={2}
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder="Escribí tu respuesta..."
              className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-gray-500 outline-none resize-none mb-2"
              style={{ background: "#121212", border: "1px solid rgba(255,255,255,0.1)" }}
            />
            {error && <p className="text-xs mb-2" style={{ color: "#ef4444" }}>Error: {error}</p>}
            <button onClick={handleSendReply} disabled={sending || !replyText.trim()}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm text-black disabled:opacity-40"
              style={{ background: "#FFE600" }}>
              {sending
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Enviando...</>
                : <><Send className="w-4 h-4" /> Responder</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Tarjeta de reclamo ── */
function ClaimCard({ claim, onResponded }: { claim: Claim; onResponded: () => void }) {
  const [open, setOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMediation = claim.type === "mediation";

  async function handleReply() {
    if (!replyText.trim()) return;
    setSending(true); setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/meli-claims/respond", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          claim_id: claim.claim_id,
          message_text: replyText,
          meli_account_id: claim.meli_account_id,
          action: "message",
        }),
      });
      const data = await res.json();
      if (data.status === "ok") {
        setReplyText("");
        onResponded();
      } else {
        setError(data.error ?? "Error al enviar");
      }
    } catch { setError("Error de red"); }
    finally { setSending(false); }
  }

  const account = claim.meli_accounts?.nickname ?? claim.account_nickname ?? "-";

  return (
    <div className="rounded-2xl overflow-hidden" style={{ 
      background: isMediation ? "#FF980018" : "#EF444418", 
      border: `1px solid ${isMediation ? "#FF980044" : "#EF444444"}` 
    }}>
      <button onClick={() => setOpen(o => !o)} className="w-full text-left p-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: isMediation ? "#FF980033" : "#EF444433" }}>
            {isMediation 
              ? <Shield className="w-6 h-6" style={{ color: "#FF9800" }} />
              : <AlertTriangle className="w-6 h-6" style={{ color: "#EF4444" }} />
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: isMediation ? "#FF980033" : "#EF444433", color: isMediation ? "#FF9800" : "#EF4444" }}>
                {isMediation ? "Mediacion" : "Reclamo"}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: "#FFE60018", color: "#FFE600" }}>
                @{account}
              </span>
            </div>
            <p className="text-sm font-bold text-white mb-1">{claim.reason}</p>
            <p className="text-xs text-gray-400">
              De: {claim.buyer?.nickname || "Comprador"} - {timeAgo(claim.date_created)}
            </p>
          </div>
          <div className="flex-shrink-0">
            {open ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
          </div>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          {claim.messages.length > 0 && (
            <div className="pt-3 space-y-2">
              <p className="text-xs font-semibold" style={{ color: "#6B7280" }}>Hilo de mensajes:</p>
              {claim.messages.map((msg, i) => (
                <div key={msg.id || i} className="p-2 rounded-lg" style={{ 
                  background: msg.sender_role === "respondent" ? "#1a3a1a" : msg.sender_role === "mediator" ? "#3a3a1a" : "#121212" 
                }}>
                  <p className="text-[10px] font-bold mb-1" style={{ 
                    color: msg.sender_role === "respondent" ? "#34D399" : msg.sender_role === "mediator" ? "#FFE600" : "#9CA3AF" 
                  }}>
                    {msg.sender_role === "respondent" ? "Tu respuesta" : msg.sender_role === "mediator" ? "Mediador MeLi" : "Comprador"}
                    <span className="font-normal ml-2">{timeAgo(msg.date_created)}</span>
                  </p>
                  <p className="text-sm text-white">{msg.text}</p>
                </div>
              ))}
            </div>
          )}

          <textarea
            rows={2}
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            placeholder="Escribi tu respuesta al reclamo..."
            className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-gray-500 outline-none resize-none"
            style={{ background: "#121212", border: "1px solid rgba(255,255,255,0.1)" }}
          />
          {error && <p className="text-xs" style={{ color: "#ef4444" }}>Error: {error}</p>}
          <div className="flex gap-2">
            <button onClick={handleReply} disabled={sending || !replyText.trim()}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm text-black disabled:opacity-40"
              style={{ background: "#FFE600" }}>
              {sending ? <><RefreshCw className="w-4 h-4 animate-spin" /> Enviando...</> : <><Send className="w-4 h-4" /> Responder</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Página principal ── */
function MensajesInner() {
  const [activeTab, setActiveTab] = useState<TabType>("questions");
  
  // Estados para preguntas
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [questionsSyncing, setQuestionsSyncing] = useState(false);
  const [questionsError, setQuestionsError] = useState<string | null>(null);
  
  // Estado para rastrear preguntas respondidas recientemente (evita que vuelvan a aparecer)
  const [recentlyAnswered, setRecentlyAnswered] = useState<Set<number>>(() => {
    // Cargar desde localStorage al iniciar
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("recentlyAnsweredQuestions");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Filtrar solo los que tienen menos de 30 minutos (aumentado de 10)
          const now = Date.now();
          const valid = parsed.filter((item: any) => now - item.timestamp < 30 * 60 * 1000);
          return new Set(valid.map((item: any) => item.id));
        } catch {
          return new Set();
        }
      }
    }
    return new Set();
  });

  const recentlyAnsweredRef = useRef<Set<number>>(new Set());
  
  // Inicializar el ref desde localStorage al montar el componente
  useEffect(() => {
    const saved = localStorage.getItem("recentlyAnsweredQuestions");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const now = Date.now();
        const valid = parsed.filter((item: any) => now - item.timestamp < 30 * 60 * 1000);
        const validSet = new Set<number>(valid.map((item: any) => item.id));
        recentlyAnsweredRef.current = validSet;
      } catch {
        recentlyAnsweredRef.current = new Set();
      }
    }
  }, []);
  
  // Sincronizar el ref cuando cambia el estado
  useEffect(() => { recentlyAnsweredRef.current = recentlyAnswered; }, [recentlyAnswered]);
  
  // Estados para mensajes
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [messagesSyncing, setMessagesSyncing] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);

  // Estados para reclamos
  const [claims, setClaims] = useState<Claim[]>([]);
  const [claimsLoading, setClaimsLoading] = useState(true);
  const [claimsError, setClaimsError] = useState<string | null>(null);
  
  const [search, setSearch] = useState("");
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const initialLoadDone = useRef(false);
  const loadRef = useRef<((sync?: boolean) => Promise<void>) | null>(null);

  // Cargar preguntas
  const loadQuestions = useCallback(async (sync = false) => {
    if (sync) setQuestionsSyncing(true); else setQuestionsLoading(true);
    setQuestionsError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setQuestionsError("No autenticado"); return; }
      
      // Agregar retry logic
      let retries = 3;
      let data: Question[] = [];
      let lastError: Error | null = null;
      
      while (retries > 0) {
        try {
          const res = await fetch(`/api/meli-questions?_t=${Date.now()}`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
            // Asegurar que no use caché
            cache: 'no-store',
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          data = await res.json();
          break; // Éxito, salir del loop
        } catch (err) {
          lastError = err as Error;
          retries--;
          if (retries > 0) {
            console.log(`[PREGUNTAS] Reintentando... ${retries} intentos restantes`);
            await new Promise(r => setTimeout(r, 1000)); // Esperar 1s antes de reintentar
          }
        }
      }
      
      if (retries === 0 && lastError) {
        throw lastError;
      }
      
      console.log(`[PREGUNTAS] Recibidas ${data.length} preguntas de la API`);

      const seen = new Set<number>();
      const unique = data.filter(q => {
        const qId = Number(q.meli_question_id);
        if (seen.has(qId)) return false;
        seen.add(qId);
        return true;
      });
      console.log(`[PREGUNTAS] ${unique.length} preguntas unicas despues de filtrar duplicados`);

      // Filtrar preguntas ya respondidas (convertir a número para comparación)
      // Solo filtrar si tienen menos de 30 minutos (evitar filtrar permanentemente)
      const now = Date.now();
      const validAnsweredIds = Array.from(recentlyAnsweredRef.current)
        .filter(id => {
          // Buscar en localStorage el timestamp
          const saved = localStorage.getItem("recentlyAnsweredQuestions");
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              const item = parsed.find((p: any) => p.id === id);
              if (item) {
                return (now - item.timestamp) < 30 * 60 * 1000; // Solo si tiene < 30 min
              }
            } catch {}
          }
          return true; // Si no hay timestamp, asumir válido
        })
        .map(id => Number(id));
        
      const answeredSet = new Set(validAnsweredIds);
      const filtered = unique.filter(q => !answeredSet.has(Number(q.meli_question_id)));
      console.log(`[PREGUNTAS] ${filtered.length} preguntas despues de filtrar respondidas recientes. Respondidas recientes: ${validAnsweredIds.length}`);
      
      setQuestions(filtered);
      setLastSync(new Date());
    } catch (e) {
      console.error("[PREGUNTAS] Error cargando:", e);
      setQuestionsError((e as Error).message);
    } finally {
      setQuestionsLoading(false); setQuestionsSyncing(false);
    }
  }, []);

  // Cargar mensajes
  const loadMessages = useCallback(async (sync = false) => {
    if (sync) setMessagesSyncing(true); else setMessagesLoading(true);
    setMessagesError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setMessagesError("No autenticado"); return; }
      const res = await fetch("/api/meli-messages?limit=50", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Message[] = await res.json();
      setMessages(data);
      setUnreadCount(data.filter(m => m.status === "UNREAD").length);
      setLastSync(new Date());
    } catch (e) {
      setMessagesError((e as Error).message);
    } finally {
      setMessagesLoading(false); setMessagesSyncing(false);
    }
  }, []);

  // Cargar reclamos
  const loadClaims = useCallback(async (sync = false) => {
    if (sync) setClaimsLoading(true);
    else setClaimsLoading(true);
    setClaimsError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setClaimsError("No autenticado"); return; }
      const res = await fetch("/api/meli-claims", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Claim[] = await res.json();
      setClaims(data);
    } catch (e) {
      setClaimsError((e as Error).message);
    } finally {
      setClaimsLoading(false);
    }
  }, []);

  // Cargar todo
  const loadAll = useCallback(async (sync = false) => {
    await Promise.all([loadQuestions(sync), loadMessages(sync), loadClaims(sync)]);
  }, [loadQuestions, loadMessages, loadClaims]);

  // Mantener ref de load siempre actualizada para el Worker
  useEffect(() => { loadRef.current = loadAll; }, [loadAll]);

  useEffect(() => {
    // Carga inicial inmediata
    loadAll();

    // Polling más frecuente para preguntas (cada 30 segundos)
    const interval = setInterval(() => {
      console.log('[MENSAJES] Polling automático...');
      loadRef.current?.(true);
    }, 30000);
    
    // Recargar cuando la ventana vuelve a tener foco
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[MENSAJES] Ventana visible, recargando...');
        loadRef.current?.(true);
      }
    };
    
    // Recargar cuando vuelve la conexión
    const handleOnline = () => {
      console.log('[MENSAJES] Conexión restaurada, recargando...');
      loadRef.current?.(true);
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handler cuando se responde una pregunta - remueve inmediatamente y marca como respondida
  const handleAnswered = useCallback((id: number) => {
    // Remover inmediatamente de la lista visible
    setQuestions(qs => qs.filter(q => q.meli_question_id !== id));
    setSuccessToast("Pregunta respondida exitosamente");
    setTimeout(() => setSuccessToast(null), 4000);
    
    // Agregar al set de respondidas recientemente (también actualizar el ref inmediatamente)
    const newId = Number(id);
    setRecentlyAnswered(prev => {
      const newSet = new Set(prev).add(newId);
      
      // Actualizar el ref inmediatamente para que el polling lo vea
      recentlyAnsweredRef.current = newSet;
      
      // Guardar en localStorage con timestamp
      const toSave = Array.from(newSet).map(qId => ({ id: qId, timestamp: Date.now() }));
      localStorage.setItem("recentlyAnsweredQuestions", JSON.stringify(toSave));
      
      return newSet;
    });
    
    // Limpiar después de 30 minutos (aumentado de 10)
    setTimeout(() => {
      setRecentlyAnswered(prev => {
        const newSet = new Set(prev);
        newSet.delete(newId);
        
        // Actualizar el ref
        recentlyAnsweredRef.current = newSet;
        
        // Actualizar localStorage
        const toSave = Array.from(newSet).map(qId => ({ id: qId, timestamp: Date.now() }));
        localStorage.setItem("recentlyAnsweredQuestions", JSON.stringify(toSave));
        
        return newSet;
      });
    }, 30 * 60 * 1000);
  }, []);

  // Marcar mensaje como leído
  const handleMarkAsRead = useCallback(async (id: string) => {
    try {
      await fetch("/api/meli-messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message_ids: [id] }),
      });
      setMessages(prev => prev.map(m => 
        m.id === id ? { ...m, status: "READ", date_read: new Date().toISOString() } : m
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {
      console.error("Error marking as read:", e);
    }
  }, []);

  const filteredQuestions = questions.filter(q =>
    // Excluir preguntas respondidas recientemente (convertir a número para comparación)
    !recentlyAnswered.has(Number(q.meli_question_id)) &&
    (q.question_text.toLowerCase().includes(search.toLowerCase()) ||
    (q.item_title ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (q.meli_accounts?.nickname ?? "").toLowerCase().includes(search.toLowerCase()))
  );

  const pendingQuestions = questions.filter(q => !recentlyAnswered.has(Number(q.meli_question_id)));

  const filteredMessages = messages.filter(m =>
    m.message_text.toLowerCase().includes(search.toLowerCase()) ||
    (m.item_title ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (m.buyer_nickname ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (m.meli_accounts?.nickname ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const isLoading = activeTab === "questions" ? questionsLoading : activeTab === "messages" ? messagesLoading : claimsLoading;
  const isSyncing = activeTab === "questions" ? questionsSyncing : activeTab === "messages" ? messagesSyncing : false;
  const error = activeTab === "questions" ? questionsError : activeTab === "messages" ? messagesError : claimsError;
  const currentData = activeTab === "questions" ? filteredQuestions : activeTab === "messages" ? filteredMessages : claims;

  return (
    <main className="min-h-screen pb-24" style={{ background: "#121212" }}>
      {successToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl font-bold text-sm text-black flex items-center gap-2 shadow-2xl animate-pulse"
          style={{ background: "#39FF14" }}>
          <CheckCircle2 className="w-5 h-5" />
          {successToast}
        </div>
      )}
      {showTemplates && <TemplatesManager onClose={() => setShowTemplates(false)} />}

      {/* Header */}
      <div className="sticky top-0 z-30 px-4 py-3 flex items-center justify-between border-b"
        style={{ background: "rgba(18,18,18,0.97)", backdropFilter: "blur(16px)", borderColor: "rgba(255,255,255,0.07)" }}>
        <div className="flex items-center gap-3">
          <Link href="/" className="p-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }}>
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </Link>
          <div>
            <h1 className="font-black text-white text-base flex items-center gap-2">
              <MessageCircle className="w-5 h-5" style={{ color: "#FF5722" }} />
              Mensajería Unificada
            </h1>
            <p className="text-[10px]" style={{ color: "#6B7280" }}>
              {lastSync ? `Sync ${lastSync.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })}` : "Cargando..."}
              {" · "}<Clock className="w-3 h-3 inline" /> auto cada 30s
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowTemplates(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold"
            style={{ background: "#1F1F1F", color: "#00E5FF", border: "1px solid #00E5FF33" }}>
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Plantillas</span>
          </button>
          <button onClick={() => loadAll(true)} disabled={isSyncing || isLoading}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold disabled:opacity-40"
            style={{ background: "#1F1F1F", color: "#FF5722", border: "1px solid #FF572244" }}>
            <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Sync..." : "Actualizar"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-2xl mx-auto px-4 pt-4">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab("questions")}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all"
            style={{ 
              background: activeTab === "questions" ? "#FF5722" : "#1F1F1F",
              color: activeTab === "questions" ? "#fff" : "#9CA3AF",
              border: activeTab === "questions" ? "none" : "1px solid rgba(255,255,255,0.1)"
            }}>
            <Users className="w-4 h-4" />
            Preguntas
            {pendingQuestions.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs"
                style={{ background: "rgba(0,0,0,0.3)" }}>
                {pendingQuestions.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("messages")}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all"
            style={{ 
              background: activeTab === "messages" ? "#00E5FF" : "#1F1F1F",
              color: activeTab === "messages" ? "#000" : "#9CA3AF",
              border: activeTab === "messages" ? "none" : "1px solid rgba(255,255,255,0.1)"
            }}>
            <ShoppingBag className="w-4 h-4" />
            Compradores
            {unreadCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs"
                style={{ background: "rgba(0,0,0,0.3)" }}>
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("claims")}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all"
            style={{ 
              background: activeTab === "claims" ? "#EF4444" : "#1F1F1F",
              color: activeTab === "claims" ? "#fff" : "#9CA3AF",
              border: activeTab === "claims" ? "none" : "1px solid rgba(255,255,255,0.1)"
            }}>
            <AlertTriangle className="w-4 h-4" />
            Reclamos
            {claims.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs"
                style={{ background: "rgba(0,0,0,0.3)" }}>
                {claims.length}
              </span>
            )}
          </button>
        </div>

        {/* Counter */}
        {!isLoading && (
          <div className="rounded-2xl p-4 mb-4 flex items-center gap-4"
            style={{
              background: currentData.length > 0 
                ? (activeTab === "questions" ? "#FF572218" : "#00E5FF18")
                : "#1F1F1F",
              border: `1px solid ${currentData.length > 0 
                ? (activeTab === "questions" ? "#FF572244" : "#00E5FF44")
                : "rgba(255,255,255,0.07)"}`,
            }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl"
              style={{ 
                background: currentData.length > 0 
                  ? (activeTab === "questions" ? "#FF5722" : "#00E5FF")
                  : "#2a2a2a", 
                color: currentData.length > 0 && activeTab === "messages" ? "#000" : "#fff"
              }}>
              {activeTab === "questions" ? pendingQuestions.length : messages.length}
            </div>
            <div>
              <p className="font-black text-white">
                {activeTab === "questions" 
                  ? (pendingQuestions.length === 0 
                      ? "Sin preguntas pendientes" 
                      : `Pregunta${pendingQuestions.length > 1 ? "s" : ""} sin responder`)
                  : (messages.length === 0 
                      ? "Sin mensajes de compradores" 
                      : `${messages.length} mensaje${messages.length > 1 ? "s" : ""} de compradores`)
                }
              </p>
              <p className="text-xs" style={{ color: "#6B7280" }}>
                {activeTab === "questions"
                  ? (pendingQuestions.length > 0 ? "Respondelas rápido para mejorar tu reputación" : "¡Al día con todas tus cuentas!")
                  : (unreadCount > 0 ? `${unreadCount} mensaje${unreadCount > 1 ? "s" : ""} sin leer` : "Todos los mensajes leídos")
                }
              </p>
            </div>
          </div>
        )}

        {/* Search */}
        {!isLoading && currentData.length > 0 && (
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input type="text" 
              placeholder={activeTab === "questions" 
                ? "Buscar por producto, pregunta o cuenta..."
                : "Buscar por comprador, producto o mensaje..."
              }
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-500 outline-none"
              style={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.08)" }}
            />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-2xl p-4 mb-4 text-center" style={{ background: "#ef444418", border: "1px solid #ef444440" }}>
            <AlertCircle className="w-7 h-7 mx-auto mb-1" style={{ color: "#ef4444" }} />
            <p className="text-sm text-white font-semibold">{error}</p>
            <button onClick={() => loadAll()} className="mt-2 px-4 py-1.5 rounded-lg text-xs font-bold bg-red-500 text-white">
              Reintentar
            </button>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-2xl p-4 animate-pulse" style={{ background: "#1F1F1F" }}>
                <div className="h-3 rounded w-24 mb-2" style={{ background: "#2a2a2a" }} />
                <div className="h-4 rounded w-3/4 mb-1" style={{ background: "#2a2a2a" }} />
                <div className="h-4 rounded w-1/2" style={{ background: "#2a2a2a" }} />
              </div>
            ))}
          </div>
        )}

        {/* Content */}
        {!isLoading && (
          <div className="space-y-3">
            {currentData.length === 0 && !error && (
              <div className="rounded-2xl p-10 text-center" style={{ background: "#1F1F1F" }}>
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2" style={{ color: "#39FF14" }} />
                <p className="text-white font-bold">
                  {search ? "Sin resultados" : (activeTab === "questions" ? "Todo respondido" : "Sin mensajes")}
                </p>
              </div>
            )}
            
            {activeTab === "questions" && filteredQuestions.map(q => (
              <QuestionCard key={q.meli_question_id} q={q} onAnswered={handleAnswered} />
            ))}
            
            {activeTab === "messages" && filteredMessages.map(m => (
              <MessageCard key={m.id} m={m} onMarkAsRead={handleMarkAsRead} />
            ))}
            
            {activeTab === "claims" && claims.map(c => (
              <ClaimCard key={c.claim_id} claim={c} onResponded={() => loadClaims(true)} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default function MensajesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#121212" }}>
        <RefreshCw className="w-6 h-6 animate-spin" style={{ color: "#FF5722" }} />
      </div>
    }>
      <MensajesInner />
    </Suspense>
  );
}
