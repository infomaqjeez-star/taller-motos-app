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

def normalize_sku(sku):
    """Normaliza SKU para matching flexible. Ej: 14020-002 -> 14020-2, 14020-001 -> 14020-1"""
    # Extraer numeros
    match = re.match(r'^(\d+)(?:-(\d+))?$', sku)
    if match:
        base = match.group(1)
        suffix = match.group(2)
        if suffix:
            # Quitar ceros iniciales del sufijo
            suffix_clean = suffix.lstrip('0') or '0'
            return f"{base}-{suffix_clean}"
        return base
    # Para SKUs con prefijos (K, RI, etc.)
    match2 = re.match(r'^([A-Z]+-?)?(\d+)(?:-(\d+))?$', sku, re.IGNORECASE)
    if match2:
        prefix = match2.group(1) or ''
        base = match2.group(2)
        suffix = match2.group(3)
        if suffix:
            suffix_clean = suffix.lstrip('0') or '0'
            return f"{prefix}{base}-{suffix_clean}".upper()
        return f"{prefix}{base}".upper()
    return sku.upper()

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
            norm = normalize_sku(sku)
            pdf_products[norm] = round_price_99(precio * 4)

# Leer JSON de la DB
with open(r"C:\Users\Mi Pc\CascadeProjects\taller-motos-app\apps\taller-demo\data\catalogo-products.json", "r", encoding="utf-8") as f:
    db_products = json.load(f)

# Hacer matching normalizado
matches = []
seen_pdf_skus = set()

for db_p in db_products:
    db_sku = db_p["sku"]
    db_norm = normalize_sku(db_sku)
    if db_norm in pdf_products:
        matches.append({
            "sku": db_sku,
            "pdf_norm": db_norm,
            "catalog_price": pdf_products[db_norm],
            "name": db_p.get("name", "")
        })
        seen_pdf_skus.add(db_norm)

# SKUs del PDF que no encontraron match
pdf_norms = set(pdf_products.keys())
not_found = pdf_norms - seen_pdf_skus

print(f"Productos en DB: {len(db_products)}")
print(f"Matches con normalizacion: {len(matches)}")
print(f"PDF sin match: {len(not_found)}")

if not_found:
    print("\nPDF sin match:")
    for s in sorted(not_found)[:30]:
        print(f"   {s}")

# Generar SQL - dividir en batches de 200
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

# Guardar SQL
sql = "\n\n".join(sql_parts)
output_path = r"C:\Users\Mi Pc\Desktop\actualizar_flexible.sql"
with open(output_path, "w", encoding="utf-8") as f:
    f.write(sql)

print(f"\n✅ SQL guardado en: {output_path}")
print(f"   {len(matches)} productos a actualizar")
print(f"   {len(sql_parts)} batch(es)")

# Mostrar matches de 14020 para verificar
print("\n📋 Muestra de matches (14020 series):")
for m in matches:
    if '14020' in m['sku']:
        print(f"   {m['sku']} (norm: {m['pdf_norm']}) -> ${m['catalog_price']:,}")
