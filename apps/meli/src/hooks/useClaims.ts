import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { claimsService } from '@/services/meli/claims.service';
import type { MeliClaim, MeliShippingEvidence } from '@/types/meli';

const CLAIMS_QUERY_KEY = 'meli-claims';

// ============================================
// QUERIES
// ============================================

/**
 * Hook para obtener reclamos de un vendedor
 */
export function useClaims(
  accountId: string | null,
  sellerId: string | null,
  options: {
    status?: string;
    stage?: string;
    offset?: number;
    limit?: number;
    enabled?: boolean;
  } = {}
) {
  return useQuery({
    queryKey: [
      CLAIMS_QUERY_KEY,
      accountId,
      sellerId,
      options.status,
      options.stage,
      options.offset,
      options.limit,
    ],
    queryFn: async () => {
      if (!accountId || !sellerId) {
        throw new Error('Se requiere accountId y sellerId');
      }
      return claimsService.getClaims(accountId, sellerId, options);
    },
    enabled: !!accountId && !!sellerId && options.enabled !== false,
    staleTime: 2 * 60 * 1000, // 2 minutos - reclamos cambian frecuentemente
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para obtener un reclamo específico
 */
export function useClaim(
  accountId: string | null,
  claimId: string | null
) {
  return useQuery({
    queryKey: [CLAIMS_QUERY_KEY, 'detail', accountId, claimId],
    queryFn: async () => {
      if (!accountId || !claimId) {
        throw new Error('Se requiere accountId y claimId');
      }
      return claimsService.getClaimById(accountId, claimId);
    },
    enabled: !!accountId && !!claimId,
    staleTime: 1 * 60 * 1000, // 1 minuto
  });
}

/**
 * Hook para obtener mensajes de un reclamo
 */
export function useClaimMessages(
  accountId: string | null,
  claimId: string | null
) {
  return useQuery({
    queryKey: [CLAIMS_QUERY_KEY, 'messages', accountId, claimId],
    queryFn: async () => {
      if (!accountId || !claimId) {
        throw new Error('Se requiere accountId y claimId');
      }
      return claimsService.getClaimMessages(accountId, claimId);
    },
    enabled: !!accountId && !!claimId,
    staleTime: 30 * 1000, // 30 segundos
  });
}

/**
 * Hook para obtener evidencias de un reclamo
 */
export function useClaimEvidences(
  accountId: string | null,
  claimId: string | null
) {
  return useQuery({
    queryKey: [CLAIMS_QUERY_KEY, 'evidences', accountId, claimId],
    queryFn: async () => {
      if (!accountId || !claimId) {
        throw new Error('Se requiere accountId y claimId');
      }
      return claimsService.getClaimEvidences(accountId, claimId);
    },
    enabled: !!accountId && !!claimId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook para obtener reclamos de múltiples cuentas
 */
export function useClaimsFromMultipleAccounts(
  accounts: Array<{
    id: string;
    sellerId: string;
    nickname: string;
  }> | null,
  options: {
    status?: string;
    stage?: string;
    limit?: number;
    enabled?: boolean;
  } = {}
) {
  return useQuery({
    queryKey: [
      CLAIMS_QUERY_KEY,
      'multi-account',
      accounts?.map(a => a.id).join(','),
      options.status,
      options.stage,
    ],
    queryFn: async () => {
      if (!accounts || accounts.length === 0) {
        return [];
      }
      return claimsService.getClaimsFromMultipleAccounts(accounts, options);
    },
    enabled: !!accounts && accounts.length > 0 && options.enabled !== false,
    staleTime: 2 * 60 * 1000,
  });
}

// ============================================
// MUTATIONS
// ============================================

/**
 * Hook para enviar mensaje en un reclamo
 */
export function useSendClaimMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      accountId,
      claimId,
      text,
      attachments,
    }: {
      accountId: string;
      claimId: string;
      text: string;
      attachments?: string[];
    }) => {
      return claimsService.sendClaimMessage(accountId, claimId, text, {
        attachments,
      });
    },
    onSuccess: (_, variables) => {
      // Invalidar mensajes del reclamo
      queryClient.invalidateQueries({
        queryKey: [CLAIMS_QUERY_KEY, 'messages', variables.accountId, variables.claimId],
      });
      // Invalidar detalle del reclamo
      queryClient.invalidateQueries({
        queryKey: [CLAIMS_QUERY_KEY, 'detail', variables.accountId, variables.claimId],
      });
    },
  });
}

/**
 * Hook para cargar evidencia de envío
 */
export function useUploadShippingEvidence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      accountId,
      claimId,
      evidence,
    }: {
      accountId: string;
      claimId: string;
      evidence: MeliShippingEvidence;
    }) => {
      return claimsService.uploadShippingEvidence(accountId, claimId, evidence);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [CLAIMS_QUERY_KEY, 'evidences', variables.accountId, variables.claimId],
      });
      queryClient.invalidateQueries({
        queryKey: [CLAIMS_QUERY_KEY, 'detail', variables.accountId, variables.claimId],
      });
    },
  });
}

/**
 * Hook para subir adjunto de evidencia
 */
export function useUploadEvidenceAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      accountId,
      claimId,
      file,
    }: {
      accountId: string;
      claimId: string;
      file: File;
    }) => {
      return claimsService.uploadEvidenceAttachment(accountId, claimId, file);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [CLAIMS_QUERY_KEY, 'evidences', variables.accountId, variables.claimId],
      });
    },
  });
}

// ============================================
// HELPERS
// ============================================

/**
 * Obtiene el color del estado del reclamo
 */
export function getClaimStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    'opened': 'bg-yellow-500',
    'closed': 'bg-green-500',
    'pending': 'bg-orange-500',
    'resolved': 'bg-blue-500',
  };

  return colorMap[status] || 'bg-gray-500';
}

/**
 * Obtiene el icono del tipo de reclamo
 */
export function getClaimTypeIcon(type: string): string {
  const iconMap: Record<string, string> = {
    'claim': 'AlertTriangle',
    'mediation': 'Scale',
  };

  return iconMap[type] || 'FileText';
}

/**
 * Obtiene el color del tipo de reclamo
 */
export function getClaimTypeColor(type: string): string {
  const colorMap: Record<string, string> = {
    'claim': 'text-red-500',
    'mediation': 'text-orange-500',
  };

  return colorMap[type] || 'text-gray-500';
}
