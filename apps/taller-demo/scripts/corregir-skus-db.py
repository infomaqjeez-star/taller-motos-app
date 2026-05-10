import csv
import json
import re

def round_price_99(n):
    if n <= 0: return 0
    if n < 100: return max(49, (n // 10 + 1) * 10 - 1)
    if n < 1000: return (n // 100 + 1) * 100 - 1
    if n < 10000: return (n // 1000 + 1) * 1000 - 1
    if n < 100000: return (n // 1000 + 1) * 1000 - 1
    return (n // 10000 + 1) * 10000 - 1

# Leer CSV del PDF
pdf_products = {}
with open(r"C:\Users\Mi Pc\Desktop\catalogo_maqjeez_completo.csv", "r", encoding="utf-8-sig") as f:
    reader = csv.DictReader(f)
    for row in reader:
        sku = row.get("sku", "").strip()
        try:
            precio = int(row.get("precio_base", "0"))
        except:
            precio = 0
        if sku and precio > 0:
            pdf_products[sku] = round_price_99(precio * 4)

# Leer JSON de la DB
with open(r"C:\Users\Mi Pc\CascadeProjects\taller-motos-app\apps\taller-demo\data\catalogo-products.json", "r", encoding="utf-8") as f:
    db_products = json.load(f)

# Encontrar productos donde el SKU de la DB NO coincide con el del PDF
# pero el nombre SÍ contiene el SKU correcto
correcciones = []
sin_cambio = []

for db_p in db_products:
    db_sku = db_p["sku"]
    name = db_p.get("name", "")
    
    # Buscar en el nombre un SKU del PDF
    pdf_sku_encontrado = None
    for pdf_sku in pdf_products:
        # Patron: el SKU del PDF como palabra completa al inicio del nombre
        pattern = r'^' + re.escape(pdf_sku) + r'\b'
        if re.search(pattern, name):
            pdf_sku_encontrado = pdf_sku
            break
    
    if pdf_sku_encontrado and pdf_sku_encontrado != db_sku:
        # El SKU de la DB es diferente al del PDF
        correcciones.append({
            "db_sku": db_sku,
            "pdf_sku": pdf_sku_encontrado,
            "catalog_price": pdf_products[pdf_sku_encontrado],
            "name": name[:60]
        })
    else:
        sin_cambio.append(db_sku)

print(f"Productos en DB: {len(db_products)}")
print(f"SKUs a corregir: {len(correcciones)}")
print(f"Sin cambio: {len(sin_cambio)}")

# Mostrar muestra de correcciones
print("\n=== Correcciones de SKU (muestra) ===")
for c in correcciones[:30]:
    print(f"   {c['db_sku']} -> {c['pdf_sku']} | {c['name']}... | ${c['catalog_price']:,}")

# Generar SQL para actualizar SKUs y precios
# NOTA: Como sku es clave primaria/unique, usamos UPDATE para cambiar el sku
# Pero si hay conflictos de unique constraint, necesitamos manejarlo

# Primero verificar si los nuevos SKUs ya existen
pdf_skus_set = set(pdf_products.keys())
db_skus_set = set(p['sku'] for p in db_products)

# Los pdf_skus que ya existen en la DB como otros productos
conflictos = []
for c in correcciones:
    if c['pdf_sku'] in db_skus_set and c['pdf_sku'] != c['db_sku']:
        conflictos.append(c)

if conflictos:
    print(f"\n⚠️  Conflictos detectados: {len(conflictos)}")
    print("   Estos SKUs ya existen en la DB con otro producto:")
    for c in conflictos[:10]:
        print(f"   {c['db_sku']} quiere ser {c['pdf_sku']} pero ya existe")

# Generar SQL - solo para los que NO tienen conflicto
correcciones_validas = [c for c in correcciones if c['pdf_sku'] not in db_skus_set or c['pdf_sku'] == c['db_sku']]
print(f"\nCorrecciones validas (sin conflicto): {len(correcciones_validas)}")

if correcciones_validas:
    BATCH_SIZE = 100
    sql_parts = []
    
    for i in range(0, len(correcciones_validas), BATCH_SIZE):
        batch = correcciones_validas[i:i + BATCH_SIZE]
        sql_lines = []
        sql_lines.append("-- Batch de correcciones de SKU")
        for c in batch:
            sql_lines.append(f"UPDATE catalog_products SET sku = '{c['pdf_sku']}', catalog_price = {c['catalog_price']} WHERE sku = '{c['db_sku']}';")
        sql_parts.append("\n".join(sql_lines))
    
    sql = "\n\n".join(sql_parts)
    output_path = r"C:\Users\Mi Pc\Desktop\corregir_skus.sql"
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(sql)
    
    print(f"\n✅ SQL guardado en: {output_path}")
    print(f"   {len(correcciones_validas)} SKUs a corregir")

# Si hay conflictos, generar un reporte
if conflictos:
    print(f"\n⚠️  {len(conflictos)} productos tienen conflictos de SKU")
    print("   Necesitan revision manual:")
    for c in conflictos[:20]:
        print(f"   DB: {c['db_sku']} -> Quiere ser: {c['pdf_sku']} | {c['name']}")
