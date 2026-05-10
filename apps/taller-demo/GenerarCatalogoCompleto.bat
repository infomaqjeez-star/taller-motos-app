@echo off
chcp 65001 >nul
cd /d "%~dp0"

set "CATALOGO_PRODUCTOS_ROOT=%USERPROFILE%\Documents\CatalogoKonectaArticulos"
REM set "CATALOGO_PRODUCTOS_ROOT=D:\Taller\CatalogoKonectaArticulos"

mkdir "%CATALOGO_PRODUCTOS_ROOT%\productos" 2>nul

call "%~dp0scripts\catalogo\_buscar_python.bat"
if not defined PYTHON_EXE goto sinpy

echo Usando: %PYTHON_EXE%
echo Puede tardar ^(todo el PDF^)...
"%PYTHON_EXE%" scripts\catalogo\run_folders.py all
if errorlevel 1 pause & exit /b 1

explorer "%CATALOGO_PRODUCTOS_ROOT%\productos"
pause
exit /b 0

:sinpy
echo No se encontro Python. Ver GenerarCatalogo10.bat ^(mismo mensaje de ayuda^).
pause
exit /b 1
