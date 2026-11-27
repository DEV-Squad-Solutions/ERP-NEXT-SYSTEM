<#
 SAFE, READ-ONLY backup of an OLD MiniErp SQL Server container (default: minierp-db) to a folder on this PC.
 - Does not stop, restart, change or delete anything. Creates COPY_ONLY compressed backups (they do not affect the database or its backup chain).
 - The SA password is taken from the container's own environment inside the container. It is never typed, shown or logged.
 - For every user database: BACKUP -> RESTORE VERIFYONLY (checksum) -> docker cp to this PC -> size check -> SHA256.
 Example: powershell -ExecutionPolicy Bypass -File .\minierp-backup.ps1
#>
param(
    [string]$Container = "minierp-db",
    [string]$OutDir = "D:\minierp_backup",
    [switch]$Embedded   # used by the installer: quieter step lines
)
$ErrorActionPreference = "Continue"
function Fail($m) { Write-Host ""; Write-Host "FAIL: $m" -ForegroundColor Red; Write-Host "Nothing was changed or deleted." -ForegroundColor Yellow; exit 1 }
function Hdr($t) { if ($Embedded) { Write-Host ("      ..   " + ($t -replace '^\[\d/\d\]\s*', "")) -ForegroundColor DarkGray } else { Write-Host $t -ForegroundColor Cyan } }
function Ok($m) { Write-Host "  OK   $m" -ForegroundColor Green }

Write-Host ""
Write-Host "=== Backup of old SQL container '$Container' (read-only, COPY_ONLY) ===" -ForegroundColor Cyan
docker version --format "{{.Server.Version}}" *> $null
if ($LASTEXITCODE -ne 0) { Fail "Docker is not running." }
$running = docker ps --filter "name=^$Container$" --filter "status=running" -q
if (-not $running) { Fail "Container $Container is not running. Start only that container (docker start $Container), wait 1 minute, then run this again." }
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

# helper script written with LF endings, copied INTO the container's /tmp (not into the data volume)
$sh = @'
#!/bin/bash
S=$(ls /opt/mssql-tools18/bin/sqlcmd /opt/mssql-tools/bin/sqlcmd 2>/dev/null | head -1)
P="${MSSQL_SA_PASSWORD:-$SA_PASSWORD}"
if [ -z "$S" ]; then echo "ERR_NO_SQLCMD"; exit 2; fi
if [ -z "$P" ]; then echo "ERR_NO_PASSWORD_ENV"; exit 3; fi
case "$1" in
  list)   "$S" -S localhost -U sa -P "$P" -C -b -h -1 -W -Q "SET NOCOUNT ON; SELECT name FROM sys.databases WHERE database_id > 4 AND state_desc = 'ONLINE'" ;;
  backup) "$S" -S localhost -U sa -P "$P" -C -b -Q "BACKUP DATABASE [$2] TO DISK = N'/tmp/$2.bak' WITH COPY_ONLY, COMPRESSION, CHECKSUM, INIT, STATS = 25" ;;
  verify) "$S" -S localhost -U sa -P "$P" -C -b -Q "RESTORE VERIFYONLY FROM DISK = N'/tmp/$2.bak' WITH CHECKSUM" ;;
  size)   stat -c %s "/tmp/$2.bak" ;;
  clean)  rm -f "/tmp/$2.bak" ;;
esac
'@
$tmp = Join-Path $env:TEMP "erp_mb.sh"
[IO.File]::WriteAllText($tmp, ($sh -replace "`r", ""), (New-Object Text.UTF8Encoding($false)))
docker cp $tmp "${Container}:/tmp/erp_mb.sh"
if ($LASTEXITCODE -ne 0) { Fail "Could not copy the helper script into the container." }
Remove-Item $tmp -Force -ErrorAction SilentlyContinue

Hdr "[1/4] Finding databases"
$out = docker exec $Container bash /tmp/erp_mb.sh list 2>&1 | Out-String
if ($out -match 'ERR_NO_SQLCMD') { Fail "sqlcmd was not found in the container. Run: docker exec $Container bash -c 'ls /opt/mssql-tools*/bin' and send the output." }
if ($out -match 'ERR_NO_PASSWORD_ENV') { Fail "The container has no MSSQL_SA_PASSWORD or SA_PASSWORD variable. Run (names only, no values): docker inspect $Container --format '{{range .Config.Env}}{{println .}}{{end}}' | ForEach-Object { (`$_ -split '=')[0] }  and send the names." }
$dbs = @($out -split "`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ -match '^[A-Za-z0-9_\-\. ]+$' -and $_ -ne "" })
if ($dbs.Count -eq 0) { Write-Host $out; Fail "No user database found, or the login failed (see the text above)." }
Ok ("Databases: " + ($dbs -join ", "))

$stamp = Get-Date -Format "yyyyMMdd_HHmm"
$report = @()
foreach ($db in $dbs) {
    Write-Host ""
    Write-Host "=== $db ===" -ForegroundColor Cyan
    Hdr "[2/4] Backup (COPY_ONLY, compressed, checksum)"
    docker exec $Container bash /tmp/erp_mb.sh backup $db
    if ($LASTEXITCODE -ne 0) { Fail "Backup of $db failed." }
    Hdr "[3/4] Verify inside the container (RESTORE VERIFYONLY)"
    $v = docker exec $Container bash /tmp/erp_mb.sh verify $db 2>&1 | Out-String
    Write-Host $v.Trim()
    if ($LASTEXITCODE -ne 0 -or $v -notmatch 'valid') { Fail "Verification of $db did not report a valid backup." }
    Ok "Backup is valid"
    Hdr "[4/4] Copy to this PC and check size"
    $dest = Join-Path $OutDir ("{0}_{1}.bak" -f $db, $stamp)
    docker cp "${Container}:/tmp/$db.bak" $dest
    if ($LASTEXITCODE -ne 0) { Fail "Copy of $db to $dest failed." }
    $inSize = [int64](docker exec $Container bash /tmp/erp_mb.sh size $db | Out-String).Trim()
    $hostSize = (Get-Item $dest).Length
    if ($inSize -ne $hostSize -or $hostSize -lt 100KB) { Fail "Size mismatch or too small for $db (container $inSize bytes, PC $hostSize bytes)." }
    $hash = (Get-FileHash $dest -Algorithm SHA256).Hash
    Ok ("{0}  {1} MB  SHA256 {2}" -f $dest, [math]::Round($hostSize / 1MB, 1), $hash)
    $report += ("{0}  {1} bytes  sha256={2}" -f $dest, $hostSize, $hash)
    docker exec $Container bash /tmp/erp_mb.sh clean $db
}
docker exec $Container rm -f /tmp/erp_mb.sh
$rf = Join-Path $OutDir ("backup-report_{0}.txt" -f $stamp)
$report | Set-Content -Path $rf -Encoding UTF8
Write-Host ""
Write-Host "DONE. Verified backups are in $OutDir" -ForegroundColor Green
Write-Host "Report: $rf" -ForegroundColor Green
Write-Host "Copy this folder to a second place (USB / another disk) too." -ForegroundColor Yellow
exit 0
