import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getValidToken, type LinkedMeliAccount } from "@/lib/meli";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key"
);

const CRON_SECRET = process.env.CRON_SECRET || "";

/**
 * GET /api/cron/refresh-tokens
 * 
 * Cron job para refrescar tokens de todas las cuentas antes de que expiren.
 * Corre cada 6 horas para mantener los tokens frescos.
 * Protegido con CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  // Verificar secret
  const authHeader = request.headers.get("authorization");
  const secret = authHeader?.replace("Bearer ", "") || request.nextUrl.searchParams.get("secret");
  
  if (CRON_SECRET && secret !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Obtener todas las cuentas activas
    const { data: accounts } = await supabase
      .from("linked_meli_accounts")
      .select("id, user_id, meli_user_id, meli_nickname, access_token_enc, refresh_token_enc, token_expiry_date, is_active")
      .eq("is_active", true);

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ message: "No hay cuentas activas" });
    }

    console.log(`[cron/refresh-tokens] Refrescando ${accounts.length} cuentas...`);

    let refreshed = 0;
    let failed = 0;

    for (const account of accounts) {
      try {
        // Verificar si el token está por expirar (menos de 1 hora)
        const expiryDate = account.token_expiry_date;
        const oneHourFromNow = Date.now() + 60 * 60 * 1000;
        
        if (expiryDate && new Date(expiryDate).getTime() > oneHourFromNow) {
          // Token todavía válido por más de 1 hora, saltear
          continue;
        }

        console.log(`[cron/refresh-tokens] Refrescando ${account.meli_nickname}...`);
        const token = await getValidToken(account as LinkedMeliAccount);
        
        if (token) {
          refreshed++;
          console.log(`[cron/refresh-tokens] ✓ ${account.meli_nickname} OK`);
        } else {
          failed++;
          console.error(`[cron/refresh-tokens] ✗ ${account.meli_nickname} FALLÓ`);
        }
      } catch (e) {
        failed++;
        console.error(`[cron/refresh-tokens] ✗ ${account.meli_nickname} ERROR:`, e);
      }
    }

    return NextResponse.json({
      message: "Proceso completado",
      total: accounts.length,
      refreshed,
      failed,
      skipped: accounts.length - refreshed - failed,
    });
  } catch (error) {
    console.error("[cron/refresh-tokens] Error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
