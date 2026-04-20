import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getValidToken, type LinkedMeliAccount } from "@/lib/meli";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key"
);

/**
 * GET /api/meli-messages-detailed
 * Obtiene conversaciones completas con todos los mensajes de cada una
 */
export async function GET(request: NextRequest) {
  try {
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

    const allConversations: any[] = [];

    for (const account of accounts) {
      try {
        const token = await getValidToken(account as LinkedMeliAccount);
        if (!token) continue;

        const headers = { Authorization: `Bearer ${token}` };
        const meliId = String(account.meli_user_id);

        console.log(`[meli-messages-detailed] Procesando: ${account.meli_nickname}`);

        // Obtener órdenes recientes (últimos 60 días)
        const statuses = ["paid", "confirmed", "processing", "ready_to_ship", "shipped", "delivered"];
        const recentOrders: any[] = [];
        
        for (const status of statuses) {
          try {
            const ordersRes = await fetch(
              `https://api.mercadolibre.com/orders/search?seller=${meliId}&order.status=${status}&sort=date_desc&limit=30`,
              { headers, signal: AbortSignal.timeout(10000) }
            );
            
            if (ordersRes.ok) {
              const ordersData = await ordersRes.json();
              recentOrders.push(...(ordersData.results || []));
            }
          } catch { /* skip */ }
        }

        // Eliminar duplicados
        const uniqueOrders = recentOrders.filter((order, index, self) => 
          index === self.findIndex(o => o.id === order.id)
        );

        console.log(`[meli-messages-detailed] ${account.meli_nickname}: ${uniqueOrders.length} órdenes`);

        // Para cada orden, obtener TODOS los mensajes de la conversación
        for (const order of uniqueOrders.slice(0, 20)) {
          try {
            const packId = order.pack_id || order.id;
            
            // Obtener mensajes de la conversación
            const msgRes = await fetch(
              `https://api.mercadolibre.com/messages/packs/${packId}/sellers/${meliId}?mark_as_read=false&limit=50`,
              { headers, signal: AbortSignal.timeout(10000) }
            );

            if (msgRes.status === 404 || msgRes.status === 403) continue;
            if (!msgRes.ok) continue;

            const msgData = await msgRes.json();
            const messages = msgData.messages || [];
            
            // Si no hay mensajes, igual mostrar la orden para que el vendedor pueda iniciar conversación
            const firstItem = order.order_items?.[0];
            
            // Obtener info del producto
            let itemTitle = firstItem?.item?.title || "Producto";
            let itemThumbnail = "";
            
            if (firstItem?.item?.id) {
              try {
                const itemRes = await fetch(
                  `https://api.mercadolibre.com/items/${firstItem.item.id}?attributes=thumbnail,title`,
                  { headers, signal: AbortSignal.timeout(3000) }
                );
                if (itemRes.ok) {
                  const itemData = await itemRes.json();
                  itemThumbnail = itemData.thumbnail || "";
                  itemTitle = itemData.title || itemTitle;
                }
              } catch { /* skip */ }
            }

            // Procesar mensajes
            const processedMessages = messages.map((msg: any) => ({
              id: String(msg.id),
              text: msg.text || "",
              from_user_id: String(msg.from?.user_id),
              from_nickname: msg.from?.nickname || (String(msg.from?.user_id) === meliId ? account.meli_nickname : "Comprador"),
              date_created: msg.date_created,
              read: msg.read || false,
              attachments: msg.attachments || [],
            }));

            // Contar no leídos (mensajes del comprador no leídos)
            const unreadCount = processedMessages.filter((m: any) => 
              m.from_user_id !== meliId && !m.read
            ).length;

            // Último mensaje
            const lastMsg = processedMessages[processedMessages.length - 1];

            allConversations.push({
              id: `${account.id}-${order.id}`,
              pack_id: String(packId),
              order_id: String(order.id),
              buyer_id: String(order.buyer?.id),
              buyer_nickname: order.buyer?.nickname || "Comprador",
              item_title: itemTitle,
              item_thumbnail: itemThumbnail,
              item_id: firstItem?.item?.id || null,
              total_amount: order.total_amount || 0,
              order_status: order.status,
              account_nickname: account.meli_nickname,
              meli_account_id: account.id,
              unread_count: unreadCount,
              last_message: lastMsg?.text || "Sin mensajes",
              last_message_date: lastMsg?.date_created || order.date_created,
              messages: processedMessages,
              date_created: order.date_created,
            });
          } catch { /* skip order */ }
        }
      } catch (err) {
        console.error(`[meli-messages-detailed] Error cuenta ${account.meli_nickname}:`, err);
      }
    }

    // Ordenar por fecha del último mensaje (más reciente primero)
    allConversations.sort((a, b) => 
      new Date(b.last_message_date).getTime() - new Date(a.last_message_date).getTime()
    );

    console.log(`[meli-messages-detailed] Total conversaciones: ${allConversations.length}`);
    return NextResponse.json(allConversations);
  } catch (error) {
    console.error("[meli-messages-detailed] Error:", error);
    return NextResponse.json([]);
  }
}
