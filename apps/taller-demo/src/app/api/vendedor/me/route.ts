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
    const { data: vendedor, error } = await supabase
      .from("vendedores")
      .select("id, nombre, email, codigo_referido, comision_pct, nivel_vendedor, estado")
      .eq("id", vendedorId)
      .single();

    if (error || !vendedor) {
      return NextResponse.json({ error: "Vendedor no encontrado" }, { status: 404 });
    }

    if (vendedor.estado !== "activo") {
      return NextResponse.json({ error: "Cuenta inactiva" }, { status: 403 });
    }

    return NextResponse.json({ vendedor });
  } catch {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }
}
