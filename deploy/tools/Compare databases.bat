@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0..\installer\compare-db.ps1"
pause
