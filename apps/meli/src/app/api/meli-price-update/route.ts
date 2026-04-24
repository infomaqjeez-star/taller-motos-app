import { NextRequest } from "next/server";
import { getSupabase, getValidToken, type LinkedMeliAccount } from "@/lib/meli";

export const dynamic = "force-dynamic";

const RATE_LIMIT_DELAY = 120;

type AdjustmentType =
  | "percentage"
  | "percentage_decrease"
  | "fixed_floor"
  | "fixed_ceiling"
  | "fixed_add"
  | "fixed_subtract";

type PriceResultStatus =
  | "updated"
  | "skipped"
  | "excluded"
  | "error"
  | "promo_blocked";

interface PriceResult {
  account: string;
  item_id: string;
  title: string;
  old_price: number;
  new_price: number;
  status: PriceResultStatus;
  reason?: string;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getAuthenticatedUserId(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);
  const supabase = getSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return null;
  }

  return user.id;
}

function normalizeAccountSelection(accountIds: unknown): string[] {
  if (!Array.isArray(accountIds)) {
    return [];
  }

  return accountIds
    .map((value) => String(value).trim())
    .filter(Boolean);
}

function calculateNewPrice(
  oldPrice: number,
  adjustmentType: AdjustmentType,
  adjustmentValue: number
): { shouldUpdate: boolean; newPrice: number; skipReason?: string } {
  let newPrice = oldPrice;

  switch (adjustmentType) {
    case "percentage":
      newPrice = oldPrice * (1 + adjustmentValue / 100);
      break;
    case "percentage_decrease":
      newPrice = oldPrice * (1 - adjustmentValue / 100);
      break;
    case "fixed_add":
      newPrice = oldPrice + adjustmentValue;
      break;
    case "fixed_subtract":
      newPrice = oldPrice - adjustmentValue;
      break;
    case "fixed_floor":
      if (oldPrice < adjustmentValue) {
        newPrice = adjustmentValue;
      } else {
        return {
          shouldUpdate: false,
          newPrice: oldPrice,
          skipReason: "Ya está por encima del piso",
        };
      }
      break;
    case "fixed_ceiling":
      if (oldPrice > adjustmentValue) {
        newPrice = adjustmentValue;
      } else {
        return {
          shouldUpdate: false,
          newPrice: oldPrice,
          skipReason: "Ya está por debajo del techo",
        };
      }
      break;
    default:
      return {
        shouldUpdate: false,
        newPrice: oldPrice,
        skipReason: "Tipo de ajuste desconocido",
      };
  }

  const roundedPrice = Math.max(1, Math.round(newPrice));

  if (roundedPrice === Math.round(oldPrice)) {
    return {
      shouldUpdate: false,
      newPrice: Math.round(oldPrice),
      skipReason: "El precio no cambia con este ajuste",
    };
  }

  return {
    shouldUpdate: true,
    newPrice: roundedPrice,
  };
}

