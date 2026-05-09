#!/usr/bin/env python3
"""
Crea carpetas por artículo con imagen.webp (tarjeta vertical 360×480, estilo catálogo Konecta) y meta.json (precio lista + precioVenta ×4).

Layout por defecto:
  public/catalogo/Catalogo-Abril-2026-Maqjeez-Repuestos/productos/<carpeta>/

Layout --flat (solo bajo “catálogo”):
  public/catalogo/productos/<carpeta>/

Requisitos: PDF en scripts/Catalogo Abril 2026 Konecta Repuestos.pdf (cwd apps/taller-demo), o --pdf.

Primeras 10 + JSON:
  python scripts/catalogo/build_product_folders.py --pages all --limit 10 --flat --force --update-json
"""
from __future__ import annotations

import argparse
import io
import json
import sys
from collections import OrderedDict
from pathlib import Path

# Import helpers (mismo directorio que este script)
_SCRIPT_DIR = Path(__file__).resolve().parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))

import pdf_catalog_helpers as H  # noqa: E402


def collect_skus_first_occurrence(
    doc, page_indices: list[int]
) -> OrderedDict[str, tuple[int, float, float, float, float]]:
    """sku -> (page_idx, x0,y0,x1,y1) primera aparición en orden de páginas y palabras."""
    occ: OrderedDict[str, tuple[int, float, float, float, float]] = OrderedDict()
    for pi in page_indices:
        page = doc[pi]
        words = page.get_text("words") or []
        seen_line: set[str] = set()
        for w in words:
            token = (w[4] or "").strip()
            if not H.SKU_RE.match(token) or token in seen_line:
                continue
            seen_line.add(token)
            if token not in occ:
                occ[token] = (
                    pi,
                    float(w[0]),
                    float(w[1]),
                    float(w[2]),
                    float(w[3]),
                )
    return occ


def render_tarjeta_catalogo(
    page,
    x0: float,
    y0: float,
    x1: float,
    y1: float,
    *,
    width_px: int,
    height_px: int,
    half_width_mult: float,
    half_height_mult: float,
    dpi: int,
):
    """
    Recorte vertical en el PDF (más alto que ancho), centrado en el SKU,
    y salida fija width_px × height_px como la tarjeta del catálogo (foto + código + texto + precio).
    """
    import fitz
    from PIL import Image, ImageOps

    cx = (x0 + x1) / 2
    cy = (y0 + y1) / 2
    sh = max(y1 - y0, 1.0)
    sw = max(x1 - x0, 1.0)
    hw = sw * half_width_mult
    hh = sh * half_height_mult
    r = fitz.Rect(cx - hw, cy - hh, cx + hw, cy + hh) & page.rect
    pix = page.get_pixmap(clip=r, dpi=dpi, alpha=False)
    img = Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")
    # Recorte proporcional al tamaño tarjeta; centrado un poco arriba para priorizar la foto del artículo
    return ImageOps.fit(
        img,
        (width_px, height_px),
        method=Image.Resampling.LANCZOS,
        centering=(0.5, 0.36),
    )


def load_json_products(path: Path) -> dict[str, dict]:
    if not path.is_file():
        return {}
    data = json.loads(path.read_text(encoding="utf-8"))
    prods = data.get("productos") if isinstance(data, dict) else None
    if not isinstance(prods, list):
        return {}
    out: dict[str, dict] = {}
    for p in prods:
        if not isinstance(p, dict):
            continue
        sku = str(p.get("sku", "")).strip()
        if sku:
            out[sku] = p
    return out


def imagen_rel_url(folder_name: str, *, flat: bool) -> str:
    if flat:
        return f"{H.PRODUCTOS_SUBDIR}/{folder_name}/imagen.webp"
    return f"{H.CATALOG_PARENT_DIR}/{H.PRODUCTOS_SUBDIR}/{folder_name}/imagen.webp"


