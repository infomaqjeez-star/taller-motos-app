import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getValidToken, meliPost, type LinkedMeliAccount } from "@/lib/meli";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key"
);

/**
 * GET /api/meli-messages
 * Obtiene mensajes post-venta de compradores de todas las cuentas MeLi.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const authHeader = request.headers.get("authorization");
    let userId: string | null = null;
    if (authHeader?.startsWith("Bearer ")) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.slice(7));
      if (user) userId = user.id;
    }
    if (!userId) return NextResponse.json([]);

    const { data: accounts } = await supabase
      .from("linked_meli_accounts")
      .select("id, user_id, meli_user_id, meli_nickname, access_token_enc, refresh_token_enc, token_expiry_date, is_active")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (!accounts || accounts.length === 0) return NextResponse.json([]);

    const allMessages: any[] = [];

    for (const account of accounts) {
      try {
        const token = await getValidToken(account as LinkedMeliAccount);
        if (!token) continue;

        const headers = { Authorization: `Bearer ${token}` };
        const meliId = String(account.meli_user_id);

        // Obtener ordenes recientes con envio (tienen mas probabilidad de mensajes)
        const ordersRes = await fetch(
          `https://api.mercadolibre.com/orders/search?seller=${meliId}&order.status=paid&sort=date_desc&limit=10`,
          { headers, signal: AbortSignal.timeout(10000) }
        );
        if (!ordersRes.ok) {
          console.error(`[meli-messages] Error orders ${ordersRes.status} para ${account.meli_nickname}`);
          continue;
        }
        const ordersData = await ordersRes.json();
        const orders = ordersData.results || [];

        console.log(`[meli-messages] ${account.meli_nickname}: ${orders.length} ordenes recientes`);

        // Para cada orden, intentar obtener mensajes via packs
        for (const order of orders.slice(0, 8)) {
          try {
            // pack_id null = usar order_id como pack
            const packId = order.pack_id || order.id;
            const msgUrl = `https://api.mercadolibre.com/messages/packs/${packId}/sellers/${meliId}?mark_as_read=false&limit=10`;

            const msgRes = await fetch(msgUrl, {
              headers,
              signal: AbortSignal.timeout(5000),
            });

            if (msgRes.status === 404 || msgRes.status === 403) continue;
            if (!msgRes.ok) continue;

            const msgData = await msgRes.json();
            const messages = msgData.messages || [];
            if (messages.length === 0) continue;

            // Info del producto
            let itemTitle = "Producto";
            let itemThumbnail = "";
            const firstItem = order.order_items?.[0];
            if (firstItem?.item?.title) {
              itemTitle = firstItem.item.title;
            }
            if (firstItem?.item?.id) {
              try {
                const itemRes = await fetch(
                  `https://api.mercadolibre.com/items/${firstItem.item.id}?attributes=thumbnail`,
                  { headers, signal: AbortSignal.timeout(3000) }
                );
                if (itemRes.ok) {
                  const itemData = await itemRes.json();
                  itemThumbnail = itemData.thumbnail || "";
                  if (!itemTitle || itemTitle === "Producto") itemTitle = itemData.title || itemTitle;
                }
              } catch { /* skip */ }
            }

            // Tomar el ultimo mensaje del comprador
            const buyerMsgs = messages.filter((m: any) =>
              String(m.from?.user_id) !== meliId
            );
            const lastBuyerMsg = buyerMsgs.length > 0 ? buyerMsgs[buyerMsgs.length - 1] : null;
            const lastMsg = lastBuyerMsg || messages[messages.length - 1];

            allMessages.push({
              id: `${order.id}-${lastMsg.id || "0"}`,
              meli_message_id: String(lastMsg.id || order.id),
              meli_account_id: account.id,
              order_id: String(order.id),
              pack_id: order.pack_id ? String(order.pack_id) : null,
              buyer_id: order.buyer?.id,
              buyer_nickname: order.buyer?.nickname || "Comprador",
              item_id: firstItem?.item?.id || null,
              item_title: itemTitle,
              item_thumbnail: itemThumbnail,
              message_text: lastMsg.text || "",
              status: lastBuyerMsg && !lastBuyerMsg.read ? "UNREAD" : "READ",
              message_type: String(lastMsg.from?.user_id) !== meliId ? "buyer" : "seller",
              date_created: lastMsg.date_created || order.date_created,
              date_read: lastMsg.date_read || null,
              attachments: lastMsg.attachments || [],
              account_nickname: account.meli_nickname,
              meli_accounts: { nickname: account.meli_nickname },
              meli_user_id: meliId,
              order: {
                order_id: String(order.id),
                status: order.status,
                total_amount: order.total_amount || 0,
              },
            });
          } catch { /* skip order */ }
        }
      } catch (err) {
        console.error(`[meli-messages] Error cuenta ${account.meli_nickname}:`, err);
      }
    }

    allMessages.sort((a, b) => new Date(b.date_created).getTime() - new Date(a.date_created).getTime());
    console.log(`[meli-messages] Total mensajes: ${allMessages.length}`);
    return NextResponse.json(allMessages.slice(0, limit));
  } catch (error) {
    console.error("[meli-messages] Error:", error);
    return NextResponse.json([]);
  }
}

/**
 * POST /api/meli-messages - Responder mensaje
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { order_id, pack_id, message_text, meli_account_id } = body;

    if (!message_text?.trim()) {
      return NextResponse.json({ error: "Mensaje requerido" }, { status: 400 });
    }

    const authHeader = request.headers.get("authorization");
    let userId: string | null = null;
    if (authHeader?.startsWith("Bearer ")) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.slice(7));
      if (user) userId = user.id;
    }
    if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { data: account } = await supabase
      .from("linked_meli_accounts")
      .select("id, user_id, meli_user_id, meli_nickname, access_token_enc, refresh_token_enc, token_expiry_date, is_active")
      .eq("id", meli_account_id)
      .eq("user_id", userId)
      .single();

    if (!account) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });

    const token = await getValidToken(account as LinkedMeliAccount);
    if (!token) return NextResponse.json({ error: "Token invalido" }, { status: 401 });

    const meliId = String(account.meli_user_id);
    const effectivePackId = pack_id || order_id;

    const result = await meliPost(
      `/messages/packs/${effectivePackId}/sellers/${meliId}?tag=post_sale`,
      token,
      { from: { user_id: meliId }, text: message_text.trim() }
    );

    if (result.ok) {
      return NextResponse.json({ status: "ok", data: result.data });
    }
    return NextResponse.json({ error: result.error || "Error al enviar" }, { status: 500 });
  } catch (error) {
    console.error("[meli-messages POST] Error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
