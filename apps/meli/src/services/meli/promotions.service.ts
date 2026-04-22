import { MELI_API_BASE } from '@/lib/meli/constants';
import { tokenService } from './token.service';
import type { MeliApiError } from '@/types/meli';

/**
 * Servicio de gestión de promociones de Mercado Libre
 * API: /seller-promotions
 */
export class PromotionsService {
  private static instance: PromotionsService;

  static getInstance(): PromotionsService {
    if (!PromotionsService.instance) {
      PromotionsService.instance = new PromotionsService();
    }
    return PromotionsService.instance;
  }

  /**
   * Obtiene todas las promociones de un vendedor
   */
  async getPromotions(
    accountId: string,
    userId: string
  ): Promise<any[]> {
    const token = await tokenService.getValidToken(accountId);

    const response = await fetch(
      `${MELI_API_BASE}/seller-promotions/users/${userId}?app_version=v2`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const error: MeliApiError = await response.json();
      throw new Error(`Error obteniendo promociones: ${error.message}`);
    }

    const data = await response.json();
    return data.results || [];
  }

  /**
   * Obtiene candidatos a promociones
   */
  async getPromotionCandidates(
    accountId: string,
    candidateId: string
  ): Promise<any> {
    const token = await tokenService.getValidToken(accountId);

    const response = await fetch(
      `${MELI_API_BASE}/seller-promotions/candidates/${candidateId}?app_version=v2`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const error: MeliApiError = await response.json();
      throw new Error(`Error obteniendo candidato: ${error.message}`);
    }

    return response.json();
  }

  /**
   * Obtiene ofertas de una promoción
   */
  async getPromotionOffers(
    accountId: string,
    offerId: string
  ): Promise<any> {
    const token = await tokenService.getValidToken(accountId);

    const response = await fetch(
      `${MELI_API_BASE}/seller-promotions/offers/${offerId}?app_version=v2`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const error: MeliApiError = await response.json();
      throw new Error(`Error obteniendo oferta: ${error.message}`);
    }

    return response.json();
  }

  /**
   * Obtiene ítems de una promoción
   */
  async getPromotionItems(
    accountId: string,
    promotionId: string,
    promotionType: string,
    filters?: {
      status?: string;
      status_item?: string;
      item_id?: string;
    }
  ): Promise<any> {
    const token = await tokenService.getValidToken(accountId);
    
    const params = new URLSearchParams({
      promotion_type: promotionType,
      app_version: 'v2',
    });

    if (filters?.status) params.append('status', filters.status);
    if (filters?.status_item) params.append('status_item', filters.status_item);
    if (filters?.item_id) params.append('item_id', filters.item_id);

    const response = await fetch(
      `${MELI_API_BASE}/seller-promotions/promotions/${promotionId}/items?${params.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const error: MeliApiError = await response.json();
      throw new Error(`Error obteniendo ítems: ${error.message}`);
    }

    return response.json();
  }

  /**
   * Obtiene promociones de un ítem específico
   */
  async getItemPromotions(
    accountId: string,
    itemId: string
  ): Promise<any[]> {
    const token = await tokenService.getValidToken(accountId);

    const response = await fetch(
      `${MELI_API_BASE}/seller-promotions/items/${itemId}?app_version=v2`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const error: MeliApiError = await response.json();
      throw new Error(`Error obteniendo promociones del ítem: ${error.message}`);
    }

    return response.json();
  }

  /**
   * Elimina ofertas masivamente de un ítem
   */
  async deleteItemOffers(
    accountId: string,
    itemId: string
  ): Promise<any> {
    const token = await tokenService.getValidToken(accountId);

    const response = await fetch(
      `${MELI_API_BASE}/seller-promotions/items/${itemId}?app_version=v2`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const error: MeliApiError = await response.json();
      throw new Error(`Error eliminando ofertas: ${error.message}`);
    }

    return response.json();
  }

  /**
   * Obtiene promociones de múltiples cuentas
   */
  async getPromotionsFromMultipleAccounts(
    accounts: Array<{ id: string; userId: string; nickname: string }>
  ): Promise<Array<{
    accountId: string;
    nickname: string;
    promotions: any[];
    total: number;
  }>> {
    const results = await Promise.allSettled(
      accounts.map(async (account) => {
        try {
          const promotions = await this.getPromotions(account.id, account.userId);
          return {
            accountId: account.id,
            nickname: account.nickname,
            promotions,
            total: promotions.length,
          };
        } catch (error) {
          console.error(
            `[PromotionsService] Error obteniendo promociones para ${account.nickname}:`,
            error
          );
          return {
            accountId: account.id,
            nickname: account.nickname,
            promotions: [],
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
        promotions: [],
        total: 0,
      };
    });
  }

  /**
   * Obtiene el tipo de promoción en texto legible
   */
  getPromotionTypeLabel(type: string): string {
    const typeMap: Record<string, string> = {
      'DEAL': 'Campaña Tradicional',
      'MARKETPLACE_CAMPAIGN': 'Campaña Co-fondeada',
      'DOD': 'Oferta del Día',
      'LIGHTNING': 'Oferta Relámpago',
      'VOLUME': 'Descuento por Volumen',
      'PRICE_DISCOUNT': 'Descuento Individual',
      'PRE_NEGOTIATED': 'Descuento Pre-acordado',
      'SELLER_CAMPAIGN': 'Campaña del Vendedor',
      'SMART': 'Campaña Smart',
      'PRICE_MATCHING': 'Precios Competitivos',
      'UNHEALTHY_STOCK': 'Liquidación Stock Full',
      'SELLER_COUPON_CAMPAIGN': 'Cupones del Vendedor',
    };

    return typeMap[type] || type;
  }

  /**
   * Obtiene el estado de promoción en texto legible
   */
  getPromotionStatusLabel(status: string): string {
    const statusMap: Record<string, string> = {
      'started': 'Activa',
      'pending': 'Pendiente',
      'candidate': 'Candidata',
      'finished': 'Finalizada',
      'cancelled': 'Cancelada',
      'programmed': 'Programada',
      'active': 'Activa',
      'inactive': 'Inactiva',
    };

    return statusMap[status] || status;
  }
}

// Exportar singleton
export const promotionsService = PromotionsService.getInstance();
