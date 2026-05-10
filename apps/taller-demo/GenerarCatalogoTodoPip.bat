@echo off
chcp 65001 >nul
REM pip + extract_catalogo_pdf (todo el PDF) + build_product_folders (equivale a npm run catalogo:generate:all)
cd /d "%~dp0"

call "%~dp0scripts\catalogo\_buscar_python.bat"
if not defined PYTHON_EXE goto sinpy

echo Usando: %PYTHON_EXE%
"%PYTHON_EXE%" -m pip install -q -r "%~dp0scripts\catalogo\requirements.txt"
if errorlevel 1 pause & exit /b 1

"%PYTHON_EXE%" "%~dp0scripts\catalogo\run_full_catalogo.py"
if errorlevel 1 pause & exit /b 1

echo Listo.
pause
exit /b 0

:sinpy
echo No se encontro Python. Ver GenerarCatalogo10.bat
pause
exit /b 1
