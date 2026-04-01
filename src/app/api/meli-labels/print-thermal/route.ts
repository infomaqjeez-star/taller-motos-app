import { supabase } from "@/lib/supabase";
import { generateThermalLabel } from "@/lib/thermal-printer";

export async function POST(req: Request) {
  try {
    const { ids } = await req.json();
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return Response.json({ error: "No shipments provided" }, { status: 400 });
    }

    // Obtener datos de las etiquetas desde Supabase
    const { data: labels, error } = await supabase
      .from("meli_printed_labels")
      .select("*")
      .in("shipment_id", ids)
      .limit(100);

    if (error) {
      console.error("Supabase error:", error);
      return Response.json({ error: "Failed to fetch labels" }, { status: 500 });
    }

    if (!labels || labels.length === 0) {
      return Response.json({ error: "No labels found" }, { status: 404 });
    }

    // Generar comandos ESC/POS para la impresora térmica
    const escposBuffer = generateThermalLabel(labels);

    // Convertir a base64 para enviar como JSON
    let base64String = "";
    if (typeof Buffer !== "undefined") {
      base64String = Buffer.from(escposBuffer).toString("base64");
    } else {
      // Fallback para navegador (aunque esto es backend)
      const bytes = Array.from(escposBuffer);
      base64String = btoa(String.fromCharCode(...bytes));
    }

    return Response.json({
      success: true,
      count: labels.length,
      data: base64String,
      message: "Envía estos comandos ESC/POS a tu impresora térmica",
    });
  } catch (err) {
    console.error("Thermal print error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
