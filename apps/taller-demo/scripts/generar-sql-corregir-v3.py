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

# Separar en dos listas:
# 1. update_sku: cambiar SKU (donde el destino NO existe en la DB)
# 2. update_price: solo cambiar precio (donde el destino YA existe en la DB)

update_sku = []      # Cambiar SKU + precio
update_price = []      # Solo cambiar precio (mantener SKU actual)

for db_p in db_products:
    db_sku = db_p["sku"]
    name = db_p.get("name", "")
    
    for pdf_sku in pdf_products:
        pattern = r'^' + re.escape(pdf_sku) + r'\b'
        if re.search(pattern, name):
            if pdf_sku != db_sku:
                if pdf_sku in db_skus:
                    # El SKU destino ya existe, solo actualizar precio
                    update_price.append({
                        "db_sku": db_sku,
                        "pdf_sku": pdf_sku,
                        "price": pdf_products[pdf_sku],
                    })
                else:
                    # El SKU destino NO existe, actualizar SKU + precio
                    update_sku.append({
                        "db_sku": db_sku,
                        "pdf_sku": pdf_sku,
                        "price": pdf_products[pdf_sku],
                    })
            break

print(f"A cambiar SKU + precio: {len(update_sku)}")
print(f"Solo precio (sin cambiar SKU): {len(update_price)}")

# Generar SQL
sql_lines = ["BEGIN;"]
sql_lines.append("")

if update_sku:
    sql_lines.append(f"-- Cambiar SKU + precio ({len(update_sku)} productos)")
    sql_lines.append("")
    for u in update_sku:
        sql_lines.append(f"UPDATE catalog_products SET sku = '{u['pdf_sku']}', catalog_price = {u['price']}, stock = 999999, active = TRUE WHERE sku = '{u['db_sku']}';")
    sql_lines.append("")

if update_price:
    sql_lines.append(f"-- Solo precio ({len(update_price)} productos - SKU destino ya existe)")
    sql_lines.append("")
    for u in update_price:
        sql_lines.append(f"UPDATE catalog_products SET catalog_price = {u['price']}, stock = 999999, active = TRUE WHERE sku = '{u['db_sku']}';")
    sql_lines.append("")

sql_lines.append("COMMIT;")

sql = "\n".join(sql_lines)
output_path = r"C:\Users\Mi Pc\Desktop\corregir_skus_v3.sql"
with open(output_path, "w", encoding="utf-8") as f:
    f.write(sql)

print(f"\n✅ SQL guardado: {output_path}")

# Muestra
print("\n📋 Cambios de SKU:")
for u in update_sku[:10]:
    print(f"   {u['db_sku']} -> {u['pdf_sku']} = ${u['price']:,}")

print("\n📋 Solo precio (SKU destino ya existe):")
for u in update_price[:10]:
    print(f"   {u['db_sku']} (mantiene SKU) -> precio de {u['pdf_sku']} = ${u['price']:,}")
