import { NextRequest, NextResponse } from "next/server";
import { getActiveAccounts, getValidToken, meliGet, getSupabase } from "@/lib/meli";

export const dynamic = "force-dynamic";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3,
  accountName: string
): Promise<Response | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.status === 502) {
        const waitTime = attempt * 1000;
        console.log(`[meli-questions] [${accountName}] 502, esperando ${waitTime}ms...`);
        await sleep(waitTime);
        continue;
      }
      return res;
    } catch (err: any) {
      console.error(`[meli-questions] [${accountName}] Error intento ${attempt}:`, err.message);
      if (attempt < maxRetries) await sleep(attempt * 1000);
    }
  }
  return null;
}

/**
 * GET /api/meli-questions
 * 
 * ?sync=true  → sincroniza desde MeLi API y guarda en DB antes de devolver
 * (default)   → trae directo de MeLi API para todas las cuentas activas
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shouldSync = searchParams.get("sync") === "true";

    // Si se pide sync, guardar en DB para el webhook/polling
    if (shouldSync) {
      try {
        const supabase = getSupabase();
        await syncQuestionsFromMeli(supabase);
      } catch (e) {
        console.warn("[meli-questions] Sync a DB falló, continuando con fetch directo:", e);
      }
    }

    // Siempre traer directo de MeLi API (fuente de verdad)
    return await fetchQuestionsDirectFromMeli();
  } catch (error) {
    console.error("[meli-questions] Error fatal:", error);
    return NextResponse.json([]);
  }
}

/**
 * Trae preguntas UNANSWERED de TODAS las cuentas activas directo desde MeLi API
 */
async function fetchQuestionsDirectFromMeli() {
  const accounts = await getActiveAccounts();
  if (!accounts.length) return NextResponse.json([]);

  const allQuestions: any[] = [];
  const itemCache = new Map<string, { title: string; thumbnail: string }>();

  // Procesar en batches de 2 cuentas
  const batchSize = 2;
  for (let i = 0; i < accounts.length; i += batchSize) {
    const batch = accounts.slice(i, i + batchSize);

    const batchResults = await Promise.all(
      batch.map(async (acc) => {
        try {
          const token = await getValidToken(acc);
          if (!token) return { acc, questions: [] };

          const res = await fetchWithRetry(
            `https://api.mercadolibre.com/questions/search?seller_id=${acc.meli_user_id}&status=UNANSWERED&limit=50&api_version=4`,
            { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20000) },
            3,
            acc.nickname
          );

          if (!res || !res.ok) return { acc, questions: [] };
          const data = await res.json();
          return { acc, questions: data.questions || [], token };
        } catch {
          return { acc, questions: [] };
        }
      })
    );

    for (const { acc, questions, token } of batchResults as any[]) {
      if (!questions.length) continue;

      // Obtener info de items únicos en paralelo
      const uniqueItemIds = [...new Set(questions.map((q: any) => String(q.item_id)))] as string[];
      await Promise.all(
        uniqueItemIds.map(async (itemId) => {
          if (itemCache.has(itemId)) return;
          try {
            const t = token || await getValidToken(acc);
            if (!t) return;
            const res = await fetch(`https://api.mercadolibre.com/items/${itemId}?attributes=id,title,thumbnail`, {
              headers: { Authorization: `Bearer ${t}` },
              signal: AbortSignal.timeout(5000),
            });
            if (res.ok) {
              const data = await res.json();
              itemCache.set(itemId, { title: data.title, thumbnail: data.thumbnail });
            }
          } catch {
            itemCache.set(itemId, { title: itemId, thumbnail: "" });
          }
        })
      );

      for (const q of questions) {
        const itemId = String(q.item_id);
        const itemInfo = itemCache.get(itemId) || { title: itemId, thumbnail: "" };
        allQuestions.push({
          meli_question_id: q.id,
          meli_account_id: String(acc.meli_user_id),
          item_id: itemId,
          item_title: itemInfo.title,
          item_thumbnail: (itemInfo.thumbnail || "").replace("http://", "https://"),
          buyer_id: q.from?.id || 0,
          buyer_nickname: q.from?.nickname || q.from?.id ? `Usuario ${q.from.id}` : "Comprador",
          question_text: q.text || "",
          status: q.status,
          date_created: q.date_created,
          answer_text: null,
          meli_accounts: { nickname: acc.nickname },
        });
      }
    }

    if (i + batchSize < accounts.length) await sleep(500);
  }

  allQuestions.sort((a, b) =>
    new Date(b.date_created).getTime() - new Date(a.date_created).getTime()
  );

  console.log(`[meli-questions] TOTAL: ${allQuestions.length} preguntas de ${accounts.length} cuentas`);

  const response = NextResponse.json(allQuestions);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

/**
 * Sincroniza preguntas UNANSWERED de todas las cuentas activas desde MeLi API → DB
 */
async function syncQuestionsFromMeli(supabase: any) {
  const accounts = await getActiveAccounts();

  for (const acc of accounts) {
    try {
      const token = await getValidToken(acc);
      if (!token) continue;

      const qRes = await meliGet(
        `/questions/search?seller_id=${acc.meli_user_id}&status=UNANSWERED&api_version=4&limit=50`,
        token
      ) as { questions?: any[] } | null;

      const questions = qRes?.questions ?? [];

      for (const q of questions) {
        try {
          const itemData = await meliGet(
            `/items/${q.item_id}?attributes=id,title,thumbnail`,
            token
          ) as { title?: string; thumbnail?: string } | null;

          await supabase
            .from("meli_questions_sync")
            .upsert({
              id: String(q.id),
              meli_user_id: String(acc.meli_user_id),
              item_id: q.item_id,
              title_item: itemData?.title || "Producto",
              item_thumbnail: (itemData?.thumbnail || "").replace("http://", "https://"),
              question_text: q.text || "",
              status: q.status || "UNANSWERED",
              buyer_nickname: q.from?.nickname || `Usuario ${q.from?.id || ""}`,
              buyer_id: q.from?.id || null,
              meli_created_date: q.date_created,
              account_nickname: acc.nickname,
              updated_at: new Date().toISOString(),
            }, { onConflict: "id" });
        } catch (e) {
          console.warn(`[sync] Error pregunta ${q.id}:`, e);
        }
      }

      // Marcar como ANSWERED las que ya no aparecen
      const meliIds = questions.map((q: any) => String(q.id));
      const { data: dbQuestions } = await supabase
        .from("meli_questions_sync")
        .select("id")
        .eq("meli_user_id", String(acc.meli_user_id))
        .eq("status", "UNANSWERED");

      if (dbQuestions) {
        const staleIds = dbQuestions
          .filter((dbQ: any) => !meliIds.includes(dbQ.id))
          .map((dbQ: any) => dbQ.id);
        if (staleIds.length > 0) {
          await supabase
            .from("meli_questions_sync")
            .update({ status: "ANSWERED", updated_at: new Date().toISOString() })
            .in("id", staleIds);
        }
      }
    } catch (e) {
      console.error(`[sync] Error cuenta ${acc.nickname}:`, e);
    }
  }
}
