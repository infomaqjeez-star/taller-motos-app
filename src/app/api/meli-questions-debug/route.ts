import { NextResponse } from "next/server";

const SUPA_URL    = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY    = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET() {
  const debug: Record<string, unknown> = {
    supa_url_set: !!SUPA_URL,
    anon_key_set: !!ANON_KEY,
    service_key_set: !!SERVICE_KEY,
    edge_url: `${SUPA_URL}/functions/v1/appjeez-meli-unify-questions`,
  };

  // Check accounts directly
  try {
    const accRes = await fetch(
      `${SUPA_URL}/rest/v1/meli_accounts?select=id,nickname,status,meli_user_id&status=eq.active`,
      {
        headers: {
          Authorization: `Bearer ${SERVICE_KEY}`,
          apikey: SERVICE_KEY,
          "Content-Type": "application/json",
        },
      }
    );
    const accounts = await accRes.json();
    debug.accounts_count = Array.isArray(accounts) ? accounts.length : "error";
    debug.accounts = Array.isArray(accounts)
      ? accounts.map((a: { nickname: string; meli_user_id: string }) => ({
          nickname: a.nickname,
          meli_user_id: a.meli_user_id,
        }))
      : accounts;
  } catch (e) {
    debug.accounts_error = (e as Error).message;
  }

  // Call Edge Function
  try {
    const efRes = await fetch(
      `${SUPA_URL}/functions/v1/appjeez-meli-unify-questions`,
      {
        headers: {
          Authorization: `Bearer ${ANON_KEY}`,
          "x-debug": "true",
        },
      }
    );
    debug.ef_status = efRes.status;
    debug.ef_ok = efRes.ok;
    const body = await efRes.text();
    try {
      debug.ef_body = JSON.parse(body);
    } catch {
      debug.ef_body_raw = body.slice(0, 500);
    }
  } catch (e) {
    debug.ef_error = (e as Error).message;
  }

  return NextResponse.json(debug, { status: 200 });
}
