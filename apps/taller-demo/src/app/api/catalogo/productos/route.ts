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

    // 2) Query principal — usar original_price + catalog_price (el descuento se calcula aqui).
    //    Si la columna no existe (legacy), fallback al schema viejo.
    let productosRes: any = await supabase
      .from("catalog_products")
      .select("sku, name, catalog_price, original_price, image_url, category")
      .eq("active", true);

    if (productosRes.error && productosRes.error.message?.includes("original_price")) {
      productosRes = await supabase
        .from("catalog_products")
        .select("sku, name, catalog_price, image_url, category")
        .eq("active", true);
    }

    if (productosRes.error) {
      return NextResponse.json({ error: productosRes.error.message }, { status: 500 });
    }

    // 2b) Mapear original_price (DB) -> shape esperado por la UI:
    //   catalog_price  = precio tachado (lo que era antes)
    //   discount_price = precio actual a cobrar
    //   on_sale        = true si hay descuento
    //   discount_pct   = % calculado
    productosRes.data = (productosRes.data || []).map((p: any) => {
      const priceActual = Number(p.catalog_price) || 0;
      const priceOriginal = Number(p.original_price) || 0;
      if (priceOriginal > 0 && priceOriginal > priceActual) {
        const pct = Math.round((1 - priceActual / priceOriginal) * 100);
        return {
          sku: p.sku,
          name: p.name,
          image_url: p.image_url,
          category: p.category,
          catalog_price: priceOriginal,
          discount_price: priceActual,
          on_sale: true,
          discount_pct: pct,
        };
      }
      return {
        sku: p.sku,
        name: p.name,
        image_url: p.image_url,
        category: p.category,
        catalog_price: priceActual,
        discount_price: null,
        on_sale: false,
        discount_pct: 0,
      };
    });

    // 3) Contar ventas por SKU (opcional — si la tabla no existe, ignorar)
    const ventasPorSku: Record<string, number> = {};
    try {
      const ventasRes = await supabase
        .from("ventas_items")
        .select("sku, cantidad, ventas_repuestos!inner(status)")
        .eq("ventas_repuestos.status", "activa");
      if (!ventasRes.error) {
        ventasRes.data?.forEach((item: any) => {
          const sku = item.sku;
          if (sku && sku.trim() !== "") {
            ventasPorSku[sku] = (ventasPorSku[sku] || 0) + (item.cantidad || 1);
          }
        });
      }
    } catch (_) {
      // ventas_items no disponible, continuar sin conteo
    }

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
