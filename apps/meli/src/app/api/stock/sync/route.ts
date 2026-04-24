import { NextRequest, NextResponse } from "next/server";
import { getSupabase, getValidToken, type LinkedMeliAccount } from "@/lib/meli";
import { extractItemSellerSku } from "@/lib/stock";

export const dynamic = "force-dynamic";

function buildAutomaticSku(nextNumber: number) {
  return `MAQ-${String(nextNumber).padStart(5, "0")}`;
}

async function getAuthenticatedUserId(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const supabase = getSupabase();
  const token = authHeader.slice(7);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return null;
  }

  return user.id;
}

async function getNextAutomaticSkuNumber() {
  const supabase = getSupabase();
  const { data: lastItem } = await supabase
    .from("stock_unificado")
    .select("sku")
    .like("sku", "MAQ-%")
    .order("sku", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!lastItem?.sku) {
    return 1;
  }

  const match = String(lastItem.sku).match(/MAQ-(\d+)/);
  return match ? Number(match[1]) + 1 : 1;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const userId = await getAuthenticatedUserId(request);

    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const selectedAccountIds = Array.isArray(body.account_ids)
      ? body.account_ids.map((value: unknown) => String(value).trim()).filter(Boolean)
      : [];

    let accountsQuery = supabase
      .from("linked_meli_accounts")
      .select(
        "id, user_id, meli_user_id, meli_nickname, access_token_enc, refresh_token_enc, token_expiry_date, is_active"
      )
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (selectedAccountIds.length > 0) {
      accountsQuery = accountsQuery.in("id", selectedAccountIds);
    }

    const { data: accounts, error: accountsError } = await accountsQuery;

    if (accountsError) {
      throw accountsError;
    }

    if (!accounts?.length) {
      return NextResponse.json({ error: "No hay cuentas activas para sincronizar" }, { status: 404 });
    }

    let nextNumber = await getNextAutomaticSkuNumber();
    const processed = [];

    for (const account of accounts as LinkedMeliAccount[]) {
      try {
        const token = await getValidToken(account);

        if (!token) {
          processed.push({
            account: account.meli_nickname,
            status: "error",
            error: "Token inválido",
          });
          continue;
        }

        const searchResponse = await fetch(
          `https://api.mercadolibre.com/users/${account.meli_user_id}/items/search?limit=100&status=active`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
            signal: AbortSignal.timeout(15000),
          }
        );

        if (!searchResponse.ok) {
          const errorText = await searchResponse.text().catch(() => "");
          processed.push({
            account: account.meli_nickname,
            status: "error",
            error: errorText || `HTTP ${searchResponse.status}`,
          });
          continue;
        }

        const searchData = await searchResponse.json();
        const itemIds: string[] = searchData.results || [];

        const accountItems = [];

        for (let index = 0; index < itemIds.length; index += 20) {
          const batch = itemIds.slice(index, index + 20);
          const itemsResponse = await fetch(
            `https://api.mercadolibre.com/items?ids=${batch.join(",")}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
              },
              signal: AbortSignal.timeout(15000),
            }
          );

          if (!itemsResponse.ok) {
            continue;
          }

          const itemsData = await itemsResponse.json();

          for (const item of itemsData) {
            if (item?.code === 200 && item?.body) {
              accountItems.push(item.body);
            }
          }
        }

        let updatedItems = 0;
        let createdItems = 0;

        for (const item of accountItems) {
          const sellerSku = extractItemSellerSku(item);

          const { data: existingByItemId } = await supabase
            .from("stock_unificado")
            .select("id, sku")
            .eq("item_id", item.id)
            .maybeSingle();

          if (existingByItemId) {
            const { error: updateError } = await supabase
              .from("stock_unificado")
              .update({
                nombre: item.title,
                precio: Number(item.price || 0),
                cantidad: Number(item.available_quantity || 0),
                cuenta_id: account.id,
                meli_sku: sellerSku,
                updated_at: new Date().toISOString(),
              })
              .eq("id", existingByItemId.id);

            if (!updateError) {
              updatedItems++;
            }

            continue;
          }

          const newSku = buildAutomaticSku(nextNumber++);
          const { error: insertError } = await supabase.from("stock_unificado").insert({
            sku: newSku,
            nombre: item.title,
            cantidad: Number(item.available_quantity || 0),
            precio: Number(item.price || 0),
            item_id: item.id,
            cuenta_id: account.id,
            meli_sku: sellerSku,
          });

          if (!insertError) {
            createdItems++;
          }
        }

        processed.push({
          account: account.meli_nickname,
          status: "ok",
          total_items: accountItems.length,
          updated_items: updatedItems,
          created_items: createdItems,
        });
      } catch (accountError) {
        processed.push({
          account: account.meli_nickname,
          status: "error",
          error: accountError instanceof Error ? accountError.message : "Error desconocido",
        });
      }
    }

    const totalProcessed = processed.reduce((sum, entry) => {
      if (entry.status !== "ok") {
        return sum;
      }

      return sum + Number(entry.updated_items || 0) + Number(entry.created_items || 0);
    }, 0);

    return NextResponse.json({
      success: true,
      procesados: totalProcessed,
      cuentas: processed,
    });
  } catch (error: any) {
    console.error("[stock/sync] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}