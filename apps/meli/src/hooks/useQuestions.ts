import { useState, useCallback, useEffect } from 'react';
import { questionsService } from '@/services/meli';
import type { MeliQuestion, MeliResponseTime } from '@/types/meli';

interface UseQuestionsOptions {
  accountId: string;
  sellerId: string;
  status?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseQuestionsReturn {
  questions: MeliQuestion[];
  loading: boolean;
  error: string | null;
  total: number;
  responseTime: MeliResponseTime | null;
  refresh: () => Promise<void>;
  answerQuestion: (questionId: number, text: string) => Promise<void>;
  deleteQuestion: (questionId: number) => Promise<void>;
}

/**
 * Hook para gestionar preguntas de una cuenta de MeLi
 */
export function useQuestions({
  accountId,
  sellerId,
  status,
  autoRefresh = false,
  refreshInterval = 60000,
}: UseQuestionsOptions): UseQuestionsReturn {
  const [questions, setQuestions] = useState<MeliQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [responseTime, setResponseTime] = useState<MeliResponseTime | null>(null);

  const fetchQuestions = useCallback(async () => {
    if (!accountId || !sellerId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const [questionsData, responseTimeData] = await Promise.all([
        questionsService.getQuestionsBySeller(accountId, sellerId, {
          status,
          limit: 100,
        }),
        questionsService.getResponseTime(accountId, sellerId),
      ]);

      setQuestions(questionsData.questions);
      setTotal(questionsData.total);
      setResponseTime(responseTimeData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [accountId, sellerId, status]);

  const answerQuestion = useCallback(async (questionId: number, text: string) => {
    if (!accountId) throw new Error('No hay cuenta seleccionada');
    
    await questionsService.answerQuestion(accountId, questionId, text);
    
    // Refrescar lista después de responder
    await fetchQuestions();
  }, [accountId, fetchQuestions]);

  const deleteQuestion = useCallback(async (questionId: number) => {
    if (!accountId) throw new Error('No hay cuenta seleccionada');
    
    await questionsService.deleteQuestion(accountId, questionId);
    
    // Refrescar lista después de eliminar
    await fetchQuestions();
  }, [accountId, fetchQuestions]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(fetchQuestions, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchQuestions]);

  return {
    questions,
    loading,
    error,
    total,
    responseTime,
    refresh: fetchQuestions,
    answerQuestion,
    deleteQuestion,
  };
}
