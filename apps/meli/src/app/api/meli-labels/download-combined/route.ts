import { NextRequest, NextResponse } from "next/server";

// Forzar renderizado dinamico - evita error de generacion estatica
export const dynamic = 'force-dynamic';

/**
 * POST /api/meli-labels/download-combined
 *
 * Genera un PDF combinado con todas las etiquetas.
 * Nota: La generacion real del PDF se hace en el cliente.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { order_ids } = body;

    if (!Array.isArray(order_ids) || order_ids.length === 0) {
      return NextResponse.json(
        { error: "Se requiere un array de order_ids" },
        { status: 400 }
      );
    }

    // Retornar informacion para que el cliente genere el PDF
    return NextResponse.json({
      success: true,
      message: "Preparado para descargar",
      total_labels: order_ids.length,
      order_ids,
    });
  } catch (error) {
    console.error("[meli-labels/download-combined] Error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
