/**
 * Genera catalogo-products.json desde las carpetas locales.
 * No requiere conexión a internet.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_DIR = "C:\\Users\\Mi Pc\\Desktop\\MERCADOLIBRE CUENTA NUEVA";
const OUTPUT = path.join(__dirname, "catalogo-products.json");

function extractSku(folderName) {
  const numMatch = folderName.match(/^(\d{3,8})\b/);
  if (numMatch) return numMatch[1];
  const maqMatch = folderName.match(/MAQJEEZ-([A-Z0-9\-]+)/i);
  if (maqMatch) return `MAQJEEZ-${maqMatch[1]}`;
  const msMatch = folderName.match(/^(MS\d+)/i);
  if (msMatch) return msMatch[1];
  const riMatch = folderName.match(/^(RI-\d+)/i);
  if (riMatch) return riMatch[1];
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

function detectarCategoria(sku, nombre) {
  const n = nombre.toLowerCase();
  const s = sku.toUpperCase();
  if (/^17|^RI-17/.test(s) || n.includes("desmalezadora") || n.includes("motoguadaña")) return "Desmalezadoras";
  if (/^16|^MS16/.test(s) || n.includes("motosierra") || n.includes("cadena") || n.includes("espada")) return "Motosierras";
  if (/^18/.test(s) || n.includes("generador") || n.includes("grupo") || n.includes("gn ") || n.includes("gx ")) return "Grupos Electrógenos";
  if (/^15/.test(s) || n.includes("compresor") || n.includes("cmp ")) return "Compresores";
  if (/^19|^20|^21/.test(s) && (n.includes("hidro") || n.includes("pistola") || n.includes("lanza") || n.includes("motobomba") || n.includes("bomba"))) return "Hidrolavadoras y Bombas";
  if (/^30|^31|^32/.test(s) || n.includes("riego") || n.includes("goteo") || n.includes("aspersor") || n.includes("valvula")) return "Riego";
  if (/^27/.test(s) || n.includes("hoyadora") || n.includes("mecha")) return "Hoyadoras";
  if (/^12|^10|^11/.test(s) || n.includes("filtro") || n.includes("fuelle") || n.includes("bobina")) return "Filtros y Bobinas";
  if (/^13|^22|^26/.test(s) || n.includes("carburador") || n.includes("carburacion")) return "Carburación";
  if (/^14/.test(s) || n.includes("adaptador") || n.includes("cadena") || n.includes("espada") || n.includes("cepillo") || n.includes("lima") || n.includes("kit") || n.includes("destornillador")) return "Accesorios y Herramientas";
  if (/^UC/.test(s)) return "Limpieza Ultrasónica";
  if (/^PM|^TK/.test(s) || n.includes("polea") || n.includes("correa")) return "Cortacésped y Tractores";
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

function findMainImage(folderPath) {
  const files = fs.readdirSync(folderPath).filter((f) => /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(f));
  if (files.length === 0) return null;
  const numbered = files
    .filter((f) => /imagen\s*\d+/i.test(f))
    .sort((a, b) => {
      const na = parseInt(a.match(/imagen\s*(\d+)/i)?.[1] || "0", 10);
      const nb = parseInt(b.match(/imagen\s*(\d+)/i)?.[1] || "0", 10);
      return na - nb;
    });
  if (numbered.length > 0) return path.join(folderPath, numbered[0]);
  let mainFile = files[0];
  let maxSize = 0;
  for (const f of files) {
    const s = fs.statSync(path.join(folderPath, f)).size;
    if (s > maxSize) { maxSize = s; mainFile = f; }
  }
  return path.join(folderPath, mainFile);
}

const folders = fs.readdirSync(BASE_DIR).filter((f) => fs.statSync(path.join(BASE_DIR, f)).isDirectory()).sort();
console.log(`📁 Carpetas encontradas: ${folders.length}`);

const products = [];
const seenSkus = new Set();
let ok = 0, skip = 0;

for (let i = 0; i < folders.length; i++) {
  const folder = folders[i];
  const folderPath = path.join(BASE_DIR, folder);
  const sku = extractSku(folder);
  if (!sku) { skip++; continue; }
  if (seenSkus.has(sku)) { skip++; continue; }
  const imagePath = findMainImage(folderPath);
  if (!imagePath) { skip++; continue; }
  const name = cleanProductName(folder, sku);
  const category = detectarCategoria(sku, name);
  seenSkus.add(sku);
  products.push({ sku, name, category, imagePath });
  ok++;
}

fs.writeFileSync(OUTPUT, JSON.stringify(products, null, 2));
console.log(`✅ ${ok} productos extraídos → ${OUTPUT}`);
console.log(`📊 Categorías:`);
const cats = {};
for (const p of products) cats[p.category] = (cats[p.category] || 0) + 1;
for (const [cat, n] of Object.entries(cats).sort((a, b) => b[1] - a[1])) console.log(`   ${cat}: ${n}`);
