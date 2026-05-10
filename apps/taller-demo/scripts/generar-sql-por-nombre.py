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

# Matching: buscar en el NOMBRE del producto de la DB el SKU del PDF
matches = []
no_matches = []

for db_p in db_products:
    db_sku = db_p["sku"]
    name = db_p.get("name", "")
    
    # Buscar en el nombre un SKU similar (ej: "14020-1 - ...")
    # Patrones: 14020-1, 14020-2, etc.
    found = False
    for pdf_sku in pdf_products:
        # Buscar el SKU del PDF como palabra completa en el nombre
        pattern = r'\b' + re.escape(pdf_sku) + r'\b'
        if re.search(pattern, name):
            matches.append({
                "db_sku": db_sku,
                "pdf_sku": pdf_sku,
                "catalog_price": pdf_products[pdf_sku],
                "name": name
            })
            found = True
            break
    
    if not found:
        no_matches.append(db_sku)

print(f"Productos en DB: {len(db_products)}")
print(f"Matches por nombre: {len(matches)}")
print(f"Sin match: {len(no_matches)}")

# Verificar los 14020
print("\n=== Verificacion 14020 ===")
for m in matches:
    if '14020' in m['db_sku']:
        print(f"DB: {m['db_sku']} -> PDF: {m['pdf_sku']} = ${m['catalog_price']:,}")

# Generar SQL
BATCH_SIZE = 200
sql_parts = []

for i in range(0, len(matches), BATCH_SIZE):
    batch = matches[i:i + BATCH_SIZE]
    sql_lines = ["UPDATE catalog_products SET catalog_price = CASE sku"]
    for m in batch:
        sql_lines.append(f"    WHEN '{m['db_sku']}' THEN {m['catalog_price']}")
    sql_lines.append("    ELSE catalog_price")
    sql_lines.append("  END")
    sql_lines.append("WHERE sku IN (")
    sql_lines.append(", ".join([f"'{m['db_sku']}'" for m in batch]))
    sql_lines.append(");")
    sql_parts.append("\n".join(sql_lines))

sql = "\n\n".join(sql_parts)
output_path = r"C:\Users\Mi Pc\Desktop\actualizar_por_nombre.sql"
with open(output_path, "w", encoding="utf-8") as f:
    f.write(sql)

print(f"\n✅ SQL guardado en: {output_path}")
print(f"   {len(matches)} productos a actualizar")
