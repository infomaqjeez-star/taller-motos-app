import { NextRequest, NextResponse } from "next/server";
import { getActiveAccounts, getValidToken, meliGet, MeliAccount } from "@/lib/meli";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

type LogisticType = "correo" | "flex" | "turbo" | "full" | "other";

function classifyLogistic(lt: string, tags: string[]): LogisticType {
  const l = (lt ?? "").toLowerCase();
  const t = tags.join(",").toLowerCase();
  if (l === "fulfillment" || l.includes("fulfillment") || t.includes("fulfillment")) return "full";
  if (t.includes("turbo") || t.includes("same_day")) return "turbo";
  if (l === "self_service" || t.includes("flex")) return "flex";
  if (l === "cross_docking" || l === "drop_off" || l === "xd_drop_off") return "correo";
  return "correo";
}

function getPeriodDates(period: string): { from: Date; to: Date; days: number } {
  const to = new Date();
  const from = new Date();
  if (period === "today") {
    from.setHours(0, 0, 0, 0);
    return { from, to, days: 1 };
  }
  const days = period === "30d" ? 30 : 7;
  from.setDate(from.getDate() - days + 1);
  from.setHours(0, 0, 0, 0);
  return { from, to, days };
}

async function processAccount(
  acc: MeliAccount,
  from: Date,
  to: Date,
  days: number
) {
  const token = await getValidToken(acc);
  if (!token) return null;

  const uid = String(acc.meli_user_id);
  const fromStr = from.toISOString().slice(0, 10);

  // Fetch orders across multiple pages to cover the period
  const allOrders: Record<string, unknown>[] = [];
  let offset = 0;
  const limit = 50;
  // Fetch up to 4 pages (200 orders) to cover 30 days
  const maxPages = days <= 1 ? 1 : days <= 7 ? 2 : 4;
  for (let page = 0; page < maxPages; page++) {
    const data = await meliGet(
      `/orders/search?seller=${uid}&order.status=paid&sort=date_desc&limit=${limit}&offset=${offset}`,
      token
    ) as { results?: Record<string, unknown>[]; paging?: { total?: number } } | null;
    const results = data?.results ?? [];
    allOrders.push(...results);
    if (results.length < limit) break;
    offset += limit;
  }

  // Filter by date range
  const orders = allOrders.filter(o => {
    const d = (o.date_created as string | undefined) ?? "";
    return d >= fromStr;
  });

  // -- Sales by day
  const salesMap = new Map<string, { orders: number; amount: number }>();
  // pre-fill all days in range
  for (let i = 0; i < days; i++) {
    const d = new Date(from);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    salesMap.set(key, { orders: 0, amount: 0 });
  }
  for (const o of orders) {
    const day = ((o.date_created as string) ?? "").slice(0, 10);
    if (salesMap.has(day)) {
      const cur = salesMap.get(day)!;
      cur.orders++;
      cur.amount += (o.total_amount as number | undefined) ?? 0;
    }
  }

  // -- Top products
  const productMap = new Map<string, { title: string; sku: string; qty: number; revenue: number }>();
  for (const o of orders) {
    const items = (o.order_items as Array<{
      item?: { id?: string; title?: string; seller_sku?: string };
      quantity?: number;
      unit_price?: number;
    }> | undefined) ?? [];
    for (const item of items) {
      const key = item.item?.id ?? item.item?.title ?? "unknown";
      const existing = productMap.get(key) ?? {
        title: item.item?.title ?? "Producto",
        sku: item.item?.seller_sku ?? "",
        qty: 0,
        revenue: 0,
      };
      existing.qty += item.quantity ?? 1;
      existing.revenue += (item.unit_price ?? 0) * (item.quantity ?? 1);
      productMap.set(key, existing);
    }
  }

  // -- Shipping breakdown
  const shippingBreakdown: Record<LogisticType, number> = { correo: 0, flex: 0, turbo: 0, full: 0, other: 0 };
  for (const o of orders) {
    const ship = o.shipping as Record<string, unknown> | undefined;
    const lt = (ship?.logistic_type as string | undefined) ?? "";
    const tags = (ship?.tags as string[] | undefined) ?? [];
    const orderTags = (o.tags as string[] | undefined) ?? [];
    const type = classifyLogistic(lt, [...tags, ...orderTags]);
    shippingBreakdown[type]++;
  }

  // -- Reputation
  const userData = await meliGet(`/users/${uid}`, token) as Record<string, unknown> | null;
  const rep = userData?.seller_reputation as Record<string, unknown> | undefined;
  const metrics = rep?.metrics as Record<string, unknown> | undefined;
  const transactions = rep?.transactions as Record<string, unknown> | undefined;
  const ratings = transactions?.ratings as Record<string, unknown> | undefined;

  const reputation = rep ? {
    account: acc.nickname,
    meli_user_id: uid,
    level_id: (rep.level_id as string | undefined) ?? "unknown",
    power_seller_status: (rep.power_seller_status as string | undefined) ?? null,
    claims_rate: ((metrics?.claims as Record<string, unknown> | undefined)?.rate as number | undefined) ?? 0,
    cancellations_rate: ((metrics?.cancellations as Record<string, unknown> | undefined)?.rate as number | undefined) ?? 0,
    delayed_rate: ((metrics?.delayed_handling_time as Record<string, unknown> | undefined)?.rate as number | undefined) ?? 0,
    transactions_total: (transactions?.total as number | undefined) ?? 0,
    transactions_completed: (transactions?.completed as number | undefined) ?? 0,
    ratings_positive: (ratings?.positive as number | undefined) ?? 0,
    ratings_negative: (ratings?.negative as number | undefined) ?? 0,
  } : null;

  const totalAmount = orders.reduce((s, o) => s + ((o.total_amount as number | undefined) ?? 0), 0);

  return {
    account: acc.nickname,
    meli_user_id: uid,
    sales_by_day: Array.from(salesMap.entries()).map(([date, v]) => ({ date, ...v })),
    top_products: Array.from(productMap.values()).sort((a, b) => b.qty - a.qty).slice(0, 10),
    shipping_breakdown: shippingBreakdown,
    reputation,
    totals: {
      total_orders: orders.length,
      total_amount: totalAmount,
      avg_ticket: orders.length > 0 ? Math.round(totalAmount / orders.length) : 0,
    },
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") ?? "7d";
    const accountId = searchParams.get("account_id") ?? "all";

    const { from, to, days } = getPeriodDates(period);

    const allAccounts = await getActiveAccounts();
    if (!allAccounts.length) return NextResponse.json({ error: "No hay cuentas activas" }, { status: 400 });

    const accounts = accountId === "all"
      ? allAccounts
      : allAccounts.filter(a => String(a.meli_user_id) === accountId || a.nickname === accountId);

    if (!accounts.length) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });

    const results = await Promise.all(accounts.map(acc => processAccount(acc, from, to, days)));
    const valid = results.filter(Boolean) as NonNullable<typeof results[0]>[];

    // Aggregate across accounts
    const salesByDayMap = new Map<string, { date: string; orders: number; amount: number }>();
    for (const acc of valid) {
      for (const day of acc.sales_by_day) {
        const cur = salesByDayMap.get(day.date) ?? { date: day.date, orders: 0, amount: 0 };
        cur.orders += day.orders;
        cur.amount += day.amount;
        salesByDayMap.set(day.date, cur);
      }
    }

    const productAgg = new Map<string, { title: string; sku: string; qty: number; revenue: number }>();
    for (const acc of valid) {
      for (const p of acc.top_products) {
        const key = p.sku || p.title;
        const cur = productAgg.get(key) ?? { title: p.title, sku: p.sku, qty: 0, revenue: 0 };
        cur.qty += p.qty;
        cur.revenue += p.revenue;
        productAgg.set(key, cur);
      }
    }

    const shippingAgg = { correo: 0, flex: 0, turbo: 0, full: 0, other: 0 };
    for (const acc of valid) {
      shippingAgg.correo += acc.shipping_breakdown.correo;
      shippingAgg.flex += acc.shipping_breakdown.flex;
      shippingAgg.turbo += acc.shipping_breakdown.turbo;
      shippingAgg.full += acc.shipping_breakdown.full;
    }

    const totalOrders = valid.reduce((s, a) => s + a.totals.total_orders, 0);
    const totalAmount = valid.reduce((s, a) => s + a.totals.total_amount, 0);

    return NextResponse.json({
      period,
      account_id: accountId,
      accounts_count: valid.length,
      sales_by_day: Array.from(salesByDayMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
      top_products: Array.from(productAgg.values()).sort((a, b) => b.qty - a.qty).slice(0, 10),
      shipping_breakdown: shippingAgg,
      reputation: valid.map(a => a.reputation).filter(Boolean),
      totals: {
        total_orders: totalOrders,
        total_amount: totalAmount,
        avg_ticket: totalOrders > 0 ? Math.round(totalAmount / totalOrders) : 0,
        cancellation_count: 0, // MeLi no expone esto directamente en orders/search
      },
      per_account: valid.map(a => ({
        account: a.account,
        meli_user_id: a.meli_user_id,
        total_orders: a.totals.total_orders,
        total_amount: a.totals.total_amount,
      })),
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
