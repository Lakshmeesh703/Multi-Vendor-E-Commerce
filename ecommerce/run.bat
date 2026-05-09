@echo off
REM Thin Windows wrapper for the PowerShell launcher

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1"
exit /b %ERRORLEVEL%
