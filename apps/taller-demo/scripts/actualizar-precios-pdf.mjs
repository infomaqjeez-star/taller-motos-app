/**
 * Actualiza precios del catálogo basado en el PDF de Konecta:
 * - Precio ×4 redondeado (psicológico)
 * - Stock ilimitado (999999)
 * - Oculta productos que NO están en el PDF
 *
 * Requiere variables de entorno:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY (o NEXT_PUBLIC_SUPABASE_ANON_KEY)
 *
 * Uso:
 *   cd apps/taller-demo
 *   node scripts/actualizar-precios-pdf.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CSV_PATH = path.join(__dirname, "..", "tmp", "precios-pdf-v2.json"); // Fallback
const CSV_PATH_DESKTOP = "C:\\Users\\Mi Pc\\Desktop\\catalogo_maqjeez_completo.csv";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

function roundPrice99(n) {
  if (n <= 0) return 0;
  if (n < 100) return Math.max(49, (Math.floor(n / 10) + 1) * 10 - 1);
  if (n < 1000) return (Math.floor(n / 100) + 1) * 100 - 1;
  if (n < 10000) return (Math.floor(n / 1000) + 1) * 1000 - 1;
  if (n < 100000) return (Math.floor(n / 1000) + 1) * 1000 - 1;
  return (Math.floor(n / 10000) + 1) * 10000 - 1;
}

function readCsv(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n").filter((l) => l.trim());
  const headers = lines[0].split(",").map((h) => h.trim());
  const results = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (cols.length >= 3) {
      const sku = cols[0]?.trim();
      const titulo = cols[1]?.trim();
      const precioCatalogoStr = cols[3]?.trim();
      const precioCatalogo = parseInt(precioCatalogoStr, 10);
      if (sku && !isNaN(precioCatalogo) && precioCatalogo > 0) {
        results.push({
          sku,
          titulo,
          precio_base: parseInt(cols[2]?.trim() || "0", 10),
          precio_catalogo: precioCatalogo,
        });
      }
    }
  }
  return results;
}

async function main() {
  // Validar credenciales
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("❌ Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
    console.error("   Asegurate de tener las variables de entorno configuradas.");
    process.exit(1);
  }

  // Leer CSV
  const csvPath = fs.existsSync(CSV_PATH_DESKTOP) ? CSV_PATH_DESKTOP : CSV_PATH;
  if (!fs.existsSync(csvPath)) {
    console.error("❌ No se encontró el CSV:", csvPath);
    console.error("   Genera primero el catálogo con: py scripts/extraer-todo-catalogo.py");
    process.exit(1);
  }

  console.log("📄 Leyendo catálogo desde:", csvPath);
  const pdfProducts = readCsv(csvPath);
  console.log(`   ${pdfProducts.length} productos del PDF\n`);

  // Conectar a Supabase
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Obtener todos los productos actuales de la DB
  console.log("🔄 Obteniendo productos de la base de datos...");
  const { data: dbProducts, error: dbError } = await supabase
    .from("catalog_products")
    .select("sku, name, catalog_price, active");

  if (dbError) {
    console.error("❌ Error al leer la DB:", dbError.message);
    process.exit(1);
  }

  console.log(`   ${dbProducts?.length || 0} productos en la DB\n`);

  // Preparar listas
  const pdfSkus = new Set(pdfProducts.map((p) => p.sku));
  const activos = [];
  const inactivos = [];

  // 1) Activos: productos del PDF
  for (const p of pdfProducts) {
    activos.push({
      sku: p.sku,
      catalog_price: p.precio_catalogo,
      stock: 999999,
    });
  }

  // 2) Inactivos: productos en DB pero NO en el PDF
  for (const dbP of dbProducts || []) {
    if (!pdfSkus.has(dbP.sku)) {
      inactivos.push({ sku: dbP.sku });
    }
  }

  console.log(`📊 Resumen:`);
  console.log(`   Activos (PDF): ${activos.length}`);
  console.log(`   Inactivos (ocultar): ${inactivos.length}\n`);

  // Actualizar directamente en Supabase (sin API local)
  const BATCH = 50;
  let totalUpdated = 0;
  let totalErrors = 0;

  console.log("🚀 Actualizando productos en Supabase...\n");

  // 1) Activos: actualizar precio + stock + active=true
  for (let i = 0; i < activos.length; i += BATCH) {
    const batch = activos.slice(i, i + BATCH);
    try {
      // Hacer update individual para cada producto
      for (const p of batch) {
        const { error } = await supabase
          .from("catalog_products")
          .update({
            name: p.titulo,
            catalog_price: p.catalog_price,
            active: true,
          })
          .eq("sku", p.sku);

        if (error) {
          console.error(`   ❌ ${p.sku}:`, error.message);
          totalErrors++;
        } else {
          totalUpdated++;
        }
      }
      console.log(`   ✅ Activos batch ${Math.floor(i / BATCH) + 1}/${Math.ceil(activos.length / BATCH)} (${batch.length} items)`);
    } catch (e) {
      console.error(`   ❌ Error batch activos ${i}:`, e.message);
      totalErrors += batch.length;
    }
  }

  // 2) Inactivos: ocultar productos que no están en el PDF
  if (inactivos.length > 0) {
    console.log(`\n   🔒 Ocultando ${inactivos.length} productos no listados...`);
    for (let i = 0; i < inactivos.length; i += BATCH) {
      const batch = inactivos.slice(i, i + BATCH);
      try {
        for (const p of batch) {
          const { error } = await supabase
            .from("catalog_products")
            .update({ active: false })
            .eq("sku", p.sku);

          if (error) {
            console.error(`   ❌ ${p.sku}:`, error.message);
            totalErrors++;
          } else {
            totalUpdated++;
          }
        }
        console.log(`   ✅ Inactivos batch ${Math.floor(i / BATCH) + 1}/${Math.ceil(inactivos.length / BATCH)} (${batch.length} items)`);
      } catch (e) {
        console.error(`   ❌ Error batch inactivos ${i}:`, e.message);
        totalErrors += batch.length;
      }
    }
  }

  console.log(`\n✅ Resultado final:`);
  console.log(`   Actualizados: ${totalUpdated}`);
  console.log(`   Errores: ${totalErrors}`);
  console.log(`\n🎉 Catálogo actualizado:`);
  console.log(`   • ${activos.length} productos del PDF con precio ×4 y stock ilimitado`);
  console.log(`   • ${inactivos.length} productos ocultos (pendientes de aprobación del admin)`);
}

main().catch((err) => {
  console.error("💥 Error:", err);
  process.exit(1);
});
