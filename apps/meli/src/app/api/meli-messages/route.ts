import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getActiveAccounts, getValidToken, meliGet } from "@/lib/meli";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sync = searchParams.get("sync") === "true";
    
    // Usar la función getActiveAccounts del lib/meli (igual que meli-questions)
    const accounts = await getActiveAccounts();
    
    if (!accounts.length) {
      return NextResponse.json({ 
        ok: true,
        questions: [],
        source: "none",
        count: 0,
        message: "No hay cuentas configuradas"
      });
    }

    // Sincronizar desde MeLi directamente (sin caché por ahora)
    console.log("[Mensajes] Sincronizando desde MeLi...");
    const allQuestions: any[] = [];
    
    for (const account of accounts) {
      try {
        const token = await getValidToken(account);
        if (!token) {
          console.log(`[Mensajes] Token inválido para ${account.nickname}`);
          continue;
        }

        const meliUserId = String(account.meli_user_id);
        
        // Usar el mismo endpoint que funciona en meli-questions
        const url = `https://api.mercadolibre.com/questions/search?seller_id=${meliUserId}&status=UNANSWERED&limit=50`;
        const qRes = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

        if (!qRes.ok) {
          console.log(`[Mensajes] Error MeLi para ${account.nickname}: ${qRes.status}`);
          continue;
        }

        const qData = await qRes.json() as {
          questions?: Array<{
            id: string;
            item_id: string;
            status: string;
            text: string;
            date_created: string;
            from?: { id: number; nickname?: string };
          }>;
          total?: number;
        };

        const questions = qData.questions || [];
        console.log(`[Mensajes] ${account.nickname}: ${questions.length} preguntas`);

        // Cache de items
        const itemCache: Record<string, { title: string; thumbnail: string }> = {};

        for (const q of questions) {
          // Obtener datos del item si no está en caché
          if (!itemCache[q.item_id]) {
            try {
              const iRes = await fetch(
                `https://api.mercadolibre.com/items/${q.item_id}?attributes=id,title,thumbnail`,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              if (iRes.ok) {
                const iData = await iRes.json() as { title?: string; thumbnail?: string };
                itemCache[q.item_id] = { 
                  title: iData.title ?? q.item_id, 
                  thumbnail: (iData.thumbnail ?? "").replace("http://", "https://") 
                };
              } else {
                itemCache[q.item_id] = { title: q.item_id, thumbnail: "" };
              }
            } catch { 
              itemCache[q.item_id] = { title: q.item_id, thumbnail: "" }; 
            }
          }

          allQuestions.push({
            id: q.id,
            meli_question_id: parseInt(q.id),
            meli_account_id: account.id,
            item_id: q.item_id,
            item_title: itemCache[q.item_id].title,
            item_thumbnail: itemCache[q.item_id].thumbnail,
            buyer_id: q.from?.id ?? 0,
            buyer_nickname: q.from?.nickname || "Usuario",
            question_text: q.text,
            status: q.status,
            date_created: q.date_created,
            answer_text: null,
            meli_accounts: { nickname: account.nickname },
          });
        }
      } catch (e) {
        console.error(`[Mensajes] Error sincronizando cuenta ${account.nickname}:`, e);
      }
    }

    console.log(`[Mensajes] Total: ${allQuestions.length} preguntas`);

    return NextResponse.json({
      ok: true,
      questions: allQuestions,
      source: "meli",
      count: allQuestions.length,
    });

  } catch (error) {
    console.error("[Mensajes] Error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: (error as Error).message },
      { status: 500 }
    );
  }
}