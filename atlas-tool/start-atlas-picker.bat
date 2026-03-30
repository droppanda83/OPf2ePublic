@echo off
set "PROJECT_DIR=C:\Users\DropP\OneDrive - The Cairnmillar Institute\Documents\GitHub\OPf2ePublic\atlas-tool"
cd /d "%PROJECT_DIR%"
start "Atlas Picker Server" cmd /c "cd /d ""%PROJECT_DIR%"" && npm run dev:server"
start "Atlas Picker Client" cmd /c "cd /d ""%PROJECT_DIR%"" && npm run dev:client -- --port 5175 --strictPort"
timeout /t 6 /nobreak >nul
start "" "http://localhost:5175/?page=database"
