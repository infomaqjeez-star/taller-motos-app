import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { PDFDocument } from "pdf-lib";

export async function POST(req: NextRequest) {
  try {
    const { ids, account_id, meli_user_id } = await req.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "No IDs provided" },
        { status: 400 }
      );
    }

    // Validar permisos: obtener registros del usuario
    const { data: records, error: dbError } = await supabase
      .from("printed_labels")
      .select("*")
      .in("id", ids)
      .eq("meli_user_id", meli_user_id);

    if (dbError || !records || records.length === 0) {
      return NextResponse.json(
        { error: "Records not found or unauthorized" },
        { status: 403 }
      );
    }

    // Descargar cada PDF y combinar
    const pdfDoc = await PDFDocument.create();

    for (const record of records) {
      try {
        const filePath = record.file_path;
        
        // Obtener URL del archivo (ya es URL pública)
        const response = await fetch(filePath);
        if (!response.ok) {
          console.warn(`Failed to fetch PDF: ${filePath}`);
          continue;
        }

        const pdfBytes = await response.arrayBuffer();
        const srcPdf = await PDFDocument.load(pdfBytes);

        // Copiar todas las páginas
        const copiedPages = await pdfDoc.copyPages(
          srcPdf,
          srcPdf.getPageIndices()
        );
        copiedPages.forEach((page) => pdfDoc.addPage(page));
      } catch (error) {
        console.error(`Error processing PDF for record ${record.id}:`, error);
        // Continuar con el siguiente PDF
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
