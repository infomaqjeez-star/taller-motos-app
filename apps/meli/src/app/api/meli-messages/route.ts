import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getValidToken } from "@/lib/meli";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key"
);

/**
 * GET /api/meli-messages
 *
 * Obtiene mensajes no leídos de compradores de todas las cuentas MeLi del usuario.
 * Fetches directamente desde la API de Mercado Libre.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit     = parseInt(searchParams.get("limit") || "50", 10);
    const status    = searchParams.get("status") || "all";
    const accountId = searchParams.get("account_id") || "";

    // Auth
    const authHeader = request.headers.get("authorization");
    let userId: string | null = null;
    if (authHeader?.startsWith("Bearer ")) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.slice(7));
      if (user) userId = user.id;
    }
    if (!userId) return NextResponse.json([]);

    // Obtener cuentas activas
    const { data: accounts } = await supabase
      .from("linked_meli_accounts")
      .select("id, meli_user_id, meli_nickname, access_token_enc, refresh_token_enc, token_expiry_date")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (!accounts || accounts.length === 0) return NextResponse.json([]);

    const allMessages: any[] = [];

    await Promise.all(
      accounts.map(async (account: any) => {
        // Filtro por account_id si se especifica
        if (accountId && account.id !== accountId) return;
        try {
          const validToken = await getValidToken(account);
          if (!validToken) return;

          const headers = { Authorization: `Bearer ${validToken}` };

          // Mensajes no leídos de ventas
          const res = await fetch(
            `https://api.mercadolibre.com/messages/unread?role=seller&limit=${limit}`,
            { headers, signal: AbortSignal.timeout(6000) }
          );
          if (!res.ok) return;

          const data = await res.json();
          const conversations: any[] = data.results || [];

          for (const conv of conversations) {
            allMessages.push({
              id:              String(conv.id || Math.random()),
              meli_message_id: String(conv.id || Math.random()),
              meli_account_id: account.id,
              order_id:        conv.resource_id || null,
              pack_id:         conv.pack_id || null,
              buyer_id:        String(conv.from?.user_id || ""),
              buyer_nickname:  conv.from?.nickname || "Comprador",
              item_id:         null,
              item_title:      conv.resource_label || conv.subject || null,
              item_thumbnail:  null,
              message_text:    conv.text || conv.last_message?.text || "",
              status:          "UNREAD",
              message_type:    "buyer",
              date_created:    conv.date_created || new Date().toISOString(),
              date_read:       null,
              attachments:     [],
              account_nickname: account.meli_nickname,
              meli_accounts:   { nickname: account.meli_nickname },
            });
          }
        } catch { /* token inválido — ignorar cuenta */ }
      })
    );

    // Filtrar y ordenar
    let result = allMessages;
    if (status === "unread") result = result.filter((m) => m.status === "UNREAD");
    else if (status === "read") result = result.filter((m) => m.status === "READ");
    result.sort((a, b) => new Date(b.date_created).getTime() - new Date(a.date_created).getTime());
    result = result.slice(0, limit);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[meli-messages] Error inesperado:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
