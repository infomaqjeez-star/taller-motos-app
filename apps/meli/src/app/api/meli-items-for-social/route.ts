import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getValidToken, type LinkedMeliAccount } from "@/lib/meli";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key"
);

/**
 * GET /api/meli-items-for-social
 * 
 * Obtiene publicaciones activas de MeLi para usar en marketing social.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    let userId: string | null = null;
    
    if (authHeader?.startsWith("Bearer ")) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.slice(7));
      if (user) userId = user.id;
    }
    
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { data: accounts } = await supabase
      .from("linked_meli_accounts")
      .select("id, user_id, meli_user_id, meli_nickname, access_token_enc, refresh_token_enc, token_expiry_date, is_active")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (!accounts || accounts.length === 0) {
      return NextResponse.json([]);
    }

    const allItems: any[] = [];

    for (const account of accounts) {
      try {
        const token = await getValidToken(account as LinkedMeliAccount);
        if (!token) continue;

        const headers = { Authorization: `Bearer ${token}` };
        const meliId = String(account.meli_user_id);

        // Obtener items activos del vendedor
        const itemsRes = await fetch(
          `https://api.mercadolibre.com/users/${meliId}/items/search?status=active&limit=50`,
          { headers, signal: AbortSignal.timeout(15000) }
        );

        if (!itemsRes.ok) {
          console.log(`[meli-items-social] Error ${itemsRes.status} para ${account.meli_nickname}`);
          continue;
        }

        const itemsData = await itemsRes.json();
        const itemIds = itemsData.results || [];

        // Obtener detalles de cada item
        for (const itemId of itemIds.slice(0, 20)) {
          try {
            const itemRes = await fetch(
              `https://api.mercadolibre.com/items/${itemId}`,
              { headers, signal: AbortSignal.timeout(10000) }
            );

            if (!itemRes.ok) continue;

            const item = await itemRes.json();
            
            allItems.push({
              id: item.id,
              title: item.title,
              price: item.price,
              thumbnail: item.thumbnail,
              permalink: item.permalink,
              account_nickname: account.meli_nickname,
              condition: item.condition,
              available_quantity: item.available_quantity,
            });
          } catch { /* skip item */ }
        }
      } catch (err) {
        console.error(`[meli-items-social] Error cuenta ${account.meli_nickname}:`, err);
      }
    }

    // Ordenar por precio (mayor a menor) y limitar
    allItems.sort((a, b) => b.price - a.price);
    
    return NextResponse.json(allItems.slice(0, 50));
  } catch (error) {
    console.error("[meli-items-social] Error:", error);
    return NextResponse.json([]);
  }
}
