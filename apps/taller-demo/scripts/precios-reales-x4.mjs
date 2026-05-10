/**
 * Extrae precios reales de imágenes con OCR, multiplica x4,
 * redondea al formato psicológico (999, 1999, 34999, etc.)
 * y actualiza el catálogo.
 *
 * Uso:
 *   cd apps/taller-demo
 *   node scripts/precios-reales-x4.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Tesseract from "tesseract.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_DIR = "C:\\Users\\Mi Pc\\Desktop\\MERCADOLIBRE CUENTA NUEVA";
const JSON_PATH = path.join(__dirname, "..", "data", "catalogo-products.json");
const API_URL = "https://appjeezpro.store/api/catalogo/actualizar-precios";
const AUTH = "Bearer maqjeez-prices-2026";

// Fallback por categoría (precio base estimado cuando OCR falla)
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
  return min + (Math.abs(hash) % (max - min));
}

/**
 * Redondeo psicológico tipo .99:
 * 34000 → 34999
 * 8560 → 8999
 * 1234 → 1999
 * 400 → 499
 * 45 → 49
 */
function roundPrice99(n) {
  if (n <= 0) return 0;
  if (n < 100) return Math.ceil(n / 10) * 10 - 1;
  if (n < 1000) return Math.ceil(n / 100) * 100 - 1;
  if (n < 10000) return Math.ceil(n / 1000) * 1000 - 1;
  if (n < 100000) return Math.ceil(n / 1000) * 1000 - 1;
  return Math.ceil(n / 10000) * 10000 - 1;
}

function extractPriceFromOCR(words, sku) {
  const skuNum = sku.replace(/\D/g, "");
  let bestPrice = 0;

  for (const w of words) {
    const text = w.text.trim();
    // Buscar $ número o solo número grande
    const match = text.match(/^\$?([\d.,]+)$/);
    if (match) {
      const raw = match[1].replace(/[.,]/g, "");
      const val = parseInt(raw, 10);
      // Debe ser > 500, < 1M, y NO el SKU
      if (val > 500 && val < 1_000_000 && val !== parseInt(skuNum, 10)) {
        if (val > bestPrice) bestPrice = val;
      }
    }
  }

  return bestPrice;
}

async function getPriceFromImage(imagePath, sku) {
  try {
    const { data } = await Tesseract.recognize(imagePath, "spa", { logger: () => {} });
    return extractPriceFromOCR(data.words || [], sku);
  } catch {
    return 0;
  }
}

async function main() {
  const products = JSON.parse(fs.readFileSync(JSON_PATH, "utf-8"));
  console.log(`📁 Total productos: ${products.length}`);
  console.log("🔍 Extrayendo precios reales con OCR + redondeo x4...\n");

  const precios = [];
  let ocrOk = 0;
  let fallback = 0;

  for (const p of products) {
    let precioBase = 0;

    // Intentar OCR
    if (p.imagePath && fs.existsSync(p.imagePath)) {
      precioBase = await getPriceFromImage(p.imagePath, p.sku);
    }

    // Fallback por categoría
    if (precioBase === 0) {
      const rango = RANGOS[p.category] || { min: 1000, max: 10000 };
      precioBase = pseudoRandom(p.sku, rango.min, rango.max);
      fallback++;
    } else {
      ocrOk++;
    }

    // Multiplicar x4 y redondear
    const catalogPrice = roundPrice99(precioBase * 4);
    precios.push({ sku: p.sku, precio_base: catalogPrice });

    const source = precioBase > 0 && ocrOk > 0 ? "OCR" : "estimado";
    console.log(`${p.sku}: base $${precioBase.toLocaleString("es-AR")} → catálogo $${catalogPrice.toLocaleString("es-AR")} (${source})`);
  }

  console.log(`\n📊 Resumen:`);
  console.log(`   Precios extraídos por OCR: ${ocrOk}`);
  console.log(`   Precios estimados: ${fallback}`);
  console.log(`\n📤 Enviando ${precios.length} precios al servidor...`);

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
        process.stdout.write(`\r  ${updated}/${precios.length} actualizados`);
      }
    } catch (err) {
      console.log(`\n  ❌ Error batch: ${err.message}`);
    }
  }

  console.log(`\n\n🎉 ${updated}/${precios.length} productos con precios x4 redondeados!`);
}

main().catch((err) => {
  console.error("\n💥 Error fatal:", err);
  process.exit(1);
});
