@echo off
chcp 65001 >nul
REM Mismo que GenerarCatalogo10Rejilla.bat (nombre mas simple para tipear).
cd /d "%~dp0"
set "CATALOGO_IMAGE_MODE=grid"
set "CATALOGO_EMIT_VARIANTS=1"
set "CATALOGO_GRID_AUTO_HEADER=1"
call "%~dp0GenerarCatalogo10.bat"
