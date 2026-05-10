/**
 * Lee el PDF del catálogo Maqjeez y extrae SKU + precio.
 */
import fs from "fs";
import PDFParser from "pdf2json";

const PDF_PATH = "C:\\Users\\Mi Pc\\Desktop\\CATALOGO MAQJEEZ 2026.pdf";

async function main() {
  if (!fs.existsSync(PDF_PATH)) {
    console.error("❌ No se encontró el PDF:", PDF_PATH);
    process.exit(1);
  }

  const pdfParser = new PDFParser();

  const result = await new Promise((resolve, reject) => {
    pdfParser.on("pdfParser_dataReady", (pdfData) => resolve(pdfData));
    pdfParser.on("pdfParser_dataError", (err) => reject(err));
    pdfParser.loadPDF(PDF_PATH);
  });

  console.log("📄 Páginas:", result.Pages.length);

  for (let i = 0; i < result.Pages.length; i++) {
    const page = result.Pages[i];
    const texts = page.Texts || [];
    if (texts.length === 0) continue;
    const line = texts.map((t) => decodeURIComponent(t.R?.[0]?.T || "")).join(" ");
    console.log(`\n--- Página ${i + 1} ---`);
    console.log(line.substring(0, 1500));
  }
}

main().catch((err) => {
  console.error("💥 Error:", err);
  process.exit(1);
});
