@echo off
chcp 65001 >nul
REM Ir a apps\taller-demo (dos niveles arriba de esta carpeta)
cd /d "%~dp0..\.."

set "CATALOGO_PRODUCTOS_ROOT=%USERPROFILE%\Documents\CatalogoKonectaArticulos"
REM set "CATALOGO_PRODUCTOS_ROOT=D:\Taller\CatalogoKonectaArticulos"

mkdir "%CATALOGO_PRODUCTOS_ROOT%\productos" 2>nul

where py >nul 2>&1 && py -3 scripts\catalogo\run_folders.py 10 && goto hecho
where python >nul 2>&1 && python scripts\catalogo\run_folders.py 10 && goto hecho

echo No se encontro Python. Instala Python 3 y marcá "Add to PATH".
pause
exit /b 1

:hecho
echo Listo: %CATALOGO_PRODUCTOS_ROOT%\productos
explorer "%CATALOGO_PRODUCTOS_ROOT%\productos"
pause
