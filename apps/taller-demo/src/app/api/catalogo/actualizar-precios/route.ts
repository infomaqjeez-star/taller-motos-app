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

    const body = await req.json();

    // ── Modo 1: Actualizar precios de lista de productos activos ──
    const activos = body.activos as Array<{
      sku: string;
      catalog_price: number;
      stock?: number;
    }> | undefined;

    // ── Modo 2: Marcar como inactivos productos no listados ──
    const inactivos = body.inactivos as Array<{ sku: string }> | undefined;

    let updated = 0;
    let errors = 0;

    // 1) Activos: precio + stock (ilimitado por defecto)
    if (activos && Array.isArray(activos) && activos.length > 0) {
      for (const p of activos) {
        const updateData: Record<string, any> = {
          catalog_price: Math.round(p.catalog_price),
          active: true,
        };
        // Stock ilimitado = 999999, o el valor que venga
        if (p.stock !== undefined) {
          updateData.stock = p.stock;
        } else {
          updateData.stock = 999999;
        }

        const { error } = await supabase
          .from("catalog_products")
          .update(updateData)
          .eq("sku", p.sku);

        if (error) {
          console.error(`Error activo ${p.sku}:`, error.message);
          errors++;
        } else {
          updated++;
        }
      }
    }

    // 2) Inactivos: ocultar productos que no están en el catálogo PDF
    if (inactivos && Array.isArray(inactivos) && inactivos.length > 0) {
      for (const p of inactivos) {
        const { error } = await supabase
          .from("catalog_products")
          .update({ active: false })
          .eq("sku", p.sku);

        if (error) {
          console.error(`Error inactivo ${p.sku}:`, error.message);
          errors++;
        } else {
          updated++;
        }
      }
    }

    const total = (activos?.length || 0) + (inactivos?.length || 0);
    return NextResponse.json({ success: true, updated, errors, total });
  } catch (err: any) {
    console.error("actualizar-precios error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
