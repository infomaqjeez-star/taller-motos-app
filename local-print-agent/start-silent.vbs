Set WshShell = CreateObject("WScript.Shell") 
WshShell.Run "cmd /c cd /d ""C:\Users\Mi Pc\Downloads\APP PARA TALLER MAQJEEZ\local-print-agent\"" && node server.js", 0, False 
