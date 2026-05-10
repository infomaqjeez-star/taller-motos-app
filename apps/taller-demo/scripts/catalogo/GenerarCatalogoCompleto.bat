@echo off
chcp 65001 >nul
cd /d "%~dp0..\.."

set "CATALOGO_PRODUCTOS_ROOT=%USERPROFILE%\Documents\CatalogoKonectaArticulos"
mkdir "%CATALOGO_PRODUCTOS_ROOT%\productos" 2>nul

call "%~dp0_buscar_python.bat"
if not defined PYTHON_EXE (
  echo No se encontro Python.
  pause
  exit /b 1
)

echo Usando: %PYTHON_EXE%
"%PYTHON_EXE%" -m pip install -q -r scripts\catalogo\requirements.txt
if errorlevel 1 pause & exit /b 1
"%PYTHON_EXE%" scripts\catalogo\run_folders.py all
if errorlevel 1 pause & exit /b 1

explorer "%CATALOGO_PRODUCTOS_ROOT%\productos"
pause
