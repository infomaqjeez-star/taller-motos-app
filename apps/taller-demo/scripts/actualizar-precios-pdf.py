"""
Actualiza precios del catálogo basado en el PDF de Konecta:
- Precio ×4 redondeado (psicológico)
- Stock ilimitado (999999)
- Oculta productos que NO están en el PDF

Uso:
  cd apps/taller-demo
  py scripts/actualizar-precios-pdf.py
"""
import os
import csv
import requests

SUPABASE_URL = "https://ajhmajac1imccrkehssy.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqaG1hY2FcaW1jY3JrZWhzc3kiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNzQ5NDI2MDc0LCJleHAiOjIwNjQ4MDIwNzR9.cJ9V9IrJ3Fal8KRxv7ZD-UmMXCr7GnGr95QjAw7Vqp_AoT"

CSV_PATH = r"C:\Users\Mi Pc\Desktop\catalogo_maqjeez_completo.csv"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}


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


def read_csv():
    products = []
    with open(CSV_PATH, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            sku = row.get("sku", "").strip()
            precio_base_str = row.get("precio_base", "").strip()
            if not sku:
                continue
            try:
                precio_base = int(precio_base_str)
            except:
                continue
            if precio_base > 0:
                products.append({
                    "sku": sku,
                    "catalog_price": round_price_99(precio_base * 4)
                })
    return products


def get_db_products():
    url = f"{SUPABASE_URL}/rest/v1/catalog_products?select=sku"
    response = requests.get(url, headers=HEADERS, timeout=60)
    response.raise_for_status()
    return response.json()


def update_product(sku, catalog_price, stock, active):
    url = f"{SUPABASE_URL}/rest/v1/catalog_products?sku=eq.{sku}"
    data = {
        "catalog_price": catalog_price,
        "stock": stock,
        "active": active
    }
    response = requests.patch(url, json=data, headers=HEADERS, timeout=30)
    if response.status_code not in [200, 204]:
        print(f"   ❌ {sku}: HTTP {response.status_code} - {response.text[:100]}")
        return False
    return True


def main():
    print("📄 Leyendo catálogo desde CSV...")
    pdf_products = read_csv()
    print(f"   {len(pdf_products)} productos del PDF\n")

    print("🔄 Obteniendo productos de la base de datos...")
    db_products = get_db_products()
    print(f"   {len(db_products)} productos en la DB\n")

    pdf_skus = {p["sku"] for p in pdf_products}
    db_skus = {p["sku"] for p in db_products}

    activos = pdf_products
    inactivos = [{"sku": sku} for sku in db_skus if sku not in pdf_skus]

    print(f"📊 Resumen:")
    print(f"   Activos (PDF): {len(activos)}")
    print(f"   Inactivos (ocultar): {len(inactivos)}\n")

    print("🚀 Actualizando productos...\n")

    total_updated = 0
    total_errors = 0

    # Activos
    for i, p in enumerate(activos):
        if update_product(p["sku"], p["catalog_price"], 999999, True):
            total_updated += 1
        else:
            total_errors += 1
        if (i + 1) % 50 == 0:
            print(f"   ✅ Activos: {i + 1}/{len(activos)}")

    print(f"\n   ✅ Activos completados: {total_updated} OK, {total_errors} err")

    # Inactivos
    if inactivos:
        print(f"\n   🔒 Ocultando {len(inactivos)} productos no listados...")
        for i, p in enumerate(inactivos):
            if update_product(p["sku"], 0, 0, False):
                total_updated += 1
            else:
                total_errors += 1
            if (i + 1) % 50 == 0:
                print(f"   ✅ Inactivos: {i + 1}/{len(inactivos)}")

    print(f"\n✅ Resultado final:")
    print(f"   Actualizados: {total_updated}")
    print(f"   Errores: {total_errors}")
    print(f"\n🎉 Catálogo actualizado:")
    print(f"   • {len(activos)} productos del PDF con precio ×4 y stock ilimitado")
    print(f"   • {len(inactivos)} productos ocultos (pendientes de aprobación)")


if __name__ == "__main__":
    main()
