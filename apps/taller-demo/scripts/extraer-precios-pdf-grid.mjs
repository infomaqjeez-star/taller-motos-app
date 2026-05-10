/**
 * Extrae SKU + precio del PDF del catálogo.
 * Divide cada página en una cuadrícula de celdas (3 cols x 3-4 filas)
 * y hace OCR a cada celda individualmente para mayor precisión.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Tesseract from "tesseract.js";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PAGES_DIR = path.join(__dirname, "..", "tmp", "pdf-pages");
const OUTPUT_JSON = path.join(__dirname, "..", "tmp", "precios-pdf.json");
const CELLS_DIR = path.join(__dirname, "..", "tmp", "pdf-cells");

// Crear directorio para celdas
if (!fs.existsSync(CELLS_DIR)) fs.mkdirSync(CELLS_DIR, { recursive: true });

const SKU_REGEX = /\b([A-Z]{2,3}-\d{2,6}-?\d{0,3}|K?\d{4,6}-?\d{0,3})\b/;
const PRICE_REGEX = /\$([\d.]+)/;

async function processCell(cellPath) {
  try {
    const { data } = await Tesseract.recognize(cellPath, 'spa', { logger: () => {} });
    const text = data.text;

    const skuMatch = text.match(SKU_REGEX);
    const priceMatches = [...text.matchAll(/\$([\d.]+)/g)];

    let price = 0;
    if (priceMatches.length > 0) {
      // Tomar el precio más grande (evitar cantidades pequeñas)
      const prices = priceMatches.map(m => {
        const val = parseInt(m[1].replace(/\./g, ''), 10);
        return val;
      }).filter(p => p > 500 && p < 10000000);
      if (prices.length > 0) price = Math.max(...prices);
    }

    return { sku: skuMatch ? skuMatch[1] : null, price, text: text.substring(0, 200) };
  } catch {
    return { sku: null, price: 0 };
  }
}

async function processPage(pageNum, metadata) {
  const imgPath = path.join(PAGES_DIR, `page_${String(pageNum).padStart(3, '0')}.png`);
  if (!fs.existsSync(imgPath)) return [];

  const img = sharp(imgPath);
  const { width, height } = await img.metadata();

  // Calcular coordenadas de celdas
  // Margen superior para ignorar encabezados
  const topMargin = metadata?.hasHeader ? Math.floor(height * 0.12) : 0;
  const usableHeight = height - topMargin;

  const cols = 3;
  const cellWidth = Math.floor(width / cols);
  // Aproximadamente 3-4 productos por columna
  const rows = metadata?.rows || 3;
  const cellHeight = Math.floor(usableHeight / rows);

  const results = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const left = col * cellWidth;
      const top = topMargin + (row * cellHeight);
      const w = cellWidth - 10; // pequeño margen
      const h = cellHeight - 10;

      const cellPath = path.join(CELLS_DIR, `p${pageNum}_r${row}_c${col}.png`);

      try {
        await img
          .extract({ left, top, width: w, height: h })
          .toFile(cellPath);

        const result = await processCell(cellPath);
        if (result.sku && result.price > 0) {
          // Validar SKU contra catálogo
          results.push({
            sku: result.sku,
            precio: result.price,
            page: pageNum,
            cell: `${row},${col}`
          });
        }
      } catch {
        // Celda fuera de límites, ignorar
      }
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
    // Detectar si la página tiene encabezado (páginas 1-4 son índice/portada)
    const hasHeader = i <= 4;
    const rows = i <= 4 ? 2 : 4;

    const results = await processPage(i, { hasHeader, rows });

    if (results.length > 0) {
      console.log(`✅ Página ${i}: ${results.length} productos`);
      for (const r of results) {
        if (!seenSkus.has(r.sku)) {
          seenSkus.add(r.sku);
          allPrices.push(r);
          console.log(`   ${r.sku} → $${r.precio.toLocaleString('es-AR')}`);
        }
      }
    } else {
      console.log(`⏭️ Página ${i}: sin productos`);
    }
  }

  // Guardar resultados
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(allPrices, null, 2));

  console.log(`\n🎉 Total únicos: ${allPrices.length} productos`);
  console.log(`💾 Guardado en: ${OUTPUT_JSON}`);
}

main().catch((err) => {
  console.error("💥 Error:", err);
  process.exit(1);
});
