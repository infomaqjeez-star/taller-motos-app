import { NextRequest, NextResponse } from "next/server";

// GET - Descargar PDF de etiqueta en tiempo real
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const shippingId = searchParams.get("shipping_id");
    const accessToken = searchParams.get("access_token");

    if (!shippingId || !accessToken) {
      return NextResponse.json(
        { error: "shipping_id y access_token son requeridos" },
        { status: 400 }
      );
    }

    // Obtener PDF desde MeLi
    const pdfRes = await fetch(
      `https://api.mercadolibre.com/shipment_labels?shipment_ids=${shippingId}&response_type=pdf`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!pdfRes.ok) {
      const errorData = await pdfRes.json().catch(() => ({}));
      console.error("Error obteniendo PDF de MeLi:", errorData);
      return NextResponse.json(
        { error: "Error obteniendo PDF desde Mercado Libre", details: errorData },
        { status: pdfRes.status }
      );
    }

    // Obtener el blob del PDF
    const pdfBlob = await pdfRes.blob();
    
    // Devolver el PDF al frontend
    return new NextResponse(pdfBlob, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="etiqueta-${shippingId}.pdf"`,
      },
    });
    
  } catch (error) {
    console.error("Error en GET /etiquetas-pdf:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
