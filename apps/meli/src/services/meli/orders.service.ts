import { MELI_API_BASE, ORDER_STATUSES } from '@/lib/meli/constants';
import { tokenService } from './token.service';
import type { 
  MeliOrder, 
  MeliOrdersSearchResponse,
  MeliApiError 
} from '@/types/meli';

/**
 * Servicio de gestión de órdenes/ventas de Mercado Libre
 */
export class OrdersService {
  private static instance: OrdersService;

  static getInstance(): OrdersService {
    if (!OrdersService.instance) {
      OrdersService.instance = new OrdersService();
    }
    return OrdersService.instance;
  }

  /**
   * Obtiene una orden específica por ID
   * Incluye: items, pagos, envío, feedback, descuentos
   */
  async getOrder(
    accountId: string,
    orderId: string
  ): Promise<MeliOrder> {
    const token = await tokenService.getValidToken(accountId);

    const response = await fetch(
      `${MELI_API_BASE}/orders/${orderId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const error: MeliApiError = await response.json();
      throw new Error(`Error obteniendo orden: ${error.message}`);
    }

    return response.json();
  }

  /**
   * Busca órdenes de un vendedor con filtros
   */
  async searchOrders(
    accountId: string,
    sellerId: string,
    filters: {
      status?: string[];
      dateCreatedFrom?: string;
      dateCreatedTo?: string;
      dateUpdatedFrom?: string;
      dateUpdatedTo?: string;
      q?: string;  // Búsqueda por ID, título, nickname
      tags?: string[];
      sort?: 'date_desc' | 'date_asc';
      offset?: number;
      limit?: number;
    } = {}
  ): Promise<MeliOrdersSearchResponse> {
    const token = await tokenService.getValidToken(accountId);
    
    const params = new URLSearchParams({
      seller: sellerId,
    });

    if (filters.status?.length) {
      params.append('order.status', filters.status.join(','));
    }

    if (filters.dateCreatedFrom) {
      params.append('order.date_created.from', filters.dateCreatedFrom);
    }

    if (filters.dateCreatedTo) {
      params.append('order.date_created.to', filters.dateCreatedTo);
    }

    if (filters.dateUpdatedFrom) {
      params.append('order.date_last_updated.from', filters.dateUpdatedFrom);
    }

    if (filters.dateUpdatedTo) {
      params.append('order.date_last_updated.to', filters.dateUpdatedTo);
    }

    if (filters.q) {
      params.append('q', filters.q);
    }

    if (filters.tags?.length) {
      params.append('tags', filters.tags.join(','));
    }

    if (filters.sort) {
      params.append('sort', filters.sort);
    }

    if (filters.offset !== undefined) {
      params.append('offset', filters.offset.toString());
    }

    if (filters.limit) {
      params.append('limit', filters.limit.toString());
    }

    const response = await fetch(
      `${MELI_API_BASE}/orders/search?${params.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const error: MeliApiError = await response.json();
      throw new Error(`Error buscando órdenes: ${error.message}`);
    }

    return response.json();
  }

  /**
   * Obtiene órdenes pagadas de un vendedor
   */
  async getPaidOrders(
    accountId: string,
    sellerId: string,
    options: {
      limit?: number;
      offset?: number;
      sort?: 'date_desc' | 'date_asc';
    } = {}
  ): Promise<MeliOrdersSearchResponse> {
    return this.searchOrders(accountId, sellerId, {
      status: [ORDER_STATUSES.PAID],
      limit: options.limit || 50,
      offset: options.offset || 0,
      sort: options.sort || 'date_desc',
    });
  }

  /**
   * Obtiene órdenes pendientes de un vendedor
   */
  async getPendingOrders(
    accountId: string,
    sellerId: string,
    options: {
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<MeliOrdersSearchResponse> {
    return this.searchOrders(accountId, sellerId, {
      status: [
        ORDER_STATUSES.CONFIRMED,
        ORDER_STATUSES.PAYMENT_REQUIRED,
        ORDER_STATUSES.PAYMENT_IN_PROCESS,
      ],
      limit: options.limit || 50,
      offset: options.offset || 0,
    });
  }

  /**
   * Obtiene descuentos aplicados en una orden
   */
  async getOrderDiscounts(
    accountId: string,
    orderId: string
  ): Promise<any> {
    const token = await tokenService.getValidToken(accountId);

    const response = await fetch(
      `${MELI_API_BASE}/orders/${orderId}/discounts`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const error: MeliApiError = await response.json();
      throw new Error(`Error obteniendo descuentos: ${error.message}`);
    }

    return response.json();
  }

  /**
   * Obtiene información del producto en una orden
   */
  async getOrderProductInfo(
    accountId: string,
    orderId: string
  ): Promise<any> {
    const token = await tokenService.getValidToken(accountId);

    const response = await fetch(
      `${MELI_API_BASE}/orders/${orderId}/product`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const error: MeliApiError = await response.json();
      throw new Error(`Error obteniendo info del producto: ${error.message}`);
    }

    return response.json();
  }

  /**
   * Verifica si una orden tiene alerta de fraude
   */
  hasFraudRisk(order: MeliOrder): boolean {
    return order.tags?.includes('fraud_risk_detected') || false;
  }

  /**
   * Calcula el monto total con envío
   * Formula: total_amount + taxes.amount + lead_time.cost
   */
  calculateTotalWithShipping(order: MeliOrder, shippingCost: number): number {
    const taxes = order.taxes?.amount || 0;
    return order.total_amount + taxes + shippingCost;
  }

  /**
   * Obtiene órdenes de múltiples cuentas
   * Útil para dashboard unificado
   */
  async getOrdersFromMultipleAccounts(
    accounts: Array<{ 
      id: string; 
      sellerId: string; 
      nickname: string;
    }>,
    filters: {
      status?: string[];
      dateFrom?: string;
      dateTo?: string;
      limit?: number;
    } = {}
  ): Promise<Array<{
    accountId: string;
    nickname: string;
    sellerId: string;
    orders: MeliOrder[];
    total: number;
    hasFraudAlerts: boolean;
  }>> {
    const results = await Promise.allSettled(
      accounts.map(async (account) => {
        try {
          const response = await this.searchOrders(
            account.id,
            account.sellerId,
            {
              status: filters.status,
              dateCreatedFrom: filters.dateFrom,
              dateCreatedTo: filters.dateTo,
              limit: filters.limit || 50,
              sort: 'date_desc',
            }
          );

          const hasFraudAlerts = response.results.some(order => 
            this.hasFraudRisk(order)
          );

          return {
            accountId: account.id,
            nickname: account.nickname,
            sellerId: account.sellerId,
            orders: response.results,
            total: response.paging?.total || response.results.length,
            hasFraudAlerts,
          };
        } catch (error) {
          console.error(
            `[OrdersService] Error obteniendo órdenes para cuenta ${account.id}:`,
            error
          );
          return {
            accountId: account.id,
            nickname: account.nickname,
            sellerId: account.sellerId,
            orders: [],
            total: 0,
            hasFraudAlerts: false,
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
        orders: [],
        total: 0,
        hasFraudAlerts: false,
      };
    });
  }

  /**
   * Obtiene estadísticas de ventas de múltiples cuentas
   */
  async getSalesStats(
    accounts: Array<{ id: string; sellerId: string }>,
    dateFrom: string,
    dateTo: string
  ): Promise<{
    totalSales: number;
    totalAmount: number;
    averageTicket: number;
    byAccount: Record<string, { sales: number; amount: number }>;
  }> {
    const results = await Promise.allSettled(
      accounts.map(async (account) => {
        try {
          const response = await this.searchOrders(
            account.id,
            account.sellerId,
            {
              status: [ORDER_STATUSES.PAID],
              dateCreatedFrom: dateFrom,
              dateCreatedTo: dateTo,
              limit: 100,
            }
          );

          const totalAmount = response.results.reduce(
            (sum, order) => sum + order.total_amount,
            0
          );

          return {
            accountId: account.id,
            sales: response.results.length,
            amount: totalAmount,
          };
        } catch (error) {
          return {
            accountId: account.id,
            sales: 0,
            amount: 0,
          };
        }
      })
    );

    const byAccount: Record<string, { sales: number; amount: number }> = {};
    let totalSales = 0;
    let totalAmount = 0;

    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        byAccount[result.value.accountId] = {
          sales: result.value.sales,
          amount: result.value.amount,
        };
        totalSales += result.value.sales;
        totalAmount += result.value.amount;
      }
    });

    return {
      totalSales,
      totalAmount,
      averageTicket: totalSales > 0 ? totalAmount / totalSales : 0,
      byAccount,
    };
  }
}

// Exportar singleton
export const ordersService = OrdersService.getInstance();
