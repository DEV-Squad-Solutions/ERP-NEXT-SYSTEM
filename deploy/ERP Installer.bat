@echo off
chcp 65001 >nul
cd /d "%~dp0"
rem ERP Installer - the one entry point. Opens the installer window; if it cannot start, falls back to the text installer.
powershell -NoProfile -ExecutionPolicy Bypass -STA -WindowStyle Hidden -File "%~dp0installer\erp-installer-gui.ps1"
if not %ERRORLEVEL%==0 goto console
exit /b 0
:console
echo Graphical window could not start. Using the text installer instead.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0installer\install-or-update.ps1"
set RC=%ERRORLEVEL%
echo.
if %RC%==0 (echo === DONE: OK ===) else (echo === STOPPED WITH ERROR code %RC% - nothing was deleted. Read the message above ===)
pause
exit /b %RC%
