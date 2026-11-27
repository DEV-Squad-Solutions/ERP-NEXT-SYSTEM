<#
 Run on the DEV PC. Assembles a clean, self-contained folder you copy to the server by USB:
   dist\DevSquad-ERP-Installer-<Version>\
     ERP Installer.bat            <- double-click this (the only thing you need)
     Create Desktop Shortcut.bat  <- optional, adds an icon to the Desktop
     START-HERE.txt, README-EN.md, README-AR.md
     images\erp-images-<Version>.tar   (copied if present in deploy\ or given with -ImagesTar)
     tools\  Backup now.bat, Status.bat, Backup old MiniErp container.bat
     app\    the scripts, docker-compose.yml, .env.example, icon
 It never copies .env, .env.bak, logs, release-history.txt, or any password. It then checks the result.
 Example: powershell -ExecutionPolicy Bypass -File .\build-package.ps1 -Version 2.1
#>
param(
    [Parameter(Mandatory = $true)][string]$Version,
    [string]$ImagesTar = "",
    [string]$OutRoot = ""
)
$ErrorActionPreference = "Stop"
if ($Version -notmatch '^[A-Za-z0-9._-]+$') { throw "Version may only contain letters, digits, dot, dash, underscore." }
if (-not $OutRoot) { $OutRoot = Join-Path (Split-Path $PSScriptRoot -Parent) "dist" }
$pkg = Join-Path $OutRoot "DevSquad-ERP-Installer-$Version"
if (Test-Path $pkg) { throw "Folder already exists: $pkg . Delete it yourself or choose another version (nothing is overwritten)." }
$app = Join-Path $pkg "app"; $tools = Join-Path $pkg "tools"; $img = Join-Path $pkg "images"
New-Item -ItemType Directory -Force -Path $app, $tools, $img | Out-Null

$appFiles = @("docker-compose.yml", ".env.example", "install-or-update.ps1", "install-or-update.bat", "install-or-update-console.bat",
    "erp-installer-gui.ps1", "messages-ar.ps1", "rollback.ps1", "status.ps1", "backup.ps1", "minierp-backup.ps1", "create-shortcut.ps1", "erp-icon.ico", "devsquad-header.png", "devsquad-logo.jpg")
foreach ($f in $appFiles) {
    $src = Join-Path $PSScriptRoot $f
    if (-not (Test-Path $src)) { throw "Missing file in deploy folder: $f" }
    Copy-Item $src (Join-Path $app $f)
}
Copy-Item (Join-Path $PSScriptRoot "README-EN.md") $pkg
Copy-Item (Join-Path $PSScriptRoot "README-AR.md") $pkg

$crlf = "`r`n"
[IO.File]::WriteAllText((Join-Path $pkg "ERP Installer.bat"), ("@echo off" + $crlf + 'call "%~dp0app\install-or-update.bat"' + $crlf + "exit /b %ERRORLEVEL%" + $crlf), (New-Object Text.UTF8Encoding($false)))
[IO.File]::WriteAllText((Join-Path $pkg "Create Desktop Shortcut.bat"), ("@echo off" + $crlf + 'powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0app\create-shortcut.ps1"' + $crlf + "pause" + $crlf), (New-Object Text.UTF8Encoding($false)))
[IO.File]::WriteAllText((Join-Path $tools "Backup now.bat"), ("@echo off" + $crlf + 'powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0..\app\backup.ps1"' + $crlf + "pause" + $crlf), (New-Object Text.UTF8Encoding($false)))
[IO.File]::WriteAllText((Join-Path $tools "Status.bat"), ("@echo off" + $crlf + 'powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0..\app\status.ps1"' + $crlf + "pause" + $crlf), (New-Object Text.UTF8Encoding($false)))
[IO.File]::WriteAllText((Join-Path $tools "Backup old MiniErp container.bat"), ("@echo off" + $crlf + 'powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0..\app\minierp-backup.ps1"' + $crlf + "pause" + $crlf), (New-Object Text.UTF8Encoding($false)))

$start = @"
ERP System installer, version $Version
=====================================
1. Copy this whole folder to the server (USB).
2. Double-click:  ERP Installer.bat   (a window opens; choose language top right)
3. Click "Install / Update" and follow the window. Typed confirmations appear in boxes.
Optional: double-click "Create Desktop Shortcut.bat" for a Desktop icon.

Folders:  images = the image file (erp-images-*.tar)   tools = backup / status   app = the engine (do not edit)
Your data is never deleted by this installer. A backup is taken before every update.
Read README-EN.md or README-AR.md for details.

مثبّت نظام ERP، إصدار $Version
1. انسخ الفولدر كله للسيرفر (فلاشة).  2. دوس مرتين على ERP Installer.bat  3. اضغط تثبيت / تحديث واتبع النافذة.
الداتا مبتتمسحش أبداً، وفيه نسخة احتياطية قبل كل تحديث.
"@
[IO.File]::WriteAllText((Join-Path $pkg "START-HERE.txt"), ($start -replace "`r?`n", $crlf), (New-Object Text.UTF8Encoding($true)))

$tar = $null
if ($ImagesTar) { $tar = Get-Item $ImagesTar }
else { $tar = Get-ChildItem $PSScriptRoot -Filter "erp-images-$Version.tar" -ErrorAction SilentlyContinue | Select-Object -First 1 }
if ($tar) { Copy-Item $tar.FullName (Join-Path $img $tar.Name); Write-Host "Included images: $($tar.Name)" -ForegroundColor Green }
else { Write-Host "WARNING: erp-images-$Version.tar not found. Run build-images.ps1 -Version $Version first, then copy the .tar into $img" -ForegroundColor Yellow }

# safety check: nothing private may be in the package
$bad = Get-ChildItem $pkg -Recurse -Force -File | Where-Object { $_.Name -in @(".env", ".env.bak", "release-history.txt") -or $_.Name -like "erp-install-*.log" -or $_.Extension -in @(".bak", ".key", ".pfx") }
if ($bad) { Remove-Item $pkg -Recurse -Force; throw "Private file found, package deleted: $($bad.Name -join ', ')" }
$size = [math]::Round(((Get-ChildItem $pkg -Recurse -File | Measure-Object Length -Sum).Sum / 1MB), 1)
Write-Host "DONE: $pkg ($size MB). Copy this folder to the USB drive. Entry point: ERP Installer.bat" -ForegroundColor Green
