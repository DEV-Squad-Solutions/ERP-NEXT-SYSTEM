<#
 USE THE EXISTING DATABASE (for example the old minierp-db) with ERP 2.0. No new database is created.
 1  Connect ERP 2.0 to the existing database (upgrade in place):
      checks the database (read-only), makes a VERIFIED backup, asks you to type UPGRADE EXISTING DATABASE,
      stops only the OLD app containers (not the database), then starts erp-api + erp-frontend on the old SQL container.
      erp-api upgrades the existing MiniErp database on startup (EF migrations, forward only, additive).
 2  Restore (rollback): restores MiniErp from a backup file (RESTORE ... REPLACE) after typing RESTORE DATABASE,
      after a pre-restore backup, and starts the old app containers again.
 3  Status (read-only).
 The old SQL container and its volume are never stopped, removed or deleted. The erp-db / erp_sql_data data is not used or touched.
 Passwords are never printed. The SA password is read from the old container's own settings; if that does not work you type it (hidden).
#>
param([string]$Mode = "menu", [string]$Container = "minierp-db", [string]$Db = "MiniErp", [string]$OutDir = "")
$ErrorActionPreference = "Continue"
$Root = $(if (Test-Path (Join-Path $PSScriptRoot "docker-compose.yml")) { $PSScriptRoot } else { Split-Path $PSScriptRoot -Parent })
$envFile = Join-Path $Root ".env"; $stateFile = Join-Path $Root "existing-db-state.json"
if (-not $OutDir) { $OutDir = $(if (Test-Path "D:\") { "D:\minierp_backup" } else { "C:\ERP_backup\old-sql-backup" }) }
$script:pw = ""; $script:helped = $false
function Say($t, $c = "Gray") { Write-Host $t -ForegroundColor $c }
function Stop-Now($m) { Say ""; Say "STOPPED: $m" Red; Say "Nothing was deleted. The database was not changed unless a line above says so." Yellow; if ($script:helped) { docker exec $Container rm -f /tmp/erp_rq.sh /tmp/erp_restore.bak 2>$null | Out-Null }; [void](Read-Host "Press Enter to close"); exit 1 }
function Read-Masked([string]$prompt) {
    $ss = Read-Host $prompt -AsSecureString
    $b = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($ss)
    try { return ([Runtime.InteropServices.Marshal]::PtrToStringBSTR($b)).Trim() } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b) }
}
function New-Secret([int]$len) {
    $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
    $rng = New-Object System.Security.Cryptography.RNGCryptoServiceProvider
    do { $bytes = New-Object byte[] $len; $rng.GetBytes($bytes); $s = -join ($bytes | ForEach-Object { $chars[$_ % $chars.Length] }) } until ($s -cmatch '[A-Z]' -and $s -cmatch '[a-z]' -and $s -match '[0-9]')
    return $s
}
function Set-EnvValue([string]$text, [string]$key, [string]$value) {
    $v = $value.Replace('$', '$$')
    if ($text -match "(?m)^[ \t]*$key[ \t]*=") { return [regex]::Replace($text, "(?m)^[ \t]*$key[ \t]*=.*$", { param($m) "$key=$v" }) }
    return $text.TrimEnd() + "`r`n$key=$v`r`n"
}
function Get-EnvVal([string]$key) {
    if (-not (Test-Path $envFile)) { return "" }
    $m = [regex]::Match([IO.File]::ReadAllText($envFile, [Text.Encoding]::UTF8), "(?m)^[ \t]*$key[ \t]*=[ \t]*([^\r\n]*)")
    if ($m.Success) { return $m.Groups[1].Value.Trim() } else { return "" }
}
function Save-Env([hashtable]$kv) {
    $stamp = Get-Date -Format "yyyyMMdd_HHmmss"; $t = ""
    if (Test-Path $envFile) { Copy-Item $envFile ($envFile + ".bak." + $stamp) -Force; $t = [IO.File]::ReadAllText($envFile, [Text.Encoding]::UTF8) }
    foreach ($k in $kv.Keys) { $t = Set-EnvValue $t $k $kv[$k] }
    [IO.File]::WriteAllText($envFile, $t, (New-Object Text.UTF8Encoding($false)))
    Say "  .env updated (previous one kept as .env.bak.$stamp). Values are not shown." Green
}
function Put-Helper {
    $sh = "#!/bin/bash`n/opt/mssql-tools18/bin/sqlcmd -C -S localhost -U sa -P `"`$MSSQL_SA_PASSWORD`" -h -1 -W -b -Q `"`$1`"`n"
    $tmp = Join-Path $env:TEMP "erp_rq.sh"
    [IO.File]::WriteAllText($tmp, $sh, (New-Object Text.UTF8Encoding($false)))
    docker cp $tmp "${Container}:/tmp/erp_rq.sh" | Out-Null; Remove-Item $tmp -Force -ErrorAction SilentlyContinue
    $script:helped = $true
}
function Run-Sql([string]$query) { return (docker exec -e "MSSQL_SA_PASSWORD=$($script:pw)" $Container bash /tmp/erp_rq.sh $query 2>&1 | Out-String) }
function Connect-Sql {
    docker version --format "{{.Server.Version}}" *> $null
    if ($LASTEXITCODE -ne 0) { Stop-Now "Docker is not running. Start Docker Desktop and run this again." }
    if ($Db -notmatch '^[A-Za-z0-9_]+$') { Stop-Now "Unsafe database name." }
    $run = docker ps --filter "name=^$Container$" --filter "status=running" -q
    if (-not $run) { Stop-Now "Container $Container is not running. Start only that container (docker start $Container), wait 1 minute, run this again." }
    Put-Helper
    $envs = docker inspect -f "{{range .Config.Env}}{{println .}}{{end}}" $Container 2>$null | Out-String
    $m = [regex]::Match($envs, '(?m)^(?:MSSQL_SA_PASSWORD|SA_PASSWORD)=(.+)$')
    if ($m.Success) { $script:pw = $m.Groups[1].Value.Trim(); $null = Run-Sql "SELECT 1"; if ($LASTEXITCODE -eq 0) { Say "  OK  Logged in with the container's own SA setting (not shown)." Green; return } }
    Say "  The container's own setting did not work. Type the SA password of $Container (hidden)." Yellow
    for ($t = 1; $t -le 3; $t++) {
        $script:pw = Read-Masked "  SA password of $Container"
        if (-not $script:pw) { continue }
        $null = Run-Sql "SELECT 1"; if ($LASTEXITCODE -eq 0) { Say "  OK  Login works." Green; return }
        Say "  Login failed (try $t of 3)." Yellow
    }
    Stop-Now "Could not log in to $Container. Nothing was changed."
}
function Get-Known {
    $f = Join-Path $PSScriptRoot "compare-db.ps1"
    if (-not (Test-Path $f)) { return @() }
    return @([regex]::Matches([IO.File]::ReadAllText($f, [Text.Encoding]::UTF8), '"(\d{14}_[^"]+)"') | ForEach-Object { $_.Groups[1].Value })
}
function Get-Facts {
    $q = "SET NOCOUNT ON; IF DB_ID('$Db') IS NULL SELECT 'NODB' ELSE EXEC('USE [$Db]; SELECT ''TABLES|'' + CAST(COUNT(*) AS varchar(20)) FROM sys.tables; SELECT ''ROWS|'' + CAST(ISNULL(SUM(p.rows),0) AS varchar(30)) FROM sys.partitions p JOIN sys.tables t ON t.object_id = p.object_id WHERE p.index_id IN (0,1); IF OBJECT_ID(''dbo.__EFMigrationsHistory'') IS NOT NULL SELECT ''MIG|'' + MigrationId FROM dbo.__EFMigrationsHistory ORDER BY MigrationId ELSE SELECT ''NOHISTORY''')"
    $o = Run-Sql $q
    $f = @{ nodb = $false; tables = 0; rows = 0; mig = @(); nohist = $false; raw = $o }
    foreach ($l in ($o -split "`n")) {
        $l = $l.Trim()
        if ($l -eq "NODB") { $f.nodb = $true } elseif ($l -like "TABLES|*") { $f.tables = [int64]$l.Substring(7) } elseif ($l -like "ROWS|*") { $f.rows = [int64]$l.Substring(5) }
        elseif ($l -like "MIG|*") { $f.mig += $l.Substring(4) } elseif ($l -eq "NOHISTORY") { $f.nohist = $true }
    }
    return $f
}
function Find-Newest-Bak([datetime]$since) {
    $c = Get-ChildItem -Path $OutDir -Filter "${Db}_*.bak" -File -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -ge $since } | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    return $c
}
function Run-Backup([string]$dir) {
    $since = (Get-Date).AddSeconds(-5)
    & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "minierp-backup.ps1") -Container $Container -OutDir $dir
    if ($LASTEXITCODE -ne 0) { return $null }
    $c = Get-ChildItem -Path $dir -Filter "${Db}_*.bak" -File -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -ge $since } | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    return $c
}
function Test-PortFree([int]$port) { try { $l = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Any, $port); $l.Start(); $l.Stop(); return $true } catch { return $false } }

