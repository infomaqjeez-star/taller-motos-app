import { NextResponse } from "next/server";
import { getSupabase, getActiveAccounts, getValidToken, meliGet } from "@/lib/meli";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 300;

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

async function meliGetWithRetry(path: string, token: string, retries = 3): Promise<unknown> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(`https://api.mercadolibre.com${path}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(12000),
      });
      if (res.status === 429) {
        await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
      if (!res.ok) return null;
      return res.json();
    } catch {
      if (attempt < retries - 1) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  return null;
}

async function getAllItemIdsExhaustive(userId: string, token: string, status: string): Promise<string[]> {
  const ids: string[] = [];
  let offset = 0;
  const limit = 100;

  const first = await meliGetWithRetry(
    `/users/${userId}/items/search?status=${status}&limit=${limit}&offset=0`, token
  ) as { results?: string[]; paging?: { total?: number } } | null;

  if (!first?.results?.length) return ids;
  ids.push(...first.results);
  const total = first.paging?.total ?? first.results.length;

  while (offset + limit < total && offset < 10000) {
    offset += limit;
    const page = await meliGetWithRetry(
      `/users/${userId}/items/search?status=${status}&limit=${limit}&offset=${offset}`, token
    ) as { results?: string[] } | null;
    const r = page?.results ?? [];
    if (!r.length) break;
    ids.push(...r);
    await new Promise(r => setTimeout(r, 180));
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
  variations?: Array<{ id: number; price: number; [k: string]: unknown }>;
}

interface PriceResult {
  account: string;
  item_id: string;
  title: string;
  old_price: number;
  new_price: number;
  status: "updated" | "skipped" | "error" | "catalog_warning" | "promo_blocked" | "cached_skip";
  reason?: string;
  variations_updated?: number;
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      keyword: string;
      target_price: number;
      dry_run?: boolean;
      account_ids?: string[];
      clear_cache?: boolean;
    };

    const { keyword, target_price, dry_run = false, account_ids, clear_cache = false } = body;

    if (!keyword?.trim() || !target_price || target_price <= 0) {
      return NextResponse.json({ error: "keyword y target_price (>0) son requeridos" }, { status: 400 });
    }

    const normKeyword = normalize(keyword);
    const supabase = getSupabase();

    if (clear_cache) {
      await supabase.from("items_keyword_cache").delete().eq("keyword", normKeyword);
    }

    let accounts = await getActiveAccounts();
    if (account_ids?.length) {
      accounts = accounts.filter(a => account_ids.includes(a.id));
    }
    if (!accounts.length) {
      return NextResponse.json({ error: "No hay cuentas activas" }, { status: 404 });
    }

    const { data: cachedRows } = await supabase
      .from("items_keyword_cache")
      .select("item_id, contains_match")
      .eq("keyword", normKeyword);

    const cacheMap = new Map<string, boolean>();
    for (const row of cachedRows ?? []) {
      cacheMap.set(row.item_id, row.contains_match);
    }

    const results: PriceResult[] = [];
    const newCacheRows: Array<{ item_id: string; keyword: string; contains_match: boolean; last_price: number | null }> = [];
    let totalScanned = 0;
    let cacheHits = 0;

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
        getAllItemIdsExhaustive(String(acc.meli_user_id), token, "active"),
        getAllItemIdsExhaustive(String(acc.meli_user_id), token, "paused"),
      ]);
      const allIds = [...activeIds, ...pausedIds];
      totalScanned += allIds.length;

      const idsToCheck = allIds.filter(id => {
        const cached = cacheMap.get(id);
        if (cached === false) { cacheHits++; return false; }
        return true;
      });

      const retryQueue: string[] = [];

      for (let i = 0; i < idsToCheck.length; i += 20) {
        const chunk = idsToCheck.slice(i, i + 20);
        const data = await meliGetWithRetry(
          `/items?ids=${chunk.join(",")}&attributes=id,title,price,currency_id,status,catalog_listing,catalog_product_id,deal_ids,variations`,
          token
        );

        if (!data) {
          retryQueue.push(...chunk);
          await new Promise(r => setTimeout(r, 500));
          continue;
        }

        const list = (data as Array<{ code: number; body: ItemDetail }>) ?? [];

        for (const entry of list) {
          if (entry.code !== 200 || !entry.body) {
            if (entry.code === 429) retryQueue.push(entry.body?.id ?? "");
            continue;
          }
          const item = entry.body;
          const normTitle = normalize(item.title);
          const matches = normTitle.includes(normKeyword);

          if (!matches) {
            newCacheRows.push({ item_id: item.id, keyword: normKeyword, contains_match: false, last_price: item.price });
            continue;
          }

          newCacheRows.push({ item_id: item.id, keyword: normKeyword, contains_match: true, last_price: item.price });

          const isCatalog = !!(item.catalog_listing || item.catalog_product_id);
          const hasPromo = Array.isArray(item.deal_ids) && item.deal_ids.length > 0;

          if (item.variations?.length) {
            let varsUpdated = 0;
            const updatedVars = item.variations.map(v => {
              if (v.price < target_price) { varsUpdated++; return { ...v, price: target_price }; }
              return v;
            });
            const needsBaseUpdate = item.price < target_price;

            if (varsUpdated === 0 && !needsBaseUpdate) {
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
                variations_updated: varsUpdated,
              });
              continue;
            }

            const putBody: Record<string, unknown> = {
              variations: updatedVars.map(v => ({ id: v.id, price: v.price })),
            };
            if (needsBaseUpdate) putBody.price = target_price;

            const putRes = await meliPut(`/items/${item.id}`, token, putBody);
            if (!putRes.ok) {
              const errMsg = (putRes.data as Record<string, unknown>)?.message as string ?? "";
              if (putRes.status === 429) { retryQueue.push(item.id); continue; }
              results.push({
                account: acc.nickname, item_id: item.id, title: item.title,
                old_price: item.price, new_price: target_price,
                status: hasPromo && (errMsg.includes("promotion") || errMsg.includes("deal")) ? "promo_blocked" : "error",
                reason: hasPromo ? "Publicacion en promocion activa" : errMsg.slice(0, 200),
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

            if (dry_run) {
              results.push({
                account: acc.nickname, item_id: item.id, title: item.title,
                old_price: item.price, new_price: target_price,
                status: isCatalog ? "catalog_warning" : "updated",
                reason: isCatalog ? "Item de catalogo - subir precio puede perder Buy Box" : undefined,
              });
              continue;
            }

            const putRes = await meliPut(`/items/${item.id}`, token, { price: target_price });
            if (!putRes.ok) {
              const errMsg = (putRes.data as Record<string, unknown>)?.message as string ?? "";
              if (putRes.status === 429) { retryQueue.push(item.id); continue; }
              results.push({
                account: acc.nickname, item_id: item.id, title: item.title,
                old_price: item.price, new_price: target_price,
                status: hasPromo && (errMsg.includes("promotion") || errMsg.includes("deal")) ? "promo_blocked" : "error",
                reason: hasPromo ? "Publicacion en promocion activa" : errMsg.slice(0, 200),
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

          await new Promise(r => setTimeout(r, 220));
        }

        await new Promise(r => setTimeout(r, 200));
      }

      if (retryQueue.length > 0) {
        await new Promise(r => setTimeout(r, 3000));
        for (let i = 0; i < retryQueue.length; i += 20) {
          const chunk = retryQueue.slice(i, i + 20).filter(Boolean);
          if (!chunk.length) continue;
          const data = await meliGetWithRetry(
            `/items?ids=${chunk.join(",")}&attributes=id,title,price,currency_id,status,catalog_listing,catalog_product_id,deal_ids,variations`,
            token, 2
          );
          if (!data) continue;
          const list = (data as Array<{ code: number; body: ItemDetail }>) ?? [];
          for (const entry of list) {
            if (entry.code !== 200 || !entry.body) continue;
            const item = entry.body;
            const normTitle = normalize(item.title);
            if (!normTitle.includes(normKeyword)) {
              newCacheRows.push({ item_id: item.id, keyword: normKeyword, contains_match: false, last_price: item.price });
              continue;
            }
            newCacheRows.push({ item_id: item.id, keyword: normKeyword, contains_match: true, last_price: item.price });
            if (item.price < target_price && !dry_run) {
              const putRes = await meliPut(`/items/${item.id}`, token, { price: target_price });
              results.push({
                account: acc.nickname, item_id: item.id, title: item.title,
                old_price: item.price, new_price: target_price,
                status: putRes.ok ? "updated" : "error",
                reason: putRes.ok ? "Retry exitoso" : ((putRes.data as Record<string, unknown>)?.message as string ?? "").slice(0, 200),
              });
            } else if (item.price >= target_price) {
              results.push({
                account: acc.nickname, item_id: item.id, title: item.title,
                old_price: item.price, new_price: item.price,
                status: "skipped", reason: "Precio ya es igual o superior",
              });
            }
            await new Promise(r => setTimeout(r, 250));
          }
        }
      }
    }

    if (newCacheRows.length > 0) {
      for (let i = 0; i < newCacheRows.length; i += 500) {
        const batch = newCacheRows.slice(i, i + 500);
        await supabase.from("items_keyword_cache").upsert(
          batch.map(r => ({ ...r, checked_at: new Date().toISOString() })),
          { onConflict: "item_id,keyword" }
        );
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
      summary: {
        total_items_scanned: totalScanned,
        cache_hits_skipped: cacheHits,
        items_checked: totalScanned - cacheHits,
        matched: results.length,
        updated, skipped, errors,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
