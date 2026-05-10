"""Helpers compartidos: PDF catálogo Konecta → Maqjeez, precios, nombres de carpeta."""
from __future__ import annotations

import re
from pathlib import Path

# PDF por defecto (cwd = apps/taller-demo): probá scripts/ y public/catalogo/
CATALOG_PDF_CANDIDATES = (
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
