/**
 * Script local para subir imágenes de productos a Supabase Storage.
 * Lee catalogo-products.json, codifica imágenes en base64 y las envía
 * al endpoint /api/catalogo/subir-imagenes en batches.
 *
 * Uso:
 *   cd apps/taller-demo
 *   node scripts/subir-imagenes-batch.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JSON_PATH = path.join(__dirname, "..", "data", "catalogo-products.json");
const API_URL = "https://appjeezpro.store/api/catalogo/subir-imagenes";
const AUTH = "Bearer maqjeez-images-2026";
const BATCH_SIZE = 10; // Enviar de a 10 imágenes por request

function getExt(filePath) {
  const ext = path.extname(filePath).toLowerCase().replace(".", "");
  if (["jpg", "jpeg"].includes(ext)) return "jpg";
  if (ext === "png") return "png";
  if (ext === "webp") return "webp";
  if (ext === "gif") return "gif";
  return "jpg";
}

async function sendBatch(items) {
  const body = JSON.stringify({ items });
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: AUTH,
    },
    body,
  });
  return res.json();
}

async function main() {
  if (!fs.existsSync(JSON_PATH)) {
    console.error("❌ No se encontró", JSON_PATH);
    process.exit(1);
  }

  const products = JSON.parse(fs.readFileSync(JSON_PATH, "utf-8"));
  console.log(`📁 Total productos: ${products.length}`);

  let uploaded = 0;
  let failed = 0;

  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);
    const items = [];

    for (const p of batch) {
      if (!p.imagePath || !fs.existsSync(p.imagePath)) {
        console.log(`  ⚠️ Sin imagen: ${p.sku}`);
        continue;
      }

      try {
        const buffer = fs.readFileSync(p.imagePath);
        const base64 = buffer.toString("base64");
        items.push({
          sku: p.sku,
          imageBase64: base64,
          ext: getExt(p.imagePath),
        });
      } catch (err) {
        console.log(`  ❌ Error leyendo ${p.sku}: ${err.message}`);
        failed++;
      }
    }

    if (items.length === 0) continue;

    console.log(`📤 Enviando batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(products.length / BATCH_SIZE)} (${items.length} imágenes)...`);

    try {
      const data = await sendBatch(items);
      if (data.success) {
        uploaded += data.uploaded || 0;
        failed += data.failed || 0;
        console.log(`  ✅ Subidas: ${data.uploaded}, ❌ Fallidas: ${data.failed}`);
      } else {
        console.log(`  ❌ Error del servidor:`, data.error);
        failed += items.length;
      }
    } catch (err) {
      console.log(`  ❌ Error de red:`, err.message);
      failed += items.length;
    }

    // Pequeña pausa entre batches para no saturar
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`\n🎉 Finalizado:`);
  console.log(`   ✅ Subidas: ${uploaded}`);
  console.log(`   ❌ Fallidas: ${failed}`);
  console.log(`   📊 Total: ${products.length}`);
}

main().catch((err) => {
  console.error("\n💥 Error fatal:", err);
  process.exit(1);
});
