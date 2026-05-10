#!/usr/bin/env python3
"""
Un solo comando (cwd = apps/taller-demo): instala dependencias, regenera
data/catalogo-public.json desde el PDF y crea carpetas por artículo
(imagen.webp + meta.json, precioVenta = lista × 4).

Por defecto salen bajo public/catalogo/productos/. Para solo disco local
definí CATALOGO_PRODUCTOS_ROOT (ruta absoluta); entonces las carpetas van a
ESA_RUTA/productos/ y no se pasa --update-json (la app no sirve archivos desde ahí).

Uso:
  python scripts/catalogo/run_full_catalogo.py
  python scripts/catalogo/run_full_catalogo.py --pdf "C:\\ruta\\catalogo.pdf"
  python scripts/catalogo/run_full_catalogo.py --skip-extract   # solo carpetas / JSON rutas imagen

npm (desde apps/taller-demo):
  npm run catalogo:generate:all
"""
from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path

# apps/taller-demo
APP_ROOT = Path(__file__).resolve().parents[2]


def _run(argv: list[str]) -> None:
    print(f"+ {' '.join(argv)}", flush=True)
    subprocess.check_call(argv, cwd=APP_ROOT)


def main() -> int:
    ap = argparse.ArgumentParser(
        description="PDF Konecta → pip + catalogo-public.json + carpetas por artículo"
    )
    ap.add_argument(
        "--pdf",
        default="",
        help="Ruta al PDF (opcional; si omitís, extract/build buscan scripts/ o public/catalogo/)",
    )
    ap.add_argument(
        "--skip-extract",
        action="store_true",
        help="No ejecutar extract_catalogo_pdf.py (solo build_product_folders.py)",
    )
    args = ap.parse_args()

    if not APP_ROOT.is_dir():
        print(f"No se encontró la app en {APP_ROOT}", file=sys.stderr)
        return 1

    pdf_args: list[str] = []
    if args.pdf.strip():
        pdf_args = ["--pdf", args.pdf.strip()]

    out_root = (os.environ.get("CATALOGO_PRODUCTOS_ROOT") or "").strip()
    if not out_root:
        out_root = "public/catalogo"
    local_only = bool((os.environ.get("CATALOGO_PRODUCTOS_ROOT") or "").strip())

    try:
        _run(
            [
                sys.executable,
                "-m",
                "pip",
                "install",
                "-q",
                "-r",
                "scripts/catalogo/requirements.txt",
            ]
        )
        if not args.skip_extract:
            _run(
                [
                    sys.executable,
                    "scripts/catalogo/extract_catalogo_pdf.py",
                    "--pages",
                    "all",
                    "--format",
                    "webp",
                ]
                + pdf_args
            )
        build_argv = [
            sys.executable,
            "scripts/catalogo/build_product_folders.py",
            "--out-root",
            out_root,
            "--pages",
            "all",
            "--flat",
            "--force",
        ]
        if not local_only:
            build_argv.append("--update-json")
        _run(build_argv + pdf_args)
    except subprocess.CalledProcessError as e:
        return int(e.returncode or 1)
    except FileNotFoundError:
        print("No se encontró Python/pip.", file=sys.stderr)
        return 1

    prod_dir = str(Path(out_root) / "productos")
    if local_only:
        print(f"\nListo: carpetas solo en disco local → {prod_dir}", flush=True)
    else:
        print(f"\nListo: JSON actualizado y carpetas en {prod_dir}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
