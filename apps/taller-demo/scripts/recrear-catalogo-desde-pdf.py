import csv
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


def escape_sql(s):
    """Escapa comillas simples para SQL"""
    return s.replace("'", "''")


# Leer CSV del PDF
products = []
with open(r"C:\Users\Mi Pc\Desktop\catalogo_maqjeez_completo.csv", "r", encoding="utf-8-sig") as f:
    reader = csv.DictReader(f)
    for row in reader:
        sku = row.get("sku", "").strip()
        titulo = row.get("titulo", "").strip()
        try:
            precio_base = int(row.get("precio_base", "0"))
        except:
            precio_base = 0
        categoria = row.get("categoria", "GENERAL").strip()

        if sku and precio_base > 0 and titulo:
            products.append({
                "sku": sku,
                "name": titulo,
                "precio_base": precio_base,
                "catalog_price": round_price_99(precio_base * 4),
                "category": categoria,
            })

print(f"Total productos del PDF: {len(products)}")

# Generar SQL
BATCH_SIZE = 100
sql_lines = []
sql_lines.append("BEGIN;")
sql_lines.append("")
sql_lines.append("-- PASO 1: Borrar TODOS los productos del catalogo")
sql_lines.append("DELETE FROM catalog_products;")
sql_lines.append("")
sql_lines.append("-- PASO 2: Insertar productos del PDF")
sql_lines.append("")

for i in range(0, len(products), BATCH_SIZE):
    batch = products[i:i + BATCH_SIZE]
    sql_lines.append("INSERT INTO catalog_products (sku, name, catalog_price, category, stock, active) VALUES")
    values = []
    for p in batch:
        values.append(
            f"    ('{escape_sql(p['sku'])}', '{escape_sql(p['name'])}', {p['catalog_price']}, '{escape_sql(p['category'])}', 999999, TRUE)"
        )
    sql_lines.append(",\n".join(values) + ";")
    sql_lines.append("")

sql_lines.append("COMMIT;")

sql = "\n".join(sql_lines)
output_path = r"C:\Users\Mi Pc\Desktop\recrear_catalogo.sql"
with open(output_path, "w", encoding="utf-8") as f:
    f.write(sql)

print(f"\n✅ SQL generado: {output_path}")
print(f"   {len(products)} productos a insertar")
print(f"   {len(sql_lines)} lineas de SQL")

# Mostrar muestra
print(f"\n📋 Muestra:")
for p in products[:10]:
    print(f"   {p['sku']} | ${p['catalog_price']:,} | {p['name'][:50]}")
