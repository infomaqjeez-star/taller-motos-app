@echo off
REM Deja PYTHON_EXE apuntando al python.exe real (no el stub de Microsoft Store).
set "PYTHON_EXE="

REM 1) Launcher oficial "py" (recomendado en Windows)
where py >nul 2>&1 && (
  for /f "delims=" %%i in ('py -3 -c "import sys; print(sys.executable)" 2^>nul') do set "PYTHON_EXE=%%i" & if defined PYTHON_EXE goto :eof
  for /f "delims=" %%i in ('py -c "import sys; print(sys.executable)" 2^>nul') do set "PYTHON_EXE=%%i" & if defined PYTHON_EXE goto :eof
)

REM 2) "python" en PATH que NO sea el alias de WindowsApps (Store)
for /f "delims=" %%i in ('where python 2^>nul') do (
  echo %%i| findstr /i "WindowsApps" >nul
  if errorlevel 1 (
    set "PYTHON_EXE=%%i"
    goto :eof
  )
)

where python3 >nul 2>&1 && (
  for /f "delims=" %%i in ('where python3 2^>nul') do (
    echo %%i| findstr /i "WindowsApps" >nul
    if errorlevel 1 (
      set "PYTHON_EXE=%%i"
      goto :eof
    )
  )
)

REM 3) Instalación típica usuario (python.org)
for %%V in (Python314 Python313 Python312 Python311 Python310) do (
  if exist "%LocalAppData%\Programs\Python\%%V\python.exe" (
    set "PYTHON_EXE=%LocalAppData%\Programs\Python\%%V\python.exe"
    goto :eof
  )
)

REM 4) Instalación “para todos los usuarios”
if exist "%ProgramFiles%\Python312\python.exe" set "PYTHON_EXE=%ProgramFiles%\Python312\python.exe" & goto :eof
if exist "%ProgramFiles%\Python311\python.exe" set "PYTHON_EXE=%ProgramFiles%\Python311\python.exe" & goto :eof
if exist "%ProgramFiles%\Python310\python.exe" set "PYTHON_EXE=%ProgramFiles%\Python310\python.exe" & goto :eof

goto :eof
