import fitz
import re
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor, white, black
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

PDF_INPUT = r"C:\Users\Mi Pc\Desktop\Catalogo Abril 2026 Konecta Repuestos.pdf"
OUTPUT_PDF = r"C:\Users\Mi Pc\Desktop\Catalogo_Maqjeez_2026_Completo.pdf"
OUTPUT_CSV = r"C:\Users\Mi Pc\Desktop\catalogo_maqjeez_completo.csv"

def round_price_99(n):
    if n <= 0:
        return 0
    if n < 100:
        return max(49, (int(n / 10) + 1) * 10 - 1)
    if n < 1000:
        return (int(n / 100) + 1) * 100 - 1
    if n < 10000:
        return (int(n / 1000) + 1) * 1000 - 1
    if n < 100000:
        return (int(n / 1000) + 1) * 1000 - 1
    return (int(n / 10000) + 1) * 10000 - 1


def is_sku(text):
    """Detecta si un texto parece ser un SKU."""
    text = text.strip()
    if len(text) < 3 or len(text) > 20:
        return False
    # Patrones de SKU
    patterns = [
        r'^\d{4,6}(-\d{1,3})?$',  # 17002, 14019-2
        r'^K\d{4,6}(-\d{1,3})?$',  # K17005
        r'^RI-\d{4,6}$',  # RI-17042
        r'^KR-\d{4,6}$',  # KR-17001
        r'^KS\d{4,6}(-\d{1,3})?$',  # KS17037
        r'^KH\d{4,6}(-\d{1,3})?$',  # KH16053
        r'^MS\d{4,6}(-\d{1,3})?$',  # MS16071
        r'^[A-Z]{2,4}\d{4,6}(-\d{1,3})?$',  # GT2000, etc.
        r'^[A-Z]{2,3}-\d{4,6}(-\d{1,3})?$',  # MAQ-0001
    ]
    for p in patterns:
        if re.match(p, text):
            return True
    return False


def extract_products():
    doc = fitz.open(PDF_INPUT)
    products = []
    seen_skus = set()
    
    PRICE_PATTERN = re.compile(r'\$([\d.]+)')
    
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        text = page.get_text()
        lines = [l.strip() for l in text.split('\n') if l.strip()]
        
        # Detectar categoría
        category = "GENERAL"
        for line in lines[:10]:
            line_upper = line.upper()
            if 'DESMALEZADORA' in line_upper:
                category = "DESMALEZADORAS"
                break
            elif 'MOTOSIERRA' in line_upper:
                category = "MOTOSIERRAS"
                break
            elif 'CORTA CESPED' in line_upper or 'CORTACESP' in line_upper:
                category = "CORTACÉSPED"
                break
            elif 'GRUPO ELECTROGENO' in line_upper or 'ELECTROGENO' in line_upper:
                category = "GRUPOS ELECTRÓGENOS"
                break
            elif 'COMPRESOR' in line_upper:
                category = "COMPRESORES"
                break
            elif 'HIDROLAVADORA' in line_upper:
                category = "HIDROLAVADORAS"
                break
            elif 'RIEGO' in line_upper:
                category = "RIEGO"
                break
            elif 'SOLDADORA' in line_upper:
                category = "SOLDADORAS"
                break
            elif 'HERRAMIENTA' in line_upper:
                category = "HERRAMIENTAS"
                break
            elif 'MOTOBOMBA' in line_upper:
                category = "MOTOBOMBAS"
                break
            elif 'HOYADORA' in line_upper:
                category = "HOYADORAS"
                break
            elif 'CORTADORA' in line_upper and 'CEsped' in line_upper:
                category = "CORTADORAS"
                break
            elif ('VARIAS' in line_upper or 'VARIOS' in line_upper) and 'PRODUCTO' not in line_upper and 'INSUMO' not in line_upper:
                category = "VARIOS"
                break
            elif 'INSUMO' in line_upper:
                category = "INSUMOS"
                break
            elif 'BATERIA' in line_upper or 'BATERíA' in line_upper:
                category = "BATERÍAS"
                break
            elif 'SOPLO' in line_upper:
                category = "SOPLADORAS"
                break
        
        i = 0
        while i < len(lines):
            line = lines[i]
            
            # ¿Es esta línea un SKU?
            if is_sku(line):
                sku = line
                if sku in seen_skus:
                    i += 1
                    continue
                
                title_lines = []
                price = None
                j = i + 1
                
                while j < len(lines):
                    next_line = lines[j]
                    # Si encontramos otro SKU, terminamos
                    if is_sku(next_line):
                        break
                    
                    # Buscar precio
                    price_match = PRICE_PATTERN.search(next_line)
                    if price_match:
                        price_str = price_match.group(1).replace('.', '')
                        try:
                            price = int(price_str)
                        except:
                            price = 0
                        # Limpiar precio del título
                        title_part = PRICE_PATTERN.sub('', next_line).strip()
                        if title_part and ('|' in title_part or len(title_part) > 3):
                            title_lines.append(title_part)
                        j += 1
                        break
                    else:
                        # Acumular líneas de título
                        if len(next_line) > 2 and not next_line.startswith('$'):
                            title_lines.append(next_line)
                    
                    j += 1
                    # Límite de líneas a buscar
                    if j > i + 8:
                        break
                
                if price and price > 100 and title_lines:
                    title = ' '.join(title_lines).strip()
                    title = re.sub(r'\s+', ' ', title)
                    # Reemplazar Konecta/Konecta por Maqjeez
                    title = title.replace('Konecta', 'Maqjeez').replace('KONECTA', 'MAQJEEZ')
                    title = title.replace('konecta', 'Maqjeez')
                    
                    catalog_price = round_price_99(price * 4)
                    
                    seen_skus.add(sku)
                    products.append({
                        'sku': sku,
                        'titulo': title,
                        'precio_base': price,
                        'precio_catalogo': catalog_price,
                        'categoria': category
                    })
                
                i = j
            else:
                i += 1
    
    doc.close()
    return products


