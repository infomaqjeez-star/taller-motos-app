#!/usr/bin/env python3
"""
Un solo comando (cwd = apps/taller-demo): instala dependencias, regenera
data/catalogo-public.json desde el PDF y crea public/catalogo/productos/…
con imagen.webp (tarjeta) + meta.json (precioVenta = lista × 4).

Uso:
  python scripts/catalogo/run_full_catalogo.py
  python scripts/catalogo/run_full_catalogo.py --pdf "C:\\ruta\\catalogo.pdf"
  python scripts/catalogo/run_full_catalogo.py --skip-extract   # solo carpetas / JSON rutas imagen

npm (desde apps/taller-demo):
  npm run catalogo:generate:all
"""
from __future__ import annotations

import argparse
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
        _run(
            [
                sys.executable,
                "scripts/catalogo/build_product_folders.py",
                "--out-root",
                "public/catalogo",
                "--pages",
                "all",
                "--flat",
                "--force",
                "--update-json",
            ]
            + pdf_args
        )
    except subprocess.CalledProcessError as e:
        return int(e.returncode or 1)
    except FileNotFoundError:
        print("No se encontró Python/pip.", file=sys.stderr)
        return 1

    print("\nListo: JSON actualizado y carpetas bajo public/catalogo/productos/", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
