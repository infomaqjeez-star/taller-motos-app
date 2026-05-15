import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

export const revalidate = 300; // 5 min ISR

// Cache en memoria para evitar golpear Supabase en cada request
let cache: { data: any[]; ts: number } | null = null;
const CACHE_TTL_MS = 5_000; // 5 segundos (más fresco para desarrollo)

export async function GET(_req: NextRequest) {
  try {
    // 1) Devolver cache si está fresco
    if (cache && Date.now() - cache.ts < CACHE_TTL_MS) {
      return NextResponse.json(
        { productos: cache.data },
        {
          headers: {
            "Cache-Control": "no-store, max-age=0",
          },
        }
      );
    }

    const supabase = getSupabaseServer();

    // 2) Paralelizar ambas queries
    // Intentar con columnas nuevas; si fallan (no existen en la tabla aun), hacer fallback
    let productosRes: any = await supabase
      .from("catalog_products")
      .select("sku, name, catalog_price, discount_price, on_sale, discount_pct, image_url, category")
      .eq("active", true);

    // Fallback si faltan las columnas nuevas (discount_price, on_sale, discount_pct)
    if (productosRes.error && productosRes.error.message?.includes("discount_price")) {
      productosRes = await supabase
        .from("catalog_products")
        .select("sku, name, catalog_price, image_url, category")
        .eq("active", true);
    }

    if (productosRes.error) {
      return NextResponse.json({ error: productosRes.error.message }, { status: 500 });
    }

    const [ventasRes] = await Promise.all([
      supabase
        .from("ventas_items")
        .select("sku, cantidad, ventas_repuestos!inner(status)")
        .eq("ventas_repuestos.status", "activa"),
    ]);

    if (ventasRes.error) {
      console.error("[catalogo/productos] error ventas:", ventasRes.error);
    }

    // 3) Contar ventas por SKU
    const ventasPorSku: Record<string, number> = {};
    ventasRes.data?.forEach((item: any) => {
      const sku = item.sku;
      if (sku && sku.trim() !== "") {
        ventasPorSku[sku] = (ventasPorSku[sku] || 0) + (item.cantidad || 1);
      }
    });

    // 4) Unir y ordenar: primero por ventas_count DESC, luego por SKU
    const productosConVentas = (productosRes.data || []).map((p: any) => ({
      ...p,
      ventas_count: ventasPorSku[p.sku] || 0,
    }));

    productosConVentas.sort((a: any, b: any) => {
      if (b.ventas_count !== a.ventas_count) {
        return b.ventas_count - a.ventas_count;
      }
      return (a.sku || "").localeCompare(b.sku || "", undefined, { numeric: true, sensitivity: "base" });
    });

    // 5) Guardar en cache
    cache = { data: productosConVentas, ts: Date.now() };

    return NextResponse.json(
      { productos: productosConVentas },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (err: any) {
    console.error("[catalogo/productos] error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
