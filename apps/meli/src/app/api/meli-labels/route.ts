import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getValidToken, type LinkedMeliAccount } from "@/lib/meli";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key"
);

/**
 * GET /api/meli-labels
 * 
 * Obtiene shipments/etiquetas listas para imprimir de todas las cuentas.
 * Según API de MeLi:
 * - /orders/search con order.status=ready_to_ship (órdenes listas para enviar)
 * - /shipments/{id} para obtener detalles del envío
 * - /shipments/{id}/label para obtener el PDF de la etiqueta
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
      .select("id, user_id, meli_user_id, meli_nickname, access_token_enc, refresh_token_enc, token_expiry_date, is_active")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ shipments: [], summary: {} });
    }

    console.log(`[meli-labels] Procesando ${accounts.length} cuentas para status=${status}...`);

    const allShipments: any[] = [];

    // Procesar cada cuenta
    for (const account of accounts) {
      try {
        // Usar getValidToken con auto-refresh
        const validToken = await getValidToken(account as LinkedMeliAccount);
        if (!validToken) {
          console.log(`[meli-labels] No se pudo obtener token para ${account.meli_nickname}`);
          continue;
        }

        const headers = { Authorization: `Bearer ${validToken}` };
        
        // OBTENER ORDENES - Solo estados validos de orden en MeLi API
        // (handling/ready_to_ship son estados de SHIPMENT, no de ORDER)
        const meliId = account.meli_user_id;
        const statusesToSearch = status === "shipped" 
          ? ["shipped"] 
          : status === "delivered" 
          ? ["delivered"]
          : ["paid", "shipped"];
        
        let allOrders: any[] = [];
        
        for (const orderStatus of statusesToSearch) {
          try {
            const ordersUrl = `https://api.mercadolibre.com/orders/search?seller=${meliId}&order.status=${orderStatus}&sort=date_desc&limit=${limit}`;
            console.log(`[meli-labels] [${account.meli_nickname}] GET orders status=${orderStatus}`);
            
            const ordersRes = await fetch(ordersUrl, { 
              headers, 
              signal: AbortSignal.timeout(15000) 
            });
            
            if (ordersRes.ok) {
              const ordersData = await ordersRes.json();
              const orders = ordersData.results || [];
              console.log(`[meli-labels] [${account.meli_nickname}] ${orders.length} ordenes en status=${orderStatus}`);
              allOrders = allOrders.concat(orders);
            } else {
              console.error(`[meli-labels] [${account.meli_nickname}] Error ${ordersRes.status} para status=${orderStatus}`);
            }
          } catch (e) {
            console.error(`[meli-labels] [${account.meli_nickname}] Timeout/error para status=${orderStatus}`);
          }
        }
        
        // Deduplicar ordenes por ID
        const seenOrderIds = new Set<number>();
        const orders = allOrders.filter(o => {
          if (seenOrderIds.has(o.id)) return false;
          seenOrderIds.add(o.id);
          return true;
        });

        console.log(`[meli-labels] [${account.meli_nickname}] ${orders.length} ordenes totales (deduplicadas)`);
        if (orders.length > 0) {
          console.log(`[meli-labels] [${account.meli_nickname}] Primeras ordenes:`, orders.slice(0, 3).map((o: any) => ({ 
            id: o.id, 
            status: o.status,
            shipping_status: o.shipping?.status,
            logistic_type: o.shipping?.logistic_type 
          })));
        }

        if (orders.length === 0) continue;

        // Procesar cada orden
        for (const order of orders) {
          try {
            // Verificar que tenga shipping o sea Flex/Full listo para enviar
            const logisticType = order.shipping?.logistic_type || order.logistic_type || "";
            const isFulfillment = logisticType === "fulfillment";
            const isFlexReady = (logisticType === "self_service" || logisticType === "self_service_flex") && 
              (order.status === "handling" || order.status === "ready_to_ship");
            
            if (!order.shipping?.id && !isFlexReady && !isFulfillment) {
              console.log(`[meli-labels] [${account.meli_nickname}] Orden ${order.id} sin shipping y no es Flex listo`);
              continue;
            }

            // Para Flex sin shipping.id, crear datos simulados del shipment
            let shipmentId = order.shipping?.id || `flex-${order.id}`;
            let shipData: any;
            
            if (order.shipping?.id) {
              // OBTENER DETALLES DEL SHIPMENT
              console.log(`[meli-labels] [${account.meli_nickname}] Obteniendo shipment ${shipmentId}...`);
              
              const shipRes = await fetch(
                `https://api.mercadolibre.com/shipments/${shipmentId}`,
                { headers, signal: AbortSignal.timeout(10000) }
              );
              
              if (!shipRes.ok) {
                const errorText = await shipRes.text().catch(() => "Unknown");
                console.error(`[meli-labels] [${account.meli_nickname}] Error shipment ${shipmentId}: ${errorText.substring(0, 200)}`);
                continue;
              }
              
              shipData = await shipRes.json();

              // Solo incluir shipments que tengan etiqueta disponible
              const validStatuses = ["ready_to_ship", "handling", "pending", "shipped"];
              if (!validStatuses.includes(shipData.status)) {
                console.log(`[meli-labels] [${account.meli_nickname}] Shipment ${shipmentId} status=${shipData.status} - no incluido`);
                continue;
              }
            } else if (!order.shipping?.id) {
              // Flex/Fulfillment sin shipping.id - usar datos de la orden
              console.log(`[meli-labels] [${account.meli_nickname}] Orden ${order.id} es ${logisticType} sin shipping.id`);
              shipData = {
                status: order.status,
                logistic_type: logisticType,
                receiver_address: order.shipping?.receiver_address || order.buyer?.billing_info?.address || {},
                estimated_delivery_time: order.shipping?.estimated_delivery_time || {},
                estimated_handling_limit: order.shipping?.estimated_handling_limit || {},
                tracking_number: null,
                label: null
              };
            }

            // OBTENER DETALLES DEL ITEM
            let itemTitle = "Producto sin título";
            let itemThumbnail = null;
            let quantity = 1;
            let itemId = null;
            
            if (order.order_items && order.order_items.length > 0) {
              const orderItem = order.order_items[0];
              itemId = orderItem.item?.id;
              quantity = orderItem.quantity || 1;
              
              if (itemId) {
                console.log(`[meli-labels] [${account.meli_nickname}] Obteniendo item ${itemId}...`);
                const itemRes = await fetch(
                  `https://api.mercadolibre.com/items/${itemId}`,
                  { headers, signal: AbortSignal.timeout(8000) }
                );
                
                if (itemRes.ok) {
                  const itemData = await itemRes.json();
                  itemTitle = itemData.title || itemTitle;
                  itemThumbnail = itemData.thumbnail || itemData.pictures?.[0]?.url || null;
                } else {
                  console.log(`[meli-labels] [${account.meli_nickname}] Error obteniendo item ${itemId}: ${itemRes.status}`);
                }
              }
            }

            // DETERMINAR TIPO DE ENVÍO
            let type = "correo";
            const shipLogisticType = shipData.logistic_type || "";
            
            if (shipLogisticType === "self_service" || shipLogisticType === "self_service_flex") {
              type = "flex";
            } else if (shipLogisticType === "cross_docking") {
              type = "turbo";
            } else if (shipLogisticType === "fulfillment") {
              type = "full";
            } else if (shipLogisticType === "drop_off") {
              type = "correo";
            }

            // OBTENER DIRECCIÓN DEL COMPRADOR
            const receiverAddress = shipData.receiver_address || {};
            const address = [
              receiverAddress.address_line,
              receiverAddress.street_name,
              receiverAddress.comment
            ].filter(Boolean).join(" ") || "Sin dirección";

            // VERIFICAR SI YA FUE IMPRESA
            const { data: printedLabel, error: printedError } = await supabase
              .from("meli_printed_labels")
              .select("shipment_id, printed_at")
              .eq("shipment_id", String(shipmentId))
              .maybeSingle();

            if (printedError) {
              console.error(`[meli-labels] Error consultando printed_labels:`, printedError);
            }

            // CONSTRUIR OBJETO DE SHIPMENT
            const shipment = {
              shipment_id: shipmentId,
              order_id: order.id,
              account: account.meli_nickname,
              account_id: account.id,
              meli_user_id: String(account.meli_user_id),
              type: type,
              buyer: order.buyer?.nickname || "Comprador",
              buyer_nickname: order.buyer?.nickname,
              buyer_phone: receiverAddress.receiver_phone || order.buyer?.phone?.number || null,
              title: itemTitle,
              quantity: quantity,
              thumbnail: itemThumbnail,
              item_id: itemId,
              
              // Fechas
              delivery_date: shipData.estimated_delivery_time?.date || shipData.estimated_delivery?.date || null,
              dispatch_date: shipData.estimated_dispatch_time?.date || shipData.estimated_handling_limit?.date || null,
              date_created: order.date_created,
              
              // Dirección
              delivery_address: address,
              delivery_city: receiverAddress.city?.name || null,
              delivery_state: receiverAddress.state?.name || null,
              delivery_zip: receiverAddress.zip_code || null,
              delivery_country: receiverAddress.country?.name || null,
              
              // Información de envío
              status: shipData.status,
              status_label: getStatusLabel(shipData.status),
              tracking_number: shipData.tracking_number || shipData.tracking_method || null,
              shipping_cost: order.shipping_cost || 0,
              total_price: order.total_amount || 0,
              
              // Etiqueta
              label_url: shipData.label?.url || null,
              printed_at: printedLabel?.printed_at || null,
              printed: !!printedLabel,
            };

            allShipments.push(shipment);
            console.log(`[meli-labels] [${account.meli_nickname}] ✅ Shipment ${shipmentId} agregado (${type})`);

          } catch (orderError) {
            console.error(`[meli-labels] [${account.meli_nickname}] Error procesando orden ${order.id}:`, orderError);
          }
        }
      } catch (err) {
        console.error(`[meli-labels] [${account.meli_nickname}] Error general:`, err);
      }
    }

    // Clasificar shipments en categorias separadas
    const pending: any[] = [];     // Pendientes de imprimir (handling, ready_to_ship, paid)
    const printed: any[] = [];     // Ya impresas en nuestra app
    const in_transit: any[] = [];  // En camino (shipped)
    const full: any[] = [];        // Fulfillment (MeLi maneja el envio)
    const returns: any[] = [];     // Devoluciones

    for (const s of allShipments) {
      const shipStatus = s.status;
      const isFull = s.type === "full";
      
      // Full siempre va a su propia seccion
      if (isFull) {
        full.push(s);
        continue;
      }

      // Shipped = en transito (no debe estar en pendientes)
      if (shipStatus === "shipped") {
        in_transit.push(s);
        continue;
      }

      // Delivered o returned
      if (shipStatus === "delivered") continue; // No mostrar entregados
      if (shipStatus === "returned" || shipStatus === "cancelled") {
        returns.push(s);
        continue;
      }

      // Si ya fue impresa en nuestra app, va a impresas
      if (s.printed) {
        printed.push(s);
        continue;
      }

      // Pendientes (handling, ready_to_ship, paid, pending) - solo si tiene label disponible
      if (s.label_url || shipStatus === "ready_to_ship" || shipStatus === "handling") {
        pending.push(s);
      } else if (shipStatus === "paid" || shipStatus === "pending") {
        // Pagado pero sin etiqueta todavia - igual mostrar como pendiente
        pending.push(s);
      }
    }

    // Calcular resumen
    const summary = {
      total: allShipments.length,
      pending: pending.length,
      printed: printed.length,
      in_transit: in_transit.length,
      full: full.length,
      returns: returns.length,
      flex: pending.filter(s => s.type === "flex").length,
      correo: pending.filter(s => s.type === "correo").length,
      turbo: pending.filter(s => s.type === "turbo").length,
    };

    console.log(`[meli-labels] TOTAL: ${allShipments.length} | Pendientes: ${pending.length} | Impresas: ${printed.length} | En transito: ${in_transit.length} | Full: ${full.length}`);

    return NextResponse.json({
      shipments: pending,
      printed,
      in_transit,
      full,
      returns,
      summary,
    });
  } catch (error) {
    console.error("[meli-labels] Error inesperado:", error);
    return NextResponse.json({ 
      shipments: [], 
      summary: {},
      error: error instanceof Error ? error.message : "Error interno"
    }, { status: 500 });
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
    const { shipment_ids, account_id, shipping_method = "unknown" } = body;

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

    // Guardar en el historial
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
          p_shipping_method: shipping_method,
          p_printed_by: "appjeez",
        });

        if (error) throw error;
        results.push({ shipment_id, saved: true, id: data });
      } catch (e) {
        console.error(`[meli-labels] Error guardando ${shipment_id}:`, e);
        results.push({ shipment_id, saved: false, error: String(e) });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("[meli-labels] Error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// Helper para obtener etiqueta legible del estado
function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    "ready_to_ship": "Listo para enviar",
    "handling": "En preparación",
    "pending": "Pendiente",
    "shipped": "En camino",
    "delivered": "Entregado",
    "cancelled": "Cancelado",
    "returned": "Devuelto",
  };
  return labels[status] || status;
}
