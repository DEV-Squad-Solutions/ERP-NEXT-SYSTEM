<#
 Run on the DEV PC (Docker + internet + the repo), not on the server.
 Builds the two images from the current code and saves them to deploy\erp-images-<Version>.tar.
 Then copy the whole deploy folder to the USB drive. Run "git pull" first.
 Example: powershell -ExecutionPolicy Bypass -File .\build-images.ps1 -Version 2.1
#>
param([Parameter(Mandatory = $true)][string]$Version)
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Write-Host "=== Building API (can take 10 minutes) ===" -ForegroundColor Cyan
docker build -t "erp-api:$Version" (Join-Path $root "backend")
if ($LASTEXITCODE -ne 0) { throw "API build failed" }
Write-Host "=== Building web ===" -ForegroundColor Cyan
docker build -t "erp-frontend:$Version" (Join-Path $root "frontend")
if ($LASTEXITCODE -ne 0) { throw "Web build failed" }
$out = Join-Path $PSScriptRoot "erp-images-$Version.tar"
docker save -o $out "erp-api:$Version" "erp-frontend:$Version"
if ($LASTEXITCODE -ne 0) { throw "Saving images failed" }
Write-Host "DONE. Copy the whole deploy folder (it contains $out) to the USB drive." -ForegroundColor Green
