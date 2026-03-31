import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getActiveAccounts, getValidToken, meliGet } from "@/lib/meli";

const MELI_WEBHOOK_SECRET = process.env.MELI_WEBHOOK_SECRET || "";

export async function POST(req: Request) {
  try {
    // Verificar firma del webhook (si está configurada)
    const signature = req.headers.get("x-signature");
    const nonce = req.headers.get("x-nonce");
    // TODO: Validar firma si es necesario (por ahora, acceptamos todo)

    const body = await req.json();
    const { resource, user_id, topic } = body;

    console.log(`[meli-items-webhook] Topic: ${topic}, Resource: ${resource}, User: ${user_id}`);

    // Solo procesamos topic "items"
    if (topic !== "items") {
      return NextResponse.json({ ok: true });
    }

    // Extraer item_id del resource (ej: "/items/123456")
    const itemId = resource.split("/").pop();
    if (!itemId) {
      return NextResponse.json({ error: "Invalid resource format" }, { status: 400 });
    }

    // Obtener cuenta activa para este user_id
    const accounts = await getActiveAccounts();
    const account = accounts.find(a => String(a.meli_user_id) === String(user_id));
    if (!account) {
      console.warn(`[meli-items-webhook] Account not found for user_id: ${user_id}`);
      return NextResponse.json({ ok: true }); // Retornar 200 igual para que MeLi no reintente
    }

    // Obtener token válido
    const token = await getValidToken(account);
    if (!token) {
      console.warn(`[meli-items-webhook] Invalid token for account: ${account.nickname}`);
      return NextResponse.json({ ok: true });
    }

    // Consultar MeLi para obtener detalles del item
    const itemData = await meliGet(
      `/items/${itemId}?attributes=id,title,price,currency_id,available_quantity,sold_quantity,thumbnail,status,permalink,logistic_type`,
      token
    );

    if (!itemData || !itemData.id) {
      console.warn(`[meli-items-webhook] Item not found or error fetching: ${itemId}`);
      return NextResponse.json({ ok: true });
    }

    // Conectar a Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[meli-items-webhook] Missing Supabase credentials");
      return NextResponse.json({ ok: true });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Preparar datos para Supabase
    const productData = {
      id: itemData.id,
      meli_user_id: String(account.meli_user_id),
      account_name: account.nickname,
      title: itemData.title,
      price: itemData.price,
      currency_id: itemData.currency_id || "ARS",
      available_quantity: itemData.available_quantity || 0,
      sold_quantity: itemData.sold_quantity || 0,
      thumbnail: (itemData.thumbnail || "").replace("http://", "https://"),
      secure_thumbnail: (itemData.thumbnail || "").replace("http://", "https://"),
      status: itemData.status,
      permalink: itemData.permalink,
      logistic_type: itemData.logistic_type || "not_specified",
      last_updated: new Date().toISOString(),
      synced_at: new Date().toISOString(),
    };

    // Upsert en products_cache
    const { error } = await supabase
      .from("products_cache")
      .upsert([productData], { onConflict: "id" });

    if (error) {
      console.error("[meli-items-webhook] Error upserting to Supabase:", error);
      return NextResponse.json({ ok: true }); // Retornar 200 igual
    }

    console.log(`[meli-items-webhook] ✓ Synced item ${itemId} for account ${account.nickname}`);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[meli-items-webhook] Fatal error:", (e as Error).message);
    return NextResponse.json({ ok: true }, { status: 200 }); // Retornar 200 para que MeLi no reintente
  }
}
