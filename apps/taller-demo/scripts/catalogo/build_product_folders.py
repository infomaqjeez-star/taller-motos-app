#!/usr/bin/env python3
"""
Crea carpetas por artículo con imagen.webp (tarjeta vertical 360×480, estilo catálogo Konecta) y meta.json (precio lista + precioVenta ×4).

Layout por defecto:
  public/catalogo/Catalogo-Abril-2026-Maqjeez-Repuestos/productos/<carpeta>/

Layout --flat (solo bajo “catálogo”):
  public/catalogo/productos/<carpeta>/

Requisitos: PDF catalogo.pdf en scripts/ o public/catalogo/ (cwd apps/taller-demo), o --pdf / CATALOGO_PDF.

Primeras 10 + JSON:
  python scripts/catalogo/build_product_folders.py --pages all --limit 10 --flat --force --update-json

Variantes de imagen para comparar (misma carpeta, varios webp):
  python scripts/catalogo/build_product_folders.py --pages all --limit 10 --flat --force --emit-variants
"""
from __future__ import annotations

import argparse
import io
import json
import sys
from typing import Any
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
    centering: tuple[float, float] = (0.5, 0.36),
    cy_shift_mult: float = 0.0,
):
    """
    Recorte vertical en el PDF (más alto que ancho), centrado en el SKU,
    y salida fija width_px × height_px como la tarjeta del catálogo (foto + código + texto + precio).
    cy_shift_mult mueve el centro del recorte en unidades de alto_SKU (negativo = subir).
    """
    import fitz
    from PIL import Image, ImageOps

    cx = (x0 + x1) / 2
    cy = (y0 + y1) / 2
    sh = max(y1 - y0, 1.0)
    sw = max(x1 - x0, 1.0)
    cy = cy + cy_shift_mult * sh
    hw = sw * half_width_mult
    hh = sh * half_height_mult
    r = fitz.Rect(cx - hw, cy - hh, cx + hw, cy + hh) & page.rect
    pix = page.get_pixmap(clip=r, dpi=dpi, alpha=False)
    img = Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")
    return ImageOps.fit(
        img,
        (width_px, height_px),
        method=Image.Resampling.LANCZOS,
        centering=centering,
    )


def _pil_grid_cell_tarjeta(
    page,
    x0: float,
    y0: float,
    x1: float,
    y1: float,
    *,
    width_px: int,
    height_px: int,
    dpi: int,
    grid_cols: int,
    grid_rows: int,
    grid_mx: float,
    grid_mt: float,
    grid_mb: float,
):
    """Raster de la celda de rejilla que contiene el SKU (foto + texto del bloque)."""
    import fitz
    from PIL import Image, ImageOps

    scx = (x0 + x1) / 2
    scy = (y0 + y1) / 2
    cell = H.catalog_grid_cell_containing_point(
        page,
        scx,
        scy,
        cols=grid_cols,
        rows=grid_rows,
        margin_x_frac=grid_mx,
        margin_top_frac=grid_mt,
        margin_bottom_frac=grid_mb,
    )
    if cell is None or cell.is_empty:
        return None
    clip = (fitz.Rect(cell) + (-1, -1, 1, 1)) & page.rect
    pix = page.get_pixmap(clip=clip, dpi=max(int(dpi), 220), alpha=False)
    img = Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")
    return ImageOps.fit(
        img,
        (width_px, height_px),
        method=Image.Resampling.LANCZOS,
        centering=(0.5, 0.5),
    )


