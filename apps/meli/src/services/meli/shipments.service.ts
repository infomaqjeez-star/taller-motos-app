import { MELI_API_BASE, SHIPPING_MODES, LOGISTIC_TYPES } from '@/lib/meli/constants';
import { tokenService } from './token.service';
import type { 
  MeliShipment,
  MeliShippingMethod,
  MeliApiError 
} from '@/types/meli';

/**
 * Servicio de gestión de envíos de Mercado Libre
 * Soporta ME1, ME2, y convivencia de múltiples logísticas
 */
export class ShipmentsService {
  private static instance: ShipmentsService;

  static getInstance(): ShipmentsService {
    if (!ShipmentsService.instance) {
      ShipmentsService.instance = new ShipmentsService();
    }
    return ShipmentsService.instance;
  }

  /**
   * Obtiene información de un envío
   */
  async getShipment(
    accountId: string,
    shipmentId: number
  ): Promise<MeliShipment> {
    const token = await tokenService.getValidToken(accountId);

    const response = await fetch(
      `${MELI_API_BASE}/shipments/${shipmentId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Format-New': 'true',
        },
      }
    );

    if (!response.ok) {
      const error: MeliApiError = await response.json();
      throw new Error(`Error obteniendo envío: ${error.message}`);
    }

    return response.json();
  }

  /**
   * Obtiene métodos de envío disponibles por país
   */
  async getShippingMethods(
    accountId: string,
    siteId: string
  ): Promise<MeliShippingMethod[]> {
    const token = await tokenService.getValidToken(accountId);

    const response = await fetch(
      `${MELI_API_BASE}/sites/${siteId}/shipping_methods`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const error: MeliApiError = await response.json();
      throw new Error(`Error obteniendo métodos de envío: ${error.message}`);
    }

    return response.json();
  }

  /**
   * Obtiene preferencias de envío de un usuario
   */
  async getUserShippingPreferences(
    accountId: string,
    userId: string
  ): Promise<any> {
    const token = await tokenService.getValidToken(accountId);

    const response = await fetch(
      `${MELI_API_BASE}/users/${userId}/shipping_preferences`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const error: MeliApiError = await response.json();
      throw new Error(`Error obteniendo preferencias: ${error.message}`);
    }

    return response.json();
  }

  /**
   * Obtiene preferencias de envío de una categoría
   */
  async getCategoryShippingPreferences(
    accountId: string,
    categoryId: string
  ): Promise<any> {
    const token = await tokenService.getValidToken(accountId);

    const response = await fetch(
      `${MELI_API_BASE}/categories/${categoryId}/shipping_preferences`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const error: MeliApiError = await response.json();
      throw new Error(`Error obteniendo preferencias: ${error.message}`);
    }

    return response.json();
  }

  /**
   * Obtiene servicios de logística disponibles para un User Product
   * Nuevo endpoint 2026 para convivencia de múltiples logísticas
   */
  async getUserProductLogistics(
    accountId: string,
    siteId: string,
    userProductId: string,
    options: {
      legacyAttributes?: boolean;
    } = {}
  ): Promise<any> {
    const token = await tokenService.getValidToken(accountId);

    const params = new URLSearchParams();
    if (options.legacyAttributes) {
      params.append('legacy_attributes', 'true');
    }

    const url = `${MELI_API_BASE}/customers/marketplace/sites/${siteId}/user-products/${userProductId}/contracts/shippability/services?${params.toString()}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error: MeliApiError = await response.json();
      throw new Error(`Error obteniendo logísticas: ${error.message}`);
    }

    return response.json();
  }

  /**
   * Descarga etiqueta de envío
   */
  async downloadLabel(
    accountId: string,
    shipmentId: number,
    format: 'pdf' | 'zpl' = 'pdf'
  ): Promise<Blob> {
    const token = await tokenService.getValidToken(accountId);

    const response = await fetch(
      `${MELI_API_BASE}/shipments/${shipmentId}/label?format=${format}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const error: MeliApiError = await response.json();
      throw new Error(`Error descargando etiqueta: ${error.message}`);
    }

    return response.blob();
  }

  /**
   * Obtiene el estado del envío en texto legible
   */
  getStatusLabel(status: string, substatus?: string): string {
    const statusMap: Record<string, string> = {
      'pending': 'Pendiente',
      'ready_to_ship': 'Listo para enviar',
      'shipped': 'En camino',
      'delivered': 'Entregado',
      'not_delivered': 'No entregado',
      'cancelled': 'Cancelado',
      'closed': 'Cerrado',
    };

    const substatusMap: Record<string, string> = {
      'pending': 'Pendiente de preparación',
      'printed': 'Etiqueta impresa',
      'in_hub': 'En centro de distribución',
      'measures_ready': 'Medidas confirmadas',
      'waiting_for_carrier': 'Esperando transportista',
      'stale': 'Estancado',
      'delayed': 'Demorado',
      'claimed_me': 'En reclamo',
    };

    if (substatus && substatusMap[substatus]) {
      return substatusMap[substatus];
    }

    return statusMap[status] || status;
  }

  /**
   * Obtiene el tipo de logística en texto legible
   */
  getLogisticTypeLabel(type: string): string {
    const typeMap: Record<string, string> = {
      [LOGISTIC_TYPES.DROP_OFF]: 'Drop Off',
      [LOGISTIC_TYPES.CROSS_DOCKING]: 'Colecta',
      [LOGISTIC_TYPES.XD_DROP_OFF]: 'Places',
      [LOGISTIC_TYPES.FULFILLMENT]: 'Full',
      [LOGISTIC_TYPES.SELF_SERVICE]: 'Flex',
      [LOGISTIC_TYPES.TURBO]: 'Turbo',
      [LOGISTIC_TYPES.DEFAULT]: 'Estándar',
      [LOGISTIC_TYPES.CUSTOM]: 'Personalizado',
    };

    return typeMap[type] || type;
  }

  /**
   * Obtiene el modo de envío en texto legible
   */
  getShippingModeLabel(mode: string): string {
    const modeMap: Record<string, string> = {
      [SHIPPING_MODES.ME1]: 'Mercado Envíos 1 (Propio)',
      [SHIPPING_MODES.ME2]: 'Mercado Envíos 2 (MeLi)',
      [SHIPPING_MODES.CUSTOM]: 'Personalizado',
      [SHIPPING_MODES.NOT_SPECIFIED]: 'No especificado',
    };

    return modeMap[mode] || mode;
  }

  /**
   * Verifica si un envío está en estado listo para enviar
   */
  isReadyToShip(shipment: MeliShipment): boolean {
    return shipment.status === 'ready_to_ship';
  }

  /**
   * Verifica si un envío está entregado
   */
  isDelivered(shipment: MeliShipment): boolean {
    return shipment.status === 'delivered';
  }

  /**
   * Obtiene el tracking URL según el método
   */
  getTrackingUrl(shipment: MeliShipment): string | null {
    if (!shipment.tracking_number || !shipment.tracking_method) {
      return null;
    }

    // URLs de tracking por método
    const trackingUrls: Record<string, string> = {
      'Mercado Envíos': `https://www.mercadolibre.com.ar/envios/${shipment.id}/detalle`,
    };

    return trackingUrls[shipment.tracking_method] || null;
  }
}

// Exportar singleton
export const shipmentsService = ShipmentsService.getInstance();
