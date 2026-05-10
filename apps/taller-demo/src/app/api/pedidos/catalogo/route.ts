import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

const JWT_SECRET = new TextEncoder().encode(
  process.env.VENDEDOR_JWT_SECRET || "maqjeez-vendedor-secret-key-2026"
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items, datos_cliente, subtotal, descuento_pct, descuento_monto, envio, total, vendedor_id, comision_monto } = body;

    const supabase = getSupabaseServer();

    // Si hay vendedor_id, validar que exista
    let finalVendedorId = vendedor_id || null;
    if (finalVendedorId) {
      const { data: vendedor } = await supabase
        .from("vendedores")
        .select("id, estado")
        .eq("id", finalVendedorId)
        .single();
      if (!vendedor || vendedor.estado !== "activo") {
        finalVendedorId = null;
      }
    }

    const { data: pedido, error } = await supabase
      .from("pedidos_catalogo")
      .insert({
        vendedor_id: finalVendedorId,
        items,
        datos_cliente,
        subtotal,
        descuento_pct,
        descuento_monto,
        envio,
        total,
        comision_monto: comision_monto || 0,
        estado: "pendiente",
        comision_estado: finalVendedorId ? "pendiente" : null,
        whatsapp_enviado: true,
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ pedido });
  } catch (err) {
    console.error("pedidos/catalogo error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
