#!/usr/bin/env python3
"""
Extracción por RECORTE real del PDF (alta resolución) + contornos OpenCV + OCR (Tesseract)
para tarjetas blancas, precio tapado y reescrito ×4.

No redibuja el catálogo desde cero: rasteriza la página y recorta cada tarjeta.

Requisitos (cwd = apps/taller-demo):
  pip install -r scripts/catalogo/requirements-catalog-ocr.txt
  + Tesseract en el sistema. Windows:
    set TESSERACT_CMD=C:\\Program Files\\Tesseract-OCR\\tesseract.exe

Ejemplo:
  python scripts/catalogo/extractor.py --pdf scripts/catalogo.pdf --out productos_extraidos --pages 0
  python scripts/catalogo/extractor.py --pages all --zoom 2.0 --area-min 30000 --area-max 180000
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path

_SCRIPT_DIR = Path(__file__).resolve().parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))
import pdf_catalog_helpers as H  # noqa: E402


def limpiar_nombre_carpeta(texto: str) -> str:
    limpio = re.sub(r"[^A-Za-z0-9]+", "_", texto)
    return limpio.strip("_") or "item"


def _setup_tesseract() -> None:
    import pytesseract

    cmd = os.environ.get("TESSERACT_CMD", "").strip()
    if cmd:
        pytesseract.pytesseract.tesseract_cmd = cmd


def _parse_precio_ocr_token(raw: str) -> int | None:
    s = raw.strip().replace(" ", "")
    return H.parse_precio_token(s)


def _find_sku_en_texto(lineas: list[str]) -> tuple[str, int]:
    for i, ln in enumerate(lineas):
        for tok in re.split(r"\s+", ln):
            tok = tok.strip()
            if H.SKU_RE.match(tok):
                return tok, i
    return "", -1


def procesar_tarjeta(
    tarjeta_bgr,
    *,
    mult: int,
    lang: str,
):
    """Recorte BGR → OCR → tapa precio → escribe precio×mult. Devuelve (imagen_bgr, sku, descripcion)."""
    import cv2
    import numpy as np
    import pytesseract
    from PIL import Image, ImageDraw, ImageFont

    img_rgb = cv2.cvtColor(tarjeta_bgr, cv2.COLOR_BGR2RGB)
    pil = Image.fromarray(img_rgb)
    draw = ImageDraw.Draw(pil)

    texto_completo = pytesseract.image_to_string(pil, lang=lang)
    lineas = [l.strip() for l in texto_completo.split("\n") if l.strip()]

    sku, idx = _find_sku_en_texto(lineas)
    if not sku:
        sku = "SIN_SKU"
    descripcion = (
        " ".join(lineas[idx + 1 : idx + 4]).strip()
        if idx >= 0 and idx + 1 < len(lineas)
        else "Producto"
    )
    if len(descripcion) < 2:
        descripcion = lineas[1] if len(lineas) > 1 else "Producto"

    datos = pytesseract.image_to_data(
        pil, output_type=pytesseract.Output.DICT, lang=lang
    )
    n = len(datos.get("text", []))
    for i in range(n):
        texto = (datos["text"][i] or "").strip()
        if not texto or int(datos["conf"][i] or -1) < 0:
            continue
        precio = _parse_precio_ocr_token(texto)
        if precio is None or precio < 100:
            continue
        if not re.search(r"\$|\d{3,}", texto):
            continue

        precio_nuevo = precio * mult
        precio_txt = "$" + f"{precio_nuevo:,}".replace(",", ".")

        x, y, w, h = (
            int(datos["left"][i]),
            int(datos["top"][i]),
            int(datos["width"][i]),
            int(datos["height"][i]),
        )
        mx, my = 12, 6
        draw.rectangle(
            [x - mx, y - my, x + w + mx, y + h + my],
            fill=(255, 255, 255),
        )
        try:
            font = ImageFont.truetype(
                "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 20
            )
        except OSError:
            try:
                font = ImageFont.truetype("arialbd.ttf", 18)
            except OSError:
                font = ImageFont.load_default()

        bbox = draw.textbbox((0, 0), precio_txt, font=font)
        tw = bbox[2] - bbox[0]
        tx = x + (w - tw) / 2
        draw.text((tx, y - 1), precio_txt, fill=(20, 60, 160), font=font)
        break

    out_bgr = cv2.cvtColor(np.array(pil), cv2.COLOR_RGB2BGR)
    return out_bgr, sku, descripcion


def extraer_tarjetas_pagina(
    page_img,
    *,
    area_min: int,
    area_max: int,
    mult: int,
    lang: str,
    out_dir: Path,
    page_label: str,
) -> int:
    import cv2

    gray = cv2.cvtColor(page_img, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    _, thresh = cv2.threshold(blur, 240, 255, cv2.THRESH_BINARY_INV)
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    tarjetas: list[tuple[int, int, int, int]] = []
    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        a = w * h
        if area_min < a < area_max:
            tarjetas.append((x, y, w, h))

    row_q = max(40, page_img.shape[0] // 25)
    tarjetas.sort(key=lambda b: (b[1] // row_q, b[0]))

    n_ok = 0
    for x, y, w, h in tarjetas:
        crop = page_img[y : y + h, x : x + w].copy()
        final_bgr, sku, desc = procesar_tarjeta(crop, mult=mult, lang=lang)
        slug_s = limpiar_nombre_carpeta(sku)
        slug_d = limpiar_nombre_carpeta(desc)[:80]
        carpeta = out_dir / f"{slug_s}__{slug_d}"
        carpeta.mkdir(parents=True, exist_ok=True)
        out_path = carpeta / "imagen_tarjeta.png"
        cv2.imwrite(str(out_path), final_bgr)
        meta = {
            "sku": sku,
            "descripcionOcr": desc,
            "precioListaInferido": None,
            "mult": mult,
            "origen": "extractor_contorno_ocr",
            "pagina": page_label,
        }
        (carpeta / "meta.json").write_text(
            json.dumps(meta, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        print(f"OK {carpeta.name}", flush=True)
        n_ok += 1
    return n_ok


def main() -> int:
    ap = argparse.ArgumentParser(description="PDF → recorte tarjetas (OpenCV) + OCR + precio×N")
    ap.add_argument("--pdf", default=H.DEFAULT_CATALOG_PDF_REL)
    ap.add_argument("--out", default="productos_extraidos", help="Carpeta salida (relativa a cwd)")
    ap.add_argument("--pages", default="0", help='all | 0 | "0-2"')
    ap.add_argument("--zoom", type=float, default=2.0, help="Matriz PyMuPDF (calidad raster)")
    ap.add_argument("--area-min", type=int, default=30_000)
    ap.add_argument("--area-max", type=int, default=180_000)
    ap.add_argument("--mult", type=int, default=H.PRECIO_VENTA_MULT)
    ap.add_argument(
        "--lang",
        default="spa+eng",
        help="Idiomas Tesseract (spa+eng recomendado para catálogo ES)",
    )
    args = ap.parse_args()

    try:
        import cv2  # noqa: F401
        import fitz  # noqa: F401
        import numpy as np  # noqa: F401
        import pytesseract  # noqa: F401
    except ImportError:
        print(
            "Instalá: pip install -r scripts/catalogo/requirements-catalog-ocr.txt",
            file=sys.stderr,
        )
        return 1

    _setup_tesseract()
    try:
        import pytesseract as _pt

        _pt.get_tesseract_version()
    except Exception as e:
        print(
            "Tesseract no disponible. Definí TESSERACT_CMD o instalá Tesseract.\n"
            f"Detalle: {e}",
            file=sys.stderr,
        )
        return 1

    pdf_path = H.resolve_catalog_pdf(args.pdf, Path.cwd())
    if not pdf_path.is_file():
        print(f"No existe el PDF: {pdf_path}", file=sys.stderr)
        return 1

    out_dir = Path(args.out).expanduser().resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    import cv2
    import fitz
    import numpy as np

    doc = fitz.open(pdf_path)
    try:
        indices = H.parse_pages_arg(args.pages, len(doc))
    except ValueError as e:
        print(e, file=sys.stderr)
        doc.close()
        return 1

    mat = fitz.Matrix(args.zoom, args.zoom)
    total = 0
    for pi in indices:
        page = doc[pi]
        pix = page.get_pixmap(matrix=mat, alpha=False)
        arr = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.h, pix.w, pix.n)
        if pix.n == 4:
            arr = cv2.cvtColor(arr, cv2.COLOR_RGBA2BGR)
        else:
            arr = cv2.cvtColor(arr, cv2.COLOR_RGB2BGR)
        n = extraer_tarjetas_pagina(
            arr,
            area_min=args.area_min,
            area_max=args.area_max,
            mult=args.mult,
            lang=args.lang,
            out_dir=out_dir,
            page_label=str(pi + 1),
        )
        total += n
        print(f"Página {pi + 1}: {n} tarjetas", flush=True)

    doc.close()
    print(f"\nListo: {total} tarjetas en {out_dir}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
