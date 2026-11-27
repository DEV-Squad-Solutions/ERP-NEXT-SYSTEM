<#
 Read-only status of the ERP install. Changes nothing.
#>
param([string]$BackupDir = "C:\ERP_backup", [switch]$Gui, [string]$IoDir = "")
$ErrorActionPreference = "Continue"
$Root = $(if (Test-Path (Join-Path $PSScriptRoot "docker-compose.yml")) { $PSScriptRoot } else { Split-Path $PSScriptRoot -Parent })   # folder with .env, docker-compose.yml, images, logs
Set-Location $Root
function Test-ErpApiOnPort([string]$port) {   # true only if OUR erp-api container is running and publishes this host port
    $run = docker inspect -f "{{.State.Running}}" erp-api 2>$null
    if ($run -ne "true") { return $false }
    $p = docker port erp-api 8080 2>$null
    return [bool]($p -match (":" + [regex]::Escape($port) + "$"))
}
function Get-PortOwner([string]$port) {      # name of the container that publishes this host port, or empty
    $o = docker ps --format "{{.Names}}|{{.Ports}}" 2>$null | Where-Object { $_ -match (":" + [regex]::Escape($port) + "->") } | Select-Object -First 1
    if ($o) { return ($o -split '\|')[0] } else { return "" }
}
function Row($k, $v, $c = "White") { Write-Host ("  {0,-22}: " -f $k) -NoNewline; Write-Host $v -ForegroundColor $c }
Write-Host ""
Write-Host "  ================================================================" -ForegroundColor Cyan
Write-Host "    ERP SYSTEM  -  Status (read-only)" -ForegroundColor White
Write-Host "  ================================================================" -ForegroundColor Cyan
docker version --format "{{.Server.Version}}" *> $null
if ($LASTEXITCODE -ne 0) { Row "Docker" "NOT RUNNING" Red; if ($Gui) { Write-Host "@@FAIL|docker" }; exit 1 }
Row "Docker" "running" Green
foreach ($n in "erp-db", "erp-api", "erp-frontend") {
    $st = docker inspect -f "{{.State.Status}} / health: {{if .State.Health}}{{.State.Health.Status}}{{else}}n/a{{end}}" $n 2>$null
    if ($st) { Row $n $st $(if ($st -match '^running') { "Green" } else { "Yellow" }) } else { Row $n "not found" Yellow }
}
$img = docker inspect -f "{{.Config.Image}}" erp-api 2>$null
Row "Running API image" $(if ($img) { $img } else { "-" })
$vol = docker volume ls -q --filter "name=^erp_sql_data$"
Row "Data volume" $(if ($vol) { "erp_sql_data (present)" } else { "erp_sql_data NOT found" }) $(if ($vol) { "Green" } else { "Yellow" })
$apiPort = "8080"; $ef = Join-Path $Root ".env"; if (Test-Path $ef) { $m = [regex]::Match([IO.File]::ReadAllText($ef, [Text.Encoding]::UTF8), "(?m)^\s*ERP_API_PORT\s*=\s*(\S+)"); if ($m.Success) { $apiPort = $m.Groups[1].Value } }
if (Test-ErpApiOnPort $apiPort) {
    try { $r = Invoke-WebRequest -UseBasicParsing -Uri "http://localhost:$apiPort/health/ready" -TimeoutSec 5; Row "Health (ready)" "HTTP $($r.StatusCode)" Green } catch { Row "Health (ready)" "erp-api is running but not ready" Yellow }
} else {
    $own = Get-PortOwner $apiPort
    if ($own -and $own -notmatch '^erp-') { Row "Health (ready)" "not running (port $apiPort is used by another container: $own)" Yellow }
    else { Row "Health (ready)" "not running (erp-api is not running)" Yellow }
}
$bak = Get-ChildItem $BackupDir -Filter "MiniErp_*.bak" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($bak) { Row "Latest backup" ("{0} ({1} MB, {2})" -f $bak.Name, [math]::Round($bak.Length/1MB,1), $bak.LastWriteTime.ToString("yyyy-MM-dd HH:mm")) } else { Row "Latest backup" "none in $BackupDir" Yellow }
$hist = Join-Path $Root "release-history.txt"
if (Test-Path $hist) { Row "Last update" (Get-Content $hist -Tail 1) } else { Row "Last update" "no history yet" }
Write-Host "  Local images:"
docker images --format "      {{.Repository}}:{{.Tag}}   {{.CreatedSince}}" | Where-Object { $_ -match "^\s+erp-(api|frontend):" }
if ($Gui) { Write-Host "@@DONE|STATUS|||" }
exit 0