def main() -> int:
    ap = argparse.ArgumentParser(
        description="Carpetas por artículo + imagen tarjeta catálogo (vertical, tipo Konecta)"
    )
    ap.add_argument("--pdf", default=H.DEFAULT_CATALOG_PDF_REL)
    ap.add_argument(
        "--json",
        default="data/catalogo-public.json",
        help="Opcional: enriquecer nombre/precio/categoría; si falta un SKU se infiere del PDF",
    )
    ap.add_argument(
        "--out-root",
        default="public/catalogo",
        help="Raíz (sitio: /catalogo/...). Con --flat: out-root/productos/<carpeta>/",
    )
    ap.add_argument(
        "--flat",
        action="store_true",
        help="Carpetas directamente en out-root/productos/ (sin subcarpeta Catalogo-Abril-2026-...)",
    )
    ap.add_argument("--pages", default="all", help='all | 0 | "0-5"')
    ap.add_argument("--limit", type=int, default=0, help="Solo los primeros N SKUs (0 = sin límite). Ej. test: --limit 1 --pages 0")
    ap.add_argument(
        "--card-w",
        type=int,
        default=H.PREVIEW_CARD_WIDTH_PX,
        help="Ancho salida tarjeta (px), default 360",
    )
    ap.add_argument(
        "--card-h",
        type=int,
        default=H.PREVIEW_CARD_HEIGHT_PX,
        help="Alto salida tarjeta (px), default 480",
    )
    ap.add_argument("--dpi", type=int, default=200)
    ap.add_argument(
        "--half-width-mult",
        type=float,
        default=8.0,
        help="Mitad ancho del recorte en PDF = ancho_SKU * este valor",
    )
    ap.add_argument(
        "--half-height-mult",
        type=float,
        default=26.0,
        help="Mitad alto del recorte en PDF = alto_SKU * este valor (mayor que half-width → tarjeta vertical)",
    )
    ap.add_argument("--side-mult", type=float, default=6.0, help="Para guess_nombre_precio si no hay JSON")
    ap.add_argument("--above-mult", type=float, default=28.0)
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--update-json", action="store_true", help="Actualiza campo imagen en catalogo-public.json")
    args = ap.parse_args()

    pdf_path = Path(args.pdf).expanduser().resolve()
    if not pdf_path.is_file():
        print(f"No existe el PDF: {pdf_path}", file=sys.stderr)
        print(
            "Esperado en apps/taller-demo/scripts/ (Catalogo Abril 2026 Konecta Repuestos.pdf) o indicá --pdf.",
            file=sys.stderr,
        )
        return 1

    try:
        import fitz  # noqa: F401
    except ImportError:
        print("Instalá: pip install -r scripts/catalogo/requirements.txt", file=sys.stderr)
        return 1

    json_path = Path(args.json).expanduser().resolve()
    by_json = load_json_products(json_path)

    out_root = Path(args.out_root).expanduser().resolve()
    product_root = (out_root / H.PRODUCTOS_SUBDIR) if args.flat else (out_root / H.CATALOG_PARENT_DIR / H.PRODUCTOS_SUBDIR)
    if not args.dry_run:
        product_root.mkdir(parents=True, exist_ok=True)

    doc = fitz.open(pdf_path)
    try:
        page_indices = H.parse_pages_arg(args.pages, len(doc))
    except ValueError as e:
        print(e, file=sys.stderr)
        doc.close()
        return 1

    occ = collect_skus_first_occurrence(doc, page_indices)
    skus = list(occ.keys())
    if args.limit and args.limit > 0:
        skus = skus[: args.limit]

    web_hint = (
        f"/catalogo/{H.PRODUCTOS_SUBDIR}/<carpeta>/imagen.webp"
        if args.flat
        else f"/catalogo/{H.CATALOG_PARENT_DIR}/{H.PRODUCTOS_SUBDIR}/<carpeta>/imagen.webp"
    )
    print(
        f"Directorio base de artículos:\n  {product_root}\n"
        f"(URL web: {web_hint})\n"
        f"SKUs a procesar: {len(skus)} (total únicos en páginas elegidas: {len(occ)})",
        flush=True,
    )

    updated_rows: dict[str, dict] = {}
    missing_json: list[str] = []

    for sku in skus:
        pi, x0, y0, x1, y1 = occ[sku]
        page = doc[pi]
        words = page.get_text("words") or []
        sw = max(x1 - x0, 1.0)
        sh = max(y1 - y0, 1.0)

        if sku in by_json:
            row = dict(by_json[sku])
            nombre = str(row.get("nombre") or "").strip() or H.texto_maqjeez(f"Artículo {sku}")
            nombre = H.texto_maqjeez(nombre)
            pr = row.get("precio")
            if isinstance(pr, (int, float)) and pr == pr:  # not NaN
                precio = max(0, int(round(float(pr))))
            else:
                precio = 0
            cat = str(row.get("categoriaId") or "catalogo-pdf")
        else:
            missing_json.append(sku)
            nombre, precio = H.guess_nombre_precio(
                words, x0, y0, x1, y1, sw, sh, args.side_mult, args.above_mult, sku
            )
            cat = "catalogo-pdf"
            row = {
                "sku": sku,
                "nombre": nombre,
                "precio": precio,
                "categoriaId": cat,
            }

        folder = H.product_folder_name(nombre, sku)
        dest_dir = product_root / folder
        img_path = dest_dir / "imagen.webp"
        meta_path = dest_dir / "meta.json"

        precio_venta = (
            round(precio * H.PRECIO_VENTA_MULT)
            if precio > 0
            else 0
        )
        meta = {
            "sku": sku,
            "nombre": nombre,
            "precioLista": precio,
            "precioVenta": precio_venta,
            "categoriaId": cat,
            "carpeta": folder,
        }

        if not args.dry_run:
            dest_dir.mkdir(parents=True, exist_ok=True)
            if args.force or not img_path.is_file():
                img = render_tarjeta_catalogo(
                    page,
                    x0,
                    y0,
                    x1,
                    y1,
                    width_px=args.card_w,
                    height_px=args.card_h,
                    half_width_mult=args.half_width_mult,
                    half_height_mult=args.half_height_mult,
                    dpi=args.dpi,
                )
                img.save(img_path, format="WEBP", quality=86, method=4)
            meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")

        rel = imagen_rel_url(folder, flat=args.flat)
        updated_rows[sku] = {**row, "imagen": rel}
        print(f"OK {sku} → {folder}/", flush=True)

    doc.close()

    if missing_json and len(missing_json) <= 30:
        print(f"SKUs sin fila en JSON (nombre/precio inferidos): {', '.join(missing_json)}", flush=True)
    elif missing_json:
        print(f"SKUs sin fila en JSON: {len(missing_json)} (inferidos del PDF)", flush=True)

    if args.update_json and json_path.is_file() and not args.dry_run:
        raw = json.loads(json_path.read_text(encoding="utf-8"))
        if not isinstance(raw, dict):
            print("JSON inválido: no es objeto", file=sys.stderr)
            return 1
        prods = raw.get("productos")
        if not isinstance(prods, list):
            print("JSON sin lista productos", file=sys.stderr)
            return 1
        json_skus: set[str] = set()
        new_list: list[dict] = []
        for p in prods:
            if not isinstance(p, dict):
                continue
            sku = str(p.get("sku", "")).strip()
            json_skus.add(sku)
            if sku in updated_rows:
                new_list.append(updated_rows[sku])
            else:
                new_list.append(p)
        for sku, merged in updated_rows.items():
            if sku not in json_skus:
                new_list.append(merged)
        raw["productos"] = new_list
        json_path.write_text(json.dumps(raw, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"Actualizado {json_path} (campo imagen + productos solo-PDF si aplica)", flush=True)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
