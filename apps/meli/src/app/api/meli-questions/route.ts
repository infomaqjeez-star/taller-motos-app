import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getValidToken } from "@/lib/meli";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key"
);

/**
 * GET /api/meli-questions
 *
 * Obtiene preguntas sin responder de todas las cuentas MeLi del usuario,
 * directamente desde la API de Mercado Libre.
 */
export async function GET(request: NextRequest) {
  try {
    // Auth
    const authHeader = request.headers.get("authorization");
    let userId: string | null = null;
    if (authHeader?.startsWith("Bearer ")) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.slice(7));
      if (user) userId = user.id;
    }
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Obtener cuentas activas
    const { data: accounts } = await supabase
      .from("linked_meli_accounts")
      .select("id, meli_user_id, meli_nickname, access_token_enc, refresh_token_enc, token_expiry_date")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (!accounts || accounts.length === 0) {
      return NextResponse.json([]);
    }

    // Fetch preguntas de todas las cuentas en paralelo
    const allQuestions: any[] = [];

    console.log(`[meli-questions] Procesando ${accounts.length} cuentas...`);

    await Promise.all(
      accounts.map(async (account: any) => {
        try {
          console.log(`[meli-questions] Cuenta: ${account.meli_nickname} (ID: ${account.meli_user_id})`);
          
          const validToken = await getValidToken(account);
          if (!validToken) {
            console.log(`[meli-questions] No se pudo obtener token válido para ${account.meli_nickname}`);
            return;
          }

          const headers = { Authorization: `Bearer ${validToken}` };

          // Preguntas sin responder - usar /my/questions que requiere el token de la cuenta
          const url = "https://api.mercadolibre.com/my/questions?status=UNANSWERED&sort_fields=date_created&sort_types=DESC&limit=50";
          console.log(`[meli-questions] Fetching: ${url}`);
          
          const qRes = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
          
          console.log(`[meli-questions] Response status: ${qRes.status} ${qRes.statusText}`);
          
          if (!qRes.ok) {
            const errorText = await qRes.text().catch(() => "Unknown error");
            console.error(`[meli-questions] Error ${qRes.status} para ${account.meli_nickname}: ${errorText}`);
            return;
          }
          
          const qData = await qRes.json();
          const questions: any[] = qData.questions || [];
          
          console.log(`[meli-questions] ${account.meli_nickname}: ${questions.length} preguntas encontradas`);

          if (questions.length === 0) return;

          // Obtener thumbnails de items en lotes de 20
          const itemIds = Array.from(new Set(questions.map((q: any) => q.item_id).filter(Boolean))) as string[];
          const itemMap: Record<string, { title: string; thumbnail: string }> = {};

          const chunks: string[][] = [];
          for (let i = 0; i < itemIds.length; i += 20) {
            chunks.push(itemIds.slice(i, i + 20));
          }
          await Promise.all(
            chunks.map(async (chunk) => {
              try {
                const iRes = await fetch(
                  `https://api.mercadolibre.com/items?ids=${chunk.join(",")}`,
                  { headers, signal: AbortSignal.timeout(5000) }
                );
                if (!iRes.ok) return;
                const items: any[] = await iRes.json();
                for (const item of items) {
                  if (item?.body?.id) {
                    itemMap[item.body.id] = {
                      title: item.body.title || "",
                      thumbnail: item.body.thumbnail || "",
                    };
                  }
                }
              } catch { /* ignorar errores de batch */ }
            })
          );

          // Mapear al formato que espera la página
          for (const q of questions) {
            const itemInfo = itemMap[q.item_id] || { title: "", thumbnail: "" };
            allQuestions.push({
              id:               String(q.id),
              meli_question_id: q.id,
              meli_account_id:  account.id,
              item_id:          q.item_id || null,
              item_title:       itemInfo.title,
              item_thumbnail:   itemInfo.thumbnail,
              buyer_id:         q.from?.id || null,
              buyer_nickname:   q.from?.nickname || "Comprador",
              question_text:    q.text || "",
              status:           q.status || "UNANSWERED",
              date_created:     q.date_created || new Date().toISOString(),
              answer_text:      q.answer?.text || null,
              answer_date:      q.answer?.date_created || null,
              meli_accounts:    { nickname: account.meli_nickname },
            });
          }
        } catch (err) { 
          console.error(`[meli-questions] Error procesando cuenta ${account.meli_nickname}:`, err);
        }
      })
    );

    // Ordenar por fecha descendente
    allQuestions.sort((a, b) =>
      new Date(b.date_created).getTime() - new Date(a.date_created).getTime()
    );

    console.log(`[meli-questions] Total preguntas devueltas: ${allQuestions.length}`);

    return NextResponse.json(allQuestions);
  } catch (error) {
    console.error("[meli-questions] Error inesperado:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
