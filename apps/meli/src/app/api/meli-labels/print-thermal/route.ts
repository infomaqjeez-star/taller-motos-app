import { generateThermalLabel } from "@/lib/thermal-printer";

export async function POST(req: Request) {
  try {
    const { ids, shipments } = await req.json();
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return Response.json({ error: "No shipments provided" }, { status: 400 });
    }

    // Filtrar etiquetas del body que coincidan con IDs seleccionados
    const labels = (shipments ?? []).filter((s: any) => ids.includes(s.shipment_id));
    
    if (labels.length === 0) {
      return Response.json({ error: "No labels found" }, { status: 404 });
    }

    // Generar comandos ESC/POS para la impresora térmica
    const escposBuffer = generateThermalLabel(labels);

    // Convertir a base64 para enviar como JSON
    let base64String = "";
    if (typeof Buffer !== "undefined") {
      base64String = Buffer.from(escposBuffer).toString("base64");
    } else {
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
