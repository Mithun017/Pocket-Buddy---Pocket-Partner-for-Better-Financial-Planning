@echo off
title Pocket Buddy - Starting...
color 0A

echo ============================================
echo    Pocket Buddy - Financial Planning App
echo ============================================
echo.

set "PROJECT_DIR=%~dp0"

:: Start Backend
echo [1/2] Starting Backend (FastAPI)...
cd /d "%PROJECT_DIR%backend"
start "Pocket Buddy - Backend" cmd /k "venv\Scripts\activate && uvicorn app.main:app --reload"
echo    Backend running at http://localhost:8000
echo.

:: Start Frontend (dev server)
echo [2/2] Starting Frontend (React Dev Server)...
cd /d "%PROJECT_DIR%frontend"
start "Pocket Buddy - Frontend" cmd /k "npm start"
echo    Frontend running at http://localhost:3000
echo.

:: Open browser
echo ============================================
echo    Opening browser in 5 seconds...
echo ============================================
timeout /t 5 /nobreak >nul
start http://localhost:3000

echo.
echo    Pocket Buddy is running!
echo    Close this window anytime.
echo    (Servers run in their own windows)
pause >nul
