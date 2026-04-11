import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getValidToken } from "@/lib/meli";

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseServiceKey || "placeholder-key"
);

// Cache de reputacion en memoria (5 minutos por cuenta)
const repCache = new Map<string, { data: any; ts: number }>();
const REP_TTL_MS = 5 * 60 * 1000;

/**
 * GET /api/meli-account/[userId]
 *
 * Obtiene datos detallados de una cuenta MeLi, incluyendo reputacion fresca
 * desde la API de Mercado Libre (con cache de 5 min).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;
    if (!userId) {
      return NextResponse.json({ error: "userId es requerido" }, { status: 400 });
    }

    // Validar sesion
    const authHeader = request.headers.get("authorization");
    let currentUserId: string | null = null;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) currentUserId = user.id;
    }
    if (!currentUserId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Obtener la cuenta desde linked_meli_accounts
    const { data: account, error: accountError } = await supabase
      .from("linked_meli_accounts")
      .select("id, meli_user_id, meli_nickname, access_token_enc, refresh_token_enc, token_expiry_date")
      .eq("meli_user_id", userId)
      .eq("user_id", currentUserId)
      .single();

    if (accountError || !account) {
      return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
    }

    // Obtener publicaciones activas
    const { data: items } = await supabase
      .from("meli_items")
      .select("id, item_id, title, status, available_quantity, price, currency_id")
      .eq("meli_account_id", account.id)
      .eq("status", "active");

    const activeItems = items || [];
    const totalActiveItems = activeItems.length;
    const itemsLowStock = activeItems.filter((i) => i.available_quantity > 0 && i.available_quantity <= 5).length;
    const itemsOutOfStock = activeItems.filter((i) => i.available_quantity === 0).length;

    // ── Reputacion: cache en memoria (5 min) ────────────────────────────
    let reputationData: any = null;
    const cacheEntry = repCache.get(userId);
    if (cacheEntry && Date.now() - cacheEntry.ts < REP_TTL_MS) {
      reputationData = cacheEntry.data;
    } else {
      // Descifrar token y llamar MeLi API
      try {
        const validToken = await getValidToken(account as any);
        if (validToken) {
          const meliRes = await fetch(
            `https://api.mercadolibre.com/users/${userId}?attributes=reputation,site_id,nickname`,
            {
              headers: { Authorization: `Bearer ${validToken}` },
              signal: AbortSignal.timeout(5000),
            }
          );
          if (meliRes.ok) {
            const meliUser = await meliRes.json();
            reputationData = meliUser.reputation ?? null;
            repCache.set(userId, { data: reputationData, ts: Date.now() });
          }
        }
      } catch (e) {
        console.warn("[meli-account] No se pudo obtener reputacion de MeLi:", e);
      }
    }

    // ── Mapeo de nivel a nombre legible ─────────────────────────────────
    const LEVEL_NAMES: Record<string, string> = {
      "1_red":         "Rojo",
      "2_orange":      "Naranja",
      "3_yellow":      "Amarillo",
      "4_light_green": "Verde claro",
      "5_green":       "Verde",
    };

    const rep = reputationData || {};
    const levelId = rep.level_id ?? null;
    const reputation = {
      level_id:               levelId,
      level_name:             levelId ? (LEVEL_NAMES[levelId] ?? levelId) : "Sin datos",
      power_seller_status:    rep.power_seller_status ?? null,
      transactions_total:     rep.transactions?.total ?? 0,
      transactions_completed: rep.transactions?.completed ?? 0,
      ratings_positive:       rep.metrics?.sales?.fulfilled ?? 0,
      ratings_negative:       rep.metrics?.claims?.rate ?? 0,
      ratings_neutral:        0,
      delayed_handling_time:  rep.metrics?.delayed_handling_time?.rate ?? 0,
      claims:                 rep.metrics?.claims?.rate ?? 0,
      cancellations:          rep.metrics?.cancellations?.rate ?? 0,
      immediate_payment:      false,
    };

    return NextResponse.json({
      reputation,
      items: activeItems.map((item) => ({
        id: item.item_id,
        title: item.title,
        status: item.status,
        available_quantity: item.available_quantity,
        price: item.price,
        currency_id: item.currency_id,
      })),
      stats: {
        total_active_items: totalActiveItems,
        items_low_stock:    itemsLowStock,
        items_out_of_stock: itemsOutOfStock,
      },
    });
  } catch (error) {
    console.error("[meli-account] Error inesperado:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
