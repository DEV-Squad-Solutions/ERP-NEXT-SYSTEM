<#
 يتشغل على جهاز التطوير (عليه Docker + إنترنت + الريبو)، مش على السيرفر.
 بيبني صورتين من الكود الحالي ويحفظهم في ملف tar جوه فولدر deploy. انسخ فولدر deploy كله على الفلاشة.
 مثال:  powershell -ExecutionPolicy Bypass -File .\build-images.ps1 -Version 2.1
 (قبله: git pull عشان تبني من آخر main)
#>
param([Parameter(Mandatory = $true)][string]$Version)
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Write-Host "=== بناء الـ API (ممكن ياخد 10 دقايق) ===" -ForegroundColor Cyan
docker build -t "erp-api:$Version" (Join-Path $root "backend")
if ($LASTEXITCODE -ne 0) { throw "فشل بناء الـ API" }
Write-Host "=== بناء الواجهة ===" -ForegroundColor Cyan
docker build -t "erp-frontend:$Version" (Join-Path $root "frontend")
if ($LASTEXITCODE -ne 0) { throw "فشل بناء الواجهة" }
$out = Join-Path $PSScriptRoot "erp-images-$Version.tar"
docker save -o $out "erp-api:$Version" "erp-frontend:$Version"
if ($LASTEXITCODE -ne 0) { throw "فشل حفظ الصور" }
Write-Host "تم. انسخ فولدر deploy كله (فيه $out) على الفلاشة." -ForegroundColor Green
