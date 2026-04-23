import { NextResponse } from "next/server";
import { getActiveAccounts, getValidToken, meliGet } from "@/lib/meli";

export const dynamic = "force-dynamic";

/**
 * GET /api/meli-questions/response-time
 * 
 * Devuelve el tiempo de respuesta de preguntas para cada cuenta activa.
 * Usa: GET /users/{USER_ID}/questions/response_time
 */
export async function GET() {
  try {
    const accounts = await getActiveAccounts();
    const results: any[] = [];

    for (const acc of accounts) {
      try {
        const token = await getValidToken(acc);
        if (!token) {
          results.push({
            account: acc.nickname,
            meli_user_id: String(acc.meli_user_id),
            error: "Token no disponible",
          });
          continue;
        }

        const data = await meliGet(
          `/users/${acc.meli_user_id}/questions/response_time`,
          token
        ) as {
          user_id?: number;
          total?: { response_time?: number };
          weekend?: { response_time?: number; sales_percent_increase?: number | null };
          weekdays_working_hours?: { response_time?: number; sales_percent_increase?: number | null };
          weekdays_extra_hours?: { response_time?: number; sales_percent_increase?: number | null };
        } | null;

        if (!data) {
          results.push({
            account: acc.nickname,
            meli_user_id: String(acc.meli_user_id),
            total_minutes: null,
            weekdays_working: null,
            weekdays_extra: null,
            weekend: null,
            status: "no_data",
          });
          continue;
        }

        results.push({
          account: acc.nickname,
          meli_user_id: String(acc.meli_user_id),
          total_minutes: data.total?.response_time ?? null,
          weekdays_working: {
            minutes: data.weekdays_working_hours?.response_time ?? null,
            sales_increase: data.weekdays_working_hours?.sales_percent_increase ?? null,
          },
          weekdays_extra: {
            minutes: data.weekdays_extra_hours?.response_time ?? null,
            sales_increase: data.weekdays_extra_hours?.sales_percent_increase ?? null,
          },
          weekend: {
            minutes: data.weekend?.response_time ?? null,
            sales_increase: data.weekend?.sales_percent_increase ?? null,
          },
          status: "ok",
        });
      } catch (err) {
        results.push({
          account: acc.nickname,
          meli_user_id: String(acc.meli_user_id),
          error: (err as Error).message,
        });
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("[response-time] Error:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
