import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

    // Si no hay cuentas, devolver array vacío
    if (!accounts || accounts.length === 0) {
      return NextResponse.json([]);
    }

    // Para cada cuenta, obtener datos del dashboard
    const dashboardData: AccountDash[] = await Promise.all(
      accounts.map(async (account) => {
        try {
          // Obtener conteo de preguntas sin responder
          const { count: unansweredQuestions } = await supabase
            .from("meli_unified_questions")
            .select("*", { count: "exact", head: true })
            .eq("meli_account_id", account.id)
            .eq("status", "UNANSWERED");

          // Obtener conteo de mensajes pendientes (si existe la tabla)
          let pendingMessages = 0;
          try {
            const { count: messagesCount } = await supabase
              .from("meli_messages")
              .select("*", { count: "exact", head: true })
              .eq("meli_account_id", account.id)
              .eq("status", "unread");
            pendingMessages = messagesCount || 0;
          } catch {
            // Tabla puede no existir
          }

          // Obtener conteo de envíos pendientes (si existe la tabla)
          let readyToShip = 0;
          try {
            const { count: shipmentsCount } = await supabase
              .from("meli_shipments")
              .select("*", { count: "exact", head: true })
              .eq("meli_account_id", account.id)
              .eq("status", "ready_to_ship");
            readyToShip = shipmentsCount || 0;
          } catch {
            // Tabla puede no existir
          }

          // Obtener conteo de publicaciones
          let totalItems = 0;
          try {
            const { count: itemsCount } = await supabase
              .from("meli_items")
              .select("*", { count: "exact", head: true })
              .eq("meli_account_id", account.id)
              .eq("status", "active");
            totalItems = itemsCount || 0;
          } catch {
            // Tabla puede no existir
          }

          // Obtener ventas de hoy
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          let todayOrders = 0;
          let todaySalesAmount = 0;
          try {
            const { data: todaySales } = await supabase
              .from("meli_orders")
              .select("total_amount")
              .eq("meli_account_id", account.id)
              .gte("date_created", today.toISOString());
            
            if (todaySales) {
              todayOrders = todaySales.length;
              todaySalesAmount = todaySales.reduce((sum, order) => sum + (order.total_amount || 0), 0);
            }
          } catch {
            // Tabla puede no existir
          }

          // Obtener conteo de reclamos
          let claimsCount = 0;
          try {
            const { count: claims } = await supabase
              .from("meli_claims")
              .select("*", { count: "exact", head: true })
              .eq("meli_account_id", account.id)
              .eq("status", "open");
            claimsCount = claims || 0;
          } catch {
            // Tabla puede no existir
          }

          // Construir objeto de reputación por defecto
          const defaultReputation: Reputation = {
            level_id: null,
            power_seller_status: null,
            transactions_total: 0,
            transactions_completed: 0,
            ratings_positive: 0,
            ratings_negative: 0,
            ratings_neutral: 0,
            delayed_handling_time: 0,
            claims: 0,
            cancellations: 0,
            immediate_payment: false,
          };

          return {
            account: account.meli_nickname || `Cuenta ${account.meli_user_id}`,
            meli_user_id: String(account.meli_user_id),
            unanswered_questions: unansweredQuestions || 0,
            pending_messages: pendingMessages,
            ready_to_ship: readyToShip,
            total_items: totalItems,
            today_orders: todayOrders,
            today_sales_amount: todaySalesAmount,
            claims_count: claimsCount,
            measurement_date: new Date().toISOString(),
            metrics_period: "Últimos 60 días",
            reputation: defaultReputation,
          };
        } catch (error) {
          console.error(`[meli-dashboard] Error procesando cuenta ${account.meli_user_id}:`, error);
          return {
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
              level_id: null,
              power_seller_status: null,
              transactions_total: 0,
              transactions_completed: 0,
              ratings_positive: 0,
              ratings_negative: 0,
              ratings_neutral: 0,
              delayed_handling_time: 0,
              claims: 0,
              cancellations: 0,
              immediate_payment: false,
            },
            error: error instanceof Error ? error.message : "Error desconocido",
          };
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
