import fitz

PDF_PATH = r"C:\Users\Mi Pc\Desktop\Catalogo Abril 2026 Konecta Repuestos.pdf"
doc = fitz.open(PDF_PATH)

print(f"📄 Páginas: {len(doc)}")

# Verificar si tiene texto seleccionable
for i in range(min(5, len(doc))):
    page = doc.load_page(i)
    text = page.get_text()
    print(f"\n--- Página {i+1} (primeros 500 chars) ---")
    print(text[:500])

doc.close()
