import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServer();

    // Traer todos los pedidos del catálogo con info del vendedor
    const { data: pedidos, error } = await supabase
      .from("pedidos_catalogo")
      .select(`
        *,
        vendedor:vendedores(id, nombre, codigo_referido, comision_pct, nivel_vendedor)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ pedidos: pedidos || [] });
  } catch (err) {
    console.error("admin/pedidos error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, estado, comision_estado } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    const supabase = getSupabaseServer();

    const updateData: Record<string, any> = {};
    if (estado) updateData.estado = estado;
    if (comision_estado) updateData.comision_estado = comision_estado;

    const { error } = await supabase
      .from("pedidos_catalogo")
      .update(updateData)
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("admin/pedidos patch error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
