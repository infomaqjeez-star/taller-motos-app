/**
 * Script de importación masiva de productos al catálogo MAQJEEZ
 * Recorre las carpetas de fotos, extrae SKU, nombre y categoría,
 * sube la primera imagen a Supabase Storage e inserta en catalog_products.
 *
 * Uso:
 *   node scripts/import-masivo-catalogo.mjs
 *
 * Requiere variables de entorno:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY (recomendado) o NEXT_PUBLIC_SUPABASE_ANON_KEY
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ─── Configuración ─────────────────────────────────────────── */
const BASE_DIR = "C:\\Users\\Mi Pc\\Desktop\\MERCADOLIBRE CUENTA NUEVA";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

/* ─── Helpers: SKU y nombre ─────────────────────────────────── */
function extractSku(folderName) {
  // Patrón numérico al inicio: 12201, 101201, 17002, etc.
  const numMatch = folderName.match(/^(\d{3,8})\b/);
  if (numMatch) return numMatch[1];

  // Patrón MAQJEEZ-000XXX
  const maqMatch = folderName.match(/MAQJEEZ-([A-Z0-9\-]+)/i);
  if (maqMatch) return `MAQJEEZ-${maqMatch[1]}`;

  // Patrón MS16xxx
  const msMatch = folderName.match(/^(MS\d+)/i);
  if (msMatch) return msMatch[1];

  // Patrón RI-17xxx
  const riMatch = folderName.match(/^(RI-\d+)/i);
  if (riMatch) return riMatch[1];

  // Patrón PM0x / TK00x
  const pmMatch = folderName.match(/^(PM|TK)\d+/i);
  if (pmMatch) return pmMatch[0].toUpperCase();

  return null;
}

