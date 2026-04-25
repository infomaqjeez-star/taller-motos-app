"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  RefreshCw,
  MessageCircle,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Users,
  TrendingUp,
} from "lucide-react";
import { useMeliAccounts } from "@/components/auth/MeliAccountsProvider";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { MeliResponseTime } from "@/types/meli";

const QUESTION_STATUSES = {
  UNANSWERED: "UNANSWERED",
  ANSWERED: "ANSWERED",
  CLOSED_UNANSWERED: "CLOSED_UNANSWERED",
  UNDER_REVIEW: "UNDER_REVIEW",
};

interface UnifiedQuestion {
  id: number;
  text: string;
  status: string;
  date_created: string;
  answer?: {
    text: string;
    status: string;
    date_created: string;
  } | null;
  item_id: string;
  item_title?: string;
  item_thumbnail?: string;
  from: {
    id: number;
    nickname?: string;
  };
  account: {
    id: string;
    nickname: string;
    sellerId: string;
  };
  responseTime?: number;
}

interface AccountStats {
  accountId: string;
  nickname: string;
  total: number;
  unanswered: number;
  responseTime: MeliResponseTime | null;
}



function normalizeQuestion(rawQuestion: any, account: { accountId: string; nickname: string; sellerId: string }): UnifiedQuestion | null {
  const id = Number(rawQuestion.id ?? rawQuestion.meli_question_id);

  if (!Number.isFinite(id)) {
    return null;
  }

  const answerText = rawQuestion.answer?.text ?? rawQuestion.answer_text;
  const answerDate = rawQuestion.answer?.date_created ?? rawQuestion.answer_date;
  const answerStatus = rawQuestion.answer?.status ?? (answerText ? "ACTIVE" : undefined);

  return {
    id,
    text: rawQuestion.text ?? rawQuestion.question_text ?? "",
    status: rawQuestion.status ?? QUESTION_STATUSES.UNANSWERED,
    date_created: rawQuestion.date_created ?? rawQuestion.created_at ?? new Date().toISOString(),
    answer: answerText
      ? {
          text: answerText,
          status: answerStatus ?? "ACTIVE",
          date_created: answerDate ?? new Date().toISOString(),
        }
      : null,
    item_id: String(rawQuestion.item_id ?? ""),
    item_title: rawQuestion.item_title ?? rawQuestion.item_info?.title ?? String(rawQuestion.item_id ?? ""),
    item_thumbnail: rawQuestion.item_thumbnail ?? rawQuestion.item_info?.thumbnail ?? "",
    from: {
      id: Number(rawQuestion.from?.id ?? rawQuestion.buyer_id ?? 0),
      nickname: rawQuestion.from?.nickname ?? rawQuestion.buyer_nickname,
    },
    account: {
      id: account.accountId,
      nickname: account.nickname,
      sellerId: account.sellerId,
    },
    responseTime: rawQuestion.responseTime,
  };
}

