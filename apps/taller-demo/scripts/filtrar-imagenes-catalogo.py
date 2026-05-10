import csv
import os
import shutil
import re

# Leer SKUs del catálogo de Konecta (PDF)
catalog_skus = set()
with open(r"C:\Users\Mi Pc\Desktop\catalogo_maqjeez_completo.csv", "r", encoding="utf-8-sig") as f:
    reader = csv.DictReader(f)
    for row in reader:
        sku = row.get("sku", "").strip()
        if sku:
            catalog_skus.add(sku)

print(f"SKUs en catálogo Konecta: {len(catalog_skus)}")

# Directorios
origen = r"C:\Users\Mi Pc\Desktop\MERCADOLIBRE CUENTA NUEVA"
destino = r"C:\Users\Mi Pc\Desktop\IMAGENES_PARA_SUBIR"

if os.path.exists(destino):
    shutil.rmtree(destino)
os.makedirs(destino)

copiadas = 0
no_en_catalogo = []

for carpeta in os.listdir(origen):
    carpeta_path = os.path.join(origen, carpeta)
    if not os.path.isdir(carpeta_path):
        continue
    
    # Extraer posible SKU del inicio del nombre de carpeta
    # Patrones: 14020-1, 17002, KR17001, etc.
    match = re.match(r'^([A-Z]*\d+[A-Z]*(?:-\d+)?)\s*[-.\s]', carpeta)
    if not match:
        match = re.match(r'^([A-Z]*\d+[A-Z]*(?:-\d+)?)$', carpeta)
    
    if match:
        sku_candidato = match.group(1)
        
        # Verificar si está en el catálogo
        if sku_candidato in catalog_skus:
            # Buscar primera imagen
            for archivo in os.listdir(carpeta_path):
                if archivo.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
                    origen_file = os.path.join(carpeta_path, archivo)
                    destino_file = os.path.join(destino, f"{sku_candidato}.jpg")
                    shutil.copy2(origen_file, destino_file)
                    copiadas += 1
                    break
        else:
            no_en_catalogo.append((carpeta, sku_candidato))

print(f"\n✅ Imágenes copiadas: {copiadas}")
print(f"   Destino: {destino}")

if no_en_catalogo:
    print(f"\n⚠️  Carpetas NO en catálogo ({len(no_en_catalogo)}):")
    for carpeta, sku in no_en_catalogo[:20]:
        print(f"   '{carpeta}' (SKU detectado: {sku})")

# Mostrar muestra
print(f"\n📋 Primeras 20 imágenes:")
for f in sorted(os.listdir(destino))[:20]:
    print(f"   {f}")
