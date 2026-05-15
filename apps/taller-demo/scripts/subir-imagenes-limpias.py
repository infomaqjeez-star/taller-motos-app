"""
Sube imagenes limpias (sin texto/SKU) al bucket catalog-images.
Reemplaza las existentes.
"""
import os
from supabase import create_client

SUPABASE_URL = "https://ajhmajaclimccrkehsyy.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqaG1hamFjbGltY2Nya2Voc3l5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQwNjE4MywiZXhwIjoyMDg5OTgyMTgzfQ.j43V1rlJfalBkkvx7ZDUmNDcCpJGmQ5QJAwZVqo_AoI"
BUCKET = "catalog-images"
INPUT_DIR = r"C:\Users\Mi Pc\Desktop\IMAGENES_LIMPIAS_SIN_TEXTO"

def main():
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    files = [f for f in os.listdir(INPUT_DIR) if f.lower().endswith('.webp')]

    print(f"Subiendo {len(files)} imagenes limpias...")
    ok = 0
    err = 0

    for fname in sorted(files):
        sku = os.path.splitext(fname)[0]
        path = os.path.join(INPUT_DIR, fname)
        try:
            with open(path, "rb") as f:
                data = f.read()
            dest = f"{sku}.webp"
            supabase.storage.from_(BUCKET).upload(
                dest, data,
                {"content-type": "image/webp", "upsert": "true"}
            )
            ok += 1
            if ok % 100 == 0:
                print(f"  {ok}/{len(files)} subidas...")
        except Exception as e:
            err += 1
            print(f"  ERROR {sku}: {e}")

    print(f"\nResultado: {ok} OK, {err} errores")

if __name__ == "__main__":
    main()
