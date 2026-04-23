"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft, RefreshCw, MessageCircle, Send, Clock,
  CheckCircle2, AlertCircle, ChevronDown, ChevronUp,
  Search, Package, Settings, Plus, Trash2, Edit2, Check, X,
  Users, ShoppingBag, AlertTriangle, Timer
} from "lucide-react";
import QuestionSuggestion from "@/components/QuestionSuggestion";
import { supabase } from "@/lib/supabase";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";

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
    } catch {}
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

interface AccountResponseTime {
  accountId: string;
  nickname: string;
  sellerId: string;
  total_minutes: number;
  weekdays_working_hours_minutes: number | null;
  weekdays_extra_hours_minutes: number | null;
  weekend_minutes: number | null;
  error?: string;
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "ahora";
  if (minutes < 60) return `hace ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours}h`;
  return `hace ${Math.floor(hours / 24)}d`;
}

function formatMinutes(minutes: number): string {
  if (minutes === 0) return "Sin datos";
  if (minutes < 60) return `${Math.round(minutes)}min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

function getResponseTimeColor(minutes: number): string {
  if (minutes === 0) return "#6B7280";
  if (minutes <= 30) return "#39FF14";
  if (minutes <= 120) return "#FFE600";
  if (minutes <= 360) return "#FF9800";
  return "#EF4444";
}

function ResponseTimePanel({ data }: { data: AccountResponseTime[] }) {
  if (data.length === 0) return null;

  return (
    <div className="rounded-2xl p-4 mb-4" style={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="flex items-center gap-2 mb-3">
        <Timer className="w-4 h-4" style={{ color: "#00E5FF" }} />
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#00E5FF" }}>
          Tiempos de Respuesta
        </p>
      </div>
      <div className="space-y-2">
        {data.map((account) => (
          <div key={account.accountId} className="flex items-center gap-3 p-2 rounded-xl" style={{ background: "#121212" }}>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
              style={{ background: "#FFE60018", color: "#FFE600" }}
            >
              @{account.nickname}
            </span>
            <div className="flex-1 flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1">
                <span className="text-[10px]" style={{ color: "#6B7280" }}>Total:</span>
                <span className="text-xs font-bold" style={{ color: getResponseTimeColor(account.total_minutes) }}>
                  {formatMinutes(account.total_minutes)}
                </span>
              </div>
              {account.weekdays_working_hours_minutes != null && account.weekdays_working_hours_minutes > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-[10px]" style={{ color: "#6B7280" }}>Lab:</span>
                  <span className="text-[10px] font-semibold" style={{ color: getResponseTimeColor(account.weekdays_working_hours_minutes) }}>
                    {formatMinutes(account.weekdays_working_hours_minutes)}
                  </span>
                </div>
              )}
              {account.weekend_minutes != null && account.weekend_minutes > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-[10px]" style={{ color: "#6B7280" }}>Finde:</span>
                  <span className="text-[10px] font-semibold" style={{ color: getResponseTimeColor(account.weekend_minutes) }}>
                    {formatMinutes(account.weekend_minutes)}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TemplatesManager({ onClose }: { onClose: () => void }) {
  const { templates, save } = useTemplates();
  const [list, setList] = useState<string[]>(templates);
  const [editing, setEditing] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [newText, setNewText] = useState("");

  const startEdit = (index: number) => {
    setEditing(index);
    setEditText(list[index]);
  };

  const confirmEdit = (index: number) => {
    if (!editText.trim()) return;
    const updated = [...list];
    updated[index] = editText.trim();
    setList(updated);
    setEditing(null);
  };

  const remove = (index: number) => setList(list.filter((_, currentIndex) => currentIndex !== index));

  const add = () => {
    if (!newText.trim()) return;
    setList([...list, newText.trim()]);
    setNewText("");
  };

  const handleSave = () => {
    save(list);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.1)" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <h2 className="font-black text-white text-base flex items-center gap-2">
            <Settings className="w-5 h-5" style={{ color: "#00E5FF" }} />
            Respuestas Rápidas
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }}>
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
          {list.map((template, index) => (
            <div key={index} className="rounded-xl overflow-hidden" style={{ background: "#121212", border: "1px solid rgba(255,255,255,0.06)" }}>
              {editing === index ? (
                <div className="flex gap-2 p-2">
                  <textarea
                    rows={2}
                    value={editText}
                    onChange={(event) => setEditText(event.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg text-sm text-white outline-none resize-none"
                    style={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.1)" }}
                  />
                  <div className="flex flex-col gap-1">
                    <button onClick={() => confirmEdit(index)} className="p-1.5 rounded-lg" style={{ background: "#39FF1422", color: "#39FF14" }}>
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditing(null)} className="p-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.05)", color: "#6B7280" }}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 p-3">
                  <p className="flex-1 text-sm text-gray-300">{template}</p>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => startEdit(index)} className="p-1.5 rounded-lg" style={{ background: "#00E5FF18", color: "#00E5FF" }}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => remove(index)} className="p-1.5 rounded-lg" style={{ background: "#ef444418", color: "#ef4444" }}>
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
              onChange={(event) => setNewText(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && add()}
              className="flex-1 px-3 py-2.5 rounded-xl text-sm text-white placeholder-gray-500 outline-none"
              style={{ background: "#121212", border: "1px solid rgba(255,255,255,0.1)" }}
            />
            <button onClick={add} disabled={!newText.trim()} className="px-3 py-2.5 rounded-xl font-bold text-sm disabled:opacity-40" style={{ background: "#00E5FF18", color: "#00E5FF", border: "1px solid #00E5FF33" }}>
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-4 pb-4 pt-2">
          <button onClick={handleSave} className="w-full py-3 rounded-xl font-black text-sm text-black" style={{ background: "#FFE600" }}>
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}

function QuestionCard({ q, onAnswered }: { q: Question; onAnswered: (id: number) => void }) {
  const { templates } = useTemplates();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const signature = "Atte.: MAQJEEZ";

  async function handleSend() {
    if (!text.trim()) return;

    let finalText = text.trim();
    if (!finalText.endsWith(signature)) {
      finalText = `${finalText}\n\n${signature}`;
    }

    if (finalText.length > 2000) {
      setError("El mensaje es demasiado largo para incluir la firma. Por favor, acorta el texto.");
      return;
    }

    setText(finalText);
    await new Promise((resolve) => setTimeout(resolve, 300));

    setSending(true);
    setError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const response = await fetch("/api/meli-answer", {
        method: "POST",
        headers,
        body: JSON.stringify({
          question_id: q.meli_question_id,
          answer_text: finalText,
          meli_account_id: q.meli_account_id,
          pregunta_original: q.question_text,
        }),
      });

      const data = await response.json().catch(() => null);
      if (data?.status === "ok") {
        setAnswered(true);
        setSuccessMessage(`✅ Respuesta enviada exitosamente a ${q.meli_accounts?.nickname || "comprador"}`);
        setTimeout(() => setSuccessMessage(null), 3000);
        onAnswered(q.meli_question_id);
      } else {
        setError(data?.error ?? data?.code ?? "Error al enviar");
      }
    } catch {
      setError("Error de red");
    } finally {
      setSending(false);
    }
  }

  const account = q.meli_accounts?.nickname ?? "—";

  return (
    <div className="rounded-2xl overflow-hidden transition-all duration-300" style={{ background: "#1F1F1F", border: answered ? "1px solid #39FF1444" : "1px solid rgba(255,255,255,0.07)", opacity: answered ? 0.6 : 1 }}>
      <button onClick={() => setOpen((value) => !value)} className="w-full text-left p-4">
        <div className="flex items-start gap-4">
          <a
            href={`https://articulo.mercadolibre.com.ar/${q.item_id.replace(/^([A-Z]+)(\\d+)$/, "$1-$2")}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Ver publicación original"
            onClick={(event) => event.stopPropagation()}
            className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer relative group shadow-md"
            style={{ background: "#2a2a2a", border: "2px solid rgba(255,230,0,0.1)" }}
          >
            {q.item_thumbnail ? (
              <Image src={q.item_thumbnail} alt={q.item_title} width={80} height={80} loading="lazy" className="w-full h-full object-cover transition-opacity group-hover:opacity-75" unoptimized />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="w-8 h-8 text-gray-600" />
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(0,0,0,0.6)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </div>
          </a>

          <div className="flex-1 min-w-0">
            <a
              href={`https://articulo.mercadolibre.com.ar/${q.item_id.replace(/^([A-Z]+)(\\d+)$/, "$1-$2")}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => event.stopPropagation()}
              className="text-xs font-bold text-blue-400 hover:text-blue-300 hover:underline mb-1.5 block transition-colors line-clamp-2"
              title={q.item_title}
            >
              {q.item_title || q.item_id}
            </a>

            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#FFE60018", color: "#FFE600" }}>
                @{account}
              </span>
              <span className="text-[10px]" style={{ color: "#6B7280" }}>
                de {q.buyer_nickname || "Usuario"}
              </span>
            </div>

            <p className="text-sm text-white font-medium leading-snug line-clamp-2">{q.question_text}</p>
          </div>

          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <span className="text-[10px]" style={{ color: "#6B7280" }}>{timeAgo(q.date_created)}</span>
            {answered ? (
              <CheckCircle2 className="w-5 h-5" style={{ color: "#39FF14" }} />
            ) : open ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </div>
        </div>
      </button>

      {open && !answered && (
        <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="pt-3 p-3 rounded-xl" style={{ background: "#121212" }}>
            <p className="text-xs font-semibold mb-1" style={{ color: "#6B7280" }}>Pregunta completa:</p>
            <p className="text-sm text-white">{q.question_text}</p>
          </div>

          <QuestionSuggestion preguntaTexto={q.question_text} onUseSuggestion={(value) => setText(value)} />

          {templates.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#6B7280" }}>
                Respuestas rápidas
              </p>
              <div className="flex flex-col gap-1.5">
                {templates.map((template, index) => (
                  <button key={index} onClick={() => setText(template)} className="text-left text-xs px-3 py-2 rounded-xl transition-opacity hover:opacity-80" style={{ background: "#00E5FF12", color: "#00E5FF", border: "1px solid #00E5FF22" }}>
                    {template}
                  </button>
                ))}
              </div>
            </div>
          )}

          <textarea
            rows={3}
            value={text}
            onChange={(event) => setText(event.target.value)}
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

          <button onClick={handleSend} disabled={sending || !text.trim()} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-black disabled:opacity-40" style={{ background: "#FFE600" }}>
            {sending ? <><RefreshCw className="w-4 h-4 animate-spin" /> Enviando...</> : <><Send className="w-4 h-4" /> Responder</>}
          </button>
        </div>
      )}
    </div>
  );
}

function MessageCard({ m, onMarkAsRead }: { m: Message; onMarkAsRead: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSendReply() {
    if (!replyText.trim()) return;

    setSending(true);
    setError(null);
    try {
      const response = await fetch("/api/meli-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: m.order_id,
          message_text: replyText,
          meli_account_id: m.meli_account_id,
        }),
      });
      const data = await response.json();
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

  useEffect(() => {
    if (open && m.status === "UNREAD") {
      onMarkAsRead(m.id);
    }
  }, [m.id, m.status, onMarkAsRead, open]);

  const account = m.meli_accounts?.nickname ?? "—";

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: m.status === "UNREAD" ? "#FF572218" : "#1F1F1F", border: `1px solid ${m.status === "UNREAD" ? "#FF572244" : "rgba(255,255,255,0.07)"}` }}>
      <button onClick={() => setOpen((value) => !value)} className="w-full text-left p-4">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0" style={{ background: "#2a2a2a" }}>
            {m.item_thumbnail ? (
              <Image src={m.item_thumbnail} alt={m.item_title} width={64} height={64} className="w-full h-full object-cover" unoptimized />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="w-6 h-6 text-gray-600" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#00E5FF18", color: "#00E5FF" }}>
                @{account}
              </span>
              {m.status === "UNREAD" && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#FF572218", color: "#FF5722" }}>
                  No leído
                </span>
              )}
            </div>
            <p className="text-xs font-bold text-blue-400 mb-1 line-clamp-1">{m.item_title || m.item_id}</p>
            <p className="text-sm text-white font-medium leading-snug line-clamp-2">{m.message_text}</p>
            <p className="text-xs mt-1" style={{ color: "#6B7280" }}>
              {m.buyer_nickname || "Comprador"} · {timeAgo(m.date_created)}
            </p>
          </div>

          <div className="flex-shrink-0">
            {open ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
          </div>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="pt-3 p-3 rounded-xl" style={{ background: "#121212" }}>
            <p className="text-xs font-semibold mb-1" style={{ color: "#6B7280" }}>Mensaje:</p>
            <p className="text-sm text-white">{m.message_text}</p>
          </div>
          <textarea
            rows={3}
            value={replyText}
            onChange={(event) => setReplyText(event.target.value)}
            placeholder="Escribí tu respuesta..."
            className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-gray-500 outline-none resize-none"
            style={{ background: "#121212", border: "1px solid rgba(255,255,255,0.1)" }}
          />
          {error && <p className="text-xs" style={{ color: "#ef4444" }}>Error: {error}</p>}
          <button onClick={handleSendReply} disabled={sending || !replyText.trim()} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-black disabled:opacity-40" style={{ background: "#00E5FF" }}>
            {sending ? <><RefreshCw className="w-4 h-4 animate-spin" /> Enviando...</> : <><Send className="w-4 h-4" /> Responder</>}
          </button>
        </div>
      )}
    </div>
  );
}

function ClaimCard({ claim, onResponded }: { claim: Claim; onResponded: () => void }) {
  const [open, setOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReply() {
    if (!replyText.trim()) return;

    setSending(true);
    setError(null);
    try {
      const response = await fetch("/api/meli-claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claim_id: claim.claim_id,
          message_text: replyText,
          meli_account_id: claim.meli_account_id,
          action: "message",
        }),
      });

      const data = await response.json();
      if (data.status === "ok") {
        setReplyText("");
        setOpen(false);
        onResponded();
      } else {
        setError(data.error ?? "Error al responder reclamo");
      }
    } catch {
      setError("Error de red");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "#1F1F1F", border: "1px solid rgba(239,68,68,0.25)" }}>
      <button onClick={() => setOpen((value) => !value)} className="w-full text-left p-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#ef444418" }}>
            <AlertTriangle className="w-6 h-6" style={{ color: "#ef4444" }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#ef444418", color: "#ef4444" }}>
                {claim.status}
              </span>
              <span className="text-[10px]" style={{ color: "#6B7280" }}>
                @{claim.account_nickname}
              </span>
            </div>
            <p className="text-sm text-white font-medium leading-snug">{claim.reason}</p>
            <p className="text-xs mt-1" style={{ color: "#6B7280" }}>
              {claim.buyer.nickname} · {timeAgo(claim.date_created)}
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
              {claim.messages.map((message) => (
                <div key={message.id} className="p-3 rounded-xl" style={{ background: "#121212" }}>
                  <p className="text-xs font-semibold mb-1" style={{ color: "#6B7280" }}>
                    {message.sender_role === "respondent" ? "Tu respuesta" : message.sender_role === "mediator" ? "Mediador MeLi" : "Comprador"}
                    <span className="font-normal ml-2">{timeAgo(message.date_created)}</span>
                  </p>
                  <p className="text-sm text-white">{message.text}</p>
                </div>
              ))}
            </div>
          )}

          <textarea
            rows={2}
            value={replyText}
            onChange={(event) => setReplyText(event.target.value)}
            placeholder="Escribi tu respuesta al reclamo..."
            className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-gray-500 outline-none resize-none"
            style={{ background: "#121212", border: "1px solid rgba(255,255,255,0.1)" }}
          />
          {error && <p className="text-xs" style={{ color: "#ef4444" }}>Error: {error}</p>}
          <button onClick={handleReply} disabled={sending || !replyText.trim()} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm text-black disabled:opacity-40" style={{ background: "#FFE600" }}>
            {sending ? <><RefreshCw className="w-4 h-4 animate-spin" /> Enviando...</> : <><Send className="w-4 h-4" /> Responder</>}
          </button>
        </div>
      )}
    </div>
  );
}

function MensajesInner() {
  const [activeTab, setActiveTab] = useState<TabType>("questions");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [questionsSyncing, setQuestionsSyncing] = useState(false);
  const [questionsError, setQuestionsError] = useState<string | null>(null);
  const [recentlyAnswered, setRecentlyAnswered] = useState<Set<number>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("recentlyAnsweredQuestions");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const now = Date.now();
          const valid = parsed.filter((item: any) => now - item.timestamp < 30 * 60 * 1000);
          return new Set(valid.map((item: any) => Number(item.id)));
        } catch {}
      }
    }
    return new Set<number>();
  });
  const recentlyAnsweredRef = useRef(recentlyAnswered);
  const { notifications } = useRealtimeNotifications();
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [messagesSyncing, setMessagesSyncing] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [claimsLoading, setClaimsLoading] = useState(true);
  const [claimsError, setClaimsError] = useState<string | null>(null);
  const [responseTimes, setResponseTimes] = useState<AccountResponseTime[]>([]);
  const [search, setSearch] = useState("");
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const loadRef = useRef<((sync?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    recentlyAnsweredRef.current = recentlyAnswered;
  }, [recentlyAnswered]);

  useEffect(() => {
    if (notifications.length === 0) return;

    const latestNotification = notifications[0];
    if (latestNotification.type !== "question") return;

    const newQuestion = latestNotification.data;
    if (!newQuestion?.id) return;

    const numericId = Number(newQuestion.id);
    const exists = questions.some((question) => question.meli_question_id === numericId);
    if (exists || recentlyAnsweredRef.current.has(numericId)) return;

    setQuestions((previous) => {
      if (previous.some((question) => question.meli_question_id === numericId)) {
        return previous;
      }

      const question: Question = {
        id: `temp-${newQuestion.id}`,
        meli_question_id: numericId,
        meli_account_id: latestNotification.account_id,
        item_id: newQuestion.item_id,
        item_title: newQuestion.item_title || newQuestion.item_id,
        item_thumbnail: newQuestion.item_thumbnail || "",
        buyer_id: newQuestion.from?.id,
        buyer_nickname: newQuestion.from?.nickname || "Comprador",
        question_text: newQuestion.text,
        status: newQuestion.status,
        date_created: newQuestion.date_created,
        answer_text: null,
        meli_accounts: { nickname: "Cuenta MeLi" },
      };

      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Nueva pregunta en MeLi", {
          body: `${question.buyer_nickname}: ${question.question_text.substring(0, 100)}...`,
          icon: "/icon.png",
        });
      }

      return [question, ...previous];
    });
  }, [notifications, questions]);

  const loadResponseTimes = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch("/api/meli-questions/response-time", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });

      if (!response.ok) return;
      const data: AccountResponseTime[] = await response.json();
      setResponseTimes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("[RESPONSE_TIME] Error:", error);
    }
  }, []);

  const loadQuestions = useCallback(async (sync = false, force = false) => {
    if (sync) setQuestionsSyncing(true);
    else setQuestionsLoading(true);
    setQuestionsError(null);

    const startTime = Date.now();

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setQuestionsError("No autenticado");
        return;
      }

      const forceParam = force ? "&force=true" : "";
      const syncParam = force ? "&sync=true" : "";
      const response = await fetch(`/api/meli-questions?_t=${Date.now()}${forceParam}${syncParam}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data: Question[] = await response.json();

      console.log(`[PREGUNTAS] Recibidas ${data.length} preguntas en ${Date.now() - startTime}ms`);

      const seen = new Set<number>();
      const unique = data.filter((question) => {
        const questionId = Number(question.meli_question_id);
        if (seen.has(questionId)) return false;
        seen.add(questionId);
        return true;
      });

      setQuestions(unique);
      setLastSync(new Date());
    } catch (error) {
      console.error("[PREGUNTAS] Error:", error);
      setQuestionsError((error as Error).message);
    } finally {
      setQuestionsLoading(false);
      setQuestionsSyncing(false);
    }
  }, []);

  const loadMessages = useCallback(async (sync = false) => {
    if (sync) setMessagesSyncing(true);
    else setMessagesLoading(true);
    setMessagesError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setMessagesError("No autenticado");
        return;
      }
      const response = await fetch("/api/meli-messages?limit=50", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data: Message[] = await response.json();
      setMessages(data);
      setUnreadCount(data.filter((message) => message.status === "UNREAD").length);
      setLastSync(new Date());
    } catch (error) {
      setMessagesError((error as Error).message);
    } finally {
      setMessagesLoading(false);
      setMessagesSyncing(false);
    }
  }, []);

  const loadClaims = useCallback(async () => {
    setClaimsLoading(true);
    setClaimsError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setClaimsError("No autenticado");
        return;
      }
      const response = await fetch("/api/meli-claims", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data: Claim[] = await response.json();
      setClaims(data);
    } catch (error) {
      setClaimsError((error as Error).message);
    } finally {
      setClaimsLoading(false);
    }
  }, []);

  const loadAll = useCallback(async (sync = false) => {
    await Promise.all([loadQuestions(sync), loadMessages(sync), loadClaims(), loadResponseTimes()]);
  }, [loadClaims, loadMessages, loadQuestions, loadResponseTimes]);

  useEffect(() => {
    loadRef.current = loadAll;
  }, [loadAll]);

  useEffect(() => {
    loadAll();

    const interval = setInterval(() => {
      console.log("[MENSAJES] Polling automático (60s)...");
      loadAll(true);
    }, 60000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log("[MENSAJES] Ventana visible, recargando...");
        loadAll(true);
      }
    };

    const handleOnline = () => {
      console.log("[MENSAJES] Conexión restaurada, recargando...");
      loadAll(true);
    };

    const handleFocus = () => {
      console.log("[MENSAJES] Página enfocada, verificando preguntas...");
      loadQuestions(true);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", handleOnline);
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("focus", handleFocus);
    };
  }, [loadAll, loadQuestions]);

  const handleAnswered = useCallback((id: number) => {
    setQuestions((previousQuestions) => previousQuestions.filter((question) => question.meli_question_id !== id));
    setSuccessToast("Pregunta respondida exitosamente");
    setTimeout(() => setSuccessToast(null), 4000);

    const newId = Number(id);
    setRecentlyAnswered((previous) => {
      const updated = new Set(previous).add(newId);
      recentlyAnsweredRef.current = updated;
      const toSave = Array.from(updated).map((questionId) => ({ id: questionId, timestamp: Date.now() }));
      localStorage.setItem("recentlyAnsweredQuestions", JSON.stringify(toSave));
      return updated;
    });

    setTimeout(() => {
      setRecentlyAnswered((previous) => {
        const updated = new Set(previous);
        updated.delete(newId);
        recentlyAnsweredRef.current = updated;
        const toSave = Array.from(updated).map((questionId) => ({ id: questionId, timestamp: Date.now() }));
        localStorage.setItem("recentlyAnsweredQuestions", JSON.stringify(toSave));
        return updated;
      });
    }, 30 * 60 * 1000);
  }, []);

  const handleMarkAsRead = useCallback(async (id: string) => {
    try {
      await fetch("/api/meli-messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message_ids: [id] }),
      });
      setMessages((previousMessages) =>
        previousMessages.map((message) =>
          message.id === id ? { ...message, status: "READ", date_read: new Date().toISOString() } : message
        )
      );
      setUnreadCount((previousUnreadCount) => Math.max(0, previousUnreadCount - 1));
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  }, []);

  const filteredQuestions = questions.filter(
    (question) =>
      !recentlyAnswered.has(Number(question.meli_question_id)) &&
      (question.question_text.toLowerCase().includes(search.toLowerCase()) ||
        (question.item_title ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (question.meli_accounts?.nickname ?? "").toLowerCase().includes(search.toLowerCase()))
  );

  const pendingQuestions = questions.filter((question) => !recentlyAnswered.has(Number(question.meli_question_id)));

  const filteredMessages = messages.filter(
    (message) =>
      message.message_text.toLowerCase().includes(search.toLowerCase()) ||
      (message.item_title ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (message.buyer_nickname ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (message.meli_accounts?.nickname ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const isLoading = activeTab === "questions" ? questionsLoading : activeTab === "messages" ? messagesLoading : claimsLoading;
  const isSyncing = activeTab === "questions" ? questionsSyncing : activeTab === "messages" ? messagesSyncing : false;
  const error = activeTab === "questions" ? questionsError : activeTab === "messages" ? messagesError : claimsError;
  const currentData = activeTab === "questions" ? filteredQuestions : activeTab === "messages" ? filteredMessages : claims;

  return (
    <main className="min-h-screen pb-24" style={{ background: "#121212" }}>
      {successToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl font-bold text-sm text-black flex items-center gap-2 shadow-2xl animate-pulse" style={{ background: "#39FF14" }}>
          <CheckCircle2 className="w-5 h-5" />
          {successToast}
        </div>
      )}
      {showTemplates && <TemplatesManager onClose={() => setShowTemplates(false)} />}

      <div className="sticky top-0 z-30 px-4 py-3 flex items-center justify-between border-b" style={{ background: "rgba(18,18,18,0.97)", backdropFilter: "blur(16px)", borderColor: "rgba(255,255,255,0.07)" }}>
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
              {" · "}
              <Clock className="w-3 h-3 inline" /> auto cada 60s
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowTemplates(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold" style={{ background: "#1F1F1F", color: "#00E5FF", border: "1px solid #00E5FF33" }}>
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Plantillas</span>
          </button>
          <button onClick={() => loadAll(true)} disabled={isSyncing || isLoading} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold disabled:opacity-40" style={{ background: "#1F1F1F", color: "#FF5722", border: "1px solid #FF572244" }}>
            <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Sync..." : "Actualizar"}
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4">
        <div className="flex gap-2 mb-4">
          <button onClick={() => setActiveTab("questions")} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all" style={{ background: activeTab === "questions" ? "#FF5722" : "#1F1F1F", color: activeTab === "questions" ? "#fff" : "#9CA3AF", border: activeTab === "questions" ? "none" : "1px solid rgba(255,255,255,0.1)" }}>
            <Users className="w-4 h-4" />
            Preguntas
            {pendingQuestions.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs" style={{ background: "rgba(0,0,0,0.3)" }}>
                {pendingQuestions.length}
              </span>
            )}
          </button>
          <button onClick={() => setActiveTab("messages")} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all" style={{ background: activeTab === "messages" ? "#00E5FF" : "#1F1F1F", color: activeTab === "messages" ? "#000" : "#9CA3AF", border: activeTab === "messages" ? "none" : "1px solid rgba(255,255,255,0.1)" }}>
            <ShoppingBag className="w-4 h-4" />
            Compradores
            {unreadCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs" style={{ background: "rgba(0,0,0,0.3)" }}>
                {unreadCount}
              </span>
            )}
          </button>
          <button onClick={() => setActiveTab("claims")} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all" style={{ background: activeTab === "claims" ? "#EF4444" : "#1F1F1F", color: activeTab === "claims" ? "#fff" : "#9CA3AF", border: activeTab === "claims" ? "none" : "1px solid rgba(255,255,255,0.1)" }}>
            <AlertTriangle className="w-4 h-4" />
            Reclamos
            {claims.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs" style={{ background: "rgba(0,0,0,0.3)" }}>
                {claims.length}
              </span>
            )}
          </button>
        </div>

        {!isLoading && (
          <div className="rounded-2xl p-4 mb-4 flex items-center gap-4" style={{ background: currentData.length > 0 ? (activeTab === "questions" ? "#FF572218" : "#00E5FF18") : "#1F1F1F", border: `1px solid ${currentData.length > 0 ? (activeTab === "questions" ? "#FF572244" : "#00E5FF44") : "rgba(255,255,255,0.07)"}` }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl" style={{ background: currentData.length > 0 ? (activeTab === "questions" ? "#FF5722" : "#00E5FF") : "#2a2a2a", color: currentData.length > 0 && activeTab === "messages" ? "#000" : "#fff" }}>
              {activeTab === "questions" ? pendingQuestions.length : messages.length}
            </div>
            <div>
              <p className="font-black text-white">
                {activeTab === "questions"
                  ? pendingQuestions.length === 0
                    ? "Sin preguntas pendientes"
                    : `Pregunta${pendingQuestions.length > 1 ? "s" : ""} sin responder`
                  : messages.length === 0
                    ? "Sin mensajes de compradores"
                    : `${messages.length} mensaje${messages.length > 1 ? "s" : ""} de compradores`}
              </p>
              <p className="text-xs" style={{ color: "#6B7280" }}>
                {activeTab === "questions"
                  ? pendingQuestions.length > 0
                    ? "Respondelas rápido para mejorar tu reputación"
                    : "¡Al día con todas tus cuentas!"
                  : unreadCount > 0
                    ? `${unreadCount} mensaje${unreadCount > 1 ? "s" : ""} sin leer`
                    : "Todos los mensajes leídos"}
              </p>
            </div>
          </div>
        )}

        {!isLoading && activeTab === "questions" && responseTimes.length > 0 && <ResponseTimePanel data={responseTimes} />}

        {!isLoading && currentData.length > 0 && (
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder={activeTab === "questions" ? "Buscar por producto, pregunta o cuenta..." : "Buscar por comprador, producto o mensaje..."}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-500 outline-none"
              style={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.08)" }}
            />
          </div>
        )}

        {error && (
          <div className="rounded-2xl p-4 mb-4 text-center" style={{ background: "#ef444418", border: "1px solid #ef444440" }}>
            <AlertCircle className="w-7 h-7 mx-auto mb-1" style={{ color: "#ef4444" }} />
            <p className="text-sm text-white font-semibold">{error}</p>
            <button onClick={() => loadAll()} className="mt-2 px-4 py-1.5 rounded-lg text-xs font-bold bg-red-500 text-white">
              Reintentar
            </button>
          </div>
        )}

        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((index) => (
              <div key={index} className="rounded-2xl p-4 animate-pulse" style={{ background: "#1F1F1F" }}>
                <div className="h-3 rounded w-24 mb-2" style={{ background: "#2a2a2a" }} />
                <div className="h-4 rounded w-3/4 mb-1" style={{ background: "#2a2a2a" }} />
                <div className="h-4 rounded w-1/2" style={{ background: "#2a2a2a" }} />
              </div>
            ))}
          </div>
        )}

        {!isLoading && (
          <div className="space-y-3">
            {currentData.length === 0 && !error && (
              <div className="rounded-2xl p-10 text-center" style={{ background: "#1F1F1F" }}>
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2" style={{ color: "#39FF14" }} />
                <p className="text-white font-bold">{search ? "Sin resultados" : activeTab === "questions" ? "Todo respondido" : "Sin mensajes"}</p>
              </div>
            )}

            {activeTab === "questions" && filteredQuestions.map((question) => (
              <QuestionCard key={question.meli_question_id} q={question} onAnswered={handleAnswered} />
            ))}

            {activeTab === "messages" && filteredMessages.map((message) => (
              <MessageCard key={message.id} m={message} onMarkAsRead={handleMarkAsRead} />
            ))}

            {activeTab === "claims" && claims.map((claim) => (
              <ClaimCard key={claim.claim_id} claim={claim} onResponded={() => loadClaims()} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default function MensajesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{ background: "#121212" }}><RefreshCw className="w-6 h-6 animate-spin" style={{ color: "#FF5722" }} /></div>}>
      <MensajesInner />
    </Suspense>
  );
}