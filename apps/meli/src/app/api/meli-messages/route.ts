import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getValidToken } from "@/lib/meli";

// Forzar renderizado dinámico - evita error de generación estática
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseServiceKey || "placeholder-key"
);

/**
 * GET /api/meli-messages
 *
 * Obtiene mensajes no leídos de ventas de todas las cuentas MeLi del usuario.
 *
 * Estrategia:
 *  1. Si meli_messages tiene datos recientes (< 5 min) → devolver de DB
 *  2. Si no → llamar MeLi API directamente por cada cuenta, guardar en DB, devolver
 *
 * Query params:
 *  - limit   (default: 50)
 *  - offset  (default: 0)
 *  - status  'unread' | 'read' | 'all' (default: 'all')
 *  - account_id  filtrar por id de cuenta
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit      = parseInt(searchParams.get("limit") || "50", 10);
    const offset     = parseInt(searchParams.get("offset") || "0", 10);
    const status     = searchParams.get("status") || "all";
    const accountId  = searchParams.get("account_id") || "";

    // Obtener usuario autenticado
    const authHeader = request.headers.get("authorization");
    let userId: string | null = null;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) userId = user.id;
    }

    // ── Intentar desde DB primero ──────────────────────────────────────────
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    let dbQuery = supabase
      .from("meli_messages")
      .select(`
        id, meli_message_id, meli_account_id, order_id, pack_id,
        buyer_id, buyer_nickname, item_id, item_title, item_thumbnail,
        message_text, status, message_type, date_created, date_read, attachments
      `)
      .gte("date_created", fiveMinutesAgo)
      .order("date_created", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status === "unread") dbQuery = dbQuery.eq("status", "UNREAD");
    else if (status === "read") dbQuery = dbQuery.eq("status", "READ");
    if (accountId) dbQuery = dbQuery.eq("meli_account_id", accountId);

    const { data: cachedMessages } = await dbQuery;

    if (cachedMessages && cachedMessages.length > 0) {
      return NextResponse.json(cachedMessages);
    }

    // ── DB vacía o datos viejos → fetch directo a MeLi API ────────────────
    if (!userId) {
      // Sin autenticación devolvemos array vacío
      return NextResponse.json([]);
    }

    const { data: accounts } = await supabase
      .from("linked_meli_accounts")
      .select("id, meli_user_id, meli_nickname, access_token_enc")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (!accounts || accounts.length === 0) {
      return NextResponse.json([]);
    }

    const allMessages: any[] = [];

    await Promise.all(
      accounts.map(async (account: any) => {
        if (!account.access_token_enc) return;
        try {
          // Descifrar token AES-GCM antes de usarlo
          const validToken = await getValidToken(account as any);
          if (!validToken) return;

          const meliRes = await fetch(
            `https://api.mercadolibre.com/messages/unread?role=seller&limit=25`,
            {
              headers: { Authorization: `Bearer ${validToken}` },
              signal: AbortSignal.timeout(5000),
            }
          );

          if (!meliRes.ok) return;
          const meliData = await meliRes.json();
          const conversations: any[] = meliData.results || [];

          for (const conv of conversations) {
            const msg = {
              meli_message_id: conv.id || String(Math.random()),
              meli_account_id: account.id,
              order_id:        conv.resource_id || null,
              pack_id:         conv.pack_id || null,
              buyer_id:        conv.from?.user_id?.toString() || null,
              buyer_nickname:  conv.from?.nickname || account.meli_nickname,
              item_id:         null,
              item_title:      conv.resource_label || null,
              item_thumbnail:  null,
              message_text:    conv.text || "",
              status:          "UNREAD",
              message_type:    "buyer",
              date_created:    conv.date_created || new Date().toISOString(),
              date_read:       null,
              attachments:     [],
            };
            allMessages.push({ ...msg, account_nickname: account.meli_nickname });

            // Guardar en DB de forma async
            supabase.from("meli_messages").upsert(msg, { onConflict: "meli_message_id" })
              .then(() => {}).catch(() => {});
          }
        } catch {
          // Si la cuenta tiene token vencido, ignorar silenciosamente
        }
      })
    );

    // Filtrar y paginar
    let result = allMessages;
    if (status === "unread") result = result.filter((m) => m.status === "UNREAD");
    else if (status === "read") result = result.filter((m) => m.status === "READ");
    if (accountId) result = result.filter((m) => m.meli_account_id === accountId);

    result.sort((a, b) => new Date(b.date_created).getTime() - new Date(a.date_created).getTime());
    result = result.slice(offset, offset + limit);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[API meli-messages] Error inesperado:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/meli-messages
 * 
 * Envía un mensaje a un comprador.
 * 
 * Body:
 * - order_id: ID de la orden de compra
 * - message_text: Texto del mensaje
 * - meli_account_id: ID de la cuenta de ML
 * - attachments: (opcional) Array de URLs de archivos adjuntos
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { order_id, message_text, meli_account_id, attachments } = body;

    if (!order_id || !message_text || !meli_account_id) {
      return NextResponse.json(
        { error: "Faltan campos requeridos: order_id, message_text, meli_account_id" },
        { status: 400 }
      );
    }

    // Obtener los datos de la cuenta de Mercado Libre
    const { data: account, error: accountError } = await supabase
      .from("meli_accounts")
      .select("access_token, refresh_token")
      .eq("id", meli_account_id)
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { error: "Cuenta de Mercado Libre no encontrada" },
        { status: 404 }
      );
    }

    // Obtener el pack_id de la orden
    const { data: orderData } = await supabase
      .from("meli_orders")
      .select("pack_id")
      .eq("order_id", order_id)
      .single();

    const packId = orderData?.pack_id || order_id;

    // Preparar el payload para la API de ML
    const payload: any = {
      from: {
        user_id: account.access_token, // Se reemplaza después
      },
      to: {
        user_id: "buyer", // Se determina desde la orden
      },
      text: message_text,
    };

    if (attachments?.length > 0) {
      payload.attachments = attachments.map((url: string) => ({ filename: url }));
    }

    // Enviar mensaje a través de la API de Mercado Libre
    let response = await fetch(`https://api.mercadolibre.com/messages/packs/${packId}/sellers/${account.access_token}?tag=post_sale`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${account.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    // Manejar token expirado
    if (response.status === 401) {
      const refreshResponse = await fetch("https://api.mercadolibre.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          client_id: process.env.MELI_CLIENT_ID || "",
          client_secret: process.env.MELI_CLIENT_SECRET || "",
          refresh_token: account.refresh_token,
        }),
      });

      if (refreshResponse.ok) {
        const newTokens = await refreshResponse.json();
        
        await supabase
          .from("meli_accounts")
          .update({
            access_token: newTokens.access_token,
            refresh_token: newTokens.refresh_token,
          })
          .eq("id", meli_account_id);

        response = await fetch(`https://api.mercadolibre.com/messages/packs/${packId}/sellers/${newTokens.access_token}?tag=post_sale`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${newTokens.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Error desconocido" }));
      return NextResponse.json(
        { error: "Error al enviar mensaje", details: errorData },
        { status: response.status }
      );
    }

    const responseData = await response.json();

    // Guardar el mensaje enviado en la base de datos
    await supabase.from("meli_messages").insert({
      meli_message_id: responseData.id,
      meli_account_id,
      order_id,
      pack_id: packId,
      message_text,
      status: "SENT",
      message_type: "seller",
      date_created: new Date().toISOString(),
      attachments: attachments || [],
    });

    return NextResponse.json({ 
      status: "ok", 
      message: "Mensaje enviado correctamente",
      data: responseData 
    });
  } catch (error) {
    console.error("[API meli-messages] Error inesperado:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/meli-messages
 * 
 * Marca mensajes como leídos.
 * 
 * Body:
 * - message_ids: Array de IDs de mensajes a marcar como leídos
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { message_ids } = body;

    if (!Array.isArray(message_ids) || message_ids.length === 0) {
      return NextResponse.json(
        { error: "Se requiere un array de message_ids" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("meli_messages")
      .update({
        status: "READ",
        date_read: new Date().toISOString(),
      })
      .in("id", message_ids);

    if (error) {
      return NextResponse.json(
        { error: "Error al marcar mensajes como leídos", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ status: "ok", updated: message_ids.length });
  } catch (error) {
    console.error("[API meli-messages] Error inesperado:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
