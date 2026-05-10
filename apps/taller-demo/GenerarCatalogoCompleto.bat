@echo off
chcp 65001 >nul
cd /d "%~dp0"

set "CATALOGO_PRODUCTOS_ROOT=%USERPROFILE%\Documents\CatalogoKonectaArticulos"
REM set "CATALOGO_PRODUCTOS_ROOT=D:\Taller\CatalogoKonectaArticulos"

mkdir "%CATALOGO_PRODUCTOS_ROOT%\productos" 2>nul

echo Esto puede tardar varios minutos (todo el PDF)...
where py >nul 2>&1 && py -3 scripts\catalogo\run_folders.py all && goto hecho
where python >nul 2>&1 && python scripts\catalogo\run_folders.py all && goto hecho

echo.
echo No se encontro Python. Instala Python 3 desde https://www.python.org/downloads/
pause
exit /b 1

:hecho
echo.
echo Listo. Productos en:
echo   %CATALOGO_PRODUCTOS_ROOT%\productos
explorer "%CATALOGO_PRODUCTOS_ROOT%\productos"
pause
