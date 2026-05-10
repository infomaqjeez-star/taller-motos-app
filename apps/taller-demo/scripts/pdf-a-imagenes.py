"""
Convierte cada página del PDF del catálogo a imágenes PNG usando PyMuPDF.
"""
import fitz
import os

PDF_PATH = r"C:\Users\Mi Pc\Desktop\CATALOGO MAQJEEZ 2026.pdf"
OUTPUT_DIR = r"C:\Users\Mi Pc\CascadeProjects\taller-motos-app\apps\taller-demo\tmp\pdf-pages"

os.makedirs(OUTPUT_DIR, exist_ok=True)

doc = fitz.open(PDF_PATH)
print(f"📄 Total páginas: {len(doc)}")

for i in range(len(doc)):
    page = doc.load_page(i)
    # Renderizar a imagen con buena calidad (150 DPI)
    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
    img_path = os.path.join(OUTPUT_DIR, f"page_{i+1:03d}.png")
    pix.save(img_path)
    print(f"  ✅ Página {i+1}/{len(doc)} → {img_path}")

doc.close()
print(f"\n🎉 {len(doc)} páginas convertidas en {OUTPUT_DIR}")
