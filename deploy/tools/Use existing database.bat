@echo off
chcp 65001 >nul
cd /d "%~dp0.."
powershell -NoProfile -ExecutionPolicy Bypass -STA -WindowStyle Hidden -File "installer\erp-installer-gui.ps1" -Open existing
if not %ERRORLEVEL%==0 powershell -NoProfile -ExecutionPolicy Bypass -File "installer\use-existing-db.ps1"
