@echo off
chcp 65001 >nul
REM Igual que GenerarCatalogo10.bat pero guarda varias imagenes de prueba por articulo
REM (imagen_variant_*.webp) para ver cual recorte se ve bien.
cd /d "%~dp0"
set "CATALOGO_EMIT_VARIANTS=1"
call "%~dp0GenerarCatalogo10.bat"
