"""Helpers compartidos: PDF catálogo Konecta → Maqjeez, precios, nombres de carpeta."""
from __future__ import annotations

import re
from pathlib import Path

# PDF por defecto (cwd = apps/taller-demo): catalogo.pdf primero; nombre largo legado al final
CATALOG_PDF_CANDIDATES = (
    "scripts/catalogo.pdf",
    "public/catalogo/catalogo.pdf",
    "scripts/Catalogo Abril 2026 Konecta Repuestos.pdf",
    "public/catalogo/Catalogo Abril 2026 Konecta Repuestos.pdf",
)
DEFAULT_CATALOG_PDF_REL = CATALOG_PDF_CANDIDATES[0]

# Carpeta raíz (bajo public/catalogo/) para ~1300 artículos
CATALOG_PARENT_DIR = "Catalogo-Abril-2026-Maqjeez-Repuestos"
PRODUCTOS_SUBDIR = "productos"

PRECIO_VENTA_MULT = 4
# Tarjeta catálogo (vertical, imagen arriba + texto/precio abajo — similar al PDF Konecta)
PREVIEW_CARD_WIDTH_PX = 360
PREVIEW_CARD_HEIGHT_PX = 480

# Catálogo Konecta: 17002, KR17001, 14019-2, etc. (no años de 4 dígitos ni tokens cortos sueltos)
SKU_RE = re.compile(
    r"^(?:"
    r"[A-Za-z]{2,4}\d{3,9}|"  # KR17001
    r"\d{4,7}-\d{1,4}|"  # 14019-2
    r"\d{5,6}"  # 17002
    r")$"
)
_WIN_BAD = re.compile(r'[<>:"/\\|?*\x00-\x1f]')


def _norm_rel_path(s: str) -> str:
    return Path(s).as_posix().replace("\\", "/")


def resolve_catalog_pdf(explicit: str, cwd: Path | None = None) -> Path:
    """
    Resuelve ruta al PDF: primero `explicit` respecto a cwd; si no existe y
    explicit es una de las rutas estándar, prueba el resto de candidatos.
    """
    base = cwd or Path.cwd()
    exp = Path(explicit)
    if exp.is_absolute():
        p = exp.resolve()
        return p
    p = (base / exp).resolve()
    if p.is_file():
        return p
    known = {_norm_rel_path(c) for c in CATALOG_PDF_CANDIDATES}
    if _norm_rel_path(explicit) in known:
        for rel in CATALOG_PDF_CANDIDATES:
            q = (base / rel).resolve()
            if q.is_file():
                return q
    return p


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
    s = raw.strip().replace("$", "").replace(" ", "")
    if not s or not any(c.isdigit() for c in s):
        return None
    if re.fullmatch(r"\d{1,3}(\.\d{3})+,\d{2}", s):
        ent = s.rsplit(",", 1)[0].replace(".", "")
        dec = s.rsplit(",", 1)[1]
        try:
            return int(round(float(ent + "." + dec)))
        except ValueError:
            return None
    if re.fullmatch(r"\d+,\d{2}", s):
        a, b = s.split(",", 1)
        try:
            return int(round(float(a + "." + b)))
        except ValueError:
            return None
    if re.fullmatch(r"\d{1,3}(\.\d{3})+", s):
        try:
            return int(s.replace(".", ""))
        except ValueError:
            return None
    if re.fullmatch(r"\d{4,12}", s):
        return int(s)
    if re.fullmatch(r"\d{1,3}", s):
        v = int(s)
        return v if v >= 100 else None
    return None


def words_in_rect(
    words: list[tuple], rx0: float, ry0: float, rx1: float, ry1: float
) -> list[tuple[float, float, float, float, str]]:
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
    pad_x = max(sw * side_mult, 8.0)
    ry1 = sy0 - 0.15 * sh
    ry0 = sy0 - above_mult * sh
    rx0, rx1 = sx0 - pad_x, sx1 + pad_x
    band = words_in_rect(words, rx0, ry0, rx1, ry1)

    precios: list[int] = []
    nombre_bits: list[str] = []
    for _x0, _y0, _x1, _y1, text in band:
        if SKU_RE.match(text.strip()):
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


def sanitize_folder_slug(nombre: str, max_slug: int = 50) -> str:
    """Segmento de carpeta seguro en Windows (sin espacios finales ni caracteres prohibidos)."""
    n = texto_maqjeez(nombre.replace("\r", " ").replace("\n", " "))
    n = n.replace("Ø", "O").replace("ø", "o").replace("°", "")
    n = _WIN_BAD.sub("-", n)
    n = re.sub(r"\s+", "_", n).strip("._-")
    if len(n) > max_slug:
        n = n[:max_slug].rstrip(" .-")
    return n or "articulo"


