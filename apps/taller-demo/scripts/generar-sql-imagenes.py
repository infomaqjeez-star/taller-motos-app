import csv
import os

# URL base de Supabase Storage
BASE_URL = "https://ajhmvacljnmccrkehsyy.supabase.co/storage/v1/object/public/catalog-images"

# Leer CSV del PDF para obtener todos los SKUs
products = []
with open(r"C:\Users\Mi Pc\Desktop\catalogo_maqjeez_completo.csv", "r", encoding="utf-8-sig") as f:
    reader = csv.DictReader(f)
    for row in reader:
        sku = row.get("sku", "").strip()
        if sku:
            products.append(sku)

print(f"Total productos en catálogo: {len(products)}")

# Generar SQL para asociar imágenes
# Asumiendo que las imágenes están nombradas como: {SKU}.jpg, {SKU}.png, etc.
sql_lines = []
sql_lines.append("-- Asociar imágenes de catalog-images a productos")
sql_lines.append("")

# Por cada SKU, intentar diferentes extensiones posibles
for sku in products:
    # Probamos las extensiones más comunes
    # La imagen puede ser: sku.jpg, sku.png, sku.jpeg, etc.
    # Usamos COALESCE para intentar varias URLs
    sql_lines.append(f"UPDATE catalog_products SET image_url = '{BASE_URL}/{sku}.jpg' WHERE sku = '{sku}';")

sql = "\n".join(sql_lines)
output_path = r"C:\Users\Mi Pc\Desktop\asociar_imagenes_storage.sql"
with open(output_path, "w", encoding="utf-8") as f:
    f.write(sql)

print(f"\n✅ SQL generado: {output_path}")
print(f"   {len(products)} productos")
print(f"\n📋 Nota: Si las imágenes tienen otra extensión (.png, .jpeg, .webp),")
print(f"   modificá el SQL o renombrá las imágenes en el bucket.")

# Mostrar muestra
print(f"\n📋 Muestra de SQL:")
for line in sql_lines[2:7]:
    print(f"   {line}")
