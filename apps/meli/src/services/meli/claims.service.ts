import { MELI_API_BASE, CLAIM_TYPES, EVIDENCE_TYPES, SHIPPING_METHODS } from '@/lib/meli/constants';
import { tokenService } from './token.service';
import type { 
  MeliClaim,
  MeliShippingEvidence,
  MeliApiError 
} from '@/types/meli';

/**
 * Servicio de gestión de reclamos de Mercado Libre
 * Base URL: /post-purchase/v1/claims
 */
export class ClaimsService {
  private static instance: ClaimsService;

  static getInstance(): ClaimsService {
    if (!ClaimsService.instance) {
      ClaimsService.instance = new ClaimsService();
    }
    return ClaimsService.instance;
  }

  /**
   * Obtiene reclamos de un vendedor
   */
  async getClaims(
    accountId: string,
    sellerId: string,
    options: {
      status?: string;
      stage?: string;
      offset?: number;
      limit?: number;
    } = {}
  ): Promise<MeliClaim[]> {
    const token = await tokenService.getValidToken(accountId);
    
    const params = new URLSearchParams({
      resource: 'seller',
      resource_id: sellerId,
      offset: (options.offset || 0).toString(),
      limit: (options.limit || 50).toString(),
    });

    if (options.status) {
      params.append('status', options.status);
    }

    if (options.stage) {
      params.append('stage', options.stage);
    }

    const response = await fetch(
      `${MELI_API_BASE}/post-purchase/v1/claims?${params.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const error: MeliApiError = await response.json();
      throw new Error(`Error obteniendo reclamos: ${error.message}`);
    }

    return response.json();
  }

  /**
   * Obtiene un reclamo específico por ID
   */
  async getClaimById(
    accountId: string,
    claimId: string
  ): Promise<MeliClaim> {
    const token = await tokenService.getValidToken(accountId);

    const response = await fetch(
      `${MELI_API_BASE}/post-purchase/v1/claims/${claimId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const error: MeliApiError = await response.json();
      throw new Error(`Error obteniendo reclamo: ${error.message}`);
    }

    return response.json();
  }

  /**
   * Obtiene mensajes de un reclamo
   */
  async getClaimMessages(
    accountId: string,
    claimId: string
  ): Promise<any[]> {
    const token = await tokenService.getValidToken(accountId);

    const response = await fetch(
      `${MELI_API_BASE}/post-purchase/v1/claims/${claimId}/messages`,
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
   * Envía un mensaje en un reclamo
   */
  async sendClaimMessage(
    accountId: string,
    claimId: string,
    text: string,
    options: {
      attachments?: string[];
    } = {}
  ): Promise<void> {
    const token = await tokenService.getValidToken(accountId);

    const body: any = {
      text: text,
    };

    if (options.attachments?.length) {
      body.attachments = options.attachments;
    }

    const response = await fetch(
      `${MELI_API_BASE}/post-purchase/v1/claims/${claimId}/messages`,
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
      throw new Error(`Error enviando mensaje: ${error.message}`);
    }
  }

  /**
   * Obtiene evidencias de un reclamo
   */
  async getClaimEvidences(
    accountId: string,
    claimId: string
  ): Promise<any[]> {
    const token = await tokenService.getValidToken(accountId);

    const response = await fetch(
      `${MELI_API_BASE}/post-purchase/v1/claims/${claimId}/evidences`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const error: MeliApiError = await response.json();
      throw new Error(`Error obteniendo evidencias: ${error.message}`);
    }

    return response.json();
  }

  /**
   * Carga evidencia de envío
   * Tipos: shipping_evidence, handling_shipping_evidence
   */
  async uploadShippingEvidence(
    accountId: string,
    claimId: string,
    evidence: MeliShippingEvidence
  ): Promise<any> {
    const token = await tokenService.getValidToken(accountId);

    const response = await fetch(
      `${MELI_API_BASE}/post-purchase/v1/claims/${claimId}/actions/evidences`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(evidence),
      }
    );

    if (!response.ok) {
      const error: MeliApiError = await response.json();
      throw new Error(`Error cargando evidencia: ${error.message}`);
    }

    return response.json();
  }

  /**
   * Sube un archivo adjunto para evidencia
   * Formatos: JPG, PNG, PDF (máx 5 MB)
   */
  async uploadEvidenceAttachment(
    accountId: string,
    claimId: string,
    file: File
  ): Promise<{ user_id: number; file_name: string }> {
    // Validar tamaño (5 MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error('El archivo excede el límite de 5 MB');
    }

    const token = await tokenService.getValidToken(accountId);
    
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(
      `${MELI_API_BASE}/post-purchase/v1/claims/${claimId}/attachments-evidences`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-public': 'true',
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
   * Descarga un adjunto de evidencia
   */
  async downloadEvidenceAttachment(
    accountId: string,
    claimId: string,
    attachmentId: string
  ): Promise<Blob> {
    const token = await tokenService.getValidToken(accountId);

    const response = await fetch(
      `${MELI_API_BASE}/post-purchase/v1/claims/${claimId}/attachments-evidences/${attachmentId}/download`,
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
   * Obtiene información de un adjunto
   */
  async getAttachmentInfo(
    accountId: string,
    claimId: string,
    attachmentId: string
  ): Promise<any> {
    const token = await tokenService.getValidToken(accountId);

    const response = await fetch(
      `${MELI_API_BASE}/post-purchase/v1/claims/${claimId}/attachments-evidences/${attachmentId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const error: MeliApiError = await response.json();
      throw new Error(`Error obteniendo info del adjunto: ${error.message}`);
    }

    return response.json();
  }

  /**
   * Obtiene reclamos de múltiples cuentas
   * Útil para panel unificado
   */
  async getClaimsFromMultipleAccounts(
    accounts: Array<{ 
      id: string; 
      sellerId: string; 
      nickname: string;
    }>,
    options: {
      status?: string;
      stage?: string;
      limit?: number;
    } = {}
  ): Promise<Array<{
    accountId: string;
    nickname: string;
    sellerId: string;
    claims: MeliClaim[];
    total: number;
  }>> {
    const results = await Promise.allSettled(
      accounts.map(async (account) => {
        try {
          const claims = await this.getClaims(account.id, account.sellerId, {
            status: options.status,
            stage: options.stage,
            limit: options.limit || 50,
          });

          return {
            accountId: account.id,
            nickname: account.nickname,
            sellerId: account.sellerId,
            claims,
            total: claims.length,
          };
        } catch (error) {
          console.error(
            `[ClaimsService] Error obteniendo reclamos para cuenta ${account.id}:`,
            error
          );
          return {
            accountId: account.id,
            nickname: account.nickname,
            sellerId: account.sellerId,
            claims: [],
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
        claims: [],
        total: 0,
      };
    });
  }

  /**
   * Obtiene el tipo de reclamo en texto legible
   */
  getClaimTypeLabel(type: string): string {
    const typeMap: Record<string, string> = {
      [CLAIM_TYPES.CLAIM]: 'Reclamo',
      [CLAIM_TYPES.MEDIATION]: 'Mediación',
    };

    return typeMap[type] || type;
  }

  /**
   * Obtiene el estado del reclamo en texto legible
   */
  getStatusLabel(status: string): string {
    const statusMap: Record<string, string> = {
      'opened': 'Abierto',
      'closed': 'Cerrado',
      'pending': 'Pendiente',
      'resolved': 'Resuelto',
    };

    return statusMap[status] || status;
  }

  /**
   * Obtiene el método de envío en texto legible
   */
  getShippingMethodLabel(method: string): string {
    const methodMap: Record<string, string> = {
      [SHIPPING_METHODS.MAIL]: 'Correo',
      [SHIPPING_METHODS.ENTRUSTED]: 'Encomienda/Transportista',
      [SHIPPING_METHODS.PERSONAL_DELIVERY]: 'Entrega en mano',
      [SHIPPING_METHODS.EMAIL]: 'Envío digital',
    };

    return methodMap[method] || method;
  }

  /**
   * Crea evidencia de envío por correo
   */
  createMailEvidence(
    shippingCompanyName: string,
    dateShipped: string,
    trackingNumber?: string,
    attachments: string[] = []
  ): MeliShippingEvidence {
    return {
      type: EVIDENCE_TYPES.SHIPPING_EVIDENCE,
      shipping_method: SHIPPING_METHODS.MAIL,
      shipping_company_name: shippingCompanyName,
      date_shipped: dateShipped,
      tracking_number: trackingNumber,
      attachments,
    };
  }

  /**
   * Crea evidencia de envío por encomienda
   */
  createEntrustedEvidence(
    shippingCompanyName: string,
    destinationAgency: string,
    dateShipped: string,
    receiverName: string,
    options: {
      receiverId?: string;
      trackingNumber?: string;
      attachments?: string[];
    } = {}
  ): MeliShippingEvidence {
    return {
      type: EVIDENCE_TYPES.SHIPPING_EVIDENCE,
      shipping_method: SHIPPING_METHODS.ENTRUSTED,
      shipping_company_name: shippingCompanyName,
      destination_agency: destinationAgency,
      date_shipped: dateShipped,
      receiver_name: receiverName,
      receiver_id: options.receiverId,
      tracking_number: options.trackingNumber,
      attachments: options.attachments || [],
    };
  }

  /**
   * Crea evidencia de promesa de envío
   */
  createHandlingEvidence(handlingDate: string): MeliShippingEvidence {
    return {
      type: EVIDENCE_TYPES.HANDLING_SHIPPING_EVIDENCE,
      shipping_method: SHIPPING_METHODS.MAIL,
      handling_date: handlingDate,
      attachments: [],
    };
  }
}

// Exportar singleton
export const claimsService = ClaimsService.getInstance();
