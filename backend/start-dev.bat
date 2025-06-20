@echo off
echo Starting Botcito.ai Development Environment...

:: Start PostgreSQL
echo Starting PostgreSQL...
start "PostgreSQL" cmd /k "cd /d C:\PostgreSQL\pgsql\bin && pg_ctl.exe -D C:\PostgreSQL\data start"

:: Wait a bit for PostgreSQL to start
timeout /t 3

:: Start Backend
echo Starting Backend API...
start "Backend API" cmd /k "cd /d D:\botcito-ai\backend && npm run dev"

:: Wait for backend to start
timeout /t 3

:: Start Static Server in a new window
echo Starting Static Server...
start "Static Server" cmd /k "cd /d D:\botcito-ai && python -m http.server 8000"

:: Wait for server to start
timeout /t 2

:: Open browser
echo Opening browser...
start http://localhost:8000/frontend/

echo.
echo ========================================
echo All services started!
echo ========================================
echo Frontend: http://localhost:8000/frontend/
echo API Test: http://localhost:8000/test-api.html
echo Backend:  http://localhost:5000/
echo ========================================
echo.
echo Close this window when done.
pause