export default function PreguntasPage() {
  const { accounts, loading: accountsLoading } = useMeliAccounts();
  const { user } = useAuth();
  const [questions, setQuestions] = useState<UnifiedQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(QUESTION_STATUSES.UNANSWERED);
  const [accountFilter, setAccountFilter] = useState<string>("all");
  const [accountStats, setAccountStats] = useState<AccountStats[]>([]);
  const [answering, setAnswering] = useState<number | null>(null);
  // IDs de preguntas recién respondidas: quedan visibles con badge verde hasta que MeLi propague
  // Map<questionId, timestamp> — el timestamp permite expiración automática (2 min max)
  const [justAnsweredIds, setJustAnsweredIds] = useState<Map<number, number>>(new Map());
  // Ref para acceder a justAnsweredIds dentro de callbacks sin stale closure
  const justAnsweredIdsRef = useRef<Map<number, number>>(new Map());
  useEffect(() => { justAnsweredIdsRef.current = justAnsweredIds; }, [justAnsweredIds]);

  const buildResponseTime = useCallback((data: any): MeliResponseTime | null => {
    if (!data) return null;
    // Formato directo de MeLi (viene de /api/meli-questions-unified)
    if (data.total?.response_time !== undefined) return data as MeliResponseTime;
    // Formato antiguo (total_minutes)
    if (data.total_minutes !== undefined) {
      return {
        user_id: Number(data.sellerId) || 0,
        total: { response_time: data.total_minutes },
        weekdays_working_hours: data.weekdays_working_hours_minutes !== null ? { response_time: data.weekdays_working_hours_minutes, sales_percent_increase: null } : undefined,
        weekdays_extra_hours: data.weekdays_extra_hours_minutes !== null ? { response_time: data.weekdays_extra_hours_minutes, sales_percent_increase: null } : undefined,
        weekend: data.weekend_minutes !== null ? { response_time: data.weekend_minutes, sales_percent_increase: null } : undefined,
      };
    }
    return null;
  }, []);

  const loadAllQuestions = useCallback(async (fetchStatus: string = QUESTION_STATUSES.UNANSWERED) => {
    // Evitar race condition: si ya hay un poll en curso, ignorar
    if (isPollingRef.current) return;
    isPollingRef.current = true;

    if (!accounts.length) {
      setQuestions([]);
      setAccountStats([]);
      setError(null);
      setLoading(false);
      isPollingRef.current = false;
      return;
    }

    // Solo mostrar spinner en el estado principal cuando cargamos UNANSWERED
    if (fetchStatus !== QUESTION_STATUSES.ANSWERED) setLoading(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("No hay sesión activa");
      }

      const headers = {
        Authorization: `Bearer ${session.access_token}`,
      };

      // Una sola request al endpoint unificado (hace todo en paralelo server-side)
      console.log(`[Preguntas] Llamando a API con status: ${fetchStatus}`);
      const res = await fetch(`/api/meli-questions-unified?status=${fetchStatus}&_t=${Date.now()}`, { headers });
      console.log(`[Preguntas] Response status: ${res.status}`);
      
      const payload = await res.json().catch(() => null);
      console.log(`[Preguntas] Payload recibido:`, payload ? `totalQuestions=${payload.totalQuestions}, accounts=${payload.accounts?.length}` : 'null');

      if (!res.ok) {
        throw new Error(payload?.error || `Error ${res.status}`);
      }

      // payload = { questions: AccountResult[], accounts: AccountSummary[], totalQuestions }
      const accountResults: any[] = payload?.questions ?? [];

      const unified: UnifiedQuestion[] = [];
      for (const ar of accountResults) {
        for (const question of ar.questions ?? []) {
          const normalized = normalizeQuestion(question, {
            accountId: ar.accountId,
            nickname: ar.nickname,
            sellerId: ar.sellerId,
          });
          if (normalized) unified.push(normalized);
        }
      }

      const stats: AccountStats[] = accountResults.map((ar) => ({
        accountId: ar.accountId,
        nickname: ar.nickname,
        total: (ar.questions ?? []).length,
        unanswered: (ar.questions ?? []).filter((q: any) => q.status === QUESTION_STATUSES.UNANSWERED).length,
        responseTime: buildResponseTime(ar.responseTime),
      }));

      unified.sort(
        (firstQuestion, secondQuestion) =>
          new Date(secondQuestion.date_created).getTime() - new Date(firstQuestion.date_created).getTime()
      );

      if (fetchStatus === QUESTION_STATUSES.ANSWERED) {
        // Merge: conservar preguntas UNANSWERED existentes + agregar las ANSWERED recién cargadas
        setQuestions(prev => {
          const unanswered = prev.filter(q => q.status !== QUESTION_STATUSES.ANSWERED);
          return [...unanswered, ...unified];
        });
      } else {
        // UNANSWERED (default): reemplazar estado con datos frescos de MeLi
        // PERO preservar preguntas recién respondidas: excluir de unified si están en justAnsweredIds
        const justAnswered = justAnsweredIdsRef.current;

        // IDs que MeLi devuelve como UNANSWERED (datos crudos, ANTES de filtrar)
        // Necesario para el cleanup de justAnsweredIds más abajo
        const freshUnansweredIds = new Set(unified.map(q => q.id));

        setQuestions(prev => {
          // Filtrar unified para no incluir preguntas que tenemos localmente como ANSWERED
          const filteredUnified = justAnswered.size === 0
            ? unified
            : unified.filter(q => !justAnswered.has(q.id));

          if (justAnswered.size === 0) return filteredUnified;

          // Mantener las preguntas respondidas localmente que aún no propagaron a MeLi
          const answeredLocally = prev.filter(q =>
            justAnswered.has(q.id) && q.status === QUESTION_STATUSES.ANSWERED
          );

          return [...filteredUnified, ...answeredLocally];
        });
        setAccountStats(stats);
        setLastUpdate(new Date());
        lastPollTimeRef.current = Date.now();
        // Cleanup inteligente: eliminar de justAnsweredIds si MeLi YA NO lo devuelve
        // como UNANSWERED (propagación confirmada) O si pasaron 2+ minutos (safety timeout)
        setJustAnsweredIds(prev => {
          if (prev.size === 0) return prev;
          const now = Date.now();
          const next = new Map<number, number>();
          for (const [id, ts] of prev) {
            // Eliminar si MeLi YA NO lo devuelve (propagación confirmada)
            // O si pasaron 2+ minutos (safety timeout)
            const propagationConfirmed = !freshUnansweredIds.has(id);
            const timeoutExpired = now - ts >= 120_000;
            
            // Mantener solo si NO se confirmó propagación Y NO expiró el timeout
            if (!propagationConfirmed && !timeoutExpired) {
              next.set(id, ts);
            }
          }
          return next;
        });
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error cargando preguntas");
    } finally {
      setLoading(false);
      isPollingRef.current = false;
    }
  }, [accounts, buildResponseTime]);

  // Ref para que el interval siempre llame la versión más reciente sin resetear el timer
  const loadAllQuestionsRef = useRef(loadAllQuestions);
  useEffect(() => { loadAllQuestionsRef.current = loadAllQuestions; }, [loadAllQuestions]);

  // Timestamp del último poll exitoso (ref para acceso en listeners sin stale closure)
  const lastPollTimeRef = useRef<number>(0);

  // Carga inicial
  useEffect(() => {
    if (!accountsLoading && accounts.length > 0) {
      loadAllQuestionsRef.current();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountsLoading, accounts.length]);

  useEffect(() => {
    if (!accountsLoading && accounts.length === 0) {
      setQuestions([]);
      setAccountStats([]);
      setError(null);
      setLoading(false);
    }
  }, [accounts.length, accountsLoading]);

  // Polling cada 10s — respeta el tab activo (UNANSWERED o ANSWERED)
  // y evita race conditions con flag isPolling
  const isPollingRef = useRef(false);
  useEffect(() => {
    if (!accounts.length) return;
    const id = setInterval(() => {
      if (isPollingRef.current) return; // skip si hay un poll en curso
      loadAllQuestionsRef.current(statusFilter);
    }, 10000);
    return () => clearInterval(id);
  }, [accounts.length, statusFilter]); // resetear cuando cambia el tab

  // Page Visibility API: re-poll inmediato cuando el usuario vuelve a la pestaña.
  // Corrige el throttling de Chrome/Safari que retrasa setInterval a ≥60s en background.
  useEffect(() => {
    const handleVisible = () => {
      if (document.visibilityState === "visible") {
        const elapsed = Date.now() - lastPollTimeRef.current;
        if (elapsed > 20000) { // solo si el último poll fue hace más de 20s
          loadAllQuestionsRef.current(statusFilter);
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisible);
    return () => document.removeEventListener("visibilitychange", handleVisible);
  }, [statusFilter]); // re-crear cuando cambia el tab activo

  // Cuando el usuario cambia al tab "Respondidas", cargar preguntas respondidas de MeLi
  const prevStatusFilterRef = useRef<string>(QUESTION_STATUSES.UNANSWERED);
  useEffect(() => {
    const prev = prevStatusFilterRef.current;
    prevStatusFilterRef.current = statusFilter;
    if (
      statusFilter === QUESTION_STATUSES.ANSWERED &&
      prev !== QUESTION_STATUSES.ANSWERED &&
      accounts.length > 0
    ) {
      loadAllQuestionsRef.current(QUESTION_STATUSES.ANSWERED);
    }
  }, [statusFilter, accounts.length]);

  // ── SSE: notificaciones instantáneas via webhooks de MeLi ──────────────────
  // Cuando llega un webhook de pregunta, el servidor guarda en meli_notifications
  // y el SSE endpoint lo reenvía aquí → actualizamos inmediatamente sin esperar el poll.
  useEffect(() => {
    if (!user?.id) return;

    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectDelay = 2000;
    let mounted = true;

    async function connect() {
      if (!mounted) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token || !mounted) return;

        es = new EventSource(`/api/sse/notifications?token=${encodeURIComponent(session.access_token)}`);

        es.addEventListener("notification", (evt) => {
          try {
            const data = JSON.parse(evt.data);
            if (data.type === "question") {
              console.log("[SSE] Nueva pregunta via webhook → actualizando");
              loadAllQuestionsRef.current();
            }
          } catch { /* skip */ }
        });

        // Conexión exitosa → resetear delay
        es.addEventListener("connected", () => { reconnectDelay = 2000; });
        es.addEventListener("heartbeat", () => { reconnectDelay = 2000; });

        es.onerror = () => {
          es?.close();
          es = null;
          if (mounted) {
            reconnectTimer = setTimeout(() => {
              reconnectDelay = Math.min(reconnectDelay * 2, 60000); // máx 60s
              connect();
            }, reconnectDelay);
          }
        };
      } catch { /* no SSE disponible, polling como fallback */ }
    }

    connect();

    return () => {
      mounted = false;
      es?.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [user?.id]); // re-conectar solo si cambia el usuario

  const filteredQuestions = useMemo(() => {
    return questions.filter((question) => {
      if (statusFilter !== "all" && question.status !== statusFilter) {
        // Bypass: preguntas recién respondidas permanecen visibles en "Sin responder"
        // con badge verde hasta el siguiente poll, para que el usuario vea la confirmación
        if (justAnsweredIds.has(question.id) && statusFilter === QUESTION_STATUSES.UNANSWERED) {
          return true;
        }
        return false;
      }

      if (accountFilter !== "all" && question.account.id !== accountFilter) {
        return false;
      }

      if (!searchTerm) {
        return true;
      }

      const term = searchTerm.toLowerCase();

      return (
        question.text.toLowerCase().includes(term) ||
        question.item_id.toLowerCase().includes(term) ||
        (question.item_title ?? "").toLowerCase().includes(term) ||
        question.account.nickname.toLowerCase().includes(term) ||
        (question.from.nickname?.toLowerCase().includes(term) ?? false)
      );
    });
  }, [accountFilter, justAnsweredIds, questions, searchTerm, statusFilter]);

  const handleAnswer = async (questionId: number, accountId: string, text: string) => {
    const trimmedText = text.trim();

    if (!trimmedText) {
      return false;
    }

    setAnswering(questionId);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("No hay sesión activa");
      }

      const response = await fetch("/api/meli-answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          question_id: questionId,
          answer_text: trimmedText,
          meli_account_id: accountId,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || data?.status === "error") {
        throw new Error(data?.error || `Error ${response.status}`);
      }

      // Marcar como respondida: queda visible con badge "✓ Respondida" hasta el siguiente poll
      setJustAnsweredIds(prev => new Map(prev).set(questionId, Date.now()));
      setQuestions((previousQuestions) =>
        previousQuestions.map((question) =>
          question.id === questionId
            ? {
                ...question,
                status: QUESTION_STATUSES.ANSWERED,
                answer: {
                  text: trimmedText,
                  status: "ACTIVE",
                  date_created: new Date().toISOString(),
                },
              }
            : question
        )
      );

      setAccountStats((previousStats) =>
        previousStats.map((stat) =>
          stat.accountId === accountId
            ? { ...stat, unanswered: Math.max(0, stat.unanswered - 1) }
            : stat
        )
      );

      toast.success("Respuesta enviada correctamente");
      return true;
    } catch (answerError) {
      const errMsg = answerError instanceof Error ? answerError.message : "Error enviando respuesta";
      toast.error(errMsg);
      // Si MeLi dice que la pregunta ya no está sin responder → actualizar estado local
      // para que se mueva al tab "Respondidas" y no quede bloqueada
      if (/unanswered|answered/i.test(errMsg)) {
        // Agregar a justAnsweredIds para mostrar badge verde
        setJustAnsweredIds(prev => new Map(prev).set(questionId, Date.now()));
        setQuestions((prev) =>
          prev.map((q) =>
            q.id === questionId ? { ...q, status: QUESTION_STATUSES.ANSWERED } : q
          )
        );
      }
      return false;
    } finally {
      setAnswering(null);
    }
  };

  const totalUnanswered = questions.filter((question) => question.status === QUESTION_STATUSES.UNANSWERED).length;

  const avgResponseTime = useMemo(() => {
    const times = accountStats
      .map((stat) => stat.responseTime?.total?.response_time)
      .filter((value): value is number => typeof value === "number");

    if (!times.length) {
      return 0;
    }

    return Math.round(times.reduce((sum, value) => sum + value, 0) / times.length);
  }, [accountStats]);

  return (
    <main className="min-h-screen pb-24" style={{ background: "#121212" }}>
      <div
        className="sticky top-0 z-30 px-4 py-3 flex items-center justify-between border-b relative"
        style={{
          background: "rgba(18,18,18,0.97)",
          backdropFilter: "blur(16px)",
          borderColor: "rgba(255,255,255,0.07)",
        }}
      >
        <div className="flex items-center gap-3">
          <Link href="/" className="p-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }}>
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </Link>
          <div>
            <h1 className="font-black text-white text-base flex items-center gap-2">
              <MessageCircle className="w-5 h-5" style={{ color: "#FF5722" }} />
              Preguntas Unificadas
            </h1>
            <p className="text-[10px]" style={{ color: "#6B7280" }}>
              {accounts.length} cuentas · {lastUpdate ? `Actualizado ${lastUpdate.toLocaleTimeString()}` : "Cargando..."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadAllQuestions()}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold disabled:opacity-40"
            style={{ background: "#1F1F1F", color: "#FF5722", border: "1px solid #FF572244" }}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Sync..." : "Actualizar"}
          </button>
        </div>
      </div>  {/* fin sticky header */}

      {!accountsLoading && accounts.length === 0 && (
        <div className="max-w-6xl mx-auto px-4 pt-4">
          <div className="rounded-2xl p-6 text-center" style={{ background: "#ef444418", border: "1px solid #ef444440" }}>
            <AlertCircle className="w-10 h-10 mx-auto mb-2" style={{ color: "#ef4444" }} />
            <p className="text-white font-bold mb-1">No hay cuentas de Mercado Libre conectadas</p>
            <p className="text-sm" style={{ color: "#6B7280" }}>
              Conectá al menos una cuenta desde el Dashboard para ver las preguntas.
            </p>
            <Link
              href="/"
              className="inline-block mt-3 px-4 py-2 rounded-xl text-sm font-bold text-black"
              style={{ background: "#FFE600" }}
            >
              Ir al Dashboard
            </Link>
          </div>
        </div>
      )}

      {accountsLoading && (
        <div className="max-w-6xl mx-auto px-4 pt-4">
          <div className="rounded-2xl p-6 text-center" style={{ background: "#1F1F1F" }}>
            <div className="w-10 h-10 mx-auto mb-2 rounded-full border-2 border-yellow-400 border-t-transparent animate-spin" />
            <p className="text-white font-bold mb-1">Cargando cuentas...</p>
            <p className="text-sm" style={{ color: "#6B7280" }}>Estamos conectando con Mercado Libre</p>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 pt-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="rounded-2xl p-4" style={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center gap-2 mb-1">
              <MessageCircle className="w-4 h-4" style={{ color: "#00E5FF" }} />
              <span className="text-xs" style={{ color: "#6B7280" }}>Total Preguntas</span>
            </div>
            <p className="text-2xl font-black text-white">{questions.length}</p>
          </div>

          <div
            className="rounded-2xl p-4"
            style={{
              background: totalUnanswered > 0 ? "#FF572218" : "#1F1F1F",
              border: `1px solid ${totalUnanswered > 0 ? "#FF572244" : "rgba(255,255,255,0.07)"}`,
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4" style={{ color: totalUnanswered > 0 ? "#FF5722" : "#6B7280" }} />
              <span className="text-xs" style={{ color: "#6B7280" }}>Sin Responder</span>
            </div>
            <p className={`text-2xl font-black ${totalUnanswered > 0 ? "text-white" : "text-gray-500"}`}>{totalUnanswered}</p>
          </div>

          <div className="rounded-2xl p-4" style={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4" style={{ color: "#FFE600" }} />
              <span className="text-xs" style={{ color: "#6B7280" }}>Tiempo Respuesta</span>
            </div>
            <p className="text-2xl font-black text-white">{avgResponseTime > 0 ? `${avgResponseTime}m` : "N/A"}</p>
          </div>

          <div className="rounded-2xl p-4" style={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4" style={{ color: "#39FF14" }} />
              <span className="text-xs" style={{ color: "#6B7280" }}>Cuentas</span>
            </div>
            <p className="text-2xl font-black text-white">{accounts.length}</p>
          </div>
        </div>

        <div className="rounded-2xl p-4 mb-4" style={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4" style={{ color: "#00E5FF" }} />
            <span className="text-sm font-bold text-white">Tiempo de respuesta por cuenta</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {accountStats.map((stat) => {
              const responseMinutes = stat.responseTime?.total?.response_time ?? null;
              const color =
                responseMinutes === null
                  ? "#6B7280"
                  : responseMinutes <= 15
                    ? "#39FF14"
                    : responseMinutes <= 60
                      ? "#00E5FF"
                      : responseMinutes <= 180
                        ? "#FFE600"
                        : responseMinutes <= 1440
                          ? "#FF5722"
                          : "#ef4444";

              return (
                <div
                  key={stat.accountId}
                  className="p-3 rounded-xl"
                  style={{ background: "#121212", border: `1px solid ${color}30` }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-white">@{stat.nickname}</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${color}22`, color }}>
                      {responseMinutes !== null ? formatTime(responseMinutes) : "Sin datos"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center mt-2 pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                    <span className="text-[10px]" style={{ color: "#6B7280" }}>Sin responder</span>
                    <span className="text-xs font-bold" style={{ color: stat.unanswered > 0 ? "#FF5722" : "#39FF14" }}>
                      {stat.unanswered}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar pregunta, producto o cuenta..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-500 outline-none"
              style={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.08)" }}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="px-3 py-2.5 rounded-xl text-sm text-white outline-none"
            style={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <option value="all">Todos los estados</option>
            <option value="UNANSWERED">Sin responder</option>
            <option value="ANSWERED">Respondidas</option>
            <option value="CLOSED_UNANSWERED">Cerradas sin respuesta</option>
          </select>

          <select
            value={accountFilter}
            onChange={(event) => setAccountFilter(event.target.value)}
            className="px-3 py-2.5 rounded-xl text-sm text-white outline-none"
            style={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <option value="all">Todas las cuentas</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                @{account.meli_nickname}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="rounded-2xl p-4 mb-4 text-center" style={{ background: "#ef444418", border: "1px solid #ef444440" }}>
            <AlertCircle className="w-7 h-7 mx-auto mb-1" style={{ color: "#ef4444" }} />
            <p className="text-sm text-white font-semibold">{error}</p>
            <p className="text-xs mt-2" style={{ color: "#9CA3AF" }}>
              Cuentas: {accounts.length} | Loading: {accountsLoading ? "Sí" : "No"}
            </p>
            <button onClick={() => loadAllQuestions()} className="mt-2 px-4 py-1.5 rounded-lg text-xs font-bold bg-red-500 text-white">
              Reintentar
            </button>
          </div>
        )}

        <div className="space-y-3">
          {loading && questions.length === 0 ? (
            [1, 2, 3].map((index) => (
              <div key={index} className="rounded-2xl p-4 animate-pulse" style={{ background: "#1F1F1F" }}>
                <div className="h-3 rounded w-24 mb-2" style={{ background: "#2a2a2a" }} />
                <div className="h-4 rounded w-3/4 mb-1" style={{ background: "#2a2a2a" }} />
                <div className="h-4 rounded w-1/2" style={{ background: "#2a2a2a" }} />
              </div>
            ))
          ) : filteredQuestions.length === 0 ? (
            <div className="rounded-2xl p-10 text-center" style={{ background: "#1F1F1F" }}>
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2" style={{ color: "#39FF14" }} />
              <p className="text-white font-bold">
                {searchTerm ? "Sin resultados" : accountsLoading ? "Cargando cuentas..." : accounts.length === 0 ? "No hay cuentas conectadas" : "¡Todas las preguntas respondidas!"}
              </p>
              <p className="text-sm mt-1" style={{ color: "#6B7280" }}>
                {searchTerm ? "Intenta con otros filtros" : accountsLoading ? "Conectando con Mercado Libre..." : accounts.length === 0 ? "Conecta una cuenta de MeLi para ver las preguntas" : "No hay preguntas pendientes en ninguna cuenta"}
              </p>
              {!accountsLoading && accounts.length === 0 && (
                <Link
                  href="/configuracion/meli"
                  className="inline-block mt-4 px-4 py-2 rounded-xl text-sm font-bold text-black"
                  style={{ background: "#FFE600" }}
                >
                  Conectar cuenta
                </Link>
              )}
            </div>
          ) : (
            filteredQuestions.map((question) => (
              <QuestionCard
                key={question.id}
                question={question}
                isAnswering={answering === question.id}
                isJustAnswered={justAnsweredIds.has(question.id)}
                onAnswer={(text) => handleAnswer(question.id, question.account.id, text)}
              />
            ))
          )}
        </div>
      </div>
    </main>
  );
}

interface QuestionCardProps {
  question: UnifiedQuestion;
  isAnswering: boolean;
  isJustAnswered: boolean;
  onAnswer: (text: string) => Promise<boolean>;
}

function QuestionCard({ question, isAnswering, isJustAnswered, onAnswer }: QuestionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localAnswer, setLocalAnswer] = useState("");

  const isUnanswered = question.status === QUESTION_STATUSES.UNANSWERED;
  const timeAgo = getTimeAgo(question.date_created);
  const itemTitle = question.item_title || question.item_id;
  const itemThumbnail = question.item_thumbnail || "";
  const itemPermalink = question.item_id
    ? `https://articulo.mercadolibre.com.ar/${question.item_id.replace(/^([A-Z]+)(\d+)$/, "$1-$2")}`
    : "";

  const statusColors: Record<string, string> = {
    [QUESTION_STATUSES.UNANSWERED]: "#FF5722",
    [QUESTION_STATUSES.ANSWERED]: "#39FF14",
    [QUESTION_STATUSES.CLOSED_UNANSWERED]: "#6B7280",
    [QUESTION_STATUSES.UNDER_REVIEW]: "#FFE600",
  };

  const statusLabels: Record<string, string> = {
    [QUESTION_STATUSES.UNANSWERED]: "Sin responder",
    [QUESTION_STATUSES.ANSWERED]: "Respondida",
    [QUESTION_STATUSES.CLOSED_UNANSWERED]: "Cerrada",
    [QUESTION_STATUSES.UNDER_REVIEW]: "En revisión",
  };

  const handleSubmit = async () => {
    const sent = await onAnswer(localAnswer);

    if (sent) {
      setLocalAnswer("");
      setIsExpanded(false);
    }
  };

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-300"
      style={{
        background: "#1F1F1F",
        border: `1px solid ${isUnanswered ? "#FF572244" : "rgba(255,255,255,0.07)"}`,
      }}
    >
      <button onClick={() => setIsExpanded(!isExpanded)} className="w-full text-left p-4">
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "#2a2a2a", border: "2px solid rgba(255,230,0,0.1)" }}
          >
            <span className="text-xs font-bold" style={{ color: "#FFE600" }}>
              {question.account.nickname.substring(0, 2).toUpperCase()}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#FFE60018", color: "#FFE600" }}>
                @{question.account.nickname}
              </span>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: `${statusColors[question.status]}22`, color: statusColors[question.status] }}
              >
                {statusLabels[question.status]}
              </span>
              <span className="text-[10px]" style={{ color: "#6B7280" }}>
                {timeAgo}
              </span>
            </div>

            {(itemTitle || itemThumbnail) && (
              <div className="flex items-center gap-2 mb-2 p-2 rounded-lg" style={{ background: "#121212" }}>
                {itemThumbnail ? (
                  <img src={itemThumbnail} alt={itemTitle} className="w-12 h-12 rounded-lg object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-lg" style={{ background: "#2a2a2a" }} />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white truncate">{itemTitle}</p>
                  {itemPermalink && (
                    <a
                      href={itemPermalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px]"
                      style={{ color: "#00E5FF" }}
                      onClick={(event) => event.stopPropagation()}
                    >
                      Ver publicación →
                    </a>
                  )}
                </div>
              </div>
            )}

            <p className="text-sm text-white font-medium leading-snug">{question.text}</p>

            {question.from.nickname && (
              <p className="text-xs mt-1" style={{ color: "#6B7280" }}>
                De: {question.from.nickname}
              </p>
            )}
          </div>

          <div className="flex-shrink-0">
            {isUnanswered ? (
              <AlertCircle className="w-5 h-5" style={{ color: "#FF5722" }} />
            ) : (
              <CheckCircle2 className="w-5 h-5" style={{ color: "#39FF14" }} />
            )}
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="pt-3 p-3 rounded-xl" style={{ background: "#121212" }}>
            <p className="text-xs font-semibold mb-1" style={{ color: "#6B7280" }}>
              Pregunta:
            </p>
            <p className="text-sm text-white">{question.text}</p>
          </div>

          {question.answer && (
            <div className="p-3 rounded-xl" style={{ background: "#1a3a1a" }}>
              <p className="text-xs font-semibold mb-1" style={{ color: "#34D399" }}>
                Tu respuesta:
              </p>
              <p className="text-sm text-white">{question.answer.text}</p>
              <p className="text-[10px] mt-1" style={{ color: "#6B7280" }}>
                {getTimeAgo(question.answer.date_created)}
              </p>
            </div>
          )}

          {isJustAnswered && (
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl mt-2"
              style={{ background: "#22c55e18", border: "1px solid #22c55e44" }}
            >
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: "#22c55e" }} />
              <span className="text-sm font-bold" style={{ color: "#22c55e" }}>
                ✓ Respuesta enviada — sincronizando con MeLi
              </span>
            </div>
          )}

          {isUnanswered && !isJustAnswered && (
            <div className="pt-2">
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#6B7280" }}>
                Responder
              </p>
              <textarea
                rows={3}
                value={localAnswer}
                onChange={(event) => setLocalAnswer(event.target.value)}
                placeholder="Escribí tu respuesta..."
                maxLength={2000}
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-gray-500 outline-none resize-none"
                style={{ background: "#121212", border: "1px solid rgba(255,255,255,0.1)" }}
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs" style={{ color: "#6B7280" }}>
                  {localAnswer.length}/2000
                </span>
                <button
                  onClick={handleSubmit}
                  disabled={!localAnswer.trim() || isAnswering}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm text-black disabled:opacity-40"
                  style={{ background: "#FFE600" }}
                >
                  {isAnswering ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Responder
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  // Si la fecha es futura (clock skew), mostrar "ahora"
  if (diff < 0) return "ahora";

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "ahora";
  if (minutes < 60) return `hace ${minutes}m`;
  if (hours < 24) return `hace ${hours}h`;
  if (days < 7) return `hace ${days}d`;
  return date.toLocaleDateString("es-AR");
}

function formatTime(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  }

  if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
}