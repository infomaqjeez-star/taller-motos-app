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
 * Obtiene TODOS los mensajes de compradores:
 * - Mensajes post-venta de órdenes recientes
 * - Mensajes de órdenes en preparación/envío
 * - Mensajes no leídos del centro de mensajes
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const sync = searchParams.get("sync") === "true";

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
    const processedPackIds = new Set<string>(); // Evitar duplicados

    for (const account of accounts) {
      try {
        const token = await getValidToken(account as LinkedMeliAccount);
        if (!token) continue;

        const headers = { Authorization: `Bearer ${token}` };
        const meliId = String(account.meli_user_id);

        console.log(`[meli-messages] Procesando cuenta: ${account.meli_nickname}`);

        // 1. Obtener mensajes no leídos del centro de mensajes
        try {
          const unreadRes = await fetch(
            `https://api.mercadolibre.com/messages/unread?role=seller&limit=50`,
            { headers, signal: AbortSignal.timeout(10000) }
          );
          
          if (unreadRes.ok) {
            const unreadData = await unreadRes.json();
            const unreadMessages = unreadData.messages || [];
            console.log(`[meli-messages] ${account.meli_nickname}: ${unreadMessages.length} mensajes no leídos`);
            
            for (const msg of unreadMessages) {
              const packId = msg.pack_id || msg.order_id;
              if (!packId || processedPackIds.has(packId)) continue;
              processedPackIds.add(packId);
              
              allMessages.push({
                id: `${packId}-${msg.id}`,
                meli_message_id: String(msg.id),
                meli_account_id: account.id,
                order_id: msg.order_id ? String(msg.order_id) : null,
                pack_id: msg.pack_id ? String(msg.pack_id) : null,
                buyer_id: msg.from?.user_id,
                buyer_nickname: msg.from?.nickname || "Comprador",
                item_id: null,
                item_title: msg.resource_type === "order" ? "Mensaje de orden" : "Mensaje",
                item_thumbnail: "",
                message_text: msg.text || "",
                status: "UNREAD",
                message_type: "buyer",
                date_created: msg.date_created || new Date().toISOString(),
                date_read: null,
                attachments: msg.attachments || [],
                account_nickname: account.meli_nickname,
                meli_accounts: { nickname: account.meli_nickname },
                meli_user_id: meliId,
                order: null,
              });
            }
          }
        } catch (err) {
          console.error(`[meli-messages] Error mensajes no leídos ${account.meli_nickname}:`, err);
        }

        // 2. Obtener órdenes recientes con actividad (últimos 30 días)
        const statuses = ["paid", "confirmed", "processing", "ready_to_ship", "shipped"];
        const recentOrders: any[] = [];
        
        for (const status of statuses) {
          try {
            const ordersRes = await fetch(
              `https://api.mercadolibre.com/orders/search?seller=${meliId}&order.status=${status}&sort=date_desc&limit=20`,
              { headers, signal: AbortSignal.timeout(10000) }
            );
            
            if (ordersRes.ok) {
              const ordersData = await ordersRes.json();
              const orders = ordersData.results || [];
              recentOrders.push(...orders);
            }
          } catch { /* skip */ }
        }

        // Eliminar duplicados de órdenes
        const uniqueOrders = recentOrders.filter((order, index, self) => 
          index === self.findIndex(o => o.id === order.id)
        );

        console.log(`[meli-messages] ${account.meli_nickname}: ${uniqueOrders.length} órdenes únicas`);

        // 3. Para cada orden, obtener mensajes
        for (const order of uniqueOrders.slice(0, 15)) {
          try {
            const packId = order.pack_id || order.id;
            if (processedPackIds.has(String(packId))) continue;
            
            const msgUrl = `https://api.mercadolibre.com/messages/packs/${packId}/sellers/${meliId}?mark_as_read=false&limit=20`;

            const msgRes = await fetch(msgUrl, {
              headers,
              signal: AbortSignal.timeout(8000),
            });

            if (msgRes.status === 404 || msgRes.status === 403) continue;
            if (!msgRes.ok) continue;

            const msgData = await msgRes.json();
            const messages = msgData.messages || [];
            if (messages.length === 0) continue;

            processedPackIds.add(String(packId));

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
                  `https://api.mercadolibre.com/items/${firstItem.item.id}?attributes=thumbnail,title`,
                  { headers, signal: AbortSignal.timeout(3000) }
                );
                if (itemRes.ok) {
                  const itemData = await itemRes.json();
                  itemThumbnail = itemData.thumbnail || "";
                  if (itemData.title) itemTitle = itemData.title;
                }
              } catch { /* skip */ }
            }

            // Tomar el último mensaje del comprador (o el último mensaje general)
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
              buyer_id: order.buyer?.id || lastMsg.from?.user_id,
              buyer_nickname: order.buyer?.nickname || lastMsg.from?.nickname || "Comprador",
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
    console.log(`[meli-messages] Total mensajes únicos: ${allMessages.length}`);
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
