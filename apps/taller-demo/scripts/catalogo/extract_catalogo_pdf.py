#!/usr/bin/env python3
"""
Extrae del PDF de catálogo (Konecta u otro layout tipo grilla) imágenes 480×480 y un JSON
compatible con data/catalogo-public.json (precio lista; la app muestra ×4).

Carpetas por artículo sin programar: en esta carpeta (scripts/catalogo) doble clic en
GenerarCatalogo10.bat o GenerarCatalogoCompleto.bat (también en apps/taller-demo/).
Ver LEEME-CATALOGO.txt. Si no aparecen, hacé git fetch && git checkout main && git reset --hard origin/main

Ejecutar con cwd = apps/taller-demo:
  pip install -r scripts/catalogo/requirements.txt

Testeo rápido (solo muestra datos, no escribe JSON ni imágenes):
  python scripts/catalogo/extract_catalogo_pdf.py --pages 0 --max-skus 20 --report

Extracción completa:
  python scripts/catalogo/extract_catalogo_pdf.py --pages all --format webp

Carpetas por artículo (450² centrado en SKU, Maqjeez):
  python scripts/catalogo/build_product_folders.py --pages all --update-json

Calibración del recorte (si las tarjetas se ven mal):
  --side-mult 6 --above-mult 28 --below-mult 8
"""
from __future__ import annotations

import argparse
import io
import json
import sys
from pathlib import Path

_SCRIPT_DIR = Path(__file__).resolve().parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))

import pdf_catalog_helpers as H  # noqa: E402


def _print_report(productos: list[dict], mult: int = 4) -> None:
    print("\n=== Vista previa extracción (revisar nombre y precio lista) ===\n", file=sys.stderr)
    for p in productos:
        sku = p.get("sku", "")
        nom = (p.get("nombre") or "")[:72]
        pr = int(p.get("precio") or 0)
        pv = pr * mult if pr > 0 else 0
        print(f"{sku}\t{pr}\t{pv}\t{nom}", file=sys.stderr)
    print("\n=== JSON (mismos registros) ===\n", file=sys.stderr)
    print(json.dumps(productos, ensure_ascii=False, indent=2))


