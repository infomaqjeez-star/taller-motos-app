import fitz
import csv
import re
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor, white, black
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

PDF_INPUT = r"C:\Users\Mi Pc\Desktop\Catalogo Abril 2026 Konecta Repuestos.pdf"
OUTPUT_PDF = r"C:\Users\Mi Pc\Desktop\Catalogo_Maqjeez_2026.pdf"

def round_price_99(n):
    """Redondeo psicológico: 34000 -> 34999"""
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


def extract_with_categories():
    """Extrae productos con sus categorías del PDF."""
    doc = fitz.open(PDF_INPUT)
    products = []
    
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        text = page.get_text()
        lines = [l.strip() for l in text.split('\n') if l.strip()]
        
        # Detectar categoría de la página (primeras líneas con palabras clave)
        category = "GENERAL"
        for line in lines[:8]:
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
            elif 'VARIAS' in line_upper and 'PRODUCTO' not in line_upper:
                category = "VARIOS"
                break
        
        SKU_PATTERN = re.compile(r'^(?:RI-|KR-)?(?:[A-Z]{2,3}-)?(?:K?\d{4,6}(?:-\d{1,3})?)\b')
        PRICE_PATTERN = re.compile(r'\$([\d.]+)')
        
        i = 0
        while i < len(lines):
            line = lines[i]
            sku_match = SKU_PATTERN.match(line)
            if sku_match and len(line) < 20:
                sku = line
                title_lines = []
                price = None
                j = i + 1
                
                while j < len(lines):
                    next_line = lines[j]
                    if SKU_PATTERN.match(next_line) and len(next_line) < 20:
                        break
                    
                    price_match = PRICE_PATTERN.search(next_line)
                    if price_match:
                        price_str = price_match.group(1).replace('.', '')
                        price = int(price_str)
                        title_part = PRICE_PATTERN.sub('', next_line).strip()
                        if title_part and '|' in title_part:
                            title_lines.append(title_part)
                        j += 1
                        break
                    else:
                        if '|' in next_line or len(next_line) > 5:
                            title_lines.append(next_line)
                    
                    j += 1
                
                if price and title_lines:
                    title = ' '.join(title_lines).strip()
                    title = re.sub(r'\s+', ' ', title)
                    title = title.replace('Konecta', 'Maqjeez').replace('KONECTA', 'MAQJEEZ')
                    catalog_price = round_price_99(price * 4)
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
    """Genera el PDF del catálogo Maqjeez."""
    doc = SimpleDocTemplate(
        OUTPUT_PDF,
        pagesize=A4,
        rightMargin=15*mm,
        leftMargin=15*mm,
        topMargin=15*mm,
        bottomMargin=15*mm
    )
    
    styles = getSampleStyleSheet()
    
    # Estilos personalizados
    title_style = ParagraphStyle(
        'CatalogTitle',
        parent=styles['Heading1'],
        fontSize=28,
        textColor=HexColor('#1E3A8A'),
        alignment=TA_CENTER,
        spaceAfter=20,
        fontName='Helvetica-Bold'
    )
    
    subtitle_style = ParagraphStyle(
        'CatalogSubtitle',
        parent=styles['Normal'],
        fontSize=12,
        textColor=HexColor('#666666'),
        alignment=TA_CENTER,
        spaceAfter=30
    )
    
    category_style = ParagraphStyle(
        'CategoryTitle',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=white,
        backColor=HexColor('#1E3A8A'),
        alignment=TA_LEFT,
        spaceAfter=10,
        spaceBefore=15,
        leftIndent=5,
        rightIndent=5,
        leading=22
    )
    
    sku_style = ParagraphStyle(
        'SKUStyle',
        parent=styles['Normal'],
        fontSize=9,
        textColor=HexColor('#1E3A8A'),
        fontName='Helvetica-Bold'
    )
    
    desc_style = ParagraphStyle(
        'DescStyle',
        parent=styles['Normal'],
        fontSize=9,
        textColor=HexColor('#333333'),
        leading=12
    )
    
    price_style = ParagraphStyle(
        'PriceStyle',
        parent=styles['Normal'],
        fontSize=10,
        textColor=HexColor('#FF5722'),
        fontName='Helvetica-Bold',
        alignment=TA_RIGHT
    )
    
    elements = []
    
    # Portada
    elements.append(Spacer(1, 80*mm))
    elements.append(Paragraph("MAQJEEZ", title_style))
    elements.append(Paragraph("CATÁLOGO DE REPUESTOS 2026", subtitle_style))
    elements.append(Spacer(1, 20*mm))
    elements.append(Paragraph(
        f"<b>{len(products)}</b> productos | Precios actualizados",
        ParagraphStyle('Info', parent=styles['Normal'], fontSize=11, alignment=TA_CENTER, textColor=HexColor('#666666'))
    ))
    elements.append(PageBreak())
    
    # Agrupar por categoría
    from collections import OrderedDict
    categories = OrderedDict()
    for p in products:
        cat = p['categoria']
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(p)
    
    # Productos por categoría
    for cat, items in categories.items():
        elements.append(Paragraph(f"  {cat}  ({len(items)})", category_style))
        elements.append(Spacer(1, 5*mm))
        
        # Tabla de productos: 3 columnas
        table_data = []
        row = []
        
        for idx, p in enumerate(items):
            cell_content = [
                Paragraph(f"<b>{p['sku']}</b>", sku_style),
                Spacer(1, 2*mm),
                Paragraph(p['titulo'][:80], desc_style),
                Spacer(1, 2*mm),
                Paragraph(f"${p['precio_catalogo']:,}".replace(',', '.'), price_style)
            ]
            row.append(cell_content)
            
            if len(row) == 3:
                table_data.append(row)
                row = []
        
        if row:
            while len(row) < 3:
                row.append('')
            table_data.append(row)
        
        if table_data:
            table = Table(table_data, colWidths=[55*mm, 55*mm, 55*mm])
            table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
                ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#E0E0E0')),
                ('BACKGROUND', (0, 0), (-1, -1), white),
                ('ROWBACKGROUNDS', (0, 0), (-1, -1), [white, HexColor('#F8F8F8')]),
            ]))
            elements.append(table)
        
        elements.append(Spacer(1, 10*mm))
        
        # Salto de página si queda poco espacio
        if len(elements) > 0 and len(items) > 6:
            elements.append(PageBreak())
    
    doc.build(elements)
    print(f"\n✅ PDF generado: {OUTPUT_PDF}")
    print(f"📊 Total productos: {len(products)}")
    print(f"📁 Categorías: {', '.join(categories.keys())}")


def main():
    print("🔍 Extrayendo productos del PDF Konecta...")
    products = extract_with_categories()
    
    if not products:
        print("❌ No se encontraron productos")
        return
    
    print(f"\n📝 {len(products)} productos extraídos")
    print("\n📊 Muestra:")
    for p in products[:5]:
        print(f"   {p['sku']} | ${p['precio_base']:,} -> ${p['precio_catalogo']:,} | {p['titulo'][:50]}")
    
    print("\n📄 Generando PDF Maqjeez...")
    create_pdf(products)
    print("\n🎉 ¡Listo!")

if __name__ == '__main__':
    main()
