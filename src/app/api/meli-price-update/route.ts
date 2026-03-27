import { NextResponse } from "next/server";
import { getActiveAccounts, getValidToken, meliGet } from "@/lib/meli";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 120;

function normalize(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

async function meliPut(path: string, token: string, body: unknown) {
  try {
    const res = await fetch(`https://api.mercadolibre.com${path}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    return { ok: false, status: 0, data: { message: (e as Error).message } };
  }
}

async function getAllItemIds(userId: string, token: string, status: string): Promise<string[]> {
  const ids: string[] = [];
  let offset = 0;
  while (offset < 2000) {
    const d = await meliGet(`/users/${userId}/items/search?status=${status}&limit=100&offset=${offset}`, token);
    const r = (d?.results ?? []) as string[];
    if (!r.length) break;
    ids.push(...r);
    const total = (d?.paging?.total as number | undefined) ?? r.length;
    offset += 100;
    if (offset >= total) break;
    await new Promise(r => setTimeout(r, 150));
  }
  return ids;
}

interface ItemDetail {
  id: string;
  title: string;
  price: number;
  currency_id: string;
  status: string;
  catalog_listing?: boolean;
  catalog_product_id?: string;
  deal_ids?: string[];
  variations?: Array<{
    id: number;
    price: number;
    [k: string]: unknown;
  }>;
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      keyword: string;
      target_price: number;
      dry_run?: boolean;
      account_ids?: string[];
    };

    const { keyword, target_price, dry_run = false, account_ids } = body;

    if (!keyword?.trim() || !target_price || target_price <= 0) {
      return NextResponse.json({ error: "keyword y target_price (>0) son requeridos" }, { status: 400 });
    }

    const normKeyword = normalize(keyword);
    let accounts = await getActiveAccounts();
    if (account_ids?.length) {
      accounts = accounts.filter(a => account_ids.includes(a.id));
    }

    if (!accounts.length) {
      return NextResponse.json({ error: "No hay cuentas activas" }, { status: 404 });
    }

    const results: Array<{
      account: string;
      item_id: string;
      title: string;
      old_price: number;
      new_price: number;
      status: "updated" | "skipped" | "error" | "catalog_warning" | "promo_blocked";
      reason?: string;
      variations_updated?: number;
    }> = [];

    for (const acc of accounts) {
      const token = await getValidToken(acc);
      if (!token) {
        results.push({
          account: acc.nickname, item_id: "", title: "",
          old_price: 0, new_price: 0, status: "error", reason: "token_expired",
        });
        continue;
      }

      const [activeIds, pausedIds] = await Promise.all([
        getAllItemIds(String(acc.meli_user_id), token, "active"),
        getAllItemIds(String(acc.meli_user_id), token, "paused"),
      ]);
      const allIds = [...activeIds, ...pausedIds];

      for (let i = 0; i < allIds.length; i += 20) {
        const chunk = allIds.slice(i, i + 20);
        const data = await meliGet(
          `/items?ids=${chunk.join(",")}&attributes=id,title,price,currency_id,status,catalog_listing,catalog_product_id,deal_ids,variations`,
          token
        );
        const list = (data ?? []) as Array<{ code: number; body: ItemDetail }>;

        for (const entry of list) {
          if (entry.code !== 200 || !entry.body) continue;
          const item = entry.body;
          const normTitle = normalize(item.title);

          if (!normTitle.includes(normKeyword)) continue;

          const isCatalog = !!(item.catalog_listing || item.catalog_product_id);
          const hasPromo = Array.isArray(item.deal_ids) && item.deal_ids.length > 0;

          if (item.price >= target_price && !(item.variations?.length)) {
            results.push({
              account: acc.nickname, item_id: item.id, title: item.title,
              old_price: item.price, new_price: item.price,
              status: "skipped", reason: "Precio ya es igual o superior",
            });
            continue;
          }

          if (dry_run) {
            results.push({
              account: acc.nickname, item_id: item.id, title: item.title,
              old_price: item.price, new_price: target_price,
              status: isCatalog ? "catalog_warning" : "updated",
              reason: isCatalog ? "Item de catalogo - subir precio puede perder Buy Box" : undefined,
            });
            continue;
          }

          if (item.variations?.length) {
            let varsUpdated = 0;
            const updatedVars = item.variations.map(v => {
              if (v.price < target_price) {
                varsUpdated++;
                return { ...v, price: target_price };
              }
              return v;
            });

            if (varsUpdated === 0) {
              results.push({
                account: acc.nickname, item_id: item.id, title: item.title,
                old_price: item.price, new_price: item.price,
                status: "skipped", reason: "Todas las variaciones ya tienen precio igual o superior",
              });
              continue;
            }

            const putBody: Record<string, unknown> = {
              variations: updatedVars.map(v => ({ id: v.id, price: v.price })),
            };
            if (item.price < target_price) putBody.price = target_price;

            const putRes = await meliPut(`/items/${item.id}`, token, putBody);

            if (!putRes.ok) {
              const errMsg = (putRes.data as Record<string, unknown>)?.message as string ?? "";
              const isPromoBlock = errMsg.includes("promotion") || errMsg.includes("deal") || putRes.status === 400;
              results.push({
                account: acc.nickname, item_id: item.id, title: item.title,
                old_price: item.price, new_price: target_price,
                status: hasPromo && isPromoBlock ? "promo_blocked" : "error",
                reason: hasPromo && isPromoBlock
                  ? "Publicacion en promocion activa, no permite cambiar precio"
                  : errMsg.slice(0, 200),
              });
            } else {
              results.push({
                account: acc.nickname, item_id: item.id, title: item.title,
                old_price: item.price, new_price: target_price,
                status: isCatalog ? "catalog_warning" : "updated",
                reason: isCatalog ? "Actualizado - Item de catalogo, verificar Buy Box" : undefined,
                variations_updated: varsUpdated,
              });
            }
          } else {
            if (item.price >= target_price) {
              results.push({
                account: acc.nickname, item_id: item.id, title: item.title,
                old_price: item.price, new_price: item.price,
                status: "skipped", reason: "Precio ya es igual o superior",
              });
              continue;
            }

            const putRes = await meliPut(`/items/${item.id}`, token, { price: target_price });

            if (!putRes.ok) {
              const errMsg = (putRes.data as Record<string, unknown>)?.message as string ?? "";
              const isPromoBlock = errMsg.includes("promotion") || errMsg.includes("deal") || putRes.status === 400;
              results.push({
                account: acc.nickname, item_id: item.id, title: item.title,
                old_price: item.price, new_price: target_price,
                status: hasPromo && isPromoBlock ? "promo_blocked" : "error",
                reason: hasPromo && isPromoBlock
                  ? "Publicacion en promocion activa, no permite cambiar precio"
                  : errMsg.slice(0, 200),
              });
            } else {
              results.push({
                account: acc.nickname, item_id: item.id, title: item.title,
                old_price: item.price, new_price: target_price,
                status: isCatalog ? "catalog_warning" : "updated",
                reason: isCatalog ? "Actualizado - Item de catalogo, verificar Buy Box" : undefined,
              });
            }
          }

          await new Promise(r => setTimeout(r, 200));
        }

        if (allIds.length > 40) await new Promise(r => setTimeout(r, 150));
      }
    }

    const updated = results.filter(r => r.status === "updated" || r.status === "catalog_warning").length;
    const skipped = results.filter(r => r.status === "skipped").length;
    const errors  = results.filter(r => r.status === "error" || r.status === "promo_blocked").length;

    return NextResponse.json({
      keyword,
      target_price,
      dry_run,
      results,
      summary: { total: results.length, updated, skipped, errors },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
