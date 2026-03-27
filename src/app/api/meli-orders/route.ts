import { NextResponse } from "next/server";
import { getActiveAccounts, getValidToken, meliGet } from "@/lib/meli";

export const dynamic  = "force-dynamic";
export const revalidate = 0;

function todayArgentina(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
}

export async function GET() {
  try {
    const accounts = await getActiveAccounts();
    if (!accounts.length) return NextResponse.json([]);

    const today = todayArgentina();

    const results = await Promise.all(accounts.map(async (acc) => {
      try {
        const token = await getValidToken(acc);
        if (!token) {
          return { account: acc.nickname, meli_user_id: String(acc.meli_user_id), orders: { total: 0, amount: 0, results: [] }, shipments: { total: 0, results: [] }, error: "token_expired" };
        }

        const [ordersData, shipData] = await Promise.all([
          meliGet(`/orders/search?seller=${acc.meli_user_id}&order.status=paid&sort=date_desc&limit=50`, token),
          meliGet(`/shipments/search?seller_id=${acc.meli_user_id}&status=ready_to_ship&limit=50`, token),
        ]);

        const allOrders = (ordersData?.results ?? []) as Record<string, unknown>[];
        const todayOrders = allOrders.filter(o => {
          const d = (o.date_created as string | undefined) ?? "";
          return d.startsWith(today);
        });

        const totalAmount = todayOrders.reduce((s, o) => {
          const total = o.total_amount as number | undefined;
          return s + (total ?? 0);
        }, 0);

        const orderItems = await Promise.all(
          todayOrders.slice(0, 20).map(async (o) => {
            const rawItems = (o.order_items as Record<string, unknown>[] | undefined) ?? [];
            const items = rawItems.map((oi) => {
              const item = (oi.item as Record<string, unknown> | undefined) ?? {};
              return {
                title:     (item.title as string | undefined)     ?? "Producto",
                thumbnail: (item.thumbnail as string | undefined) ?? null,
                qty:       (oi.quantity as number | undefined)    ?? 1,
                price:     (oi.unit_price as number | undefined)  ?? 0,
              };
            });
            const buyer = (o.buyer as Record<string, unknown> | undefined) ?? {};
            return {
              id:          o.id as number,
              status:      o.status as string,
              date:        o.date_created as string,
              total:       (o.total_amount as number) ?? 0,
              currency:    (o.currency_id as string) ?? "ARS",
              buyer:       `${(buyer.first_name as string | undefined) ?? ""} ${(buyer.last_name as string | undefined) ?? ""}`.trim() || "Comprador",
              shipping_id: (o.shipping as Record<string, unknown> | undefined)?.id as number | null ?? null,
              items,
            };
          })
        );

        const shipResults = (shipData?.results ?? []) as Record<string, unknown>[];
        const shipItems = shipResults.map(s => ({
          id:              s.id as number,
          status:          (s.status as string) ?? "",
          substatus:       (s.substatus as string) ?? "",
          date:            (s.date_created as string) ?? "",
          tracking_number: (s.tracking_number as string | null) ?? null,
          address:         ((s.receiver_address as Record<string, unknown> | undefined)?.street_name as string | undefined) ?? "Sin direccion",
          zip:             ((s.receiver_address as Record<string, unknown> | undefined)?.zip_code as string | undefined) ?? "",
        }));

        return {
          account:      acc.nickname,
          meli_user_id: String(acc.meli_user_id),
          orders:    { total: todayOrders.length, amount: totalAmount, results: orderItems },
          shipments: { total: shipItems.length, results: shipItems },
        };
      } catch (e) {
        return {
          account: acc.nickname, meli_user_id: String(acc.meli_user_id),
          orders: { total: 0, amount: 0, results: [] }, shipments: { total: 0, results: [] },
          error: (e as Error).message,
        };
      }
    }));

    return NextResponse.json(results);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
