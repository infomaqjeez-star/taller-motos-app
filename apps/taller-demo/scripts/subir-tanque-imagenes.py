"""
Sube la imagen del tanque con cada SKU al bucket catalog-images.
"""
import os
from PIL import Image
from supabase import create_client

SUPABASE_URL = "https://ajhmajaclimccrkehsyy.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqaG1hamFjbGltY2Nya2Voc3l5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQwNjE4MywiZXhwIjoyMDg5OTgyMTgzfQ.j43V1rlJfalBkkvx7ZDUmNDcCpJGmQ5QJAwZVqo_AoI"
BUCKET = "catalog-images"
SRC_IMG = r"C:\Users\Mi Pc\Desktop\MERCADOLIBRE CUENTA NUEVA\MAQJEEZ-000075 - TANQUE MOTOSIERRAS CHINAS 52CC\ref_final_442x508.jpg"

SKUS = [
    "MQJ-TANK-52CC-BASE",
    "MQJ-TANK-52CC-BOMB",
    "MQJ-TANK-52CC-TACO",
    "MQJ-TANK-52CC-COMP",
    "MQJ-TANK-52CC-SOLOB",
    "MQJ-TANK-52CC-SOLOT",
]

def main():
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Convertir a WebP
    img = Image.open(SRC_IMG)
    img.thumbnail((800, 800), Image.LANCZOS)

    ok = 0
    for sku in SKUS:
        try:
            # Guardar como WebP en memoria
            import io
            buf = io.BytesIO()
            img.save(buf, "WEBP", quality=85, method=6)
            buf.seek(0)
            data = buf.read()

            dest = f"{sku}.webp"
            supabase.storage.from_(BUCKET).upload(dest, data, {"content-type": "image/webp", "upsert": "true"})
            ok += 1
            print(f"  OK: {dest}")
        except Exception as e:
            print(f"  ERROR {sku}: {e}")

    print(f"\nResultado: {ok}/{len(SKUS)} imagenes subidas")

if __name__ == "__main__":
    main()
