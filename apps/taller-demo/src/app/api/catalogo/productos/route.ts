import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 300; // 5 min server-side cache

export async function GET(_req: NextRequest) {
  try {
    const supabase = getSupabaseServer();

    // 1) Productos activos del catálogo
    const { data: productos, error: pError } = await supabase
      .from("catalog_products")
      .select("sku, name, catalog_price, image_url, category")
      .eq("active", true);

    if (pError) {
      return NextResponse.json({ error: pError.message }, { status: 500 });
    }

    // 2) Ventas por SKU (solo ventas activas)
    const { data: ventasItems, error: vError } = await supabase
      .from("ventas_items")
      .select("sku, cantidad, ventas_repuestos!inner(status)")
      .eq("ventas_repuestos.status", "activa");

    if (vError) {
      console.error("[catalogo/productos] error ventas:", vError);
      // No fallamos, simplemente devolvemos productos sin orden de ventas
    }

    // 3) Contar ventas por SKU
    const ventasPorSku: Record<string, number> = {};
    ventasItems?.forEach((item: any) => {
      const sku = item.sku;
      if (sku && sku.trim() !== "") {
        ventasPorSku[sku] = (ventasPorSku[sku] || 0) + (item.cantidad || 1);
      }
    });

    // 4) Unir y ordenar: primero por ventas_count DESC, luego por SKU
    const productosConVentas = (productos || []).map((p) => ({
      ...p,
      ventas_count: ventasPorSku[p.sku] || 0,
    }));

    productosConVentas.sort((a, b) => {
      if (b.ventas_count !== a.ventas_count) {
        return b.ventas_count - a.ventas_count; // más vendidos primero
      }
      return (a.sku || "").localeCompare(b.sku || "", undefined, { numeric: true, sensitivity: "base" });
    });

    return NextResponse.json(
      { productos: productosConVentas },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (err: any) {
    console.error("[catalogo/productos] error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
