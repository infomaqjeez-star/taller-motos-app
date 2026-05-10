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

# Encontrar todos los updates necesarios
updates = []
dest_skus = set()  # Todos los SKU destino

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
                })
                dest_skus.add(pdf_sku)
            break

# SKUs destino que ya existen en la DB (y necesitan ser borrados primero)
conflicts = dest_skus & db_skus
# PERO no borrar los que son el origen de otro update
origins = set(u['db_sku'] for u in updates)
to_delete = conflicts - origins

print(f"Total updates: {len(updates)}")
print(f"SKU destino que ya existen: {len(conflicts)}")
print(f"A borrar (no son origen de otro update): {len(to_delete)}")
print(f"   {sorted(to_delete)[:30]}")

# Generar SQL
sql_lines = ["BEGIN;"]
sql_lines.append("")
sql_lines.append(f"-- Borrar {len(to_delete)} productos duplicados que tienen el SKU correcto pero son viejos")
sql_lines.append("")

for sku in sorted(to_delete):
    sql_lines.append(f"DELETE FROM catalog_products WHERE sku = '{sku}';")

sql_lines.append("")
sql_lines.append(f"-- Actualizar {len(updates)} productos")
sql_lines.append("")

for u in updates:
    sql_lines.append(f"UPDATE catalog_products SET sku = '{u['pdf_sku']}', catalog_price = {u['price']}, stock = 999999, active = TRUE WHERE sku = '{u['db_sku']}';")

sql_lines.append("")
sql_lines.append("COMMIT;")

sql = "\n".join(sql_lines)
output_path = r"C:\Users\Mi Pc\Desktop\corregir_skus_v2.sql"
with open(output_path, "w", encoding="utf-8") as f:
    f.write(sql)

print(f"\n✅ SQL guardado: {output_path}")
print(f"   {len(to_delete)} duplicados a borrar")
print(f"   {len(updates)} SKUs a corregir")

# Verificar que no haya conflictos restantes
print("\n🔍 Verificando conflictos restantes...")
final_skus = set()
for u in updates:
    final_skus.add(u['pdf_sku'])
remaining_conflicts = final_skus & db_skus - to_delete
if remaining_conflicts:
    print(f"   ⚠️  Aun quedan conflictos: {remaining_conflicts}")
else:
    print("   ✅ Sin conflictos restantes")
