import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { PDFDocument } from "pdf-lib";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  try {
    const { ids, account_id, meli_user_id } = await req.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "No IDs provided" },
        { status: 400 }
      );
    }

    // Validar permisos: obtener registros
    const supabase = getSupabase();
    
    // Eliminar IDs duplicados
    const uniqueIds = Array.from(new Set(ids));
    
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

    // Eliminar registros duplicados por shipment_id (solo uno por etiqueta)
    const uniqueRecords = [];
    const seenShipmentIds = new Set();
    for (const record of records) {
      if (!seenShipmentIds.has(record.shipment_id)) {
        seenShipmentIds.add(record.shipment_id);
        uniqueRecords.push(record);
      }
    }

    // Descargar cada PDF y combinar en formato A4 landscape (3 etiquetas por fila)
    const pdfChunks: ArrayBuffer[] = [];

    for (const record of uniqueRecords) {
      try {
        const filePath = record.file_path;
        
        // Obtener URL del archivo (ya es URL pública)
        const response = await fetch(filePath);
        if (!response.ok) {
          console.warn(`Failed to fetch PDF: ${filePath}`);
          continue;
        }

        const pdfBytes = await response.arrayBuffer();
        pdfChunks.push(pdfBytes);
      } catch (error) {
        console.error(`Error processing PDF for record ${record.id}:`, error);
        // Continuar con el siguiente PDF
      }
    }

    // PDF Merge - 3 etiquetas 10x15 cm en horizontal por hoja A4 (landscape)
    const A4_W = 841.89;  // A4 landscape ancho
    const A4_H = 595.28;  // A4 landscape alto
    const LABEL_W = 283.46; // 10 cm en puntos
    const LABEL_H = 425.20; // 15 cm en puntos
    const LABELS_PER_ROW = 3;
    const GAP = 10;

    // Cargar todos los chunks y recopilar páginas fuente
    const srcDocs: PDFDocument[] = [];
    const allLabelPages: { doc: PDFDocument; idx: number }[] = [];
    for (const chunk of pdfChunks) {
      try {
        const src = await PDFDocument.load(chunk, { ignoreEncryption: true });
        srcDocs.push(src);
        for (const idx of src.getPageIndices()) {
          // SOLO la primera pagina de cada PDF (una etiqueta por PDF)
          if (idx === 0) {
            allLabelPages.push({ doc: src, idx });
          }
        }
      } catch {
        console.warn("[etiquetas] Chunk de PDF invalido, saltando...");
      }
    }

    if (allLabelPages.length === 0) {
      return NextResponse.json({ error: "No se pudo generar el PDF" }, { status: 502 });
    }

    const pdfDoc = await PDFDocument.create();

    // Calcular escala para que quepan 3 etiquetas de 10cm en el ancho A4
    const availableWidth = A4_W - (GAP * (LABELS_PER_ROW - 1));
    const scale = Math.min(1, availableWidth / (LABEL_W * LABELS_PER_ROW), A4_H / LABEL_H);
    const drawW = LABEL_W * scale;
    const drawH = LABEL_H * scale;
    const startX = (A4_W - (drawW * LABELS_PER_ROW + GAP * (LABELS_PER_ROW - 1))) / 2;
    const startY = (A4_H - drawH) / 2;

    // Componer paginas A4 landscape con 3 etiquetas horizontales cada una
    for (let i = 0; i < allLabelPages.length; i += LABELS_PER_ROW) {
      const group = allLabelPages.slice(i, i + LABELS_PER_ROW);
      const a4Page = pdfDoc.addPage([A4_W, A4_H]);

      for (let j = 0; j < group.length; j++) {
        const { doc, idx } = group[j];
        const srcPage = doc.getPage(idx);
        const x = startX + j * (drawW + GAP);
        const y = startY;
        const embedded = await pdfDoc.embedPage(srcPage);
        a4Page.drawPage(embedded, { x, y, width: drawW, height: drawH });
      }
    }

    // Generar PDF combinado
    const combinedPdfBytes = await pdfDoc.save();
    const buffer = Buffer.from(combinedPdfBytes);

    // Retornar como PDF
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
