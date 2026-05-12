import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { jwtVerify } from "jose";

const ADMIN_JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || "maqjeez-admin-secret-key-2026"
);

async function verifyAdmin(req: NextRequest) {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    const { payload } = await jwtVerify(auth.slice(7), ADMIN_JWT_SECRET, { clockTolerance: 60 });
    return payload;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    // Intentar con join a vendedores
    let pedidos: any[] = [];
    const { data, error } = await supabase
      .from("pedidos_catalogo")
      .select(`*, vendedor:vendedores(id, nombre, codigo_referido, comision_pct, nivel_vendedor)`)
      .order("created_at", { ascending: false });

    if (!error && data) {
      pedidos = data;
    } else {
      // Fallback sin join si falla
      console.warn("admin/pedidos join error:", error?.message, "- intentando sin join");
      const { data: data2, error: error2 } = await supabase
        .from("pedidos_catalogo")
        .select("*")
        .order("created_at", { ascending: false });
      if (error2) return NextResponse.json({ error: error2.message }, { status: 500 });
      pedidos = (data2 || []).map((p: any) => ({ ...p, vendedor: null }));
    }

    return NextResponse.json({ pedidos });
  } catch (err) {
    console.error("admin/pedidos error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const { id, estado, comision_estado } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

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