def render_product_card_image(
    page,
    x0: float,
    y0: float,
    x1: float,
    y1: float,
    *,
    image_mode: str,
    width_px: int,
    height_px: int,
    half_width_mult: float,
    half_height_mult: float,
    dpi: int,
    grid_cols: int = 5,
    grid_rows: int = 3,
    grid_mx: float = 0.02,
    grid_mt: float = 0.12,
    grid_mb: float = 0.03,
):
    """
    Salida tarjeta:
    - grid: raster de la celda 5×3 (u otra rejilla) que contiene el código — incluye la foto.
    - auto: rejilla → embebido → raster centrado en SKU (Konecta suele necesitar rejilla).
    - raster / photo: como antes.
    """
    import fitz
    from PIL import Image, ImageOps

    mode = (image_mode or "auto").strip().lower()

    def _raster_sku():
        return render_tarjeta_catalogo(
            page,
            x0,
            y0,
            x1,
            y1,
            width_px=width_px,
            height_px=height_px,
            half_width_mult=half_width_mult,
            half_height_mult=half_height_mult,
            dpi=dpi,
        )

    if mode == "grid":
        pil = _pil_grid_cell_tarjeta(
            page,
            x0,
            y0,
            x1,
            y1,
            width_px=width_px,
            height_px=height_px,
            dpi=dpi,
            grid_cols=grid_cols,
            grid_rows=grid_rows,
            grid_mx=grid_mx,
            grid_mt=grid_mt,
            grid_mb=grid_mb,
        )
        return pil if pil is not None else _raster_sku()

    if mode == "raster":
        return _raster_sku()

    if mode == "photo":
        t = H.embedded_product_image_rect(page, x0, y0, x1, y1)
        if t is not None:
            rx0, ry0, rx1, ry1 = t
            clip = (fitz.Rect(rx0, ry0, rx1, ry1) + (-2, -2, 2, 2)) & page.rect
            pix = page.get_pixmap(clip=clip, dpi=max(int(dpi), 240), alpha=False)
            img = Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")
            return ImageOps.fit(
                img,
                (width_px, height_px),
                method=Image.Resampling.LANCZOS,
                centering=(0.5, 0.48),
            )
        return _raster_sku()

    # auto
    pil = _pil_grid_cell_tarjeta(
        page,
        x0,
        y0,
        x1,
        y1,
        width_px=width_px,
        height_px=height_px,
        dpi=dpi,
        grid_cols=grid_cols,
        grid_rows=grid_rows,
        grid_mx=grid_mx,
        grid_mt=grid_mt,
        grid_mb=grid_mb,
    )
    if pil is not None:
        return pil

    t = H.embedded_product_image_rect(page, x0, y0, x1, y1)
    if t is not None:
        rx0, ry0, rx1, ry1 = t
        clip = (fitz.Rect(rx0, ry0, rx1, ry1) + (-2, -2, 2, 2)) & page.rect
        pix = page.get_pixmap(clip=clip, dpi=max(int(dpi), 240), alpha=False)
        img = Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")
        return ImageOps.fit(
            img,
            (width_px, height_px),
            method=Image.Resampling.LANCZOS,
            centering=(0.5, 0.48),
        )

    return _raster_sku()


def _pil_embed_only(
    page,
    x0: float,
    y0: float,
    x1: float,
    y1: float,
    *,
    width_px: int,
    height_px: int,
    dpi: int,
    centering: tuple[float, float],
):
    import fitz
    from PIL import Image, ImageOps

    t = H.embedded_product_image_rect(page, x0, y0, x1, y1)
    if t is None:
        return None
    rx0, ry0, rx1, ry1 = t
    clip = (fitz.Rect(rx0, ry0, rx1, ry1) + (-2, -2, 2, 2)) & page.rect
    pix = page.get_pixmap(clip=clip, dpi=max(int(dpi), 240), alpha=False)
    img = Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")
    return ImageOps.fit(
        img,
        (width_px, height_px),
        method=Image.Resampling.LANCZOS,
        centering=centering,
    )


