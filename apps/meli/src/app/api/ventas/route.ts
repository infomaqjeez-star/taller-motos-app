import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key"
);

/**
 * GET /api/ventas
 * 
 * Acciones via query param "action":
 * - (default): listar ventas con filtros desde/hasta
 * - today: ventas del dia (param fecha)
 * - stats: estadisticas agregadas
 * - por_dia: ventas agrupadas por dia
 * - top_productos: productos mas vendidos
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const desde = searchParams.get("desde");
    const hasta = searchParams.get("hasta");
    const fecha = searchParams.get("fecha");

    if (action === "today" && fecha) {
      // Ventas del dia
      const startOfDay = `${fecha}T00:00:00`;
      const endOfDay = `${fecha}T23:59:59`;
      const { data, error } = await supabase
        .from("ventas")
        .select("*, ventas_items(*)")
        .gte("created_at", startOfDay)
        .lte("created_at", endOfDay)
        .neq("status", "cancelada")
        .order("created_at", { ascending: false });

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data ?? []);
    }

    if (action === "stats" && desde && hasta) {
      // Estadisticas agregadas
      const { data, error } = await supabase.rpc("ventas_stats", {
        p_desde: desde,
        p_hasta: hasta + "T23:59:59",
      });
      if (error) {
        // Fallback: calcular manualmente si la RPC no existe
        const { data: ventas } = await supabase
          .from("ventas")
          .select("total, metodo_pago, status")
          .gte("created_at", desde)
          .lte("created_at", hasta + "T23:59:59")
          .neq("status", "cancelada");
        
        const totalFacturado = (ventas ?? []).reduce((s, v) => s + (v.total || 0), 0);
        const cantVentas = (ventas ?? []).length;
        
        // Metodo mas usado
        const metodoCounts: Record<string, number> = {};
        for (const v of ventas ?? []) {
          metodoCounts[v.metodo_pago] = (metodoCounts[v.metodo_pago] || 0) + 1;
        }
        const metodoTop = Object.entries(metodoCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

        return NextResponse.json([{
          total_facturado: totalFacturado,
          cant_ventas: cantVentas,
          metodo_top: metodoTop,
          producto_top: null,
        }]);
      }
      return NextResponse.json(data ?? []);
    }

    if (action === "por_dia" && desde && hasta) {
      // Ventas por dia
      const { data: ventas } = await supabase
        .from("ventas")
        .select("created_at, total")
        .gte("created_at", desde)
        .lte("created_at", hasta + "T23:59:59")
        .neq("status", "cancelada")
        .order("created_at", { ascending: true });

      const porDia: Record<string, { total: number; cant: number }> = {};
      for (const v of ventas ?? []) {
        const dia = v.created_at?.slice(0, 10);
        if (!dia) continue;
        if (!porDia[dia]) porDia[dia] = { total: 0, cant: 0 };
        porDia[dia].total += v.total || 0;
        porDia[dia].cant += 1;
      }

      return NextResponse.json(
        Object.entries(porDia).map(([dia, d]) => ({ dia, total: d.total, cant: d.cant }))
      );
    }

    if (action === "top_productos" && desde && hasta) {
      // Top productos
      const { data: items } = await supabase
        .from("ventas_items")
        .select("producto, cantidad, subtotal, ventas!inner(created_at, status)")
        .gte("ventas.created_at", desde)
        .lte("ventas.created_at", hasta + "T23:59:59")
        .neq("ventas.status", "cancelada");

      const prodMap: Record<string, { cantidad: number; total: number }> = {};
      for (const item of items ?? []) {
        const key = item.producto || "Sin nombre";
        if (!prodMap[key]) prodMap[key] = { cantidad: 0, total: 0 };
        prodMap[key].cantidad += item.cantidad || 0;
        prodMap[key].total += item.subtotal || 0;
      }

      const result = Object.entries(prodMap)
        .map(([producto, d]) => ({ producto, cantidad: d.cantidad, total: d.total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 20);

      return NextResponse.json(result);
    }

    // Default: listar ventas
    let query = supabase
      .from("ventas")
      .select("*, ventas_items(*)")
      .order("created_at", { ascending: false });

    if (desde) query = query.gte("created_at", desde);
    if (hasta) query = query.lte("created_at", hasta + "T23:59:59");

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch (error) {
    console.error("[api/ventas GET] Error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

/**
 * POST /api/ventas
 * 
 * Acciones via body.action:
 * - (default): crear nueva venta
 * - update: actualizar venta existente
 * - cancelar: cancelar venta
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "cancelar") {
      const { id } = body;
      if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });
      
      const { error } = await supabase
        .from("ventas")
        .update({ status: "cancelada" })
        .eq("id", id);
      
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (action === "update") {
      const { venta } = body;
      if (!venta?.id) return NextResponse.json({ error: "Venta requerida" }, { status: 400 });
      
      // Actualizar venta principal
      const { error: ventaError } = await supabase
        .from("ventas")
        .update({
          vendedor: venta.vendedor,
          metodo_pago: venta.metodoPago,
          total: venta.total,
          status: venta.status,
          notas: venta.notas || "",
        })
        .eq("id", venta.id);

      if (ventaError) return NextResponse.json({ error: ventaError.message }, { status: 500 });

      // Reemplazar items: borrar existentes e insertar nuevos
      await supabase.from("ventas_items").delete().eq("venta_id", venta.id);
      
      if (venta.items?.length > 0) {
        const items = venta.items.map((item: any) => ({
          id: item.id,
          venta_id: venta.id,
          producto: item.producto,
          sku: item.sku || "",
          cantidad: item.cantidad,
          precio_unit: item.precioUnit,
          subtotal: item.subtotal,
        }));
        await supabase.from("ventas_items").insert(items);
      }

      return NextResponse.json({ success: true });
    }

    // Default: crear nueva venta
    const venta = body;
    if (!venta.id) return NextResponse.json({ error: "Datos de venta requeridos" }, { status: 400 });

    // Insertar venta principal
    const { error: ventaError } = await supabase.from("ventas").insert({
      id: venta.id,
      vendedor: venta.vendedor,
      metodo_pago: venta.metodoPago,
      total: venta.total,
      status: venta.status || "activa",
      notas: venta.notas || "",
      created_at: venta.createdAt || new Date().toISOString(),
    });

    if (ventaError) return NextResponse.json({ error: ventaError.message }, { status: 500 });

    // Insertar items
    if (venta.items?.length > 0) {
      const items = venta.items.map((item: any) => ({
        id: item.id,
        venta_id: venta.id,
        producto: item.producto,
        sku: item.sku || "",
        cantidad: item.cantidad,
        precio_unit: item.precioUnit,
        subtotal: item.subtotal,
      }));

      const { error: itemsError } = await supabase.from("ventas_items").insert(items);
      if (itemsError) {
        console.error("[api/ventas] Error insertando items:", itemsError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/ventas POST] Error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
