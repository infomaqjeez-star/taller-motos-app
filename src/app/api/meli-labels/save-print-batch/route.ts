import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseServiceKey || "placeholder-key"
);

/**
 * POST /api/meli-labels/save-print-batch
 * 
 * Guarda un lote de etiquetas impresas y genera el PDF combinado.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { order_ids, print_date } = body;

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

    // Marcar órdenes como impresas
    const { error: updateError } = await supabase
      .from("meli_orders")
      .update({
        printed: true,
        printed_at: print_date || new Date().toISOString(),
      })
      .in("order_id", order_ids);

    if (updateError) {
      return NextResponse.json(
        { error: "Error al guardar lote de impresión" },
        { status: 500 }
      );
    }

    // Guardar en historial de impresiones
    const { error: historyError } = await supabase
      .from("printed_labels_history")
      .insert({
        user_id: userId,
        order_ids: order_ids,
        printed_at: print_date || new Date().toISOString(),
        total_labels: order_ids.length,
      });

    if (historyError) {
      console.error("[save-print-batch] Error guardando historial:", historyError);
    }

    return NextResponse.json({
      success: true,
      saved: order_ids.length,
      order_ids,
    });
  } catch (error) {
    console.error("[meli-labels/save-print-batch] Error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
