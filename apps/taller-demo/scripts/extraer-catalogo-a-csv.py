import fitz
import csv
import re
import os

PDF_PATH = r"C:\Users\Mi Pc\Desktop\Catalogo Abril 2026 Konecta Repuestos.pdf"
OUTPUT_CSV = r"C:\Users\Mi Pc\Desktop\catalogo_konecta_repuestos.csv"

# Patrones
SKU_PATTERN = re.compile(r'^(?:RI-|KR-)?(?:[A-Z]{2,3}-)?(?:K?\d{4,6}(?:-\d{1,3})?)\b')
PRICE_PATTERN = re.compile(r'\$([\d.]+)')

def extract_products():
    doc = fitz.open(PDF_PATH)
    products = []
    
    print(f"📄 Procesando {len(doc)} páginas...\n")
    
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        text = page.get_text()
        lines = [l.strip() for l in text.split('\n') if l.strip()]
        
        i = 0
        while i < len(lines):
            line = lines[i]
            
            # Buscar línea que parezca un SKU
            sku_match = SKU_PATTERN.match(line)
            if sku_match and len(line) < 20:
                sku = line
                
                # El título está en las siguientes líneas (hasta encontrar precio o otro SKU)
                title_lines = []
                price = None
                j = i + 1
                
                while j < len(lines):
                    next_line = lines[j]
                    
                    # Si encontramos otro SKU, terminamos
                    if SKU_PATTERN.match(next_line) and len(next_line) < 20:
                        break
                    
                    # Buscar precio
                    price_match = PRICE_PATTERN.search(next_line)
                    if price_match:
                        price_str = price_match.group(1).replace('.', '')
                        price = int(price_str)
                        # El precio puede estar al final del título
                        title_part = PRICE_PATTERN.sub('', next_line).strip()
                        if title_part:
                            title_lines.append(title_part)
                        j += 1
                        break
                    else:
                        title_lines.append(next_line)
                    
                    j += 1
                
                if price and title_lines:
                    title = ' '.join(title_lines).strip()
                    # Limpiar título
                    title = re.sub(r'\s+', ' ', title)
                    products.append({
                        'sku': sku,
                        'titulo': title,
                        'precio': price
                    })
                
                i = j
            else:
                i += 1
        
        if (page_num + 1) % 10 == 0:
            print(f"  Página {page_num + 1}/{len(doc)} procesada...")
    
    doc.close()
    return products

def main():
    products = extract_products()
    
    print(f"\n🎉 Total productos extraídos: {len(products)}\n")
    
    # Guardar CSV
    with open(OUTPUT_CSV, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.DictWriter(f, fieldnames=['sku', 'titulo', 'precio'])
        writer.writeheader()
        for p in products:
            writer.writerow(p)
    
    print(f"💾 Guardado en: {OUTPUT_CSV}")
    print(f"\n📊 Primeros 10 productos:")
    for p in products[:10]:
        print(f"   {p['sku']} | ${p['precio']:,} | {p['titulo'][:60]}")

if __name__ == '__main__':
    main()