function cleanProductName(folderName, sku) {
  let name = folderName
    .replace(new RegExp(`^${sku.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*[-–]\\s*`, "i"), "")
    .replace(/Madsjeez/gi, "MaQjeez")
    .replace(/Konecta/gi, "MaQjeez")
    .replace(/\s*\/\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
  return name;
}

/* ─── Categoría por prefijo ─────────────────────────────────── */
function detectarCategoria(sku, nombre) {
  const n = nombre.toLowerCase();
  const s = sku.toUpperCase();

  // Desmalezadoras / Motoguadañas
  if (/^17|^RI-17/.test(s) || n.includes("desmalezadora") || n.includes("motoguadaña")) return "Desmalezadoras";
  // Motosierras
  if (/^16|^MS16/.test(s) || n.includes("motosierra") || n.includes("cadena") || n.includes("espada")) return "Motosierras";
  // Grupos electrógenos / Motores estacionarios
  if (/^18/.test(s) || n.includes("generador") || n.includes("grupo") || n.includes("gn ") || n.includes("gx ")) return "Grupos Electrógenos";
  // Compresores
  if (/^15/.test(s) || n.includes("compresor") || n.includes("cmp ")) return "Compresores";
  // Hidrolavadoras
  if (/^19|^20|^21/.test(s) && (n.includes("hidro") || n.includes("pistola") || n.includes("lanza") || n.includes("motobomba") || n.includes("bomba"))) return "Hidrolavadoras y Bombas";
  // Riego
  if (/^30|^31|^32/.test(s) || n.includes("riego") || n.includes("goteo") || n.includes("aspersor") || n.includes("valvula")) return "Riego";
  // Hoyadoras
  if (/^27/.test(s) || n.includes("hoyadora") || n.includes("mecha")) return "Hoyadoras";
  // Filtros y respuestos varios Robin / Wacker
  if (/^12|^10|^11/.test(s) || n.includes("filtro") || n.includes("fuelle") || n.includes("bobina")) return "Filtros y Bobinas";
  // Carburación
  if (/^13|^22|^26/.test(s) || n.includes("carburador") || n.includes("carburacion")) return "Carburación";
  // Accesorios, afilado, herramientas
  if (/^14/.test(s) || n.includes("adaptador") || n.includes("cadena") || n.includes("espada") || n.includes("cepillo") || n.includes("lima") || n.includes("kit") || n.includes("destornillador")) return "Accesorios y Herramientas";
  // Limpieza / Ultrasonido
  if (/^UC/.test(s)) return "Limpieza Ultrasónica";
  // Poleas / Cortacésped
  if (/^PM|^TK/.test(s) || n.includes("polea") || n.includes("correa")) return "Cortacésped y Tractores";

  // Fallback por nombre
  if (n.includes("cuchilla")) return "Cuchillas";
  if (n.includes("embrague")) return "Embragues";
  if (n.includes("tapa") || n.includes("arranque")) return "Tapas y Arranque";
  if (n.includes("bujia")) return "Bujías";
  if (n.includes("aceite")) return "Aceites y Lubricantes";
  if (n.includes("bateria")) return "Baterías";
  if (n.includes("tanque")) return "Tanques";
  if (n.includes("manguera")) return "Mangueras";
  if (n.includes("piston") || n.includes("cilindro")) return "Cilindros y Pistones";

  return "Repuestos Varios";
}

/* ─── Helper: encontrar imagen principal ────────────────────── */
function findMainImage(folderPath) {
  const files = fs
    .readdirSync(folderPath)
    .filter((f) => /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(f));

  if (files.length === 0) return null;

  // Preferir "imagen 1", "imagen 2", etc.
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

/* ─── Subir a Supabase ──────────────────────────────────────── */
async function uploadImage(supabase, imagePath, sku) {
  const fileName = `catalog/${sku.replace(/[^a-zA-Z0-9\-]/g, "_")}.jpg`;
  const buffer = fs.readFileSync(imagePath);

  const { error: upErr } = await supabase.storage
    .from("catalog-images")
    .upload(fileName, buffer, {
      contentType: "image/jpeg",
      upsert: true,
    });

  if (upErr) {
    console.error(`  ❌ Storage error ${sku}:`, upErr.message);
    return null;
  }

  const { data: urlData } = supabase.storage.from("catalog-images").getPublicUrl(fileName);
  return urlData.publicUrl;
}

/* ─── Procesar una carpeta ──────────────────────────────────── */
async function processFolder(folderName, folderPath, seenSkus, supabase) {
  const sku = extractSku(folderName);
  if (!sku) {
    console.log(`  ❌ Sin SKU (saltando): ${folderName}`);
    return null;
  }

  if (seenSkus.has(sku)) {
    console.log(`  ⚠️ SKU duplicado: ${sku} — saltando`);
    return null;
  }

  const imagePath = findMainImage(folderPath);
  if (!imagePath) {
    console.log(`  ❌ Sin imagen — saltando: ${sku}`);
    return null;
  }

  const name = cleanProductName(folderName, sku);
  const category = detectarCategoria(sku, name);

  // Subir imagen
  process.stdout.write(`  📤 ${sku} → Storage...`);
  const imageUrl = await uploadImage(supabase, imagePath, sku);
  if (!imageUrl) {
    process.stdout.write(" FAIL\n");
    return null;
  }
  process.stdout.write(" OK\n");

  seenSkus.add(sku);
  return { sku, name, category, imageUrl };
}

/* ─── Main ──────────────────────────────────────────────────── */
async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("❌ Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Verificar bucket
  const { data: buckets } = await supabase.storage.listBuckets();
  const hasBucket = buckets?.some((b) => b.name === "catalog-images");
  if (!hasBucket) {
    console.error('❌ Bucket "catalog-images" no existe. Crearlo en Supabase → Storage → New bucket');
    process.exit(1);
  }

  const folders = fs
    .readdirSync(BASE_DIR)
    .filter((f) => {
      const fullPath = path.join(BASE_DIR, f);
      return fs.statSync(fullPath).isDirectory();
    })
    .sort();

  console.log(`📁 Carpetas encontradas: ${folders.length}\n`);

  const seenSkus = new Set();
  const products = [];
  let ok = 0;
  let skip = 0;

  for (let i = 0; i < folders.length; i++) {
    const folder = folders[i];
    const folderPath = path.join(BASE_DIR, folder);
    console.log(`[${String(i + 1).padStart(4, "0")}/${folders.length}] ${folder.substring(0, 60)}`);

    try {
      const prod = await processFolder(folder, folderPath, seenSkus, supabase);
      if (prod) {
        products.push(prod);
        ok++;
      } else {
        skip++;
      }
    } catch (err) {
      console.error(`  ❌ Error:`, err.message);
      skip++;
    }
  }

  console.log(`\n📊 Resumen: ${ok} productos válidos | ${skip} saltados`);
  console.log(`📤 Insertando ${products.length} en catalog_products...\n`);

  // Insertar en batches de 50
  const BATCH = 50;
  let inserted = 0;
  for (let i = 0; i < products.length; i += BATCH) {
    const batch = products.slice(i, i + BATCH).map((p) => ({
      sku: p.sku,
      name: p.name,
      catalog_price: 0,
      image_url: p.imageUrl,
      category: p.category,
      active: true,
    }));

    const { error } = await supabase
      .from("catalog_products")
      .upsert(batch, { onConflict: "sku" });

    if (error) {
      console.error(`  ❌ Batch ${i / BATCH + 1} error:`, error.message);
    } else {
      inserted += batch.length;
      console.log(`  ✅ Batch ${i / BATCH + 1}: ${batch.length} productos`);
    }
  }

  console.log(`\n🎉 Finalizado: ${inserted}/${products.length} productos importados.`);
  console.log(`📂 Total carpetas procesadas: ${folders.length}`);
}

main().catch((err) => {
  console.error("\n💥 Error fatal:", err);
  process.exit(1);
});
