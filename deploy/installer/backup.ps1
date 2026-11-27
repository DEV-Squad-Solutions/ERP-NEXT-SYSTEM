<#
 Backs up the ERP database (inside container erp-db) to a folder on this server.
 Keeps the last N days (backups listed in release-history.txt are always kept). Warns when disk space is low.
 Example: powershell -ExecutionPolicy Bypass -File .\backup.ps1
#>
[CmdletBinding()]
param(
    [string]$BackupDir = "C:\ERP_backup",
    [int]$RetainDays = 14
)
$ErrorActionPreference = "Stop"
$Root = $(if (Test-Path (Join-Path $PSScriptRoot "docker-compose.yml")) { $PSScriptRoot } else { Split-Path $PSScriptRoot -Parent })   # folder with .env, docker-compose.yml, images, logs
$envFile = Join-Path $Root ".env"
if (-not (Test-Path $envFile)) { throw ".env file not found next to the script." }

$saPass = $null
[IO.File]::ReadAllLines($envFile, [Text.Encoding]::UTF8) | ForEach-Object {
    if ($_ -match '^\s*SQL_SA_PASSWORD\s*=\s*(.+?)\s*$') { $saPass = $Matches[1] }
}
if (-not $saPass) { throw "SQL_SA_PASSWORD not found in .env" }

New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
$stamp = Get-Date -Format "yyyyMMdd_HHmm"
$ver = "unversioned"
foreach ($l in [IO.File]::ReadAllLines($envFile, [Text.Encoding]::UTF8)) { if ($l -match '^\s*ERP_VERSION\s*=\s*(\S+)\s*$') { $ver = ($Matches[1] -replace '[^A-Za-z0-9._-]', '-') } }
$bakName = "ERP_DB_backup_${ver}_$stamp.bak"   # ERP_DB_backup_<version>_<yyyyMMdd_HHmm>.bak (old MiniErp_*.bak files are still recognised)
$inContainer = "/var/opt/mssql/backup/$bakName"

if (-not (docker ps --filter "name=^erp-db$" --filter "status=running" -q)) {
    throw "Container erp-db is not running. Start it first: docker start erp-db"
}

Write-Host "=== Preparing backup folder in the container ===" -ForegroundColor Cyan
docker exec -u 0 erp-db bash -lc "mkdir -p '/var/opt/mssql/backup' && chown mssql:mssql '/var/opt/mssql/backup'"
if ($LASTEXITCODE -ne 0) { throw "Could not create the backup folder inside the container" }

$sqlcmd = "sqlcmd"
docker exec erp-db bash -lc "test -x /opt/mssql-tools18/bin/sqlcmd && echo tools18" 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) { $sqlcmd = "/opt/mssql-tools18/bin/sqlcmd" }

Write-Host "=== BACKUP DATABASE (compressed) ===" -ForegroundColor Cyan
$query = "BACKUP DATABASE [MiniErp] TO DISK = N'$inContainer' WITH FORMAT, COMPRESSION, INIT, STATS=10"
docker exec erp-db $sqlcmd -S localhost -U sa -P $saPass -C -b -Q $query
if ($LASTEXITCODE -ne 0) { throw "BACKUP failed. Check the password in .env" }

Write-Host "=== Copying backup to $BackupDir ===" -ForegroundColor Cyan
docker cp "erp-db:$inContainer" (Join-Path $BackupDir $bakName)
if ($LASTEXITCODE -ne 0) { throw "Could not copy the backup to this server" }
docker exec -u 0 erp-db rm -f $inContainer

$cutoff = (Get-Date).AddDays(-$RetainDays)
# Never delete a backup that release-history.txt points to (it is the data of a specific version).
$keep = @()
$hist = Join-Path $Root "release-history.txt"
if (Test-Path $hist) { $keep = Get-Content $hist | ForEach-Object { if ($_ -match 'backup=(.*)$') { $Matches[1].Trim() } } }
Get-ChildItem $BackupDir -Filter "*.bak" | Where-Object { $_.Name -match '^(ERP_DB_backup_|MiniErp_).*\.bak$' } |
    Where-Object { $_.LastWriteTime -lt $cutoff -and ($keep -notcontains $_.FullName) } |
    ForEach-Object { Remove-Item $_.FullName -Force }

$drive = (Get-PSDrive -Name $BackupDir.Substring(0,1).ToUpper()).Free
$freeGB = [math]::Round($drive / 1GB, 1)
if ($freeGB -lt 15) { Write-Warning "Low disk space: only $freeGB GB free." }
else { Write-Host "Free disk space: $freeGB GB" -ForegroundColor Green }

Write-Host ""
Write-Host "BACKUP DONE: $(Join-Path $BackupDir $bakName) ($([math]::Round((Get-Item (Join-Path $BackupDir $bakName)).Length/1MB,1)) MB)" -ForegroundColor Green
