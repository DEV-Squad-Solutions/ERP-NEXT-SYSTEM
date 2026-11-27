<#
 GET THE ERP 2.0 IMAGES onto this PC (erp-api and erp-frontend). Nothing in your data is touched.
 1  Check Docker and which images are already here.
 2  If an erp-images-<version>.tar exists (deploy folder or deploy\images): load it (no internet needed).
 3  Otherwise build both images from the repo next to the deploy folder (backend\Dockerfile, frontend\Dockerfile).
    Needs internet ONCE for the base images and packages (can take 10-20 minutes). Not possible on the offline server.
 4  Save a copy as deploy\images\erp-images-<version>.tar to carry to the offline server on a USB drive.
 5  Check the result.
 Never deletes anything. The version comes from ERP_VERSION in .env, else from the tar name, else 2.0.
#>
param([switch]$Gui, [string]$IoDir = "", [string]$BackupDir = "", [string]$Lang = "en")
$ErrorActionPreference = "Continue"
if ($Gui) { [Console]::OutputEncoding = [Text.Encoding]::UTF8 }
$Root = $(if (Test-Path (Join-Path $PSScriptRoot "docker-compose.yml")) { $PSScriptRoot } else { Split-Path $PSScriptRoot -Parent })
. (Join-Path $PSScriptRoot "gate.ps1")
Require-Gate $Root $Gui.IsPresent $IoDir
function Say($t, $c = "Gray") { Write-Host $t -ForegroundColor $c }
function Fail-Now($m) { if ($Gui) { Write-Host "  FAIL $m" } else { Say "  FAIL $m" Red; [void](Read-Host "Press Enter to close") }; exit 1 }
function Get-EnvVal([string]$key) {
    $f = Join-Path $Root ".env"; if (-not (Test-Path $f)) { return "" }
    foreach ($l in [IO.File]::ReadAllLines($f, [Text.Encoding]::UTF8)) { if ($l -match ('^\s*' + $key + '\s*=\s*(\S+)\s*$')) { return $Matches[1] } }
    return ""
}
function Have([string]$v) {
    docker image inspect "erp-api:$v" *> $null; $a = ($LASTEXITCODE -eq 0)
    docker image inspect "erp-frontend:$v" *> $null; $b = ($LASTEXITCODE -eq 0)
    return ($a -and $b)
}
Say "[1/5] Checking Docker and the images" Cyan
docker version --format "{{.Server.Version}}" *> $null
if ($LASTEXITCODE -ne 0) { Fail-Now "Docker is not running. Start Docker Desktop, wait until it says Engine running, then try again." }
$tar = @(Get-ChildItem -Path $Root, (Join-Path $Root "images") -Filter "erp-images-*.tar" -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending) | Select-Object -First 1
$ver = Get-EnvVal "ERP_VERSION"
if (-not $ver -and $tar -and $tar.Name -match '^erp-images-(.+)\.tar$') { $ver = $Matches[1] }
if (-not $ver) { $ver = "2.0" }
if ($ver -notmatch '^[A-Za-z0-9._-]+$') { Fail-Now "ERP_VERSION in .env has unsafe characters." }
Say "  Version: $ver" White
if (Have $ver) {
    Say "  OK  erp-api:$ver and erp-frontend:$ver are already on this PC." Green
    if ($Gui) { Write-Host "@@DONE|IMAGES|Images erp-api:$ver and erp-frontend:$ver are ready." }
    exit 0
}
Say "[2/5] Looking for an images file (erp-images-*.tar)" Cyan
$loaded = $false
if ($tar) {
    Say "  Loading $($tar.FullName) (a few minutes, no internet needed)" DarkGray
    docker load -i $tar.FullName 2>&1 | ForEach-Object { Say "  $_" DarkGray }
    $loaded = Have $ver
    if ($loaded) { Say "  OK  Images loaded from the file." Green } else { Say "  The file does not contain version $ver. Trying to build from the repo instead." Yellow }
} else { Say "  No erp-images-*.tar found. Will build from the repo." DarkGray }
if (-not $loaded) {
    Say "[3/5] Building the images from the repo (10-20 minutes, needs internet once)" Cyan
    $repo = $null
    foreach ($c in @((Split-Path $Root -Parent), $Root)) { if ($c -and (Test-Path (Join-Path $c "backend\Dockerfile")) -and (Test-Path (Join-Path $c "frontend\Dockerfile"))) { $repo = $c; break } }
    if (-not $repo) { Fail-Now "No erp-images-*.tar and no repo (backend\Dockerfile + frontend\Dockerfile next to the deploy folder) found. Put erp-images-$ver.tar into the deploy\images folder, or run this on the PC that has the whole project." }
    Say "  Repo: $repo" DarkGray
    foreach ($pair in @(@("erp-api", "backend"), @("erp-frontend", "frontend"))) {
        Say ("  Building {0}:{1} from {2} ..." -f $pair[0], $ver, $pair[1]) White
        docker build --progress=plain -t ("{0}:{1}" -f $pair[0], $ver) (Join-Path $repo $pair[1]) 2>&1 | ForEach-Object { if ($_ -match '^#\d+ \[|ERROR|rror:|failed|DONE \d') { Say ("  " + $_.ToString().Substring(0, [Math]::Min(150, $_.ToString().Length))) DarkGray } }
        docker image inspect ("{0}:{1}" -f $pair[0], $ver) *> $null
        if ($LASTEXITCODE -ne 0) { Fail-Now ("Building {0} failed. If the lines above mention a network or pull error, this PC needs internet for this one step (then it is not needed again). Nothing was changed." -f $pair[0]) }
        Say ("  OK  {0}:{1} built." -f $pair[0], $ver) Green
    }
    Say "[4/5] Saving a copy for the offline server" Cyan
    $dir = Join-Path $Root "images"; New-Item -ItemType Directory -Force -Path $dir | Out-Null
    $out = Join-Path $dir "erp-images-$ver.tar"
    if (Test-Path $out) { Say "  $out already exists, not overwritten." DarkGray }
    else {
        docker save -o $out "erp-api:$ver" "erp-frontend:$ver" 2>&1 | ForEach-Object { Say "  $_" DarkGray }
        if ($LASTEXITCODE -eq 0 -and (Test-Path $out)) { Say ("  OK  Saved {0} ({1} MB). Copy it to the server's images folder on a USB drive." -f $out, [int]((Get-Item $out).Length / 1MB)) Green }
        else { Say "  Could not save the copy (the images themselves are fine on this PC). Check free disk space." Yellow }
    }
} else { Say "[3/5] Build not needed" Cyan; Say "[4/5] Copy not needed" Cyan }
Say "[5/5] Checking the result" Cyan
if (-not (Have $ver)) { Fail-Now "The images erp-api:$ver / erp-frontend:$ver are still missing." }
Say "  OK  erp-api:$ver and erp-frontend:$ver are on this PC." Green
if ($Gui) { Write-Host "@@DONE|IMAGES|Images erp-api:$ver and erp-frontend:$ver are ready." } else { [void](Read-Host "Press Enter to close") }
