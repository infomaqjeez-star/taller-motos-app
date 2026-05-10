@echo off
chcp 65001 >nul
REM Pipeline rejilla + OCR (precio x4 en imagen). Requiere Tesseract.
cd /d "%~dp0"

set "OUT_OCR=%~dp0data\catalogo-ocr-export"
mkdir "%OUT_OCR%" 2>nul

call "%~dp0scripts\catalogo\_buscar_python.bat"
if not defined PYTHON_EXE goto sinpy

echo Usando: %PYTHON_EXE%
"%PYTHON_EXE%" -m pip install -q -r "%~dp0scripts\catalogo\requirements-catalog-ocr.txt"
if errorlevel 1 pause & exit /b 1

REM Pagina 0 como prueba. Para todas: --pages all
"%PYTHON_EXE%" "%~dp0scripts\catalogo\catalog_grid_ocr_pipeline.py" --out "%OUT_OCR%" --pages 0
if errorlevel 1 pause & exit /b 1

explorer "%OUT_OCR%"
pause
exit /b 0

:sinpy
echo No se encontro Python. Ver GenerarCatalogo10.bat
pause
exit /b 1
