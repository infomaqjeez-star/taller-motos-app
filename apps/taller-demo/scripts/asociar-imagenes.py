import os
import re
import csv

def extraer_sku(nombre_carpeta):
    """Extrae el SKU del nombre de la carpeta. Ej: '14007 - Afilador...' -> '14007'"""
    match = re.match(r'^(\d{4,6}(?:-\d+)?)\s*[-.]', nombre_carpeta)
    if match:
        return match.group(1)
    return None

def listar_imagenes(carpeta):
    """Lista todas las imágenes dentro de una carpeta"""
    imagenes = []
    for root, dirs, files in os.walk(carpeta):
        for f in files:
            if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif')):
                imagenes.append(os.path.join(root, f))
    return imagenes

# Directorio raíz
raiz = r"C:\Users\Mi Pc\Desktop\MERCADOLIBRE CUENTA NUEVA"

# Recorrer carpetas y extraer SKU-imagenes
sku_imagenes = {}
carpetas_sin_sku = []
total_carpetas = 0

for carpeta in os.listdir(raiz):
    carpeta_path = os.path.join(raiz, carpeta)
    if not os.path.isdir(carpeta_path):
        continue
    
    total_carpetas += 1
    sku = extraer_sku(carpeta)
    
    if sku:
        imagenes = listar_imagenes(carpeta_path)
        if imagenes:
            # Tomar la primera imagen como principal
            sku_imagenes[sku] = imagenes[0]
    else:
        carpetas_sin_sku.append(carpeta)

print(f"Total carpetas: {total_carpetas}")
print(f"Carpetas con SKU e imagen: {len(sku_imagenes)}")
print(f"Carpetas sin SKU: {len(carpetas_sin_sku)}")

if carpetas_sin_sku:
    print(f"\nMuestra sin SKU: {carpetas_sin_sku[:10]}")

# Leer CSV del PDF para obtener todos los SKUs
pdf_skus = set()
with open(r"C:\Users\Mi Pc\Desktop\catalogo_maqjeez_completo.csv", "r", encoding="utf-8-sig") as f:
    reader = csv.DictReader(f)
    for row in reader:
        sku = row.get("sku", "").strip()
        if sku:
            pdf_skus.add(sku)

# Generar SQL
sql_lines = []
sql_lines.append("-- Actualizar imagenes en catalog_products")
sql_lines.append("")

matches = 0
no_matches = []

for sku in pdf_skus:
    if sku in sku_imagenes:
        # Usar la ruta relativa o un placeholder
        # Por ahora guardamos la ruta local
        ruta_imagen = sku_imagenes[sku].replace("\\", "/")
        sql_lines.append(f"UPDATE catalog_products SET image_url = '{ruta_imagen}' WHERE sku = '{sku}';")
        matches += 1
    else:
        no_matches.append(sku)

# Guardar SQL
output_path = r"C:\Users\Mi Pc\Desktop\asociar_imagenes.sql"
with open(output_path, "w", encoding="utf-8") as f:
    f.write("\n".join(sql_lines))

print(f"\n✅ SQL guardado: {output_path}")
print(f"   {matches} productos con imagen")
print(f"   {len(no_matches)} sin imagen")

# Muestra
print("\n📋 Muestra de matches:")
for sku in list(sku_imagenes.keys())[:15]:
    print(f"   {sku} -> {os.path.basename(sku_imagenes[sku])}")
