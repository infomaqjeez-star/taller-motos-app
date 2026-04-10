import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseServiceKey || "placeholder-key"
);

/**
 * GET /api/meli-publications
 * 
 * Obtiene las publicaciones de Mercado Libre del usuario.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "active";
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

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

    // Obtener las cuentas del usuario
    const { data: accounts } = await supabase
      .from("linked_meli_accounts")
      .select("id, meli_nickname")
      .eq("user_id", userId);

    if (!accounts || accounts.length === 0) {
      return NextResponse.json([]);
    }

    const accountIds = accounts.map(a => a.id);

    // Obtener publicaciones
    const { data: items, error } = await supabase
      .from("meli_items")
      .select(`
        id,
        item_id,
        meli_account_id,
        title,
        price,
        currency_id,
        available_quantity,
        sold_quantity,
        thumbnail,
        status,
        permalink,
        category_id,
        date_created,
        last_updated,
        meli_accounts:meli_account_id (nickname)
      `)
      .in("meli_account_id", accountIds)
      .eq("status", status)
      .order("last_updated", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("[meli-publications] Error:", error);
      return NextResponse.json([]);
    }

    return NextResponse.json(items || []);
  } catch (error) {
    console.error("[meli-publications] Error inesperado:", error);
    return NextResponse.json([]);
  }
}
