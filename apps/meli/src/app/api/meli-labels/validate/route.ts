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
    const { order_ids } = body;

    if (!Array.isArray(order_ids) || order_ids.length === 0) {
      return NextResponse.json({ error: "Se requiere un array de order_ids" }, { status: 400 });
    }

    const authHeader = request.headers.get("authorization");
    let userId: string | null = null;
    if (authHeader?.startsWith("Bearer ")) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.slice(7));
      if (user) userId = user.id;
    }
    if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { data: accounts } = await supabase.from("linked_meli_accounts").select("id").eq("user_id", userId);
    if (!accounts || accounts.length === 0) return NextResponse.json({ error: "Sin cuentas" }, { status: 404 });

    const { data: orders, error } = await supabase
      .from("meli_orders").select("order_id, status, printed")
      .in("order_id", order_ids).in("meli_account_id", accounts.map(a => a.id));

    if (error) return NextResponse.json({ error: "Error al validar ordenes" }, { status: 500 });

    const foundIds = orders?.map(o => o.order_id) || [];
    const missing = order_ids.filter(id => !foundIds.includes(id));
    return NextResponse.json({ valid: missing.length === 0, found: orders || [], missing, total: order_ids.length });
  } catch (e) {
    console.error("[validate] Error:", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}