import csv
import json
import re

def round_price_99(n):
    if n <= 0:
        return 0
    if n < 100:
        return max(49, (n // 10 + 1) * 10 - 1)
    if n < 1000:
        return (n // 100 + 1) * 100 - 1
    if n < 10000:
        return (n // 1000 + 1) * 1000 - 1
    if n < 100000:
        return (n // 1000 + 1) * 1000 - 1
    return (n // 10000 + 1) * 10000 - 1


def extract_number(sku):
    """Extrae el numero base del SKU. Ej: K17005 -> 17005, RI-17005 -> 17005"""
    match = re.search(r'(\d{3,6}(?:-\d+)?)', sku)
    if match:
        return match.group(1)
    return None


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
            num = extract_number(sku)
            if num:
                pdf_products[num] = round_price_99(precio * 4)

# Leer JSON de la DB
with open(r"C:\Users\Mi Pc\CascadeProjects\taller-motos-app\apps\taller-demo\data\catalogo-products.json", "r", encoding="utf-8") as f:
    db_products = json.load(f)

# Hacer matching por numero base
matches = []
no_matches = []

for db_p in db_products:
    db_sku = db_p["sku"]
    db_num = extract_number(db_sku)
    if db_num and db_num in pdf_products:
        matches.append({
            "sku": db_sku,
            "pdf_sku": db_num,
            "catalog_price": pdf_products[db_num],
            "name": db_p.get("name", "")
        })
    else:
        no_matches.append(db_sku)

print(f"Productos en DB: {len(db_products)}")
print(f"Matches por numero base: {len(matches)}")
print(f"Sin match: {len(no_matches)}")

# Generar SQL - dividir en batches de 200 para no sobrecargar
BATCH_SIZE = 200
sql_parts = []

for i in range(0, len(matches), BATCH_SIZE):
    batch = matches[i:i + BATCH_SIZE]
    sql_lines = ["UPDATE catalog_products SET catalog_price = CASE sku"]
    for m in batch:
        sql_lines.append(f"    WHEN '{m['sku']}' THEN {m['catalog_price']}")
    sql_lines.append("    ELSE catalog_price")
    sql_lines.append("  END")
    sql_lines.append("WHERE sku IN (")
    sql_lines.append(", ".join([f"'{m['sku']}'" for m in batch]))
    sql_lines.append(");")
    sql_parts.append("\n".join(sql_lines))

# Guardar SQL completo
sql = "\n\n".join(sql_parts)
output_path = r"C:\Users\Mi Pc\Desktop\actualizar_similares.sql"
with open(output_path, "w", encoding="utf-8") as f:
    f.write(sql)

print(f"\n✅ SQL guardado en: {output_path}")
print(f"   {len(matches)} productos a actualizar")
print(f"   {len(sql_parts)} batch(es) de {BATCH_SIZE}")

# Mostrar muestra de matches
print("\n📋 Muestra de matches:")
for m in matches[:15]:
    print(f"   {m['sku']} (PDF: {m['pdf_sku']}) -> ${m['catalog_price']:,}")
