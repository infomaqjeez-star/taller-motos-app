"""
Crea 6 variantes de tanque para motosierra chinas 52cc en catalog_products.
Sube las imagenes al bucket catalog-images.
"""
import os
from supabase import create_client

SUPABASE_URL = "https://ajhmajaclimccrkehsyy.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqaG1hamFjbGltY2Nya2Voc3l5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQwNjE4MywiZXhwIjoyMDg5OTgyMTgzfQ.j43V1rlJfalBkkvx7ZDUmNDcCpJGmQ5QJAwZVqo_AoI"
BUCKET = "catalog-images"

PRODUCTOS = [
    {
        "sku": "MQJ-TANK-52CC-BASE",
        "name": "Tanque de Nafta para Motosierra China 52cc con Manguera",
        "price": 19999,
        "category": "Tanques y Combustible",
    },
    {
        "sku": "MQJ-TANK-52CC-BOMB",
        "name": "Tanque de Nafta para Motosierra China 52cc con Bombin",
        "price": 24999,
        "category": "Tanques y Combustible",
    },
    {
        "sku": "MQJ-TANK-52CC-TACO",
        "name": "Tanque de Nafta para Motosierra China 52cc con Tacos y Manguera",
        "price": 24999,
        "category": "Tanques y Combustible",
    },
    {
        "sku": "MQJ-TANK-52CC-COMP",
        "name": "Tanque Completo Motosierra China 52cc (Tanque + Bombin + Tacos + Manguera)",
        "price": 29999,
        "category": "Tanques y Combustible",
    },
    {
        "sku": "MQJ-TANK-52CC-SOLOB",
        "name": "Bombin de Nafta para Motosierra China 52cc",
        "price": 4999,
        "category": "Tanques y Combustible",
    },
    {
        "sku": "MQJ-TANK-52CC-SOLOT",
        "name": "Tacos y Manguera para Tanque Motosierra China 52cc",
        "price": 4999,
        "category": "Tanques y Combustible",
    },
]

def main():
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Obtener SKU existentes
    skus_existentes = set()
    page = 0
    while True:
        resp = supabase.from_("catalog_products").select("sku").range(page * 1000, (page + 1) * 1000 - 1).execute()
        if not resp.data:
            break
        for r in resp.data:
            skus_existentes.add(r["sku"])
        if len(resp.data) < 1000:
            break
        page += 1
    print(f"SKUs existentes: {len(skus_existentes)}")

    # Verificar que no haya duplicados
    for p in PRODUCTOS:
        if p["sku"] in skus_existentes:
            print(f"WARNING: SKU duplicado: {p['sku']}")
            return
        else:
            print(f"OK: {p['sku']} - {p['name']} - ${p['price']}")

    # Insertar productos
    print("\nInsertando productos...")
    for p in PRODUCTOS:
        image_url = f"https://ajhmajaclimccrkehsyy.supabase.co/storage/v1/object/public/{BUCKET}/{p['sku']}.webp"
        supabase.from_("catalog_products").insert({
            "sku": p["sku"],
            "name": p["name"],
            "catalog_price": p["price"],
            "image_url": image_url,
            "category": p["category"],
            "active": True,
            "stock": 999999,
        }).execute()
        print(f"  Insertado: {p['sku']} - ${p['price']}")

    print("\nProductos insertados. Ahora subí las imagenes manualmente con el nombre del SKU.")
    print("Los SKUs son:")
    for p in PRODUCTOS:
        print(f"  {p['sku']}.webp")

if __name__ == "__main__":
    main()
