import { NextResponse } from "next/server";
import { getActiveAccounts, getValidToken } from "@/lib/meli";

export const dynamic = "force-dynamic";

/**
 * GET /api/meli-questions-unified/debug
 * 
 * Diagnóstico: muestra token, seller_id, y respuesta cruda de MeLi para cada cuenta
 */
export async function GET() {
  const startTime = Date.now();
  const results: any[] = [];

  try {
    const accounts = await getActiveAccounts();
    
    for (const acc of accounts) {
      const entry: any = {
        nickname: acc.meli_nickname,
        meli_user_id: acc.meli_user_id,
        id: acc.id,
        status: acc.status,
        token: null,
        token_error: null,
        meli_me: null,
        questions_raw: null,
        questions_error: null,
      };

      try {
        const token = await getValidToken(acc);
        if (!token) {
          entry.token_error = "getValidToken returned null";
          results.push(entry);
          continue;
        }
        entry.token = `${token.substring(0, 8)}...${token.slice(-6)} (len:${token.length})`;

        // 1. Verificar quién es el dueño del token
        const meRes = await fetch("https://api.mercadolibre.com/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (meRes.ok) {
          const me = await meRes.json();
          entry.meli_me = { id: me.id, nickname: me.nickname, site_id: me.site_id };
          entry.token_owner_matches = String(me.id) === String(acc.meli_user_id);
        } else {
          entry.meli_me = { error: `HTTP ${meRes.status}`, body: (await meRes.text()).substring(0, 200) };
        }

        // 2. Probar preguntas con seller_id del token owner (no el de la DB)
        const actualSellerId = entry.meli_me?.id || acc.meli_user_id;
        
        // 2a. Con seller_id de la DB
        const qRes1 = await fetch(
          `https://api.mercadolibre.com/questions/search?seller_id=${acc.meli_user_id}&api_version=4&limit=2`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const qData1 = await qRes1.json();
        entry.questions_with_db_seller_id = {
          seller_id_used: acc.meli_user_id,
          status: qRes1.status,
          total: qData1.total ?? qData1.paging?.total ?? "?",
          count: qData1.questions?.length ?? 0,
          error: qData1.error || null,
          message: qData1.message || null,
          keys: Object.keys(qData1),
        };

        // 2b. Con /my/received_questions/search (alternativo del PDF)
        const qRes2 = await fetch(
          `https://api.mercadolibre.com/my/received_questions/search?api_version=4&limit=2`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const qData2 = await qRes2.json();
        entry.questions_my_received = {
          status: qRes2.status,
          total: qData2.total ?? qData2.paging?.total ?? "?",
          count: qData2.questions?.length ?? 0,
          error: qData2.error || null,
          first_question: qData2.questions?.[0] ? {
            id: qData2.questions[0].id,
            status: qData2.questions[0].status,
            text: qData2.questions[0].text?.substring(0, 50),
            item_id: qData2.questions[0].item_id,
          } : null,
        };

        // 2c. Con seller_id del token owner (si es diferente)
        if (String(actualSellerId) !== String(acc.meli_user_id)) {
          const qRes3 = await fetch(
            `https://api.mercadolibre.com/questions/search?seller_id=${actualSellerId}&api_version=4&limit=2`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const qData3 = await qRes3.json();
          entry.questions_with_real_seller_id = {
            seller_id_used: actualSellerId,
            status: qRes3.status,
            total: qData3.total ?? "?",
            count: qData3.questions?.length ?? 0,
          };
        }

        // 3. Response time
        const rtRes = await fetch(
          `https://api.mercadolibre.com/users/${actualSellerId}/questions/response_time`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        entry.response_time = {
          status: rtRes.status,
          data: rtRes.ok ? await rtRes.json() : (await rtRes.text()).substring(0, 200),
        };

      } catch (err: any) {
        entry.questions_error = err.message;
      }

      results.push(entry);
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  return NextResponse.json({
    duration_ms: Date.now() - startTime,
    accounts_count: results.length,
    results,
  });
}
