import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key"
);

/**
 * SSE Endpoint para notificaciones en tiempo real
 * /api/sse/notifications
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  
  let userId: string | null = null;
  
  if (token) {
    const { data: { user } } = await supabase.auth.getUser(token);
    if (user) userId = user.id;
  }
  
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      // Enviar heartbeat cada 30 segundos para mantener conexión
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`event: heartbeat\ndata: ${Date.now()}\n\n`));
      }, 30000);
      
      // Suscribirse a cambios en meli_notifications
      const subscription = supabase
        .channel(`notifications:${userId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "meli_notifications",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const data = JSON.stringify(payload.new);
            controller.enqueue(encoder.encode(`event: notification\ndata: ${data}\n\n`));
          }
        )
        .subscribe();
      
      // Limpiar al cerrar conexión
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        subscription.unsubscribe();
        controller.close();
      });
      
      // Enviar evento inicial de conexión
      controller.enqueue(encoder.encode(`event: connected\ndata: ${JSON.stringify({ userId })}\n\n`));
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
