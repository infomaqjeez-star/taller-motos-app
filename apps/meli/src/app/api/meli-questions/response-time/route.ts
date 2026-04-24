import { NextRequest, NextResponse } from "next/server";
import { getSupabase, getValidToken, type LinkedMeliAccount } from "@/lib/meli";

export const dynamic = "force-dynamic";

async function resolveSellerId(token: string, account: LinkedMeliAccount): Promise<string> {
  try {
    const response = await fetch("https://api.mercadolibre.com/users/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return String(account.meli_user_id);
    }

    const data = await response.json();
    return String(data.id ?? account.meli_user_id);
  } catch {
    return String(account.meli_user_id);
  }
}

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
    const supabase = getSupabase();
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
      .select("id, user_id, meli_user_id, meli_nickname, access_token_enc, refresh_token_enc, token_expiry_date, is_active")
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

          const sellerId = await resolveSellerId(token, account as LinkedMeliAccount);

          const response = await fetch(
            `https://api.mercadolibre.com/users/${sellerId}/questions/response_time`,
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
              sellerId,
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
              sellerId,
              total_minutes: 0,
              weekdays_working_hours_minutes: null,
              weekdays_extra_hours_minutes: null,
              weekend_minutes: null,
              error: `HTTP ${response.status}`,
            };
          }

          const data: MeliResponseTimeData = await response.json();
          console.log(`[response-time] Account ${account.meli_nickname} (${sellerId}) raw data:`, JSON.stringify(data));

          return {
            accountId: account.id,
            nickname: account.meli_nickname,
            sellerId,
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