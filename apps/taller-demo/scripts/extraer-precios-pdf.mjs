/**
 * Extrae SKU + precio de las imágenes del PDF del catálogo usando OCR.
 * Guarda resultados en tmp/precios-pdf.json
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Tesseract from "tesseract.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PAGES_DIR = path.join(__dirname, "..", "tmp", "pdf-pages");
const OUTPUT_JSON = path.join(__dirname, "..", "tmp", "precios-pdf.json");

// Regex para SKU: números y letras, ej: 17002, K17005, MAQ-0001, 14019-2
const SKU_REGEX = /\b([A-Z]{2,3}-\d{3,6}|K?\d{4,6}-?\d{0,3})\b/g;
// Regex para precio: $12.345 o $123.456
const PRICE_REGEX = /\$([\d.]+)/g;

function extractPriceFromText(text, sku) {
  // Buscar líneas que contengan el SKU
  const lines = text.split('\n');
  for (const line of lines) {
    if (line.includes(sku)) {
      // Buscar precio en esa línea o las siguientes
      const match = line.match(PRICE_REGEX);
      if (match && match.length > 0) {
        // Tomar el precio más grande (evitar confundir con cantidades pequeñas)
        const prices = match.map(p => {
          const num = parseInt(p.replace('$', '').replace(/\./g, ''), 10);
          return num;
        });
        const maxPrice = Math.max(...prices);
        if (maxPrice > 100) return maxPrice;
      }
    }
  }

  // Fallback: buscar precio cercano en el texto
  const allPrices = [...text.matchAll(PRICE_REGEX)];
  for (const match of allPrices) {
    const num = parseInt(match[1].replace(/\./g, ''), 10);
    if (num > 100 && num < 10000000) return num;
  }
  return 0;
}

async function processPage(pageNum) {
  const imgPath = path.join(PAGES_DIR, `page_${String(pageNum).padStart(3, '0')}.png`);
  if (!fs.existsSync(imgPath)) return [];

  const { data } = await Tesseract.recognize(imgPath, 'spa', { logger: () => {} });
  const text = data.text;

  const results = [];
  const skuMatches = [...text.matchAll(SKU_REGEX)];

  for (const match of skuMatches) {
    const sku = match[1];
    // Evitar SKUs duplicados en la misma página
    if (results.some(r => r.sku === sku)) continue;

    const price = extractPriceFromText(text, sku);
    if (price > 0) {
      results.push({ sku, precio: price });
    }
  }

  return results;
}

async function main() {
  const files = fs.readdirSync(PAGES_DIR).filter(f => f.endsWith('.png'));
  const totalPages = files.length;

  console.log(`📄 Procesando ${totalPages} páginas del PDF...\n`);

  const allPrices = [];

  for (let i = 1; i <= totalPages; i++) {
    const results = await processPage(i);
    if (results.length > 0) {
      console.log(`✅ Página ${i}: ${results.length} productos`);
      for (const r of results) {
        console.log(`   ${r.sku} → $${r.precio.toLocaleString('es-AR')}`);
      }
      allPrices.push(...results);
    } else {
      console.log(`⏭️ Página ${i}: sin productos`);
    }
  }

  // Guardar resultados
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(allPrices, null, 2));

  console.log(`\n🎉 Total extraídos: ${allPrices.length} productos`);
  console.log(`💾 Guardado en: ${OUTPUT_JSON}`);
}

main().catch((err) => {
  console.error("💥 Error:", err);
  process.exit(1);
});
