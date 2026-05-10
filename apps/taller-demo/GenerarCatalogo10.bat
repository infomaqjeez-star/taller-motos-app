@echo off
chcp 65001 >nul
cd /d "%~dp0"

REM Carpeta local automática (Documentos). Para usar otra ruta, descomentá y editá la línea de abajo.
set "CATALOGO_PRODUCTOS_ROOT=%USERPROFILE%\Documents\CatalogoKonectaArticulos"
REM set "CATALOGO_PRODUCTOS_ROOT=D:\Taller\CatalogoKonectaArticulos"

mkdir "%CATALOGO_PRODUCTOS_ROOT%\productos" 2>nul

where py >nul 2>&1 && py -3 scripts\catalogo\run_folders.py 10 && goto hecho
where python >nul 2>&1 && python scripts\catalogo\run_folders.py 10 && goto hecho

echo.
echo No se encontro Python. Instala Python 3 desde https://www.python.org/downloads/
echo Marca "Add python.exe to PATH" al instalar.
pause
exit /b 1

:hecho
echo.
echo Listo. Productos en:
echo   %CATALOGO_PRODUCTOS_ROOT%\productos
explorer "%CATALOGO_PRODUCTOS_ROOT%\productos"
pause
