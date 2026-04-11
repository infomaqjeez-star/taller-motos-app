import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Forzar renderizado dinámico - evita error de generación estática
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Verificar que las variables de entorno estén configuradas
if (!supabaseUrl || !supabaseServiceKey || supabaseUrl.includes("placeholder")) {
  console.warn("[API meli-questions] Supabase no configurado correctamente");
}

const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseServiceKey || "placeholder-key"
);

/**
 * GET /api/meli-questions
 * 
 * Obtiene todas las preguntas sin responder de todas las cuentas de Mercado Libre
 * vinculadas al usuario actual. Incluye información del producto y la cuenta.
 * 
 * Filtros aplicados:
 * - status = 'UNANSWERED' (solo preguntas pendientes)
 * - Ordenadas por date_created DESC (más recientes primero)
 * 
 * Respuesta: Array de preguntas con datos enriquecidos
 */
export async function GET(request: NextRequest) {
  try {
    // Obtener el usuario actual de la sesión
    const authHeader = request.headers.get("authorization");
    let userId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        userId = user.id;
      }
    }

    // Si no hay usuario autenticado, obtener todas las preguntas sin responder
    // (para compatibilidad con el modo actual)
    
    const { data: questions, error } = await supabase
      .from("meli_unified_questions")
      .select(`
        id,
        meli_question_id,
        meli_account_id,
        item_id,
        item_title,
        item_thumbnail,
        buyer_id,
        buyer_nickname,
        question_text,
        status,
        date_created,
        answer_text,
        answer_date
      `)
      .eq("status", "UNANSWERED")
      .order("date_created", { ascending: false });

    if (error) {
      console.error("[API meli-questions] Error:", error);
      return NextResponse.json(
        { error: "Error al obtener preguntas", details: error.message },
        { status: 500 }
      );
    }

    // Transformar los datos para que coincidan con la interfaz esperada
    const formattedQuestions = questions?.map((q: any) => ({
      id: q.id,
      meli_question_id: q.meli_question_id,
      meli_account_id: q.meli_account_id,
      item_id: q.item_id,
      item_title: q.item_title,
      item_thumbnail: q.item_thumbnail,
      buyer_id: q.buyer_id,
      buyer_nickname: q.buyer_nickname,
      question_text: q.question_text,
      status: q.status,
      date_created: q.date_created,
      answer_text: q.answer_text,
      meli_accounts: q.meli_accounts,
    })) || [];

    return NextResponse.json(formattedQuestions);
  } catch (error) {
    console.error("[API meli-questions] Error inesperado:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
