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
 * POST /api/meli-labels/validate
 * 
 * Valida que las Ã³rdenes existan y estÃ©n listas para imprimir.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { order_ids } = body;

    if (!Array.isArray(order_ids) || order_ids.length === 0) {
      return NextResponse.json(
        { error: "Se requiere un array de order_ids" },
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

    // Obtener las cuentas del usuario
    const { data: accounts } = await supabase
      .from("linked_meli_accounts")
      .select("id")
      .eq("user_id", userId);

    if (!accounts || accounts.length === 0) {
      return NextResponse.json(
        { error: "No hay cuentas vinculadas" },
        { status: 404 }
      );
    }

    const accountIds = accounts.map(a => a.id);

    // Verificar que las Ã³rdenes existan y pertenezcan al usuario
    const { data: orders, error } = await supabase
      .from("meli_orders")
      .select("order_id, status, printed")
      .in("order_id", order_ids)
      .in("meli_account_id", accountIds);

    if (error) {
      return NextResponse.json(
        { error: "Error al validar Ã³rdenes" },
        { status: 500 }
      );
    }

    const foundOrderIds = orders?.map(o => o.order_id) || [];
    const missingOrders = order_ids.filter(id => !foundOrderIds.includes(id));

    return NextResponse.json({
      valid: missingOrders.length === 0,
      found: orders || [],
      missing: missingOrders,
      total: order_ids.length,
    });
  } catch (error) {
    console.error("[meli-labels/validate] Error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}