import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Forzar renderizado dinámico - evita error de generación estática
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Verificar que las variables de entorno estén configuradas
if (!supabaseUrl || !supabaseServiceKey || supabaseUrl.includes("placeholder")) {
  console.warn("[API meli-messages] Supabase no configurado correctamente");
}

const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseServiceKey || "placeholder-key"
);

/**
 * GET /api/meli-messages
 * 
 * Obtiene los mensajes de compradores de todas las cuentas de Mercado Libre.
 * Solo incluye mensajes de compradores que han realizado compras (tienen order_id).
 * 
 * Parámetros de query opcionales:
 * - limit: Cantidad máxima de mensajes (default: 50)
 * - offset: Desplazamiento para paginación (default: 0)
 * - status: 'unread' | 'read' | 'all' (default: 'all')
 * 
 * Respuesta: Array de mensajes con datos del comprador y la orden
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const status = searchParams.get("status") || "all";

    // Construir la consulta base
    let query = supabase
      .from("meli_messages")
      .select(`
        id,
        meli_message_id,
        meli_account_id,
        order_id,
        pack_id,
        buyer_id,
        buyer_nickname,
        item_id,
        item_title,
        item_thumbnail,
        message_text,
        status,
        message_type,
        date_created,
        date_read,
        attachments
      `)
      .order("date_created", { ascending: false })
      .range(offset, offset + limit - 1);

    // Aplicar filtro de estado si no es 'all'
    if (status === "unread") {
      query = query.eq("status", "UNREAD");
    } else if (status === "read") {
      query = query.eq("status", "READ");
    }

    const { data: messages, error } = await query;

    if (error) {
      console.error("[API meli-messages] Error:", error);
      return NextResponse.json(
        { error: "Error al obtener mensajes", details: error.message },
        { status: 500 }
      );
    }

    // Transformar los datos
    const formattedMessages = messages?.map((m: any) => ({
      id: m.id,
      meli_message_id: m.meli_message_id,
      meli_account_id: m.meli_account_id,
      order_id: m.order_id,
      pack_id: m.pack_id,
      buyer_id: m.buyer_id,
      buyer_nickname: m.buyer_nickname,
      item_id: m.item_id,
      item_title: m.item_title,
      item_thumbnail: m.item_thumbnail,
      message_text: m.message_text,
      status: m.status,
      message_type: m.message_type,
      date_created: m.date_created,
      date_read: m.date_read,
      attachments: m.attachments,
    })) || [];

    return NextResponse.json(formattedMessages);
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
