#!/usr/bin/env python3
"""
Catálogo PDF (rejilla regular, p. ej. 4×5 por página) → imágenes por tarjeta con precio
releído por OCR, tapado y reescrito (lista × 4).

Requisitos:
  pip install -r scripts/catalogo/requirements-catalog-ocr.txt
  + Tesseract instalado en el sistema.

Windows:
  set TESSERACT_CMD=C:\\Program Files\\Tesseract-OCR\\tesseract.exe

Ejemplo (cwd = apps/taller-demo, PDF por defecto en scripts/):
  python scripts/catalogo/catalog_grid_ocr_pipeline.py --out data/catalogo-ocr-export --pages 0 --dry-run
"""
from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path

_SCRIPT_DIR = Path(__file__).resolve().parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))
import pdf_catalog_helpers as _cat  # noqa: E402

MULT_DEFAULT = 4

_PRICE_RE = re.compile(
    r"(?:\$?\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d{2})?|\d+,\d{2}|\d{4,10})",
    re.IGNORECASE,
)


def parse_precio_ocr(s: str) -> int | None:
    s = s.replace(" ", "").replace("\n", " ")
    m = _PRICE_RE.search(s)
    if not m:
        return None
    raw = m.group(1)
    if re.fullmatch(r"\d{1,3}(\.\d{3})+,\d{2}", raw):
        ent = raw.rsplit(",", 1)[0].replace(".", "")
        dec = raw.rsplit(",", 1)[1]
        try:
            return int(round(float(ent + "." + dec)))
        except ValueError:
            return None
    if re.fullmatch(r"\d+,\d{2}", raw):
        a, b = raw.split(",", 1)
        try:
            return int(round(float(a + "." + b)))
        except ValueError:
            return None
    if re.fullmatch(r"\d{1,3}(\.\d{3})+", raw):
        try:
            return int(raw.replace(".", ""))
        except ValueError:
            return None
    if re.fullmatch(r"\d{4,10}", raw):
        return int(raw)
    return None


def format_precio_ar(n: int) -> str:
    s = str(max(0, n))
    parts: list[str] = []
    while len(s) > 3:
        parts.insert(0, s[-3:])
        s = s[:-3]
    parts.insert(0, s)
    return "$" + ".".join(parts)


