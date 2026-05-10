/**
 * Script de importación masiva de productos al catálogo MAQJEEZ
 * Recorre las carpetas de fotos, extrae SKU y precio vía OCR,
 * genera imagen sin precio y sube todo a Supabase.
 *
 * Uso:
 *   node scripts/import-catalog.mjs
 *
 * Requiere variables de entorno:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import Tesseract from "tesseract.js";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ─── Configuración ─────────────────────────────────────────── */
const BASE_DIR = "C:\\Users\\Mi Pc\\Desktop\\MERCADOLIBRE CUENTA NUEVA";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

/* ─── Helpers: SKU y nombre ─────────────────────────────────── */
function extractSku(folderName) {
  // Patrón numérico al inicio: 12201, 101201, etc.
  const numMatch = folderName.match(/^(\d{3,8})\b/);
  if (numMatch) return numMatch[1];

  // Patrón MAQJEEZ-000XXX o MAQJEEZ-XXXXXX
  const maqMatch = folderName.match(/MAQJEEZ-([A-Z0-9\-]+)/i);
  if (maqMatch) return maqMatch[1];

  return null;
}

function cleanProductName(folderName, sku) {
  return folderName
    .replace(new RegExp(`^${sku}\\s*[-–]\\s*`, "i"), "")
    .replace(/Madsjeez/gi, "MaQjeez")
    .replace(/Konecta/gi, "MaQjeez")
    .replace(/\s+/g, " ")
    .trim();
}

/* ─── Helper: extraer precio del texto OCR ──────────────────── */
function extractPrice(ocrText) {
  const text = ocrText.toLowerCase();
  const patterns = [
    /\$\s?([\d.,]+)/g,                    // $1.234,56 o $1234
    /([\d.,]+)\s*(?:pesos|ars)/gi,         // 1234 pesos
    /precio[:\s]*([\d.,]+)/gi,             // precio: 1234
    /costo[:\s]*([\d.,]+)/gi,              // costo: 1234
  ];

  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern)];
    for (const match of matches) {
      const raw = match[1].replace(/\./g, "").replace(/,/g, ".");
      const price = parseFloat(raw);
      if (price >= 50 && price <= 10_000_000) return Math.round(price);
    }
  }
  return null;
}

/* ─── Helper: encontrar imagen principal ──────────────────────── */
function findMainImage(folderPath) {
  const files = fs
    .readdirSync(folderPath)
    .filter((f) => /\.(jpg|jpeg|png|webp|gif)$/i.test(f));

  if (files.length === 0) return null;

  // Preferir "imagen 1", "imagen 2", etc. y tomar la primera
  const numbered = files
    .filter((f) => /imagen\s*\d+/i.test(f))
    .sort((a, b) => {
      const na = parseInt(a.match(/imagen\s*(\d+)/i)?.[1] || "0", 10);
      const nb = parseInt(b.match(/imagen\s*(\d+)/i)?.[1] || "0", 10);
      return na - nb;
    });

  if (numbered.length > 0) return path.join(folderPath, numbered[0]);

  // Fallback: archivo más grande
  let mainFile = files[0];
  let maxSize = 0;
  for (const f of files) {
    const s = fs.statSync(path.join(folderPath, f)).size;
    if (s > maxSize) {
      maxSize = s;
      mainFile = f;
    }
  }
  return path.join(folderPath, mainFile);
}

/* ─── Helper: generar imagen sin precio ──────────────────────── */
async function removePriceFromImage(imagePath, ocrResult) {
  const image = sharp(imagePath);
  const { width, height } = await image.metadata();
  if (!width || !height) throw new Error("No se pudo leer metadata de la imagen");

  // Buscar palabras que parecen precio ($ o números grandes)
  const priceWords = ocrResult.data.words.filter((w) => {
    const t = w.text.toLowerCase();
    return t.includes("$") || /^\d{3,}(?:[.,]\d+)?$/.test(t.replace(/\s/g, ""));
  });

  if (priceWords.length === 0) {
    // Fallback: crop inferior 12 % (donde suele estar el precio)
    return image
      .extract({
        left: 0,
        top: 0,
        width,
        height: Math.floor(height * 0.88),
      })
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();
  }

  // Bounding box del precio + padding
  const pad = 12;
  const x0 = Math.max(0, Math.min(...priceWords.map((w) => w.bbox.x0)) - pad);
  const y0 = Math.max(0, Math.min(...priceWords.map((w) => w.bbox.y0)) - pad);
  const x1 = Math.min(width, Math.max(...priceWords.map((w) => w.bbox.x1)) + pad);
  const y1 = Math.min(height, Math.max(...priceWords.map((w) => w.bbox.y1)) + pad);

  const wBox = x1 - x0;
  const hBox = y1 - y0;

  // Overlay blanco simple (inpainting básico)
  const svgOverlay = Buffer.from(
    `<svg width="${wBox}" height="${hBox}"><rect width="100%" height="100%" fill="white"/></svg>`
  );

  return image
    .composite([{ input: svgOverlay, left: x0, top: y0 }])
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();
}

