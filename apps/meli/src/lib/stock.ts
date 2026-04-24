import { SupabaseClient } from "@supabase/supabase-js";
import { getValidToken, type LinkedMeliAccount } from "@/lib/meli";

export interface UnifiedStockRow {
  id: string;
  sku: string;
  nombre: string;
  cantidad: number;
  precio: number;
  item_id?: string | null;
  cuenta_id?: string | null;
  meli_sku?: string | null;
  created_at?: string;
  updated_at?: string;
}

function normalizeSkuValue(raw: unknown): string | null {
  const value = String(raw ?? "").trim();
  return value.length > 0 ? value : null;
}

function buildSellerSkuAttribute(customSku: string) {
  return [
    {
      id: "SELLER_SKU",
      values: [
        {
          id: null,
          name: customSku,
        },
      ],
    },
  ];
}

export function extractItemSellerSku(itemData: any, variationId?: number | null): string | null {
  const normalizedVariationId =
    variationId === null || variationId === undefined ? null : Number(variationId);

  const directSku =
    normalizeSkuValue(itemData?.seller_sku) ||
    normalizeSkuValue(itemData?.seller_custom_field) ||
    normalizeSkuValue(
      itemData?.attributes?.find((attribute: any) => attribute?.id === "SELLER_SKU")?.value_name
    ) ||
    normalizeSkuValue(
      itemData?.attributes?.find((attribute: any) => attribute?.id === "SELLER_SKU")?.values?.[0]?.name
    );

  if (normalizedVariationId == null) {
    return directSku;
  }

  const variation = Array.isArray(itemData?.variations)
    ? itemData.variations.find((entry: any) => Number(entry?.id) === normalizedVariationId)
    : null;

  const variationSku =
    normalizeSkuValue(variation?.seller_sku) ||
    normalizeSkuValue(variation?.seller_custom_field) ||
    normalizeSkuValue(
      variation?.attributes?.find((attribute: any) => attribute?.id === "SELLER_SKU")?.value_name
    ) ||
    normalizeSkuValue(
      variation?.attributes?.find((attribute: any) => attribute?.id === "SELLER_SKU")?.values?.[0]?.name
    );

  return variationSku || directSku;
}

export async function findLinkedAccount(
  supabase: SupabaseClient,
  cuentaId: string,
  userId?: string | null
): Promise<LinkedMeliAccount | null> {
  let query = supabase
    .from("linked_meli_accounts")
    .select(
      "id, user_id, meli_user_id, meli_nickname, access_token_enc, refresh_token_enc, token_expiry_date, is_active"
    )
    .eq("id", cuentaId)
    .eq("is_active", true);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query.single();

  if (error || !data) {
    return null;
  }

  return data as LinkedMeliAccount;
}

async function fetchMeliItemData(account: LinkedMeliAccount, itemId: string) {
  const token = await getValidToken(account);

  if (!token) {
    throw new Error("Token inválido para Mercado Libre");
  }

  const itemResponse = await fetch(`https://api.mercadolibre.com/items/${itemId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!itemResponse.ok) {
    throw new Error(`No se pudo leer la publicación en MeLi (${itemResponse.status})`);
  }

  const itemData = await itemResponse.json();

  return {
    token,
    itemData,
  };
}

export async function updateMeliStockQuantity(
  account: LinkedMeliAccount,
  itemId: string,
  newQuantity: number
): Promise<void> {
  const { token, itemData } = await fetchMeliItemData(account, itemId);
  let body: Record<string, unknown>;

  if (Array.isArray(itemData.variations) && itemData.variations.length > 1) {
    throw new Error(
      "La publicación tiene múltiples variaciones; ajustá el stock desde Mercado Libre o separá el SKU por variación."
    );
  }

  if (Array.isArray(itemData.variations) && itemData.variations.length === 1) {
    body = {
      variations: [
        {
          id: itemData.variations[0].id,
          available_quantity: newQuantity,
        },
      ],
    };
  } else {
    body = {
      available_quantity: newQuantity,
    };
  }

  const updateResponse = await fetch(`https://api.mercadolibre.com/items/${itemId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(12000),
  });

  if (!updateResponse.ok) {
    const errorText = await updateResponse.text().catch(() => "");
    throw new Error(errorText || `No se pudo actualizar stock en MeLi (${updateResponse.status})`);
  }
}

