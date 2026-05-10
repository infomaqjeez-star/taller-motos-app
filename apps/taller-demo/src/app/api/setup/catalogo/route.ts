import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getSupabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseServer();

    // Auth simple
    const authHeader = req.headers.get("authorization");
    if (authHeader !== "Bearer maqjeez-setup-2026") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // 1. Verificar si la tabla existe intentando un select
    const { error: testError } = await supabase
      .from("catalog_products")
      .select("id", { head: true });

    if (testError && testError.message.includes("does not exist")) {
      return NextResponse.json({
        error: "La tabla catalog_products NO existe. Debés crearla manualmente en Supabase → SQL Editor.",
        sql: `
CREATE TABLE IF NOT EXISTS catalog_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    catalog_price NUMERIC NOT NULL DEFAULT 0,
    image_url TEXT,
    category TEXT DEFAULT 'Repuestos',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_catalog_sku ON catalog_products(sku);
CREATE INDEX idx_catalog_active ON catalog_products(active);
CREATE INDEX idx_catalog_category ON catalog_products(category);
ALTER TABLE catalog_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY catalog_select_public ON catalog_products FOR SELECT USING (active = true);
        `,
      }, { status: 400 });
    }

    // 3. Limpiar tabla existente (eliminar productos antiguos con SKU auto-generados)
    await supabase.from("catalog_products").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // 4. Leer JSON de productos
    const jsonPath = path.join(process.cwd(), "data", "catalogo-products.json");
    if (!fs.existsSync(jsonPath)) {
      return NextResponse.json({ error: "No se encontró catalogo-products.json" }, { status: 404 });
    }

    const raw = fs.readFileSync(jsonPath, "utf-8");
    const products = JSON.parse(raw) as Array<{
      sku: string;
      name: string;
      category: string;
    }>;

    // 4. Insertar en batches de 50
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
      message: inserted > 0
        ? `Catálogo importado: ${inserted} productos`
        : "No se pudo insertar ningún producto. Verificá que la tabla exista.",
    });
  } catch (err: any) {
    console.error("Setup error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
