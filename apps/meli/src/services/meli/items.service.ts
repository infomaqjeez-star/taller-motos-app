import { MELI_API_BASE } from '@/lib/meli/constants';
import { tokenService } from './token.service';
import type { MeliApiError } from '@/types/meli';

/**
 * Interfaz de Item/Publicación de Mercado Libre
 */
export interface MeliItem {
  id: string;
  site_id: string;
  title: string;
  subtitle: string | null;
  seller_id: number;
  category_id: string;
  official_store_id: number | null;
  price: number;
  base_price: number;
  original_price: number | null;
  currency_id: string;
  initial_quantity: number;
  available_quantity: number;
  sold_quantity: number;
  sale_terms: any[];
  buying_mode: string;
  listing_type_id: string;
  start_time: string;
  stop_time: string;
  condition: 'new' | 'used' | 'not_specified';
  permalink: string;
  thumbnail: string;
  secure_thumbnail: string;
  pictures: MeliPicture[];
  video_id: string | null;
  descriptions: any[];
  accepts_mercadopago: boolean;
  non_mercado_pago_payment_methods: any[];
  shipping: {
    mode: string;
    free_methods: any[];
    tags: string[];
    dimensions: string | null;
    local_pick_up: boolean;
    free_shipping: boolean;
    logistic_type: string;
    store_pick_up: boolean;
  };
  international_delivery_mode: string;
  seller_address: {
    city: {
      name: string;
    };
    state: {
      id: string;
      name: string;
    };
    country: {
      id: string;
      name: string;
    };
    search_location: {
      neighborhood: {
        id: string;
        name: string;
      };
      city: {
        id: string;
        name: string;
      };
      state: {
        id: string;
        name: string;
      };
    };
    id: number;
  };
  seller_contact: any | null;
  location: any;
  coverage_areas: any[];
  attributes: MeliAttribute[];
  warnings: any[];
  listing_source: string;
  variations: any[];
  status: 'active' | 'paused' | 'closed' | 'under_review' | 'inactive' | 'payment_required';
  sub_status: any[];
  tags: string[];
  warranty: string | null;
  catalog_product_id: string | null;
  domain_id: string;
  parent_item_id: string | null;
  differential_pricing: any | null;
  deal_ids: string[];
  automatic_relist: boolean;
  date_created: string;
  last_updated: string;
  health: number | null;
  catalog_listing: boolean;
  channels: string[];
}

export interface MeliPicture {
  id: string;
  url: string;
  secure_url: string;
  size: string;
  max_size: string;
  quality: string;
}

export interface MeliAttribute {
  id: string;
  name: string;
  value_id: string | null;
  value_name: string | null;
  value_struct: {
    number: number;
    unit: string;
  } | null;
  values: Array<{
    id: string | null;
    name: string;
    struct: {
      number: number;
      unit: string;
    } | null;
  }>;
  attribute_group_id: string;
  attribute_group_name: string;
}

export interface MeliItemsSearchResponse {
  seller_id: string;
  query: string;
  paging: {
    total: number;
    offset: number;
    limit: number;
  };
  results: MeliItem[];
  orders: any[];
  available_orders: any[];
}

/**
 * Servicio de gestión de items/publicaciones de Mercado Libre
 * API: /items
 */
export class ItemsService {
  private static instance: ItemsService;

  static getInstance(): ItemsService {
    if (!ItemsService.instance) {
      ItemsService.instance = new ItemsService();
    }
    return ItemsService.instance;
  }

