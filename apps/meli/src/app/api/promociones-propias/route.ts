import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Forzar renderizado dinámico - evita error de generación estática
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseServiceKey || "placeholder-key"
);

/**
 * GET /api/promociones-propias
 * 
 * Obtiene las promociones propias del usuario.
 */
export async function GET(request: NextRequest) {
  try {
    // Obtener el usuario actual
    const authHeader = request.headers.get("authorization");
    let userId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) userId = user.id;
    }

    if (!userId) {
      return NextResponse.json([]);
    }

    // Obtener promociones del usuario
    const { data: promociones, error } = await supabase
      .from("promociones_propias")
      .select(`
        id,
        name,
        discount_type,
        discount_value,
        start_date,
        end_date,
        status,
        items_count,
        created_at,
        updated_at
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[promociones-propias] Error:", error);
      return NextResponse.json([]);
    }

    return NextResponse.json(promociones || []);
  } catch (error) {
    console.error("[promociones-propias] Error inesperado:", error);
    return NextResponse.json([]);
  }
}

/**
 * POST /api/promociones-propias
 * 
 * Crea una nueva promociÃ³n.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, discount_type, discount_value, start_date, end_date, item_ids } = body;

    // Obtener el usuario actual
    const authHeader = request.headers.get("authorization");
    let userId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) userId = user.id;
    }

    if (!userId) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    if (!name || !discount_type || !discount_value) {
      return NextResponse.json(
        { error: "Faltan campos requeridos" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("promociones_propias")
      .insert({
        user_id: userId,
        name,
        discount_type,
        discount_value,
        start_date: start_date || new Date().toISOString(),
        end_date: end_date || null,
        status: "active",
        items_count: item_ids?.length || 0,
        item_ids: item_ids || [],
      })
      .select()
      .single();

    if (error) {
      console.error("[promociones-propias] Error creando:", error);
      return NextResponse.json(
        { error: "Error al crear promociÃ³n" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[promociones-propias] Error inesperado:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}