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

    console.log(`[etiquetas-download] Descargando ${etiquetas.length} etiquetas`);

    // Obtener tokens de las cuentas necesarias
    const cuentasNecesarias = [...new Set(etiquetas.map((e: any) => e.cuenta_origen))];
    console.log(`[etiquetas-download] Cuentas necesarias:`, cuentasNecesarias);
    
    const tokens: Record<string, string> = {};

    for (const cuenta of cuentasNecesarias) {
      console.log(`[etiquetas-download] Buscando token para: ${cuenta}`);
      
      // Intentar buscar por meli_nickname
      let { data, error } = await supabase
        .from("linked_meli_accounts")
        .select("access_token, meli_nickname, meli_user_id")
        .eq("meli_nickname", cuenta)
        .single();

      // Si no se encuentra, intentar buscar por account_name o cualquier campo similar
      if (error || !data) {
        console.log(`[etiquetas-download] No encontrado por nickname, intentando búsqueda alternativa`);
        
        // Intentar con ilike para búsqueda case-insensitive
        const { data: data2, error: error2 } = await supabase
          .from("linked_meli_accounts")
          .select("access_token, meli_nickname, meli_user_id")
          .ilike("meli_nickname", cuenta)
          .single();
          
        if (!error2 && data2) {
          data = data2;
          error = null;
        }
      }

      if (error || !data?.access_token) {
        console.error(`[etiquetas-download] No se encontró token para ${cuenta}:`, error);
        continue;
      }

      console.log(`[etiquetas-download] Token encontrado para ${cuenta}`);
      tokens[cuenta] = data.access_token;
    }

    console.log(`[etiquetas-download] Tokens encontrados:`, Object.keys(tokens));

    if (Object.keys(tokens).length === 0) {
      return NextResponse.json(
        { error: "No se encontraron tokens válidos para las cuentas seleccionadas" },
        { status: 401 }
      );
    }

    // Descargar PDFs
    const pdfsDescargados: { order_id: string; blob: Blob; cuenta: string }[] = [];

    for (const etiqueta of etiquetas) {
      const token = tokens[etiqueta.cuenta_origen];
      if (!token) {
        console.log(`[etiquetas-download] Saltando ${etiqueta.order_id} - no hay token para ${etiqueta.cuenta_origen}`);
        continue;
      }

      try {
        console.log(`[etiquetas-download] Descargando etiqueta ${etiqueta.order_id} (shipping: ${etiqueta.shipping_id})`);
        
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
          pdfsDescargados.push({ 
            order_id: etiqueta.order_id, 
            blob,
            cuenta: etiqueta.cuenta_origen 
          });
          console.log(`[etiquetas-download] Éxito: ${etiqueta.order_id}`);
        } else {
          const errorText = await pdfRes.text();
          console.error(`[etiquetas-download] Error MeLi ${etiqueta.order_id}:`, pdfRes.status, errorText);
        }
      } catch (err) {
        console.error(`[etiquetas-download] Error descargando ${etiqueta.order_id}:`, err);
      }
    }

    console.log(`[etiquetas-download] Total descargadas: ${pdfsDescargados.length}`);

    if (pdfsDescargados.length === 0) {
      return NextResponse.json(
        { error: "No se pudo descargar ninguna etiqueta. Verifica que las cuentas estén vinculadas y los tokens sean válidos." },
        { status: 500 }
      );
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

    // Si hay múltiples, devolver el primero por ahora (TODO: implementar ZIP)
    return new NextResponse(pdfsDescargados[0].blob, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="etiqueta-${pdfsDescargados[0].order_id}.pdf"`,
      },
    });

  } catch (error) {
    console.error("[etiquetas-download] Error inesperado:", error);
    return NextResponse.json(
      { error: "Error interno del servidor", details: String(error) },
      { status: 500 }
    );
  }
}
