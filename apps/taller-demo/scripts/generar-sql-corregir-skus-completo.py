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

db_skus = set(p['sku'] for p in db_products)

# Encontrar todos los productos donde el nombre contiene un SKU del PDF
updates = []
conflict_skus = set()  # SKUs destino que ya existen

for db_p in db_products:
    db_sku = db_p["sku"]
    name = db_p.get("name", "")
    
    for pdf_sku in pdf_products:
        pattern = r'^' + re.escape(pdf_sku) + r'\b'
        if re.search(pattern, name):
            if pdf_sku != db_sku:
                updates.append({
                    "db_sku": db_sku,
                    "pdf_sku": pdf_sku,
                    "price": pdf_products[pdf_sku],
                    "name": name[:50]
                })
                if pdf_sku in db_skus:
                    conflict_skus.add(pdf_sku)
            break

print(f"Total updates: {len(updates)}")
print(f"Conflict SKUs (ya existen en DB): {len(conflict_skus)}")
if conflict_skus:
    print(f"   {sorted(conflict_skus)[:20]}")

# Generar SQL completo
sql_lines = ["BEGIN;"]
sql_lines.append("")
sql_lines.append("-- PASO 1: Borrar productos duplicados (los que tienen el SKU correcto pero son productos viejos)")
sql_lines.append("-- Estos productos seran reemplazados por los actualizados")
sql_lines.append("")

# Solo borrar los SKU destino que ya existen (y NO son el mismo producto que vamos a actualizar)
for pdf_sku in sorted(conflict_skus):
    sql_lines.append(f"DELETE FROM catalog_products WHERE sku = '{pdf_sku}';")

sql_lines.append("")
sql_lines.append("-- PASO 2: Actualizar SKU y precio de los productos")
sql_lines.append("")

# Generar updates individuales
for u in updates:
    sql_lines.append(f"UPDATE catalog_products SET sku = '{u['pdf_sku']}', catalog_price = {u['price']}, stock = 999999, active = TRUE WHERE sku = '{u['db_sku']}';")

sql_lines.append("")
sql_lines.append("COMMIT;")

sql = "\n".join(sql_lines)
output_path = r"C:\Users\Mi Pc\Desktop\corregir_skus_completo.sql"
with open(output_path, "w", encoding="utf-8") as f:
    f.write(sql)

print(f"\n✅ SQL generado: {output_path}")
print(f"   {len(conflict_skus)} duplicados a borrar")
print(f"   {len(updates)} SKUs a corregir")

# Mostrar muestra
print("\n📋 Muestra de cambios:")
for u in updates[:20]:
    print(f"   {u['db_sku']} -> {u['pdf_sku']} = ${u['price']:,}")
