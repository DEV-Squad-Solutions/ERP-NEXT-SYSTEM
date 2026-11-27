@echo off
chcp 65001 >nul
cd /d "%~dp0"
rem Default: graphical installer. If the window cannot start, fall back to the console installer.
powershell -NoProfile -ExecutionPolicy Bypass -STA -WindowStyle Hidden -File "%~dp0erp-installer-gui.ps1"
if not %ERRORLEVEL%==0 goto console
exit /b 0
:console
echo Graphical window could not start. Using the console installer instead.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-or-update.ps1"
set RC=%ERRORLEVEL%
echo.
if %RC%==0 (echo === DONE: OK ===) else (echo === STOPPED WITH ERROR code %RC% - nothing was deleted. Read the message above ===)
pause
exit /b %RC%
