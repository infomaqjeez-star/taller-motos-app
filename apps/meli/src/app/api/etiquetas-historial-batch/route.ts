import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseKey);

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
  
  return "CORREO";
}

// POST - Guardar múltiples etiquetas en historial (batch)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { etiquetas } = body;

    if (!etiquetas || !Array.isArray(etiquetas) || etiquetas.length === 0) {
      return NextResponse.json(
        { error: "Se requiere un array de etiquetas" },
        { status: 400 }
      );
    }

    // Preparar datos para insertar
    const etiquetasParaInsertar = etiquetas.map((etiqueta: any) => ({
      order_id: String(etiqueta.order_id),
      shipping_id: String(etiqueta.shipping_id),
      cuenta_origen: etiqueta.cuenta_origen || "",
      comprador_nombre: etiqueta.comprador_nombre || "",
      titulo_producto: etiqueta.titulo_producto || "",
      tipo_envio: etiqueta.tipo_envio || "CORREO",
      pdf_generado: false,
    }));

    // Insertar en base de datos (upsert para evitar duplicados)
    const { data, error } = await supabase
      .from("etiquetas_historial")
      .upsert(etiquetasParaInsertar, {
        onConflict: "order_id",
        ignoreDuplicates: false, // Actualizar si ya existe
      })
      .select();

    if (error) {
      console.error("Error guardando etiquetas en historial:", error);
      return NextResponse.json(
        { error: "Error guardando etiquetas en historial", details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      count: data?.length || 0,
      data 
    });
    
  } catch (error) {
    console.error("Error en POST /etiquetas-historial-batch:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
