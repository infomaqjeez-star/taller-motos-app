import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

/**
 * GET /api/meli-labels
 * 
 * Obtiene shipments/etiquetas de todas las cuentas de MeLi conectadas.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "ready_to_ship";
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

    // Auth
    const authHeader = request.headers.get("authorization");
    let userId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.slice(7));
      if (user) userId = user.id;
    }

    if (!userId) {
      return NextResponse.json({ shipments: [], summary: {} });
    }

    // Obtener cuentas activas
    const { data: accounts } = await supabase
      .from("linked_meli_accounts")
      .select("id, meli_user_id, meli_nickname, access_token_enc")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ shipments: [], summary: {} });
    }

    console.log(`[meli-labels] Procesando ${accounts.length} cuentas...`);

    const allShipments: any[] = [];

    // Procesar cada cuenta
    for (const account of accounts) {
      try {
        if (!account.access_token_enc?.startsWith('APP_USR')) {
          console.log(`[meli-labels] Token inválido para ${account.meli_nickname}`);
          continue;
        }

        const headers = { Authorization: `Bearer ${account.access_token_enc}` };
        
        // Obtener shipments según el estado
        let url = `https://api.mercadolibre.com/orders/search?seller=${account.meli_user_id}`;
        
        if (status === "ready_to_ship") {
          url += `&order.status=ready_to_ship`;
        } else if (status === "shipped") {
          url += `&order.status=shipped`;
        } else if (status === "delivered") {
          url += `&order.status=delivered`;
        } else if (status === "cancelled") {
          url += `&order.status=cancelled`;
        }
        
        url += `&sort=date_desc&limit=${limit}`;

        console.log(`[meli-labels] Fetching: ${url}`);
        
        const res = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
        
        if (!res.ok) {
          console.error(`[meli-labels] Error ${res.status} para ${account.meli_nickname}`);
          continue;
        }

        const data = await res.json();
        const orders = data.results || [];
        
        console.log(`[meli-labels] ${account.meli_nickname}: ${orders.length} órdenes`);

        // Obtener detalles de shipments
        for (const order of orders) {
          try {
            if (!order.shipping?.id) continue;

            // Obtener detalles del shipment
            const shipRes = await fetch(
              `https://api.mercadolibre.com/shipments/${order.shipping.id}`,
              { headers, signal: AbortSignal.timeout(5000) }
            );
            
            if (!shipRes.ok) continue;
            const shipData = await shipRes.json();

            // Obtener detalles del item
            let itemTitle = "Producto";
            let itemThumbnail = null;
            let quantity = 1;
            
            if (order.order_items?.[0]?.item?.id) {
              const itemRes = await fetch(
                `https://api.mercadolibre.com/items/${order.order_items[0].item.id}`,
                { headers, signal: AbortSignal.timeout(5000) }
              );
              if (itemRes.ok) {
                const itemData = await itemRes.json();
                itemTitle = itemData.title;
                itemThumbnail = itemData.thumbnail;
              }
              quantity = order.order_items[0].quantity || 1;
            }

            // Determinar tipo de envío
            let type = "correo";
            if (shipData.logistic_type === "self_service") type = "flex";
            else if (shipData.logistic_type === "cross_docking") type = "turbo";
            else if (shipData.logistic_type === "fulfillment") type = "full";

            // Verificar si ya fue impresa
            const { data: printedLabel } = await supabase
              .from("printed_labels")
              .select("id, print_date")
              .eq("shipment_id", String(order.shipping.id))
              .eq("account_id", account.id)
              .single();

            allShipments.push({
              shipment_id: order.shipping.id,
              order_id: order.id,
              account: account.meli_nickname,
              account_id: account.id,
              type: type,
              buyer: order.buyer?.nickname || "Comprador",
              buyer_nickname: order.buyer?.nickname,
              title: itemTitle,
              quantity: quantity,
              thumbnail: itemThumbnail,
              delivery_date: shipData.estimated_delivery_time?.date || null,
              dispatch_date: shipData.estimated_dispatch_time?.date || null,
              delivery_address: shipData.receiver_address?.address_line,
              delivery_city: shipData.receiver_address?.city?.name,
              delivery_state: shipData.receiver_address?.state?.name,
              total_price: order.total_amount,
              shipping_cost: order.shipping_cost,
              status: order.status,
              status_label: shipData.status,
              meli_user_id: String(account.meli_user_id),
              printed_at: printedLabel?.print_date || null,
              item_id: order.order_items?.[0]?.item?.id || null,
              tracking_number: shipData.tracking_number || null,
            });
          } catch (e) {
            console.error(`[meli-labels] Error procesando orden:`, e);
          }
        }
      } catch (err) {
        console.error(`[meli-labels] Error cuenta ${account.meli_nickname}:`, err);
      }
    }

    // Calcular resumen
    const summary = {
      total: allShipments.length,
      flex: allShipments.filter(s => s.type === "flex").length,
      correo: allShipments.filter(s => s.type === "correo").length,
      turbo: allShipments.filter(s => s.type === "turbo").length,
      full: allShipments.filter(s => s.type === "full").length,
      printed: allShipments.filter(s => s.printed_at).length,
    };

    console.log(`[meli-labels] Total shipments: ${allShipments.length}`);

    return NextResponse.json({
      shipments: allShipments,
      summary,
    });
  } catch (error) {
    console.error("[meli-labels] Error inesperado:", error);
    return NextResponse.json({ shipments: [], summary: {} });
  }
}

/**
 * POST /api/meli-labels
 * 
 * Marca etiquetas como impresas y guarda en el historial.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shipment_ids, account_id } = body;

    if (!Array.isArray(shipment_ids) || shipment_ids.length === 0) {
      return NextResponse.json(
        { error: "Se requiere un array de shipment_ids" },
        { status: 400 }
      );
    }

    // Obtener usuario
    const authHeader = request.headers.get("authorization");
    let userId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.slice(7));
      if (user) userId = user.id;
    }

    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Guardar en el historial usando la función SQL
    const results = [];
    
    for (const shipment_id of shipment_ids) {
      try {
        const { data, error } = await supabase.rpc("save_printed_label", {
          p_user_id: userId,
          p_account_id: account_id,
          p_shipment_id: String(shipment_id),
          p_order_id: null,
          p_tracking_number: null,
          p_buyer_nickname: null,
          p_shipping_method: "unknown",
          p_printed_by: "appjeez",
        });

        if (error) throw error;
        results.push({ shipment_id, saved: true, id: data });
      } catch (e) {
        console.error(`[meli-labels] Error guardando ${shipment_id}:`, e);
        results.push({ shipment_id, saved: false, error: e });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("[meli-labels] Error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
