import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getValidToken } from "@/lib/meli";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export const dynamic = 'force-dynamic';

/**
 * POST /api/stock/sync
 * 
 * Sincroniza publicaciones de MeLi con el stock unificado
 * Asigna SKUs automáticamente: MAQ-00001, MAQ-00002, etc.
 */
export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: "Supabase no configurado" }, { status: 500 });
    }

    // Obtener usuario
    const authHeader = request.headers.get("authorization");
    let userId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) userId = user.id;
    }

    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Obtener cuenta MAQJEEZ I (la principal)
    const { data: account, error: accountError } = await supabase
      .from("linked_meli_accounts")
      .select("id, user_id, meli_user_id, meli_nickname, access_token_enc, refresh_token_enc, token_expiry_date, is_active")
      .eq("user_id", userId)
      .eq("meli_nickname", "MAQJEEZ I")
      .eq("is_active", true)
      .single();

    if (accountError || !account) {
      return NextResponse.json({ error: "Cuenta MAQJEEZ I no encontrada" }, { status: 404 });
    }

    // Obtener token
    const token = await getValidToken(account);
    
    if (!token) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    // Obtener último SKU usado
    const { data: lastItem } = await supabase
      .from("stock_unificado")
      .select("sku")
      .like("sku", "MAQ-%")
      .order("sku", { ascending: false })
      .limit(1)
      .single();

    let nextNumber = 1;
    if (lastItem?.sku) {
      const match = lastItem.sku.match(/MAQ-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    // Obtener publicaciones de MeLi
    const response = await fetch(
      `https://api.mercadolibre.com/users/${account.meli_user_id}/items/search?limit=100`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Error MeLi: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    const itemIds = data.results || [];

    // Obtener detalles de los items
    const items: any[] = [];
    for (let i = 0; i < itemIds.length; i += 20) {
      const batch = itemIds.slice(i, i + 20);
      const itemsResponse = await fetch(
        `https://api.mercadolibre.com/items?ids=${batch.join(',')}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      if (itemsResponse.ok) {
        const itemsData = await itemsResponse.json();
        itemsData.forEach((item: any) => {
          if (item.code === 200 && item.body) {
            items.push(item.body);
          }
        });
      }
    }

    // Procesar items y asignar SKUs
    const resultados = [];
    for (const item of items) {
      // Verificar si ya existe en stock
      const { data: existing } = await supabase
        .from("stock_unificado")
        .select("id, sku")
        .eq("item_id", item.id)
        .single();

      if (existing) {
        // Actualizar información
        await supabase
          .from("stock_unificado")
          .update({
            nombre: item.title,
            precio: item.price,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        resultados.push({
          item_id: item.id,
          sku: existing.sku,
          nombre: item.title,
          accion: "actualizado",
        });
      } else {
        // Crear nuevo con SKU automático
        const sku = `MAQ-${String(nextNumber).padStart(5, '0')}`;
        nextNumber++;

        await supabase
          .from("stock_unificado")
          .insert({
            sku,
            nombre: item.title,
            cantidad: item.available_quantity || 0,
            precio: item.price,
            item_id: item.id,
            cuenta_id: account.id,
            meli_sku: item.seller_sku || null,
          });

        resultados.push({
          item_id: item.id,
          sku,
          nombre: item.title,
          accion: "creado",
        });
      }
    }

    return NextResponse.json({
      success: true,
      total: items.length,
      procesados: resultados.length,
      items: resultados,
    });

  } catch (err: any) {
    console.error("[stock/sync] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
