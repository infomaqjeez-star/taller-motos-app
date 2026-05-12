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
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const supabase = getSupabaseAdmin();

    // Intentar con columnas opcionales de jerarquía
    let vendedores: any[] = [];
    const { data, error } = await supabase
      .from("vendedores")
      .select("id, nombre, email, codigo_referido, comision_pct, nivel_vendedor, created_at, estado, lider_id, es_gerente")
      .order("created_at", { ascending: false });

    if (!error && data) {
      vendedores = data;
    } else {
      // Fallback sin columnas opcionales
      const { data: data2, error: error2 } = await supabase
        .from("vendedores")
        .select("id, nombre, email, codigo_referido, comision_pct, nivel_vendedor, created_at, estado")
        .order("created_at", { ascending: false });
      if (error2) {
        console.error("admin/vendedores GET error:", error2);
        return NextResponse.json({ error: error2.message }, { status: 500 });
      }
      vendedores = (data2 || []).map((v: any) => ({ ...v, lider_id: null, es_gerente: false }));
    }

    return NextResponse.json({ vendedores });
  } catch (err: any) {
    console.error("admin/vendedores GET exception:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
