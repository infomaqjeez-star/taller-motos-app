import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getSupabaseServer } from "@/lib/supabase-server";

const JWT_SECRET = new TextEncoder().encode(
  process.env.VENDEDOR_JWT_SECRET || "maqjeez-vendedor-secret-key-2026"
);

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, JWT_SECRET, { clockTolerance: 60 });
    const vendedorId = payload.sub as string;

    const supabase = getSupabaseServer();
    const { data: pedidos, error } = await supabase
      .from("pedidos_catalogo")
      .select("*")
      .eq("vendedor_id", vendedorId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Totales
    const { data: resumen } = await supabase
      .from("vendedor_resumen")
      .select("*")
      .eq("id", vendedorId)
      .single();

    return NextResponse.json({ pedidos: pedidos || [], resumen });
  } catch {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }
}