def create_pdf(products):
    doc = SimpleDocTemplate(
        OUTPUT_PDF,
        pagesize=A4,
        rightMargin=12*mm,
        leftMargin=12*mm,
        topMargin=12*mm,
        bottomMargin=12*mm
    )
    
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'CatalogTitle',
        parent=styles['Heading1'],
        fontSize=32,
        textColor=HexColor('#1E3A8A'),
        alignment=TA_CENTER,
        spaceAfter=10,
        fontName='Helvetica-Bold'
    )
    
    subtitle_style = ParagraphStyle(
        'CatalogSubtitle',
        parent=styles['Normal'],
        fontSize=11,
        textColor=HexColor('#666666'),
        alignment=TA_CENTER,
        spaceAfter=25
    )
    
    category_style = ParagraphStyle(
        'CategoryTitle',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=white,
        backColor=HexColor('#1E3A8A'),
        alignment=TA_LEFT,
        spaceAfter=8,
        spaceBefore=12,
        leftIndent=5,
        rightIndent=5,
        leading=20,
        fontName='Helvetica-Bold'
    )
    
    sku_style = ParagraphStyle(
        'SKUStyle',
        parent=styles['Normal'],
        fontSize=8,
        textColor=HexColor('#1E3A8A'),
        fontName='Helvetica-Bold',
        leading=10
    )
    
    desc_style = ParagraphStyle(
        'DescStyle',
        parent=styles['Normal'],
        fontSize=7,
        textColor=HexColor('#333333'),
        leading=10
    )
    
    price_style = ParagraphStyle(
        'PriceStyle',
        parent=styles['Normal'],
        fontSize=9,
        textColor=HexColor('#FF5722'),
        fontName='Helvetica-Bold',
        alignment=TA_RIGHT,
        leading=10
    )
    
    elements = []
    
    # Portada
    elements.append(Spacer(1, 70*mm))
    elements.append(Paragraph("MAQJEEZ", title_style))
    elements.append(Paragraph("CATÁLOGO DE REPUESTOS 2026", subtitle_style))
    elements.append(Spacer(1, 15*mm))
    elements.append(Paragraph(
        f"<b>{len(products)}</b> productos",
        ParagraphStyle('Info', parent=styles['Normal'], fontSize=10, alignment=TA_CENTER, textColor=HexColor('#666666'))
    ))
    elements.append(PageBreak())
    
    # Agrupar por categoría
    from collections import OrderedDict
    from collections import defaultdict
    categories = defaultdict(list)
    for p in products:
        categories[p['categoria']].append(p)
    
    # Ordenar categorías
    category_order = [
        "DESMALEZADORAS", "MOTOSIERRAS", "CORTACÉSPED", "CORTADORAS",
        "GRUPOS ELECTRÓGENOS", "COMPRESORES", "HIDROLAVADORAS", "MOTOBOMBAS",
        "RIEGO", "SOLDADORAS", "HERRAMIENTAS", "HOYADORAS", "SOPLADORAS",
        "BATERÍAS", "INSUMOS", "VARIOS", "GENERAL"
    ]
    
    sorted_categories = OrderedDict()
    for cat in category_order:
        if cat in categories:
            sorted_categories[cat] = categories[cat]
    # Agregar categorías no listadas
    for cat, items in categories.items():
        if cat not in sorted_categories:
            sorted_categories[cat] = items
    
    # Productos por categoría
    for cat, items in sorted_categories.items():
        elements.append(Paragraph(f"  {cat}  ({len(items)})", category_style))
        elements.append(Spacer(1, 3*mm))
        
        # Tabla de productos: 3 columnas
        table_data = []
        row = []
        
        for idx, p in enumerate(items):
            sku_text = f"<b>{p['sku']}</b>"
            price_text = f"${p['precio_catalogo']:,}".replace(',', '.')
            
            cell = [
                Paragraph(sku_text, sku_style),
                Spacer(1, 1*mm),
                Paragraph(p['titulo'][:70] + ('...' if len(p['titulo']) > 70 else ''), desc_style),
                Spacer(1, 1*mm),
                Paragraph(price_text, price_style)
            ]
            row.append(cell)
            
            if len(row) == 3:
                table_data.append(row)
                row = []
        
        if row:
            while len(row) < 3:
                row.append('')
            table_data.append(row)
        
        if table_data:
            table = Table(table_data, colWidths=[57*mm, 57*mm, 57*mm])
            table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('LEFTPADDING', (0, 0), (-1, -1), 5),
                ('RIGHTPADDING', (0, 0), (-1, -1), 5),
                ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#E0E0E0')),
                ('BACKGROUND', (0, 0), (-1, -1), white),
                ('ROWBACKGROUNDS', (0, 0), (-1, -1), [white, HexColor('#F8F8F8')]),
            ]))
            elements.append(table)
        
        elements.append(Spacer(1, 5*mm))
    
    doc.build(elements)
    print(f"✅ PDF generado: {OUTPUT_PDF}")