function buildSseEvent(data: unknown) {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const keyword = String(body.keyword ?? "").trim();
    const excludeWords = String(body.exclude_words ?? "").trim();
    const adjustmentType = body.adjustment_type as AdjustmentType;
    const adjustmentValue = Number(body.adjustment_value);
    const dryRun = Boolean(body.dry_run);
    const selectedAccountIds = normalizeAccountSelection(body.account_ids);

    if (!keyword || !adjustmentType || Number.isNaN(adjustmentValue)) {
      return new Response(
        JSON.stringify({
          error: "Faltan campos requeridos: keyword, adjustment_type, adjustment_value",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const userId = await getAuthenticatedUserId(request);

    if (!userId) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = getSupabase();
    const { data: allAccounts, error: accountsError } = await supabase
      .from("linked_meli_accounts")
      .select(
        "id, user_id, meli_user_id, meli_nickname, access_token_enc, refresh_token_enc, token_expiry_date, is_active"
      )
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (accountsError || !allAccounts?.length) {
      return new Response(
        JSON.stringify({ error: "No hay cuentas activas", details: accountsError }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const accounts = (selectedAccountIds.length
      ? allAccounts.filter(
          (account) =>
            selectedAccountIds.includes(account.id) ||
            selectedAccountIds.includes(String(account.meli_user_id))
        )
      : allAccounts) as LinkedMeliAccount[];

    if (!accounts.length) {
      return new Response(JSON.stringify({ error: "No hay cuentas seleccionadas" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const excludedWordsList = excludeWords
      .split(",")
      .map((word) => word.trim().toLowerCase())
      .filter(Boolean);

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const send = (data: unknown) => {
          controller.enqueue(encoder.encode(buildSseEvent(data)));
        };

        const results: PriceResult[] = [];
        let totalScanned = 0;
        let updated = 0;
        let skipped = 0;
        let excluded = 0;
        let errors = 0;

        for (const account of accounts) {
          try {
            const token = await getValidToken(account);

            if (!token) {
              errors++;
              send({
                type: "error",
                account: account.meli_nickname,
                message: `Token inválido para ${account.meli_nickname}`,
              });
              continue;
            }

            send({
              type: "account_start",
              account: account.meli_nickname,
            });

            const searchResponse = await fetch(
              `https://api.mercadolibre.com/users/${account.meli_user_id}/items/search?q=${encodeURIComponent(
                keyword
              )}&status=active&limit=100`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
                signal: AbortSignal.timeout(15000),
              }
            );

            if (!searchResponse.ok) {
              const errorText = await searchResponse.text().catch(() => "");
              errors++;
              send({
                type: "error",
                account: account.meli_nickname,
                message: errorText || `HTTP ${searchResponse.status}`,
              });
              continue;
            }

            const searchData = await searchResponse.json();
            const itemIds: string[] = searchData.results || [];

            send({
              type: "account_total",
              account: account.meli_nickname,
              total: itemIds.length,
            });

            for (let index = 0; index < itemIds.length; index++) {
              const itemId = itemIds[index];
              totalScanned++;

              if (index > 0) {
                await delay(RATE_LIMIT_DELAY);
              }

              try {
                const itemResponse = await fetch(`https://api.mercadolibre.com/items/${itemId}`, {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                  signal: AbortSignal.timeout(10000),
                });

                if (!itemResponse.ok) {
                  errors++;
                  const reason = `HTTP ${itemResponse.status}`;
                  results.push({
                    account: account.meli_nickname,
                    item_id: itemId,
                    title: "Error al obtener item",
                    old_price: 0,
                    new_price: 0,
                    status: "error",
                    reason,
                  });
                  send({
                    type: "progress",
                    current: index + 1,
                    total: itemIds.length,
                    item_id: itemId,
                    title: "Error al obtener item",
                    status: "error",
                    account: account.meli_nickname,
                    reason,
                  });
                  continue;
                }

                const item = await itemResponse.json();
                const oldPrice = Number(item.price || 0);
                const title = String(item.title || itemId);
                const titleLower = title.toLowerCase();

                if (Array.isArray(item.deal_ids) && item.deal_ids.length > 0) {
                  skipped++;
                  results.push({
                    account: account.meli_nickname,
                    item_id: itemId,
                    title,
                    old_price: oldPrice,
                    new_price: oldPrice,
                    status: "promo_blocked",
                    reason: "Item en promoción",
                  });
                  send({
                    type: "progress",
                    current: index + 1,
                    total: itemIds.length,
                    item_id: itemId,
                    title,
                    status: "promo_blocked",
                    account: account.meli_nickname,
                    old_price: oldPrice,
                    new_price: oldPrice,
                    reason: "Item en promoción",
                  });
                  continue;
                }

                const excludedBy = excludedWordsList.find((word) => titleLower.includes(word));

                if (excludedBy) {
                  excluded++;
                  results.push({
                    account: account.meli_nickname,
                    item_id: itemId,
                    title,
                    old_price: oldPrice,
                    new_price: oldPrice,
                    status: "excluded",
                    reason: `Excluido por "${excludedBy}"`,
                  });
                  send({
                    type: "progress",
                    current: index + 1,
                    total: itemIds.length,
                    item_id: itemId,
                    title,
                    status: "excluded",
                    account: account.meli_nickname,
                    old_price: oldPrice,
                    new_price: oldPrice,
                    excluded_by: excludedBy,
                  });
                  continue;
                }

                const priceCalculation = calculateNewPrice(
                  oldPrice,
                  adjustmentType,
                  adjustmentValue
                );

                if (!priceCalculation.shouldUpdate) {
                  skipped++;
                  results.push({
                    account: account.meli_nickname,
                    item_id: itemId,
                    title,
                    old_price: oldPrice,
                    new_price: priceCalculation.newPrice,
                    status: "skipped",
                    reason: priceCalculation.skipReason,
                  });
                  send({
                    type: "progress",
                    current: index + 1,
                    total: itemIds.length,
                    item_id: itemId,
                    title,
                    status: "skipped",
                    account: account.meli_nickname,
                    old_price: oldPrice,
                    new_price: priceCalculation.newPrice,
                    reason: priceCalculation.skipReason,
                  });
                  continue;
                }

                if (dryRun) {
                  updated++;
                  results.push({
                    account: account.meli_nickname,
                    item_id: itemId,
                    title,
                    old_price: oldPrice,
                    new_price: priceCalculation.newPrice,
                    status: "updated",
                  });
                  send({
                    type: "progress",
                    current: index + 1,
                    total: itemIds.length,
                    item_id: itemId,
                    title,
                    status: "updated",
                    account: account.meli_nickname,
                    old_price: oldPrice,
                    new_price: priceCalculation.newPrice,
                  });
                  continue;
                }

                const updateResponse = await fetch(`https://api.mercadolibre.com/items/${itemId}`, {
                  method: "PUT",
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ price: priceCalculation.newPrice }),
                  signal: AbortSignal.timeout(10000),
                });

                if (!updateResponse.ok) {
                  const errorData = await updateResponse.json().catch(() => null);
                  const reason = errorData?.message || `HTTP ${updateResponse.status}`;
                  errors++;
                  results.push({
                    account: account.meli_nickname,
                    item_id: itemId,
                    title,
                    old_price: oldPrice,
                    new_price: oldPrice,
                    status: "error",
                    reason,
                  });
                  send({
                    type: "progress",
                    current: index + 1,
                    total: itemIds.length,
                    item_id: itemId,
                    title,
                    status: "error",
                    account: account.meli_nickname,
                    old_price: oldPrice,
                    new_price: oldPrice,
                    reason,
                  });
                  continue;
                }

                updated++;
                results.push({
                  account: account.meli_nickname,
                  item_id: itemId,
                  title,
                  old_price: oldPrice,
                  new_price: priceCalculation.newPrice,
                  status: "updated",
                });
                send({
                  type: "progress",
                  current: index + 1,
                  total: itemIds.length,
                  item_id: itemId,
                  title,
                  status: "updated",
                  account: account.meli_nickname,
                  old_price: oldPrice,
                  new_price: priceCalculation.newPrice,
                });
              } catch (error) {
                errors++;
                results.push({
                  account: account.meli_nickname,
                  item_id: itemId,
                  title: itemId,
                  old_price: 0,
                  new_price: 0,
                  status: "error",
                  reason: error instanceof Error ? error.message : "Error procesando item",
                });
              }
            }
          } catch (error) {
            errors++;
            send({
              type: "error",
              account: account.meli_nickname,
              message: error instanceof Error ? error.message : "Error procesando cuenta",
            });
          }
        }

        send({
          type: "done",
          results,
          summary: {
            total_items_scanned: totalScanned,
            cache_hits_skipped: 0,
            matched: results.length,
            updated,
            skipped,
            excluded,
            errors,
            stopped: false,
          },
          adjustment_type: adjustmentType,
          adjustment_value: adjustmentValue,
          dry_run: dryRun,
        });

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("[meli-price-update] Error:", error);
    return new Response(JSON.stringify({ error: "Error interno" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}