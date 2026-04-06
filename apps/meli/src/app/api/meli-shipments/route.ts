import { NextResponse } from "next/server";
import { getActiveAccounts, getValidToken, meliGet } from "@/lib/meli";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function classifyLogistic(type: string | null | undefined): "flex" | "turbo" | "full" | "correo" {
  if (!type) return "correo";
  const t = type.toLowerCase();
  if (t === "self_service" || t === "flex" || t.includes("flex")) return "flex";
  if (t === "turbo" || t === "self_service_turbo" || t.includes("turbo")) return "turbo";
  if (t === "fulfillment") return "full";
  return "correo";
}

function urgency(limitDate: string | null): "overdue" | "urgent" | "soon" | "ok" {
  if (!limitDate) return "ok";
  const diffH = (new Date(limitDate).getTime() - Date.now()) / 3600000;
  if (diffH < 0)   return "overdue";
  if (diffH < 2)   return "urgent";
  if (diffH < 6)   return "soon";
  return "ok";
}

interface MeliOrder {
  id: number;
  shipping?: {
    id?: number;
    logistic_type?: string;
    status?: string;
    substatus?: string;
    tracking_number?: string;
    date_created?: string;
    shipping_limit?: string;
    estimated_handling_limit?: string;
  };
  date_created?: string;
}

export async function GET() {
  try {
    const accounts = await getActiveAccounts();
    if (!accounts.length) return NextResponse.json({ ready: [], upcoming: [], full_count: 0, turbo_count: 0 });

    const ready:    object[] = [];
    const upcoming: object[] = [];
    let   fullCount  = 0;
    let   turboCount = 0;

    await Promise.all(accounts.map(async (acc) => {
      try {
        const token = await getValidToken(acc);
        if (!token) return;

        // Obtener órdenes con diferentes estados de envío
        const [ordersReadyToShip, ordersHandling, fullOrders, ordersTurbo] = await Promise.all([
          meliGet(`/orders/search?seller=${acc.meli_user_id}&order.status=paid&shipping.status=ready_to_ship&limit=50`, token),
          meliGet(`/orders/search?seller=${acc.meli_user_id}&order.status=paid&shipping.status=handling&limit=50`, token),
          meliGet(`/orders/search?seller=${acc.meli_user_id}&order.status=paid&shipping.logistic_type=fulfillment&limit=1`, token),
          meliGet(`/orders/search?seller=${acc.meli_user_id}&order.status=paid&shipping.logistic_type=turbo&limit=1`, token),
        ]);

        fullCount  += fullOrders?.paging?.total  ?? 0;
        turboCount += ordersTurbo?.paging?.total ?? 0;

        const toItem = (order: MeliOrder, listType: "ready" | "upcoming") => {
          const s = order.shipping ?? {};
          const logType = classifyLogistic(s.logistic_type);
          const limit   = s.shipping_limit ?? s.estimated_handling_limit ?? null;
          return {
            shipment_id:     s.id ?? null,
            order_id:        order.id,
            account:         acc.nickname,
            logistic_type:   s.logistic_type ?? "unknown",
            type:            logType,
            substatus:       s.substatus ?? null,
            tracking_number: s.tracking_number ?? null,
            date_created:    order.date_created ?? null,
            shipping_limit:  limit,
            urgency:         urgency(limit),
            list_type:       listType,
            label_url:       s.id ? `https://www.mercadolibre.com.ar/envios/details/${s.id}` : null,
          };
        };

        for (const order of (ordersReadyToShip?.results ?? []) as MeliOrder[]) {
          if (classifyLogistic(order.shipping?.logistic_type) !== "full") {
            ready.push(toItem(order, "ready"));
          }
        }
        for (const order of (ordersHandling?.results ?? []) as MeliOrder[]) {
          if (classifyLogistic(order.shipping?.logistic_type) !== "full") {
            upcoming.push(toItem(order, "upcoming"));
          }
        }
      } catch { /* skip */ }
    }));

    const urgencyOrder = { overdue: 0, urgent: 1, soon: 2, ok: 3 };
    const sortFn = (a: object, b: object) => {
      const au = urgencyOrder[(a as { urgency: keyof typeof urgencyOrder }).urgency] ?? 3;
      const bu = urgencyOrder[(b as { urgency: keyof typeof urgencyOrder }).urgency] ?? 3;
      return au - bu;
    };
    ready.sort(sortFn);
    upcoming.sort(sortFn);

    return NextResponse.json({ ready, upcoming, full_count: fullCount, turbo_count: turboCount });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
