@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0..\installer\recover-erp-data.ps1" -Step fresh
pause
