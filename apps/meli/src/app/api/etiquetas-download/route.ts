import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseKey);

// POST - Descargar múltiples etiquetas
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

    // Obtener tokens de las cuentas necesarias
    const cuentasNecesarias = [...new Set(etiquetas.map((e: any) => e.cuenta_origen))];
    const tokens: Record<string, string> = {};

    for (const cuenta of cuentasNecesarias) {
      const { data, error } = await supabase
        .from("linked_meli_accounts")
        .select("access_token")
        .eq("meli_nickname", cuenta)
        .single();

      if (error || !data?.access_token) {
        console.error(`No se encontró token para ${cuenta}`);
        continue;
      }

      tokens[cuenta] = data.access_token;
    }

    // Descargar PDFs
    const pdfsDescargados: { order_id: string; blob: Blob }[] = [];

    for (const etiqueta of etiquetas) {
      const token = tokens[etiqueta.cuenta_origen];
      if (!token) continue;

      try {
        const pdfRes = await fetch(
          `https://api.mercadolibre.com/shipment_labels?shipment_ids=${etiqueta.shipping_id}&response_type=pdf`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (pdfRes.ok) {
          const blob = await pdfRes.blob();
          pdfsDescargados.push({ order_id: etiqueta.order_id, blob });
        }
      } catch (err) {
        console.error(`Error descargando ${etiqueta.order_id}:`, err);
      }
    }

    // Si solo hay un PDF, devolverlo directamente
    if (pdfsDescargados.length === 1) {
      return new NextResponse(pdfsDescargados[0].blob, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="etiqueta-${pdfsDescargados[0].order_id}.pdf"`,
        },
      });
    }

    // Si hay múltiples PDFs, devolver un ZIP (simplificado - por ahora devolvemos el primero)
    // TODO: Implementar ZIP con JSZip
    if (pdfsDescargados.length > 0) {
      return new NextResponse(pdfsDescargados[0].blob, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="etiqueta-${pdfsDescargados[0].order_id}.pdf"`,
        },
      });
    }

    return NextResponse.json(
      { error: "No se pudieron descargar las etiquetas" },
      { status: 500 }
    );

  } catch (error) {
    console.error("Error en POST /etiquetas-download:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
