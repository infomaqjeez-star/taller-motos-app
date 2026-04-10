import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Verificar que las variables de entorno estén configuradas
if (!supabaseUrl || !supabaseServiceKey || supabaseUrl.includes("placeholder")) {
  console.warn("[API meli-answer] Supabase no configurado correctamente");
}

const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseServiceKey || "placeholder-key"
);

/**
 * POST /api/meli-answer
 * 
 * Responde una pregunta de Mercado Libre.
 * 
 * Body:
 * - question_id: ID de la pregunta en Mercado Libre
 * - answer_text: Texto de la respuesta
 * - meli_account_id: ID de la cuenta de ML
 * - pregunta_original: (opcional) Texto original de la pregunta para guardar en knowledge_base
 * 
 * Proceso:
 * 1. Obtiene el access_token de la cuenta de ML
 * 2. Envía la respuesta a la API de Mercado Libre
 * 3. Actualiza el estado en la base de datos local
 * 4. Guarda en knowledge_base para futuras sugerencias
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question_id, answer_text, meli_account_id, pregunta_original } = body;

    if (!question_id || !answer_text || !meli_account_id) {
      return NextResponse.json(
        { error: "Faltan campos requeridos: question_id, answer_text, meli_account_id" },
        { status: 400 }
      );
    }

    // Obtener los datos de la cuenta de Mercado Libre
    const { data: account, error: accountError } = await supabase
      .from("meli_accounts")
      .select("access_token, refresh_token, user_id")
      .eq("id", meli_account_id)
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { error: "Cuenta de Mercado Libre no encontrada" },
        { status: 404 }
      );
    }

    // Intentar responder usando el access_token actual
    let response = await fetch(`https://api.mercadolibre.com/questions/${question_id}/answers`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${account.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: answer_text }),
    });

    // Si el token expiró, intentar refrescarlo
    if (response.status === 401) {
      const refreshResponse = await fetch("https://api.mercadolibre.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          client_id: process.env.MELI_CLIENT_ID || "",
          client_secret: process.env.MELI_CLIENT_SECRET || "",
          refresh_token: account.refresh_token,
        }),
      });

      if (refreshResponse.ok) {
        const newTokens = await refreshResponse.json();
        
        // Actualizar tokens en la base de datos
        await supabase
          .from("meli_accounts")
          .update({
            access_token: newTokens.access_token,
            refresh_token: newTokens.refresh_token,
          })
          .eq("id", meli_account_id);

        // Reintentar la respuesta con el nuevo token
        response = await fetch(`https://api.mercadolibre.com/questions/${question_id}/answers`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${newTokens.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text: answer_text }),
        });
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Error desconocido" }));
      return NextResponse.json(
        { error: "Error al responder en Mercado Libre", details: errorData },
        { status: response.status }
      );
    }

    // Actualizar el estado de la pregunta en la base de datos
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("meli_unified_questions")
      .update({
        status: "ANSWERED",
        answer_text: answer_text,
        answer_date: now,
        updated_at: now,
      })
      .eq("meli_question_id", question_id);

    if (updateError) {
      console.error("[API meli-answer] Error actualizando BD:", updateError);
    }

    // Guardar en knowledge_base para futuras sugerencias
    if (pregunta_original) {
      await supabase
        .from("knowledge_base")
        .upsert({
          pregunta: pregunta_original.toLowerCase().trim(),
          respuesta: answer_text,
          categoria: "auto",
          usos: 1,
          created_at: now,
          updated_at: now,
        }, {
          onConflict: "pregunta",
        });
    }

    return NextResponse.json({ status: "ok", message: "Respuesta enviada correctamente" });
  } catch (error) {
    console.error("[API meli-answer] Error inesperado:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
