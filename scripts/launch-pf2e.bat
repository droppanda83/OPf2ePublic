@echo off
setlocal
set "ROOT=%~dp0.."

start "PF2e Backend" cmd /c "npm --prefix ""%ROOT%\backend"" run dev"
timeout /t 3 /nobreak >nul
start "PF2e Frontend" cmd /c "npm --prefix ""%ROOT%\frontend"" run dev"
timeout /t 4 /nobreak >nul
start "" "http://localhost:5173/"

exit /b 0
