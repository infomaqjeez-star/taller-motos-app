import fitz
import re

PDF_PATH = r"C:\Users\Mi Pc\Desktop\Catalogo Abril 2026 Konecta Repuestos.pdf"

doc = fitz.open(PDF_PATH)
print(f"📄 Total páginas: {len(doc)}\n")

total_lines_checked = 0
total_skus_found = 0
all_skus = []

# Patrón más permisivo para SKU
SKU_PATTERNS = [
    r'\b\d{4,6}(?:-\d{1,3})?\b',  # 17002, 14019-2
    r'\bK\d{4,6}(?:-\d{1,3})?\b',  # K17005
    r'\bRI-\d{4,6}\b',  # RI-17042
    r'\bKR-\d{4,6}\b',  # KR-17001
    r'\b[A-Z]{2,3}-\d{4,6}(?:-\d{1,3})?\b',  # MAQ-0001
    r'\b[A-Z]{2,3}\d{4,6}\b',  # MAQ0001
]

for page_num in range(len(doc)):
    page = doc.load_page(page_num)
    text = page.get_text()
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    
    page_skus = []
    for line in lines:
        for pattern in SKU_PATTERNS:
            matches = re.findall(pattern, line)
            for m in matches:
                # Filtrar falsos positivos (números muy largos o fechas)
                if len(m) < 20 and not re.match(r'^\d{2}/\d{2}/\d{2}', m) and m not in page_skus:
                    page_skus.append(m)
    
    if page_skus:
        total_skus_found += len(page_skus)
        all_skus.extend(page_skus)
        print(f"Página {page_num+1}: {len(page_skus)} SKUs")

doc.close()

unique_skus = list(set(all_skus))
print(f"\n📊 Total SKUs encontrados (con duplicados): {total_skus_found}")
print(f"📊 SKUs únicos: {len(unique_skus)}")

# Mostrar muestra
print(f"\n📋 Primeros 20 SKUs:")
for sku in unique_skus[:20]:
    print(f"   {sku}")

print(f"\n📋 Últimos 20 SKUs:")
for sku in unique_skus[-20:]:
    print(f"   {sku}")
