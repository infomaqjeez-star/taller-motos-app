import { NextRequest } from "next/server";

// Forzar renderizado dinÃ¡mico - evita error de generaciÃ³n estÃ¡tica y timeout
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/notifications/stream
 * 
 * Endpoint SSE (Server-Sent Events) para notificaciones en tiempo real.
 * EnvÃ­a notificaciones de Mercado Libre a los clientes conectados.
 */
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  // Crear stream SSE
  const stream = new ReadableStream({
    start(controller) {
      // Enviar evento inicial de conexiÃ³n
      const initialEvent = `event: connected\ndata: ${JSON.stringify({ status: "connected", timestamp: new Date().toISOString() })}\n\n`;
      controller.enqueue(encoder.encode(initialEvent));

      // Enviar heartbeat cada 30 segundos para mantener la conexiÃ³n viva
      const heartbeatInterval = setInterval(() => {
        try {
          const heartbeat = `event: heartbeat\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`;
          controller.enqueue(encoder.encode(heartbeat));
        } catch {
          // Cliente desconectado
          clearInterval(heartbeatInterval);
        }
      }, 30000);

      // Cerrar stream cuando el cliente se desconecte
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeatInterval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
