import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { PDFDocument } from "pdf-lib";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { ids, account_id, meli_user_id } = await req.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "No IDs provided" },
        { status: 400 }
      );
    }

    // Eliminar IDs duplicados
    const uniqueIds = Array.from(new Set(ids));

    // Validar permisos: obtener registros
    let query = supabase
      .from("printed_labels")
      .select("*")
      .in("id", uniqueIds);

    if (meli_user_id) {
      query = query.eq("meli_user_id", meli_user_id) as typeof query;
    }

    const { data: records, error: dbError } = await query;

    if (dbError || !records || records.length === 0) {
      return NextResponse.json(
        { error: "Records not found or unauthorized" },
        { status: 403 }
      );
    }

    // Eliminar registros duplicados por shipment_id
    const uniqueRecords = [];
    const seenShipmentIds = new Set();
    for (const record of records) {
      if (!seenShipmentIds.has(record.shipment_id)) {
        seenShipmentIds.add(record.shipment_id);
        uniqueRecords.push(record);
      }
    }

    // Descargar cada PDF
    const pdfChunks: ArrayBuffer[] = [];
    for (const record of uniqueRecords) {
      try {
        const filePath = record.file_path;
        const response = await fetch(filePath);
        if (!response.ok) {
          console.warn(`Failed to fetch PDF: ${filePath}`);
          continue;
        }
        const pdfBytes = await response.arrayBuffer();
        pdfChunks.push(pdfBytes);
      } catch (error) {
        console.error(`Error processing PDF for record ${record.id}:`, error);
      }
    }

    // PDF Merge - 3 etiquetas por hoja A4 landscape
    const A4_W = 841.89;
    const A4_H = 595.28;
    
    const LABELS_PER_ROW = 3;
    const MARGIN_X = 20;
    const MARGIN_Y = 15;
    const GAP_X = 10;
    
    const availableWidth = A4_W - (MARGIN_X * 2);
    const availableHeight = A4_H - (MARGIN_Y * 2);
    
    const slotWidth = (availableWidth - (GAP_X * (LABELS_PER_ROW - 1))) / LABELS_PER_ROW;
    const slotHeight = availableHeight;

    // Cargar todos los PDFs
    const allLabelPages: { doc: PDFDocument; idx: number; srcWidth: number; srcHeight: number }[] = [];
    for (const chunk of pdfChunks) {
      try {
        const src = await PDFDocument.load(chunk, { ignoreEncryption: true });
        const pageIdx = 0;
        const srcPage = src.getPage(pageIdx);
        const { width: srcWidth, height: srcHeight } = srcPage.getSize();
        allLabelPages.push({ doc: src, idx: pageIdx, srcWidth, srcHeight });
      } catch {
        console.warn("[etiquetas] Chunk de PDF invalido, saltando...");
      }
    }

    if (allLabelPages.length === 0) {
      return NextResponse.json({ error: "No se pudo generar el PDF" }, { status: 502 });
    }

    const pdfDoc = await PDFDocument.create();

    // Crear páginas A4 con 3 etiquetas cada una
    for (let i = 0; i < allLabelPages.length; i += LABELS_PER_ROW) {
      const group = allLabelPages.slice(i, i + LABELS_PER_ROW);
      const a4Page = pdfDoc.addPage([A4_W, A4_H]);

      for (let j = 0; j < group.length; j++) {
        const { doc, idx, srcWidth, srcHeight } = group[j];
        const srcPage = doc.getPage(idx);
        
        const scaleX = slotWidth / srcWidth;
        const scaleY = slotHeight / srcHeight;
        const scale = Math.min(scaleX, scaleY) * 0.95;
        
        const finalW = srcWidth * scale;
        const finalH = srcHeight * scale;
        
        const x = MARGIN_X + j * (slotWidth + GAP_X) + (slotWidth - finalW) / 2;
        const y = MARGIN_Y + (slotHeight - finalH) / 2;
        
        const embedded = await pdfDoc.embedPage(srcPage);
        a4Page.drawPage(embedded, { x, y, width: finalW, height: finalH });
      }
    }

    const combinedPdfBytes = await pdfDoc.save();
    const buffer = Buffer.from(combinedPdfBytes);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="etiquetas_combinadas_${Date.now()}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Download combined error:", error);
    return NextResponse.json(
      { error: "Failed to generate combined PDF" },
      { status: 500 }
    );
  }
}
