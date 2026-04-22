import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export const dynamic = 'force-dynamic';

/**
 * POST /api/label-history
 * Guarda una etiqueta impresa en el historial
 */
export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase no configurado" },
        { status: 500 }
      );
    }

    // Obtener usuario del token
    const authHeader = request.headers.get("authorization");
    let userId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        userId = user.id;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    
    // Validar campos requeridos
    if (!body.shipment_id) {
      return NextResponse.json(
        { error: "shipment_id es requerido" },
        { status: 400 }
      );
    }

    // Verificar si ya existe
    const { data: existing } = await supabase
      .from("label_history")
      .select("id, reprint_count")
      .eq("user_id", userId)
      .eq("shipment_id", body.shipment_id)
      .single();

    if (existing) {
      // Actualizar contador de reimpresión
      const { data, error } = await supabase
        .from("label_history")
        .update({
          reprint_count: existing.reprint_count + 1,
          printed_at: new Date().toISOString(),
          printed_by: userId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) throw error;
      
      return NextResponse.json({ 
        success: true, 
        data,
        message: "Etiqueta actualizada en historial"
      });
    }

    // Insertar nueva etiqueta
    const { data, error } = await supabase
      .from("label_history")
      .insert({
        user_id: userId,
        account_id: body.account_id,
        shipment_id: body.shipment_id,
        order_id: body.order_id,
        tracking_number: body.tracking_number,
        label_url: body.label_url,
        label_format: body.label_format || 'pdf',
        printed_by: userId,
        account_nickname: body.account_nickname,
        buyer_name: body.buyer_name,
        buyer_nickname: body.buyer_nickname,
        item_title: body.item_title,
        item_thumbnail: body.item_thumbnail,
        total_amount: body.total_amount,
        shipping_cost: body.shipping_cost,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      data,
      message: "Etiqueta guardada en historial"
    });
  } catch (error) {
    console.error("[label-history] Error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/label-history
 * Obtiene el historial de etiquetas del usuario
 */
export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase no configurado" },
        { status: 500 }
      );
    }

    // Obtener usuario del token
    const authHeader = request.headers.get("authorization");
    let userId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        userId = user.id;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Parsear query params
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const accountId = searchParams.get("account_id");
    const search = searchParams.get("search");

    // Construir query
    let query = supabase
      .from("label_history")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .order("printed_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (accountId) {
      query = query.eq("account_id", accountId);
    }

    if (search) {
      query = query.or(`
        tracking_number.ilike.%${search}%,
        buyer_name.ilike.%${search}%,
        buyer_nickname.ilike.%${search}%,
        item_title.ilike.%${search}%
      `);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return NextResponse.json({
      data: data || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error("[label-history] Error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