def product_folder_name(nombre: str, sku: str, max_slug: int = 50) -> str:
    """Nombre único de carpeta: slug del nombre + SKU (evita colisiones y rutas largas)."""
    slug = sanitize_folder_slug(nombre, max_slug=max_slug)
    return f"{slug}__{sku}"


def embedded_product_image_rect(
    page: object, sx0: float, sy0: float, sx1: float, sy1: float
) -> tuple[float, float, float, float] | None:
    """
    Rectángulo (x0,y0,x1,y1) en coords PDF de la foto embebida encima del código SKU,
    típico en catálogos Konecta (foto raster + texto vector). Si no hay candidato, None.
    """
    import fitz

    if not hasattr(page, "get_image_rects"):
        return None
    page_rect = page.rect
    page_area = float(page_rect.get_area())
    if page_area < 1.0:
        return None

    sw = max(float(sx1) - float(sx0), 1.0)
    sku_top = float(sy0)
    x_pad = sw * 6.0

    best: fitz.Rect | None = None
    best_area = 0.0
    seen: set[tuple[float, float, float, float]] = set()

    try:
        imgs = page.get_images(full=True) or []
    except Exception:
        return None

    for info in imgs:
        xref = int(info[0])
        try:
            rects = page.get_image_rects(xref)
        except Exception:
            continue
        for raw in rects:
            r = fitz.Rect(raw)
            if r.is_empty:
                continue
            key = (round(r.x0, 1), round(r.y0, 1), round(r.x1, 1), round(r.y1, 1))
            if key in seen:
                continue
            seen.add(key)

            if r.y1 > sku_top + 6.0:
                continue

            x_overlap = min(r.x1, sx1 + x_pad) - max(r.x0, sx0 - x_pad)
            if x_overlap < sw * 0.22:
                continue

            area = float(r.get_area())
            if area < 500.0:
                continue
            if area > page_area * 0.48:
                continue

            rw, rh = float(r.width), float(r.height)
            if rw > 1 and rh > 1:
                ar = rw / rh
                if ar > 5.0 or ar < 0.2:
                    continue

            if area > best_area:
                best_area = area
                best = r

    if best is None:
        return None
    return (best.x0, best.y0, best.x1, best.y1)


def catalog_grid_cell_rect(
    page: object,
    col: int,
    row: int,
    *,
    cols: int,
    rows: int,
    margin_x_frac: float,
    margin_top_frac: float,
    margin_bottom_frac: float,
) -> object:
    """Rectángulo PDF de la celda (col,row) en una rejilla tipo catálogo Konecta (5×3, etc.)."""
    import fitz

    R = page.rect
    w, h = float(R.width), float(R.height)
    mx = max(0.0, min(0.45, float(margin_x_frac)))
    mt = max(0.0, min(0.45, float(margin_top_frac)))
    mb = max(0.0, min(0.45, float(margin_bottom_frac)))
    if mt + mb >= 0.95:
        mb = 0.05
    x0 = R.x0 + w * mx
    y0 = R.y0 + h * mt
    inner_w = w * (1.0 - 2.0 * mx)
    inner_h = h * (1.0 - mt - mb)
    cw = inner_w / max(1, int(cols))
    ch = inner_h / max(1, int(rows))
    return fitz.Rect(
        x0 + col * cw,
        y0 + row * ch,
        x0 + (col + 1) * cw,
        y0 + (row + 1) * ch,
    )


def catalog_grid_cell_containing_point(
    page: object,
    px: float,
    py: float,
    *,
    cols: int,
    rows: int,
    margin_x_frac: float,
    margin_top_frac: float,
    margin_bottom_frac: float,
) -> object | None:
    """Celda de la rejilla que contiene el punto (p. ej. centro del código SKU)."""
    import fitz

    pt = fitz.Point(float(px), float(py))
    for c in range(max(1, int(cols))):
        for r in range(max(1, int(rows))):
            cell = catalog_grid_cell_rect(
                page,
                c,
                r,
                cols=cols,
                rows=rows,
                margin_x_frac=margin_x_frac,
                margin_top_frac=margin_top_frac,
                margin_bottom_frac=margin_bottom_frac,
            )
            if not cell.is_empty and cell.contains(pt):
                return cell
    return None
