import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getValidToken, type LinkedMeliAccount } from "@/lib/meli";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key"
);

const CRON_SECRET = process.env.CRON_SECRET || "";

function classifyLogisticType(logistic_type: string, shipping_option?: string, tags?: string[]): string {
  // Primero verificar logistic_type del shipment
  if (logistic_type === "self_service" || logistic_type === "self_service_flex") return "flex";
  if (logistic_type === "cross_docking") return "turbo";
  if (logistic_type === "fulfillment") return "full";
  
  // Luego verificar shipping_option de la orden
  if (shipping_option) {
    const opt = shipping_option.toLowerCase();
    if (opt.includes("flex")) return "flex";
    if (opt.includes("turbo")) return "turbo";
    if (opt.includes("full")) return "full";
  }
  
  // Finalmente verificar tags
  if (tags && tags.length > 0) {
    const tagStr = tags.join(" ").toLowerCase();
    if (tagStr.includes("flex") || tagStr.includes("self_service")) return "flex";
    if (tagStr.includes("turbo") || tagStr.includes("cross_docking")) return "turbo";
    if (tagStr.includes("full") || tagStr.includes("fulfillment")) return "full";
  }
  
  return "correo";
}

/**
 * GET /api/cron/detect-reprints
 * 
 * Detecta etiquetas impresas en MeLi (estado shipped/ready_to_ship con label)
 * y las guarda automaticamente en el historial de AppJeez.
 * Protegido con CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  // Verificar secret
  const authHeader = request.headers.get("authorization");
  const secret = authHeader?.replace("Bearer ", "") || request.nextUrl.searchParams.get("secret");
  
  if (CRON_SECRET && secret !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Obtener todas las cuentas activas
    const { data: accounts } = await supabase
      .from("linked_meli_accounts")
      .select("id, user_id, meli_user_id, meli_nickname, access_token_enc, refresh_token_enc, token_expiry_date, is_active")
      .eq("is_active", true);

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ message: "No hay cuentas activas", saved: 0 });
    }

    let totalSaved = 0;
    const errors: string[] = [];
    const savedByType: Record<string, number> = { flex: 0, correo: 0, turbo: 0, full: 0 };

    for (const account of accounts) {
      try {
        const token = await getValidToken(account as LinkedMeliAccount);
        if (!token) continue;

        const headers = { Authorization: `Bearer ${token}` };
        const meliId = String(account.meli_user_id);

        // Buscar TODAS las ordenes (ultimos 7 dias para capturar todas las etiquetas)
        const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const orderStatuses = ["pending", "paid", "confirmed", "shipped", "delivered", "cancelled"];
        let allOrders: any[] = [];
        
        for (const orderStatus of orderStatuses) {
          try {
            const ordersRes = await fetch(
              `https://api.mercadolibre.com/orders/search?seller=${meliId}&order.status=${orderStatus}&order.date_created.from=${since}&limit=50`,
              { headers, signal: AbortSignal.timeout(15000) }
            );
            if (ordersRes.ok) {
              const data = await ordersRes.json();
              allOrders = allOrders.concat(data.results || []);
            }
          } catch { /* ignore */ }
        }
        
        // Deduplicar ordenes
        const seenOrders = new Set<string>();
        const orders = allOrders.filter(o => {
          if (seenOrders.has(String(o.id))) return false;
          seenOrders.add(String(o.id));
          return true;
        });

        console.log(`[detect-reprints] [${account.meli_nickname}] ${orders.length} ordenes unicas para procesar`);

        // Contadores por tipo
        const cuentaPorTipo: Record<string, number> = { flex: 0, correo: 0, turbo: 0, full: 0 };

        for (const order of orders) {
          // Usar order.id como identificador principal (shipping.id puede no existir todavia)
          const orderId = String(order.id);
          const shipmentId = order.shipping?.id ? String(order.shipping.id) : orderId;

          // Verificar si ya existe en historial (por order_id o shipment_id)
          const { data: existing } = await supabase
            .from("meli_printed_labels")
            .select("order_id, shipment_id")
            .or(`order_id.eq.${orderId},shipment_id.eq.${shipmentId}`)
            .maybeSingle();

          if (existing) {
            console.log(`[detect-reprints] Orden ${orderId} ya existe en historial`);
            continue;
          }

          // Intentar obtener info del shipment si existe
          let shipData: any = null;
          let logisticType = "correo";
          
          if (order.shipping?.id) {
            try {
              const shipRes = await fetch(
                `https://api.mercadolibre.com/shipments/${shipmentId}`,
                { headers, signal: AbortSignal.timeout(10000) }
              );
              if (shipRes.ok) {
                shipData = await shipRes.json();
                logisticType = classifyLogisticType(
                  shipData.logistic_type || order.logistic_type || "",
                  order.shipping_option?.name,
                  order.tags
                );
                console.log(`[detect-reprints] Shipment ${shipmentId} obtenido, tipo: ${logisticType}`);
              }
            } catch (e) {
              console.log(`[detect-reprints] No se pudo obtener shipment ${shipmentId}, usando datos de orden`);
            }
          }

          // Si no hay shipData, usar datos de la orden para clasificar
          if (!shipData) {
            // Log detallado para debug
            console.log(`[detect-reprints] Datos de orden ${orderId}:`, {
              shipping_option: order.shipping_option,
              tags: order.tags,
              logistic_type: order.logistic_type,
              shipping: order.shipping
            });
            
            logisticType = classifyLogisticType(
              order.logistic_type || "",
              order.shipping_option?.name,
              order.tags
            );
            console.log(`[detect-reprints] Clasificado por orden: tipo=${logisticType}`);
          }

          console.log(`[detect-reprints] Guardando etiqueta: orden=${orderId}, shipment=${shipmentId}, tipo=${logisticType}`);

          // Obtener info del item
          const firstItem = order.order_items?.[0];

          // Calcular fechas correctamente
          const orderDate = order.date_created || new Date().toISOString();
          const shipDate = shipData?.date_created || shipData?.ship_date || null;
          const printDate = shipDate || orderDate;
          
          // Guardar en historial con fechas y tipo bien identificados
          const { error: insertError } = await supabase
            .from("meli_printed_labels")
            .insert({
              shipment_id: shipmentId,
              order_id: orderId,
              tracking_number: shipData?.tracking_number || order.shipping?.tracking_number || null,
              buyer_nickname: order.buyer?.nickname || null,
              sku: firstItem?.item?.seller_custom_field || null,
              item_title: firstItem?.item?.title || "Producto",
              item_id: firstItem?.item?.id || null,
              item_thumbnail: firstItem?.item?.thumbnail || null,
              quantity: firstItem?.quantity || 1,
              account_id: account.id,
              meli_user_id: meliId,
              shipping_method: logisticType, // flex, turbo, full, correo
              shipment_status: shipData?.status || order.shipping?.status || order.status,
              source: "meli-auto",
              order_date: orderDate, // Fecha de la orden
              ship_date: shipDate,   // Fecha del envio
              print_date: printDate, // Fecha para filtrar/historial
              created_at: new Date().toISOString(), // Cuando se guardo en nuestra app
              user_id: account.user_id,
            });

          if (insertError) {
            console.error(`[detect-reprints] Error insertando orden ${orderId}:`, insertError.message);
          } else {
            totalSaved++;
            cuentaPorTipo[logisticType] = (cuentaPorTipo[logisticType] || 0) + 1;
            savedByType[logisticType] = (savedByType[logisticType] || 0) + 1;
            console.log(`[detect-reprints] ✓ Guardada: orden=${orderId}, tipo=${logisticType}, fecha=${printDate.split('T')[0]}`);
          }
        }
      } catch (err) {
        errors.push(`${account.meli_nickname}: ${(err as Error).message}`);
      }
    }

    return NextResponse.json({
      message: `Proceso completado`,
      saved: totalSaved,
      by_type: savedByType,
      accounts_processed: accounts.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("[detect-reprints] Error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
