import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseServer();

    const authHeader = req.headers.get("authorization");
    if (authHeader !== "Bearer maqjeez-prices-2026") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { precios }: { precios: Array<{ sku: string; precio_base: number }> } = await req.json();
    if (!precios || !Array.isArray(precios) || precios.length === 0) {
      return NextResponse.json({ error: "Precios requeridos" }, { status: 400 });
    }

    let updated = 0;
    let errors = 0;

    for (const p of precios) {
      const catalogPrice = Math.round(p.precio_base * 4);
      const { error } = await supabase
        .from("catalog_products")
        .update({ catalog_price: catalogPrice })
        .eq("sku", p.sku);

      if (error) {
        console.error(`Error updating ${p.sku}:`, error.message);
        errors++;
      } else {
        updated++;
      }
    }

    return NextResponse.json({ success: true, updated, errors, total: precios.length });
  } catch (err: any) {
    console.error("actualizar-precios error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
