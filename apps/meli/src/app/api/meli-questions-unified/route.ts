import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getValidToken } from "@/lib/meli";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Forzar renderizado dinámico
export const dynamic = 'force-dynamic';

/**
 * GET /api/meli-questions-unified
 * 
 * Obtiene preguntas de todas las cuentas de Mercado Libre del usuario
 * Se ejecuta en el servidor para evitar problemas de CORS
 */
export async function GET(request: NextRequest) {
  try {
    // Obtener el usuario actual
    const authHeader = request.headers.get("authorization");
    let userId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        userId = user.id;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Obtener cuentas del usuario
    const { data: accounts, error: accountsError } = await supabase
      .from("linked_meli_accounts")
      .select("id, meli_user_id, meli_nickname, access_token_enc, refresh_token_enc, token_expiry_date")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (accountsError || !accounts || accounts.length === 0) {
      return NextResponse.json({ questions: [], accounts: [] });
    }

    // Obtener preguntas de cada cuenta
    const results = await Promise.allSettled(
      accounts.map(async (account) => {
        try {
          // Obtener token válido
          const token = await getValidToken(account as any);
          
          if (!token) {
            console.log(`[meli-questions] ❌ No hay token para ${account.meli_nickname}`);
            return {
              accountId: account.id,
              nickname: account.meli_nickname,
              sellerId: account.meli_user_id,
              questions: [],
              total: 0,
              error: "token_expired",
            };
          }

          // Llamar a API de MeLi
          const response = await fetch(
            `https://api.mercadolibre.com/questions/search?seller_id=${account.meli_user_id}&api_version=4&limit=100`,
            {
              headers: { Authorization: `Bearer ${token}` },
              next: { revalidate: 0 },
            }
          );

          if (!response.ok) {
            console.error(`[meli-questions] ❌ Error API para ${account.meli_nickname}:`, response.status);
            return {
              accountId: account.id,
              nickname: account.meli_nickname,
              sellerId: account.meli_user_id,
              questions: [],
              total: 0,
              error: `HTTP ${response.status}`,
            };
          }

          const data = await response.json();

          return {
            accountId: account.id,
            nickname: account.meli_nickname,
            sellerId: account.meli_user_id,
            questions: data.questions || [],
            total: data.total || data.paging?.total || 0,
          };
        } catch (error) {
          console.error(`[meli-questions] ❌ Error para ${account.meli_nickname}:`, error);
          return {
            accountId: account.id,
            nickname: account.meli_nickname,
            sellerId: account.meli_user_id,
            questions: [],
            total: 0,
            error: error instanceof Error ? error.message : "Error desconocido",
          };
        }
      })
    );

    const questions = results.map((result) =>
      result.status === "fulfilled" ? result.value : {
        accountId: "",
        nickname: "",
        sellerId: "",
        questions: [],
        total: 0,
        error: "Promise rejected",
      }
    );

    return NextResponse.json({ questions });
  } catch (error) {
    console.error("[meli-questions] Error inesperado:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
