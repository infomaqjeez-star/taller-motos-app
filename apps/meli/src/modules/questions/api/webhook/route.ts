// modules/questions/api/webhook/route.ts
// Webhook para recibir notificaciones de nuevas preguntas desde MeLi

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  // Responder inmediatamente a MeLi (requerido)
  const response = NextResponse.json({ received: true });
  
  try {
    const body = await request.json();
    const { topic, resource, user_id } = body;

    console.log(`[questions/webhook] Recibido: topic=${topic}, user_id=${user_id}`);

    // Solo procesar preguntas
    if (topic !== "questions") {
      return response;
    }

    // Buscar la cuenta correspondiente
    const { data: account, error: accountError } = await supabase
      .from("linked_meli_accounts")
      .select("id, access_token_enc, meli_nickname")
      .eq("meli_user_id", String(user_id))
      .single();

    if (accountError || !account) {
      console.error(`[questions/webhook] Cuenta no encontrada: ${user_id}`);
      return response;
    }

    // Obtener detalles de la pregunta desde MeLi
    const questionRes = await fetch(`https://api.mercadolibre.com${resource}`, {
      headers: { Authorization: `Bearer ${account.access_token_enc}` },
    });

    if (!questionRes.ok) {
      console.error(`[questions/webhook] Error obteniendo pregunta: ${questionRes.status}`);
      return response;
    }

    const q = await questionRes.json();

    // Obtener detalles del item
    let itemTitle = q.item_id;
    let itemThumbnail = null;
    
    try {
      const itemRes = await fetch(`https://api.mercadolibre.com/items/${q.item_id}`, {
        headers: { Authorization: `Bearer ${account.access_token_enc}` },
      });
      if (itemRes.ok) {
        const item = await itemRes.json();
        itemTitle = item.title;
        itemThumbnail = item.thumbnail;
      }
    } catch (e) {
      console.log(`[questions/webhook] Error obteniendo item:`, e);
    }

    // Guardar en base de datos
    const { error: upsertError } = await supabase
      .from("unified_questions")
      .upsert({
        question_id: q.id,
        meli_user_id: user_id,
        account_alias: account.meli_nickname,
        item_id: q.item_id,
        item_title: itemTitle,
        item_thumbnail: itemThumbnail,
        buyer_id: q.from?.id,
        buyer_nickname: q.from?.nickname || "Comprador",
        status: q.status,
        question_text: q.text,
        created_at: q.date_created,
      }, {
        onConflict: "question_id",
      });

    if (upsertError) {
      console.error(`[questions/webhook] Error guardando pregunta:`, upsertError);
    } else {
      console.log(`[questions/webhook] Pregunta ${q.id} guardada correctamente`);
    }

    return response;

  } catch (error) {
    console.error("[questions/webhook] Error:", error);
    return response;
  }
}
