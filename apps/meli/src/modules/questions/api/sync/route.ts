// modules/questions/api/sync/route.ts
// Endpoint para sincronizar preguntas desde todas las cuentas MeLi

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUserAccounts, createMeliClient } from "../../../shared/meli-client";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Auth
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { data: { user } } = await supabase.auth.getUser(authHeader.slice(7));
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    console.log(`[questions/sync] Sincronizando preguntas para usuario: ${user.id}`);

    // Obtener cuentas del usuario
    const accounts = await getUserAccounts(user.id);
    console.log(`[questions/sync] ${accounts.length} cuentas encontradas`);

    const results = {
      total: 0,
      new: 0,
      updated: 0,
      errors: 0,
      byAccount: {} as Record<string, number>,
    };

    // Procesar cada cuenta
    for (const account of accounts) {
      try {
        console.log(`[questions/sync] Procesando cuenta: ${account.meli_user_id}`);
        
        const client = await createMeliClient(account.id);
        const questions = await client.getUnansweredQuestions();
        
        console.log(`[questions/sync] ${questions.length} preguntas encontradas`);
        
        let accountNew = 0;
        let accountUpdated = 0;

        for (const q of questions) {
          try {
            // Obtener detalles del item
            let itemTitle = q.item_id;
            let itemThumbnail = null;
            
            try {
              const item = await client.getItem(q.item_id);
              itemTitle = item.title;
              itemThumbnail = item.thumbnail;
            } catch (e) {
              console.log(`[questions/sync] Error obteniendo item ${q.item_id}:`, e);
            }

            // Guardar/actualizar en base de datos
            const { data: existing } = await supabase
              .from("unified_questions")
              .select("id")
              .eq("question_id", q.id)
              .single();

            const questionData = {
              question_id: q.id,
              meli_user_id: account.meli_user_id,
              account_alias: account.meli_user_id, // Se puede mejorar con alias
              item_id: q.item_id,
              item_title: itemTitle,
              item_thumbnail: itemThumbnail,
              buyer_id: q.from?.id,
              buyer_nickname: q.from?.nickname || "Comprador",
              status: q.status,
              question_text: q.text,
              created_at: q.date_created,
            };

            if (existing) {
              await supabase
                .from("unified_questions")
                .update(questionData)
                .eq("question_id", q.id);
              accountUpdated++;
            } else {
              await supabase
                .from("unified_questions")
                .insert(questionData);
              accountNew++;
            }

          } catch (e) {
            console.error(`[questions/sync] Error procesando pregunta ${q.id}:`, e);
            results.errors++;
          }
        }

        results.byAccount[account.meli_user_id] = questions.length;
        results.new += accountNew;
        results.updated += accountUpdated;
        results.total += questions.length;

      } catch (e) {
        console.error(`[questions/sync] Error cuenta ${account.meli_user_id}:`, e);
        results.errors++;
      }
    }

    console.log(`[questions/sync] Sincronización completada:`, results);

    return NextResponse.json({
      success: true,
      results,
    });

  } catch (error) {
    console.error("[questions/sync] Error fatal:", error);
    return NextResponse.json(
      { error: "Error interno", details: String(error) },
      { status: 500 }
    );
  }
}
