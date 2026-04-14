import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getValidToken, type LinkedMeliAccount } from "@/lib/meli";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key"
);

/**
 * GET /api/meli-stats?periodo=hoy|semana|mes|anio|todo
 *
 * Estadísticas de ventas, preguntas, mensajes y publicaciones
 * obtenidas directamente desde la API de Mercado Libre.
 */
export async function GET(request: NextRequest) {
  try {
    // Auth
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.slice(7));
    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userId = user.id;
    const { searchParams } = new URL(request.url);
    const periodo = searchParams.get("periodo") || "mes";

    // Calcular fecha desde
    const now = new Date();
    let fechaDesde: Date;
    if (periodo === "hoy") {
      fechaDesde = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (periodo === "semana") {
      fechaDesde = new Date(now); fechaDesde.setDate(now.getDate() - 7);
    } else if (periodo === "mes") {
      fechaDesde = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (periodo === "anio") {
      fechaDesde = new Date(now.getFullYear(), 0, 1);
    } else {
      fechaDesde = new Date("2020-01-01");
    }

    // Obtener cuentas del usuario
    const { data: accounts } = await supabase
      .from("linked_meli_accounts")
      .select("id, user_id, meli_user_id, meli_nickname, access_token_enc, refresh_token_enc, token_expiry_date, is_active")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({
        accounts: [],
        totales: { ventas: 0, facturacion: 0, preguntas: 0, respondidas: 0, publicaciones: 0, mensajes: 0 },
        por_cuenta: [],
        ventas_por_dia: [],
      });
    }

    // Datos por cuenta (parallel)
    const porCuentaRaw = await Promise.all(
      accounts.map(async (account: any) => {
        const base = {
          id: account.id,
          meli_user_id: account.meli_user_id,
          nickname: account.meli_nickname,
          ventas: 0,
          facturacion: 0,
          preguntas: 0,
          respondidas: 0,
          publicaciones: 0,
          mensajes: 0,
          ordenes: [] as { date_created: string; total_amount: number }[],
        };

        try {
          // Usar getValidToken con auto-refresh
          const validToken = await getValidToken(account as LinkedMeliAccount);
          if (!validToken) {
            console.log(`[meli-stats] No se pudo obtener token para ${account.meli_nickname}`);
            return base;
          }

          const headers = { Authorization: `Bearer ${validToken}` };
          const meliId = String(account.meli_user_id);
          const desde = fechaDesde.toISOString();

          // Llamadas iniciales en paralelo
          const [ordRes, qRes, itemsRes, msgRes] = await Promise.allSettled([
            fetch(
              `https://api.mercadolibre.com/orders/search?seller=${meliId}&order.status=paid` +
              `&order.date_created.from=${desde}&sort=date_desc&limit=50`,
              { headers, signal: AbortSignal.timeout(7000) }
            ),
            fetch(
              `https://api.mercadolibre.com/questions/search?seller_id=${meliId}&limit=1`,
              { headers, signal: AbortSignal.timeout(5000) }
            ),
            fetch(
              `https://api.mercadolibre.com/users/${meliId}/items/search?status=active&limit=1`,
              { headers, signal: AbortSignal.timeout(5000) }
            ),
            fetch(
              "https://api.mercadolibre.com/messages/unread?role=seller&limit=1",
              { headers, signal: AbortSignal.timeout(5000) }
            ),
          ]);

          const safeJson = async (r: PromiseSettledResult<Response>) => {
            if (r.status === "fulfilled" && r.value.ok) {
              try { return await r.value.json(); } catch { return null; }
            }
            return null;
          };

          const [ordData, qData, itemsData, msgData] = await Promise.all(
            [ordRes, qRes, itemsRes, msgRes].map(safeJson)
          );

          // Órdenes — primera página
          let allOrders: any[] = ordData?.results || [];
          const totalOrd: number = ordData?.paging?.total ?? allOrders.length;

          // Paginar hasta cap 500 (10 páginas de 50)
          if (totalOrd > 50) {
            const totalPages = Math.min(Math.ceil(totalOrd / 50), 10);
            const pageResults = await Promise.allSettled(
              Array.from({ length: totalPages - 1 }, (_, i) =>
                fetch(
                  `https://api.mercadolibre.com/orders/search?seller=${meliId}&order.status=paid` +
                  `&order.date_created.from=${desde}&sort=date_desc&limit=50&offset=${(i + 1) * 50}`,
                  { headers, signal: AbortSignal.timeout(7000) }
                ).then(r => r.ok ? r.json() : null).catch(() => null)
              )
            );
            for (const pr of pageResults) {
              if (pr.status === "fulfilled" && pr.value?.results) {
                allOrders = allOrders.concat(pr.value.results);
              }
            }
          }

          const facturacion = allOrders.reduce((s: number, o: any) => s + (o.total_amount || 0), 0);

          return {
            ...base,
            ventas:       allOrders.length,
            facturacion,
            preguntas:    qData?.total ?? 0,
            respondidas:  0, // MeLi no da respondidas fácilmente
            publicaciones: itemsData?.paging?.total ?? 0,
            mensajes:     msgData?.total ?? 0,
            ordenes:      allOrders.map((o: any) => ({
              date_created: o.date_created || "",
              total_amount: o.total_amount || 0,
            })),
          };
        } catch {
          return base;
        }
      })
    );

    // Totales generales
    const totales = {
      ventas:        porCuentaRaw.reduce((s, c) => s + c.ventas, 0),
      facturacion:   porCuentaRaw.reduce((s, c) => s + c.facturacion, 0),
      preguntas:     porCuentaRaw.reduce((s, c) => s + c.preguntas, 0),
      respondidas:   porCuentaRaw.reduce((s, c) => s + c.respondidas, 0),
      publicaciones: porCuentaRaw.reduce((s, c) => s + c.publicaciones, 0),
      mensajes:      porCuentaRaw.reduce((s, c) => s + c.mensajes, 0),
    };

    // Ventas por día (todas las cuentas combinadas)
    const ventasPorDia: Record<string, number> = {};
    for (const cuenta of porCuentaRaw) {
      for (const o of cuenta.ordenes) {
        const dia = o.date_created?.slice(0, 10);
        if (dia) ventasPorDia[dia] = (ventasPorDia[dia] || 0) + o.total_amount;
      }
    }
    const ventas_por_dia = Object.entries(ventasPorDia)
      .map(([dia, total]) => ({ dia, total }))
      .sort((a, b) => a.dia.localeCompare(b.dia));

    // Por cuenta (sin el campo ordenes — no necesario en respuesta)
    const por_cuenta = porCuentaRaw.map(({ ordenes: _o, ...rest }) => rest);

    return NextResponse.json({
      accounts: accounts.map((a: any) => ({
        id: a.id,
        meli_user_id: a.meli_user_id,
        meli_nickname: a.meli_nickname,
      })),
      totales,
      por_cuenta,
      ventas_por_dia,
    });
  } catch (err) {
    console.error("[meli-stats] Error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
