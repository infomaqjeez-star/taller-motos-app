import { NextRequest, NextResponse } from "next/server";
import { verifyMeliWebhookSignature } from "@/lib/webhookSignature";
import { getNotificationManager } from "@/lib/notificationManager";
import { supabase } from "@/lib/supabase";

/**
 * POST /api/webhooks/meli
 * Recibe notificaciones de Mercado Libre (Webhooks)
 * Topic: questions, orders_v2, etc.
 *
 * MeLi envía:
 * - Header X-SIGNATURE: sha256=<hmac>
 * - Body: { resource, user_id, topic, ... }
 */
export async function POST(request: NextRequest) {
  try {
    console.log("[WEBHOOK] POST /api/webhooks/meli recibido");

    // 1. Obtener firma del header
    const signature = request.headers.get("X-SIGNATURE");
    if (!signature) {
      console.warn("[WEBHOOK] ❌ Firma no encontrada en headers");
      return NextResponse.json({ error: "Signature missing" }, { status: 401 });
    }

    console.log("[WEBHOOK] Firma recibida:", signature.substring(0, 20) + "...");

    // 2. Leer body como string para validar firma
    const body = await request.text();
    console.log("[WEBHOOK] Body recibido:", body.substring(0, 100) + "...");

    const secret = process.env.MELI_WEBHOOK_SECRET;

    if (!secret) {
      console.error("[WEBHOOK] ❌ MELI_WEBHOOK_SECRET no configurado");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // 3. Verificar firma HMAC
    const isValid = verifyMeliWebhookSignature(body, signature, secret);
    console.log(`[WEBHOOK] Validación de firma: ${isValid ? "✅ VÁLIDA" : "❌ INVÁLIDA"}`);

    if (!isValid) {
      console.warn("[WEBHOOK] Firma inválida. Rechazando.");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // 4. Parsear payload
    let payload: any;
    try {
      payload = JSON.parse(body);
      console.log("[WEBHOOK] Payload parseado:", JSON.stringify(payload).substring(0, 150) + "...");
    } catch {
      console.error("[WEBHOOK] ❌ JSON inválido");
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { resource, user_id, topic, action } = payload;

    console.log(`[WEBHOOK] ✅ Notificación procesada - Topic: ${topic}, User: ${user_id}, Resource: ${resource}`);

    // 5. Procesar solo preguntas por ahora
    if (topic === "questions") {
      // Guardar en base de datos
      const { error: dbError, data: dbData } = await supabase
        .from("notifications")
        .insert({
          meli_user_id: String(user_id),
          topic: topic,
          resource: String(resource),
          data: payload,
          received_at: new Date().toISOString(),
        })
        .select();

      if (dbError) {
        console.error("[WEBHOOK] ❌ Error guardando en DB:", dbError);
      } else {
        console.log("[WEBHOOK] ✅ Notificación guardada en DB");
      }

      // Broadcast a clientes SSE
      try {
        const notificationManager = getNotificationManager();
        notificationManager.broadcast({
          user_id: String(user_id),
          topic: topic,
          resource: String(resource),
          data: payload,
          timestamp: new Date().toISOString(),
        });
        console.log("[WEBHOOK] ✅ Broadcast SSE enviado");
      } catch (broadcastError) {
        console.error("[WEBHOOK] ❌ Error en broadcast:", broadcastError);
      }
    }

    // 6. Retornar 200 OK inmediatamente (MeLi necesita confirmación rápida)
    console.log("[WEBHOOK] ✅ Retornando 200 OK a MeLi");
    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (error) {
    console.error("[WEBHOOK] ❌ Error crítico procesando webhook:", error);
    // Retornar 200 de todas formas para que MeLi no reintente
    return NextResponse.json({ status: "ok" }, { status: 200 });
  }
}

/**
 * GET /api/webhooks/meli?challenge=xyz
 * MeLi envía esto para verificar que el endpoint existe
 * Solo retornamos el challenge
 */
export async function GET(request: NextRequest) {
  const challenge = request.nextUrl.searchParams.get("challenge");

  console.log("[WEBHOOK] GET /api/webhooks/meli - Challenge:", challenge);

  if (!challenge) {
    console.warn("[WEBHOOK] ❌ Challenge missing");
    return NextResponse.json({ error: "Challenge missing" }, { status: 400 });
  }

  console.log("[WEBHOOK] ✅ Challenge verificado");
  return NextResponse.json({ challenge });
}
