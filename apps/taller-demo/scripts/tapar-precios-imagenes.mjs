/**
 * Procesa imágenes locales para tapar precios visibles con rectángulos blancos.
 * Usa Tesseract.js (OCR + bboxes) + Sharp para dibujar rectángulos.
 * Sube imágenes procesadas a Supabase Storage.
 *
 * Uso:
 *   cd apps/taller-demo
 *   node scripts/tapar-precios-imagenes.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Tesseract from "tesseract.js";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_DIR = "C:\\Users\\Mi Pc\\Desktop\\MERCADOLIBRE CUENTA NUEVA";
const JSON_PATH = path.join(__dirname, "..", "data", "catalogo-products.json");
const UPLOAD_URL = "https://appjeezpro.store/api/catalogo/subir-imagenes";
const AUTH_IMG = "Bearer maqjeez-images-2026";
const BATCH_SIZE = 10;

function isPriceWord(word) {
  const text = word.text.trim();
  if (!text) return false;
  // Patrones de precio: $12345, 12.345, etc.
  if (/^\$?[\d.,]+$/.test(text)) {
    const num = parseInt(text.replace(/[^\d]/g, ""), 10);
    return num > 500 && num < 1_000_000;
  }
  return false;
}

async function processImage(imagePath) {
  try {
    // 1. OCR con bboxes
    const { data } = await Tesseract.recognize(imagePath, "spa", {
      logger: () => {},
    });

    const words = data.words || [];
    const priceWords = words.filter(isPriceWord);

    if (priceWords.length === 0) {
      return { hasPrice: false, buffer: null };
    }

    // 2. Leer imagen con Sharp
    const img = sharp(imagePath);
    const metadata = await img.metadata();
    const width = metadata.width || 800;
    const height = metadata.height || 800;

    // 3. Crear SVG con rectángulos blancos sobre los precios
    const rects = priceWords.map((w) => {
      const bx = w.bbox;
      return `<rect x="${bx.x0}" y="${bx.y0}" width="${bx.x1 - bx.x0}" height="${bx.y1 - bx.y0}" fill="white" />`;
    });

    const svg = Buffer.from(
      `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${rects.join("")}</svg>`
    );

    // 4. Componer: imagen original + rectángulos blancos
    const processed = await img
      .composite([{ input: svg, top: 0, left: 0 }])
      .jpeg({ quality: 85 })
      .toBuffer();

    return { hasPrice: true, buffer: processed, count: priceWords.length };
  } catch (err) {
    console.log(`  ⚠️ Error procesando ${path.basename(imagePath)}: ${err.message}`);
    return { hasPrice: false, buffer: null };
  }
}

async function uploadImage(sku, buffer, ext) {
  const base64 = buffer.toString("base64");
  try {
    const res = await fetch(UPLOAD_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: AUTH_IMG,
      },
      body: JSON.stringify({ items: [{ sku, imageBase64: base64, ext }] }),
    });
    const data = await res.json();
    return data.success && data.results?.[0]?.ok;
  } catch {
    return false;
  }
}

async function main() {
  const products = JSON.parse(fs.readFileSync(JSON_PATH, "utf-8"));
  console.log(`📁 Total productos: ${products.length}`);
  console.log("🎨 Procesando imágenes para tapar precios visibles...\n");

  let processed = 0;
  let withPrice = 0;
  let uploaded = 0;

  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);
    const items = [];

    for (const p of batch) {
      if (!p.imagePath || !fs.existsSync(p.imagePath)) continue;

      const { hasPrice, buffer, count } = await processImage(p.imagePath);
      processed++;

      if (hasPrice && buffer) {
        withPrice++;
        console.log(`✅ ${p.sku}: tapados ${count} precio(s)`);
        const ext = path.extname(p.imagePath).replace(".", "") || "jpg";
        const ok = await uploadImage(p.sku, buffer, ext);
        if (ok) {
          uploaded++;
          console.log(`  📤 Subida OK`);
        } else {
          console.log(`  ❌ Error subiendo`);
        }
      } else {
        console.log(`⏭️ ${p.sku}: sin precio detectado`);
      }
    }

    console.log(`\n--- Procesados ${processed}/${products.length} (con precio: ${withPrice}, subidas: ${uploaded}) ---\n`);
  }

  console.log(`\n🎉 Finalizado:`);
  console.log(`   Imágenes procesadas: ${processed}`);
  console.log(`   Con precio tapado: ${withPrice}`);
  console.log(`   Subidas exitosas: ${uploaded}`);
}

main().catch((err) => {
  console.error("\n💥 Error fatal:", err);
  process.exit(1);
});
