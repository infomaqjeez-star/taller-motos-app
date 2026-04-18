import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Detectar tipo de envío basado en la respuesta de MeLi
function detectarTipoEnvio(shipmentData: any): string {
  const logisticType = shipmentData?.logistic_type;
  const shippingMode = shipmentData?.shipping_mode;
  const shippingOption = shipmentData?.shipping_option?.name || "";
  
  // FULL
  if (logisticType === "fulfillment") {
    return "FULL";
  }
  
  // FLEX (Same Day / Envío en el día)
  if (logisticType === "custom" || logisticType === "self_service") {
    // Verificar si es envío mismo día
    if (shippingOption.toLowerCase().includes("hoy") || 
        shippingOption.toLowerCase().includes("same day") ||
        shippingOption.toLowerCase().includes("flex")) {
      return "FLEX";
    }
  }
  
  // TURBO
  if (logisticType === "xd_drop_off" || 
      (logisticType === "turbo") ||
      (shippingMode === "me2" && shipmentData?.speed?.shipping === "fast")) {
    return "TURBO";
  }
  
  // CORREO (Tradicional)
  if (logisticType === "drop_off" || 
      logisticType === "cross_docking" ||
      logisticType === "default") {
    return "CORREO";
  }
  
  // Por defecto
  return "CORREO";
}

// POST - Guardar etiqueta en historial
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      order_id, 
      shipping_id, 
      cuenta_origen, 
      comprador_nombre, 
      titulo_producto,
      access_token 
    } = body;

    if (!order_id || !shipping_id) {
      return NextResponse.json(
        { error: "order_id y shipping_id son requeridos" },
        { status: 400 }
      );
    }

    // Obtener datos del shipment desde MeLi para detectar tipo de envío
    let tipoEnvio = "CORREO";
    
    if (access_token) {
      try {
        const shipmentRes = await fetch(
          `https://api.mercadolibre.com/shipments/${shipping_id}`,
          {
            headers: {
              Authorization: `Bearer ${access_token}`,
            },
          }
        );
        
        if (shipmentRes.ok) {
          const shipmentData = await shipmentRes.json();
          tipoEnvio = detectarTipoEnvio(shipmentData);
        }
      } catch (error) {
        console.error("Error obteniendo shipment:", error);
      }
    }

    // Guardar en base de datos
    const { data, error } = await supabase
      .from("etiquetas_historial")
      .upsert({
        order_id,
        shipping_id,
        cuenta_origen,
        comprador_nombre,
        titulo_producto,
        tipo_envio: tipoEnvio,
        pdf_generado: false,
      }, {
        onConflict: "order_id"
      })
      .select();

    if (error) {
      console.error("Error guardando en historial:", error);
      return NextResponse.json(
        { error: "Error guardando en historial" },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      data,
      tipo_envio: tipoEnvio 
    });
    
  } catch (error) {
    console.error("Error en POST /etiquetas-historial:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// GET - Obtener historial de etiquetas (últimos 60 días)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cuenta = searchParams.get("cuenta");
    const tipo = searchParams.get("tipo");
    
    let query = supabase
      .from("etiquetas_historial")
      .select("*")
      .gte("fecha_creacion", new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString())
      .order("fecha_creacion", { ascending: false });

    if (cuenta) {
      query = query.eq("cuenta_origen", cuenta);
    }
    
    if (tipo) {
      query = query.eq("tipo_envio", tipo);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error obteniendo historial:", error);
      return NextResponse.json(
        { error: "Error obteniendo historial" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
    
  } catch (error) {
    console.error("Error en GET /etiquetas-historial:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
