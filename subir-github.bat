@echo off
set PATH=%PATH%;C:\Program Files\Git\cmd
cd /d "C:\Users\Mi Pc\Downloads\APP PARA TALLER MAQJEEZ"
git init
git add .
git commit -m "feat: initial commit — Taller MAQJEEZ app"
git branch -M main
git remote add origin https://github.com/infomaqjeez-star/taller-motos-app.git
git push -u origin main
echo.
echo LISTO - Codigo subido a GitHub
pause
