// v9 - Bulk por cuenta + auto-detect: si MeLi no agrupa, combinar 3 por A4
import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { getSupabase, getActiveAccounts, getValidToken } from "@/lib/meli";

export const runtime = "nodejs";
export const maxDuration = 60;

async function meliGetRaw(path: string, token: string, timeoutMs = 25000): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(`https://api.mercadolibre.com${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    return res.arrayBuffer();
  } catch { return null; }
}

export async function POST(req: NextRequest) {
  try {
    const { ids, meli_user_id } = await req.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
    }

    const supabase = getSupabase();
    const uniqueIds: string[] = Array.from(new Set(ids));

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

    // Dedup y agrupar por cuenta
    const byAccount = new Map<string, number[]>();
    const seenSids = new Set<number>();
    for (const r of records) {
      if (seenSids.has(r.shipment_id)) continue;
      seenSids.add(r.shipment_id);
      const uid = String(r.meli_user_id);
      if (!byAccount.has(uid)) byAccount.set(uid, []);
      byAccount.get(uid)!.push(r.shipment_id);
    }

    const totalLabels = seenSids.size;

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

    // ── Descargar etiquetas en bulk por cuenta ──────────────────────────
    const pdfChunks: ArrayBuffer[] = [];

    for (const [uid, shipmentIds] of Array.from(byAccount.entries())) {
      const token = tokenMap.get(uid);
      if (!token) continue;

      for (let i = 0; i < shipmentIds.length; i += 50) {
        const batch = shipmentIds.slice(i, i + 50);
        const buf = await meliGetRaw(
          `/shipment_labels?shipment_ids=${batch.join(",")}&response_type=pdf`,
          token
        );
        if (buf && buf.byteLength > 100) pdfChunks.push(buf);
      }
    }

    // Fallback a PDFs almacenados
    if (pdfChunks.length === 0) {
      const uniqueUrls: string[] = Array.from(new Set(
        records.map((r: { file_path: string }) => r.file_path).filter(Boolean)
      ));
      for (const url of uniqueUrls) {
        try {
          const response = await fetch(url);
          if (response.ok) pdfChunks.push(await response.arrayBuffer());
        } catch { /* skip */ }
      }
    }

    if (pdfChunks.length === 0) {
      return NextResponse.json({ error: "No se pudieron obtener las etiquetas" }, { status: 502 });
    }

    // ── Cargar todas las páginas ─────────────────────────────────────────
    const allPages: { doc: PDFDocument; idx: number }[] = [];
    for (const chunk of pdfChunks) {
      try {
        const src = await PDFDocument.load(chunk, { ignoreEncryption: true });
        for (const idx of src.getPageIndices()) {
          allPages.push({ doc: src, idx });
        }
      } catch { /* skip */ }
    }

    if (allPages.length === 0) {
      return NextResponse.json({ error: "No se pudo generar el PDF" }, { status: 502 });
    }

    // ── Detectar si MeLi ya agrupó las etiquetas ────────────────────────
    // Si MeLi agrupó 3 por A4: 10 labels → ~4 páginas (< 10) → ya agrupadas
    // Si son individuales (Flex/1 por pág): 10 labels → 10 páginas (>= 10) → combinar
    // Si son individuales (2 pág por label): 10 labels → 20 páginas (>= 10) → combinar
    const isAlreadyGrouped = allPages.length < totalLabels;

    // ── Combinar PDFs de todas las cuentas ───────────────────────────────
    // Si MeLi ya agrupó (Correo: 3 por A4), copiar tal cual.
    // Si son individuales (Flex: 1 por página), agrupar 3 por A4 landscape
    // sin escalar el contenido (cada etiqueta 10x15cm = 283x425 pt).
    const pdfDoc = await PDFDocument.create();

    if (isAlreadyGrouped) {
      // Ya agrupadas: copiar páginas directamente
      for (const { doc, idx } of allPages) {
        const [copied] = await pdfDoc.copyPages(doc, [idx]);
        pdfDoc.addPage(copied);
      }
    } else {
      // Etiquetas individuales (Flex): 3 por página, tamaño exacto sin márgenes
      // Página custom = 3 etiquetas de ancho × 1 etiqueta de alto
      // Al imprimir "ajustar a página" en A4 landscape queda perfecto
      const LBL_W = 269.29; // 95mm en pt
      const LBL_H = 425.2;  // 150mm en pt
      const PAGE_W = LBL_W * 3; // 850.38pt

      for (let i = 0; i < allPages.length; i += 3) {
        const group = allPages.slice(i, i + 3);
        const page = pdfDoc.addPage([PAGE_W, LBL_H]);
        for (let j = 0; j < group.length; j++) {
          const { doc, idx } = group[j];
          const embedded = await pdfDoc.embedPage(doc.getPage(idx));
          page.drawPage(embedded, { x: j * LBL_W, y: 0, width: LBL_W, height: LBL_H });
        }
      }
    }

    return new NextResponse(Buffer.from(await pdfDoc.save()), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="historial-etiquetas-${new Date().toISOString().slice(0, 10)}.pdf"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Error: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
