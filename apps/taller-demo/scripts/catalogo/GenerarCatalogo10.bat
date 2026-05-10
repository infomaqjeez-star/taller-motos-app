@echo off
chcp 65001 >nul
cd /d "%~dp0..\.."

set "CATALOGO_PRODUCTOS_ROOT=%USERPROFILE%\Documents\CatalogoKonectaArticulos"
REM set "CATALOGO_PRODUCTOS_ROOT=D:\Taller\CatalogoKonectaArticulos"

mkdir "%CATALOGO_PRODUCTOS_ROOT%\productos" 2>nul

call "%~dp0_buscar_python.bat"
if not defined PYTHON_EXE (
  echo No se encontro Python. Abrí GenerarCatalogo10.bat en apps\taller-demo ^(mismo texto de ayuda^).
  pause
  exit /b 1
)

echo Usando: %PYTHON_EXE%
"%PYTHON_EXE%" scripts\catalogo\run_folders.py 10
if errorlevel 1 pause & exit /b 1

explorer "%CATALOGO_PRODUCTOS_ROOT%\productos"
pause