function Connect-Existing {
    Say ""; Say "=== Connect ERP 2.0 to the EXISTING database ($Container / $Db) ===" Cyan
    Say "[1/8] Checking the old database container (read-only)" Cyan
    Connect-Sql
    $img = docker inspect -f "{{.Config.Image}}" $Container 2>$null
    if ($img -notmatch 'mssql') { Say "  Warning: $Container does not look like a SQL Server image ($img)." Yellow }
    $nets = @(docker inspect -f "{{range `$k, `$v := .NetworkSettings.Networks}}{{`$k}}{{println}}{{end}}" $Container 2>$null | Where-Object { $_ -and $_ -notin @("bridge", "host", "none") })
    if ($nets.Count -eq 0) { Stop-Now "$Container is only on the default Docker network, so other containers cannot reach it by name. Tell your developer (nothing was changed)." }
    $net = $nets[0]; Say "  Docker network: $net" DarkGray
    Say "[2/8] Reading the database: tables, rows and EF migrations" Cyan
    $f = Get-Facts
    if ($f.nodb) { Stop-Now "No database named $Db in $Container." }
    if ($f.nohist) { Stop-Now "$Db has no EF migration history, so ERP 2.0 cannot upgrade it in place. Nothing was changed. Send this window to your developer." }
    $known = Get-Known
    $unknown = @($f.mig | Where-Object { $known -notcontains $_ })
    $todo = @($known | Where-Object { $f.mig -notcontains $_ })
    Say ("  {0}: {1} tables, {2} rows. Migrations applied {3}, this version knows {4}, to apply on start: {5}" -f $Db, $f.tables, $f.rows, $f.mig.Count, $known.Count, $todo.Count) White
    if ($known.Count -eq 0) { Stop-Now "compare-db.ps1 is missing next to this script, the migration check cannot run." }
    if ($unknown.Count -gt 0) { Stop-Now ("$Db has {0} migrations that ERP 2.0 does not know ({1}). It cannot be upgraded in place. Send this window to your developer." -f $unknown.Count, (($unknown | Select-Object -First 3) -join ", ")) }
    $pwCheck = $script:pw
    if ($pwCheck -match '[;"''\s]') { Stop-Now "The SA password contains a character (; quote or space) that cannot be put into the API connection string. Change it first with the Recover database tool, option 4 is for erp-db only. Send this window to your developer." }
    Say "[3/8] Other containers on that network (the old app)" Cyan
    $apps = @(docker ps --filter "network=$net" --format "{{.Names}}|{{.Image}}" | Where-Object { $_ -and ($_ -split '\|')[0] -ne $Container -and ($_ -split '\|')[0] -notmatch '^erp-' })
    foreach ($a in $apps) { Say ("  will be STOPPED (not removed): " + ($a -replace '\|', "   image ")) DarkGray }
    if ($apps.Count -eq 0) { Say "  none running" DarkGray }
    Say "[4/8] Verified backup of the existing database (COPY_ONLY, checksum, copied to this PC)" Cyan
    $bak = Run-Backup $OutDir
    if (-not $bak) { Stop-Now "The backup did not finish or could not be verified. The upgrade was NOT started." }
    Say ("  Backup file: {0}  ({1} MB)" -f $bak.FullName, [int]($bak.Length / 1MB)) Green
    Say "  Copy this file to a second disk or USB too." Yellow
    Say ""
    Say "  WHAT WILL HAPPEN:" White
    Say "   - $Container and its data are kept. ERP 2.0 (erp-api) connects to it and UPGRADES the $Db database in place (forward only)."
    Say "   - The old app containers above are stopped (not deleted). The old app may not work on the upgraded database."
    Say "   - To go back: run this tool, option 2 (Restore) with the backup file above."
    $c = Read-Host "  Type exactly UPGRADE EXISTING DATABASE to continue (anything else cancels)"
    if ($c -cne "UPGRADE EXISTING DATABASE") { Stop-Now "Cancelled by you. Nothing was changed." }
    Say "[5/8] Stopping the old app containers" Cyan
    $stopped = @()
    foreach ($a in $apps) { $n = ($a -split '\|')[0]; docker stop $n | Out-Null; if ($LASTEXITCODE -eq 0) { $stopped += $n; Say "  stopped $n" DarkGray } }
    $state = @{ container = $Container; db = $Db; network = $net; backup = $bak.FullName; backupDir = $OutDir; started = (Get-Date -Format s); stopped = $stopped }
    [IO.File]::WriteAllText($stateFile, ($state | ConvertTo-Json), (New-Object Text.UTF8Encoding($false)))
    Say "[6/8] Writing .env (EXISTING_DB_* values; the erp-db settings are not touched)" Cyan
    $kv = @{ EXISTING_DB_HOST = $Container; EXISTING_DB_NAME = $Db; EXISTING_DB_NETWORK = $net; EXISTING_DB_PASSWORD = $script:pw }
    if (-not (Get-EnvVal "JWT_SIGNING_KEY")) { $kv["JWT_SIGNING_KEY"] = (New-Secret 48); Say "  JWT_SIGNING_KEY was empty: generated (users log in again)." DarkGray }
    Save-Env $kv
    Say "[7/8] Images" Cyan
    $ver = Get-EnvVal "ERP_VERSION"
    $tar = @(Get-ChildItem -Path $Root, (Join-Path $Root "images") -Filter "erp-images-*.tar" -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending) | Select-Object -First 1
    if ($tar -and $tar.Name -match 'erp-images-(.+)\.tar$') { $tv = $Matches[1]; docker image inspect "erp-api:$tv" *> $null; if ($LASTEXITCODE -ne 0) { Say "  Loading $($tar.Name) ..." DarkGray; docker load -i $tar.FullName | Out-Null }; $ver = $tv }
    if (-not $ver) { $ver = "2.0" }
    docker image inspect "erp-api:$ver" *> $null
    if ($LASTEXITCODE -ne 0) { Stop-Now "Image erp-api:$ver is not on this PC and no erp-images-*.tar was found. The database is NOT upgraded yet (backup exists)." }
    Save-Env @{ ERP_VERSION = $ver }
    $env:ERP_VERSION = $ver
    foreach ($pt in @(@("ERP_API_PORT", 8080), @("ERP_WEB_PORT", 80))) { $v = Get-EnvVal $pt[0]; $p = $(if ($v) { [int]$v } else { $pt[1] }); $own = docker ps --filter "name=^erp-" --filter "publish=$p" -q; if (-not $own -and -not (Test-PortFree $p)) { Stop-Now ("Port {0} is in use by something else. Set {1}= another port in .env or stop that program, then run this again. The database is NOT upgraded yet." -f $p, $pt[0]) } }
    Say "[8/8] Starting erp-api and erp-frontend on the existing database (the migrations run now)" Cyan
    Push-Location $Root
    docker compose -p erp -f docker-compose.existing.yml up -d 2>&1 | ForEach-Object { Say "  $_" DarkGray }
    Pop-Location
    $healthy = $false
    for ($i = 0; $i -lt 60; $i++) { $h = docker inspect -f "{{.State.Health.Status}}" erp-api 2>$null; if ($h -eq "healthy") { $healthy = $true; break }; Start-Sleep -Seconds 5 }
    if ($healthy) {
        $f2 = Get-Facts
        Say ("  OK  erp-api is healthy. {0}: migrations applied {1} (was {2}), rows {3}." -f $Db, $f2.mig.Count, $f.mig.Count, $f2.rows) Green
        $web = Get-EnvVal "ERP_WEB_PORT"; if (-not $web) { $web = "80" }
        Say ("  DONE. Open http://localhost{0}" -f $(if ($web -ne "80") { ":$web" } else { "" })) Green
        Say "  To go back to the state before the upgrade: run this tool, option 2." Green
    } else {
        Say "  erp-api is not healthy yet. Last 40 lines of its log (no passwords):" Yellow
        docker logs --tail 40 erp-api 2>&1 | ForEach-Object { Say "  | $_" DarkGray }
        Say "  You can go back with option 2 (Restore) using $($bak.FullName)." Yellow
    }
}
function Restore-Db {
    Say ""; Say "=== Restore the database from a backup file (rollback) ===" Cyan
    $st = $null; if (Test-Path $stateFile) { try { $st = Get-Content $stateFile -Raw | ConvertFrom-Json } catch { } }
    if ($st) { $script:Container = [string]$st.container; $script:Db = [string]$st.db; if ($st.backupDir) { $script:OutDir = [string]$st.backupDir } }
    Connect-Sql
    $files = @(Get-ChildItem -Path $OutDir -Filter "${Db}_*.bak" -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 6)
    if ($st -and $st.backup -and (Test-Path ([string]$st.backup))) { $files = @(Get-Item ([string]$st.backup)) + @($files | Where-Object { $_.FullName -ne [string]$st.backup }) }
    if ($files.Count -eq 0) { Stop-Now "No $Db backup file found in $OutDir." }
    for ($i = 0; $i -lt $files.Count; $i++) { Say ("  {0}  {1}   {2} MB   {3}" -f ($i + 1), $files[$i].Name, [int]($files[$i].Length / 1MB), $files[$i].LastWriteTime) }
    $pick = (Read-Host "  Number of the backup to restore (1 = the one made before the upgrade, anything else cancels)").Trim()
    if ($pick -notmatch '^\d+$' -or [int]$pick -lt 1 -or [int]$pick -gt $files.Count) { Stop-Now "Cancelled. Nothing was changed." }
    $bf = $files[[int]$pick - 1]
    Say "[1/6] Checking the backup file (RESTORE VERIFYONLY with checksum)" Cyan
    docker cp $bf.FullName "${Container}:/tmp/erp_restore.bak" | Out-Null
    $v = Run-Sql "RESTORE VERIFYONLY FROM DISK = N'/tmp/erp_restore.bak' WITH CHECKSUM"
    if ($LASTEXITCODE -ne 0 -or $v -notmatch 'valid') { Say $v DarkGray; Stop-Now "The backup file did not verify. Nothing was changed." }
    Say "  OK  The backup file is valid." Green
    Say ""; Say "  This REPLACES the current $Db database in $Container with the contents of $($bf.Name)." White
    Say "  Everything entered after that backup is lost from the live database (a pre-restore backup is made first)." White
    $c = Read-Host "  Type exactly RESTORE DATABASE to continue (anything else cancels)"
    if ($c -cne "RESTORE DATABASE") { Stop-Now "Cancelled by you. Nothing was changed." }
    Say "[2/6] Pre-restore backup of the CURRENT database" Cyan
    $pre = Run-Backup (Join-Path $OutDir ("pre-restore_" + (Get-Date -Format "yyyyMMdd_HHmmss")))
    if (-not $pre) { Stop-Now "The pre-restore backup failed. The restore was NOT started." }
    Say ("  Saved: " + $pre.FullName) Green
    Say "[3/6] Stopping erp-api and erp-frontend (docker stop only)" Cyan
    foreach ($n in @("erp-frontend", "erp-api")) { if (docker ps --filter "name=^$n$" --filter "status=running" -q) { docker stop $n | Out-Null; Say "  stopped $n" DarkGray } }
    Say "[4/6] Restoring (single-user during the restore, back to multi-user after)" Cyan
    $r = Run-Sql "ALTER DATABASE [$Db] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; RESTORE DATABASE [$Db] FROM DISK = N'/tmp/erp_restore.bak' WITH REPLACE, RECOVERY, CHECKSUM, STATS = 20; ALTER DATABASE [$Db] SET MULTI_USER"
    $ok = ($LASTEXITCODE -eq 0)
    if (-not $ok) { $null = Run-Sql "IF DB_ID('$Db') IS NOT NULL ALTER DATABASE [$Db] SET MULTI_USER"; Say $r DarkGray; Stop-Now "The restore failed (message above has no passwords). The pre-restore backup is $($pre.FullName). Send this window to your developer." }
    Say "  OK  Restore finished." Green
    Say "[5/6] Checking the restored database" Cyan
    $f = Get-Facts
    Say ("  {0}: {1} tables, {2} rows, migrations applied {3}" -f $Db, $f.tables, $f.rows, $f.mig.Count) White
    docker exec $Container rm -f /tmp/erp_restore.bak | Out-Null
    Say "[6/6] Starting the old app containers again" Cyan
    if ($st -and $st.stopped) { foreach ($n in @($st.stopped)) { docker start ([string]$n) | Out-Null; Say "  started $n" DarkGray } } else { Say "  (no list of stopped containers saved: start them from Docker Desktop if needed)" Yellow }
    Say ""; Say "  DONE. erp-api and erp-frontend stay stopped on purpose. Run option 1 again when you want to retry the upgrade." Green
}
function Show-Status {
    Say ""; Say "=== Status (read-only) ===" Cyan
    if (Test-Path $stateFile) { try { $st = Get-Content $stateFile -Raw | ConvertFrom-Json; Say ("  Existing-database mode: container {0}, database {1}, started {2}" -f $st.container, $st.db, $st.started); Say ("  Backup before upgrade: " + $st.backup) } catch { } } else { Say "  Existing-database mode has not been used on this PC yet." }
    foreach ($n in @($Container, "erp-api", "erp-frontend", "erp-db")) { $s = docker inspect -f "{{.State.Status}}" $n 2>$null; Say ("  {0,-14} {1}" -f $n, $(if ($s) { $s } else { "not found" })) }
}
if ($Mode -eq "menu") {
    Say ""; Say "=== Use the EXISTING database with ERP 2.0 (nothing new is created) ===" Cyan
    Say "  1  Connect ERP 2.0 to the existing database (verified backup first, then upgrade in place)"
    Say "  2  Restore the database from a backup file (rollback)"
    Say "  3  Status (read-only)"
    Say "  Q  Quit"
    $a = (Read-Host "Choose").Trim().ToUpper()
    $Mode = switch ($a) { "1" { "connect" } "2" { "restore" } "3" { "status" } default { "quit" } }
}
switch ($Mode) { "connect" { Connect-Existing } "restore" { Restore-Db } "status" { Show-Status } default { Say "Nothing done." } }
if ($script:helped) { docker exec $Container rm -f /tmp/erp_rq.sh 2>$null | Out-Null }
Say ""; Say "Finished." Green
[void](Read-Host "Press Enter to close")
