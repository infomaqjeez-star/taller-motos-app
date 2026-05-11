import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getSupabaseServer } from "@/lib/supabase-server";

const JWT_SECRET = new TextEncoder().encode(
  process.env.CLIENTE_JWT_SECRET || "maqjeez-cliente-secret-key-2026"
);

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { payload } = await jwtVerify(token, JWT_SECRET, { clockTolerance: 60 });
    const clienteId = payload.sub as string;

    const supabase = getSupabaseServer();
    const { data: cliente, error } = await supabase
      .from("clientes_catalogo")
      .select(`
        id, nombre, email, codigo_referido, descuento_cliente_pct, vendedor_referente_id,
        vendedor_referente:vendedores(id, nombre, codigo_referido)
      `)
      .eq("id", clienteId)
      .single();

    if (error || !cliente) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ cliente });
  } catch {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }
}
