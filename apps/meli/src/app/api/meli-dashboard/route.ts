import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Forzar renderizado dinámico - evita error de generación estática
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Cliente Supabase Admin
const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseServiceKey || "placeholder-key"
);

interface Reputation {
  level_id: string | null;
  power_seller_status: string | null;
  transactions_total: number;
  transactions_completed: number;
  ratings_positive: number;
  ratings_negative: number;
  ratings_neutral: number;
  delayed_handling_time: number;
  claims: number;
  cancellations: number;
  immediate_payment: boolean;
}

interface AccountDash {
  account: string;
  meli_user_id: string;
  unanswered_questions: number;
  pending_messages: number;
  ready_to_ship: number;
  total_items: number;
  today_orders: number;
  today_sales_amount: number;
  claims_count: number;
  measurement_date: string;
  metrics_period: string;
  reputation: Reputation;
  error?: string;
}

/**
 * GET /api/meli-dashboard
 * 
 * Obtiene el dashboard consolidado de todas las cuentas de Mercado Libre
 * vinculadas al usuario autenticado.
 */
export async function GET(request: NextRequest) {
  try {
    // Obtener el usuario actual de la sesión
    const authHeader = request.headers.get("authorization");
    let userId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        userId = user.id;
      }
    }

    // Si no hay usuario autenticado, devolver array vacío
    if (!userId) {
      return NextResponse.json([], { status: 200 });
    }

    // Obtener las cuentas de Mercado Libre del usuario
    console.log(`[meli-dashboard] Buscando cuentas para userId: ${userId}`);
    
    const { data: accounts, error: accountsError } = await supabase
      .from("linked_meli_accounts")
      .select("id, meli_user_id, meli_nickname, is_active, access_token_enc, refresh_token_enc, token_expiry_date")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (accountsError) {
      console.error("[meli-dashboard] Error al obtener cuentas:", accountsError);
      return NextResponse.json(
        { error: "Error al obtener cuentas" },
        { status: 500 }
      );
    }

    console.log(`[meli-dashboard] Cuentas encontradas: ${accounts?.length || 0}`);
    if (accounts && accounts.length > 0) {
      console.log(`[meli-dashboard] Primeras cuentas:`, accounts.map(a => ({ id: a.id, nickname: a.meli_nickname, meli_user_id: a.meli_user_id })));
    }

    // Si no hay cuentas, devolver array vacío
    if (!accounts || accounts.length === 0) {
      return NextResponse.json([]);
    }

    // Para cada cuenta, obtener datos del dashboard
    const dashboardData: AccountDash[] = await Promise.all(
      accounts.map(async (account) => {
        const defaultReturn = (error?: string): AccountDash => ({
          account: account.meli_nickname || `Cuenta ${account.meli_user_id}`,
          meli_user_id: String(account.meli_user_id),
          unanswered_questions: 0,
          pending_messages: 0,
          ready_to_ship: 0,
          total_items: 0,
          today_orders: 0,
          today_sales_amount: 0,
          claims_count: 0,
          measurement_date: new Date().toISOString(),
          metrics_period: "Últimos 60 días",
          reputation: {
            level_id: null, power_seller_status: null,
            transactions_total: 0, transactions_completed: 0,
            ratings_positive: 0, ratings_negative: 0, ratings_neutral: 0,
            delayed_handling_time: 0, claims: 0, cancellations: 0, immediate_payment: false,
          },
          ...(error ? { error } : {}),
        });

        try {
          // ── Usar token directamente (ahora se guarda sin encriptar) ──────────────────────────
          const validToken = account.access_token_enc;

          if (!validToken || !validToken.startsWith('APP_USR')) {
            console.log(`[meli-dashboard] Token inválido para ${account.meli_nickname}`);
            return defaultReturn("Token inválido");
          }

          const meliHeaders = { Authorization: `Bearer ${validToken}` };
          const meliId = String(account.meli_user_id);

          // ── Llamadas paralelas a MeLi API ───────────────────────────────
          const [userRes, questionsRes, ordersReadyRes, itemsRes, claimsRes, unreadRes, todayOrdersRes] =
            await Promise.allSettled([
              // 1. Reputacion + datos del vendedor
              fetch(`https://api.mercadolibre.com/users/${meliId}?attributes=seller_reputation,nickname`, {
                headers: meliHeaders, signal: AbortSignal.timeout(5000),
              }),
              // 2. Preguntas sin responder
              fetch(`https://api.mercadolibre.com/my/questions?status=UNANSWERED&limit=1`, {
                headers: meliHeaders, signal: AbortSignal.timeout(5000),
              }),
              // 3. Órdenes listas para enviar
              fetch(`https://api.mercadolibre.com/orders/search?seller=${meliId}&order.status=ready_to_ship&limit=1`, {
                headers: meliHeaders, signal: AbortSignal.timeout(5000),
              }),
              // 4. Publicaciones activas
              fetch(`https://api.mercadolibre.com/users/${meliId}/items/search?status=active&limit=1`, {
                headers: meliHeaders, signal: AbortSignal.timeout(5000),
              }),
              // 5. Reclamos abiertos
              fetch(`https://api.mercadolibre.com/post-sale/v2/claims/search?role=seller&status=opened&limit=1`, {
                headers: meliHeaders, signal: AbortSignal.timeout(5000),
              }),
              // 6. Mensajes no leídos
              fetch(`https://api.mercadolibre.com/messages/unread?role=seller&limit=1`, {
                headers: meliHeaders, signal: AbortSignal.timeout(5000),
              }),
              // 7. Órdenes de hoy (pagadas) - usar zona horaria Argentina
              fetch(`https://api.mercadolibre.com/orders/search?seller=${meliId}&order.status=paid&order.date_created.from=${new Date().toISOString().split('T')[0]}T00:00:00.000Z&limit=50`, {
                headers: meliHeaders, signal: AbortSignal.timeout(10000),
              }),
            ]);

          // ── Parsear resultados ──────────────────────────────────────────
          const safeJson = async (r: PromiseSettledResult<Response>) => {
            if (r.status === "fulfilled" && r.value.ok) {
              try { return await r.value.json(); } catch { return null; }
            }
            return null;
          };

          const [userData, questionsData, ordersData, itemsData, claimsData, unreadData, todayOrdersData] =
            await Promise.all([userRes, questionsRes, ordersReadyRes, itemsRes, claimsRes, unreadRes, todayOrdersRes].map(safeJson));

          // Reputación
          const rep = userData?.seller_reputation ?? {};
          const reputation: Reputation = {
            level_id:               rep.level_id ?? null,
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

          // Contadores
          const unansweredQuestions = questionsData?.total ?? questionsData?.paging?.total ?? 0;
          const readyToShip         = ordersData?.paging?.total ?? 0;
          const totalItems          = itemsData?.paging?.total ?? 0;
          const claimsCount         = claimsData?.meta?.paging?.total ?? claimsData?.paging?.total ?? 0;
          const pendingMessages     = unreadData?.total ?? unreadData?.paging?.total ?? 0;

          // Ventas de hoy desde MeLi API
          const todayOrdersList = todayOrdersData?.results || [];
          const todayOrders = todayOrdersList.length;
          const todaySalesAmount = todayOrdersList.reduce((sum: number, order: any) => {
            return sum + (order.total_amount || order.paid_amount || 0);
          }, 0);

          return {
            account: account.meli_nickname || `Cuenta ${account.meli_user_id}`,
            meli_user_id: meliId,
            unanswered_questions: unansweredQuestions,
            pending_messages:     pendingMessages,
            ready_to_ship:        readyToShip,
            total_items:          totalItems,
            today_orders:         todayOrders,
            today_sales_amount:   todaySalesAmount,
            claims_count:         claimsCount,
            measurement_date:     new Date().toISOString(),
            metrics_period:       "Últimos 60 días",
            reputation,
          };
        } catch (error) {
          console.error(`[meli-dashboard] Error procesando cuenta ${account.meli_user_id}:`, error);
          return defaultReturn(error instanceof Error ? error.message : "Error desconocido");
        }
      })
    );

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error("[meli-dashboard] Error inesperado:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
