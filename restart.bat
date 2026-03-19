@echo off
title PF2e Rebirth - Restart
color 0A
echo ============================================
echo   PF2e Rebirth - Restart Backend ^& Frontend
echo ============================================
echo.

:: Kill existing node processes (backend ts-node / vite dev server)
echo [1/4] Stopping running servers...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

:: Rebuild shared package
echo [2/4] Rebuilding shared package...
cd /d "%~dp0shared"
call npm run build
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo.
    echo  ERROR: Shared package build failed!
    echo  Fix the errors above and try again.
    pause
    exit /b 1
)
echo       Shared build OK

:: Start backend in a new window
echo [3/4] Starting backend...
cd /d "%~dp0backend"
start "PF2e Backend" cmd /c "color 0E && title PF2e Backend && npm run dev"

:: Wait a moment for backend to initialize
timeout /t 3 /nobreak >nul

:: Start frontend in a new window
echo [4/4] Starting frontend...
cd /d "%~dp0frontend"
start "PF2e Frontend" cmd /c "color 0B && title PF2e Frontend && npm run dev"

echo.
echo ============================================
echo   All servers started!
echo   Backend:  http://localhost:3001
echo   Frontend: http://localhost:5173
echo ============================================
echo.
echo You can close this window.
timeout /t 5
