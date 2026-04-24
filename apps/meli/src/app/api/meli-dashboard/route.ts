import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getValidToken, getBuenosAiresDateString, getStartOfDayBuenosAires, type LinkedMeliAccount } from "@/lib/meli";
import { getCachedData, setCachedData } from "@/lib/dashboard-cache";

// Forzar renderizado dinámico - evita error de generación estática
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key";

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

    // Verificar caché
    const cachedData = getCachedData(userId);
    if (cachedData) {
      return NextResponse.json(cachedData);
    }

    // Obtener las cuentas de Mercado Libre del usuario
    const { data: accounts, error: accountsError } = await supabase
      .from("linked_meli_accounts")
      .select("id, user_id, meli_user_id, meli_nickname, is_active, access_token_enc, refresh_token_enc, token_expiry_date")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (accountsError) {
      console.error("[meli-dashboard] Error al obtener cuentas:", accountsError);
      return NextResponse.json({ error: "Error al obtener cuentas" }, { status: 500 });
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
          // ── Usar getValidToken con auto-refresh ──────────────────────────
          const validToken = await getValidToken(account as LinkedMeliAccount);

          if (!validToken) {
            console.log(`[meli-dashboard] ❌ No se pudo obtener token para ${account.meli_nickname}`);
            return defaultReturn("token_expired");
          }

          const meliHeaders = { Authorization: `Bearer ${validToken}` };
          const meliId = String(account.meli_user_id);

          // ── Llamadas paralelas a MeLi API ───────────────────────────────
          let userRes, questionsRes, ordersReadyRes, itemsRes, claimsRes, claimsOngoingRes, unreadRes, 
              todayOrdersPaidRes, todayOrdersConfirmedRes, todayOrdersProcessingRes;
          
          try {
            [userRes, questionsRes, ordersReadyRes, itemsRes, claimsRes, claimsOngoingRes, unreadRes, 
             todayOrdersPaidRes, todayOrdersConfirmedRes, todayOrdersProcessingRes] =
              await Promise.allSettled([
                fetch(`https://api.mercadolibre.com/users/${meliId}?attributes=seller_reputation,nickname`, {
                  headers: meliHeaders, signal: AbortSignal.timeout(5000),
                }),
                fetch(`https://api.mercadolibre.com/questions/search?seller_id=${meliId}&status=UNANSWERED&limit=1`, {
                  headers: meliHeaders, signal: AbortSignal.timeout(5000),
                }),
                fetch(`https://api.mercadolibre.com/orders/search?seller=${meliId}&order.status=ready_to_ship&limit=1`, {
                  headers: meliHeaders, signal: AbortSignal.timeout(5000),
                }),
                fetch(`https://api.mercadolibre.com/users/${meliId}/items/search?status=active&limit=1`, {
                  headers: meliHeaders, signal: AbortSignal.timeout(5000),
                }),
                fetch(`https://api.mercadolibre.com/post-sale/v2/claims/search?role=seller&status=opened&limit=1`, {
                  headers: meliHeaders, signal: AbortSignal.timeout(5000),
                }),
                fetch(`https://api.mercadolibre.com/post-sale/v2/claims/search?role=seller&status=ongoing&limit=1`, {
                  headers: meliHeaders, signal: AbortSignal.timeout(5000),
                }),
                fetch(`https://api.mercadolibre.com/messages/unread?role=seller&limit=1`, {
                  headers: meliHeaders, signal: AbortSignal.timeout(5000),
                }),
                fetch(`https://api.mercadolibre.com/orders/search?seller=${meliId}&order.status=paid&order.date_created.from=${getStartOfDayBuenosAires()}&limit=50`, {
                  headers: meliHeaders, signal: AbortSignal.timeout(10000),
                }),
                fetch(`https://api.mercadolibre.com/orders/search?seller=${meliId}&order.status=confirmed&order.date_created.from=${getStartOfDayBuenosAires()}&limit=50`, {
                  headers: meliHeaders, signal: AbortSignal.timeout(10000),
                }),
                fetch(`https://api.mercadolibre.com/orders/search?seller=${meliId}&order.status=processing&order.date_created.from=${getStartOfDayBuenosAires()}&limit=50`, {
                  headers: meliHeaders, signal: AbortSignal.timeout(10000),
                }),
              ]);
          } catch (fetchError) {
            console.error(`[meli-dashboard] ❌ Error en fetch para ${account.meli_nickname}:`, fetchError);
            return defaultReturn("Error en llamadas API");
          }

          // ── Parsear resultados ──────────────────────────────────────────
          const safeJson = async (r: PromiseSettledResult<Response>) => {
            if (r.status === "fulfilled" && r.value.ok) {
              try { return await r.value.json(); } catch { return null; }
            }
            return null;
          };

          const [userData, questionsData, ordersData, itemsData, claimsData, claimsOngoingData, unreadData, 
                 todayOrdersPaidData, todayOrdersConfirmedData, todayOrdersProcessingData] =
            await Promise.all([userRes, questionsRes, ordersReadyRes, itemsRes, claimsRes, claimsOngoingRes, unreadRes, 
                              todayOrdersPaidRes, todayOrdersConfirmedRes, todayOrdersProcessingRes].map(safeJson));

          // Reputación
          const rep = userData?.seller_reputation ?? {};
          
          const reputation: Reputation = {
            level_id:               rep.level_id ?? null,
            power_seller_status:    rep.power_seller_status ?? null,
            transactions_total:     rep.transactions?.total ?? 0,
            transactions_completed: rep.transactions?.completed ?? 0,
            ratings_positive:       rep.metrics?.sales?.fulfilled ?? rep.metrics?.ratings?.positive ?? 0,
            ratings_negative:       rep.metrics?.sales?.canceled ?? rep.metrics?.ratings?.negative ?? 0,
            ratings_neutral:        rep.metrics?.ratings?.neutral ?? 0,
            delayed_handling_time:  rep.metrics?.delayed_handling_time?.rate ?? rep.metrics?.handling_time?.delayed ?? 0,
            claims:                 rep.metrics?.claims?.rate ?? 0,
            cancellations:          rep.metrics?.cancellations?.rate ?? 0,
            immediate_payment:      false,
          };

          // Contadores
          const unansweredQuestions = questionsData?.total ?? questionsData?.paging?.total ?? 0;
          const readyToShip         = ordersData?.paging?.total ?? 0;
          const totalItems          = itemsData?.paging?.total ?? 0;
          // Sumar reclamos abiertos (opened) + en curso (ongoing) con múltiples fallbacks de formato
          const parseClaimsTotal = (d: any) =>
            d?.meta?.paging?.total ?? d?.paging?.total ?? d?.pagination?.total ?? d?.total ?? 0;
          const claimsCount = parseClaimsTotal(claimsData) + parseClaimsTotal(claimsOngoingData);
          const pendingMessages     = unreadData?.total ?? unreadData?.paging?.total ?? 0;

          // Ventas de hoy desde MeLi API - combinar todas las órdenes (paid + confirmed + processing)
          const paidOrders = todayOrdersPaidData?.results || [];
          const confirmedOrders = todayOrdersConfirmedData?.results || [];
          const processingOrders = todayOrdersProcessingData?.results || [];
          
          // Usar Set para evitar duplicados (misma orden puede aparecer en múltiples estados)
          const uniqueOrderIds = new Set<string>();
          const allOrders: any[] = [];
          
          [...paidOrders, ...confirmedOrders, ...processingOrders].forEach((order: any) => {
            if (!uniqueOrderIds.has(order.id)) {
              uniqueOrderIds.add(order.id);
              allOrders.push(order);
            }
          });
          
          const todayOrders = allOrders.length;
          const todaySalesAmount = allOrders.reduce((sum: number, order: any) => {
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

    // Guardar en caché
    setCachedData(userId, dashboardData);

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error("[meli-dashboard] Error inesperado:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
