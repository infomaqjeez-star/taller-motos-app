import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// Rate limiting: 500 requests por minuto por cuenta
const RATE_LIMIT_DELAY = 120; // ms entre requests (aprox 500 por minuto)

/**
 * POST /api/meli-price-update
 * 
 * Actualiza precios masivamente basado en palabra clave.
 * Soporta SSE (Server-Sent Events) para progreso en tiempo real.
 * Procesa múltiples cuentas secuencialmente.
 */
export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return new Response(
        JSON.stringify({ error: "Supabase no configurado" }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

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

    if (!keyword || !adjustment_type || adjustment_value === undefined) {
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
      .select("id, meli_user_id, meli_nickname, access_token_enc, access_token, refresh_token, token_expires_at")
      .eq("user_id", userId)
      .eq("is_active", true);
    
    console.log("[meli-price-update] account_ids recibidos:", account_ids);
    console.log("[meli-price-update] userId:", userId);
    
    if (account_ids.length > 0) {
      // Filtrar por meli_user_id o id
      query = query.or(`meli_user_id.in.(${account_ids.join(',')}),id.in.(${account_ids.join(',')})`);
    }
    
    const { data: accounts, error: accountsError } = await query;

    console.log("[meli-price-update] Cuentas encontradas:", accounts?.length || 0);
    console.log("[meli-price-update] Error:", accountsError);

    if (accountsError || !accounts || accounts.length === 0) {
      return new Response(
        JSON.stringify({ error: "No hay cuentas activas", details: accountsError }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Configurar SSE
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: any) => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          } catch (e) {
            console.error("[meli-price-update] Error enviando SSE:", e);
          }
        };

        const results: any[] = [];
        let totalScanned = 0;
        let updated = 0;
        let skipped = 0;
        let excluded = 0;
        let errors = 0;

        // Procesar cada cuenta
        for (const account of accounts) {
          // Obtener token válido (puede ser access_token o access_token_enc)
          const token = account.access_token || account.access_token_enc;
          
          console.log(`[meli-price-update] Procesando cuenta ${account.meli_nickname}, token válido:`, !!token);
          
          if (!token?.startsWith('APP_USR')) {
            console.log(`[meli-price-update] Saltando cuenta ${account.meli_nickname}: token inválido`);
            errors++;
            continue;
          }

          // Notificar inicio de cuenta
          send({
            type: "account_start",
            account: account.meli_nickname
          });

          try {
            // Buscar items por palabra clave
            const searchUrl = `https://api.mercadolibre.com/users/${account.meli_user_id}/items/search?q=${encodeURIComponent(keyword)}&status=active&limit=100`;
            console.log(`[meli-price-update] Buscando: ${searchUrl}`);
            
            const searchRes = await fetch(
              searchUrl,
              {
                headers: { Authorization: `Bearer ${token}` },
                signal: AbortSignal.timeout(15000),
              }
            );

            console.log(`[meli-price-update] Respuesta búsqueda para ${account.meli_nickname}:`, searchRes.status);

            if (!searchRes.ok) {
              const errorText = await searchRes.text().catch(() => "No error text");
              console.error(`[meli-price-update] Error buscando items para ${account.meli_nickname}:`, searchRes.status, errorText);
              errors++;
              send({
                type: "progress",
                current: 0,
                total: 0,
                item_id: "",
                title: `Error en búsqueda: ${errorText}`,
                status: "error",
                account: account.meli_nickname,
                reason: `HTTP ${searchRes.status}`
              });
              continue;
            }

            const searchData = await searchRes.json();
            const itemIds = searchData.results || [];

            // Notificar total de items
            send({
              type: "account_total",
              account: account.meli_nickname,
              total: itemIds.length
            });

            // Procesar cada item con delay para rate limiting
            for (let i = 0; i < itemIds.length; i++) {
              const itemId = itemIds[i];
              totalScanned++;

              try {
                // Delay para rate limiting
                if (i > 0) {
                  await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
                }

                // Obtener detalles del item
                const itemRes = await fetch(
                  `https://api.mercadolibre.com/items/${itemId}`,
                  {
                    headers: { Authorization: `Bearer ${token}` },
                    signal: AbortSignal.timeout(10000),
                  }
                );

                if (!itemRes.ok) {
                  errors++;
                  send({
                    type: "progress",
                    current: i + 1,
                    total: itemIds.length,
                    item_id: itemId,
                    title: "Error al obtener item",
                    status: "error",
                    account: account.meli_nickname,
                    reason: `HTTP ${itemRes.status}`
                  });
                  continue;
                }

                const item = await itemRes.json();

                // Verificar si está en promoción
                if (item.deal_ids && item.deal_ids.length > 0) {
                  skipped++;
                  send({
                    type: "progress",
                    current: i + 1,
                    total: itemIds.length,
                    item_id: itemId,
                    title: item.title,
                    status: "promo_blocked",
                    account: account.meli_nickname,
                    old_price: item.price,
                    new_price: item.price,
                    reason: "Item en promoción"
                  });
                  continue;
                }

                // Verificar palabras excluidas
                if (exclude_words) {
                  const excludeList = exclude_words.split(',').map((w: string) => w.trim().toLowerCase()).filter(Boolean);
                  if (excludeList.length > 0) {
                    const titleLower = item.title.toLowerCase();
                    const hasExcludedWord = excludeList.some((word: string) => titleLower.includes(word));
                    if (hasExcludedWord) {
                      excluded++;
                      send({
                        type: "progress",
                        current: i + 1,
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
                }

                // Calcular nuevo precio
                const oldPrice = item.price;
                let newPrice = oldPrice;
                let shouldUpdate = true;
                let skipReason = "";

                switch (adjustment_type) {
                  case "percentage":
                    newPrice = oldPrice * (1 + adjustment_value / 100);
                    break;
                  case "percentage_decrease":
                    newPrice = oldPrice * (1 - adjustment_value / 100);
                    break;
                  case "fixed_add":
                    newPrice = oldPrice + adjustment_value;
                    break;
                  case "fixed_subtract":
                    newPrice = oldPrice - adjustment_value;
                    break;
                  case "fixed_floor":
                    if (oldPrice < adjustment_value) {
                      newPrice = adjustment_value;
                    } else {
                      shouldUpdate = false;
                      skipReason = "Ya está por encima del piso";
                    }
                    break;
                  case "fixed_ceiling":
                    if (oldPrice > adjustment_value) {
                      newPrice = adjustment_value;
                    } else {
                      shouldUpdate = false;
                      skipReason = "Ya está por debajo del techo";
                    }
                    break;
                  default:
                    shouldUpdate = false;
                    skipReason = "Tipo de ajuste desconocido";
                }

                if (!shouldUpdate) {
                  skipped++;
                  send({
                    type: "progress",
                    current: i + 1,
                    total: itemIds.length,
                    item_id: itemId,
                    title: item.title,
                    status: "skipped",
                    account: account.meli_nickname,
                    old_price: oldPrice,
                    new_price: oldPrice,
                    reason: skipReason
                  });
                  continue;
                }

                newPrice = Math.round(newPrice);

                // Si es dry_run, solo simular
                if (dry_run) {
                  updated++;
                  send({
                    type: "progress",
                    current: i + 1,
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
                      Authorization: `Bearer ${token}`,
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ price: newPrice }),
                    signal: AbortSignal.timeout(10000),
                  }
                );

                if (updateRes.ok) {
                  updated++;
                  results.push({
                    account: account.meli_nickname,
                    item_id: itemId,
                    title: item.title,
                    old_price: oldPrice,
                    new_price: newPrice,
                    status: "updated"
                  });
                  
                  send({
                    type: "progress",
                    current: i + 1,
                    total: itemIds.length,
                    item_id: itemId,
                    title: item.title,
                    status: "updated",
                    account: account.meli_nickname,
                    old_price: oldPrice,
                    new_price: newPrice
                  });
                } else {
                  const errorData = await updateRes.json().catch(() => ({}));
                  errors++;
                  results.push({
                    account: account.meli_nickname,
                    item_id: itemId,
                    title: item.title,
                    old_price: oldPrice,
                    new_price: oldPrice,
                    status: "error",
                    reason: errorData.message || `HTTP ${updateRes.status}`
                  });
                  
                  send({
                    type: "progress",
                    current: i + 1,
                    total: itemIds.length,
                    item_id: itemId,
                    title: item.title,
                    status: "error",
                    account: account.meli_nickname,
                    reason: errorData.message || `HTTP ${updateRes.status}`
                  });
                }

              } catch (e) {
                errors++;
                console.error(`[meli-price-update] Error procesando item ${itemId}:`, e);
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
