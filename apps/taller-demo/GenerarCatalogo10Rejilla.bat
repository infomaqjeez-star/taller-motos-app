@echo off
chcp 65001 >nul
REM Catálogo Konecta en GRILLA: raster de la celda 5×3 que contiene cada código (foto + texto).
REM Si querés comparar con otros métodos, también genera variantes.
cd /d "%~dp0"
set "CATALOGO_IMAGE_MODE=grid"
set "CATALOGO_EMIT_VARIANTS=1"
call "%~dp0GenerarCatalogo10.bat"