  /**
   * Obtiene items de un vendedor
   */
  async getItems(
    accountId: string,
    sellerId: string,
    options: {
      status?: string;
      offset?: number;
      limit?: number;
    } = {}
  ): Promise<MeliItemsSearchResponse> {
    const token = await tokenService.getValidToken(accountId);
    
    const params = new URLSearchParams({
      seller_id: sellerId,
      offset: (options.offset || 0).toString(),
      limit: (options.limit || 50).toString(),
    });

    if (options.status) {
      params.append('status', options.status);
    }

    const response = await fetch(
      `${MELI_API_BASE}/users/${sellerId}/items/search?${params.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const error: MeliApiError = await response.json();
      throw new Error(`Error obteniendo items: ${error.message}`);
    }

    return response.json();
  }

  /**
   * Obtiene un item específico por ID
   */
  async getItemById(
    accountId: string,
    itemId: string
  ): Promise<MeliItem> {
    const token = await tokenService.getValidToken(accountId);

    const response = await fetch(
      `${MELI_API_BASE}/items/${itemId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const error: MeliApiError = await response.json();
      throw new Error(`Error obteniendo item: ${error.message}`);
    }

    return response.json();
  }

  /**
   * Obtiene múltiples items por sus IDs
   */
  async getMultipleItems(
    accountId: string,
    itemIds: string[]
  ): Promise<MeliItem[]> {
    const token = await tokenService.getValidToken(accountId);

    const ids = itemIds.join(',');

    const response = await fetch(
      `${MELI_API_BASE}/items?ids=${ids}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const error: MeliApiError = await response.json();
      throw new Error(`Error obteniendo items: ${error.message}`);
    }

    const data = await response.json();
    return data.map((item: any) => item.body);
  }

  /**
   * Obtiene items activos de un vendedor
   */
  async getActiveItems(
    accountId: string,
    sellerId: string,
    options: {
      offset?: number;
      limit?: number;
    } = {}
  ): Promise<MeliItemsSearchResponse> {
    return this.getItems(accountId, sellerId, {
      ...options,
      status: 'active',
    });
  }

  /**
   * Obtiene items pausados de un vendedor
   */
  async getPausedItems(
    accountId: string,
    sellerId: string,
    options: {
      offset?: number;
      limit?: number;
    } = {}
  ): Promise<MeliItemsSearchResponse> {
    return this.getItems(accountId, sellerId, {
      ...options,
      status: 'paused',
    });
  }

  /**
   * Obtiene items de múltiples cuentas
   */
  async getItemsFromMultipleAccounts(
    accounts: Array<{ 
      id: string; 
      sellerId: string; 
      nickname: string;
    }>,
    options: {
      status?: string;
      limit?: number;
    } = {}
  ): Promise<Array<{
    accountId: string;
    nickname: string;
    sellerId: string;
    items: MeliItem[];
    total: number;
  }>> {
    const results = await Promise.allSettled(
      accounts.map(async (account) => {
        try {
          const response = await this.getItems(account.id, account.sellerId, {
            status: options.status,
            limit: options.limit || 50,
          });

          return {
            accountId: account.id,
            nickname: account.nickname,
            sellerId: account.sellerId,
            items: response.results || [],
            total: response.paging?.total || 0,
          };
        } catch (error) {
          console.error(
            `[ItemsService] Error obteniendo items para cuenta ${account.id}:`,
            error
          );
          return {
            accountId: account.id,
            nickname: account.nickname,
            sellerId: account.sellerId,
            items: [],
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
        items: [],
        total: 0,
      };
    });
  }

  /**
   * Calcula estadísticas de items
   */
  calculateItemStats(items: MeliItem[]): {
    totalItems: number;
    totalStock: number;
    totalSold: number;
    averagePrice: number;
    itemsByStatus: Record<string, number>;
    totalRevenue: number;
  } {
    const totalItems = items.length;
    const totalStock = items.reduce((sum, item) => sum + (item.available_quantity || 0), 0);
    const totalSold = items.reduce((sum, item) => sum + (item.sold_quantity || 0), 0);
    const totalRevenue = items.reduce((sum, item) => {
      return sum + ((item.price || 0) * (item.sold_quantity || 0));
    }, 0);
    const averagePrice = totalItems > 0 
      ? items.reduce((sum, item) => sum + (item.price || 0), 0) / totalItems 
      : 0;

    const itemsByStatus: Record<string, number> = {};
    items.forEach((item) => {
      const status = item.status || 'unknown';
      itemsByStatus[status] = (itemsByStatus[status] || 0) + 1;
    });

    return {
      totalItems,
      totalStock,
      totalSold,
      averagePrice,
      itemsByStatus,
      totalRevenue,
    };
  }

  /**
   * Obtiene el estado del item en texto legible
   */
  getStatusLabel(status: string): string {
    const statusMap: Record<string, string> = {
      'active': 'Activa',
      'paused': 'Pausada',
      'closed': 'Cerrada',
      'under_review': 'En revisión',
      'inactive': 'Inactiva',
      'payment_required': 'Pago requerido',
    };

    return statusMap[status] || status;
  }

  /**
   * Obtiene el color del estado
   */
  getStatusColor(status: string): string {
    const colorMap: Record<string, string> = {
      'active': 'bg-green-500',
      'paused': 'bg-yellow-500',
      'closed': 'bg-red-500',
      'under_review': 'bg-orange-500',
      'inactive': 'bg-gray-500',
      'payment_required': 'bg-purple-500',
    };

    return colorMap[status] || 'bg-gray-500';
  }

  /**
   * Obtiene la condición del item en texto legible
   */
  getConditionLabel(condition: string): string {
    const conditionMap: Record<string, string> = {
      'new': 'Nuevo',
      'used': 'Usado',
      'not_specified': 'No especificado',
    };

    return conditionMap[condition] || condition;
  }

  /**
   * Formatea el precio
   */
  formatPrice(price: number, currency: string = 'ARS'): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency,
    }).format(price);
  }

  /**
   * Obtiene la imagen principal del item
   */
  getMainImage(item: MeliItem): string | null {
    if (item.pictures?.length > 0) {
      return item.pictures[0].secure_url || item.pictures[0].url;
    }
    return item.thumbnail || item.secure_thumbnail || null;
  }

  /**
   * Obtiene el atributo principal (marca o modelo)
   */
  getMainAttribute(item: MeliItem): string | null {
    const brand = item.attributes?.find(a => a.id === 'BRAND');
    const model = item.attributes?.find(a => a.id === 'MODEL');
    
    if (brand?.value_name && model?.value_name) {
      return `${brand.value_name} ${model.value_name}`;
    }
    
    return brand?.value_name || model?.value_name || null;
  }

  /**
   * Verifica si el item tiene envío gratis
   */
  hasFreeShipping(item: MeliItem): boolean {
    return item.shipping?.free_shipping || false;
  }

  /**
   * Verifica si el item acepta Mercado Pago
   */
  acceptsMercadoPago(item: MeliItem): boolean {
    return item.accepts_mercadopago || false;
  }
}

// Exportar singleton
export const itemsService = ItemsService.getInstance();
