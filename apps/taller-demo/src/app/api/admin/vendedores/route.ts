import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
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
