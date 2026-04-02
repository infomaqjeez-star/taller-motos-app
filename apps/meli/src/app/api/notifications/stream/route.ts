import { NextRequest } from "next/server";
import { getNotificationManager } from "@/lib/notificationManager";

/**
 * GET /api/notifications/stream
 * Abre una conexión SSE (Server-Sent Events) para recibir notificaciones en tiempo real
 * 
 * El cliente conecta y recibe eventos cuando MeLi notifica
 */
export async function GET(request: NextRequest) {
  // Generar ID único para este cliente
  const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  console.log(`[SSE] Iniciando stream para cliente: ${clientId}`);

  // Crear stream personalizado
  const stream = new ReadableStream({
    async start(controller) {
      const notificationManager = getNotificationManager();

      // Registrar cliente
      notificationManager.addClient(controller, clientId);

      // Enviar comentario inicial para verificar conexión
      try {
        controller.enqueue(": SSE stream conectado\n\n");
        console.log(`[SSE] Mensaje inicial enviado a ${clientId}`);
      } catch (error) {
        console.error(`[SSE] Error enviando mensaje inicial a ${clientId}:`, error);
      }

      // Mantener viva la conexión con heartbeat cada 30s
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(": heartbeat\n\n");
        } catch (error) {
          console.error(`[SSE] Error enviando heartbeat a ${clientId}:`, error);
          clearInterval(heartbeatInterval);
          notificationManager.removeClient(clientId);
          try {
            controller.close();
          } catch {
            // Ya está cerrado
          }
        }
      }, 30000); // Cada 30 segundos

      // Manejar cierre de conexión
      const handleAbort = () => {
        console.log(`[SSE] Conexión abortada por cliente: ${clientId}`);
        clearInterval(heartbeatInterval);
        notificationManager.removeClient(clientId);
        try {
          controller.close();
        } catch {
          // Ya está cerrado
        }
      };

      request.signal.addEventListener("abort", handleAbort);

      // Cleanup cuando se cierre el stream
      return () => {
        clearInterval(heartbeatInterval);
        request.signal.removeEventListener("abort", handleAbort);
        notificationManager.removeClient(clientId);
        console.log(`[SSE] Stream limpiado para cliente: ${clientId}`);
      };
    },
  });

  // Retornar response con headers SSE correctos para Next.js
  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "connection": "keep-alive",
      "x-accel-buffering": "no",
      // CORS headers
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, OPTIONS",
      "access-control-allow-headers": "content-type, authorization",
    },
  });
}

/**
 * OPTIONS /api/notifications/stream
 * Manejo de CORS preflight
 */
export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, OPTIONS",
      "access-control-allow-headers": "content-type, authorization",
      "access-control-max-age": "86400",
    },
  });
}
