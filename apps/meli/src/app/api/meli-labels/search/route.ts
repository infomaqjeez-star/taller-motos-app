import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Forzar renderizado dinámico - evita error de generación estática
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseServiceKey || "placeholder-key"
);

/**
 * GET /api/meli-labels/search
 * 
 * Busca etiquetas impresas en el historial.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const all = searchParams.get("all") === "true";

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
      .select("id")
      .eq("user_id", userId);

    if (!accounts || accounts.length === 0) {
      return NextResponse.json([]);
    }

    const accountIds = accounts.map(a => a.id);

    // Construir la consulta
    let query = supabase
      .from("meli_orders")
      .select(`
        id,
        order_id,
        meli_account_id,
        buyer_nickname,
        item_title,
        item_thumbnail,
        total_amount,
        status,
        shipping_id,
        date_created,
        printed,
        printed_at,
        meli_accounts:meli_account_id (nickname)
      `)
      .in("meli_account_id", accountIds)
      .eq("printed", true)
      .order("printed_at", { ascending: false })
      .limit(limit);

    // Aplicar búsqueda si hay query
    if (q && q.trim() !== "") {
      query = query.or(`buyer_nickname.ilike.%${q}%,item_title.ilike.%${q}%,order_id.ilike.%${q}%`);
    }

    const { data: labels, error } = await query;

    if (error) {
      console.error("[meli-labels/search] Error:", error);
      return NextResponse.json([]);
    }

    return NextResponse.json(labels || []);
  } catch (error) {
    console.error("[meli-labels/search] Error inesperado:", error);
    return NextResponse.json([]);
  }
}
