/**
 * Gestor centralizado de conexiones SSE
 * Singleton que mantiene un registro de todos los clientes SSE conectados
 * y permite broadcast de eventos a todos ellos
 */

interface MeliNotification {
  user_id: string;
  topic: string;
  resource: string;
  data: any;
  timestamp: string;
}

// Almacenar referencias a los controladores de respuesta para escribir eventos
let sseClients: Set<{
  controller: ReadableStreamDefaultController<string>;
  id: string;
}> = new Set();

export class NotificationManager {
  private static instance: NotificationManager;

  private constructor() {
    console.log("[NotificationManager] Inicializado");
  }

  static getInstance(): NotificationManager {
    if (!this.instance) {
      this.instance = new NotificationManager();
    }
    return this.instance;
  }

  /**
   * Registrar un nuevo cliente SSE
   */
  addClient(controller: ReadableStreamDefaultController<string>, id: string): void {
    sseClients.add({ controller, id });
    console.log(`[SSE Manager] âœ… Cliente ${id.substring(0, 20)}... agregado. Total: ${sseClients.size}`);
  }

  /**
   * Desregistrar un cliente SSE
   */
  removeClient(id: string): void {
    const before = sseClients.size;
    sseClients.forEach((client) => {
      if (client.id === id) {
        sseClients.delete(client);
      }
    });
    const after = sseClients.size;
    if (before !== after) {
      console.log(`[SSE Manager] ðŸ”´ Cliente ${id.substring(0, 20)}... removido. Total: ${after}`);
    }
  }

  /**
   * Enviar notificaciÃ³n a todos los clientes conectados
   */
  broadcast(notification: MeliNotification): void {
    console.log(`[SSE Manager] ðŸ“¢ Broadcasting a ${sseClients.size} cliente(s)...`);

    const event = `event: notificacion_meli\ndata: ${JSON.stringify(notification)}\n\n`;

    let successCount = 0;
    let failedCount = 0;

    sseClients.forEach((client) => {
      try {
        client.controller.enqueue(event);
        successCount++;
      } catch (error) {
        console.warn(`[SSE Manager] âš ï¸ Error escribiendo a cliente ${client.id.substring(0, 20)}...:`);
        console.warn(error);
        failedCount++;
      }
    });

    console.log(
      `[SSE Manager] âœ… Broadcast completado - ${successCount} exitosos, ${failedCount} fallidos`
    );

    if (failedCount > 0) {
      console.warn(`[SSE Manager] Limpiando ${failedCount} cliente(s) fallido(s)`);
      // AquÃ­ podrÃ­as implementar lÃ³gica para remover clientes que fallaron
    }
  }

  /**
   * Obtener cantidad de clientes conectados
   */
  getClientCount(): number {
    return sseClients.size;
  }
}

export function getNotificationManager(): NotificationManager {
  return NotificationManager.getInstance();
}
