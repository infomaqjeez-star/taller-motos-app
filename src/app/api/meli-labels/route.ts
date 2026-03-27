import { NextResponse } from "next/server";
import { getSupabase, getActiveAccounts, getValidToken, meliGet, meliGetRaw } from "@/lib/meli";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

interface ShipmentInfo {
  shipment_id: number;
  account: string;
  meli_user_id: string;
  type: "flex" | "turbo" | "correo";
  buyer: string;
  title: string;
  status: string;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") ?? "list";
  const format = searchParams.get("format") ?? "pdf";

  try {
    const accounts = await getActiveAccounts();
    if (!accounts.length) return NextResponse.json({ shipments: [], summary: {} });

    const supabase = getSupabase();
    const { data: printed } = await supabase.from("meli_printed_labels").select("shipment_id");
    const printedSet = new Set((printed ?? []).map((p: { shipment_id: number }) => p.shipment_id));

    const allShipments: ShipmentInfo[] = [];
    const tokenCache = new Map<string, string>();

    await Promise.all(accounts.map(async (acc) => {
      try {
        const token = await getValidToken(acc);
        if (!token) return;
        tokenCache.set(String(acc.meli_user_id), token);

        const data = await meliGet(
          `/orders/search?seller=${acc.meli_user_id}&order.status=paid&sort=date_desc&limit=50&shipping.status=ready_to_ship`,
          token
        );
        const dataHandling = await meliGet(
          `/orders/search?seller=${acc.meli_user_id}&order.status=paid&sort=date_desc&limit=50&shipping.status=handling`,
          token
        );
        const orders = [
          ...((data?.results ?? []) as Array<Record<string, unknown>>),
          ...((dataHandling?.results ?? []) as Array<Record<string, unknown>>),
        ];
        const seen = new Set<number>();

        for (const order of orders) {
          const ship = order.shipping as Record<string, unknown> | undefined;
          if (!ship?.id) continue;
          const sid = ship.id as number;
          if (seen.has(sid) || printedSet.has(sid)) continue;
          seen.add(sid);

          const logistic = (ship.logistic_type as string | undefined) ?? "";
          let type: "flex" | "turbo" | "correo" = "correo";
          if (logistic === "self_service" || logistic.includes("flex")) type = "flex";
          else if (logistic.includes("fulfillment")) type = "turbo";

          const items = (order.order_items as Array<{ item?: { title?: string } }> | undefined) ?? [];
          const buyer = order.buyer as Record<string, unknown> | undefined;

          allShipments.push({
            shipment_id: sid,
            account:     acc.nickname,
            meli_user_id: String(acc.meli_user_id),
            type,
            buyer: `${(buyer?.first_name as string | undefined) ?? ""} ${(buyer?.last_name as string | undefined) ?? ""}`.trim(),
            title: items[0]?.item?.title ?? "Producto",
            status: (ship.status as string | undefined) ?? "ready_to_ship",
          });
        }
      } catch { /* skip account on error */ }
    }));

    const typeOrder = { correo: 0, turbo: 1, flex: 2 };
    allShipments.sort((a, b) => typeOrder[a.type] - typeOrder[b.type]);

    if (action === "list") {
      const correo = allShipments.filter(s => s.type === "correo").length;
      const turbo  = allShipments.filter(s => s.type === "turbo").length;
      const flex   = allShipments.filter(s => s.type === "flex").length;
      return NextResponse.json({
        shipments: allShipments,
        summary: { total: allShipments.length, correo, turbo, flex },
      });
    }

    if (!allShipments.length) {
      return NextResponse.json({ error: "No hay envíos pendientes" }, { status: 404 });
    }

    const selectedIds = searchParams.get("ids");
    const targetShipments = selectedIds
      ? allShipments.filter(s => selectedIds.split(",").includes(String(s.shipment_id)))
      : allShipments;

    if (!targetShipments.length) {
      return NextResponse.json({ error: "No hay envíos seleccionados" }, { status: 400 });
    }

    const byAccount = new Map<string, { token: string; ids: number[] }>();
    for (const s of targetShipments) {
      if (!byAccount.has(s.meli_user_id)) {
        const cachedToken = tokenCache.get(s.meli_user_id);
        if (!cachedToken) continue;
        byAccount.set(s.meli_user_id, { token: cachedToken, ids: [] });
      }
      byAccount.get(s.meli_user_id)!.ids.push(s.shipment_id);
    }

    const pdfChunks: ArrayBuffer[] = [];
    const response = format === "zpl" ? "zpl2" : "pdf";

    for (const accData of Array.from(byAccount.values())) {
      for (let i = 0; i < accData.ids.length; i += 50) {
        const batch = accData.ids.slice(i, i + 50);
        const idsParam = batch.join(",");
        const pdf = await meliGetRaw(
          `/shipment_labels?shipment_ids=${idsParam}&response_type=${response}&savePdf=Y`,
          accData.token
        );
        if (pdf && pdf.byteLength > 100) pdfChunks.push(pdf);
        if (accData.ids.length > 50) await new Promise(r => setTimeout(r, 200));
      }
    }

    if (!pdfChunks.length) {
      return NextResponse.json({ error: "No se pudieron descargar etiquetas" }, { status: 500 });
    }

    if (pdfChunks.length === 1) {
      const contentType = format === "zpl" ? "application/octet-stream" : "application/pdf";
      const ext = format === "zpl" ? "zpl" : "pdf";
      return new NextResponse(pdfChunks[0], {
        headers: {
          "Content-Type":        contentType,
          "Content-Disposition": `attachment; filename="etiquetas-appjeez.${ext}"`,
        },
      });
    }

    const biggest = pdfChunks.reduce((a, b) => a.byteLength > b.byteLength ? a : b);
    const contentType = format === "zpl" ? "application/octet-stream" : "application/pdf";
    const ext = format === "zpl" ? "zpl" : "pdf";

    return new NextResponse(biggest, {
      headers: {
        "Content-Type":        contentType,
        "Content-Disposition": `attachment; filename="etiquetas-appjeez.${ext}"`,
        "X-Total-Labels":      String(targetShipments.length),
        "X-PDF-Parts":         String(pdfChunks.length),
      },
    });

  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { shipment_ids } = await req.json() as { shipment_ids: number[] };
    if (!shipment_ids?.length) {
      return NextResponse.json({ error: "No shipment_ids" }, { status: 400 });
    }
    const supabase = getSupabase();
    const rows = shipment_ids.map(id => ({ shipment_id: id }));
    await supabase.from("meli_printed_labels").upsert(rows, { onConflict: "shipment_id" });
    return NextResponse.json({ ok: true, marked: shipment_ids.length });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
