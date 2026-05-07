import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseServiceKey || "placeholder-key"
);

/**
 * GET /api/meli-account/[userId]
 * 
 * Obtiene los datos detallados de una cuenta específica de Mercado Libre.
 * Incluye reputación, publicaciones activas y estadísticas de stock.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;

    if (!userId) {
      return NextResponse.json(
        { error: "userId es requerido" },
        { status: 400 }
      );
    }

    // Obtener el usuario actual
    const authHeader = request.headers.get("authorization");
    let currentUserId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) currentUserId = user.id;
    }

    if (!currentUserId) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    // Obtener la cuenta de Mercado Libre
    const { data: account, error: accountError } = await supabase
      .from("linked_meli_accounts")
      .select("id, meli_user_id, meli_nickname")
      .eq("meli_user_id", userId)
      .eq("user_id", currentUserId)
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { error: "Cuenta no encontrada" },
        { status: 404 }
      );
    }

    // Obtener publicaciones activas
    const { data: items, error: itemsError } = await supabase
      .from("meli_items")
      .select("id, item_id, title, status, available_quantity, price, currency_id")
      .eq("meli_account_id", account.id)
      .eq("status", "active");

    if (itemsError) {
      console.error("[meli-account] Error obteniendo items:", itemsError);
    }

    // Calcular estadísticas
    const activeItems = items || [];
    const totalActiveItems = activeItems.length;
    const itemsLowStock = activeItems.filter((item) => 
      item.available_quantity > 0 && item.available_quantity <= 5
    ).length;
    const itemsOutOfStock = activeItems.filter((item) => 
      item.available_quantity === 0
    ).length;

    // Construir respuesta con datos de reputación por defecto
    const responseData = {
      reputation: {
        level_id: null,
        level_name: "Sin datos",
        power_seller_status: null,
        transactions_total: 0,
        transactions_completed: 0,
        ratings_positive: 0,
        ratings_negative: 0,
        ratings_neutral: 0,
        delayed_handling_time: 0,
        claims: 0,
        cancellations: 0,
        immediate_payment: false,
      },
      items: activeItems.map((item) => ({
        id: item.item_id,
        title: item.title,
        status: item.status,
        available_quantity: item.available_quantity,
        total_quantity: item.available_quantity,
        price: item.price,
        currency_id: item.currency_id,
      })),
      stats: {
        total_active_items: totalActiveItems,
        items_low_stock: itemsLowStock,
        items_out_of_stock: itemsOutOfStock,
      },
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("[meli-account] Error inesperado:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
