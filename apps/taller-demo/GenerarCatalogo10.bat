@echo off
chcp 65001 >nul
cd /d "%~dp0"

set "CATALOGO_PRODUCTOS_ROOT=%USERPROFILE%\Documents\CatalogoKonectaArticulos"
REM set "CATALOGO_PRODUCTOS_ROOT=D:\Taller\CatalogoKonectaArticulos"

mkdir "%CATALOGO_PRODUCTOS_ROOT%\productos" 2>nul

call "%~dp0scripts\catalogo\_buscar_python.bat"
if not defined PYTHON_EXE goto sinpy

echo Usando: %PYTHON_EXE%
echo Instalando dependencias del catalogo ^(PyMuPDF^) si hace falta...
"%PYTHON_EXE%" -m pip install -q -r "%~dp0scripts\catalogo\requirements.txt"
if errorlevel 1 (
  echo Fallo: pip install -r scripts\catalogo\requirements.txt
  pause
  exit /b 1
)
"%PYTHON_EXE%" scripts\catalogo\run_folders.py 10
if errorlevel 1 pause & exit /b 1

echo.
echo Listo. Productos en:
echo   %CATALOGO_PRODUCTOS_ROOT%\productos
explorer "%CATALOGO_PRODUCTOS_ROOT%\productos"
pause
exit /b 0

:sinpy
echo.
echo No se encontro Python instalado.
echo.
echo 1) Instalá desde https://www.python.org/downloads/  y al final marcá "Add python.exe to PATH".
echo 2) O en Windows: Configuracion - Aplicaciones - Configuracion avanzada de aplicaciones
echo    - Alias de ejecucion de aplicaciones: DESACTIVAR "python.exe" y "python3.exe" ^(Store^).
echo 3) Cerrá esta ventana, abrila de nuevo y volvé a ejecutar este .bat.
pause
exit /b 1
