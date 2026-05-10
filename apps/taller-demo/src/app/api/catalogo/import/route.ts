import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getSupabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseServer();

    // Verificar auth básica (opcional, para proteger el endpoint)
    const authHeader = req.headers.get("authorization");
    if (authHeader !== "Bearer maqjeez-import-2026") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Limpiar tabla existente
    await supabase.from("catalog_products").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // Leer el JSON de productos
    const jsonPath = path.join(process.cwd(), "data", "catalogo-products.json");
    if (!fs.existsSync(jsonPath)) {
      return NextResponse.json({ error: "No se encontró catalogo-products.json" }, { status: 404 });
    }

    const raw = fs.readFileSync(jsonPath, "utf-8");
    const products: Array<{
      sku: string;
      name: string;
      category: string;
      imagePath: string;
    }> = JSON.parse(raw);

    // Insertar en batches de 50
    const BATCH = 50;
    let inserted = 0;
    let errors = 0;

    for (let i = 0; i < products.length; i += BATCH) {
      const batch = products.slice(i, i + BATCH).map((p) => ({
        sku: p.sku,
        name: p.name,
        catalog_price: 0,
        category: p.category,
        active: true,
      }));

      const { error } = await supabase
        .from("catalog_products")
        .upsert(batch, { onConflict: "sku" });

      if (error) {
        console.error(`Batch ${i / BATCH + 1} error:`, error.message);
        errors += batch.length;
      } else {
        inserted += batch.length;
      }
    }

    return NextResponse.json({
      success: true,
      total: products.length,
      inserted,
      errors,
    });
  } catch (err: any) {
    console.error("Import error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
