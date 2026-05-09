@echo off
REM Display all 3 login links (ASCII-only to avoid encoding issues)

cls
echo.
echo =============================================================
echo VENDORHUB - LOGIN LINKS
echo =============================================================
echo.
echo CUSTOMER LOGIN:
echo    http://localhost:4000/customer/login
echo.
echo VENDOR LOGIN:
echo    http://localhost:4000/vendor/login
echo.
echo ADMIN LOGIN:
echo    http://localhost:4000/admin/login
echo.
echo =============================================================
echo.
echo TEST CREDENTIALS (All accounts):
echo    Email:    customer@example.com
echo    Email:    vendor@example.com
echo    Email:    admin@example.com
echo    Password: password123
echo.
echo =============================================================
echo OTHER ENDPOINTS:
echo =============================================================
echo.
echo Backend API:  http://localhost:4000
echo Frontend UI:  http://localhost:3000
echo Health Check: http://localhost:4000/health
echo.
echo Opening the three login pages in your browser...
powershell -NoProfile -Command "Start-Process 'http://localhost:4000/customer/login'"
powershell -NoProfile -Command "Start-Process 'http://localhost:4000/vendor/login'"
powershell -NoProfile -Command "Start-Process 'http://localhost:4000/admin/login'"
echo.
pause
