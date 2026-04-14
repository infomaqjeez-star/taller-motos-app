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
 * Usa orders-based messaging API de MeLi.
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

        // Obtener ordenes recientes pagadas/enviadas
        const ordersRes = await fetch(
          `https://api.mercadolibre.com/orders/search?seller=${meliId}&order.status=paid&sort=date_desc&limit=20`,
          { headers, signal: AbortSignal.timeout(10000) }
        );
        if (!ordersRes.ok) continue;
        const ordersData = await ordersRes.json();
        const orders = ordersData.results || [];

        // Para cada orden, obtener mensajes
        for (const order of orders.slice(0, 15)) {
          try {
            const orderId = order.id;
            const packId = order.pack_id;
            
            // Intentar obtener mensajes (pack-based o order-based)
            let messagesUrl: string;
            if (packId) {
              messagesUrl = `https://api.mercadolibre.com/messages/packs/${packId}/sellers/${meliId}`;
            } else {
              messagesUrl = `https://api.mercadolibre.com/messages/orders/${orderId}`;
            }

            const msgRes = await fetch(messagesUrl, {
              headers,
              signal: AbortSignal.timeout(8000),
            });

            if (!msgRes.ok) continue;
            const msgData = await msgRes.json();
            const messages = msgData.messages || msgData.results || [];
            if (messages.length === 0) continue;

            // Obtener info del item
            let itemTitle = "Producto";
            let itemThumbnail = "";
            const firstItem = order.order_items?.[0];
            if (firstItem?.item?.id) {
              try {
                const itemRes = await fetch(
                  `https://api.mercadolibre.com/items/${firstItem.item.id}`,
                  { headers, signal: AbortSignal.timeout(5000) }
                );
                if (itemRes.ok) {
                  const itemData = await itemRes.json();
                  itemTitle = itemData.title || itemTitle;
                  itemThumbnail = itemData.thumbnail || "";
                }
              } catch { /* ignore */ }
            }

            // Tomar el ultimo mensaje del comprador
            const buyerMessages = messages.filter((m: any) => 
              m.from?.user_id !== Number(meliId)
            );
            const lastMsg = buyerMessages[buyerMessages.length - 1] || messages[messages.length - 1];
            if (!lastMsg) continue;

            const isUnread = !lastMsg.read_by_seller && lastMsg.from?.user_id !== Number(meliId);

            allMessages.push({
              id: `${orderId}-${lastMsg.id || Math.random()}`,
              meli_message_id: String(lastMsg.id || orderId),
              meli_account_id: account.id,
              order_id: String(orderId),
              pack_id: packId ? String(packId) : null,
              buyer_id: order.buyer?.id || lastMsg.from?.user_id,
              buyer_nickname: order.buyer?.nickname || lastMsg.from?.nickname || "Comprador",
              item_id: firstItem?.item?.id || null,
              item_title: itemTitle,
              item_thumbnail: itemThumbnail,
              message_text: lastMsg.text || "",
              status: isUnread ? "UNREAD" : "READ",
              message_type: lastMsg.from?.user_id !== Number(meliId) ? "buyer" : "seller",
              date_created: lastMsg.date_created || order.date_created,
              date_read: lastMsg.date_read || null,
              attachments: lastMsg.attachments || [],
              account_nickname: account.meli_nickname,
              meli_accounts: { nickname: account.meli_nickname },
              meli_user_id: meliId,
              order: {
                order_id: String(orderId),
                status: order.status,
                total_amount: order.total_amount || 0,
              },
            });
          } catch { /* ignore individual order errors */ }
        }
      } catch (err) {
        console.error(`[meli-messages] Error cuenta ${account.meli_nickname}:`, err);
      }
    }

    // Ordenar por fecha y limitar
    allMessages.sort((a, b) => new Date(b.date_created).getTime() - new Date(a.date_created).getTime());
    return NextResponse.json(allMessages.slice(0, limit));
  } catch (error) {
    console.error("[meli-messages] Error:", error);
    return NextResponse.json([]);
  }
}

/**
 * POST /api/meli-messages
 * Responder a un mensaje de comprador.
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

    // Obtener cuenta
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

    // Enviar mensaje
    let sendUrl: string;
    if (pack_id) {
      sendUrl = `/messages/packs/${pack_id}/sellers/${meliId}`;
    } else {
      sendUrl = `/messages/orders/${order_id}`;
    }

    const result = await meliPost(sendUrl, token, {
      from: { user_id: Number(meliId) },
      to: { /* MeLi infiere el destinatario */ },
      text: message_text.trim(),
    });

    if (result.ok) {
      return NextResponse.json({ status: "ok", data: result.data });
    }
    return NextResponse.json({ error: result.error || "Error al enviar" }, { status: 500 });
  } catch (error) {
    console.error("[meli-messages POST] Error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
