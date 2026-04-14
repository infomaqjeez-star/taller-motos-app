import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Forzar renderizado dinamico - evita error de generacion estatica
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key";

const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseServiceKey || "placeholder-key"
);

/**
 * GET /api/meli-labels/search
 *
 * Busca etiquetas impresas en el historial (meli_printed_labels).
 *
 * Query params:
 *   q          - texto a buscar (buyer_nickname, sku, tracking, account_id)
 *   tipo       - 'flex' | 'turbo' | 'correo' | todas si no se especifica
 *   limit      - cantidad maxima (default 50)
 *   all        - 'true' para traer todos (max 500)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q     = searchParams.get("q") || "";
    const tipo  = searchParams.get("tipo") || "";
    const all   = searchParams.get("all") === "true";
    const limit = all ? 500 : parseInt(searchParams.get("limit") || "50", 10);

    // Construir la consulta base desde meli_printed_labels
    let query = supabase
      .from("meli_printed_labels")
      .select(`
        id,
        shipment_id,
        order_id,
        tracking_number,
        buyer_nickname,
        sku,
        variation,
        quantity,
        account_id,
        meli_user_id,
        type,
        source,
        printed_at,
        created_at
      `)
      .order("printed_at", { ascending: false })
      .limit(limit);

    // Filtro por tipo de envio
    if (tipo && tipo !== "todas") {
      query = query.eq("type", tipo);
    }

    // Filtro de busqueda libre
    if (q && q.trim().length >= 2) {
      query = query.or(
        `buyer_nickname.ilike.%${q}%,sku.ilike.%${q}%,tracking_number.ilike.%${q}%,account_id.ilike.%${q}%,shipment_id::text.ilike.%${q}%`
      );
    }

    // Filtro TTL: solo etiquetas de los ultimos 90 dias
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    query = query.gte("printed_at", ninetyDaysAgo.toISOString());

    const { data: labels, error } = await query;

    if (error) {
      console.error("[meli-labels/search] Error:", error);
      // Devolver estructura vacia compatible con la pagina
      return NextResponse.json({ results: [], total: 0 });
    }

    const results = (labels || []).map((l: any) => ({
      id:              l.id,
      shipment_id:     l.shipment_id,
      order_id:        l.order_id,
      tracking_number: l.tracking_number,
      buyer_nickname:  l.buyer_nickname,
      sku:             l.sku,
      variation:       l.variation,
      quantity:        l.quantity,
      account_id:      l.account_id,
      meli_user_id:    l.meli_user_id,
      shipping_method: l.type,   // alias para compatibilidad con la UI
      tipo:            l.type,
      source:          l.source || "app",
      print_date:      l.printed_at,
      printed_at:      l.printed_at,
      file_path:       "",
      // Dias restantes antes de expirar (90 dias desde printed_at)
      days_remaining:  l.printed_at
        ? Math.max(0, 90 - Math.floor((Date.now() - new Date(l.printed_at).getTime()) / 86_400_000))
        : 90,
    }));

    return NextResponse.json({ results, total: results.length });
  } catch (error) {
    console.error("[meli-labels/search] Error inesperado:", error);
    return NextResponse.json({ results: [], total: 0 });
  }
}
