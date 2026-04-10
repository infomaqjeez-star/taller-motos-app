import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key"
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

    const { data: account } = await supabase.from("linked_meli_accounts")
      .select("id").eq("id", meli_account_id).eq("user_id", userId).single();
    if (!account) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });

    const { error } = await supabase.from("meli_items")
      .update({ price: new_price, last_updated: new Date().toISOString() })
      .eq("item_id", item_id).eq("meli_account_id", meli_account_id);

    if (error) return NextResponse.json({ error: "Error al actualizar precio" }, { status: 500 });

    return NextResponse.json({ success: true, message: "Precio actualizado", item_id, new_price });
  } catch (e) {
    console.error("[meli-price-update] Error:", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}