import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getValidToken, type LinkedMeliAccount } from "@/lib/meli";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key"
);

const CRON_SECRET = process.env.CRON_SECRET || "";

function classifyLogisticType(logistic_type: string): string {
  if (logistic_type === "self_service" || logistic_type === "self_service_flex") return "flex";
  if (logistic_type === "cross_docking") return "turbo";
  if (logistic_type === "fulfillment") return "full";
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

        // Buscar ordenes con envio en estados validos de ORDEN (ultimas 24h)
        // Estados de orden validos: paid, confirmed
        // shipped/ready_to_ship son estados de SHIPMENT, no de ORDER
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const orderStatuses = ["paid", "confirmed"];
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
          if (!order.shipping?.id) continue;
          const shipmentId = String(order.shipping.id);

          // Verificar si ya existe en historial
          const { data: existing } = await supabase
            .from("meli_printed_labels")
            .select("shipment_id")
            .eq("shipment_id", shipmentId)
            .maybeSingle();

          if (existing) continue; // Ya guardada

          // Obtener info del shipment
          const shipRes = await fetch(
            `https://api.mercadolibre.com/shipments/${shipmentId}`,
            { headers, signal: AbortSignal.timeout(10000) }
          );
          if (!shipRes.ok) {
            console.log(`[detect-reprints] Error obteniendo shipment ${shipmentId}: ${shipRes.status}`);
            continue;
          }
          const shipData = await shipRes.json();

          // Guardar etiquetas que tienen label generado (shipped, ready_to_ship, etc.)
          const hasLabel = shipData.label?.url || shipData.label?.pdf || shipData.label?.zpl;
          const validStatus = ["ready_to_ship", "shipped", "delivered"].includes(shipData.status);
          
          if (!hasLabel || !validStatus) {
            console.log(`[detect-reprints] Shipment ${shipmentId} sin label valido (status: ${shipData.status}, hasLabel: ${!!hasLabel})`);
            continue;
          }

          console.log(`[detect-reprints] Etiqueta valida detectada: ${shipmentId} (status: ${shipData.status})`);

          const logisticType = classifyLogisticType(shipData.logistic_type || "");

          // Obtener info del item
          const firstItem = order.order_items?.[0];
          let sku = firstItem?.item?.seller_custom_field || null;
          let itemTitle = firstItem?.item?.title || "Producto";
          let itemId = firstItem?.item?.id || null;
          let itemThumbnail = firstItem?.item?.thumbnail || null;
          let buyerNickname = order.buyer?.nickname || null;

          // Guardar en historial con toda la info
          const { error: insertError } = await supabase
            .from("meli_printed_labels")
            .insert({
              shipment_id: shipmentId,
              order_id: String(order.id),
              tracking_number: shipData.tracking_number || null,
              buyer_nickname: buyerNickname,
              sku: sku,
              item_title: itemTitle,
              item_id: itemId,
              item_thumbnail: itemThumbnail,
              quantity: firstItem?.quantity || 1,
              account_id: account.id,
              meli_user_id: meliId,
              shipping_method: logisticType,
              shipment_status: shipData.status,
              source: "meli-auto",
              print_date: shipData.date_created || shipData.ship_date || new Date().toISOString(),
              user_id: account.user_id,
            });

          if (insertError) {
            console.error(`[detect-reprints] Error insertando ${shipmentId}:`, insertError.message);
          } else {
            totalSaved++;
            cuentaPorTipo[logisticType] = (cuentaPorTipo[logisticType] || 0) + 1;
            savedByType[logisticType] = (savedByType[logisticType] || 0) + 1;
            console.log(`[detect-reprints] Guardada etiqueta ${shipmentId} tipo=${logisticType} de ${account.meli_nickname}`);
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
