import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

/**
 * GET /api/meli-dashboard-debug
 * 
 * Endpoint de debug para verificar el estado del dashboard.
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

    // Obtener cuentas
    const { data: accounts, error: accountsError } = await supabase
      .from("linked_meli_accounts")
      .select("id, meli_user_id, meli_nickname, access_token_enc, is_active")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (accountsError) {
      return NextResponse.json({ error: "Error al obtener cuentas", details: accountsError }, { status: 500 });
    }

    // Verificar tokens
    const accountStatus = accounts?.map(acc => ({
      id: acc.id,
      nickname: acc.meli_nickname,
      meli_user_id: acc.meli_user_id,
      has_token: !!acc.access_token_enc,
      token_valid: acc.access_token_enc?.startsWith('APP_USR') || false,
      token_preview: acc.access_token_enc?.substring(0, 30) + '...'
    }));

    // Probar una llamada a MeLi
    let apiTest = null;
    if (accounts && accounts.length > 0) {
      const testAccount = accounts[0];
      try {
        const res = await fetch(
          `https://api.mercadolibre.com/users/${testAccount.meli_user_id}?attributes=seller_reputation,nickname`,
          {
            headers: { Authorization: `Bearer ${testAccount.access_token_enc}` },
            signal: AbortSignal.timeout(5000),
          }
        );
        apiTest = {
          account: testAccount.meli_nickname,
          status: res.status,
          ok: res.ok,
          statusText: res.statusText,
        };
      } catch (e) {
        apiTest = {
          account: testAccount.meli_nickname,
          error: String(e),
        };
      }
    }

    return NextResponse.json({
      user_id: userId,
      accounts_count: accounts?.length || 0,
      accounts: accountStatus,
      api_test: apiTest,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Error interno", details: String(error) },
      { status: 500 }
    );
  }
}
