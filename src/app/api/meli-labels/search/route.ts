import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const accountId = searchParams.get("account_id") || "";
    const meliUserId = searchParams.get("meli_user_id") || "";
    const field = searchParams.get("field") || "all"; // sku, tracking, buyer, shipment_id, all
    const limit = parseInt(searchParams.get("limit") || "50");

    if (q.length < 2) {
      return NextResponse.json({
        results: [],
        total: 0,
      });
    }

    // Construir query base
    let query = supabase
      .from("printed_labels")
      .select("*")
      .order("print_date", { ascending: false })
      .limit(limit);

    // Filtrar por meli_user_id (seguridad)
    if (meliUserId) {
      query = query.eq("meli_user_id", meliUserId) as typeof query;
    }

    // Filtrar por account_id (opcional)
    if (accountId) {
      query = query.eq("account_id", accountId) as typeof query;
    }

    // Buscar con OR unificado (una sola query)
    const searchTerm = `%${q}%`;
    
    // Construir filtro OR dinámicamente
    let orFilters: string[] = [];
    
    if (field === "sku" || field === "all") {
      orFilters.push(`sku.ilike.${searchTerm}`);
    }
    if (field === "tracking" || field === "all") {
      orFilters.push(`tracking_number.ilike.${searchTerm}`);
    }
    if (field === "buyer" || field === "all") {
      orFilters.push(`buyer_nickname.ilike.${searchTerm}`);
    }
    if (field === "shipment_id" || field === "all") {
      // Para shipment_id, hacer casting a text y buscar
      orFilters.push(`shipment_id::text.ilike.${searchTerm}`);
    }

    if (orFilters.length === 0) {
      return NextResponse.json({
        results: [],
        total: 0,
      });
    }

    // Aplicar OR filter de una sola vez
    query = query.or(orFilters.join(",")) as typeof query;

    const { data: results, error } = await query;

    if (error) {
      console.error("Search query error:", error);
      return NextResponse.json(
        { error: "Search failed", results: [] },
        { status: 500 }
      );
    }

    return NextResponse.json({
      results: results || [],
      total: (results || []).length,
      query: q,
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Search failed", results: [] },
      { status: 500 }
    );
  }
}

