import { NextResponse } from "next/server";
import { getActiveAccounts, getValidToken, meliGet } from "@/lib/meli";

export const dynamic  = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("account_id");

  try {
    let accounts = await getActiveAccounts();
    if (accountId) accounts = accounts.filter(a => a.id === accountId);
    if (!accounts.length) return NextResponse.json([]);

    const results = await Promise.all(accounts.map(async (acc) => {
      try {
        const token = await getValidToken(acc);
        if (!token) {
          return { account: acc.nickname, meli_user_id: String(acc.meli_user_id), items: [], total: 0, error: "token_expired" };
        }

        const searchData = await meliGet(
          `/users/${acc.meli_user_id}/items/search?status=active&limit=100`,
          token
        );
        const itemIds: string[] = searchData?.results ?? [];

        if (!itemIds.length) {
          return { account: acc.nickname, meli_user_id: String(acc.meli_user_id), items: [] };
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

        return {
          account:      acc.nickname,
          meli_user_id: String(acc.meli_user_id),
          items:        allItems,
          total:        allItems.length,
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

    return NextResponse.json(results);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
