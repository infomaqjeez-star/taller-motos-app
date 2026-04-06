// v5 - Descarga fresca desde API MeLi con los shipment_ids exactos seleccionados
import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { getSupabase, getActiveAccounts, getValidToken, meliGetRaw } from "@/lib/meli";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { ids, meli_user_id } = await req.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
    }

    const supabase = getSupabase();
    const uniqueIds = Array.from(new Set(ids));

    // Obtener los registros seleccionados (para sacar shipment_id y meli_user_id)
    let query = supabase
      .from("printed_labels")
      .select("shipment_id, meli_user_id")
      .in("id", uniqueIds);

    if (meli_user_id) {
      query = query.eq("meli_user_id", meli_user_id) as typeof query;
    }

    const { data: records, error: dbError } = await query;

    if (dbError || !records || records.length === 0) {
      return NextResponse.json(
        { error: "Records not found" },
        { status: 403 }
      );
    }

    // Agrupar shipment_ids por meli_user_id (cuenta)
    const byAccount = new Map<string, number[]>();
    for (const r of records) {
      const uid = String(r.meli_user_id);
      if (!byAccount.has(uid)) byAccount.set(uid, []);
      const arr = byAccount.get(uid)!;
      if (!arr.includes(r.shipment_id)) arr.push(r.shipment_id);
    }

    // Obtener tokens válidos
    const accounts = await getActiveAccounts();
    const tokenMap = new Map<string, string>();
    await Promise.all(
      accounts.map(async (acc) => {
        const uid = String(acc.meli_user_id);
        if (byAccount.has(uid)) {
          const token = await getValidToken(acc);
          if (token) tokenMap.set(uid, token);
        }
      })
    );

    // Llamar a MeLi API para obtener las etiquetas exactas seleccionadas
    // MeLi acepta hasta 50 shipment_ids por llamada y devuelve el PDF formateado
    const pdfChunks: ArrayBuffer[] = [];

    for (const [uid, shipmentIds] of byAccount.entries()) {
      const token = tokenMap.get(uid);
      if (!token) {
        console.warn(`[historial-v2] Sin token para cuenta ${uid}`);
        continue;
      }

      // MeLi permite max ~50 IDs por request, dividir si es necesario
      for (let i = 0; i < shipmentIds.length; i += 50) {
        const batch = shipmentIds.slice(i, i + 50);
        const idsParam = batch.join(",");

        try {
          const pdfBuffer = await meliGetRaw(
            `/shipment_labels?shipment_ids=${idsParam}&response_type=pdf`,
            token
          );
          if (pdfBuffer && pdfBuffer.byteLength > 0) {
            pdfChunks.push(pdfBuffer);
          } else {
            console.warn(`[historial-v2] MeLi no devolvió PDF para IDs: ${idsParam}`);
          }
        } catch (err) {
          console.error(`[historial-v2] Error obteniendo etiquetas:`, err);
        }
      }
    }

    if (pdfChunks.length === 0) {
      return NextResponse.json(
        { error: "No se pudieron obtener las etiquetas de MeLi" },
        { status: 502 }
      );
    }

    // Combinar todos los PDFs de distintas cuentas en uno solo
    const pdfDoc = await PDFDocument.create();

    for (const chunk of pdfChunks) {
      try {
        const src = await PDFDocument.load(chunk, { ignoreEncryption: true });
        const copiedPages = await pdfDoc.copyPages(src, src.getPageIndices());
        copiedPages.forEach((page) => pdfDoc.addPage(page));
      } catch {
        console.warn("[historial-v2] PDF inválido de MeLi, saltando...");
      }
    }

    if (pdfDoc.getPageCount() === 0) {
      return NextResponse.json(
        { error: "No se pudo generar el PDF" },
        { status: 502 }
      );
    }

    const combinedPdfBytes = await pdfDoc.save();
    const buffer = Buffer.from(combinedPdfBytes);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="historial-etiquetas-${new Date().toISOString().slice(0, 10)}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Download combined v2 error:", error);
    return NextResponse.json(
      { error: "Failed to generate combined PDF" },
      { status: 500 }
    );
  }
}
