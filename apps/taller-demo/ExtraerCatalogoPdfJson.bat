@echo off
chcp 65001 >nul
REM PDF plano: imagenes 480x480 por SKU + data\catalogo-public.json
cd /d "%~dp0"

call "%~dp0scripts\catalogo\_buscar_python.bat"
if not defined PYTHON_EXE goto sinpy

echo Usando: %PYTHON_EXE%
"%PYTHON_EXE%" -m pip install -q -r "%~dp0scripts\catalogo\requirements.txt"
if errorlevel 1 pause & exit /b 1

"%PYTHON_EXE%" "%~dp0scripts\catalogo\extract_catalogo_pdf.py" --pages all --format webp
if errorlevel 1 pause & exit /b 1

echo Listo: data\catalogo-public.json y webp en public\catalogo\
pause
exit /b 0

:sinpy
echo No se encontro Python. Ver GenerarCatalogo10.bat
pause
exit /b 1