/* ─── Procesar una carpeta ──────────────────────────────────── */
async function processFolder(folderName, folderPath, seenSkus) {
  const sku = extractSku(folderName);
  if (!sku) {
    console.log(`  ❌ Sin SKU (saltando)`);
    return null;
  }

  if (seenSkus.has(sku)) {
    console.log(`  ⚠️ SKU duplicado: ${sku} — saltando`);
    return null;
  }

  const imagePath = findMainImage(folderPath);
  if (!imagePath) {
    console.log(`  ❌ Sin imagen — saltando`);
    return null;
  }

  // OCR
  process.stdout.write(`  🔍 OCR...`);
  const ocrResult = await Tesseract.recognize(imagePath, "spa", {
    logger: () => {}, // silencioso
  });
  process.stdout.write(" OK\n");

  const price = extractPrice(ocrResult.data.text);
  if (!price) {
    console.log(`  ⚠️ Sin precio detectado en OCR`);
    console.log(`     Texto: ${ocrResult.data.text.substring(0, 120)}...`);
    return null;
  }

  const catalogPrice = price * 4;
  const name = cleanProductName(folderName, sku);

  // Generar imagen limpia
  process.stdout.write(`  🎨 Limpieza...`);
  const cleanImage = await removePriceFromImage(imagePath, ocrResult);
  process.stdout.write(" OK\n");

  console.log(`  ✅ ${sku} | $${price} → $${catalogPrice} | ${name}`);

  seenSkus.add(sku);
  return { sku, name, originalPrice: price, catalogPrice, cleanImage };
}

/* ─── Subir a Supabase ──────────────────────────────────────── */
async function uploadProduct(product, supabase) {
  const fileName = `catalog/${product.sku}.jpg`;

  const { error: upErr } = await supabase.storage
    .from("catalog-images")
    .upload(fileName, product.cleanImage, {
      contentType: "image/jpeg",
      upsert: true,
    });

  if (upErr) {
    console.error(`  ❌ Storage error ${product.sku}:`, upErr.message);
    return false;
  }

  const { data: urlData } = supabase.storage
    .from("catalog-images")
    .getPublicUrl(fileName);

  const { error: dbErr } = await supabase
    .from("catalog_products")
    .upsert(
      {
        sku: product.sku,
        name: product.name,
        original_price: product.originalPrice,
        catalog_price: product.catalogPrice,
        image_url: urlData.publicUrl,
        category: "Repuestos",
        active: true,
      },
      { onConflict: "sku" }
    );

  if (dbErr) {
    console.error(`  ❌ DB error ${product.sku}:`, dbErr.message);
    return false;
  }

  return true;
}

/* ─── Main ──────────────────────────────────────────────────── */
async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("❌ Falta NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Verificar bucket
  const { data: buckets } = await supabase.storage.listBuckets();
  const hasBucket = buckets?.some((b) => b.name === "catalog-images");
  if (!hasBucket) {
    console.error('❌ Bucket "catalog-images" no existe en Supabase Storage.');
    console.error("   Crearlo desde el panel de Supabase → Storage → New bucket");
    process.exit(1);
  }

  const folders = fs
    .readdirSync(BASE_DIR)
    .filter((f) => fs.statSync(path.join(BASE_DIR, f)).isDirectory())
    .sort();

  console.log(`📁 Carpetas encontradas: ${folders.length}\n`);

  const seenSkus = new Set();
  const products = [];
  let ok = 0;
  let skip = 0;

  for (let i = 0; i < folders.length; i++) {
    const folder = folders[i];
    const folderPath = path.join(BASE_DIR, folder);
    console.log(`[${String(i + 1).padStart(4, "0")}/${folders.length}] ${folder}`);

    try {
      const prod = await processFolder(folder, folderPath, seenSkus);
      if (prod) {
        products.push(prod);
        ok++;
      } else {
        skip++;
      }
    } catch (err) {
      console.error(`  ❌ Error procesando:`, err.message);
      skip++;
    }
    console.log(""); // línea en blanco
  }

  console.log(`📊 Resumen filtrado: ${ok} productos válidos | ${skip} saltados\n`);
  console.log(`📤 Subiendo ${products.length} productos a Supabase...\n`);

  let uploaded = 0;
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    process.stdout.write(`[${String(i + 1).padStart(4, "0")}/${products.length}] ${p.sku} `);
    const success = await uploadProduct(p, supabase);
    if (success) {
      uploaded++;
      process.stdout.write("✅\n");
    } else {
      process.stdout.write("❌\n");
    }
  }

  console.log(`\n🎉 Importación finalizada: ${uploaded}/${products.length} subidos con éxito.`);
}

main().catch((err) => {
  console.error("\n💥 Error fatal:", err);
  process.exit(1);
});