def main() -> int:
    ap = argparse.ArgumentParser(description="PDF catálogo → imágenes 480² + catalogo-public.json")
    ap.add_argument(
        "--pdf",
        default=H.DEFAULT_CATALOG_PDF_REL,
        help="Ruta al PDF (relativo al cwd, típicamente apps/taller-demo)",
    )
    ap.add_argument("--out-json", default="data/catalogo-public.json")
    ap.add_argument("--out-img", default="public/catalogo")
    ap.add_argument("--pages", default="all", help='all | 0 | "0-5" | "0,2,4"')
    ap.add_argument("--dpi", type=int, default=180)
    ap.add_argument("--side-mult", type=float, default=6.0)
    ap.add_argument("--above-mult", type=float, default=28.0)
    ap.add_argument("--below-mult", type=float, default=8.0)
    ap.add_argument("--format", choices=("webp", "png"), default="webp")
    ap.add_argument("--force", action="store_true", help="Sobrescribe imágenes ya generadas")
    ap.add_argument("--dry-run", action="store_true", help="No escribe imágenes ni JSON")
    ap.add_argument(
        "--report",
        action="store_true",
        help="Imprime tabla + JSON a consola y NO escribe out-json (ideal para testeo)",
    )
    ap.add_argument(
        "--max-skus",
        type=int,
        default=0,
        help="Máximo de SKUs nuevos a procesar (0 = sin límite). Útil con --pages 0 --report",
    )
    ap.add_argument(
        "--report-save-images",
        action="store_true",
        help="Con --report, igual guarda imágenes en out-img (no escribe JSON)",
    )
    args = ap.parse_args()

    pdf = H.resolve_catalog_pdf(args.pdf, Path.cwd())
    if not pdf.is_file():
        print(f"No existe el PDF: {pdf}", file=sys.stderr)
        print(
            "Colocá el PDF en scripts/ o public/catalogo/ (nombre: "
            f"{Path(H.DEFAULT_CATALOG_PDF_REL).name}) o pasá --pdf",
            file=sys.stderr,
        )
        return 1

    try:
        import fitz
        from PIL import Image
    except ImportError:
        print("Instalá: pip install -r scripts/catalogo/requirements.txt", file=sys.stderr)
        return 1

    out_json = Path(args.out_json)
    out_img = Path(args.out_img)
    write_images = not args.dry_run and (not args.report or args.report_save_images)
    write_json = not args.dry_run and not args.report

    if write_images:
        out_img.mkdir(parents=True, exist_ok=True)

    doc = fitz.open(pdf)
    try:
        page_indices = H.parse_pages_arg(args.pages, len(doc))
    except ValueError as e:
        print(e, file=sys.stderr)
        doc.close()
        return 1

    by_sku: dict[str, dict] = {}
    ext = ".webp" if args.format == "webp" else ".png"
    max_skus = max(0, args.max_skus)

    for pi in page_indices:
        page = doc[pi]
        words = page.get_text("words") or []
        seen_page: set[str] = set()

        for w in words:
            token = (w[4] or "").strip()
            if not H.SKU_RE.match(token) or token in seen_page:
                continue
            if max_skus and len(by_sku) >= max_skus and token not in by_sku:
                continue
            seen_page.add(token)

            x0, y0, x1, y1 = float(w[0]), float(w[1]), float(w[2]), float(w[3])
            sh = max(y1 - y0, 1.0)
            sw = max(x1 - x0, 1.0)
            clip = fitz.Rect(
                x0 - sw * args.side_mult,
                y0 - sh * args.above_mult,
                x1 + sw * args.side_mult,
                y1 + sh * args.below_mult,
            )
            clip &= page.rect

            nombre, precio = H.guess_nombre_precio(
                words, x0, y0, x1, y1, sw, sh, args.side_mult, args.above_mult, token
            )
            img_path = out_img / f"{token}{ext}"
            if write_images and (args.force or not img_path.is_file()):
                pix = page.get_pixmap(clip=clip, dpi=args.dpi)
                img = Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")
                img = img.resize((480, 480), Image.Resampling.LANCZOS)
                if args.format == "webp":
                    img.save(img_path, format="WEBP", quality=84, method=4)
                else:
                    img.save(img_path, optimize=True)

            if token not in by_sku:
                by_sku[token] = {
                    "sku": token,
                    "nombre": nombre,
                    "precio": precio,
                    "categoriaId": "catalogo-pdf",
                    "imagen": f"{token}{ext}",
                }
            else:
                prev = by_sku[token]
                if len(nombre) > len(prev["nombre"]):
                    prev["nombre"] = nombre
                if precio > prev.get("precio", 0):
                    prev["precio"] = precio

        print(f"Página {pi + 1}/{len(doc)}: acumulado {len(by_sku)} SKUs únicos", flush=True)
        if max_skus and len(by_sku) >= max_skus:
            break

    doc.close()

    productos = sorted(by_sku.values(), key=lambda p: p["sku"])
    payload = {
        "titulo": "Catálogo de precios — Maqjeez Repuestos",
        "subtitulo": H.texto_maqjeez(
            "Lista pública generada desde PDF de referencia. Precios en pantalla = lista × 4. Revisar nombres y montos."
        ),
        "categorias": [{"id": "catalogo-pdf", "nombre": "Catálogo repuestos", "orden": 1}],
        "productos": productos,
    }

    if args.report:
        _print_report(productos, H.PRECIO_VENTA_MULT)
        print(
            f"\nReporte: {len(productos)} ítems (max-skus={max_skus or '∞'}). "
            "Sin escribir JSON. Para generar todo: quitá --report.",
            file=sys.stderr,
        )

    if write_json:
        out_json.parent.mkdir(parents=True, exist_ok=True)
        out_json.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    if not args.report:
        print(f"Listo: {len(productos)} productos → {out_json} | imágenes en {out_img} ({ext})")
    elif write_images:
        print(f"Listo: {len(productos)} imágenes en {out_img} ({ext})", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
