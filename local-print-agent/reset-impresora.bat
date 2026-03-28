@echo off
title Reset Impresora 4BARCODE
echo ============================================
echo   Reset de Impresora - Limpieza de Spooler
echo ============================================
echo.

:: Auto-elevacion UAC si no es admin
net session >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Solicitando permisos de administrador...
    powershell -Command "Start-Process cmd -ArgumentList '/c \"%~f0\"' -Verb RunAs"
    exit /b
)

echo Deteniendo servicio de impresion...
net stop spooler

echo Limpiando cola de impresion...
del /Q /F "%SYSTEMROOT%\System32\spool\PRINTERS\*.*" 2>nul

echo Reiniciando servicio de impresion...
net start spooler

echo.
echo Verificando estado de la impresora...
powershell -NoProfile -Command "Get-Printer | Where-Object { $_.Name -like '*4BARCODE*' } | Format-Table Name, PrinterStatus, PortName -AutoSize"

echo.
echo ============================================
echo   Listo! La impresora deberia estar
echo   disponible nuevamente.
echo ============================================
pause
