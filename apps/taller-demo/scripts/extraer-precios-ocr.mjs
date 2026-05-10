/**
 * Extrae precios de las imágenes locales usando OCR (Tesseract.js).
 * Los precios encontrados se multiplican x4 y se envían al endpoint.
 *
 * Uso:
 *   cd apps/taller-demo
 *   node scripts/extraer-precios-ocr.mjs
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

function extractPriceFromText(text) {
  // Buscar patrones de precio: $12.345, 12345, 12.345, etc.
  const patterns = [
    /\$\s*(\d{1,3}(?:[.,]\d{3})*(?:,\d{2})?)/g,  // $12.345,67
    /\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/g,  // $12,345.67
    /precio\s*[:\-]?\s*\$?\s*(\d[\d.,]*)/gi,  // "precio: 12345"
    /(\d{1,3}(?:[.,]\d{3})+)\s*(?:pesos|ars|\$)/gi,  // "12.345 pesos"
    /\b(\d{4,6})\b/g,  // Número de 4-6 dígitos (probable precio)
  ];

  let bestPrice = 0;

  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern)];
    for (const match of matches) {
      let num = match[1].replace(/[.,]/g, "");
      const val = parseInt(num, 10);
      if (val > 1000 && val < 500000 && val > bestPrice) {
        bestPrice = val;
      }
    }
  }

  return bestPrice;
}

async function processImage(imagePath) {
  try {
    const { data: { text } } = await Tesseract.recognize(imagePath, "spa", {
      logger: () => {}, // silencioso
    });
    const price = extractPriceFromText(text);
    return price;
  } catch (err) {
    console.log(`  ⚠️ OCR error en ${path.basename(imagePath)}: ${err.message}`);
    return 0;
  }
}

async function main() {
  if (!fs.existsSync(JSON_PATH)) {
    console.error("❌ No se encontró", JSON_PATH);
    process.exit(1);
  }

  const products = JSON.parse(fs.readFileSync(JSON_PATH, "utf-8"));
  console.log(`📁 Total productos: ${products.length}`);
  console.log("🔍 Extrayendo precios vía OCR (esto puede tardar varios minutos)...\n");

  const precios = [];
  let processed = 0;

  for (const p of products) {
    if (!p.imagePath || !fs.existsSync(p.imagePath)) {
      console.log(`⚠️ Sin imagen: ${p.sku}`);
      continue;
    }

    const price = await processImage(p.imagePath);
    if (price > 0) {
      precios.push({ sku: p.sku, precio_base: price });
      console.log(`✅ ${p.sku}: $${price.toLocaleString("es-AR")} → catálogo $${(price * 4).toLocaleString("es-AR")}`);
    } else {
      console.log(`❌ ${p.sku}: No se detectó precio`);
    }

    processed++;
    if (processed % 50 === 0) {
      console.log(`\n--- Procesados ${processed}/${products.length} ---\n`);
    }
  }

  console.log(`\n📊 Resultados:`);
  console.log(`   Productos procesados: ${processed}`);
  console.log(`   Precios detectados: ${precios.length}`);
  console.log(`   Sin precio: ${processed - precios.length}`);

  if (precios.length === 0) {
    console.log("\n⚠️ No se detectaron precios. Las imágenes pueden no tener texto legible.");
    return;
  }

  // Enviar al endpoint en batches de 50
  console.log(`\n📤 Enviando ${precios.length} precios al servidor...`);
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
        console.log(`  Batch ${Math.floor(i / BATCH) + 1}: ${data.updated} actualizados`);
      }
    } catch (err) {
      console.log(`  ❌ Error batch ${Math.floor(i / BATCH) + 1}: ${err.message}`);
    }
  }

  console.log(`\n🎉 Finalizado: ${updated} productos actualizados con precios x4`);
}

main().catch((err) => {
  console.error("\n💥 Error fatal:", err);
  process.exit(1);
});
