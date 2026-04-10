import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key"
);

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    let userId: string | null = null;
    if (authHeader?.startsWith("Bearer ")) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.slice(7));
      if (user) userId = user.id;
    }
    if (!userId) return NextResponse.json([]);

    const { data, error } = await supabase
      .from("promociones_propias")
      .select("id, name, discount_type, discount_value, start_date, end_date, status, items_count, created_at, updated_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) { console.error("[promociones-propias] Error:", error); return NextResponse.json([]); }
    return NextResponse.json(data || []);
  } catch (e) {
    console.error("[promociones-propias] Error:", e);
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, discount_type, discount_value, start_date, end_date, item_ids } = body;

    const authHeader = request.headers.get("authorization");
    let userId: string | null = null;
    if (authHeader?.startsWith("Bearer ")) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.slice(7));
      if (user) userId = user.id;
    }
    if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    if (!name || !discount_type || !discount_value) return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });

    const { data, error } = await supabase.from("promociones_propias").insert({
      user_id: userId, name, discount_type, discount_value,
      start_date: start_date || new Date().toISOString(),
      end_date: end_date || null, status: "active",
      items_count: item_ids?.length || 0, item_ids: item_ids || [],
    }).select().single();

    if (error) return NextResponse.json({ error: "Error al crear promocion" }, { status: 500 });
    return NextResponse.json(data);
  } catch (e) {
    console.error("[promociones-propias] Error:", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}