def save_csv(products):
    import csv
    with open(OUTPUT_CSV, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.DictWriter(f, fieldnames=['sku', 'titulo', 'precio_base', 'precio_catalogo', 'categoria'])
        writer.writeheader()
        for p in products:
            writer.writerow(p)
    print(f"✅ CSV guardado: {OUTPUT_CSV}")


def main():
    print("🔍 Extrayendo TODOS los productos del PDF...")
    products = extract_products()
    
    if not products:
        print("❌ No se encontraron productos")
        return
    
    print(f"\n🎉 {len(products)} productos extraídos")
    
    # Contar por categoría
    from collections import Counter
    cats = Counter(p['categoria'] for p in products)
    print(f"\n📊 Por categoría:")
    for cat, count in cats.most_common():
        print(f"   {cat}: {count}")
    
    print(f"\n📊 Muestra de productos:")
    for p in products[:5]:
        print(f"   {p['sku']} | ${p['precio_base']:,} -> ${p['precio_catalogo']:,} | {p['titulo'][:50]}")
    
    print(f"\n📄 Generando PDF...")
    create_pdf(products)
    
    print(f"\n💾 Guardando CSV...")
    save_csv(products)
    
    print(f"\n🎉 ¡LISTO! {len(products)} productos en el catálogo Maqjeez")

if __name__ == '__main__':
    main()
