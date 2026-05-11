import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const { pedido_id } = await req.json();
    if (!pedido_id) {
      return NextResponse.json({ error: "pedido_id requerido" }, { status: 400 });
    }

    const supabase = getSupabaseServer();

    // Obtener info del pedido para validar
    const { data: pedido } = await supabase
      .from("pedidos_catalogo")
      .select("id, comision_estado, comision_monto")
      .eq("id", pedido_id)
      .single();

    if (!pedido) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    }

    if (pedido.comision_estado !== "pendiente" || pedido.comision_monto <= 0) {
      return NextResponse.json({ error: "No hay comisión pendiente para liquidar" }, { status: 400 });
    }

    // Liquidar comisión
    const { error } = await supabase
      .from("pedidos_catalogo")
      .update({
        comision_estado: "pagada",
        fecha_pago_comision: new Date().toISOString(),
        fecha_liquidacion: new Date().toISOString(),
      })
      .eq("id", pedido_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Comisión liquidada correctamente" });
  } catch (err) {
    console.error("admin/liquidaciones error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
