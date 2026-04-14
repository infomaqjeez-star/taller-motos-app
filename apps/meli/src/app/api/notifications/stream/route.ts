import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key"
);

/**
 * GET /api/notifications/stream?token=xxx
 * 
 * Endpoint SSE con autenticacion via query param (EventSource no soporta headers).
 */
export async function GET(request: NextRequest) {
  // Auth via query param (EventSource no soporta Authorization header)
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  
  if (token) {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return new Response("No autorizado", { status: 401 });
    }
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const initialEvent = `event: connected\ndata: ${JSON.stringify({ status: "connected", timestamp: new Date().toISOString() })}\n\n`;
      controller.enqueue(encoder.encode(initialEvent));

      const heartbeatInterval = setInterval(() => {
        try {
          const heartbeat = `event: heartbeat\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`;
          controller.enqueue(encoder.encode(heartbeat));
        } catch {
          clearInterval(heartbeatInterval);
        }
      }, 30000);

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
