"use client";

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  Filter,
  Bell,
} from "lucide-react";
import { useMeliAccounts } from "@/components/auth/MeliAccountsProvider";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardSkeleton, ErrorState, EmptyState } from "@/components/ui";

// Tipos
interface Question {
  id: number;
  text: string;
  status: string;
  date_created: string;
  answer?: {
    text: string;
    date_created: string;
  } | null;
  item_id: string;
  from: {
    id: number;
    nickname?: string;
  };
}

interface AccountQuestions {
  accountId: string;
  nickname: string;
  sellerId: string;
  questions: Question[];
  total: number;
  error?: string;
}

// Componente de tarjeta de pregunta
function QuestionCard({
  question,
  accountNickname,
  onAnswer,
  isAnswering,
}: {
  question: Question;
  accountNickname: string;
  onAnswer: (questionId: number, text: string) => void;
  isAnswering: boolean;
}) {
  const [answerText, setAnswerText] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  const isUnanswered = question.status === "UNANSWERED";
  const isAnswered = question.status === "ANSWERED";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl p-4 border transition-all ${
        isUnanswered
          ? "bg-yellow-500/5 border-yellow-500/20"
          : "bg-zinc-900/50 border-zinc-800/50"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                isUnanswered
                  ? "bg-yellow-500/20 text-yellow-400"
                  : "bg-green-500/20 text-green-400"
              }`}
            >
              {isUnanswered ? "Sin responder" : "Respondida"}
            </span>
            <span className="text-xs text-zinc-500">{accountNickname}</span>
          </div>

          <p className="text-white text-sm mb-2">{question.text}</p>

          <div className="flex items-center gap-4 text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(question.date_created).toLocaleDateString("es-AR")}
            </span>
            <span>ID: {question.id}</span>
          </div>
        </div>

        {isUnanswered && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-1.5 bg-yellow-400 text-black text-xs font-medium rounded-lg hover:bg-yellow-300 transition-colors"
          >
            Responder
          </button>
        )}
      </div>

      {/* Formulario de respuesta */}
      <AnimatePresence>
        {isExpanded && isUnanswered && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-4 pt-4 border-t border-zinc-800"
          >
            <textarea
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              placeholder="Escribí tu respuesta..."
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-yellow-500/50 resize-none"
              rows={3}
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => setIsExpanded(false)}
                className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onAnswer(question.id, answerText);
                  setIsExpanded(false);
                  setAnswerText("");
                }}
                disabled={!answerText.trim() || isAnswering}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-400 text-black text-xs font-medium rounded-lg hover:bg-yellow-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAnswering ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-3 h-3" />
                    Enviar
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Respuesta existente */}
      {question.answer && (
        <div className="mt-3 pt-3 border-t border-zinc-800/50">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-3 h-3 text-green-400" />
            <span className="text-xs text-green-400">Respuesta enviada</span>
          </div>
          <p className="text-sm text-zinc-300">{question.answer.text}</p>
        </div>
      )}
    </motion.div>
  );
}

// Página principal
export default function PreguntasPage() {
  const router = useRouter();
  const { accounts, loading: accountsLoading } = useMeliAccounts();

  const [questions, setQuestions] = useState<AccountQuestions[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unanswered">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [answeringId, setAnsweringId] = useState<number | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Cargar preguntas
  const loadQuestions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("No hay sesión activa");
      }

      const response = await fetch("/api/meli-questions-unified", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setQuestions(data.questions || []);
      setLastUpdate(new Date());
    } catch (err: any) {
      console.error("Error cargando preguntas:", err);
      setError(err.message || "Error al cargar preguntas");
      toast.error(err.message || "Error al cargar preguntas");
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar al montar
  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  // Auto-refresh cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      loadQuestions();
    }, 30000);

    return () => clearInterval(interval);
  }, [loadQuestions]);

  // Responder pregunta
  const handleAnswer = async (questionId: number, text: string) => {
    setAnsweringId(questionId);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("No hay sesión activa");
      }

      // Encontrar la cuenta que tiene esta pregunta
      const accountWithQuestion = questions.find((aq) =>
        aq.questions.some((q) => q.id === questionId)
      );

      if (!accountWithQuestion) {
        throw new Error("No se encontró la cuenta para esta pregunta");
      }

      const response = await fetch("/api/meli-answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          questionId,
          text,
          accountId: accountWithQuestion.accountId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al responder");
      }

      toast.success("Respuesta enviada correctamente");

      // Actualizar estado local
      setQuestions((prev) =>
        prev.map((aq) => ({
          ...aq,
          questions: aq.questions.map((q) =>
            q.id === questionId
              ? {
                  ...q,
                  status: "ANSWERED",
                  answer: {
                    text,
                    date_created: new Date().toISOString(),
                  },
                }
              : q
          ),
        }))
      );
    } catch (err: any) {
      console.error("Error respondiendo:", err);
      toast.error(err.message || "Error al enviar respuesta");
    } finally {
      setAnsweringId(null);
    }
  };

  // Filtrar preguntas
  const filteredQuestions = questions
    .map((aq) => ({
      ...aq,
      questions: aq.questions.filter((q) => {
        // Filtro por estado
        if (filter === "unanswered" && q.status !== "UNANSWERED") {
          return false;
        }
        // Filtro por búsqueda
        if (searchTerm) {
          const search = searchTerm.toLowerCase();
          return (
            q.text.toLowerCase().includes(search) ||
            q.id.toString().includes(search)
          );
        }
        return true;
      }),
    }))
    .filter((aq) => aq.questions.length > 0);

  // Contadores
  const totalQuestions = questions.reduce(
    (sum, aq) => sum + aq.questions.length,
    0
  );
  const unansweredCount = questions.reduce(
    (sum, aq) => sum + aq.questions.filter((q) => q.status === "UNANSWERED").length,
    0
  );

  // Estados de carga y error
  if (accountsLoading) {
    return (
      <div className="min-h-screen bg-[#020203] p-4">
        <DashboardSkeleton />
      </div>
    );
  }

  if (!accountsLoading && accounts.length === 0) {
    return (
      <div className="min-h-screen bg-[#020203] p-4">
        <EmptyState
          title="No hay cuentas conectadas"
          message="Conectá al menos una cuenta de Mercado Libre para ver las preguntas."
          icon={MessageCircle}
          action={{
            label: "Ir al Dashboard",
            onClick: () => router.push("/"),
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020203]">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#020203]/95 backdrop-blur-sm border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-zinc-400" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-white">Preguntas Unificadas</h1>
                <p className="text-sm text-zinc-500">
                  {accounts.length} cuenta{accounts.length > 1 ? "s" : ""} conectada
                  {accounts.length > 1 ? "s" : ""}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {lastUpdate && (
                <span className="text-xs text-zinc-500 hidden sm:block">
                  Actualizado: {lastUpdate.toLocaleTimeString("es-AR")}
                </span>
              )}
              <button
                onClick={loadQuestions}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-sm font-medium text-zinc-300 hover:text-white hover:border-zinc-700 transition-all disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                />
                <span className="hidden sm:inline">
                  {loading ? "Actualizando..." : "Actualizar"}
                </span>
              </button>
            </div>
          </div>

          {/* Stats y filtros */}
          <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 rounded-lg">
                <MessageCircle className="w-4 h-4 text-zinc-400" />
                <span className="text-sm text-zinc-300">
                  {totalQuestions} total
                </span>
              </div>

              {unansweredCount > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <Bell className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm font-medium text-yellow-400">
                    {unansweredCount} sin responder
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar preguntas..."
                  className="pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-yellow-500/50 w-48 sm:w-64"
                />
              </div>

              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as "all" | "unanswered")}
                className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-yellow-500/50"
              >
                <option value="all">Todas</option>
                <option value="unanswered">Sin responder</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {error ? (
          <ErrorState
            title="Error al cargar preguntas"
            message="No se pudieron obtener las preguntas de Mercado Libre."
            error={error}
            onRetry={loadQuestions}
          />
        ) : loading && questions.length === 0 ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-24 bg-zinc-900/50 border border-zinc-800/50 rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : filteredQuestions.length === 0 ? (
          <EmptyState
            title={
              searchTerm
                ? "No se encontraron preguntas"
                : filter === "unanswered"
                ? "No hay preguntas sin responder"
                : "No hay preguntas"
            }
            message={
              searchTerm
                ? "Intentá con otros términos de búsqueda."
                : "Todas las preguntas han sido respondidas. ¡Buen trabajo!"
            }
            icon={MessageCircle}
            action={
              searchTerm
                ? { label: "Limpiar búsqueda", onClick: () => setSearchTerm("") }
                : undefined
            }
          />
        ) : (
          <div className="space-y-6">
            {filteredQuestions.map((accountQuestions) => (
              <div key={accountQuestions.accountId}>
                {/* Header de cuenta */}
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-zinc-500" />
                  <span className="text-sm font-medium text-zinc-400">
                    {accountQuestions.nickname}
                  </span>
                  <span className="text-xs text-zinc-600">
                    ({accountQuestions.questions.length} preguntas)
                  </span>
                  {accountQuestions.error && (
                    <span className="text-xs text-red-400">
                      Error: {accountQuestions.error}
                    </span>
                  )}
                </div>

                {/* Lista de preguntas */}
                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {accountQuestions.questions.map((question) => (
                      <QuestionCard
                        key={question.id}
                        question={question}
                        accountNickname={accountQuestions.nickname}
                        onAnswer={handleAnswer}
                        isAnswering={answeringId === question.id}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
