import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const codigo = req.nextUrl.searchParams.get("codigo");
    const lista = req.nextUrl.searchParams.get("lista");
    const id = req.nextUrl.searchParams.get("id");

    const supabase = getSupabaseServer();

    // Listar todos: deshabilitado por seguridad (filtraba PII de toda la red).
    // Si en el futuro hace falta, agregar verificacion de admin token.
    if (lista) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Buscar por ID (fallback cuando no hay código en localStorage)
    if (id) {
      const { data: vendedor, error } = await supabase
        .from("vendedores")
        .select("id, nombre, codigo_referido, comision_pct, nivel_vendedor")
        .eq("id", id)
        .eq("estado", "activo")
        .single();

      if (error || !vendedor) {
        return NextResponse.json({ error: "Vendedor no encontrado" }, { status: 404 });
      }
      return NextResponse.json({ vendedor });
    }

    // Buscar por codigo de referido
    if (!codigo) {
      return NextResponse.json({ error: "Código requerido" }, { status: 400 });
    }

    const { data: vendedor, error } = await supabase
      .from("vendedores")
      .select("id, nombre, codigo_referido, comision_pct, nivel_vendedor")
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
