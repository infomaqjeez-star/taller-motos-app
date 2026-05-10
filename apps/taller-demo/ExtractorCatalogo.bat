@echo off
chcp 65001 >nul
REM Recorte real de tarjetas (OpenCV) + Tesseract + precio x4. Requiere Tesseract en el sistema.
cd /d "%~dp0"

set "OUT_DIR=%USERPROFILE%\Documents\CatalogoExtraccionOcr"
mkdir "%OUT_DIR%" 2>nul

call "%~dp0scripts\catalogo\_buscar_python.bat"
if not defined PYTHON_EXE goto sinpy

echo Usando: %PYTHON_EXE%
echo Instalando dependencias OCR (OpenCV, pytesseract)...
"%PYTHON_EXE%" -m pip install -q -r "%~dp0scripts\catalogo\requirements-catalog-ocr.txt"
if errorlevel 1 (
  echo Fallo pip. Desde apps\taller-demo: pip install -r scripts\catalogo\requirements-catalog-ocr.txt
  pause
  exit /b 1
)

REM Pagina 0 solo prueba. Para todo: cambiar --pages 0 por --pages all
"%PYTHON_EXE%" "%~dp0scripts\catalogo\extractor.py" --pdf "%~dp0scripts\catalogo.pdf" --out "%OUT_DIR%" --pages 0
if errorlevel 1 pause & exit /b 1

explorer "%OUT_DIR%"
pause
exit /b 0

:sinpy
echo No se encontro Python. Ver GenerarCatalogo10.bat (mismo texto de ayuda).
pause
exit /b 1
