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
param([string]$Mode = "menu", [string]$Container = "minierp-db", [string]$Db = "MiniErp", [string]$OutDir = "", [switch]$Gui, [string]$IoDir = "", [string]$BackupDir = "", [string]$Lang = "en")
$ErrorActionPreference = "Continue"
$Root = $(if (Test-Path (Join-Path $PSScriptRoot "docker-compose.yml")) { $PSScriptRoot } else { Split-Path $PSScriptRoot -Parent })
$envFile = Join-Path $Root ".env"; $stateFile = Join-Path $Root "existing-db-state.json"
if (-not $OutDir) { $OutDir = $(if (Test-Path "D:\") { "D:\minierp_backup" } else { "C:\ERP_backup\old-sql-backup" }) }
$script:pw = ""; $script:helped = $false; $script:summary = ""; $script:askN = 0; $script:dryActive = $false
if ($Gui) { [Console]::OutputEncoding = [Text.Encoding]::UTF8 }
function T([string]$en, [string]$ar) { if ($Lang -eq "ar") { return $ar } else { return $en } }
function Ask([string]$text) {
    # GUI: the installer window shows the dialog (same protocol as install-or-update.ps1). Console: Read-Host.
    if (-not $Gui) { return (Read-Host $text) }
    $script:askN++; $id = "p$($script:askN)"
    Write-Host "@@PROMPT|$id|$text"
    $f = Join-Path $IoDir "answer-$id.txt"
    while (-not (Test-Path $f)) { Start-Sleep -Milliseconds 300 }
    Start-Sleep -Milliseconds 200
    $a = [IO.File]::ReadAllText($f).Trim(); Remove-Item $f -Force -ErrorAction SilentlyContinue
    return $a
}
function Ask-Phrase([string]$phrase, [string]$en, [string]$ar) {
    if ($Gui) { return (Ask ((T $en $ar) + "  " + (T "Type exactly: " "اكتب بالظبط: ") + $phrase)) }
    return (Read-Host "  Type exactly $phrase to continue (anything else cancels)")
}
function Say($t, $c = "Gray") { Write-Host $t -ForegroundColor $c }
function Stop-Now($m) { if ($script:dryActive) { Cleanup-Dry }; Say ""; Say "STOPPED: $m" Red; Say "Nothing was deleted. The database was not changed unless a line above says so." Yellow; if ($script:helped) { docker exec -u 0 $Container rm -f /tmp/erp_rq.sh /tmp/erp_restore.bak 2>$null | Out-Null }; if ($Gui) { Write-Host "  FAIL $m" } else { [void](Read-Host "Press Enter to close") }; exit 1 }
function Read-Masked([string]$prompt) {
    if ($Gui) { return (Ask ($prompt + " [[secret:nogen]]")) }
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
    $c = Get-ChildItem -Path $OutDir -Filter "*.bak" -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -match ('^(ERP_DB_backup_old-' + $Db + '_|' + $Db + '_).*\.bak$') } | Where-Object { $_.LastWriteTime -ge $since } | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    return $c
}
function Run-Backup([string]$dir) {
    $since = (Get-Date).AddSeconds(-5)
    & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "minierp-backup.ps1") -Container $Container -OutDir $dir
    if ($LASTEXITCODE -ne 0) { return $null }
    $c = Get-ChildItem -Path $dir -Filter "*.bak" -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -match ('^(ERP_DB_backup_old-' + $Db + '_|' + $Db + '_).*\.bak$') } | Where-Object { $_.LastWriteTime -ge $since } | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    return $c
}
function Test-PortFree([int]$port) { try { $l = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Any, $port); $l.Start(); $l.Stop(); return $true } catch { return $false } }

