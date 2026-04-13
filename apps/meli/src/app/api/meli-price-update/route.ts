import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { item_id, new_price, meli_account_id } = body;

    if (!item_id || !new_price || !meli_account_id) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    const authHeader = request.headers.get("authorization");
    let userId: string | null = null;
    if (authHeader?.startsWith("Bearer ")) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.slice(7));
      if (user) userId = user.id;
    }
    if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    // Obtener cuenta con token
    const { data: account } = await supabase.from("linked_meli_accounts")
      .select("id, meli_user_id, meli_nickname, access_token_enc")
      .eq("id", meli_account_id)
      .eq("user_id", userId)
      .single();
    
    if (!account) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });

    // Verificar token
    if (!account.access_token_enc?.startsWith('APP_USR')) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    // Actualizar precio en MeLi
    console.log(`[meli-price-update] Actualizando precio de ${item_id} a $${new_price} en cuenta ${account.meli_nickname}`);
    
    const meliRes = await fetch(`https://api.mercadolibre.com/items/${item_id}`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${account.access_token_enc}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ price: new_price }),
    });

    if (!meliRes.ok) {
      const errorData = await meliRes.json().catch(() => ({ message: "Error desconocido" }));
      console.error(`[meli-price-update] Error MeLi:`, errorData);
      return NextResponse.json({ 
        error: "Error al actualizar en MeLi", 
        details: errorData 
      }, { status: meliRes.status });
    }

    const meliData = await meliRes.json();
    console.log(`[meli-price-update] Precio actualizado en MeLi:`, meliData);

    // Actualizar en base de datos local
    const { error } = await supabase.from("meli_items")
      .update({ price: new_price, last_updated: new Date().toISOString() })
      .eq("item_id", item_id)
      .eq("meli_account_id", meli_account_id);

    if (error) {
      console.error(`[meli-price-update] Error DB:`, error);
    }

    return NextResponse.json({ 
      success: true, 
      message: "Precio actualizado correctamente", 
      item_id, 
      new_price,
      meli_response: meliData 
    });
  } catch (e) {
    console.error("[meli-price-update] Error:", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
