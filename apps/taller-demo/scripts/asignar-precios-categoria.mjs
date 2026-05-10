/**
 * Asigna precios de catálogo (precio_base * 4) a todos los productos
 * basándose en la categoría. Usa el SKU como semilla para variar
 * el precio dentro del rango de cada categoría.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JSON_PATH = path.join(__dirname, "..", "data", "catalogo-products.json");
const API_URL = "https://appjeezpro.store/api/catalogo/actualizar-precios";
const AUTH = "Bearer maqjeez-prices-2026";

// Rango de precios BASE (antes de multiplicar x4) por categoría
const RANGOS = {
  "Motosierras": { min: 5000, max: 25000 },
  "Desmalezadoras": { min: 4000, max: 20000 },
  "Grupos Electrógenos": { min: 12000, max: 40000 },
  "Compresores": { min: 8000, max: 25000 },
  "Hidrolavadoras y Bombas": { min: 5000, max: 15000 },
  "Riego": { min: 2000, max: 10000 },
  "Filtros y Bobinas": { min: 1000, max: 4000 },
  "Carburación": { min: 1500, max: 6000 },
  "Cuchillas": { min: 1000, max: 5000 },
  "Embragues": { min: 1500, max: 5000 },
  "Aceites y Lubricantes": { min: 500, max: 3000 },
  "Tanques": { min: 1000, max: 4000 },
  "Mangueras": { min: 500, max: 3000 },
  "Cilindros y Pistones": { min: 2000, max: 8000 },
  "Tapas y Arranque": { min: 1000, max: 5000 },
  "Bujías": { min: 500, max: 2000 },
  "Cabezales y Accesorios": { min: 1000, max: 5000 },
  "Hoyadoras": { min: 5000, max: 20000 },
  "Accesorios y Herramientas": { min: 500, max: 5000 },
  "Cortacésped y Tractores": { min: 2000, max: 10000 },
  "Herramientas Eléctricas": { min: 3000, max: 15000 },
  "Soldadura": { min: 1000, max: 3000 },
  "Baterías": { min: 5000, max: 15000 },
  "Accesorios": { min: 500, max: 3000 },
};

function pseudoRandom(sku, min, max) {
  let hash = 0;
  for (let i = 0; i < sku.length; i++) {
    hash = ((hash << 5) - hash) + sku.charCodeAt(i);
    hash |= 0;
  }
  const abs = Math.abs(hash);
  const range = max - min;
  return min + (abs % range);
}

async function main() {
  const products = JSON.parse(fs.readFileSync(JSON_PATH, "utf-8"));
  console.log(`📁 Total productos: ${products.length}`);

  const precios = [];

  for (const p of products) {
    const rango = RANGOS[p.category] || { min: 1000, max: 10000 };
    const precioBase = pseudoRandom(p.sku, rango.min, rango.max);
    precios.push({ sku: p.sku, precio_base: precioBase });
  }

  console.log(`💰 Asignando ${precios.length} precios (x4 = catálogo)...`);

  // Enviar en batches de 50
  const BATCH = 50;
  let updated = 0;

  for (let i = 0; i < precios.length; i += BATCH) {
    const batch = precios.slice(i, i + BATCH);
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: AUTH,
        },
        body: JSON.stringify({ precios: batch }),
      });
      const data = await res.json();
      if (data.success) {
        updated += data.updated;
        console.log(`  Batch ${Math.floor(i / BATCH) + 1}/${Math.ceil(precios.length / BATCH)}: ${data.updated} OK`);
      }
    } catch (err) {
      console.log(`  ❌ Error batch: ${err.message}`);
    }
  }

  console.log(`\n🎉 ${updated}/${precios.length} productos actualizados con precios x4`);
}

main().catch((err) => {
  console.error("\n💥 Error:", err);
  process.exit(1);
});
