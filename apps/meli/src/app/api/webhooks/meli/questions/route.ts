import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getActiveAccounts, getValidToken, meliGet } from "@/lib/meli";

export const dynamic = "force-dynamic";

// Cliente Supabase con service role para operaciones de RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = supabaseUrl && serviceRoleKey 
  ? createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

interface MeliNotification {
  topic: string;
  user_id: string; // meli_user_id
  resource: string; // /questions/{question_id}
  application_id: string;
  sent: string;
  attempts: number;
}

export async function POST(req: Request) {
  try {
    const notification: MeliNotification = await req.json();
    
    console.log("[Webhook Questions] Notificación recibida:", {
      topic: notification.topic,
      user_id: notification.user_id,
      resource: notification.resource,
    });

    // Solo procesar notificaciones de preguntas
    if (notification.topic !== "questions") {
      return NextResponse.json({ ok: true, message: "Topic ignorado" });
    }

    // Extraer question_id del resource
    const questionIdMatch = notification.resource.match(/\/questions\/(\d+)/);
    if (!questionIdMatch) {
      console.error("[Webhook Questions] No se pudo extraer question_id de:", notification.resource);
      return NextResponse.json({ error: "Invalid resource format" }, { status: 400 });
    }
    const questionId = questionIdMatch[1];

    // Buscar la cuenta de MeLi correspondiente
    const accounts = await getActiveAccounts();
    const account = accounts.find(a => String(a.meli_user_id) === notification.user_id);
    
    if (!account) {
      console.error("[Webhook Questions] Cuenta no encontrada para meli_user_id:", notification.user_id);
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Obtener token válido
    const token = await getValidToken(account);
    if (!token) {
      console.error("[Webhook Questions] Token inválido para cuenta:", account.nickname);
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Consultar detalles de la pregunta en MeLi
    const questionData = await meliGet(`/questions/${questionId}`, token) as {
      id: string;
      item_id: string;
      status: string; // UNANSWERED, ANSWERED, etc
      text: string;
      date_created: string;
      from?: { id: number; nickname: string };
    } | null;

    if (!questionData) {
      console.error("[Webhook Questions] No se pudo obtener datos de la pregunta:", questionId);
      return NextResponse.json({ error: "Question not found in MeLi" }, { status: 404 });
    }

    // Consultar detalles del ítem
    const itemData = await meliGet(`/items/${questionData.item_id}`, token) as {
      title: string;
      thumbnail: string;
    } | null;

    // Obtener el user_id de AppJeez (auth.users) a partir de la cuenta
    const { data: userData, error: userError } = await supabaseAdmin
      ?.from("linked_meli_accounts")
      .select("user_id")
      .eq("meli_user_id", notification.user_id)
      .single() || { data: null, error: null };

    if (userError || !userData?.user_id) {
      console.error("[Webhook Questions] No se encontró user_id para la cuenta:", notification.user_id);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Guardar/Actualizar en meli_questions_sync
    const questionRecord = {
      id: questionData.id,
      user_id: userData.user_id,
      meli_user_id: notification.user_id,
      item_id: questionData.item_id,
      title_item: itemData?.title || "Producto sin título",
      item_thumbnail: itemData?.thumbnail?.replace("http://", "https://") || null,
      question_text: questionData.text,
      status: questionData.status,
      buyer_nickname: questionData.from?.nickname || "Usuario",
      meli_created_date: questionData.date_created,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertError } = await supabaseAdmin
      ?.from("meli_questions_sync")
      .upsert(questionRecord, { onConflict: "id" }) || { error: null };

    if (upsertError) {
      console.error("[Webhook Questions] Error guardando en Supabase:", upsertError);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    console.log("[Webhook Questions] Pregunta sincronizada:", {
      question_id: questionData.id,
      item_id: questionData.item_id,
      status: questionData.status,
    });

    return NextResponse.json({ 
      ok: true, 
      message: "Question synced",
      question_id: questionData.id,
    });

  } catch (error) {
    console.error("[Webhook Questions] Error procesando webhook:", error);
    return NextResponse.json(
      { error: "Internal server error", details: (error as Error).message },
      { status: 500 }
    );
  }
}

// Endpoint GET para verificar que el webhook está activo (usado por MeLi)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const challenge = searchParams.get("challenge");
  
  if (challenge) {
    // MeLi envía un challenge para verificar el endpoint
    return new Response(challenge, { status: 200 });
  }
  
  return NextResponse.json({ ok: true, message: "Webhook endpoint active" });
}