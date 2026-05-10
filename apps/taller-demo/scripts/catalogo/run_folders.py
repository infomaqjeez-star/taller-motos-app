#!/usr/bin/env python3
"""
Misma lógica que run-folders.cjs: build_product_folders con --flat --force.
Se usa desde npm, desde .bat (doble clic) o: python scripts/catalogo/run_folders.py 10|all

Variables de entorno opcionales:
  CATALOGO_PRODUCTOS_ROOT — ruta absoluta; si está vacío → public/catalogo + --update-json
  CATALOGO_PDF — ruta al PDF si no usás el nombre por defecto
  CATALOGO_IMAGE_MODE — auto | raster | photo (ver build_product_folders --image-mode)
"""
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

APP_ROOT = Path(__file__).resolve().parents[2]
BUILD = Path(__file__).resolve().parent / "build_product_folders.py"


def main() -> int:
    mode = (sys.argv[1] if len(sys.argv) > 1 else "10").strip().lower()
    if mode not in ("10", "all"):
        mode = "10"

    out_root = (os.environ.get("CATALOGO_PRODUCTOS_ROOT") or "").strip()
    local_only = bool(out_root)
    if not out_root:
        out_root = "public/catalogo"

    argv = [
        sys.executable,
        str(BUILD),
        "--out-root",
        out_root,
        "--flat",
        "--force",
    ]
    if not local_only:
        argv.append("--update-json")
    pdf = (os.environ.get("CATALOGO_PDF") or "").strip()
    if pdf:
        argv.extend(["--pdf", pdf])
    img_mode = (os.environ.get("CATALOGO_IMAGE_MODE") or "").strip().lower()
    if img_mode in ("auto", "raster", "photo"):
        argv.extend(["--image-mode", img_mode])

    if local_only:
        prod = Path(out_root) / "productos"
        print(
            f"[catalogo] CATALOGO_PRODUCTOS_ROOT={out_root} → carpetas en {prod} "
            "(sin --update-json; la app web no usa esa ruta).",
            file=sys.stderr,
            flush=True,
        )

    if mode == "all":
        argv.extend(["--pages", "all"])
    else:
        argv.extend(["--pages", "all", "--limit", "10"])

    return subprocess.call(argv, cwd=APP_ROOT)


if __name__ == "__main__":
    raise SystemExit(main())
