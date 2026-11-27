<#
 Backs up the ERP database (inside container erp-db) to a folder on this server.
 Keeps the last N days (backups listed in release-history.txt are always kept). Warns when disk space is low.
 Example: powershell -ExecutionPolicy Bypass -File .\backup.ps1
#>
[CmdletBinding()]
param(
    [string]$BackupDir = "C:\ERP_backup",
    [int]$RetainDays = 14,
    [switch]$Gui, [string]$IoDir = "", [string]$Lang = "en"
)
$ErrorActionPreference = "Stop"
$Root = $(if (Test-Path (Join-Path $PSScriptRoot "docker-compose.yml")) { $PSScriptRoot } else { Split-Path $PSScriptRoot -Parent })   # folder with .env, docker-compose.yml, images, logs
$envFile = Join-Path $Root ".env"
if (-not (Test-Path $envFile)) { throw ".env file not found next to the script." }

$saPass = $null
[IO.File]::ReadAllLines($envFile, [Text.Encoding]::UTF8) | ForEach-Object {
    if ($_ -match '^\s*SQL_SA_PASSWORD\s*=\s*(.+?)\s*$') { $saPass = $Matches[1] }
}
. (Join-Path $PSScriptRoot "sql-cred.ps1")
$sqlUser = "sa"   # replaced by a typed login only if the .env password does not work (asked in a masked dialog, never saved)

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

function Test-SqlLogin([string]$u, [string]$p) {
    if (-not $p) { return $false }
    $env:SQLCMDPASSWORD = $p
    $prevEap = $ErrorActionPreference; $ErrorActionPreference = "Continue"
    docker exec -e SQLCMDPASSWORD erp-db $sqlcmd -S localhost -U $u -C -b -Q "SELECT 1" 2>&1 | Out-Null
    $okL = ($LASTEXITCODE -eq 0); $ErrorActionPreference = $prevEap; Remove-Item Env:SQLCMDPASSWORD -ErrorAction SilentlyContinue
    return $okL
}
Write-Host "=== Checking the database login ===" -ForegroundColor Cyan
if (-not (Test-SqlLogin $sqlUser $saPass)) {
    Write-Host "  The password in .env does not open the database. Looking for an old .env, then asking if needed." -ForegroundColor Yellow
    $got = $false
    $auto = Try-AutoLogin { param($u, $p) Test-SqlLogin $u $p } $Root
    if ($auto) { $sqlUser = $auto.user; $saPass = $auto.pass; $got = $true }
    for ($t = 1; $t -le 3 -and -not $got; $t++) {
        $cr = Request-SqlCredential $(if ($t -eq 1) { "The backup cannot sign in to the database (erp-db). Enter the SQL username and password." } else { "Sign-in failed. Try again (try $t of 3)." }) $Gui.IsPresent $IoDir $Lang
        if (-not $cr) { throw "Cancelled: no SQL login was entered. Nothing was changed." }
        if (Test-SqlLogin $cr.user $cr.pass) { $sqlUser = $cr.user; $saPass = $cr.pass; $got = $true; Write-Host "  OK  Login works (not saved anywhere)." -ForegroundColor Green }
        else { Write-Host "  Login failed (try $t of 3)." -ForegroundColor Yellow }
    }
    if (-not $got) { throw "The SQL login did not work after 3 tries. Nothing was changed." }
}
Write-Host "=== BACKUP DATABASE (compressed) ===" -ForegroundColor Cyan
$query = "BACKUP DATABASE [MiniErp] TO DISK = N'$inContainer' WITH FORMAT, COMPRESSION, INIT, STATS=10"
$env:SQLCMDPASSWORD = $saPass
docker exec -e SQLCMDPASSWORD erp-db $sqlcmd -S localhost -U $sqlUser -C -b -Q $query
$bkRc = $LASTEXITCODE; Remove-Item Env:SQLCMDPASSWORD -ErrorAction SilentlyContinue
if ($bkRc -ne 0) { throw "BACKUP failed. Check the SQL login and its permissions." }

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
