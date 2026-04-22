import { MELI_API_BASE, MELI_LIMITS, QUESTION_STATUSES } from '@/lib/meli/constants';
import { tokenService } from './token.service';
import type { 
  MeliQuestion, 
  MeliQuestionsSearchResponse, 
  MeliResponseTime,
  MeliApiError 
} from '@/types/meli';

/**
 * Servicio de gestión de preguntas de Mercado Libre
 * API Version 4
 */
export class QuestionsService {
  private static instance: QuestionsService;

  static getInstance(): QuestionsService {
    if (!QuestionsService.instance) {
      QuestionsService.instance = new QuestionsService();
    }
    return QuestionsService.instance;
  }

  /**
   * Obtiene preguntas de un vendedor específico
   */
  async getQuestionsBySeller(
    accountId: string,
    sellerId: string,
    options: {
      status?: string;
      offset?: number;
      limit?: number;
      sortFields?: string[];
      sortTypes?: ('ASC' | 'DESC')[];
    } = {}
  ): Promise<MeliQuestionsSearchResponse> {
    const token = await tokenService.getValidToken(accountId);
    
    const params = new URLSearchParams({
      seller_id: sellerId,
      api_version: '4',
      offset: (options.offset || 0).toString(),
      limit: (options.limit || 50).toString(),
    });

    if (options.status) {
      params.append('status', options.status);
    }

    if (options.sortFields?.length) {
      params.append('sort_fields', options.sortFields.join(','));
    }

    if (options.sortTypes?.length) {
      params.append('sort_types', options.sortTypes.join(','));
    }

    const response = await fetch(
      `${MELI_API_BASE}/questions/search?${params.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const error: MeliApiError = await response.json();
      throw new Error(`Error obteniendo preguntas: ${error.message}`);
    }

    return response.json();
  }

  /**
   * Obtiene preguntas de un ítem específico
   */
  async getQuestionsByItem(
    accountId: string,
    itemId: string,
    options: {
      offset?: number;
      limit?: number;
    } = {}
  ): Promise<MeliQuestionsSearchResponse> {
    const token = await tokenService.getValidToken(accountId);
    
    const params = new URLSearchParams({
      item: itemId,
      api_version: '4',
      offset: (options.offset || 0).toString(),
      limit: (options.limit || 50).toString(),
    });

    const response = await fetch(
      `${MELI_API_BASE}/questions/search?${params.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const error: MeliApiError = await response.json();
      throw new Error(`Error obteniendo preguntas: ${error.message}`);
    }

    return response.json();
  }

  /**
   * Obtiene una pregunta específica por ID
   */
  async getQuestionById(
    accountId: string,
    questionId: number
  ): Promise<MeliQuestion> {
    const token = await tokenService.getValidToken(accountId);

    const response = await fetch(
      `${MELI_API_BASE}/questions/${questionId}?api_version=4`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const error: MeliApiError = await response.json();
      throw new Error(`Error obteniendo pregunta: ${error.message}`);
    }

    return response.json();
  }

  /**
   * Responde una pregunta
   * Límite: 2000 caracteres
   */
  async answerQuestion(
    accountId: string,
    questionId: number,
    text: string
  ): Promise<void> {
    // Validar límite de caracteres
    if (text.length > MELI_LIMITS.QUESTION_MAX_LENGTH) {
      throw new Error(
        `La respuesta excede el límite de ${MELI_LIMITS.QUESTION_MAX_LENGTH} caracteres`
      );
    }

    const token = await tokenService.getValidToken(accountId);

    const response = await fetch(`${MELI_API_BASE}/answers`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question_id: questionId,
        text: text,
      }),
    });

    if (!response.ok) {
      const error: MeliApiError = await response.json();
      throw new Error(`Error respondiendo pregunta: ${error.message}`);
    }
  }

  /**
   * Elimina una pregunta
   */
  async deleteQuestion(
    accountId: string,
    questionId: number
  ): Promise<void> {
    const token = await tokenService.getValidToken(accountId);

    const response = await fetch(
      `${MELI_API_BASE}/questions/${questionId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const error: MeliApiError = await response.json();
      throw new Error(`Error eliminando pregunta: ${error.message}`);
    }
  }

  /**
   * Obtiene el tiempo de respuesta de un vendedor
   * Incluye métricas por período y proyección de ventas
   */
  async getResponseTime(
    accountId: string,
    userId: string
  ): Promise<MeliResponseTime> {
    const token = await tokenService.getValidToken(accountId);

    const response = await fetch(
      `${MELI_API_BASE}/users/${userId}/questions/response_time`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (response.status === 404) {
      // No hay datos de tiempo de respuesta
      return {
        user_id: parseInt(userId),
        total: { response_time: 0 },
      };
    }

    if (!response.ok) {
      const error: MeliApiError = await response.json();
      throw new Error(`Error obteniendo tiempo de respuesta: ${error.message}`);
    }

    return response.json();
  }

  /**
   * Obtiene todas las preguntas sin responder de un vendedor
   */
  async getUnansweredQuestions(
    accountId: string,
    sellerId: string
  ): Promise<MeliQuestion[]> {
    const response = await this.getQuestionsBySeller(accountId, sellerId, {
      status: QUESTION_STATUSES.UNANSWERED,
      limit: 100,
    });

    return response.questions;
  }

  /**
   * Obtiene preguntas de múltiples cuentas
   * Útil para dashboard unificado
   */
  async getQuestionsFromMultipleAccounts(
    accounts: Array<{ id: string; sellerId: string; nickname: string }>,
    options: {
      status?: string;
      limit?: number;
    } = {}
  ): Promise<Array<{
    accountId: string;
    nickname: string;
    sellerId: string;
    questions: MeliQuestion[];
    total: number;
  }>> {
    const results = await Promise.allSettled(
      accounts.map(async (account) => {
        try {
          const response = await this.getQuestionsBySeller(
            account.id,
            account.sellerId,
            {
              status: options.status,
              limit: options.limit || 50,
            }
          );

          return {
            accountId: account.id,
            nickname: account.nickname,
            sellerId: account.sellerId,
            questions: response.questions,
            total: response.total,
          };
        } catch (error) {
          console.error(
            `[QuestionsService] Error obteniendo preguntas para cuenta ${account.id}:`,
            error
          );
          return {
            accountId: account.id,
            nickname: account.nickname,
            sellerId: account.sellerId,
            questions: [],
            total: 0,
          };
        }
      })
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }
      return {
        accountId: accounts[index].id,
        nickname: accounts[index].nickname,
        sellerId: accounts[index].sellerId,
        questions: [],
        total: 0,
      };
    });
  }
}

// Exportar singleton
export const questionsService = QuestionsService.getInstance();
