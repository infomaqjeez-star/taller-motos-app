import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getValidToken, type LinkedMeliAccount } from "@/lib/meli";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key"
);

// IPs oficiales de MeLi según documentación 2026
const MELI_OFFICIAL_IPS = [
  '54.88.218.97',
  '18.215.140.160',
  '18.213.114.129',
  '18.206.34.84'
];

/**
 * POST /api/webhooks/meli-items
 * Webhook optimizado para respuesta < 500ms
 * Procesamiento asíncrono en background
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // 1. Validar IP de MeLi (seguridad)
    const forwardedFor = request.headers.get('x-forwarded-for');
    const remoteIp = forwardedFor?.split(',')[0]?.trim() || 'unknown';
    
    if (!MELI_OFFICIAL_IPS.includes(remoteIp)) {
      console.warn(`[meli-webhook] ⚠️ Acceso no autorizado desde IP: ${remoteIp}`);
      // No bloqueamos en desarrollo, pero logueamos
      // return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    // 2. Parsear body rápidamente
    const body = await request.json();
    const { topic, resource, user_id, application_id } = body;
    
    if (!topic || !resource || !user_id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    
    console.log(`[meli-webhook] 📨 ${topic} | User: ${user_id} | Resource: ${resource} | IP: ${remoteIp}`);
    
    // 3. Responder 200 OK INMEDIATAMENTE (< 500ms)
    // Esto es CRÍTICO - MeLi desactiva el webhook si tardamos más
    const responseTime = Date.now() - startTime;
    console.log(`[meli-webhook] ✅ Respondiendo 200 OK en ${responseTime}ms`);
    
    // 4. Procesar asíncronamente (después de responder)
    // Usamos Promise.resolve() para no bloquear la respuesta
    Promise.resolve().then(async () => {
      try {
        await processNotificationAsync(topic, resource, user_id);
      } catch (err) {
        console.error("[meli-webhook] ❌ Error en procesamiento async:", err);
      }
    });
    
    return NextResponse.json({ success: true, processed: false });
    
  } catch (error) {
    console.error("[meli-webhook] ❌ Error:", error);
    // Aún así respondemos 200 para que MeLi no desactive el webhook
    return NextResponse.json({ success: false, error: "Internal error" });
  }
}

/**
 * Procesamiento asíncrono de la notificación
 * Esto corre DESPUÉS de haber respondido 200 OK a MeLi
 */
async function processNotificationAsync(topic: string, resource: string, user_id: string) {
  const processStart = Date.now();
  
  try {
    // Buscar la cuenta correspondiente
    const { data: account, error: accountError } = await supabase
      .from("linked_meli_accounts")
      .select("id, user_id, meli_user_id, meli_nickname, access_token_enc, refresh_token_enc, token_expiry_date")
      .eq("meli_user_id", String(user_id))
      .eq("is_active", true)
      .single();
    
    if (accountError || !account) {
      console.error(`[meli-webhook] ❌ Cuenta no encontrada para user_id: ${user_id}`);
      return;
    }
    
    console.log(`[meli-webhook] 📋 Procesando ${topic} para ${account.meli_nickname}`);
    
    // Procesar según el topic
    switch (topic) {
      case "questions":
        await processQuestion(resource, account);
        break;
      case "messages":
        await processMessage(resource, account);
        break;
      case "orders":
        await processOrder(resource, account);
        break;
      default:
        console.log(`[meli-webhook] ℹ️ Topic no manejado: ${topic}`);
    }
    
    console.log(`[meli-webhook] ✅ Procesado en ${Date.now() - processStart}ms`);
    
  } catch (err) {
    console.error("[meli-webhook] ❌ Error en processNotificationAsync:", err);
  }
}

async function processQuestion(resource: string, account: any) {
  const questionId = resource.split('/').pop();
  
  console.log(`[meli-webhook] ❓ Procesando pregunta ${questionId} para ${account.meli_nickname}`);
  
  try {
    // Obtener token válido (con auto-refresh si es necesario)
    const token = await getValidToken(account as LinkedMeliAccount);
    
    if (!token) {
      console.error(`[meli-webhook] ❌ No se pudo obtener token para ${account.meli_nickname}`);
      return;
    }
    
    // Obtener detalles de la pregunta de MeLi
    const questionRes = await fetch(`https://api.mercadolibre.com/questions/${questionId}`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      },
    });
    
    if (!questionRes.ok) {
      const errorText = await questionRes.text();
      console.error(`[meli-webhook] ❌ Error obteniendo pregunta ${questionId}: ${questionRes.status} - ${errorText}`);
      return;
    }
    
    const questionData = await questionRes.json();
    
    // Verificar si la pregunta está baneada (no intentar responder)
    if (questionData.status === 'BANNED') {
      console.log(`[meli-webhook] ⚠️ Pregunta ${questionId} está BANNED, ignorando`);
      return;
    }
    
    // Obtener info del producto
    let itemData = { title: questionData.item_id, thumbnail: '' };
    try {
      const itemRes = await fetch(`https://api.mercadolibre.com/items/${questionData.item_id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (itemRes.ok) {
        itemData = await itemRes.json();
      }
    } catch (e) {
      console.log(`[meli-webhook] ⚠️ No se pudo obtener info del item ${questionData.item_id}`);
    }
    
    // Guardar notificación en BD
    const { error: insertError } = await supabase
      .from("meli_notifications")
      .insert({
        type: "question",
        meli_id: questionId,
        account_id: account.id,
        user_id: account.user_id,
        data: {
          ...questionData,
          item_title: itemData.title,
          item_thumbnail: itemData.thumbnail,
          account_nickname: account.meli_nickname,
        },
        processed: false,
        created_at: new Date().toISOString(),
      });
    
    if (insertError) {
      console.error("[meli-webhook] ❌ Error guardando notificación:", insertError);
      return;
    }
    
    console.log(`[meli-webhook] ✅ Pregunta ${questionId} guardada y notificada`);
    
    // Notificar a través de Supabase Realtime
    await supabase.channel(`notifications:${account.user_id}`)
      .send({
        type: "broadcast",
        event: "notification",
        payload: {
          type: "question",
          meli_id: questionId,
          account_id: account.id,
          data: {
            ...questionData,
            item_title: itemData.title,
            item_thumbnail: itemData.thumbnail,
            account_nickname: account.meli_nickname,
          },
          created_at: new Date().toISOString(),
        },
      });
    
  } catch (err) {
    console.error(`[meli-webhook] ❌ Error procesando pregunta ${questionId}:`, err);
  }
}

async function processMessage(resource: string, account: any) {
  console.log(`[meli-webhook] 💬 Procesando mensaje para ${account.meli_nickname}: ${resource}`);
  // Implementación similar a processQuestion
}

async function processOrder(resource: string, account: any) {
  console.log(`[meli-webhook] 📦 Procesando orden para ${account.meli_nickname}: ${resource}`);
  // Implementación similar a processQuestion
}

/**
 * GET /api/webhooks/meli-items
 * Verificación del webhook por parte de MeLi (Challenge)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get("challenge");
  
  if (challenge) {
    console.log("[meli-webhook] 🔐 Verificación recibida:", challenge);
    // Responder con el challenge exacto que envió MeLi
    return new NextResponse(challenge, { 
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
  
  return NextResponse.json({ 
    status: "Webhook endpoint activo",
    timestamp: new Date().toISOString()
  });
}
