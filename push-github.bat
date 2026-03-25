@echo off
set PATH=%PATH%;C:\Program Files\Git\cmd
cd /d "C:\Users\Mi Pc\Downloads\APP PARA TALLER MAQJEEZ"
git config user.email "infomaqjeez@taller.com"
git config user.name "infomaqjeez-star"
git add .
git commit -m "feat: Supabase integration, success toast, async hooks"
git push origin main
echo.
echo PUSH COMPLETADO
pause
