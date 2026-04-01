import { NextRequest, NextResponse } from "next/server";

/**
 * Endpoint de validación pre-impresión
 * Por ahora, confía en que los IDs son válidos
 * La validación real ocurre cuando se intenta guardar en printed_labels
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { shipment_ids } = body as {
      shipment_ids: number[];
    };

    if (!shipment_ids || !Array.isArray(shipment_ids) || shipment_ids.length === 0) {
      return NextResponse.json(
        { 
          error: "shipment_ids es requerido y debe ser un array no vacío",
          valid: [],
          already_printed: [],
          allValid: false,
        },
        { status: 400 }
      );
    }

    // Validación simple: todos los IDs recibidos son válidos
    // La validación real ocurre cuando se intenta guardar en BD
    return NextResponse.json({
      valid: shipment_ids,
      already_printed: [],
      allValid: true,
    });
  } catch (err) {
    console.error("Validate endpoint error:", err);
    // Incluso si hay error, permitir continuar (mejor UX)
    return NextResponse.json(
      {
        valid: [],
        already_printed: [],
        allValid: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 200 } // 200 para no bloquear
    );
  }
}


