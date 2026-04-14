import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Forzar renderizado dinámico - evita error de generación estática
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key";

const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseServiceKey || "placeholder-key"
);

/**
 * GET /api/meli-promotions
 * 
 * Obtiene las promociones de Mercado Libre y logs.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    // Obtener el usuario actual
    const authHeader = request.headers.get("authorization");
    let userId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) userId = user.id;
    }

    if (!userId) {
      return NextResponse.json([]);
    }

    // Si se solicitan logs
    if (action === "logs") {
      const { data: logs, error } = await supabase
        .from("promotions_log")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("[meli-promotions] Error:", error);
        return NextResponse.json([]);
      }

      return NextResponse.json(logs || []);
    }

    // Obtener promociones de Mercado Libre
    const { data: promotions, error } = await supabase
      .from("meli_promotions")
      .select(`
        id,
        promotion_id,
        name,
        discount_type,
        discount_value,
        start_date,
        end_date,
        status,
        meli_account_id,
        meli_accounts:meli_account_id (nickname)
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[meli-promotions] Error:", error);
      return NextResponse.json([]);
    }

    return NextResponse.json(promotions || []);
  } catch (error) {
    console.error("[meli-promotions] Error inesperado:", error);
    return NextResponse.json([]);
  }
}
