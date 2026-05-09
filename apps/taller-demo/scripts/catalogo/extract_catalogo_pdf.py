#!/usr/bin/env python3
"""
Extrae del PDF de catálogo (Konecta u otro layout tipo grilla) imágenes 480×480 y un JSON
compatible con data/catalogo-public.json (precio lista; la app muestra ×4).

Ejecutar con cwd = apps/taller-demo:
  pip install -r scripts/catalogo/requirements.txt
  python scripts/catalogo/extract_catalogo_pdf.py \\
    --pdf data/catalogo-konecta-source/catalogo-konecta.pdf \\
    --pages all \\
    --format webp

Calibración del recorte (si las tarjetas se ven mal):
  --side-mult 6 --above-mult 28 --below-mult 8

Solo una página de prueba:
  --pages 0
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path


def texto_maqjeez(s: str) -> str:
    return (
        s.replace("KONECTA DIGITAL", "Maqjeez")
        .replace("Konecta Digital", "Maqjeez")
        .replace("KONECTA", "Maqjeez")
        .replace("Konecta", "Maqjeez")
    )


def parse_pages_arg(spec: str, n_pages: int) -> list[int]:
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


def parse_precio_token(raw: str) -> int | None:
    """Devuelve pesos enteros aproximados desde un token tipo 12.345,67 o 123456."""
    s = raw.strip().replace("$", "").replace(" ", "")
    if not s or not any(c.isdigit() for c in s):
        return None
    # 1.234,56 (AR)
    if re.fullmatch(r"\d{1,3}(\.\d{3})+,\d{2}", s):
        ent = s.rsplit(",", 1)[0].replace(".", "")
        dec = s.rsplit(",", 1)[1]
        try:
            return int(round(float(ent + "." + dec)))
        except ValueError:
            return None
    # 1234,56
    if re.fullmatch(r"\d+,\d{2}", s):
        a, b = s.split(",", 1)
        try:
            return int(round(float(a + "." + b)))
        except ValueError:
            return None
    # 12.345 (miles con punto) sin decimales
    if re.fullmatch(r"\d{1,3}(\.\d{3})+", s):
        try:
            return int(s.replace(".", ""))
        except ValueError:
            return None
    # entero largo
    if re.fullmatch(r"\d{4,12}", s):
        return int(s)
    if re.fullmatch(r"\d{1,3}", s):
        v = int(s)
        return v if v >= 100 else None
    return None


def words_in_rect(
    words: list[tuple], rx0: float, ry0: float, rx1: float, ry1: float
) -> list[tuple[float, float, float, float, str]]:
    """words: filas get_text('words'); retorna (x0,y0,x1,y1,text) ordenadas lectura aprox."""
    out: list[tuple[float, float, float, float, str]] = []
    for w in words:
        x0, y0, x1, y1 = float(w[0]), float(w[1]), float(w[2]), float(w[3])
        text = (w[4] or "").strip()
        if not text:
            continue
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        if rx0 <= cx <= rx1 and ry0 <= cy <= ry1:
            out.append((x0, y0, x1, y1, text))
    out.sort(key=lambda t: (round(t[1] / 4) * 4, t[0]))
    return out


def guess_nombre_precio(
    words: list[tuple],
    sx0: float,
    sy0: float,
    sx1: float,
    sy1: float,
    sw: float,
    sh: float,
    side_mult: float,
    above_mult: float,
    sku: str,
) -> tuple[str, int]:
    """Zona sobre el SKU (menor y en PDF): texto → nombre; números → precio."""
    pad_x = max(sw * side_mult, 8.0)
    ry1 = sy0 - 0.15 * sh
    ry0 = sy0 - above_mult * sh
    rx0, rx1 = sx0 - pad_x, sx1 + pad_x
    band = words_in_rect(words, rx0, ry0, rx1, ry1)

    precios: list[int] = []
    nombre_bits: list[str] = []
    sku_like = re.compile(r"^\d{4,6}$")
    for _x0, _y0, _x1, _y1, text in band:
        if sku_like.match(text):
            continue
        p = parse_precio_token(text)
        if p is not None and 500 <= p <= 50_000_000:
            precios.append(p)
            continue
        if re.search(r"[A-Za-zÁÉÍÓÚáéíóúÑñ]", text):
            nombre_bits.append(text)
    precio = max(precios) if precios else 0
    nombre = texto_maqjeez(" ".join(nombre_bits).strip())
    if len(nombre) < 2:
        nombre = texto_maqjeez(f"Artículo {sku}")
    return nombre[:400], precio


def main() -> int:
    ap = argparse.ArgumentParser(description="PDF catálogo → imágenes 480² + catalogo-public.json")
    ap.add_argument(
        "--pdf",
        default="data/catalogo-konecta-source/catalogo-konecta.pdf",
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
    args = ap.parse_args()

    pdf = Path(args.pdf).expanduser().resolve()
    if not pdf.is_file():
        print(f"No existe el PDF: {pdf}", file=sys.stderr)
        print("Copiá el archivo a data/catalogo-konecta-source/ y/o pasá --pdf ruta\\completa.pdf", file=sys.stderr)
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
    try:
        page_indices = parse_pages_arg(args.pages, len(doc))
    except ValueError as e:
        print(e, file=sys.stderr)
        return 1

    sku_re = re.compile(r"^\d{4,6}$")
    by_sku: dict[str, dict] = {}
    ext = ".webp" if args.format == "webp" else ".png"

    for pi in page_indices:
        page = doc[pi]
        words = page.get_text("words") or []
        seen_page: set[str] = set()

        for w in words:
            token = (w[4] or "").strip()
            if not sku_re.match(token) or token in seen_page:
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

            nombre, precio = guess_nombre_precio(
                words, x0, y0, x1, y1, sw, sh, args.side_mult, args.above_mult, token
            )
            img_path = out_img / f"{token}{ext}"
            if not args.dry_run and (args.force or not img_path.is_file()):
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

    doc.close()

    productos = sorted(by_sku.values(), key=lambda p: p["sku"])
    payload = {
        "titulo": "Catálogo de precios — Maqjeez Repuestos",
        "subtitulo": texto_maqjeez(
            "Lista pública generada desde PDF de referencia. Precios en pantalla = lista × 4. Revisar nombres y montos."
        ),
        "categorias": [{"id": "catalogo-pdf", "nombre": "Catálogo repuestos", "orden": 1}],
        "productos": productos,
    }

    if not args.dry_run:
        out_json.parent.mkdir(parents=True, exist_ok=True)
        out_json.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"Listo: {len(productos)} productos → {out_json} | imágenes en {out_img} ({ext})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
