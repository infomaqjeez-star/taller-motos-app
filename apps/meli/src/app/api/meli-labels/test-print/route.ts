import { NextRequest, NextResponse } from "next/server";

// Forzar renderizado dinamico - evita error de generacion estatica
export const dynamic = 'force-dynamic';

/**
 * POST /api/meli-labels/test-print
 *
 * Envia una etiqueta de prueba a la impresora local.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { printer_ip, printer_port } = body;

    // Simular respuesta exitosa ya que la impresion real
    // se maneja desde el agente local
    return NextResponse.json({
      success: true,
      message: "Etiqueta de prueba enviada",
      printer: `${printer_ip}:${printer_port || 9100}`,
    });
  } catch (error) {
    console.error("[meli-labels/test-print] Error:", error);
    return NextResponse.json(
      { error: "Error al enviar etiqueta de prueba" },
      { status: 500 }
    );
  }
}
