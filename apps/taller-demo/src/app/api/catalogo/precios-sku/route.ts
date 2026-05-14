import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sku = searchParams.get("sku");

    if (!sku) {
      return NextResponse.json({ error: "Falta SKU" }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("catalog_products")
      .select("sku, name, catalog_price, discount_price, on_sale, discount_pct, image_url, active")
      .eq("sku", sku)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ producto: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sku, catalog_price, discount_price, on_sale, discount_pct } = body;

    if (!sku) {
      return NextResponse.json({ error: "Falta SKU" }, { status: 400 });
    }

    const supabase = getSupabaseServer();

    const updateData: Record<string, any> = {};

    // Precio normal
    if (catalog_price !== undefined && catalog_price !== null) {
      const precio = Number(catalog_price);
      if (isNaN(precio) || precio < 0) {
        return NextResponse.json({ error: "Precio inválido" }, { status: 400 });
      }
      updateData.catalog_price = precio;
    }

    // Precio de oferta
    if (discount_price !== undefined) {
      if (discount_price === null) {
        updateData.discount_price = null;
      } else {
        const precio = Number(discount_price);
        if (isNaN(precio) || precio < 0) {
          return NextResponse.json({ error: "Precio de oferta inválido" }, { status: 400 });
        }
        updateData.discount_price = precio;
      }
    }

    // Flag de oferta
    if (on_sale !== undefined) {
      updateData.on_sale = Boolean(on_sale);
    }

    // Porcentaje de descuento
    if (discount_pct !== undefined && discount_pct !== null) {
      const pct = Number(discount_pct);
      if (isNaN(pct) || pct < 0 || pct > 100) {
        return NextResponse.json({ error: "Porcentaje inválido (0-100)" }, { status: 400 });
      }
      updateData.discount_pct = pct;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "Nada para actualizar" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("catalog_products")
      .update(updateData)
      .eq("sku", sku)
      .select("sku, name, catalog_price, discount_price, on_sale, discount_pct")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, producto: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
