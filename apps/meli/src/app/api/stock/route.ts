import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export const dynamic = 'force-dynamic';

/**
 * GET /api/stock
 * 
 * Obtiene el stock unificado de MAQJEEZ I
 */
export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: "Supabase no configurado" }, { status: 500 });
    }

    const { data: stock, error } = await supabase
      .from("stock_unificado")
      .select("*")
      .order("sku", { ascending: true });

    if (error) {
      console.error("[stock] Error obteniendo stock:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ stock: stock || [] });

  } catch (err: any) {
    console.error("[stock] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/stock
 * 
 * Crea o actualiza un item de stock
 */
export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: "Supabase no configurado" }, { status: 500 });
    }

    const body = await request.json();
    const { sku, nombre, cantidad, precio, item_id, cuenta_id, meli_sku } = body;

    if (!sku || !nombre) {
      return NextResponse.json({ error: "SKU y nombre son requeridos" }, { status: 400 });
    }

    // Verificar si ya existe
    const { data: existing } = await supabase
      .from("stock_unificado")
      .select("id, cantidad")
      .eq("sku", sku)
      .single();

    let result;
    
    if (existing) {
      // Actualizar
      const { data, error } = await supabase
        .from("stock_unificado")
        .update({
          nombre,
          cantidad: cantidad ?? existing.cantidad,
          precio,
          item_id,
          cuenta_id,
          meli_sku,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Crear nuevo
      const { data, error } = await supabase
        .from("stock_unificado")
        .insert({
          sku,
          nombre,
          cantidad: cantidad || 0,
          precio,
          item_id,
          cuenta_id,
          meli_sku,
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return NextResponse.json({ success: true, item: result });

  } catch (err: any) {
    console.error("[stock] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * PUT /api/stock
 * 
 * Actualiza cantidad de stock (para ventas)
 */
export async function PUT(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: "Supabase no configurado" }, { status: 500 });
    }

    const body = await request.json();
    const { sku, cantidad_vendida } = body;

    if (!sku || cantidad_vendida === undefined) {
      return NextResponse.json({ error: "SKU y cantidad_vendida son requeridos" }, { status: 400 });
    }

    // Obtener stock actual
    const { data: item } = await supabase
      .from("stock_unificado")
      .select("id, cantidad")
      .eq("sku", sku)
      .single();

    if (!item) {
      return NextResponse.json({ error: "Item no encontrado" }, { status: 404 });
    }

    const nuevaCantidad = Math.max(0, item.cantidad - cantidad_vendida);

    const { data, error } = await supabase
      .from("stock_unificado")
      .update({
        cantidad: nuevaCantidad,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      item: data,
      mensaje: `Stock actualizado: ${item.cantidad} → ${nuevaCantidad}` 
    });

  } catch (err: any) {
    console.error("[stock] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/stock
 * 
 * Elimina un item de stock
 */
export async function DELETE(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: "Supabase no configurado" }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const sku = searchParams.get("sku");

    if (!sku) {
      return NextResponse.json({ error: "SKU es requerido" }, { status: 400 });
    }

    const { error } = await supabase
      .from("stock_unificado")
      .delete()
      .eq("sku", sku);

    if (error) throw error;

    return NextResponse.json({ success: true, mensaje: `Item ${sku} eliminado` });

  } catch (err: any) {
    console.error("[stock] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
