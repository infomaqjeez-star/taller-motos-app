import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Importar getValidToken del route padre
import { decrypt } from "@/lib/meli";

async function getTokenForAccount(account: any): Promise<string | null> {
  try {
    if (!account.access_token_enc) return null;
    
    // Check expiry
    if (account.token_expiry_date) {
      const expiry = new Date(account.token_expiry_date);
      if (expiry <= new Date()) {
        return null; // Token expired - would need refresh
      }
    }
    
    const token = await decrypt(account.access_token_enc);
    return token || null;
  } catch {
    return null;
  }
}

/**
 * GET /api/meli-questions-unified/debug
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const results: any[] = [];

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get ALL linked accounts (not just for one user)
    const { data: accounts, error } = await supabase
      .from("linked_meli_accounts")
      .select("id, user_id, meli_user_id, meli_nickname, access_token_enc, refresh_token_enc, token_expiry_date, is_active")
      .eq("is_active", true);

    if (error) {
      return NextResponse.json({ error: error.message, table: "linked_meli_accounts" }, { status: 500 });
    }

    if (!accounts?.length) {
      // Try the other table too
      const { data: accounts2, error: error2 } = await supabase
        .from("meli_accounts")
        .select("*")
        .eq("status", "active");
      
      return NextResponse.json({
        linked_meli_accounts: { count: 0, error: null },
        meli_accounts: { count: accounts2?.length ?? 0, error: error2?.message ?? null, sample: accounts2?.[0] ? Object.keys(accounts2[0]) : [] },
        message: "No active accounts found in linked_meli_accounts"
      });
    }

    for (const acc of accounts) {
      const entry: any = {
        nickname: acc.meli_nickname,
        meli_user_id: acc.meli_user_id,
        user_id: acc.user_id,
        is_active: acc.is_active,
        token_expiry: acc.token_expiry_date,
        has_access_token: !!acc.access_token_enc,
        has_refresh_token: !!acc.refresh_token_enc,
      };

      try {
        const token = await getTokenForAccount(acc);
        if (!token) {
          entry.token_status = "FAILED - could not decrypt or expired";
          entry.token_expired = acc.token_expiry_date ? new Date(acc.token_expiry_date) <= new Date() : "no_expiry_date";
          results.push(entry);
          continue;
        }
        entry.token_status = "OK";
        entry.token_preview = `${token.substring(0, 8)}...${token.slice(-4)} (${token.length} chars)`;

        // 1. Verify token owner
        const meRes = await fetch("https://api.mercadolibre.com/users/me", {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(5000),
        });
        if (meRes.ok) {
          const me = await meRes.json();
          entry.token_owner = { id: me.id, nickname: me.nickname };
          entry.seller_id_match = String(me.id) === String(acc.meli_user_id);
        } else {
          entry.token_owner = { error: meRes.status, body: (await meRes.text()).substring(0, 150) };
        }

        // 2. Questions with seller_id
        const qRes = await fetch(
          `https://api.mercadolibre.com/questions/search?seller_id=${acc.meli_user_id}&api_version=4&limit=3`,
          { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(5000) }
        );
        const qData = await qRes.json();
        entry.questions_seller_id = {
          http_status: qRes.status,
          total: qData.total ?? "missing",
          count: qData.questions?.length ?? 0,
          error: qData.error || null,
          message: qData.message || null,
          first: qData.questions?.[0] ? { id: qData.questions[0].id, status: qData.questions[0].status, text: qData.questions[0].text?.substring(0, 40) } : null,
        };

        // 3. /my/received_questions/search
        const myRes = await fetch(
          `https://api.mercadolibre.com/my/received_questions/search?api_version=4&limit=3`,
          { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(5000) }
        );
        const myData = await myRes.json();
        entry.my_received_questions = {
          http_status: myRes.status,
          total: myData.total ?? "missing",
          count: myData.questions?.length ?? 0,
          first: myData.questions?.[0] ? { id: myData.questions[0].id, status: myData.questions[0].status } : null,
        };

        // 4. Response time
        const rtRes = await fetch(
          `https://api.mercadolibre.com/users/${acc.meli_user_id}/questions/response_time`,
          { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(5000) }
        );
        entry.response_time = rtRes.ok
          ? await rtRes.json()
          : { error: rtRes.status, body: (await rtRes.text()).substring(0, 150) };

      } catch (err: any) {
        entry.error = err.message;
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
