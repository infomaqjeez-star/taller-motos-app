"""
Convierte imágenes a WebP y las sube al bucket catalog-images de Supabase.
Nombre del archivo = SKU.webp

Requiere:
    pip install Pillow supabase
"""
import os
import io
import re
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Instalando Pillow...")
    os.system("pip install Pillow")
    from PIL import Image

try:
    from supabase import create_client
except ImportError:
    print("Instalando supabase...")
    os.system("pip install supabase")
    from supabase import create_client

# ── Configuración ──────────────────────────────────────────────
SUPABASE_URL = "https://ajhmajaclimccrkehsyy.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqaG1hamFjbGltY2Nya2Voc3l5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQwNjE4MywiZXhwIjoyMDg5OTgyMTgzfQ.j43V1rlJfalBkkvx7ZDUmNDcCpJGmQ5QJAwZVqo_AoI"
BUCKET = "catalog-images"
RAIZ_IMAGENES = r"C:\Users\Mi Pc\Desktop\IMAGENES_LIMPIAS"
WEBP_QUALITY = 85
MAX_SIZE = (800, 800)  # píxeles máximos

def extraer_sku(nombre_carpeta):
    match = re.match(r'^([A-Za-z0-9]{3,15}(?:-[A-Za-z0-9]+)?)\s*[-.]', nombre_carpeta)
    if match:
        return match.group(1)
    match2 = re.match(r'^([A-Za-z0-9]{3,15}(?:-[A-Za-z0-9]+)?)\s', nombre_carpeta)
    if match2:
        return match2.group(1)
    return None

def primera_imagen(carpeta_path):
    extensiones = ('.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tiff')
    for root, _, files in os.walk(carpeta_path):
        for f in sorted(files):
            if f.lower().endswith(extensiones):
                return os.path.join(root, f)
    return None

def imagen_a_webp_bytes(ruta_imagen):
    img = Image.open(ruta_imagen).convert("RGB")
    img.thumbnail(MAX_SIZE, Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="WEBP", quality=WEBP_QUALITY, method=6)
    return buf.getvalue()

def main():
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    if not os.path.exists(RAIZ_IMAGENES):
        print(f"ERROR: No se encuentra la carpeta: {RAIZ_IMAGENES}")
        sys.exit(1)

    extensiones = ('.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp')
    archivos = [f for f in os.listdir(RAIZ_IMAGENES)
                if os.path.isfile(os.path.join(RAIZ_IMAGENES, f))
                and f.lower().endswith(extensiones)]

    print(f"Imagenes encontradas: {len(archivos)}")

    subidas = 0
    errores = 0

    for archivo in sorted(archivos):
        sku = Path(archivo).stem  # nombre sin extension = SKU
        img_path = os.path.join(RAIZ_IMAGENES, archivo)

        try:
            webp_bytes = imagen_a_webp_bytes(img_path)
            dest = f"{sku}.webp"
            supabase.storage.from_(BUCKET).upload(
                dest,
                webp_bytes,
                {"content-type": "image/webp", "upsert": "true"}
            )
            url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{dest}"
            supabase.table("catalog_products").update({"image_url": url}).eq("sku", sku).execute()
            subidas += 1
            if subidas % 50 == 0:
                print(f"  {subidas}/{len(archivos)} subidas...")
        except Exception as e:
            errores += 1
            print(f"  ERROR {sku}: {e}")

    print(f"\nResultado:")
    print(f"  Subidas OK: {subidas}")
    print(f"  Errores:    {errores}")

if __name__ == "__main__":
    main()
