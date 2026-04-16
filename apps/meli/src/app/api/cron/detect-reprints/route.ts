import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getValidToken, type LinkedMeliAccount } from "@/lib/meli";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key"
);

const CRON_SECRET = process.env.CRON_SECRET || "";

function classifyType(order: any, shipData?: any): string {
  // Prioridad 1: datos del shipment
  if (shipData?.logistic_type) {
    if (shipData.logistic_type.includes("flex")) return "flex";
    if (shipData.logistic_type.includes("cross_docking")) return "turbo";
    if (shipData.logistic_type.includes("fulfillment")) return "full";
  }
  
  // Prioridad 2: shipping de la orden
  if (order.shipping?.logistic_type) {
    if (order.shipping.logistic_type.includes("flex")) return "flex";
    if (order.shipping.logistic_type.includes("cross_docking")) return "turbo";
    if (order.shipping.logistic_type.includes("fulfillment")) return "full";
  }
  
  // Prioridad 3: tags
  const tags = (order.tags || []).join(" ").toLowerCase();
  if (tags.includes("flex")) return "flex";
  if (tags.includes("turbo")) return "turbo";
  if (tags.includes("full")) return "full";
  
  return "correo";
}

/**
 * GET /api/cron/detect-reprints
 * Guarda TODAS las etiquetas en el historial, sin filtros.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const secret = authHeader?.replace("Bearer ", "") || request.nextUrl.searchParams.get("secret");
  
  if (CRON_SECRET && secret !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: accounts } = await supabase
      .from("linked_meli_accounts")
      .select("id, user_id, meli_user_id, meli_nickname, access_token_enc, refresh_token_enc, token_expiry_date, is_active")
      .eq("is_active", true);

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ message: "No hay cuentas activas" });
    }

    let totalSaved = 0;
    const savedByType: Record<string, number> = { flex: 0, turbo: 0, full: 0, correo: 0 };

    for (const account of accounts) {
      try {
        const token = await getValidToken(account as LinkedMeliAccount);
        if (!token) continue;

        const headers = { Authorization: `Bearer ${token}` };
        const meliId = String(account.meli_user_id);

        console.log(`[detect-reprints] === PROCESANDO CUENTA: ${account.meli_nickname} ===`);
        
        // Buscar TODAS las ordenes de los ultimos 90 dias (mas tiempo)
        const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
        console.log(`[detect-reprints] Buscando desde: ${since}`);
        
        // Buscar en TODOS los estados posibles
        const statuses = ["pending", "paid", "confirmed", "shipped", "delivered", "cancelled"];
        let allOrders: any[] = [];
        
        for (const status of statuses) {
          try {
            console.log(`[detect-reprints] Buscando estado: ${status}`);
            const ordersRes = await fetch(
              `https://api.mercadolibre.com/orders/search?seller=${meliId}&order.status=${status}&order.date_created.from=${since}&limit=100`,
              { headers, signal: AbortSignal.timeout(15000) }
            );
            if (ordersRes.ok) {
              const data = await ordersRes.json();
              const count = data.results?.length || 0;
              console.log(`[detect-reprints] Estado ${status}: ${count} ordenes`);
              allOrders = allOrders.concat(data.results || []);
            } else {
              console.log(`[detect-reprints] Error estado ${status}: ${ordersRes.status}`);
            }
          } catch (e) {
            console.log(`[detect-reprints] Error buscando ${status}:`, (e as Error).message);
          }
        }
        
        // Deduplicar por order.id
        const seen = new Set<string>();
        const orders = allOrders.filter(o => {
          if (seen.has(String(o.id))) return false;
          seen.add(String(o.id));
          return true;
        });
        
        console.log(`[detect-reprints] ${account.meli_nickname}: ${orders.length} ordenes unicas encontradas`);

        for (const order of orders) {
          const orderId = String(order.id);
          const shipmentId = order.shipping?.id ? String(order.shipping.id) : orderId;

          // Verificar si ya existe
          const { data: existing } = await supabase
            .from("meli_printed_labels")
            .select("id")
            .eq("order_id", orderId)
            .maybeSingle();

          if (existing) {
            console.log(`[detect-reprints] Orden ${orderId} YA EXISTE en historial`);
            continue;
          }

          // Obtener shipment si existe
          let shipData: any = null;
          if (order.shipping?.id) {
            try {
              const shipRes = await fetch(
                `https://api.mercadolibre.com/shipments/${shipmentId}`,
                { headers, signal: AbortSignal.timeout(8000) }
              );
              if (shipRes.ok) shipData = await shipRes.json();
            } catch {}
          }

          // Clasificar tipo
          const tipo = classifyType(order, shipData);

          console.log(`[detect-reprints] GUARDANDO orden ${orderId}, tipo=${tipo}`);

          // Verificar si ya existe por order_id
          const { data: existing, error: checkError } = await supabase
            .from("meli_printed_labels")
            .select("id")
            .eq("order_id", orderId)
            .maybeSingle();

          if (checkError) {
            console.log(`[detect-reprints] Error verificando ${orderId}:`, checkError.message);
          }

          if (existing) {
            console.log(`[detect-reprints] Orden ${orderId} YA EXISTE, saltando`);
            continue;
          }

          // Insertar nueva etiqueta
          const firstItem = order.order_items?.[0];
          
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
              shipping_method: tipo,
              shipment_status: shipData?.status || order.shipping?.status || "unknown",
              source: "meli-auto",
              order_date: order.date_created,
              print_date: shipData?.date_created || order.date_created,
              user_id: account.user_id,
            });

          if (!insertError) {
            totalSaved++;
            savedByType[tipo]++;
            console.log(`[detect-reprints] ✓ INSERTADA: ${orderId} tipo=${tipo}`);
          } else {
            console.error(`[detect-reprints] ✗ ERROR insertando ${orderId}:`, insertError.message);
          }
        }
      } catch (err) {
        console.error(`[detect-reprints] Error cuenta ${account.meli_nickname}:`, err);
      }
    }

    return NextResponse.json({
      message: "Proceso completado",
      saved: totalSaved,
      by_type: savedByType,
    });
  } catch (error) {
    console.error("[detect-reprints] Error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
