import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.26.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase credentials");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface MeliAccount {
  meli_user_id: string;
  account_id: string;
  access_token: string;
}

interface Shipment {
  id: number;
  order_id: number;
  status: string;
  substatus: string;
  shipping: {
    type?: string;
    mode?: string;
    logistic_type?: string;
  };
  tracking?: { number: string };
}

async function getMeliAccounts(): Promise<MeliAccount[]> {
  const { data, error } = await supabase
    .from("meli_accounts")
    .select("meli_user_id, account_id, access_token")
    .eq("status", "active");

  if (error) {
    console.error("Error fetching accounts:", error);
    return [];
  }

  return data || [];
}

async function getMeliShipments(
  meliUserId: string,
  accessToken: string
): Promise<Shipment[]> {
  try {
    const response = await fetch(
      `https://api.mercadolibre.com/users/${meliUserId}/shipments/search?status=shipped&limit=100&sort=date_created&sort_order=desc`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      console.warn(`Failed to fetch shipments for ${meliUserId}:`, response.status);
      return [];
    }

    const data = await response.json();
    return data.results || [];
  } catch (err) {
    console.error(`Error fetching shipments:`, err);
    return [];
  }
}

async function getMeliOrder(
  orderId: number,
  accessToken: string
): Promise<{
  thumbnail?: string;
  sku?: string;
  buyer_nickname?: string;
  quantity?: number;
  variation?: string;
  unit_price?: number;
} | null> {
  try {
    const response = await fetch(`https://api.mercadolibre.com/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      console.warn(`Failed to fetch order ${orderId}`);
      return null;
    }

    const order = await response.json();

    // Extraer datos del primer item
    if (order.order_items && order.order_items.length > 0) {
      const item = order.order_items[0];
      let thumbnail = item.item?.thumbnail || "";

      // Asegurar HTTPS
      if (thumbnail && thumbnail.startsWith("http://")) {
        thumbnail = thumbnail.replace("http://", "https://");
      }

      // Extraer variaciones (color, talle, etc.)
      let variation = "";
      if (item.variation_attributes && item.variation_attributes.length > 0) {
        variation = item.variation_attributes
          .map((v: { name: string; value_name: string }) => `${v.name}: ${v.value_name}`)
          .join(", ");
      }

      return {
        thumbnail,
        sku: item.seller_custom_field || item.item?.seller_sku,
        buyer_nickname: order.buyer?.nickname,
        quantity: item.quantity,
        variation,
        unit_price: item.unit_price,
      };
    }

    return null;
  } catch (err) {
    console.error(`Error fetching order:`, err);
    return null;
  }
}

function classifyShippingMethod(
  shippingType?: string,
  mode?: string,
  logisticType?: string
): "correo" | "flex" | "turbo" | "full" {
  const type = (shippingType || "").toLowerCase();
  const md = (mode || "").toLowerCase();
  const lt = (logisticType || "").toLowerCase();

  if (type.includes("fulfillment") || md.includes("fulfillment") || lt.includes("fulfillment")) {
    return "full";
  }
  if (type.includes("flex") || md.includes("flex")) return "flex";
  if (type.includes("turbo") || md.includes("turbo")) return "turbo";
  if (type.includes("standard") || type.includes("correo")) return "correo";

  return "correo"; // default
}

async function syncPrintedLabels() {
  try {
    const accounts = await getMeliAccounts();
    console.log(`Syncing printed labels for ${accounts.length} accounts`);

    let totalSynced = 0;
    let totalDuplicates = 0;

    for (const account of accounts) {
      try {
        // Obtener shipments de MeLi
        const shipments = await getMeliShipments(account.meli_user_id, account.access_token);

        for (const shipment of shipments) {
          // Filtrar por substatus que indique etiqueta impresa
          if (shipment.substatus !== "printed" && shipment.substatus !== "ready_to_print") {
            continue;
          }

          try {
            // Enriquecer datos desde la orden
            const orderData = await getMeliOrder(shipment.order_id, account.access_token);

            if (!orderData) {
              console.warn(`Could not fetch order data for shipment ${shipment.id}`);
              continue;
            }

            // Verificar si ya existe en la BD
            const { data: existing, error: checkError } = await supabase
              .from("printed_labels")
              .select("id")
              .eq("shipment_id", shipment.id)
              .eq("meli_user_id", account.meli_user_id)
              .single();

            if (existing) {
              // Ya existe, no insertar
              totalDuplicates++;
              continue;
            }

            if (checkError && checkError.code !== "PGRST116") {
              // PGRST116 = no rows found (normal)
              console.warn(`Check error for shipment ${shipment.id}:`, checkError);
              continue;
            }

            // Clasificar método de envío
            const shippingMethod = classifyShippingMethod(
              shipment.shipping?.type,
              shipment.shipping?.mode,
              shipment.shipping?.logistic_type
            );

            // Insertar en printed_labels
            const { error: insertError } = await supabase.from("printed_labels").insert({
              shipment_id: shipment.id,
              order_id: shipment.order_id,
              tracking_number: shipment.tracking?.number || null,
              buyer_nickname: orderData.buyer_nickname || null,
              sku: orderData.sku || null,
              variation: orderData.variation || null,
              quantity: orderData.quantity || 1,
              account_id: account.account_id,
              meli_user_id: account.meli_user_id,
              shipping_method: shippingMethod,
              file_path: "sync-from-meli", // Indicador de sincronización automática
              print_date: new Date().toISOString(),
              source: "meli_auto",
              synced_at: new Date().toISOString(),
            });

            if (!insertError) {
              totalSynced++;
            } else {
              console.warn(`Insert error for shipment ${shipment.id}:`, insertError);
            }

            // Pequeño delay para no saturar la API de MeLi
            await new Promise((resolve) => setTimeout(resolve, 100));
          } catch (err) {
            console.error(`Error processing shipment ${shipment.id}:`, err);
          }
        }
      } catch (err) {
        console.error(`Error syncing account ${account.meli_user_id}:`, err);
        // Continuar con siguiente cuenta
      }
    }

    return {
      success: true,
      message: `Sync completed: ${totalSynced} new labels synced, ${totalDuplicates} duplicates skipped`,
      totalSynced,
      totalDuplicates,
      accountsProcessed: accounts.length,
    };
  } catch (err) {
    console.error("Sync error:", err);
    throw err;
  }
}

serve(async (req: Request) => {
  // Validar que es una solicitud interna (Cron)
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.includes("Bearer")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  try {
    const result = await syncPrintedLabels();
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Function error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
