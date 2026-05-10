import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const codigo = req.nextUrl.searchParams.get("codigo");
    if (!codigo) {
      return NextResponse.json({ error: "Código requerido" }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    const { data: vendedor, error } = await supabase
      .from("vendedores")
      .select("id, nombre, codigo_referido, comision_pct")
      .eq("codigo_referido", codigo)
      .eq("estado", "activo")
      .single();

    if (error || !vendedor) {
      return NextResponse.json({ error: "Vendedor no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ vendedor });
  } catch (err) {
    console.error("vendedor/public error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
