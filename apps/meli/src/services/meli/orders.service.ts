import { MELI_API_BASE } from '@/lib/meli/constants';
import { tokenService } from './token.service';
import type { MeliOrder, MeliApiError } from '@/types/meli';

/**
 * Servicio de gestión de órdenes de Mercado Libre
 * API: /orders
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
   * Obtiene órdenes de un vendedor
   */
  async getOrders(
    accountId: string,
    sellerId: string,
    options: {
      status?: string;
      dateFrom?: string;
      dateTo?: string;
      offset?: number;
      limit?: number;
    } = {}
  ): Promise<MeliOrder[]> {
    const token = await tokenService.getValidToken(accountId);
    
    const params = new URLSearchParams({
      seller: sellerId,
      offset: (options.offset || 0).toString(),
      limit: (options.limit || 50).toString(),
    });

    if (options.status) {
      params.append('order.status', options.status);
    }

    if (options.dateFrom) {
      params.append('order.date_created.from', options.dateFrom);
    }

    if (options.dateTo) {
      params.append('order.date_created.to', options.dateTo);
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
      throw new Error(`Error obteniendo órdenes: ${error.message}`);
    }

    const data = await response.json();
    return data.results || [];
  }

  /**
   * Obtiene una orden específica por ID
   */
  async getOrderById(
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
   * Obtiene órdenes recientes (últimos 7 días)
   */
  async getRecentOrders(
    accountId: string,
    sellerId: string,
    options: {
      days?: number;
      limit?: number;
    } = {}
  ): Promise<MeliOrder[]> {
    const days = options.days || 7;
    const now = new Date();
    const fromDate = new Date(now);
    fromDate.setDate(fromDate.getDate() - days);

    return this.getOrders(accountId, sellerId, {
      dateFrom: fromDate.toISOString(),
      dateTo: now.toISOString(),
      limit: options.limit || 50,
    });
  }

  /**
   * Obtiene órdenes pendientes de envío
   */
  async getPendingOrders(
    accountId: string,
    sellerId: string,
    options: {
      limit?: number;
    } = {}
  ): Promise<MeliOrder[]> {
    return this.getOrders(accountId, sellerId, {
      status: 'paid',
      limit: options.limit || 50,
    });
  }

  /**
   * Obtiene órdenes enviadas
   */
  async getShippedOrders(
    accountId: string,
    sellerId: string,
    options: {
      limit?: number;
    } = {}
  ): Promise<MeliOrder[]> {
    return this.getOrders(accountId, sellerId, {
      status: 'shipped',
      limit: options.limit || 50,
    });
  }

  /**
   * Obtiene órdenes entregadas
   */
  async getDeliveredOrders(
    accountId: string,
    sellerId: string,
    options: {
      limit?: number;
    } = {}
  ): Promise<MeliOrder[]> {
    return this.getOrders(accountId, sellerId, {
      status: 'delivered',
      limit: options.limit || 50,
    });
  }

  /**
   * Obtiene órdenes de múltiples cuentas
   */
  async getOrdersFromMultipleAccounts(
    accounts: Array<{ 
      id: string; 
      sellerId: string; 
      nickname: string;
    }>,
    options: {
      status?: string;
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
  }>> {
    const results = await Promise.allSettled(
      accounts.map(async (account) => {
        try {
          const orders = await this.getOrders(account.id, account.sellerId, {
            status: options.status,
            dateFrom: options.dateFrom,
            dateTo: options.dateTo,
            limit: options.limit || 50,
          });

          return {
            accountId: account.id,
            nickname: account.nickname,
            sellerId: account.sellerId,
            orders,
            total: orders.length,
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
      };
    });
  }

  /**
   * Obtiene estadísticas de ventas de múltiples cuentas
   */
  async getSalesStats(
    accounts: Array<{ 
      id: string; 
      sellerId: string; 
      nickname: string;
    }>,
    dateFrom?: string,
    dateTo?: string
  ): Promise<{
    totalSales: number;
    totalAmount: number;
    averageTicket: number;
    byAccount: Record<string, { sales: number; amount: number }>;
  }> {
    // Obtener órdenes de todas las cuentas
    const results = await this.getOrdersFromMultipleAccounts(accounts, {
      dateFrom,
      dateTo,
      limit: 200,
    });

    // Calcular totales
    let totalAmount = 0;
    let totalSales = 0;
    const byAccount: Record<string, { sales: number; amount: number }> = {};

    for (const result of results) {
      let accountAmount = 0;
      let accountSales = 0;
      
      for (const order of result.orders) {
        if (order.status === 'paid' || order.status === 'shipped' || order.status === 'delivered') {
          totalAmount += order.total_amount || 0;
          accountAmount += order.total_amount || 0;
          totalSales++;
          accountSales++;
        }
      }

      byAccount[result.nickname] = {
        sales: accountSales,
        amount: accountAmount,
      };
    }

    return {
      totalSales,
      totalAmount,
      averageTicket: totalSales > 0 ? totalAmount / totalSales : 0,
      byAccount,
    };
  }

  /**
   * Calcula estadísticas de órdenes
   */
  calculateOrderStats(orders: MeliOrder[]): {
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    ordersByStatus: Record<string, number>;
  } {
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => {
      return sum + (order.total_amount || 0);
    }, 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const ordersByStatus: Record<string, number> = {};
    orders.forEach((order) => {
      const status = order.status || 'unknown';
      ordersByStatus[status] = (ordersByStatus[status] || 0) + 1;
    });

    return {
      totalOrders,
      totalRevenue,
      averageOrderValue,
      ordersByStatus,
    };
  }

  /**
   * Obtiene el estado de la orden en texto legible
   */
  getStatusLabel(status: string): string {
    const statusMap: Record<string, string> = {
      'confirmed': 'Confirmada',
      'payment_required': 'Pago requerido',
      'payment_in_process': 'Pago en proceso',
      'partially_paid': 'Parcialmente pagada',
      'paid': 'Pagada',
      'cancelled': 'Cancelada',
      'invalid': 'Inválida',
      'shipped': 'Enviada',
      'delivered': 'Entregada',
    };

    return statusMap[status] || status;
  }

  /**
   * Obtiene el color del estado
   */
  getStatusColor(status: string): string {
    const colorMap: Record<string, string> = {
      'confirmed': 'bg-blue-500',
      'paid': 'bg-green-500',
      'shipped': 'bg-purple-500',
      'delivered': 'bg-emerald-500',
      'cancelled': 'bg-red-500',
      'payment_required': 'bg-orange-500',
      'payment_in_process': 'bg-yellow-500',
    };

    return colorMap[status] || 'bg-gray-500';
  }

  /**
   * Formatea la fecha de creación
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  /**
   * Obtiene el nombre del comprador
   */
  getBuyerName(order: MeliOrder): string {
    if (order.buyer?.nickname) {
      return order.buyer.nickname;
    }
    if (order.buyer?.first_name && order.buyer?.last_name) {
      return `${order.buyer.first_name} ${order.buyer.last_name}`;
    }
    return 'Comprador desconocido';
  }

  /**
   * Obtiene el título del producto principal
   */
  getMainItemTitle(order: MeliOrder): string {
    if (order.order_items?.length > 0) {
      return order.order_items[0].item?.title || 'Producto sin título';
    }
    return 'Sin productos';
  }

  /**
   * Obtiene la imagen del producto principal
   */
  getMainItemImage(order: MeliOrder): string | null {
    if (order.order_items?.length > 0) {
      return order.order_items[0].item?.thumbnail || null;
    }
    return null;
  }

  /**
   * Obtiene la cantidad total de items
   */
  getTotalItems(order: MeliOrder): number {
    return order.order_items?.reduce((sum, item) => {
      return sum + (item.quantity || 0);
    }, 0) || 0;
  }
}

// Exportar singleton
export const ordersService = OrdersService.getInstance();
