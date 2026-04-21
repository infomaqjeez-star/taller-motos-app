import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getValidToken, type LinkedMeliAccount } from "@/lib/meli";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key"
);

/**
 * POST /api/webhooks/meli-items
 * Recibe notificaciones en tiempo real de Mercado Libre
 * Topics: questions, messages, orders
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log("[meli-webhook] Recibido:", JSON.stringify(body, null, 2));
    
    const { topic, resource, user_id, application_id } = body;
    
    if (!topic || !resource) {
      return NextResponse.json({ error: "Missing topic or resource" }, { status: 400 });
    }
    
    console.log(`[meli-webhook] Topic: ${topic}, Resource: ${resource}, User: ${user_id}`);
    
    // Buscar la cuenta correspondiente
    const { data: account } = await supabase
      .from("linked_meli_accounts")
      .select("id, user_id, meli_user_id, meli_nickname")
      .eq("meli_user_id", String(user_id))
      .eq("is_active", true)
      .single();
    
    if (!account) {
      console.log(`[meli-webhook] Cuenta no encontrada para user_id: ${user_id}`);
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }
    
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
        console.log(`[meli-webhook] Topic no manejado: ${topic}`);
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error("[meli-webhook] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

async function processQuestion(resource: string, account: any) {
  const questionId = resource.split('/').pop();
  
  console.log(`[meli-webhook] Procesando pregunta ${questionId} para ${account.meli_nickname}`);
  
  const { data: accountData } = await supabase
    .from("linked_meli_accounts")
    .select("access_token_enc, refresh_token_enc, token_expiry_date")
    .eq("id", account.id)
    .single();
  
  if (!accountData) return;
  
  const token = await getValidToken(accountData as LinkedMeliAccount);
  if (!token) {
    console.error(`[meli-webhook] No se pudo obtener token para ${account.meli_nickname}`);
    return;
  }
  
  try {
    const res = await fetch(`https://api.mercadolibre.com/questions/${questionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    if (!res.ok) {
      console.error(`[meli-webhook] Error obteniendo pregunta: ${res.status}`);
      return;
    }
    
    const questionData = await res.json();
    
    // Guardar en base de datos para notificación inmediata
    const { error } = await supabase
      .from("meli_notifications")
      .insert({
        type: "question",
        meli_id: questionId,
        account_id: account.id,
        user_id: account.user_id,
        data: questionData,
        processed: false,
        created_at: new Date().toISOString(),
      });
    
    if (error) {
      console.error("[meli-webhook] Error guardando notificación:", error);
    } else {
      console.log(`[meli-webhook] ✅ Pregunta ${questionId} guardada para notificación`);
    }
    
  } catch (err) {
    console.error("[meli-webhook] Error procesando pregunta:", err);
  }
}

async function processMessage(resource: string, account: any) {
  console.log(`[meli-webhook] Procesando mensaje para ${account.meli_nickname}: ${resource}`);
  // Implementar similar a processQuestion
}

async function processOrder(resource: string, account: any) {
  console.log(`[meli-webhook] Procesando orden para ${account.meli_nickname}: ${resource}`);
  // Implementar similar a processQuestion
}

/**
 * GET /api/webhooks/meli-items
 * Verificación del webhook por parte de MeLi
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get("challenge");
  
  if (challenge) {
    console.log("[meli-webhook] Verificación recibida:", challenge);
    return new NextResponse(challenge, { status: 200 });
  }
  
  return NextResponse.json({ status: "Webhook endpoint activo" });
}
