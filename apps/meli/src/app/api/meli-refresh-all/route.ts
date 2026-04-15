import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getValidToken, type LinkedMeliAccount } from "@/lib/meli";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key"
);

/**
 * POST /api/meli-refresh-all
 * 
 * Refresca los tokens de todas las cuentas MeLi del usuario.
 * Útil para renovar tokens antes de que expiren.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    let userId: string | null = null;
    
    if (authHeader?.startsWith("Bearer ")) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.slice(7));
      if (user) userId = user.id;
    }
    
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Obtener todas las cuentas del usuario
    const { data: accounts } = await supabase
      .from("linked_meli_accounts")
      .select("id, user_id, meli_user_id, meli_nickname, access_token_enc, refresh_token_enc, token_expiry_date, is_active")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ error: "No hay cuentas activas" }, { status: 404 });
    }

    const results = [];

    for (const account of accounts) {
      try {
        console.log(`[meli-refresh-all] Refrescando ${account.meli_nickname}...`);
        const token = await getValidToken(account as LinkedMeliAccount);
        
        results.push({
          account_id: account.id,
          nickname: account.meli_nickname,
          success: !!token,
          message: token ? "Token refrescado/verificado" : "No se pudo refrescar",
        });
      } catch (e) {
        results.push({
          account_id: account.id,
          nickname: account.meli_nickname,
          success: false,
          message: (e as Error).message,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    
    return NextResponse.json({
      message: `Tokens refrescados: ${successCount}/${accounts.length}`,
      results,
    });
  } catch (error) {
    console.error("[meli-refresh-all] Error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
