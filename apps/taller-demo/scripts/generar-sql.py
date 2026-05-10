import csv

def r99(n):
    if n < 100:
        return max(49, (n // 10 + 1) * 10 - 1)
    if n < 1000:
        return (n // 100 + 1) * 100 - 1
    if n < 10000:
        return (n // 1000 + 1) * 1000 - 1
    if n < 100000:
        return (n // 1000 + 1) * 1000 - 1
    return (n // 10000 + 1) * 10000 - 1


products = []
with open(r"C:\Users\Mi Pc\Desktop\catalogo_maqjeez_completo.csv", "r", encoding="utf-8-sig") as f:
    reader = csv.DictReader(f)
    for row in reader:
        sku = row.get("sku", "").strip()
        try:
            precio = int(row.get("precio_base", "0"))
        except:
            precio = 0
        if sku and precio > 0:
            products.append((sku, precio))

sql_lines = ["-- Actualizar precios x4 + activar productos del PDF"]
sql_lines.append("BEGIN;")

# Generar CASE para precios
sql_lines.append("UPDATE catalog_products SET")
sql_lines.append("  catalog_price = CASE sku")
for sku, precio in products:
    cat_price = r99(precio * 4)
    sql_lines.append(f"    WHEN '{sku}' THEN {cat_price}")
sql_lines.append("    ELSE catalog_price")
sql_lines.append("  END,")
sql_lines.append("  stock = 999999,")
sql_lines.append("  active = TRUE")
sql_lines.append("WHERE sku IN (")
sql_lines.append(", ".join([f"'{p[0]}'" for p in products]))
sql_lines.append(");")

# Ocultar los que no estan en el PDF
pdf_skus = [p[0] for p in products]
sql_lines.append("")
sql_lines.append("-- Ocultar productos que NO estan en el PDF")
sql_lines.append("UPDATE catalog_products SET active = FALSE")
sql_lines.append("WHERE sku NOT IN (")
# Split en batches para no romper el limite de SQL
for i in range(0, len(pdf_skus), 500):
    batch = pdf_skus[i:i + 500]
    if i > 0:
        sql_lines.append(");")
        sql_lines.append("")
        sql_lines.append("UPDATE catalog_products SET active = FALSE")
        sql_lines.append("WHERE sku NOT IN (")
    sql_lines.append(", ".join([f"'{s}'" for s in batch]))
sql_lines.append(");")

sql_lines.append("COMMIT;")

sql = "\n".join(sql_lines)
print(f"SQL generado: {len(sql)} caracteres, {len(products)} productos")

with open(r"C:\Users\Mi Pc\Desktop\actualizar_catalogo.sql", "w", encoding="utf-8") as f:
    f.write(sql)
print("Guardado en: C:\\Users\\Mi Pc\\Desktop\\actualizar_catalogo.sql")
