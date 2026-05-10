/**
 * Extrae SKU + precio del PDF del catálogo.
 * Procesa el texto OCR completo de cada página buscando
 * patrones de SKU seguido de precio en líneas cercanas.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Tesseract from "tesseract.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PAGES_DIR = path.join(__dirname, "..", "tmp", "pdf-pages");
const OUTPUT_JSON = path.join(__dirname, "..", "tmp", "precios-pdf-v2.json");

const SKU_PATTERN = /\b([A-Z]{2,3}-\d{2,6}(?:-\d{1,3})?|K?\d{4,6}(?:-\d{1,3})?)\b/;
const PRICE_PATTERN = /\$([\d.]{3,10})/g;

function cleanSku(sku) {
  // Normalizar SKU
  return sku.replace(/^K0+/, 'K').replace(/^0+/, '');
}

function parsePrice(priceStr) {
  const val = parseInt(priceStr.replace(/\./g, ''), 10);
  return (val > 500 && val < 10000000) ? val : 0;
}

async function processPage(pageNum) {
  const imgPath = path.join(PAGES_DIR, `page_${String(pageNum).padStart(3, '0')}.png`);
  if (!fs.existsSync(imgPath)) return [];

  const { data } = await Tesseract.recognize(imgPath, 'spa', { logger: () => {} });
  const text = data.text;
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  const results = [];
  const seen = new Set();

  // Buscar SKU y precio en líneas cercanas (ventana de 5 líneas)
  for (let i = 0; i < lines.length; i++) {
    const skuMatch = lines[i].match(SKU_PATTERN);
    if (!skuMatch) continue;

    const sku = cleanSku(skuMatch[1]);
    if (seen.has(sku)) continue;

    // Buscar precio en las siguientes 5 líneas
    let price = 0;
    for (let j = i; j < Math.min(i + 6, lines.length); j++) {
      const priceMatches = [...lines[j].matchAll(PRICE_PATTERN)];
      for (const m of priceMatches) {
        const p = parsePrice(m[1]);
        if (p > price) price = p;
      }
    }

    if (price > 0) {
      seen.add(sku);
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
  const seenSkus = new Set();

  for (let i = 1; i <= totalPages; i++) {
    const results = await processPage(i);

    if (results.length > 0) {
      console.log(`✅ Página ${i}: ${results.length} productos`);
      for (const r of results) {
        if (!seenSkus.has(r.sku)) {
          seenSkus.add(r.sku);
          allPrices.push(r);
          console.log(`   ${r.sku} → $${r.precio.toLocaleString('es-AR')}`);
        }
      }
    }
  }

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(allPrices, null, 2));

  console.log(`\n🎉 Total únicos: ${allPrices.length} productos`);
  console.log(`💾 Guardado en: ${OUTPUT_JSON}`);
}

main().catch((err) => {
  console.error("💥 Error:", err);
  process.exit(1);
});
