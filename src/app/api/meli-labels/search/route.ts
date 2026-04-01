import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const accountId = searchParams.get("account_id") || "";
    const meliUserId = searchParams.get("meli_user_id") || "";
    const field = searchParams.get("field") || "all"; // sku, tracking, buyer, all
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

    // Buscar en campos
    const searchTerm = `%${q}%`;

    let results: any[] = [];

    // Buscar según el campo especificado
    if (field === "sku" || field === "all") {
      const { data: skuResults } = await (query.ilike("sku", searchTerm) as any);
      if (skuResults) results = [...results, ...skuResults];
    }

    if (field === "tracking" || field === "all") {
      const { data: trackingResults } = await (query.ilike(
        "tracking_number",
        searchTerm
      ) as any);
      if (trackingResults) results = [...results, ...trackingResults];
    }

    if (field === "buyer" || field === "all") {
      const { data: buyerResults } = await (query.ilike(
        "buyer_nickname",
        searchTerm
      ) as any);
      if (buyerResults) results = [...results, ...buyerResults];
    }

    // Deduplicar por ID
    const uniqueResults = Array.from(
      new Map(results.map((item: any) => [item.id, item])).values()
    ).slice(0, limit);

    return NextResponse.json({
      results: uniqueResults,
      total: uniqueResults.length,
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
