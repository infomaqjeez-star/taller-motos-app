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
 * GET /api/meli-labels
 * 
 * Obtiene las etiquetas/Ã³rdenes listas para imprimir.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "ready_to_ship";
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

    // Obtener las cuentas del usuario
    const { data: accounts } = await supabase
      .from("linked_meli_accounts")
      .select("id")
      .eq("user_id", userId);

    if (!accounts || accounts.length === 0) {
      return NextResponse.json([]);
    }

    const accountIds = accounts.map(a => a.id);

    // Obtener Ã³rdenes/etiquetas
    const { data: labels, error } = await supabase
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
      .eq("status", status)
      .order("date_created", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[meli-labels] Error:", error);
      return NextResponse.json([]);
    }

    return NextResponse.json(labels || []);
  } catch (error) {
    console.error("[meli-labels] Error inesperado:", error);
    return NextResponse.json([]);
  }
}

/**
 * POST /api/meli-labels
 * 
 * Marca etiquetas como impresas.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { order_ids, printed = true } = body;

    if (!Array.isArray(order_ids) || order_ids.length === 0) {
      return NextResponse.json(
        { error: "Se requiere un array de order_ids" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("meli_orders")
      .update({
        printed,
        printed_at: printed ? new Date().toISOString() : null,
      })
      .in("order_id", order_ids);

    if (error) {
      return NextResponse.json(
        { error: "Error al actualizar etiquetas" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, updated: order_ids.length });
  } catch (error) {
    console.error("[meli-labels] Error inesperado:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}