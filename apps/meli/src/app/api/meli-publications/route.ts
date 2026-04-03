import { NextResponse } from "next/server";
import { getActiveAccounts, getValidToken, meliGet } from "@/lib/meli";
import { createClient } from "@supabase/supabase-js";

export const dynamic  = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("account_id");
  const limit = parseInt(searchParams.get("limit") ?? "50", 10);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);
  const format = searchParams.get("format") ?? "detailed"; // "simple" o "detailed"

  try {
    let accounts = await getActiveAccounts();
    // Filtrar por meli_user_id (no por id interno)
    if (accountId) accounts = accounts.filter(a => String(a.meli_user_id) === accountId);
    if (!accounts.length) return NextResponse.json({ ok: false, error: "Cuenta no encontrada" }, { status: 404 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = supabaseUrl && serviceRoleKey
      ? createClient(supabaseUrl, serviceRoleKey)
      : null;

    const results = await Promise.all(accounts.map(async (acc) => {
      try {
        const uid = String(acc.meli_user_id);

        // Intentar leer desde Supabase primero (cache)
        let items: any[] = [];
        let total = 0;
        let cached_at: string | null = null;

        if (supabase) {
          const { data, error } = await supabase
            .from("products_cache")
            .select("*", { count: "exact" })
            .eq("meli_user_id", uid)
            .order("last_updated", { ascending: false })
            .range(offset, offset + limit - 1);

          if (!error && data && data.length > 0) {
            items = data;
            // Obtener el total sin limit
            const { count } = await supabase
              .from("products_cache")
              .select("*", { count: "exact", head: true })
              .eq("meli_user_id", uid);
            total = count ?? 0;
            cached_at = new Date().toISOString();
          }
        }

        // Si no hay datos en cache, sincronizar desde MeLi
        if (items.length === 0) {
          console.log(`[meli-publications] Syncing from MeLi for ${acc.nickname}`);
          const token = await getValidToken(acc);
          if (!token) {
            return { account: acc.nickname, meli_user_id: uid, items: [], total: 0, error: "token_expired" };
          }

          const searchData = await meliGet(
            `/users/${uid}/items/search?status=active&limit=100`,
            token
          );
          const itemIds: string[] = searchData?.results ?? [];

          if (!itemIds.length) {
            return { account: acc.nickname, meli_user_id: uid, items: [], total: 0 };
          }

          const chunks: string[][] = [];
          for (let i = 0; i < itemIds.length; i += 20) {
            chunks.push(itemIds.slice(i, i + 20));
          }

          const allItems: object[] = [];
          await Promise.all(chunks.map(async (chunk) => {
            const data = await meliGet(`/items?ids=${chunk.join(",")}&attributes=id,title,price,currency_id,available_quantity,sold_quantity,thumbnail,status,permalink,logistic_type`, token);
            const list = (data ?? []) as Array<{ code: number; body: Record<string, unknown> }>;
            for (const entry of list) {
              if (entry.code === 200 && entry.body) {
                const b = entry.body;
                allItems.push({
                  id:                 b.id,
                  title:              b.title,
                  price:              b.price,
                  currency_id:        b.currency_id ?? "ARS",
                  available_quantity: b.available_quantity ?? 0,
                  sold_quantity:      b.sold_quantity ?? 0,
                  thumbnail:          (b.thumbnail as string | undefined)?.replace("http://", "https://") ?? null,
                  secure_thumbnail:   (b.thumbnail as string | undefined)?.replace("http://", "https://") ?? null,
                  status:             b.status,
                  permalink:          b.permalink,
                  logistic_type:      b.logistic_type ?? "not_specified",
                });
              }
            }
          }));

          allItems.sort((a, b) => {
            const as = (a as { sold_quantity: number }).sold_quantity;
            const bs = (b as { sold_quantity: number }).sold_quantity;
            return bs - as;
          });

          items = allItems.slice(offset, offset + limit);
          total = allItems.length;

          // Guardar en Supabase para futuro cache (async, no esperar)
          if (supabase) {
            const productsToCache = allItems.map(item => ({
              id: (item as any).id,
              meli_user_id: uid,
              account_name: acc.nickname,
              title: (item as any).title,
              price: (item as any).price,
              currency_id: (item as any).currency_id,
              available_quantity: (item as any).available_quantity,
              sold_quantity: (item as any).sold_quantity,
              thumbnail: (item as any).thumbnail,
              secure_thumbnail: (item as any).secure_thumbnail,
              status: (item as any).status,
              permalink: (item as any).permalink,
              logistic_type: (item as any).logistic_type,
              last_updated: new Date().toISOString(),
              synced_at: new Date().toISOString(),
            }));
            (async () => {
              try {
                await supabase
                  .from("products_cache")
                  .upsert(productsToCache, { onConflict: "id" });
                console.log(`[meli-publications] Cached ${productsToCache.length} items for ${acc.nickname}`);
              } catch (e) {
                console.error(`[meli-publications] Cache error:`, e);
              }
            })();
          }
        }

        // Formato simple para el selector de publicaciones
        if (format === "simple") {
          return {
            ok: true,
            publications: items.map((item: any) => ({
              id: item.id,
              title: item.title,
              price: item.price,
              permalink: item.permalink,
              status: item.status,
              thumbnail: item.thumbnail,
            })),
            total: total,
            account: acc.nickname,
          };
        }

        return {
          account:      acc.nickname,
          meli_user_id: uid,
          items:        items,
          total:        total,
          cached_at:    cached_at,
        };
      } catch (e) {
        return {
          account:      acc.nickname,
          meli_user_id: String(acc.meli_user_id),
          items:        [],
          total:        0,
          error:        (e as Error).message,
        };
      }
    }));

    // Si es formato simple y hay un solo resultado, devolver directamente
    if (format === "simple" && results.length === 1) {
      return NextResponse.json(results[0]);
    }

    return NextResponse.json(results);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