def main() -> int:
    ap = argparse.ArgumentParser(description="PDF catálogo rejilla + OCR precio ×4")
    ap.add_argument("--pdf", default=_cat.DEFAULT_CATALOG_PDF_REL)
    ap.add_argument("--out", default="data/catalogo-ocr-export")
    ap.add_argument("--pages", default="all", help='all | 0 | "0-10" | "0,1,2"')
    ap.add_argument("--zoom", type=float, default=2.0)
    ap.add_argument("--cols", type=int, default=4)
    ap.add_argument("--rows", type=int, default=5)
    ap.add_argument("--margin-x", type=float, default=0.02)
    ap.add_argument("--margin-y", type=float, default=0.02)
    ap.add_argument("--mult", type=int, default=MULT_DEFAULT)
    ap.add_argument("--bottom-ratio", type=float, default=0.32)
    ap.add_argument("--skip-no-price", action="store_true")
    ap.add_argument("--mode", choices=("grid", "contour"), default="grid")
    ap.add_argument("--contour-area-min", type=int, default=20000)
    ap.add_argument("--contour-area-max", type=int, default=500_000)
    ap.add_argument("--sort-y-quant", type=int, default=50)
    ap.add_argument("--tesseract", default="")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    try:
        import cv2
        import fitz
        import numpy as np
        import pytesseract
        from PIL import Image, ImageDraw, ImageFont
    except ImportError:
        print(
            "Falta dependencia: pip install -r scripts/catalogo/requirements-catalog-ocr.txt",
            file=sys.stderr,
        )
        return 1

    if args.tesseract:
        pytesseract.pytesseract.tesseract_cmd = args.tesseract
    elif os.environ.get("TESSERACT_CMD"):
        pytesseract.pytesseract.tesseract_cmd = os.environ["TESSERACT_CMD"]

    pdf = Path(args.pdf).expanduser().resolve()
    if not pdf.is_file():
        print(f"No existe PDF: {pdf}", file=sys.stderr)
        return 1

    out_dir = Path(args.out).expanduser().resolve()
    if not args.dry_run:
        out_dir.mkdir(parents=True, exist_ok=True)

    def pixmap_to_bgr(pix: fitz.Pixmap) -> np.ndarray:
        if pix.alpha:
            pix = fitz.Pixmap(fitz.csRGB, pix)
        arr = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.h, pix.w, pix.n)
        if pix.n == 4:
            return cv2.cvtColor(arr, cv2.COLOR_RGBA2BGR)
        return cv2.cvtColor(arr, cv2.COLOR_RGB2BGR)

    def grid_cells(w: int, h: int) -> list[tuple[int, int, int, int]]:
        mx = int(w * args.margin_x)
        my = int(h * args.margin_y)
        cw = max(1, (w - 2 * mx) // args.cols)
        ch = max(1, (h - 2 * my) // args.rows)
        cells: list[tuple[int, int, int, int]] = []
        for r in range(args.rows):
            for c in range(args.cols):
                x0 = mx + c * cw
                y0 = my + r * ch
                cells.append((x0, y0, min(x0 + cw, w), min(y0 + ch, h)))
        return cells

    def ocr_precio_inferior(img_bgr: np.ndarray) -> tuple[int | None, str]:
        h, w = img_bgr.shape[:2]
        y0 = int(h * (1.0 - args.bottom_ratio))
        roi = img_bgr[y0:h, 0:w]
        gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
        gray = cv2.resize(gray, None, fx=1.5, fy=1.5, interpolation=cv2.INTER_CUBIC)
        _, th = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        cfg = "--psm 6 -c tessedit_char_whitelist=0123456789$., "
        try:
            txt = pytesseract.image_to_string(th, lang="spa+eng", config=cfg)
        except pytesseract.TesseractNotFoundError:
            print(
                "Tesseract no encontrado. Instalá Tesseract y/o --tesseract o TESSERACT_CMD",
                file=sys.stderr,
            )
            raise
        return parse_precio_ocr(txt), txt

    def load_font(size: int):
        for p in (
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
            r"C:\Windows\Fonts\arialbd.ttf",
            r"C:\Windows\Fonts\arial.ttf",
        ):
            try:
                return ImageFont.truetype(p, size)
            except OSError:
                continue
        return ImageFont.load_default()

    def overlay_nuevo_precio(card_bgr: np.ndarray, precio_lista: int) -> np.ndarray:
        pil = Image.fromarray(cv2.cvtColor(card_bgr, cv2.COLOR_BGR2RGB))
        draw = ImageDraw.Draw(pil)
        w, h = pil.size
        y0 = int(h * (1.0 - args.bottom_ratio))
        draw.rectangle([0, y0, w, h], fill=(255, 255, 255))
        nuevo = precio_lista * args.mult
        label = format_precio_ar(nuevo)
        font = load_font(22)
        bbox = draw.textbbox((0, 0), label, font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        tx = max(4, (w - tw) // 2)
        ty = y0 + max(4, (h - y0 - th) // 2)
        draw.text((tx, ty), label, fill=(0, 51, 153), font=font)
        return cv2.cvtColor(np.array(pil), cv2.COLOR_RGB2BGR)

    def extract_contour(page_bgr: np.ndarray, pi: int) -> int:
        gray = cv2.cvtColor(page_bgr, cv2.COLOR_BGR2GRAY)
        _, th = cv2.threshold(gray, 240, 255, cv2.THRESH_BINARY_INV)
        contours, _ = cv2.findContours(th, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        boxes: list[tuple[int, int, int, int]] = []
        for cnt in contours:
            x, y, bw, bh = cv2.boundingRect(cnt)
            area = bw * bh
            if args.contour_area_min < area < args.contour_area_max:
                boxes.append((x, y, bw, bh))
        boxes.sort(key=lambda b: (b[1] // max(1, args.sort_y_quant), b[0]))
        n = 0
        for idx, (x, y, bw, bh) in enumerate(boxes):
            card = page_bgr[y : y + bh, x : x + bw]
            if card.size == 0:
                continue
            precio, _ = ocr_precio_inferior(card)
            if precio is None and args.skip_no_price:
                continue
            if precio is None:
                precio = 0
            out_img = overlay_nuevo_precio(card, precio) if precio > 0 else card
            fn = out_dir / f"pag{pi + 1:03d}_cont_{idx + 1:03d}.png"
            if not args.dry_run:
                cv2.imwrite(str(fn), out_img)
            n += 1
            print(f"  {fn.name} lista={precio}", flush=True)
        return n

    doc = fitz.open(pdf)
    n_pages = len(doc)

    def parse_pages(spec: str) -> list[int]:
        s = spec.strip().lower()
        if s == "all":
            return list(range(n_pages))
        if "-" in s and "," not in s:
            a, b = s.split("-", 1)
            lo, hi = int(a), int(b)
            return [i for i in range(n_pages) if lo <= i <= hi]
        if "," in s:
            out: list[int] = []
            for x in s.split(","):
                x = x.strip()
                if not x:
                    continue
                p = int(x)
                if 0 <= p < n_pages:
                    out.append(p)
            return sorted(set(out))
        p = int(s)
        if p < 0 or p >= n_pages:
            raise ValueError(f"Página {p} fuera de rango (0..{n_pages - 1})")
        return [p]

    try:
        page_indices = parse_pages(args.pages)
    except ValueError as e:
        print(e, file=sys.stderr)
        doc.close()
        return 1

    total = 0
    for pi in page_indices:
        page = doc.load_page(pi)
        mat = fitz.Matrix(args.zoom, args.zoom)
        pix = page.get_pixmap(matrix=mat, alpha=False)
        page_bgr = pixmap_to_bgr(pix)
        ph, pw = page_bgr.shape[:2]
        print(f"Página {pi + 1}/{n_pages} ({pw}x{ph}) modo={args.mode}", flush=True)

        if args.mode == "contour":
            total += extract_contour(page_bgr, pi)
            continue

        for idx, (x0, y0, x1, y1) in enumerate(grid_cells(pw, ph)):
            card = page_bgr[y0:y1, x0:x1]
            if card.size == 0:
                continue
            row, col = divmod(idx, args.cols)
            precio, raw = ocr_precio_inferior(card)
            if args.dry_run:
                snippet = repr(raw)[:120]
                print(f"  r{row + 1}c{col + 1} OCR: {snippet} precio={precio}", flush=True)
                continue
            if precio is None and args.skip_no_price:
                continue
            if precio is None:
                precio = 0
            out_img = overlay_nuevo_precio(card, precio) if precio > 0 else card
            fn = out_dir / f"pag{pi + 1:03d}_r{row + 1}_c{col + 1}.png"
            cv2.imwrite(str(fn), out_img)
            total += 1
            print(f"  {fn.name} lista={precio} -> x{args.mult}", flush=True)

    doc.close()
    act = "simuladas" if args.dry_run else "escritas"
    print(f"Listo. Tarjetas {act}: {total} → {out_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
