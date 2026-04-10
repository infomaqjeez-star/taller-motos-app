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
 * POST /api/meli-price-update
 * 
 * Actualiza el precio de una publicaciÃ³n.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { item_id, new_price, meli_account_id } = body;

    if (!item_id || !new_price || !meli_account_id) {
      return NextResponse.json(
        { error: "Faltan campos requeridos: item_id, new_price, meli_account_id" },
        { status: 400 }
      );
    }

    // Obtener el usuario actual
    const authHeader = request.headers.get("authorization");
    let userId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) userId = user.id;
    }

    if (!userId) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    // Verificar que la cuenta pertenezca al usuario
    const { data: account } = await supabase
      .from("linked_meli_accounts")
      .select("id")
      .eq("id", meli_account_id)
      .eq("user_id", userId)
      .single();

    if (!account) {
      return NextResponse.json(
        { error: "Cuenta no encontrada o no autorizada" },
        { status: 404 }
      );
    }

    // Actualizar el precio en la base de datos
    const { error } = await supabase
      .from("meli_items")
      .update({
        price: new_price,
        last_updated: new Date().toISOString(),
      })
      .eq("item_id", item_id)
      .eq("meli_account_id", meli_account_id);

    if (error) {
      console.error("[meli-price-update] Error:", error);
      return NextResponse.json(
        { error: "Error al actualizar precio" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Precio actualizado correctamente",
      item_id,
      new_price,
    });
  } catch (error) {
    console.error("[meli-price-update] Error inesperado:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}