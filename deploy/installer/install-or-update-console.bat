@echo off
chcp 65001 >nul
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-or-update.ps1"
set RC=%ERRORLEVEL%
echo.
if %RC%==0 (echo === DONE: OK ===) else (echo === STOPPED WITH ERROR code %RC% - nothing was deleted. Read the message above ===)
pause
exit /b %RC%
