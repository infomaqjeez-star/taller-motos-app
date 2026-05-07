import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseServiceKey || "placeholder-key"
);

// GET /api/ventas - Listar ventas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const desde = searchParams.get("desde");
    const hasta = searchParams.get("hasta");
    const fecha = searchParams.get("fecha");

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Supabase no configurado correctamente" },
        { status: 500 }
      );
    }

    let result: any;

    switch (action) {
      case "all": {
        // Traer todas las ventas sin filtro de fecha
        console.log("[API Ventas] Consultando todas las ventas (sin filtro de fecha)");

        result = await supabase
          .from("ventas_repuestos")
          .select("*, ventas_items(*)")
          .order("created_at", { ascending: false })
          .limit(100);

        console.log("[API Ventas] Resultado:", result.data?.length || 0, "ventas encontradas");
        console.log("[API Ventas] Datos crudos:", JSON.stringify(result.data, null, 2));
        if (result.error) {
          console.error("[API Ventas] Error en consulta:", result.error);
        }
        break;
      }

      case "today": {
        // Ventas del día específico
        const targetDate = fecha || new Date().toISOString().split("T")[0];
        console.log("[API Ventas] Consultando ventas para fecha:", targetDate);

        result = await supabase
          .from("ventas_repuestos")
          .select("*, ventas_items(*)")
          .gte("created_at", `${targetDate}T00:00:00`)
          .lt("created_at", `${targetDate}T23:59:59`)
          .order("created_at", { ascending: false });

        console.log("[API Ventas] Resultado:", result.data?.length || 0, "ventas encontradas");
        console.log("[API Ventas] Datos crudos:", JSON.stringify(result.data, null, 2));
        if (result.error) {
          console.error("[API Ventas] Error en consulta:", result.error);
        }
        break;
      }

      case "stats": {
        // Estadísticas de ventas
        const { data, error } = await supabase.rpc("get_ventas_stats", {
          desde: desde || new Date().toISOString().split("T")[0],
          hasta: hasta || new Date().toISOString().split("T")[0],
        });
        if (error) throw error;
        return NextResponse.json(data);
      }

      case "por_dia": {
        // Ventas agrupadas por día
        const { data, error } = await supabase.rpc("get_ventas_por_dia", {
          desde: desde || new Date().toISOString().split("T")[0],
          hasta: hasta || new Date().toISOString().split("T")[0],
        });
        if (error) throw error;
        return NextResponse.json(data);
      }

      case "top_productos": {
        // Top productos vendidos
        const { data, error } = await supabase.rpc("get_top_productos", {
          desde: desde || new Date().toISOString().split("T")[0],
          hasta: hasta || new Date().toISOString().split("T")[0],
        });
        if (error) throw error;
        return NextResponse.json(data);
      }

      default: {
        // Listar ventas con rango de fechas
        let query = supabase
          .from("ventas_repuestos")
          .select("*, ventas_items(*)")
          .order("created_at", { ascending: false });

        if (desde) {
          query = query.gte("created_at", `${desde}T00:00:00`);
        }
        if (hasta) {
          query = query.lt("created_at", `${hasta}T23:59:59`);
        }

        result = await query;
      }
    }

    if (result.error) {
      console.error("[API Ventas] Error:", result.error);
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("[API Ventas] Error inesperado:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error desconocido" },
      { status: 500 }
    );
  }
}

// POST /api/ventas - Crear, actualizar o cancelar venta
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, venta, id } = body;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Supabase no configurado correctamente" },
        { status: 500 }
      );
    }

    let result: any;

    switch (action) {
      case "update": {
        // Actualizar venta existente
        const { id: ventaId, vendedor, metodoPago, total, status, notas, items } = venta;
        
        result = await supabase
          .from("ventas_repuestos")
          .update({
            vendedor,
            metodo_pago: metodoPago,
            total,
            status,
            notas,
          })
          .eq("id", ventaId);

        // Actualizar items si se proporcionan
        if (items && Array.isArray(items)) {
          // Eliminar items antiguos
          await supabase.from("ventas_items").delete().eq("venta_id", ventaId);
          
          // Insertar nuevos items
          for (const item of items) {
            await supabase.from("ventas_items").insert({
              venta_id: ventaId,
              producto: item.producto,
              sku: item.sku,
              cantidad: item.cantidad,
              precio_unit: item.precioUnit,
              subtotal: item.subtotal,
            });
          }
        }
        break;
      }

      case "cancelar": {
        // Cancelar venta (cambiar status)
        result = await supabase
          .from("ventas_repuestos")
          .update({ status: "cancelada" })
          .eq("id", id);
        break;
      }

      default: {
        // Crear nueva venta
        const { vendedor, metodoPago, total, status, notas, items, createdAt } = body;
        
        // Crear la venta principal
        const { data: ventaData, error: ventaError } = await supabase
          .from("ventas_repuestos")
          .insert({
            vendedor,
            metodo_pago: metodoPago,
            total,
            status: status || "completada",
            notas,
            created_at: createdAt || new Date().toISOString(),
          })
          .select()
          .single();

        if (ventaError) throw ventaError;

        // Crear los items de la venta
        if (items && Array.isArray(items) && ventaData) {
          const itemsToInsert = items.map((item: any) => ({
            venta_id: ventaData.id,
            producto: item.producto,
            sku: item.sku || "",
            cantidad: item.cantidad,
            precio_unit: item.precioUnit,
            subtotal: item.subtotal,
            warranty_days: item.warrantyDays || 30,
          }));

          const { error: itemsError } = await supabase
            .from("ventas_items")
            .insert(itemsToInsert);

          if (itemsError) {
            console.error("[API Ventas] Error insertando items:", itemsError);
            throw itemsError;
          }
        }

        return NextResponse.json({ success: true, id: ventaData?.id });
      }
    }

    if (result?.error) {
      console.error("[API Ventas] Error:", result.error);
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API Ventas] Error inesperado:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error desconocido" },
      { status: 500 }
    );
  }
}
