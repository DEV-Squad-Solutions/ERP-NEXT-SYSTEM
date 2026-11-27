<#
 Run on the DEV PC. Assembles a clean, self-contained folder you copy to the server by USB:
   dist\DevSquad-ERP-Installer-<Version>\
     ERP Installer.bat            <- double-click this (the only thing you need)
     Create Desktop Shortcut.bat  <- optional, adds an icon to the Desktop
     START-HERE.txt, README-EN.md, README-AR.md, docker-compose.yml, .env.example
     images\erp-images-<Version>.tar   (copied if present)
     tools\      Backup now.bat, Status.bat, Backup old MiniErp container.bat
     installer\  the scripts and assets (do not edit)
 It never copies .env, .env.bak, logs, release-history.txt, or any password. It then checks the result.
 Example: powershell -ExecutionPolicy Bypass -File .\build\build-package.ps1 -Version 2.1
#>
param(
    [Parameter(Mandatory = $true)][string]$Version,
    [string]$ImagesTar = "",
    [string]$OutRoot = ""
)
$ErrorActionPreference = "Stop"
if ($Version -notmatch '^[A-Za-z0-9._-]+$') { throw "Version may only contain letters, digits, dot, dash, underscore." }
$deploy = Split-Path $PSScriptRoot -Parent
if (-not $OutRoot) { $OutRoot = Join-Path (Split-Path $deploy -Parent) "dist" }
$pkg = Join-Path $OutRoot "DevSquad-ERP-Installer-$Version"
if (Test-Path $pkg) { throw "Folder already exists: $pkg . Delete it yourself or choose another version (nothing is overwritten)." }
$inst = Join-Path $pkg "installer"; $tools = Join-Path $pkg "tools"; $img = Join-Path $pkg "images"
New-Item -ItemType Directory -Force -Path $inst, $tools, $img | Out-Null
$crlf = "`r`n"

# same layout as the deploy folder of the repo: root = entry bat + compose + .env.example + docs; installer\ = scripts and assets; tools\ = helper bats
foreach ($f in @("ERP Installer.bat", "Create Desktop Shortcut.bat", "docker-compose.yml", "docker-compose.existing.yml", "docker-compose.dryrun.yml", ".env.example", "README-EN.md", "README-AR.md")) {
    $src = Join-Path $deploy $f
    if (-not (Test-Path $src)) { throw "Missing file in deploy folder: $f" }
    Copy-Item $src (Join-Path $pkg $f)
}
Copy-Item (Join-Path $deploy "installer\*") $inst -Recurse -Exclude "*.log"
Copy-Item (Join-Path $deploy "tools\*") $tools

$start = @"
ERP System installer, version $Version
=====================================
1. Copy this whole folder to the server (USB).
2. Double-click:  ERP Installer.bat   (a window opens; choose language top right)
3. Click "Install / Update" and follow the window. Typed confirmations appear in boxes.
Optional: double-click "Create Desktop Shortcut.bat" for a Desktop icon.

Folders:  images = the image file (erp-images-*.tar)   tools = backup / status   installer = the engine (do not edit)
Your data is never deleted by this installer. A backup is taken before every update.
Read README-EN.md or README-AR.md for details.

مثبّت نظام ERP، إصدار $Version
1. انسخ الفولدر كله للسيرفر (فلاشة).  2. دوس مرتين على ERP Installer.bat  3. اضغط تثبيت / تحديث واتبع النافذة.
الداتا مبتتمسحش أبداً، وفيه نسخة احتياطية قبل كل تحديث.
"@
[IO.File]::WriteAllText((Join-Path $pkg "START-HERE.txt"), ($start -replace "`r?`n", $crlf), (New-Object Text.UTF8Encoding($true)))

$tar = $null
if ($ImagesTar) { $tar = Get-Item $ImagesTar }
else { $tar = Get-ChildItem @($deploy, (Join-Path $deploy "images")) -Filter "erp-images-$Version.tar" -ErrorAction SilentlyContinue | Select-Object -First 1 }
if ($tar) { Copy-Item $tar.FullName (Join-Path $img $tar.Name); Write-Host "Included images: $($tar.Name)" -ForegroundColor Green }
else { Write-Host "WARNING: erp-images-$Version.tar not found. Run build\build-images.ps1 -Version $Version first, then copy the .tar into $img" -ForegroundColor Yellow }

# safety check: nothing private may be in the package
$bad = Get-ChildItem $pkg -Recurse -Force -File | Where-Object { $_.Name -in @(".env", ".env.bak", "release-history.txt") -or $_.Name -like "erp-install-*.log" -or $_.Extension -in @(".bak", ".key", ".pfx") }
if ($bad) { Remove-Item $pkg -Recurse -Force; throw "Private file found, package deleted: $($bad.Name -join ', ')" }
$size = [math]::Round(((Get-ChildItem $pkg -Recurse -File | Measure-Object Length -Sum).Sum / 1MB), 1)
Write-Host "DONE: $pkg ($size MB). Copy this folder to the USB drive. Entry point: ERP Installer.bat" -ForegroundColor Green
