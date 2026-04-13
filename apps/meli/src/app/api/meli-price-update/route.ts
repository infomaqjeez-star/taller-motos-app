import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

/**
 * POST /api/meli-price-update
 * 
 * Actualiza precios masivamente basado en palabra clave.
 * Soporta SSE (Server-Sent Events) para progreso en tiempo real.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      keyword, 
      exclude_words, 
      adjustment_type, 
      adjustment_value, 
      dry_run = false,
      clear_cache = false,
      account_ids = []
    } = body;

    if (!keyword || !adjustment_type || !adjustment_value) {
      return new Response(
        JSON.stringify({ error: "Faltan campos requeridos: keyword, adjustment_type, adjustment_value" }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Auth
    const authHeader = request.headers.get("authorization");
    let userId: string | null = null;
    if (authHeader?.startsWith("Bearer ")) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.slice(7));
      if (user) userId = user.id;
    }
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "No autorizado" }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Obtener cuentas
    let query = supabase
      .from("linked_meli_accounts")
      .select("id, meli_user_id, meli_nickname, access_token_enc")
      .eq("user_id", userId)
      .eq("is_active", true);
    
    if (account_ids.length > 0) {
      query = query.in("id", account_ids);
    }
    
    const { data: accounts } = await query;

    if (!accounts || accounts.length === 0) {
      return new Response(
        JSON.stringify({ error: "No hay cuentas activas" }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Configurar SSE
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        const results: any[] = [];
        let totalScanned = 0;
        let updated = 0;
        let skipped = 0;
        let excluded = 0;
        let errors = 0;

        // Procesar cada cuenta
        for (const account of accounts) {
          if (!account.access_token_enc?.startsWith('APP_USR')) {
            continue;
          }

          try {
            // Buscar items por palabra clave
            const searchRes = await fetch(
              `https://api.mercadolibre.com/users/${account.meli_user_id}/items/search?q=${encodeURIComponent(keyword)}&status=active&limit=100`,
              {
                headers: { Authorization: `Bearer ${account.access_token_enc}` },
                signal: AbortSignal.timeout(15000),
              }
            );

            if (!searchRes.ok) continue;

            const searchData = await searchRes.json();
            const itemIds = searchData.results || [];

            // Procesar cada item
            for (const itemId of itemIds) {
              totalScanned++;

              try {
                // Obtener detalles del item
                const itemRes = await fetch(
                  `https://api.mercadolibre.com/items/${itemId}`,
                  {
                    headers: { Authorization: `Bearer ${account.access_token_enc}` },
                    signal: AbortSignal.timeout(10000),
                  }
                );

                if (!itemRes.ok) {
                  errors++;
                  continue;
                }

                const item = await itemRes.json();

                // Verificar palabras excluidas
                if (exclude_words) {
                  const excludeList = exclude_words.split(',').map((w: string) => w.trim().toLowerCase());
                  const titleLower = item.title.toLowerCase();
                  const hasExcludedWord = excludeList.some((word: string) => titleLower.includes(word));
                  if (hasExcludedWord) {
                    excluded++;
                    send({
                      type: "progress",
                      current: totalScanned,
                      total: itemIds.length,
                      item_id: itemId,
                      title: item.title,
                      status: "excluded",
                      account: account.meli_nickname,
                      excluded_by: excludeList.find((word: string) => titleLower.includes(word))
                    });
                    continue;
                  }
                }

                // Calcular nuevo precio
                const oldPrice = item.price;
                let newPrice = oldPrice;

                if (adjustment_type === "percentage") {
                  newPrice = oldPrice * (1 + adjustment_value / 100);
                } else if (adjustment_type === "fixed_add") {
                  newPrice = oldPrice + adjustment_value;
                } else if (adjustment_type === "fixed_floor") {
                  // Solo sube si está por debajo
                  if (oldPrice < adjustment_value) {
                    newPrice = adjustment_value;
                  } else {
                    skipped++;
                    send({
                      type: "progress",
                      current: totalScanned,
                      total: itemIds.length,
                      item_id: itemId,
                      title: item.title,
                      status: "skipped",
                      account: account.meli_nickname,
                      old_price: oldPrice,
                      new_price: oldPrice
                    });
                    continue;
                  }
                }

                newPrice = Math.round(newPrice);

                // Si es dry_run, solo simular
                if (dry_run) {
                  updated++;
                  send({
                    type: "progress",
                    current: totalScanned,
                    total: itemIds.length,
                    item_id: itemId,
                    title: item.title,
                    status: "updated",
                    account: account.meli_nickname,
                    old_price: oldPrice,
                    new_price: newPrice
                  });
                  continue;
                }

                // Actualizar precio en MeLi
                const updateRes = await fetch(
                  `https://api.mercadolibre.com/items/${itemId}`,
                  {
                    method: "PUT",
                    headers: {
                      Authorization: `Bearer ${account.access_token_enc}`,
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ price: newPrice }),
                    signal: AbortSignal.timeout(10000),
                  }
                );

                if (updateRes.ok) {
                  updated++;
                  send({
                    type: "progress",
                    current: totalScanned,
                    total: itemIds.length,
                    item_id: itemId,
                    title: item.title,
                    status: "updated",
                    account: account.meli_nickname,
                    old_price: oldPrice,
                    new_price: newPrice
                  });
                } else {
                  errors++;
                  send({
                    type: "progress",
                    current: totalScanned,
                    total: itemIds.length,
                    item_id: itemId,
                    title: item.title,
                    status: "error",
                    account: account.meli_nickname
                  });
                }

              } catch (e) {
                errors++;
              }
            }

          } catch (e) {
            console.error(`[meli-price-update] Error cuenta ${account.meli_nickname}:`, e);
          }
        }

        // Enviar resumen final
        send({
          type: "done",
          results,
          summary: {
            total_items_scanned: totalScanned,
            cache_hits_skipped: 0,
            matched: totalScanned,
            updated,
            skipped,
            excluded,
            errors,
            stopped: false
          },
          adjustment_type,
          adjustment_value,
          dry_run
        });

        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (e) {
    console.error("[meli-price-update] Error:", e);
    return new Response(
      JSON.stringify({ error: "Error interno" }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