def iter_preview_variant_images(
    page,
    x0: float,
    y0: float,
    x1: float,
    y1: float,
    *,
    card_w: int,
    card_h: int,
    dpi: int,
    half_w: float,
    half_h: float,
    grid_cols: int = 5,
    grid_rows: int = 3,
    grid_mx: float = 0.02,
    grid_mt: float = 0.12,
    grid_mb: float = 0.03,
) -> list[tuple[str, Any]]:
    """Lista (slug, PIL.Image) para comparar métodos en disco (imagen_variant_*.webp)."""
    from PIL import Image

    out: list[tuple[str, Image.Image]] = []

    gcell = _pil_grid_cell_tarjeta(
        page,
        x0,
        y0,
        x1,
        y1,
        width_px=card_w,
        height_px=card_h,
        dpi=dpi,
        grid_cols=grid_cols,
        grid_rows=grid_rows,
        grid_mx=grid_mx,
        grid_mt=grid_mt,
        grid_mb=grid_mb,
    )
    if gcell is not None:
        out.append(("raster_grid", gcell))

    emb = _pil_embed_only(
        page,
        x0,
        y0,
        x1,
        y1,
        width_px=card_w,
        height_px=card_h,
        dpi=dpi,
        centering=(0.5, 0.5),
    )
    if emb is not None:
        out.append(("embed", emb))

    raster_specs: list[tuple[str, float, float, int, tuple[float, float], float]] = [
        ("raster_default", half_w, half_h, dpi, (0.5, 0.36), 0.0),
        ("raster_top", half_w, half_h, dpi, (0.5, 0.22), 0.0),
        ("raster_bottom", half_w, half_h, dpi, (0.5, 0.55), 0.0),
        ("raster_shift_up_clip", half_w, half_h, dpi, (0.5, 0.36), -0.35),
        ("raster_hi300", half_w, half_h, max(dpi, 300), (0.5, 0.34), 0.0),
        ("raster_tight", 6.0, 22.0, dpi, (0.5, 0.30), 0.0),
        ("raster_loose", 11.0, 30.0, dpi, (0.5, 0.38), 0.0),
        ("raster_wide_short", 12.0, 20.0, dpi, (0.5, 0.28), 0.0),
    ]
    for slug, hw, hh, d, cent, cysh in raster_specs:
        out.append(
            (
                slug,
                render_tarjeta_catalogo(
                    page,
                    x0,
                    y0,
                    x1,
                    y1,
                    width_px=card_w,
                    height_px=card_h,
                    half_width_mult=hw,
                    half_height_mult=hh,
                    dpi=d,
                    centering=cent,
                    cy_shift_mult=cysh,
                ),
            )
        )

    out.append(
        (
            "auto_grid_embed_raster",
            render_product_card_image(
                page,
                x0,
                y0,
                x1,
                y1,
                image_mode="auto",
                width_px=card_w,
                height_px=card_h,
                half_width_mult=half_w,
                half_height_mult=half_h,
                dpi=dpi,
                grid_cols=grid_cols,
                grid_rows=grid_rows,
                grid_mx=grid_mx,
                grid_mt=grid_mt,
                grid_mb=grid_mb,
            ),
        )
    )
    return out


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
        help="Raíz de salida. Con --flat: out-root/productos/<carpeta>/. "
        "Para carpetas solo en tu disco (fuera del repo), usá ruta absoluta; "
        "en npm podés setear CATALOGO_PRODUCTOS_ROOT.",
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
        "--image-mode",
        choices=("auto", "raster", "photo", "grid"),
        default="auto",
        help="auto: rejilla 5×3 → embebido → raster SKU; grid: solo rejilla (fallback raster); "
        "raster / photo: como antes.",
    )
    ap.add_argument("--grid-cols", type=int, default=5, help="Columnas rejilla catálogo (Konecta típico 5)")
    ap.add_argument("--grid-rows", type=int, default=3, help="Filas rejilla por página (típico 3)")
    ap.add_argument(
        "--grid-mx",
        type=float,
        default=0.02,
        help="Margen lateral rejilla, fracción del ancho de página (0..0.45)",
    )
    ap.add_argument(
        "--grid-mt",
        type=float,
        default=0.12,
        help="Margen superior (banda título + hueco), fracción alto página",
    )
    ap.add_argument(
        "--grid-mb",
        type=float,
        default=0.03,
        help="Margen inferior rejilla, fracción alto página",
    )
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
    ap.add_argument(
        "--emit-variants",
        action="store_true",
        help="Guarda imagen_variant_<nombre>.webp con varios recortes/embed para elegir cuál se ve bien",
    )
    ap.add_argument("--update-json", action="store_true", help="Actualiza campo imagen en catalogo-public.json")
    args = ap.parse_args()

    pdf_path = H.resolve_catalog_pdf(args.pdf, Path.cwd())
    if not pdf_path.is_file():
        print(f"No existe el PDF: {pdf_path}", file=sys.stderr)
        print(
            "Colocá el archivo en una de:\n"
            + "\n".join(f"  - {c}" for c in H.CATALOG_PDF_CANDIDATES)
            + "\n  …o pasá la ruta con --pdf (cwd: apps/taller-demo).",
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
    if args.emit_variants:
        print(
            "Modo variantes: cada carpeta tendrá imagen_variant_<metodo>.webp "
            "(compará en el Explorador cuál queda bien).",
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
                img = render_product_card_image(
                    page,
                    x0,
                    y0,
                    x1,
                    y1,
                    image_mode=args.image_mode,
                    width_px=args.card_w,
                    height_px=args.card_h,
                    half_width_mult=args.half_width_mult,
                    half_height_mult=args.half_height_mult,
                    dpi=args.dpi,
                    grid_cols=args.grid_cols,
                    grid_rows=args.grid_rows,
                    grid_mx=args.grid_mx,
                    grid_mt=args.grid_mt,
                    grid_mb=args.grid_mb,
                )
                img.save(img_path, format="WEBP", quality=86, method=4)
            if args.emit_variants:
                for vslug, vim in iter_preview_variant_images(
                    page,
                    x0,
                    y0,
                    x1,
                    y1,
                    card_w=args.card_w,
                    card_h=args.card_h,
                    dpi=args.dpi,
                    half_w=args.half_width_mult,
                    half_h=args.half_height_mult,
                    grid_cols=args.grid_cols,
                    grid_rows=args.grid_rows,
                    grid_mx=args.grid_mx,
                    grid_mt=args.grid_mt,
                    grid_mb=args.grid_mb,
                ):
                    vpath = dest_dir / f"imagen_variant_{vslug}.webp"
                    vim.save(vpath, format="WEBP", quality=86, method=4)
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
