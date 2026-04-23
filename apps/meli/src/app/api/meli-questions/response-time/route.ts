import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getValidToken, type LinkedMeliAccount } from "@/lib/meli";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key"
);

interface ResponseTimePeriod {
  response_time?: number;
  sales_percent_increase?: number | null;
}

interface MeliResponseTimeData {
  user_id?: number;
  total?: ResponseTimePeriod;
  weekend?: ResponseTimePeriod;
  weekdays_working_hours?: ResponseTimePeriod;
  weekdays_extra_hours?: ResponseTimePeriod;
}

export interface AccountResponseTime {
  accountId: string;
  nickname: string;
  sellerId: string;
  total_minutes: number;
  weekdays_working_hours_minutes: number | null;
  weekdays_extra_hours_minutes: number | null;
  weekend_minutes: number | null;
  error?: string;
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    let userId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const {
        data: { user },
      } = await supabase.auth.getUser(authHeader.slice(7));

      if (user) {
        userId = user.id;
      }
    }

    if (!userId) {
      return NextResponse.json([], { status: 200 });
    }

    const { data: accounts } = await supabase
      .from("linked_meli_accounts")
      .select("id, meli_user_id, meli_nickname, access_token_enc, refresh_token_enc, token_expiry_date, is_active")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (!accounts?.length) {
      return NextResponse.json([]);
    }

    const results: AccountResponseTime[] = await Promise.all(
      accounts.map(async (account) => {
        try {
          const token = await getValidToken(account as LinkedMeliAccount);

          if (!token) {
            return {
              accountId: account.id,
              nickname: account.meli_nickname,
              sellerId: String(account.meli_user_id),
              total_minutes: 0,
              weekdays_working_hours_minutes: null,
              weekdays_extra_hours_minutes: null,
              weekend_minutes: null,
              error: "Token no disponible",
            };
          }

          const response = await fetch(
            `https://api.mercadolibre.com/users/${account.meli_user_id}/questions/response_time`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
              signal: AbortSignal.timeout(8000),
            }
          );

          if (response.status === 404) {
            return {
              accountId: account.id,
              nickname: account.meli_nickname,
              sellerId: String(account.meli_user_id),
              total_minutes: 0,
              weekdays_working_hours_minutes: null,
              weekdays_extra_hours_minutes: null,
              weekend_minutes: null,
            };
          }

          if (!response.ok) {
            return {
              accountId: account.id,
              nickname: account.meli_nickname,
              sellerId: String(account.meli_user_id),
              total_minutes: 0,
              weekdays_working_hours_minutes: null,
              weekdays_extra_hours_minutes: null,
              weekend_minutes: null,
              error: `HTTP ${response.status}`,
            };
          }

          const data: MeliResponseTimeData = await response.json();

          return {
            accountId: account.id,
            nickname: account.meli_nickname,
            sellerId: String(account.meli_user_id),
            total_minutes: data.total?.response_time ?? 0,
            weekdays_working_hours_minutes: data.weekdays_working_hours?.response_time ?? null,
            weekdays_extra_hours_minutes: data.weekdays_extra_hours?.response_time ?? null,
            weekend_minutes: data.weekend?.response_time ?? null,
          };
        } catch (error) {
          return {
            accountId: account.id,
            nickname: account.meli_nickname,
            sellerId: String(account.meli_user_id),
            total_minutes: 0,
            weekdays_working_hours_minutes: null,
            weekdays_extra_hours_minutes: null,
            weekend_minutes: null,
            error: error instanceof Error ? error.message : "Error desconocido",
          };
        }
      })
    );

    const response = NextResponse.json(results);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error("[response-time] Error fatal:", error);
    return NextResponse.json([]);
  }
}