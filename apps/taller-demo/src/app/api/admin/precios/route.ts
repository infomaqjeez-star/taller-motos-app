import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { getAdminFromRequest } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { porcentaje } = await req.json();
    if (typeof porcentaje !== "number" || porcentaje < -99 || porcentaje > 500) {
      return NextResponse.json({ error: "Porcentaje inválido. Rango: -99 a 500" }, { status: 400 });
    }

    const supabase = getSupabaseServer();

    // Calcular factor: -50% => 0.5, +20% => 1.2
    const factor = 1 + porcentaje / 100;

    const { data, error } = await supabase.rpc("ajustar_precios", {
      factor_multiplicador: factor,
    });

    if (error) {
      // Fallback si no existe la función RPC
      if (error.message?.includes("ajustar_precios") || error.code === "42883") {
        // Actualizar uno por uno con el factor
        const { data: productos, error: fetchError } = await supabase
          .from("catalog_products")
          .select("sku, catalog_price");

        if (fetchError) {
          return NextResponse.json({ error: fetchError.message }, { status: 500 });
        }

        let actualizados = 0;
        for (const p of productos || []) {
          const nuevoPrecio = Math.max(0, Math.round(p.catalog_price * factor));
          const { error: upError } = await supabase
            .from("catalog_products")
            .update({ catalog_price: nuevoPrecio })
            .eq("sku", p.sku);
          if (!upError) actualizados++;
        }

        return NextResponse.json({
          success: true,
          porcentaje,
          factor,
          actualizados,
          metodo: "batch_manual",
        });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      porcentaje,
      factor,
      actualizados: data || 0,
      metodo: "rpc",
    });
  } catch (err: any) {
    console.error("admin/precios error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("catalog_products")
      .select("sku, name, catalog_price, active")
      .order("sku", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const stats = {
      total: data?.length || 0,
      activos: data?.filter((p) => p.active).length || 0,
      precioMin: data && data.length > 0 ? Math.min(...data.map((p) => p.catalog_price || 0)) : 0,
      precioMax: data && data.length > 0 ? Math.max(...data.map((p) => p.catalog_price || 0)) : 0,
      precioPromedio: data && data.length > 0
        ? Math.round(data.reduce((s, p) => s + (p.catalog_price || 0), 0) / data.length)
        : 0,
    };

    return NextResponse.json({ productos: data || [], stats });
  } catch (err: any) {
    console.error("admin/precios GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