export async function updateMeliCustomSku(
  account: LinkedMeliAccount,
  itemId: string,
  customSku: string
): Promise<void> {
  const normalizedSku = normalizeSkuValue(customSku);

  if (!normalizedSku) {
    throw new Error("El SKU personalizado no puede estar vacío");
  }

  const { token, itemData } = await fetchMeliItemData(account, itemId);

  const attempts: Record<string, unknown>[] = [];

  if (Array.isArray(itemData.variations) && itemData.variations.length > 1) {
    throw new Error(
      "La publicación tiene múltiples variaciones; asigná el SKU manualmente por variación desde Mercado Libre."
    );
  }

  if (Array.isArray(itemData.variations) && itemData.variations.length === 1) {
    attempts.push({
      variations: [
        {
          id: itemData.variations[0].id,
          seller_custom_field: normalizedSku,
          attributes: buildSellerSkuAttribute(normalizedSku),
        },
      ],
    });
    attempts.push({
      variations: [
        {
          id: itemData.variations[0].id,
          seller_custom_field: normalizedSku,
        },
      ],
    });
  } else {
    attempts.push({
      seller_custom_field: normalizedSku,
      attributes: buildSellerSkuAttribute(normalizedSku),
    });
    attempts.push({
      seller_custom_field: normalizedSku,
    });
  }

  let lastError = "No se pudo actualizar el SKU en Mercado Libre";

  for (const attempt of attempts) {
    const response = await fetch(`https://api.mercadolibre.com/items/${itemId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(attempt),
      signal: AbortSignal.timeout(12000),
    });

    if (response.ok) {
      return;
    }

    lastError = await response.text().catch(() => `HTTP ${response.status}`);
  }

  throw new Error(lastError);
}

export async function setUnifiedQuantityForRows(params: {
  supabase: SupabaseClient;
  rows: UnifiedStockRow[];
  newQuantity: number;
  userId?: string | null;
}) {
  const { supabase, rows, newQuantity, userId } = params;

  if (!rows.length) {
    return { updatedRows: 0, newQuantity };
  }

  for (const row of rows) {
    if (!row.item_id || !row.cuenta_id) {
      continue;
    }

    const linkedAccount = await findLinkedAccount(supabase, String(row.cuenta_id), userId);

    if (!linkedAccount) {
      throw new Error(`No se encontró la cuenta vinculada para sincronizar ${row.item_id}`);
    }

    await updateMeliStockQuantity(linkedAccount, String(row.item_id), newQuantity);
  }

  const rowIds = rows.map((row) => row.id);
  const { error } = await supabase
    .from("stock_unificado")
    .update({
      cantidad: newQuantity,
      updated_at: new Date().toISOString(),
    })
    .in("id", rowIds);

  if (error) {
    throw error;
  }

  return { updatedRows: rowIds.length, newQuantity };
}

export async function adjustUnifiedStockByIdentifier(params: {
  supabase: SupabaseClient;
  identifier: string;
  quantityDelta: number;
  userId?: string | null;
  matchBy?: "sku" | "meli_sku" | "either";
}) {
  const { supabase, identifier, quantityDelta, userId, matchBy = "either" } = params;
  const normalizedIdentifier = normalizeSkuValue(identifier);

  if (!normalizedIdentifier) {
    return {
      identifier: null,
      matchedRows: 0,
      updatedRows: 0,
      newQuantity: null,
    };
  }

  let query = supabase.from("stock_unificado").select("*");

  if (matchBy === "sku") {
    query = query.eq("sku", normalizedIdentifier);
  } else if (matchBy === "meli_sku") {
    query = query.eq("meli_sku", normalizedIdentifier);
  } else {
    query = query.or(`sku.eq.${normalizedIdentifier},meli_sku.eq.${normalizedIdentifier}`);
  }

  const { data, error } = await query.order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as UnifiedStockRow[];

  if (!rows.length) {
    return {
      identifier: normalizedIdentifier,
      matchedRows: 0,
      updatedRows: 0,
      newQuantity: null,
    };
  }

  const baseQuantity = rows.reduce((lowest, row) => {
    const quantity = Number(row.cantidad ?? 0);
    return Number.isFinite(quantity) ? Math.min(lowest, quantity) : lowest;
  }, Number(rows[0]?.cantidad ?? 0));

  const newQuantity = Math.max(0, baseQuantity + quantityDelta);
  const result = await setUnifiedQuantityForRows({
    supabase,
    rows,
    newQuantity,
    userId,
  });

  return {
    identifier: normalizedIdentifier,
    matchedRows: rows.length,
    updatedRows: result.updatedRows,
    newQuantity,
  };
}