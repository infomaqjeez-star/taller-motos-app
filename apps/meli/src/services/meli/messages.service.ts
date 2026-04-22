import { MELI_API_BASE, MELI_LIMITS, MELI_AGENT_IDS } from '@/lib/meli/constants';
import { tokenService } from './token.service';
import type { 
  MeliMessage, 
  MeliMessagesResponse, 
  MeliAttachment,
  MeliApiError 
} from '@/types/meli';

/**
 * Servicio de gestión de mensajes de Mercado Libre
 * Implementa nueva arquitectura 2026 con Agentes de Mensajería
 */
export class MessagesService {
  private static instance: MessagesService;

  static getInstance(): MessagesService {
    if (!MessagesService.instance) {
      MessagesService.instance = new MessagesService();
    }
    return MessagesService.instance;
  }

  /**
   * Obtiene el ID del agente según el site
   * Nueva arquitectura 2026: usar agente en lugar de user_id real
   */
  private getAgentId(siteId: string): string {
    return MELI_AGENT_IDS[siteId] || MELI_AGENT_IDS['MLU'];
  }

  /**
   * Obtiene mensajes de un paquete/orden
   * Nota: Al consultar, los mensajes se marcan como leídos automáticamente
   */
  async getMessages(
    accountId: string,
    packId: string,
    sellerId: string,
    options: {
      limit?: number;
      offset?: number;
      markAsRead?: boolean;
    } = {}
  ): Promise<MeliMessagesResponse> {
    const token = await tokenService.getValidToken(accountId);
    
    const params = new URLSearchParams({
      tag: 'post_sale',
      limit: (options.limit || 50).toString(),
      offset: (options.offset || 0).toString(),
    });

    // Por defecto marca como leídos, usar false para no marcar
    if (options.markAsRead === false) {
      params.append('mark_as_read', 'false');
    }

    const response = await fetch(
      `${MELI_API_BASE}/messages/packs/${packId}/sellers/${sellerId}?${params.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const error: MeliApiError = await response.json();
      throw new Error(`Error obteniendo mensajes: ${error.message}`);
    }

    return response.json();
  }

  /**
   * Obtiene un mensaje específico por ID
   */
  async getMessageById(
    accountId: string,
    messageId: string
  ): Promise<MeliMessage> {
    const token = await tokenService.getValidToken(accountId);

    const response = await fetch(
      `${MELI_API_BASE}/messages/${messageId}?tag=post_sale`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const error: MeliApiError = await response.json();
      throw new Error(`Error obteniendo mensaje: ${error.message}`);
    }

    return response.json();
  }

  /**
   * Envía un mensaje al comprador
   * Nueva arquitectura 2026: usar ID del agente en "to.user_id"
   * Límite: 350 caracteres, 1 mensaje por vez
   */
  async sendMessage(
    accountId: string,
    packId: string,
    sellerId: string,
    text: string,
    siteId: string,
    options: {
      attachments?: string[];
    } = {}
  ): Promise<void> {
    // Validar límite de caracteres
    if (text.length > MELI_LIMITS.MESSAGE_MAX_LENGTH) {
      throw new Error(
        `El mensaje excede el límite de ${MELI_LIMITS.MESSAGE_MAX_LENGTH} caracteres`
      );
    }

    const token = await tokenService.getValidToken(accountId);
    const agentId = this.getAgentId(siteId);

    const body: any = {
      from: { user_id: sellerId },
      to: { user_id: agentId },  // Usar agente, no el comprador real
      text: text,
    };

    if (options.attachments?.length) {
      body.attachments = options.attachments;
    }

    const response = await fetch(
      `${MELI_API_BASE}/messages/packs/${packId}/sellers/${sellerId}?tag=post_sale`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const error: MeliApiError = await response.json();
      
      // Manejar error de conversación bloqueada (48 horas)
      if (error.message?.includes('blocked_conversation')) {
        throw new Error(
          'La conversación está bloqueada. Han pasado más de 48 horas hábiles.'
        );
      }
      
      throw new Error(`Error enviando mensaje: ${error.message}`);
    }
  }

  /**
   * Sube un archivo adjunto
   * TTL: 48 horas para asociar a un mensaje
   * Formatos: JPG, PNG, PDF, TXT
   * Tamaño máximo: 25 MB
   */
  async uploadAttachment(
    accountId: string,
    file: File,
    siteId: string
  ): Promise<MeliAttachment> {
    // Validar tamaño
    const maxSize = MELI_LIMITS.ATTACHMENT_MAX_SIZE_MB * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error(
        `El archivo excede el límite de ${MELI_LIMITS.ATTACHMENT_MAX_SIZE_MB} MB`
      );
    }

    const token = await tokenService.getValidToken(accountId);
    
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(
      `${MELI_API_BASE}/messages/attachments?tag=post_sale&site_id=${siteId}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const error: MeliApiError = await response.json();
      throw new Error(`Error subiendo adjunto: ${error.message}`);
    }

    return response.json();
  }

  /**
   * Obtiene información de un adjunto
   */
  async getAttachmentInfo(
    accountId: string,
    attachmentId: string,
    siteId: string
  ): Promise<MeliAttachment> {
    const token = await tokenService.getValidToken(accountId);

    const response = await fetch(
      `${MELI_API_BASE}/messages/attachments/${attachmentId}?tag=post_sale&site_id=${siteId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const error: MeliApiError = await response.json();
      throw new Error(`Error obteniendo adjunto: ${error.message}`);
    }

    return response.json();
  }

  /**
   * Descarga un adjunto
   */
  async downloadAttachment(
    accountId: string,
    attachmentId: string,
    siteId: string
  ): Promise<Blob> {
    const token = await tokenService.getValidToken(accountId);

    const response = await fetch(
      `${MELI_API_BASE}/messages/attachments/${attachmentId}/download?tag=post_sale&site_id=${siteId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const error: MeliApiError = await response.json();
      throw new Error(`Error descargando adjunto: ${error.message}`);
    }

    return response.blob();
  }

  /**
   * Obtiene mensajes de múltiples cuentas
   * Útil para bandeja de entrada unificada
   */
  async getMessagesFromMultipleAccounts(
    accounts: Array<{ 
      id: string; 
      sellerId: string; 
      nickname: string;
      siteId: string;
    }>,
    packIds: string[]
  ): Promise<Array<{
    accountId: string;
    nickname: string;
    sellerId: string;
    siteId: string;
    messages: MeliMessage[];
    total: number;
  }>> {
    const results = await Promise.allSettled(
      accounts.map(async (account) => {
        try {
          // Obtener mensajes de cada pack
          const allMessages: MeliMessage[] = [];
          
          for (const packId of packIds) {
            try {
              const response = await this.getMessages(
                account.id,
                packId,
                account.sellerId,
                { limit: 50, markAsRead: false }
              );
              allMessages.push(...response.messages);
            } catch (err) {
              // Ignorar errores de packs que no pertenecen a esta cuenta
            }
          }

          return {
            accountId: account.id,
            nickname: account.nickname,
            sellerId: account.sellerId,
            siteId: account.siteId,
            messages: allMessages,
            total: allMessages.length,
          };
        } catch (error) {
          console.error(
            `[MessagesService] Error obteniendo mensajes para cuenta ${account.id}:`,
            error
          );
          return {
            accountId: account.id,
            nickname: account.nickname,
            sellerId: account.sellerId,
            siteId: account.siteId,
            messages: [],
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
        siteId: accounts[index].siteId,
        messages: [],
        total: 0,
      };
    });
  }
}

// Exportar singleton
export const messagesService = MessagesService.getInstance();
