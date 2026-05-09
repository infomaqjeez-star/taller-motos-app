#!/usr/bin/env python3
"""
Base para extraer tarjetas de catálogo PDF → imágenes 480×480 + JSON.

El layout real (posición del SKU en azul, márgenes, columnas) depende del PDF.
Calibrá rect_rel_* o implementá detección por color (get_pixmap + numpy) según tu archivo.

Dependencias:
  pip install -r scripts/catalogo/requirements.txt

Ejemplo (una página, ajustar rutas desde apps/taller-demo):
  python scripts/catalogo/extract_catalogo_pdf.py \\
    --pdf ../Catalogo.pdf \\
    --out-json data/catalogo-public.json \\
    --out-img public/catalogo \\
    --page 0
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--pdf", required=True)
    ap.add_argument("--out-json", default="data/catalogo-public.json")
    ap.add_argument("--out-img", default="public/catalogo")
    ap.add_argument("--page", type=int, default=0)
    ap.add_argument("--dpi", type=int, default=200)
    args = ap.parse_args()

    pdf = Path(args.pdf).expanduser().resolve()
    if not pdf.is_file():
        print(f"No existe: {pdf}", file=sys.stderr)
        return 1

    try:
        import io

        import fitz
        from PIL import Image
    except ImportError:
        print("Instalá: pip install -r scripts/catalogo/requirements.txt", file=sys.stderr)
        return 1

    out_json = Path(args.out_json)
    out_img = Path(args.out_img)
    out_img.mkdir(parents=True, exist_ok=True)

    doc = fitz.open(pdf)
    if args.page < 0 or args.page >= len(doc):
        print("Página fuera de rango", file=sys.stderr)
        return 1
    page = doc[args.page]
    words = page.get_text("words") or []

    # SKU tipo catálogo (ajustá regex si usás alfanuméricos)
    sku_re = re.compile(r"^\d{4,6}$")
    seen: set[str] = set()
    productos: list[dict] = []

    for w in words:
        token = (w[4] or "").strip()
        if not sku_re.match(token) or token in seen:
            continue
        seen.add(token)
        x0, y0, x1, y1 = float(w[0]), float(w[1]), float(w[2]), float(w[3])
        h = max(y1 - y0, 1.0)
        w0 = max(x1 - x0, 1.0)
        # Tarjeta: imagen arriba del SKU (ajustá multiplicadores al PDF real)
        clip = fitz.Rect(
            x0 - w0 * 6,
            y0 - h * 28,
            x1 + w0 * 6,
            y1 + h * 8,
        )
        clip &= page.rect
        pix = page.get_pixmap(clip=clip, dpi=args.dpi)
        img = Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")
        img = img.resize((480, 480), Image.Resampling.LANCZOS)
        img.save(out_img / f"{token}.png", optimize=True)

        productos.append(
            {
                "sku": token,
                "nombre": f"Artículo {token} (completar desde PDF)",
                "precio": 0,
                "categoriaId": "varios",
            }
        )

    doc.close()

    payload = {
        "titulo": "Catálogo de precios — Maqjeez Repuestos",
        "subtitulo": "Generado automáticamente (revisar nombres, precios y categorías).",
        "categorias": [{"id": "varios", "nombre": "Catálogo general", "orden": 1}],
        "productos": productos,
    }
    out_json.parent.mkdir(parents=True, exist_ok=True)
    out_json.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Página {args.page}: {len(productos)} SKUs → {out_json}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
