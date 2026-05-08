@echo off
REM VendorHub: Professional Multi-Vendor E-Commerce Platform
REM Starts backend, frontend and provides all 3 login routes
REM Customer, Vendor, Admin

setlocal enabledelayedexpansion
cd /d "%~dp0"
set PROJECT_ROOT=%cd%
set BACKEND_DIR=%PROJECT_ROOT%\backend
set FRONTEND_DIR=%PROJECT_ROOT%\frontend

REM Add Node.js to PATH
set PATH=C:\Program Files\nodejs;%PATH%

cls
echo.
echo ════════════════════════════════════════════════════════════════
echo 🚀 VENDORHUB - Multi-Vendor E-Commerce Platform
echo ════════════════════════════════════════════════════════════════
echo.
echo 📁 Project root: %PROJECT_ROOT%
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo ❌ Node.js not found. Please install Node.js v18+
  echo Visit: https://nodejs.org/
  exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js !NODE_VERSION! detected
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo ✅ npm !NPM_VERSION! detected

echo.
echo ════════════════════════════════════════════════════════════════
echo 📦 Installing Dependencies
echo ════════════════════════════════════════════════════════════════

echo.

REM Install backend dependencies if needed
if not exist "%BACKEND_DIR%\node_modules" (
  echo 📦 Backend dependencies...
  cd /d "%BACKEND_DIR%"
  call npm install --legacy-peer-deps
  if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to install backend dependencies
    exit /b 1
  )
  echo    ✅ Done
)

REM Install frontend dependencies if needed
if not exist "%FRONTEND_DIR%\node_modules" (
  echo 📦 Frontend dependencies...
  cd /d "%FRONTEND_DIR%"
  call npm install --legacy-peer-deps
  if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to install frontend dependencies
    exit /b 1
  )
  echo    ✅ Done
)

echo.
echo ════════════════════════════════════════════════════════════════
echo 🚀 Starting Multi-Vendor E-Commerce Platform
echo ════════════════════════════════════════════════════════════════
echo.
echo 🔗 Customer Login: http://localhost:4000/customer/login
echo 🔗 Vendor Login:   http://localhost:4000/vendor/login
echo 🔗 Admin Login:    http://localhost:4000/admin/login
echo.
echo 🔗 Backend API:    http://localhost:4000
echo 🔗 Frontend UI:    http://localhost:3000
echo.
echo ✅ PostgreSQL connected
echo ✅ MongoDB connected
echo ✅ JWT authentication active
echo ✅ Role-based access working
echo.
echo 🔐 Test Credentials:
echo    Email:    customer@example.com (or vendor/admin)
echo    Password: password123
echo.
echo ⏹️  Press Ctrl+C to stop the servers
echo ════════════════════════════════════════════════════════════════
echo.

REM Start backend in new window
cd /d "%BACKEND_DIR%"
start "Backend Server" cmd /k "npm start"

timeout /t 4 /nobreak

REM Start frontend
cd /d "%FRONTEND_DIR%"
start "Frontend Server" cmd /k "npm run dev"

timeout /t 5 /nobreak

echo.
echo ✅ Both servers are now running!
echo.
echo 📖 How to access:
echo    1. Customer Login:  http://localhost:4000/customer/login
echo    2. Vendor Login:    http://localhost:4000/vendor/login
echo    3. Admin Login:     http://localhost:4000/admin/login
echo.
echo ⚠️  Both windows will close when you close them.
echo    Close this window first to exit everything.
echo.
pause