function Connect-Existing {
    Say ""; Say "=== Connect ERP 2.0 to the EXISTING database ($Container / $Db) ===" Cyan
    Need-Images
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
    $c = Ask-Phrase "UPGRADE EXISTING DATABASE" "The database will be upgraded IN PLACE after the verified backup. The old app containers will be stopped (not deleted). To go back, use Restore." "الداتابيز هتتـرقّى في مكانها بعد النسخة الاحتياطية المتحقق منها. حاويات التطبيق القديم هتتوقف (مش هتتمسح). للرجوع استخدم الاسترجاع."
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
        Say "  To go back to the state before the upgrade: use Restore." Green
        $script:summary = ("erp-api healthy. Open http://localhost{0}. To go back: Existing DB > Restore. Backup: {1}" -f $(if ($web -ne "80") { ":$web" } else { "" }), $bak.FullName)
    } else {
        Say "  erp-api is not healthy yet. Last 40 lines of its log (no passwords):" Yellow
        docker logs --tail 40 erp-api 2>&1 | ForEach-Object { Say "  | $_" DarkGray }
        Say "  You can go back with option 2 (Restore) using $($bak.FullName)." Yellow
        if ($Gui) { Write-Host "  FAIL erp-api did not become healthy. See the log above. Your backup: $($bak.FullName). You can restore it from Existing DB > Restore."; exit 1 }
    }
}
function Restore-Db {
    Say ""; Say "=== Restore the database from a backup file (rollback) ===" Cyan
    $st = $null; if (Test-Path $stateFile) { try { $st = Get-Content $stateFile -Raw | ConvertFrom-Json } catch { } }
    if ($st) { $script:Container = [string]$st.container; $script:Db = [string]$st.db; if ($st.backupDir) { $script:OutDir = [string]$st.backupDir } }
    Connect-Sql
    $files = @(Get-ChildItem -Path $OutDir -Filter "*.bak" -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -match ('^(ERP_DB_backup_old-' + $Db + '_|' + $Db + '_).*\.bak$') } | Sort-Object LastWriteTime -Descending | Select-Object -First 6)
    if ($st -and $st.backup -and (Test-Path ([string]$st.backup))) { $files = @(Get-Item ([string]$st.backup)) + @($files | Where-Object { $_.FullName -ne [string]$st.backup }) }
    if ($files.Count -eq 0) { Stop-Now "No $Db backup file found in $OutDir." }
    for ($i = 0; $i -lt $files.Count; $i++) { Say ("  {0}  {1}   {2} MB   {3}" -f ($i + 1), $files[$i].Name, [int]($files[$i].Length / 1MB), $files[$i].LastWriteTime) }
    if ($Gui) {
        $pairs = for ($i = 0; $i -lt $files.Count; $i++) { "{0}={1}  ({2} MB, {3:yyyy-MM-dd HH:mm})" -f ($i + 1), $files[$i].Name, [int]($files[$i].Length / 1MB), $files[$i].LastWriteTime }
        $pick = (Ask ((T "Choose the backup to restore (the first one is the one made before the upgrade)." "اختار النسخة اللي هترجّعها (الأولى هي اللي اتاخدت قبل الترقية).") + " [[choices:" + ($pairs -join ";") + "]]")).Trim()
    } else { $pick = (Read-Host "  Number of the backup to restore (1 = the one made before the upgrade, anything else cancels)").Trim() }
    if ($pick -notmatch '^\d+$' -or [int]$pick -lt 1 -or [int]$pick -gt $files.Count) { Stop-Now "Cancelled. Nothing was changed." }
    $bf = $files[[int]$pick - 1]
    Say "[1/6] Checking the backup file (RESTORE VERIFYONLY with checksum)" Cyan
    docker cp $bf.FullName "${Container}:/tmp/erp_restore.bak" | Out-Null
    $v = Run-Sql "RESTORE VERIFYONLY FROM DISK = N'/tmp/erp_restore.bak' WITH CHECKSUM"
    if ($LASTEXITCODE -ne 0 -or $v -notmatch 'valid') { Say $v DarkGray; Stop-Now "The backup file did not verify. Nothing was changed." }
    Say "  OK  The backup file is valid." Green
    Say ""; Say "  This REPLACES the current $Db database in $Container with the contents of $($bf.Name)." White
    Say "  Everything entered after that backup is lost from the live database (a pre-restore backup is made first)." White
    $c = Ask-Phrase "RESTORE DATABASE" "This REPLACES the current database with the chosen backup. Anything entered after that backup is lost (a pre-restore backup is made first)." "ده هيستبدل الداتابيز الحالية بالنسخة اللي اخترتها. أي حاجة اتسجلت بعدها هتضيع (بياخد نسخة قبل الاسترجاع الأول)."
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
    docker exec -u 0 $Container rm -f /tmp/erp_restore.bak | Out-Null
    Say "[6/6] Starting the old app containers again" Cyan
    if ($st -and $st.stopped) { foreach ($n in @($st.stopped)) { docker start ([string]$n) | Out-Null; Say "  started $n" DarkGray } } else { Say "  (no list of stopped containers saved: start them from Docker Desktop if needed)" Yellow }
    $script:summary = "Database restored from $($bf.Name). erp-api and erp-frontend stay stopped on purpose."
    Say ""; Say "  DONE. erp-api and erp-frontend stay stopped on purpose. Run option 1 again when you want to retry the upgrade." Green
}
function Need-Images {
    # Runs BEFORE anything is stopped or changed. Loads a tar if one exists; otherwise tells the GUI to offer "Get images".
    $v = Get-EnvVal "ERP_VERSION"
    $tar = @(Get-ChildItem -Path $Root, (Join-Path $Root "images") -Filter "erp-images-*.tar" -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending) | Select-Object -First 1
    if (-not $v -and $tar -and $tar.Name -match '^erp-images-(.+)\.tar$') { $v = $Matches[1] }
    if (-not $v) { $v = "2.0" }
    docker image inspect "erp-api:$v" *> $null; $a = ($LASTEXITCODE -eq 0)
    docker image inspect "erp-frontend:$v" *> $null; $b = ($LASTEXITCODE -eq 0)
    if ($a -and $b) { $env:ERP_VERSION = $v; return }
    if ($Gui) { Write-Host "@@FAIL|noimages" }
    Stop-Now "The ERP 2.0 images (erp-api:$v, erp-frontend:$v) are not on this PC yet. Nothing was changed. Run ERP Installer.bat and click the Get images step (or put erp-images-$v.tar in the deploy\images folder), then run this again."
}
function Cleanup-Dry {
    # removes ONLY the throwaway project erp-dryrun (its containers, its network, its own volume). Never anything else.
    Push-Location $Root
    $env:DRYRUN_SA_PASSWORD = "x"; $env:DRYRUN_JWT = "x"; $env:DRYRUN_API_PORT = "1"
    docker compose -p erp-dryrun -f docker-compose.dryrun.yml down -v --remove-orphans 2>&1 | ForEach-Object { Say "  $_" DarkGray }
    Remove-Item Env:DRYRUN_SA_PASSWORD, Env:DRYRUN_JWT, Env:DRYRUN_API_PORT -ErrorAction SilentlyContinue
    Pop-Location
    $script:dryActive = $false
    Say "  Test copy removed (only erp-dryrun-db, erp-dryrun-api and their own volume)." DarkGray
}
function Dry-Run {
    Say ""; Say "=== Test the upgrade on a COPY (nothing real is changed) ===" Cyan
    $realContainer = $Container
    Need-Images
    Say "[1/7] Choosing the backup to test" Cyan
    docker version --format "{{.Server.Version}}" *> $null
    if ($LASTEXITCODE -ne 0) { Stop-Now "Docker is not running. Start Docker Desktop and run this again." }
    if ($Db -notmatch '^[A-Za-z0-9_]+$') { Stop-Now "Unsafe database name." }
    $pat = '^(ERP_DB_backup_old-' + $Db + '_|' + $Db + '_).*\.bak$'
    $bf = Get-ChildItem -Path $OutDir -Filter "*.bak" -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -match $pat } | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($bf -and $bf.LastWriteTime -lt (Get-Date).AddDays(-1)) {
        $a = Ask-Choice-Dry ("The newest backup is from {0:yyyy-MM-dd HH:mm}. Test with it, or take a fresh verified backup of {1} first (read-only COPY_ONLY, the database is not changed)?" -f $bf.LastWriteTime, $realContainer) @(@("old", "Use the existing backup"), @("new", "Take a fresh verified backup first"))
        if ($a -eq "new") { $bf = $null } elseif ($a -ne "old") { Stop-Now "Cancelled. Nothing was changed." }
    }
    if (-not $bf) {
        Say "  Taking a fresh verified backup of $realContainer (COPY_ONLY, nothing is stopped or changed)." Yellow
        Connect-Sql
        $bf = Run-Backup $OutDir
        if (-not $bf) { Stop-Now "The backup failed or could not be verified. Nothing was changed." }
    }
    Say ("  Using {0}  ({1} MB, {2:yyyy-MM-dd HH:mm})" -f $bf.FullName, [int]($bf.Length / 1MB), $bf.LastWriteTime) White
    Say "[2/7] Checking images, ports and leftovers" Cyan
    $ver = Get-EnvVal "ERP_VERSION"; if (-not $ver) { $ver = "2.0" }
    Need-Images
    docker image inspect "mcr.microsoft.com/mssql/server:2022-latest" *> $null
    if ($LASTEXITCODE -ne 0) { Stop-Now "The SQL Server image mcr.microsoft.com/mssql/server:2022-latest is not on this PC (no internet needed if it is loaded). Nothing was changed." }
    $port = 0; foreach ($p in 18080..18099) { if (Test-PortFree $p) { $port = $p; break } }
    if ($port -eq 0) { Stop-Now "No free test port between 18080 and 18099." }
    $left = @(docker ps -a --filter "name=^erp-dryrun-" --format "{{.Names}}")
    if ($left.Count -gt 0) { Say "  Found leftovers of an earlier test ($($left -join ', ')). Removing them (they are only the test copy)." Yellow; $script:dryActive = $true; Cleanup-Dry }
    Say ("  OK  Images found, test port {0}. This test needs about 2 GB of free RAM and the backup size in disk space." -f $port) Green
    $sa = New-Secret 22; $jwt = New-Secret 48
    $env:DRYRUN_SA_PASSWORD = $sa; $env:DRYRUN_JWT = $jwt; $env:DRYRUN_API_PORT = "$port"
    $script:dryActive = $true
    Say "[3/7] Starting a throwaway SQL Server (own container erp-dryrun-db and own volume)" Cyan
    Push-Location $Root
    docker compose -p erp-dryrun -f docker-compose.dryrun.yml up -d db 2>&1 | ForEach-Object { Say "  $_" DarkGray }
    Pop-Location
    $script:Container = "erp-dryrun-db"; $script:pw = $sa; Put-Helper
    $up = $false
    for ($i = 0; $i -lt 60; $i++) { $null = Run-Sql "SELECT 1"; if ($LASTEXITCODE -eq 0) { $up = $true; break }; Start-Sleep -Seconds 3 }
    if (-not $up) { docker logs --tail 20 erp-dryrun-db 2>&1 | ForEach-Object { Say "  | $_" DarkGray }; Stop-Now "The throwaway SQL Server did not start. See the lines above. Nothing real was touched." }
    Say "  OK  Throwaway SQL Server is running." Green
    Say "[4/7] Restoring the backup into the throwaway server" Cyan
    docker cp $bf.FullName "erp-dryrun-db:/tmp/erp_restore.bak" | Out-Null
    $v = Run-Sql "RESTORE VERIFYONLY FROM DISK = N'/tmp/erp_restore.bak' WITH CHECKSUM"
    if ($LASTEXITCODE -ne 0 -or $v -notmatch 'valid') { Say $v DarkGray; Stop-Now "The backup file did not verify. Nothing real was touched." }
    $fl = Run-Sql "RESTORE FILELISTONLY FROM DISK = N'/tmp/erp_restore.bak'"
    $moves = @(); $n = 0
    foreach ($l in ($fl -split "`n")) {
        $t = @($l.Trim() -split '\s+')
        if ($t.Count -ge 3 -and $t[1] -like "/*" -and ($t[2] -eq "D" -or $t[2] -eq "L")) { $n++; $ext = [IO.Path]::GetExtension($t[1]); $moves += ("MOVE N'{0}' TO N'/var/opt/mssql/data/dryrun_{1}{2}'" -f $t[0], $n, $ext) }
    }
    if ($moves.Count -lt 2) { Say $fl DarkGray; Stop-Now "Could not read the file list of the backup. Nothing real was touched." }
    $r = Run-Sql ("RESTORE DATABASE [$Db] FROM DISK = N'/tmp/erp_restore.bak' WITH " + ($moves -join ", ") + ", REPLACE, RECOVERY, STATS = 20")
    if ($LASTEXITCODE -ne 0) { Say $r DarkGray; Stop-Now "The restore into the test copy failed. Nothing real was touched." }
    docker exec -u 0 erp-dryrun-db rm -f /tmp/erp_restore.bak | Out-Null
    $before = Get-Facts
    if ($before.nodb -or $before.nohist) { Stop-Now "The restored copy has no $Db database or no migration history." }
    Say ("  OK  Copy restored: {0} tables, {1} rows, migrations applied {2}." -f $before.tables, $before.rows, $before.mig.Count) Green
    $known = Get-Known
    $unknown = @($before.mig | Where-Object { $known -notcontains $_ })
    if ($unknown.Count -gt 0) { Stop-Now ("The copy has migrations this version does not know: " + ($unknown -join ", ")) }
    $todo = @($known | Where-Object { $before.mig -notcontains $_ })
    Say "[5/7] Running the pending migrations (erp-api starts on the COPY)" Cyan
    Say ("  Pending: {0}" -f $todo.Count) White
    foreach ($t in $todo) { Say "   - $t" DarkGray }
    Push-Location $Root
    docker compose -p erp-dryrun -f docker-compose.dryrun.yml up -d api 2>&1 | ForEach-Object { Say "  $_" DarkGray }
    Pop-Location
    $healthy = $false
    for ($i = 0; $i -lt 72; $i++) {
        $h = docker inspect -f "{{.State.Health.Status}}" erp-dryrun-api 2>$null
        if ($h -eq "healthy") { $healthy = $true; break }
        $st = docker inspect -f "{{.State.Status}}" erp-dryrun-api 2>$null
        if ($st -eq "exited") { break }
        Start-Sleep -Seconds 5
    }
    if (-not $healthy) {
        Say "  The API did not become healthy on the copy. Last 40 log lines (no passwords):" Yellow
        docker logs --tail 40 erp-dryrun-api 2>&1 | ForEach-Object { Say "  | $_" DarkGray }
        Stop-Now "TEST FAILED: the upgrade does not run cleanly on a copy of your data. Do NOT upgrade the real database yet. Send the log lines above to your developer."
    }
    Say "  OK  erp-api is healthy on the copy." Green
    Say "[6/7] Checking the result on the copy" Cyan
    $after = Get-Facts
    $missing = @($known | Where-Object { $after.mig -notcontains $_ })
    Say ("  Tables {0} -> {1}, rows {2} -> {3}, migrations {4} -> {5} (of {6})." -f $before.tables, $after.tables, $before.rows, $after.rows, $before.mig.Count, $after.mig.Count, $known.Count) White
    if ($missing.Count -gt 0) { Stop-Now ("TEST FAILED: migrations still missing on the copy: " + ($missing -join ", ")) }
    if ($after.rows -lt $before.rows) { Stop-Now ("TEST FAILED: the copy has FEWER rows after the upgrade ({0} -> {1}). Do NOT upgrade the real database." -f $before.rows, $after.rows) }
    Say "  OK  All migrations applied, no rows lost." Green
    Say "[7/7] Removing the test copy" Cyan
    Cleanup-Dry
    $script:Container = $realContainer; $script:pw = ""
    $script:summary = ("TEST PASSED on a copy of {0}: {1} migrations applied ({2} -> {3}), rows {4} -> {5}, erp-api healthy. Your real database was not touched. Next: Existing DB > Connect." -f $bf.Name, $todo.Count, $before.mig.Count, $after.mig.Count, $before.rows, $after.rows)
    Say ("  RESULT: " + $script:summary) Green
}
function Ask-Choice-Dry([string]$text, $opts) {
    if ($Gui) { $pairs = @($opts | ForEach-Object { "{0}={1}" -f $_[0], $_[1] }); return (Ask ($text + " [[choices:" + ($pairs -join ";") + "]]")) }
    $a = (Read-Host ("  " + $text + " (old/new, anything else cancels)")).Trim().ToLower(); return $a
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
    Say "  T  Test the upgrade on a COPY first (dry run, recommended)"
    Say "  Q  Quit"
    $a = (Read-Host "Choose").Trim().ToUpper()
    $Mode = switch ($a) { "1" { "connect" } "2" { "restore" } "3" { "status" } "T" { "dryrun" } default { "quit" } }
}
switch ($Mode) { "dryrun" { Dry-Run } "connect" { Connect-Existing } "restore" { Restore-Db } "status" { Show-Status } default { Say "Nothing done." } }
if ($script:helped) { docker exec -u 0 $Container rm -f /tmp/erp_rq.sh 2>$null | Out-Null }
Say ""; Say "Finished." Green
if ($Gui) { Write-Host ("@@DONE|" + $(if ($Mode -eq "status") { "STATUS" } else { "EXISTING" }) + "|" + ($script:summary -replace '\|', '/')) } else { [void](Read-Host "Press Enter to close") }
