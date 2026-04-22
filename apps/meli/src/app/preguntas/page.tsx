"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
  TrendingUp,
  Zap,
  AlertTriangle,
} from "lucide-react";
import { useMeliAccounts } from "@/components/auth/MeliAccountsProvider";
import { questionsService } from "@/services/meli";
import { QUESTION_STATUSES, MELI_STATUS_COLORS } from "@/lib/meli/constants";
import { supabase } from "@/lib/supabase";
import type { MeliQuestion, MeliResponseTime } from "@/types/meli";

// ============ TIPOS ============
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

// ============ COMPONENTE PRINCIPAL ============
export default function PreguntasPage() {
  const router = useRouter();
  const { accounts, loading: accountsLoading } = useMeliAccounts();
  
  // Estados
  const [questions, setQuestions] = useState<UnifiedQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("UNANSWERED");
  const [accountFilter, setAccountFilter] = useState<string>("all");
  
  // Estadísticas
  const [accountStats, setAccountStats] = useState<AccountStats[]>([]);
  
  // Respuesta
  const [answering, setAnswering] = useState<number | null>(null);
  const [answerText, setAnswerText] = useState("");

  // Debug logs
  useEffect(() => {
    console.log("[Preguntas] accounts:", accounts);
    console.log("[Preguntas] accountsLoading:", accountsLoading);
    console.log("[Preguntas] accounts.length:", accounts?.length);
  }, [accounts, accountsLoading]);

  // ============ CARGA DE PREGUNTAS ============
  const loadAllQuestions = useCallback(async () => {
    if (!accounts.length) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Obtener token de Supabase para auth
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error("No hay sesión activa");
      }
      
      // Llamar al endpoint del servidor (evita CORS)
      const response = await fetch(`/api/meli-questions-unified?_t=${Date.now()}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${await response.text()}`);
      }
      
      const data = await response.json();
      
      console.log("[Preguntas] Datos recibidos del endpoint:", {
        totalQuestions: data.questions?.reduce((acc: number, q: any) => acc + (q.questions?.length || 0), 0),
        accounts: data.questions?.length,
        firstAccount: data.questions?.[0]?.nickname,
        firstAccountQuestions: data.questions?.[0]?.questions?.length,
      });
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      // Unificar preguntas de todas las cuentas
      const unified: UnifiedQuestion[] = [];
      const stats: AccountStats[] = [];
      
      for (const result of data.questions) {
        const accountQuestions = result.questions.map((q: any) => ({
          ...q,
          account: {
            id: result.accountId,
            nickname: result.nickname,
            sellerId: result.sellerId,
          },
        }));
        
        unified.push(...accountQuestions);
        
        // Usar tiempo de respuesta del servidor (ya viene en el endpoint)
        stats.push({
          accountId: result.accountId,
          nickname: result.nickname,
          total: result.total,
          unanswered: result.questions.filter(
            (q: any) => q.status === QUESTION_STATUSES.UNANSWERED
          ).length,
          responseTime: result.responseTime,
        });
      }
      
      // Ordenar por fecha (más recientes primero)
      unified.sort((a, b) => 
        new Date(b.date_created).getTime() - new Date(a.date_created).getTime()
      );
      
      setQuestions(unified);
      setAccountStats(stats);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando preguntas");
    } finally {
      setLoading(false);
    }
  }, [accounts]);

  // Cargar al inicio y cada 60 segundos
  useEffect(() => {
    if (!accountsLoading && accounts.length > 0) {
      loadAllQuestions();
    }
  }, [accounts, accountsLoading, loadAllQuestions]);
  
  // Auto-refresh cada 60 segundos
  useEffect(() => {
    if (!accounts.length) return;
    
    const interval = setInterval(loadAllQuestions, 60000);
    return () => clearInterval(interval);
  }, [accounts.length, loadAllQuestions]);

  // ============ FILTROS ============
  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      // Filtro por estado
      if (statusFilter !== "all" && q.status !== statusFilter) return false;
      
      // Filtro por cuenta
      if (accountFilter !== "all" && q.account.id !== accountFilter) return false;
      
      // Filtro por búsqueda
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          q.text.toLowerCase().includes(term) ||
          q.item_id.toLowerCase().includes(term) ||
          q.account.nickname.toLowerCase().includes(term) ||
          (q.from.nickname?.toLowerCase().includes(term) ?? false)
        );
      }
      
      return true;
    });
  }, [questions, statusFilter, accountFilter, searchTerm]);

  // ============ RESPUESTA ============
  const handleAnswer = async (questionId: number, accountId: string) => {
    if (!answerText.trim()) return;
    
    setAnswering(questionId);
    
    try {
      await questionsService.answerQuestion(accountId, questionId, answerText);
      
      // Actualizar estado local
      setQuestions(prev => prev.map(q => 
        q.id === questionId 
          ? { 
              ...q, 
              status: QUESTION_STATUSES.ANSWERED,
              answer: {
                text: answerText,
                status: "ACTIVE",
                date_created: new Date().toISOString(),
              }
            }
          : q
      ));
      
      setAnswerText("");
      setAnswering(null);
    } catch (err) {
      alert("Error enviando respuesta: " + (err instanceof Error ? err.message : "Error desconocido"));
      setAnswering(null);
    }
  };

  // ============ ESTADÍSTICAS ============
  const totalUnanswered = questions.filter(
    q => q.status === QUESTION_STATUSES.UNANSWERED
  ).length;
  
  const avgResponseTime = useMemo(() => {
    const times = accountStats
      .filter(s => s.responseTime?.total?.response_time)
      .map(s => s.responseTime!.total.response_time);
    
    if (!times.length) return 0;
    return Math.round(times.reduce((a, b) => a + b, 0) / times.length);
  }, [accountStats]);

  // ============ RENDER ============
  return (
    <main className="min-h-screen pb-24" style={{ background: "#121212" }}>
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
              Preguntas Unificadas
            </h1>
            <p className="text-[10px]" style={{ color: "#6B7280" }}>
              {accounts.length} cuentas · {lastUpdate ? `Actualizado ${lastUpdate.toLocaleTimeString()}` : "Cargando..."}
            </p>
          </div>
        </div>
        <button 
          onClick={loadAllQuestions}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold disabled:opacity-40"
          style={{ background: "#1F1F1F", color: "#FF5722", border: "1px solid #FF572244" }}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Sync..." : "Actualizar"}
        </button>
      </div>

      {/* Error de cuentas */}
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

      {/* Estadísticas */}
      <div className="max-w-6xl mx-auto px-4 pt-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {/* Total Preguntas */}
          <div className="rounded-2xl p-4" style={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center gap-2 mb-1">
              <MessageCircle className="w-4 h-4" style={{ color: "#00E5FF" }} />
              <span className="text-xs" style={{ color: "#6B7280" }}>Total Preguntas</span>
            </div>
            <p className="text-2xl font-black text-white">{questions.length}</p>
          </div>
          
          {/* Sin Responder */}
          <div className="rounded-2xl p-4" 
            style={{ 
              background: totalUnanswered > 0 ? "#FF572218" : "#1F1F1F", 
              border: `1px solid ${totalUnanswered > 0 ? "#FF572244" : "rgba(255,255,255,0.07)"}` 
            }}>
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4" style={{ color: totalUnanswered > 0 ? "#FF5722" : "#6B7280" }} />
              <span className="text-xs" style={{ color: "#6B7280" }}>Sin Responder</span>
            </div>
            <p className={`text-2xl font-black ${totalUnanswered > 0 ? "text-white" : "text-gray-500"}`}>
              {totalUnanswered}
            </p>
          </div>
          
          {/* Tiempo Respuesta */}
          <div className="rounded-2xl p-4" style={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4" style={{ color: "#FFE600" }} />
              <span className="text-xs" style={{ color: "#6B7280" }}>Tiempo Respuesta</span>
            </div>
            <p className="text-2xl font-black text-white">
              {avgResponseTime > 0 ? `${avgResponseTime}m` : "N/A"}
            </p>
          </div>
          
          {/* Cuentas Activas */}
          <div className="rounded-2xl p-4" style={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4" style={{ color: "#39FF14" }} />
              <span className="text-xs" style={{ color: "#6B7280" }}>Cuentas</span>
            </div>
            <p className="text-2xl font-black text-white">{accounts.length}</p>
          </div>
        </div>

        {/* Panel de Tiempo de Respuesta por Cuenta */}
        <div className="rounded-2xl p-4 mb-4" style={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4" style={{ color: "#39FF14" }} />
            <h2 className="text-sm font-bold text-white">Tiempo de Respuesta por Cuenta</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {accountStats.map((stat) => {
              const responseTime = stat.responseTime?.total?.response_time;
              const hasData = responseTime !== undefined && responseTime !== null;
              
              // Determinar color según tiempo de respuesta
              let color = "#6B7280"; // Gris - sin datos
              let label = "Sin datos";
              
              if (hasData) {
                if (responseTime <= 15) {
                  color = "#39FF14"; // Verde - Excelente (< 15 min)
                  label = "Excelente";
                } else if (responseTime <= 60) {
                  color = "#00E5FF"; // Cyan - Bueno (< 1 hora)
                  label = "Bueno";
                } else if (responseTime <= 180) {
                  color = "#FFE600"; // Amarillo - Regular (< 3 horas)
                  label = "Regular";
                } else if (responseTime <= 1440) {
                  color = "#FF5722"; // Naranja - Lento (< 24 horas)
                  label = "Lento";
                } else {
                  color = "#ef4444"; // Rojo - Crítico (> 24 horas)
                  label = "Crítico";
                }
              }
              
              // Calcular porcentaje para la barra de progreso (máximo 24 horas = 1440 minutos)
              const maxTime = 1440;
              const percentage = hasData ? Math.min((responseTime / maxTime) * 100, 100) : 0;
              
              return (
                <div 
                  key={stat.accountId} 
                  className="p-3 rounded-xl"
                  style={{ background: "#121212", border: `1px solid ${color}30` }}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-bold text-white">@{stat.nickname}</span>
                    <span 
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: `${color}22`, color }}
                    >
                      {label}
                    </span>
                  </div>
                  
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-2xl font-black" style={{ color }}>
                      {hasData ? formatTime(responseTime) : "--"}
                    </span>
                    <span className="text-xs" style={{ color: "#6B7280" }}>
                      {hasData ? "promedio" : "sin datos"}
                    </span>
                  </div>
                  
                  {/* Barra de progreso */}
                  {hasData && (
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#2a2a2a" }}>
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${percentage}%`,
                          background: color
                        }}
                      />
                    </div>
                  )}
                  
                  {/* Preguntas sin responder */}
                  <div className="flex justify-between items-center mt-2 pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                    <span className="text-[10px]" style={{ color: "#6B7280" }}>Sin responder</span>
                    <span 
                      className="text-xs font-bold"
                      style={{ color: stat.unanswered > 0 ? "#FF5722" : "#39FF14" }}
                    >
                      {stat.unanswered}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Leyenda */}
          <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ background: "#39FF14" }} />
              <span className="text-[10px]" style={{ color: "#6B7280" }}>&lt; 15m (Excelente)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ background: "#00E5FF" }} />
              <span className="text-[10px]" style={{ color: "#6B7280" }}>&lt; 1h (Bueno)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ background: "#FFE600" }} />
              <span className="text-[10px]" style={{ color: "#6B7280" }}>&lt; 3h (Regular)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ background: "#FF5722" }} />
              <span className="text-[10px]" style={{ color: "#6B7280" }}>&lt; 24h (Lento)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ background: "#ef4444" }} />
              <span className="text-[10px]" style={{ color: "#6B7280" }}>&gt; 24h (Crítico)</span>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2 mb-4">
          {/* Búsqueda */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar pregunta, producto o cuenta..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-500 outline-none"
              style={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.08)" }}
            />
          </div>
          
          {/* Filtro Estado */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl text-sm text-white outline-none"
            style={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <option value="all">Todos los estados</option>
            <option value="UNANSWERED">Sin responder</option>
            <option value="ANSWERED">Respondidas</option>
            <option value="CLOSED_UNANSWERED">Cerradas sin respuesta</option>
          </select>
          
          {/* Filtro Cuenta */}
          <select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl text-sm text-white outline-none"
            style={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <option value="all">Todas las cuentas</option>
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>@{acc.meli_nickname}</option>
            ))}
          </select>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-2xl p-4 mb-4 text-center" style={{ background: "#ef444418", border: "1px solid #ef444440" }}>
            <AlertCircle className="w-7 h-7 mx-auto mb-1" style={{ color: "#ef4444" }} />
            <p className="text-sm text-white font-semibold">{error}</p>
            <button onClick={loadAllQuestions} className="mt-2 px-4 py-1.5 rounded-lg text-xs font-bold bg-red-500 text-white">
              Reintentar
            </button>
          </div>
        )}

        {/* Lista de Preguntas */}
        <div className="space-y-3">
          {loading && questions.length === 0 ? (
            // Skeleton loading
            [1, 2, 3].map(i => (
              <div key={i} className="rounded-2xl p-4 animate-pulse" style={{ background: "#1F1F1F" }}>
                <div className="h-3 rounded w-24 mb-2" style={{ background: "#2a2a2a" }} />
                <div className="h-4 rounded w-3/4 mb-1" style={{ background: "#2a2a2a" }} />
                <div className="h-4 rounded w-1/2" style={{ background: "#2a2a2a" }} />
              </div>
            ))
          ) : filteredQuestions.length === 0 ? (
            // Empty state
            <div className="rounded-2xl p-10 text-center" style={{ background: "#1F1F1F" }}>
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2" style={{ color: "#39FF14" }} />
              <p className="text-white font-bold">
                {searchTerm ? "Sin resultados" : "¡Todas las preguntas respondidas!"}
              </p>
              <p className="text-sm mt-1" style={{ color: "#6B7280" }}>
                {searchTerm ? "Intenta con otros filtros" : "No hay preguntas pendientes en ninguna cuenta"}
              </p>
            </div>
          ) : (
            // Preguntas
            filteredQuestions.map(question => (
              <QuestionCard
                key={question.id}
                question={question}
                isAnswering={answering === question.id}
                answerText={answerText}
                setAnswerText={setAnswerText}
                onAnswer={() => handleAnswer(question.id, question.account.id)}
              />
            ))
          )}
        </div>
      </div>
    </main>
  );
}

// ============ COMPONENTE: TARJETA DE PREGUNTA ============
interface QuestionCardProps {
  question: UnifiedQuestion;
  isAnswering: boolean;
  answerText: string;
  setAnswerText: (text: string) => void;
  onAnswer: () => void;
}

function QuestionCard({ 
  question, 
  isAnswering, 
  answerText, 
  setAnswerText, 
  onAnswer 
}: QuestionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localAnswer, setLocalAnswer] = useState("");
  
  const isUnanswered = question.status === QUESTION_STATUSES.UNANSWERED;
  const timeAgo = getTimeAgo(question.date_created);
  
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

  const handleSubmit = () => {
    setAnswerText(localAnswer);
    onAnswer();
    setLocalAnswer("");
    setIsExpanded(false);
  };

  return (
    <div 
      className="rounded-2xl overflow-hidden transition-all duration-300"
      style={{ 
        background: "#1F1F1F", 
        border: `1px solid ${isUnanswered ? "#FF572244" : "rgba(255,255,255,0.07)"}`,
      }}
    >
      {/* Header */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left p-4"
      >
        <div className="flex items-start gap-3">
          {/* Indicador de cuenta */}
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "#2a2a2a", border: "2px solid rgba(255,230,0,0.1)" }}
          >
            <span className="text-xs font-bold" style={{ color: "#FFE600" }}>
              {question.account.nickname.substring(0, 2).toUpperCase()}
            </span>
          </div>
          
          {/* Contenido */}
          <div className="flex-1 min-w-0">
            {/* Cuenta y estado */}
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span 
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: "#FFE60018", color: "#FFE600" }}
              >
                @{question.account.nickname}
              </span>
              <span 
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ 
                  background: `${statusColors[question.status]}22`, 
                  color: statusColors[question.status] 
                }}
              >
                {statusLabels[question.status]}
              </span>
              <span className="text-[10px]" style={{ color: "#6B7280" }}>
                {timeAgo}
              </span>
            </div>
            
            {/* Info del producto */}
            {(question as any).item_info && (
              <div className="flex items-center gap-2 mb-2 p-2 rounded-lg" style={{ background: "#121212" }}>
                <img 
                  src={(question as any).item_info.thumbnail} 
                  alt={(question as any).item_info.title}
                  className="w-12 h-12 rounded-lg object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white truncate">{(question as any).item_info.title}</p>
                  <a 
                    href={(question as any).item_info.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px]" 
                    style={{ color: "#00E5FF" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    Ver publicación →
                  </a>
                </div>
              </div>
            )}
            
            {/* Pregunta */}
            <p className="text-sm text-white font-medium leading-snug">
              {question.text}
            </p>
            
            {/* Info del comprador */}
            {question.from.nickname && (
              <p className="text-xs mt-1" style={{ color: "#6B7280" }}>
                De: {question.from.nickname}
              </p>
            )}
          </div>
          
          {/* Chevron */}
          <div className="flex-shrink-0">
            {isUnanswered ? (
              <AlertCircle className="w-5 h-5" style={{ color: "#FF5722" }} />
            ) : (
              <CheckCircle2 className="w-5 h-5" style={{ color: "#39FF14" }} />
            )}
          </div>
        </div>
      </button>
      
      {/* Respuesta expandible */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          {/* Pregunta completa */}
          <div className="pt-3 p-3 rounded-xl" style={{ background: "#121212" }}>
            <p className="text-xs font-semibold mb-1" style={{ color: "#6B7280" }}>Pregunta:</p>
            <p className="text-sm text-white">{question.text}</p>
          </div>
          
          {/* Respuesta existente */}
          {question.answer && (
            <div className="p-3 rounded-xl" style={{ background: "#1a3a1a" }}>
              <p className="text-xs font-semibold mb-1" style={{ color: "#34D399" }}>Tu respuesta:</p>
              <p className="text-sm text-white">{question.answer.text}</p>
              <p className="text-[10px] mt-1" style={{ color: "#6B7280" }}>
                {getTimeAgo(question.answer.date_created)}
              </p>
            </div>
          )}
          
          {/* Formulario de respuesta */}
          {isUnanswered && (
            <div className="pt-2">
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#6B7280" }}>
                Responder
              </p>
              <textarea
                rows={3}
                value={localAnswer}
                onChange={(e) => setLocalAnswer(e.target.value)}
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

// ============ UTILIDADES ============
function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
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
  } else if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  } else {
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }
}
