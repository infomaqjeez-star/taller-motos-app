/**
 * Convierte las primeras 5 páginas del PDF a imágenes y hace OCR
 * para ver si contiene precios escaneados.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { fromPath } from "pdf2pic";
import Tesseract from "tesseract.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PDF_PATH = "C:\\Users\\Mi Pc\\Desktop\\CATALOGO MAQJEEZ 2026.pdf";
const TMP_DIR = path.join(__dirname, "..", "tmp");

async function main() {
  if (!fs.existsSync(PDF_PATH)) {
    console.error("❌ No se encontró el PDF:", PDF_PATH);
    process.exit(1);
  }

  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

  const converter = fromPath(PDF_PATH, {
    density: 150,
    format: "png",
    width: 1200,
    height: 1600,
    savePath: TMP_DIR,
    saveFilename: "page",
  });

  console.log("📄 Convirtiendo páginas 1-5 a imágenes...\n");

  for (let i = 1; i <= 5; i++) {
    try {
      const result = await converter(i);
      console.log(`✅ Página ${i} convertida:`, result.name);

      const imgPath = path.join(TMP_DIR, result.name);
      const { data: { text } } = await Tesseract.recognize(imgPath, "spa", { logger: () => {} });

      console.log(`📝 OCR página ${i}:\n${text.substring(0, 800)}\n---\n`);
    } catch (err) {
      console.log(`❌ Error página ${i}:`, err.message);
    }
  }
}

main().catch((err) => {
  console.error("💥 Error:", err);
  process.exit(1);
});
