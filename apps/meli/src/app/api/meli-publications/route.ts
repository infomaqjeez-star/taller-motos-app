import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getValidToken } from "@/lib/meli";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key"
);

/**
 * GET /api/meli-publications
 *
 * Obtiene las publicaciones de Mercado Libre del usuario directamente desde MeLi API.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "active";
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

    // Auth
    const authHeader = request.headers.get("authorization");
    let userId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.slice(7));
      if (user) userId = user.id;
    }

    if (!userId) {
      return NextResponse.json([]);
    }

    // Obtener cuentas activas del usuario
    const { data: accounts } = await supabase
      .from("linked_meli_accounts")
      .select("id, meli_user_id, meli_nickname, access_token_enc, refresh_token_enc, token_expiry_date")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (!accounts || accounts.length === 0) {
      return NextResponse.json([]);
    }

    const results: any[] = [];

    await Promise.all(
      accounts.map(async (account: any) => {
        try {
          const validToken = await getValidToken(account);
          if (!validToken) return;

          const headers = { Authorization: `Bearer ${validToken}` };

          // Obtener publicaciones del vendedor
          const res = await fetch(
            `https://api.mercadolibre.com/users/${account.meli_user_id}/items/search?status=${status}&limit=${limit}`,
            { headers, signal: AbortSignal.timeout(10000) }
          );

          if (!res.ok) {
            console.error(`[meli-publications] Error ${res.status} para cuenta ${account.meli_nickname}`);
            return;
          }

          const data = await res.json();
          const itemIds: string[] = data.results || [];

          if (itemIds.length === 0) {
            results.push({
              account: account.meli_nickname,
              meli_user_id: String(account.meli_user_id),
              items: [],
              total: 0,
            });
            return;
          }

          // Obtener detalles de los items en lotes de 20
          const items: any[] = [];
          const chunks: string[][] = [];
          for (let i = 0; i < itemIds.length; i += 20) {
            chunks.push(itemIds.slice(i, i + 20));
          }

          await Promise.all(
            chunks.map(async (chunk) => {
              try {
                const itemsRes = await fetch(
                  `https://api.mercadolibre.com/items?ids=${chunk.join(",")}`,
                  { headers, signal: AbortSignal.timeout(10000) }
                );
                if (!itemsRes.ok) return;

                const itemsData = await itemsRes.json();
                for (const item of itemsData) {
                  if (item?.body) {
                    items.push({
                      id: item.body.id,
                      title: item.body.title || "",
                      price: item.body.price || 0,
                      currency_id: item.body.currency_id || "ARS",
                      available_quantity: item.body.available_quantity || 0,
                      sold_quantity: item.body.sold_quantity || 0,
                      status: item.body.status || "unknown",
                      thumbnail: item.body.thumbnail || "",
                      secure_thumbnail: item.body.secure_thumbnail || item.body.thumbnail || "",
                      permalink: item.body.permalink || "",
                    });
                  }
                }
              } catch { /* ignorar errores de chunk */ }
            })
          );

          results.push({
            account: account.meli_nickname,
            meli_user_id: String(account.meli_user_id),
            items,
            total: data.paging?.total || items.length,
          });
        } catch (err) {
          console.error(`[meli-publications] Error cuenta ${account.meli_nickname}:`, err);
        }
      })
    );

    return NextResponse.json(results);
  } catch (error) {
    console.error("[meli-publications] Error inesperado:", error);
    return NextResponse.json([]);
  }
}
