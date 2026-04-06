// v6 - Descarga fresca desde MeLi API con fallback a PDFs almacenados
import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { getSupabase, getActiveAccounts, getValidToken } from "@/lib/meli";

export const runtime = "nodejs";
export const maxDuration = 60;

// Fetch con timeout configurable (MeLi puede tardar con muchas etiquetas)
async function meliGetRawLong(path: string, token: string, timeoutMs = 25000): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(`https://api.mercadolibre.com${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
      console.warn(`[historial] MeLi ${res.status} para ${path.slice(0, 80)}`);
      return null;
    }
    return res.arrayBuffer();
  } catch (err) {
    console.warn(`[historial] Timeout/error MeLi:`, (err as Error).message);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { ids, meli_user_id } = await req.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
    }

    const supabase = getSupabase();
    const uniqueIds: string[] = Array.from(new Set(ids));

    // Obtener registros seleccionados
    let query = supabase
      .from("printed_labels")
      .select("shipment_id, meli_user_id, file_path")
      .in("id", uniqueIds);

    if (meli_user_id && meli_user_id !== "") {
      query = query.eq("meli_user_id", meli_user_id) as typeof query;
    }

    const { data: records, error: dbError } = await query;

    if (dbError || !records || records.length === 0) {
      return NextResponse.json({ error: "Records not found" }, { status: 403 });
    }

    // Agrupar shipment_ids por cuenta
    const byAccount = new Map<string, number[]>();
    for (const r of records) {
      const uid = String(r.meli_user_id);
      if (!byAccount.has(uid)) byAccount.set(uid, []);
      const arr = byAccount.get(uid)!;
      if (!arr.includes(r.shipment_id)) arr.push(r.shipment_id);
    }

    // Obtener tokens
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

    // ── Intento 1: Descargar etiquetas frescas de MeLi API ───────────────
    const pdfChunks: ArrayBuffer[] = [];

    for (const [uid, shipmentIds] of Array.from(byAccount.entries())) {
      const token = tokenMap.get(uid);
      if (!token) continue;

      // MeLi: max ~20 IDs por request para evitar timeout
      for (let i = 0; i < shipmentIds.length; i += 20) {
        const batch = shipmentIds.slice(i, i + 20);
        const idsParam = batch.join(",");
        const pdfBuffer = await meliGetRawLong(
          `/shipment_labels?shipment_ids=${idsParam}&response_type=pdf`,
          token,
          25000
        );
        if (pdfBuffer && pdfBuffer.byteLength > 100) {
          pdfChunks.push(pdfBuffer);
        }
      }
    }

    // ── Intento 2 (fallback): Si MeLi falló, usar PDFs almacenados ───────
    if (pdfChunks.length === 0) {
      console.warn("[historial] MeLi API falló, usando PDFs almacenados como fallback");
      const uniqueUrls: string[] = Array.from(new Set(
        records.map((r: { file_path: string }) => r.file_path).filter(Boolean)
      ));

      for (const url of uniqueUrls) {
        try {
          const response = await fetch(url);
          if (response.ok) {
            pdfChunks.push(await response.arrayBuffer());
          }
        } catch { /* skip */ }
      }
    }

    if (pdfChunks.length === 0) {
      return NextResponse.json(
        { error: "No se pudieron obtener las etiquetas" },
        { status: 502 }
      );
    }

    // Combinar PDFs
    const pdfDoc = await PDFDocument.create();
    for (const chunk of pdfChunks) {
      try {
        const src = await PDFDocument.load(chunk, { ignoreEncryption: true });
        const copiedPages = await pdfDoc.copyPages(src, src.getPageIndices());
        copiedPages.forEach((page) => pdfDoc.addPage(page));
      } catch {
        console.warn("[historial] PDF inválido, saltando...");
      }
    }

    if (pdfDoc.getPageCount() === 0) {
      return NextResponse.json({ error: "No se pudo generar el PDF" }, { status: 502 });
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
      { error: `Error: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
