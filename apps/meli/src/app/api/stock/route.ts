import { NextRequest, NextResponse } from "next/server";
import { getSupabase, getValidToken, type LinkedMeliAccount } from "@/lib/meli";

export const dynamic = "force-dynamic";

type StockRow = {
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
};

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

async function findLinkedAccount(cuentaId: string, userId?: string | null) {
  const supabase = getSupabase();
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

async function updateMeliStock(
  account: LinkedMeliAccount,
  itemId: string,
  newQuantity: number
): Promise<void> {
  const token = await getValidToken(account);

  if (!token) {
    throw new Error("Token inválido para sincronizar stock con Mercado Libre");
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
  let body: Record<string, unknown>;

  if (Array.isArray(itemData.variations) && itemData.variations.length > 1) {
    throw new Error(
      "La publicación tiene múltiples variaciones; ajustá el stock desde Mercado Libre o una vista por variación."
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

export async function GET() {
  try {
    const supabase = getSupabase();
    const { data: stock, error } = await supabase
      .from("stock_unificado")
      .select("*")
      .order("sku", { ascending: true });

    if (error) {
      console.error("[stock] Error obteniendo stock:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ stock: stock || [] });
  } catch (error: any) {
    console.error("[stock] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await request.json();
    const { sku, nombre, cantidad, precio, item_id, cuenta_id, meli_sku } = body;

    if (!sku || !nombre) {
      return NextResponse.json({ error: "SKU y nombre son requeridos" }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from("stock_unificado")
      .select("id, cantidad")
      .eq("sku", sku)
      .single();

    let result;

    if (existing) {
      const { data, error } = await supabase
        .from("stock_unificado")
        .update({
          nombre,
          cantidad: cantidad ?? existing.cantidad,
          precio,
          item_id,
          cuenta_id,
          meli_sku,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabase
        .from("stock_unificado")
        .insert({
          sku,
          nombre,
          cantidad: cantidad || 0,
          precio,
          item_id,
          cuenta_id,
          meli_sku,
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return NextResponse.json({ success: true, item: result });
  } catch (error: any) {
    console.error("[stock] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const userId = await getAuthenticatedUserId(request);
    const body = await request.json();

    const targetId = body.id ? String(body.id) : null;
    const targetSku = body.sku ? String(body.sku) : null;

    if (!targetId && !targetSku) {
      return NextResponse.json({ error: "ID o SKU es requerido" }, { status: 400 });
    }

    let query = supabase.from("stock_unificado").select("*");

    if (targetId) {
      query = query.eq("id", targetId);
    } else {
      query = query.eq("sku", targetSku);
    }

    const { data: row, error: rowError } = await query.single();

    if (rowError || !row) {
      return NextResponse.json({ error: "Item no encontrado" }, { status: 404 });
    }

    const currentRow = row as StockRow;
    let newQuantity = Number(currentRow.cantidad || 0);

    if (body.cantidad_vendida !== undefined) {
      newQuantity = Math.max(0, newQuantity - Number(body.cantidad_vendida || 0));
    } else if (body.cantidad_delta !== undefined) {
      newQuantity = Math.max(0, newQuantity + Number(body.cantidad_delta || 0));
    } else if (body.cantidad !== undefined) {
      newQuantity = Math.max(0, Number(body.cantidad || 0));
    }

    if (currentRow.item_id && currentRow.cuenta_id && newQuantity !== Number(currentRow.cantidad || 0)) {
      const linkedAccount = await findLinkedAccount(String(currentRow.cuenta_id), userId);

      if (!linkedAccount) {
        return NextResponse.json(
          { error: "No se encontró la cuenta vinculada para sincronizar stock" },
          { status: 404 }
        );
      }

      await updateMeliStock(linkedAccount, String(currentRow.item_id), newQuantity);
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.nombre !== undefined) updatePayload.nombre = body.nombre;
    if (body.precio !== undefined) updatePayload.precio = Number(body.precio || 0);
    if (body.item_id !== undefined) updatePayload.item_id = body.item_id;
    if (body.cuenta_id !== undefined) updatePayload.cuenta_id = body.cuenta_id;
    if (body.meli_sku !== undefined) updatePayload.meli_sku = body.meli_sku;
    if (body.sku !== undefined) updatePayload.sku = body.sku;
    updatePayload.cantidad = newQuantity;

    const { data, error } = await supabase
      .from("stock_unificado")
      .update(updatePayload)
      .eq("id", currentRow.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      item: data,
      mensaje: `Stock actualizado: ${currentRow.cantidad} → ${newQuantity}`,
    });
  } catch (error: any) {
    console.error("[stock] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const sku = searchParams.get("sku");

    if (!sku) {
      return NextResponse.json({ error: "SKU es requerido" }, { status: 400 });
    }

    const { error } = await supabase.from("stock_unificado").delete().eq("sku", sku);

    if (error) throw error;

    return NextResponse.json({ success: true, mensaje: `Item ${sku} eliminado` });
  } catch (error: any) {
    console.error("[stock] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}