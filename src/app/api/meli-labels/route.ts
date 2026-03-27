import { NextResponse } from "next/server";
import { getSupabase, getActiveAccounts, getValidToken, meliGet, meliGetRaw } from "@/lib/meli";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

type UrgencyType = "delayed" | "today" | "upcoming";
type LogisticType = "flex" | "turbo" | "correo";

interface ShipmentInfo {
  shipment_id: number;
  account: string;
  meli_user_id: string;
  type: LogisticType;
  buyer: string;
  title: string;
  status: string;
  urgency: UrgencyType;
  delivery_date: string | null;
}

function classifyUrgency(deliveryDate: string | null): UrgencyType {
  if (!deliveryDate) return "upcoming";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const delivery = new Date(deliveryDate);
  delivery.setHours(0, 0, 0, 0);
  if (delivery.getTime() < today.getTime()) return "delayed";
  if (delivery.getTime() === today.getTime()) return "today";
  return "upcoming";
}

function classifyType(logisticType: string, tags: string[]): LogisticType {
  const lt = (logisticType ?? "").toLowerCase();
  const tagStr = (tags ?? []).join(",").toLowerCase();
  if (
    tagStr.includes("turbo") ||
    tagStr.includes("same_day") ||
    tagStr.includes("express") ||
    lt === "turbo"
  ) return "turbo";
  if (lt === "self_service" || lt.includes("flex")) return "flex";
  return "correo";
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") ?? "list";
  const format = searchParams.get("format") ?? "pdf";
  const supabase = getSupabase();

  if (action === "history") {
    const { data } = await supabase
      .from("meli_printed_labels")
      .select("*")
      .order("printed_at", { ascending: false })
      .limit(100);
    return NextResponse.json({ shipments: data ?? [] });
  }

  try {
    const accounts = await getActiveAccounts();
    if (!accounts.length) return NextResponse.json({ shipments: [], summary: {} });

    const { data: printed } = await supabase.from("meli_printed_labels").select("shipment_id");
    const printedSet = new Set((printed ?? []).map((p: { shipment_id: number }) => p.shipment_id));

    const allShipments: ShipmentInfo[] = [];
    const tokenCache = new Map<string, string>();

    await Promise.all(accounts.map(async (acc) => {
      try {
        const token = await getValidToken(acc);
        if (!token) return;
        tokenCache.set(String(acc.meli_user_id), token);

        const [dataReady, dataHandling] = await Promise.all([
          meliGet(`/orders/search?seller=${acc.meli_user_id}&order.status=paid&sort=date_desc&limit=50&shipping.status=ready_to_ship`, token),
          meliGet(`/orders/search?seller=${acc.meli_user_id}&order.status=paid&sort=date_desc&limit=50&shipping.status=handling`, token),
        ]);

        const orders = [
          ...((dataReady?.results ?? []) as Array<Record<string, unknown>>),
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
          const tags = (ship.tags as string[] | undefined) ?? [];
          const type = classifyType(logistic, tags);

          const items = (order.order_items as Array<{ item?: { title?: string } }> | undefined) ?? [];
          const buyer = order.buyer as Record<string, unknown> | undefined;

          let deliveryDate: string | null = null;
          const shippingOpt = ship.shipping_option as Record<string, unknown> | undefined;
          const deliveryLimit = shippingOpt?.estimated_delivery_limit as Record<string, unknown> | undefined;
          if (deliveryLimit?.date) deliveryDate = deliveryLimit.date as string;

          allShipments.push({
            shipment_id: sid,
            account: acc.nickname,
            meli_user_id: String(acc.meli_user_id),
            type,
            buyer: `${(buyer?.first_name as string | undefined) ?? ""} ${(buyer?.last_name as string | undefined) ?? ""}`.trim(),
            title: items[0]?.item?.title ?? "Producto",
            status: (ship.status as string | undefined) ?? "ready_to_ship",
            urgency: classifyUrgency(deliveryDate),
            delivery_date: deliveryDate,
          });
        }
      } catch { /* skip account */ }
    }));

    // Fetch shipment details for accurate type + delivery date
    const byAccountMap = new Map<string, { token: string; ids: number[] }>();
    for (const s of allShipments) {
      if (!byAccountMap.has(s.meli_user_id)) {
        const t = tokenCache.get(s.meli_user_id);
        if (!t) continue;
        byAccountMap.set(s.meli_user_id, { token: t, ids: [] });
      }
      byAccountMap.get(s.meli_user_id)!.ids.push(s.shipment_id);
    }

    await Promise.all(
      Array.from(byAccountMap.values()).map(async ({ token, ids }) => {
        await Promise.all(
          ids.map(async (sid) => {
            try {
              const detail = await meliGet(`/shipments/${sid}`, token) as Record<string, unknown> | null;
              if (!detail) return;

              const s = allShipments.find(x => x.shipment_id === sid);
              if (!s) return;

              const lt = (detail.logistic_type as string | undefined) ?? "";
              const tags = (detail.tags as string[] | undefined) ?? [];
              s.type = classifyType(lt, tags);

              const estDelivery =
                (detail.estimated_delivery_limit as Record<string, unknown> | undefined) ??
                ((detail.shipping_option as Record<string, unknown> | undefined)
                  ?.estimated_delivery_limit as Record<string, unknown> | undefined);
              if (estDelivery?.date) {
                s.delivery_date = estDelivery.date as string;
                s.urgency = classifyUrgency(s.delivery_date);
              }
            } catch { /* skip */ }
          })
        );
      })
    );

    const urgencyOrder: Record<UrgencyType, number> = { delayed: 0, today: 1, upcoming: 2 };
    const typeOrder: Record<LogisticType, number> = { correo: 0, turbo: 1, flex: 2 };
    allShipments.sort((a, b) => {
      const ud = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      return ud !== 0 ? ud : typeOrder[a.type] - typeOrder[b.type];
    });

    if (action === "list") {
      return NextResponse.json({
        shipments: allShipments,
        summary: {
          total:    allShipments.length,
          correo:   allShipments.filter(s => s.type === "correo").length,
          turbo:    allShipments.filter(s => s.type === "turbo").length,
          flex:     allShipments.filter(s => s.type === "flex").length,
          delayed:  allShipments.filter(s => s.urgency === "delayed").length,
          today:    allShipments.filter(s => s.urgency === "today").length,
          upcoming: allShipments.filter(s => s.urgency === "upcoming").length,
        },
      });
    }

    // action === "download"
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

    const biggest = pdfChunks.reduce((a, b) => a.byteLength > b.byteLength ? a : b);
    const contentType = format === "zpl" ? "application/octet-stream" : "application/pdf";
    const ext = format === "zpl" ? "zpl" : "pdf";

    return new NextResponse(biggest, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="etiquetas-appjeez.${ext}"`,
        "X-Total-Labels": String(targetShipments.length),
      },
    });

  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { shipment_ids, shipments } = await req.json() as {
      shipment_ids: number[];
      shipments?: Array<{ shipment_id: number; account?: string; type?: string; buyer?: string; title?: string }>;
    };
    if (!shipment_ids?.length) {
      return NextResponse.json({ error: "No shipment_ids" }, { status: 400 });
    }
    const supabase = getSupabase();
    const rows = shipment_ids.map(id => {
      const detail = shipments?.find(s => s.shipment_id === id);
      return {
        shipment_id: id,
        account:    detail?.account ?? null,
        type:       detail?.type ?? null,
        buyer:      detail?.buyer ?? null,
        title:      detail?.title ?? null,
        printed_at: new Date().toISOString(),
      };
    });
    await supabase.from("meli_printed_labels").upsert(rows, { onConflict: "shipment_id" });
    return NextResponse.json({ ok: true, marked: shipment_ids.length });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
