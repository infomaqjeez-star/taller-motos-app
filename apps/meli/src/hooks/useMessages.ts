import { useState, useCallback, useEffect } from 'react';
import { messagesService } from '@/services/meli';
import type { MeliMessage, MeliAttachment } from '@/types/meli';

interface UseMessagesOptions {
  accountId: string;
  packId: string;
  sellerId: string;
  siteId: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseMessagesReturn {
  messages: MeliMessage[];
  loading: boolean;
  error: string | null;
  conversationStatus: any | null;
  sendMessage: (text: string, attachments?: string[]) => Promise<void>;
  uploadAttachment: (file: File) => Promise<MeliAttachment>;
  refresh: () => Promise<void>;
}

/**
 * Hook para gestionar mensajes de una orden/pack
 * Implementa nueva arquitectura 2026 con IDs de agentes
 */
export function useMessages({
  accountId,
  packId,
  sellerId,
  siteId,
  autoRefresh = false,
  refreshInterval = 30000,
}: UseMessagesOptions): UseMessagesReturn {
  const [messages, setMessages] = useState<MeliMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationStatus, setConversationStatus] = useState<any | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!accountId || !packId || !sellerId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await messagesService.getMessages(accountId, packId, sellerId, {
        limit: 50,
        markAsRead: false, // No marcar como leídos al consultar
      });

      setMessages(data.messages);
      setConversationStatus(data.conversation_status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [accountId, packId, sellerId]);

  const sendMessage = useCallback(async (text: string, attachments?: string[]) => {
    if (!accountId || !packId || !sellerId || !siteId) {
      throw new Error('Faltan datos necesarios');
    }
    
    await messagesService.sendMessage(
      accountId,
      packId,
      sellerId,
      text,
      siteId,
      { attachments }
    );
    
    // Refrescar mensajes después de enviar
    await fetchMessages();
  }, [accountId, packId, sellerId, siteId, fetchMessages]);

  const uploadAttachment = useCallback(async (file: File) => {
    if (!accountId || !siteId) {
      throw new Error('Faltan datos necesarios');
    }
    
    return await messagesService.uploadAttachment(accountId, file, siteId);
  }, [accountId, siteId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(fetchMessages, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchMessages]);

  return {
    messages,
    loading,
    error,
    conversationStatus,
    sendMessage,
    uploadAttachment,
    refresh: fetchMessages,
  };
}
