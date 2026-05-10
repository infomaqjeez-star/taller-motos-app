@echo off
chcp 65001 >nul
REM Desde scripts\catalogo: rejilla 5x3 + variantes (mismo que GenerarCatalogo10Grid.bat en la raiz).
cd /d "%~dp0..\.."
set "CATALOGO_IMAGE_MODE=grid"
set "CATALOGO_EMIT_VARIANTS=1"
call "%~dp0..\..\GenerarCatalogo10.bat"
