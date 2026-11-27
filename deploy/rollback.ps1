<#
 Switch ERP to any installed version (roll back or go forward). Nothing runs automatically.
 - Every version's images (erp-api:X, erp-frontend:X) stay on this machine. They are never deleted by these scripts.
 - A safety backup of the CURRENT database is always taken first.
 - Code-only switch: database untouched.
 - Code + data switch: restores the backup taken when you left that version. REPLACES current data. Needs a typed confirmation.
 Database migrations are additive and are NOT reversed by a code switch.
#>
param([string]$BackupDir = "C:\ERP_backup", [int]$HealthTimeoutSec = 300, [switch]$Gui, [string]$IoDir = "")
$ErrorActionPreference = "Continue"
Set-Location $PSScriptRoot
$script:askN = 0
function Ask([string]$text) {
    if (-not $Gui) { return (Read-Host $text) }
    $script:askN++
    $id = "p$($script:askN)"
    Write-Host "@@PROMPT|$id|$text"
    $f = Join-Path $IoDir "answer-$id.txt"
    while (-not (Test-Path $f)) { Start-Sleep -Milliseconds 300 }
    Start-Sleep -Milliseconds 200
    $a = [IO.File]::ReadAllText($f).Trim()
    Remove-Item $f -Force -ErrorAction SilentlyContinue
    return $a
}
function Line($t, $c = "Gray") { Write-Host $t -ForegroundColor $c }
function Ok($t) { Write-Host "      OK   " -ForegroundColor Green -NoNewline; Write-Host $t }
function Info($t) { Write-Host "      ..   " -ForegroundColor DarkGray -NoNewline; Write-Host $t }
function Stop-Safe($m, $next) {
    Write-Host ""; Write-Host "      FAIL " -ForegroundColor Red -NoNewline; Write-Host $m
    Line "  Nothing was deleted." Yellow
    if ($Gui) { Write-Host "@@FAIL|other" }
    if ($next) { Line "  What to do next: $next" Yellow }
    exit 1
}
function Run-Docker { & docker @args; if ($LASTEXITCODE -ne 0) { Stop-Safe "Command failed: docker $($args -join ' ')" "Send the output above to your developer." } }
function Get-EnvValue([string]$text, [string]$key) { if ($text -match "(?m)^\s*$key\s*=\s*(\S+)") { return $Matches[1] }; return $null }
function Step($n, $t) { Write-Host ""; Line "[$n] $t" Cyan }

if ($Gui) { [Console]::OutputEncoding = [Text.Encoding]::UTF8 }
Write-Host ""
Line "  ================================================================" Cyan
Line "    ERP SYSTEM  -  Switch version / Roll back" White
Line "    Images and the data volume are never deleted." Gray
Line "  ================================================================" Cyan

docker version --format "{{.Server.Version}}" *> $null
if ($LASTEXITCODE -ne 0) { Stop-Safe "Docker is not running." "Start Docker Desktop, wait, run again." }
$envFile = Join-Path $PSScriptRoot ".env"
if (-not (Test-Path $envFile)) { Stop-Safe ".env not found next to this script." "Run this from the deploy folder you installed from." }
$envText = [IO.File]::ReadAllText($envFile, [Text.Encoding]::UTF8)
$sa = Get-EnvValue $envText "SQL_SA_PASSWORD"
$apiPort = $(if (Get-EnvValue $envText "ERP_API_PORT") { Get-EnvValue $envText "ERP_API_PORT" } else { "8080" })
if (-not $sa) { Stop-Safe "SQL_SA_PASSWORD is empty in .env." "Fill it with the existing value." }

# Current version = tag of the running api image, else ERP_VERSION in .env
$curImg = docker inspect -f "{{.Config.Image}}" erp-api 2>$null
$cur = $(if ($curImg -match ':(.+)$') { $Matches[1] } else { Get-EnvValue $envText "ERP_VERSION" })

# Installed versions: tags that exist for BOTH erp-api and erp-frontend
$apiTags = @(docker images erp-api --format "{{.Tag}}")
$webTags = @(docker images erp-frontend --format "{{.Tag}}")
$versions = @($apiTags | Where-Object { $webTags -contains $_ -and $_ -ne "<none>" } | Sort-Object -Unique)
if ($versions.Count -eq 0) { Stop-Safe "No installed versions found (no matching erp-api / erp-frontend images)." "Load an erp-images-<version>.tar with install-or-update.bat first." }

# History: entries that name a backup taken when LEAVING a version
$hist = Join-Path $PSScriptRoot "release-history.txt"
$entries = @()
if (Test-Path $hist) {
    foreach ($l in (Get-Content $hist)) {
        if ($l -match '^(?<t>[^|]+)\|(?:[A-Z]+\|)?from=(?<f>[^|]+)\|to=(?<to>[^|]+)\|backup=(?<b>.*)$') {
            $entries += [pscustomobject]@{ Time = $Matches.t; From = $Matches.f; To = $Matches.to; Backup = $Matches.b.Trim() }
        }
    }
}
function Find-Backup([string]$ver) {
    # latest backup taken right before leaving $ver (= the data as it was on $ver)
    $m = $entries | Where-Object { $_.From -eq $ver -and $_.Backup -and (Test-Path $_.Backup) } | Select-Object -Last 1
    if ($m) { return $m.Backup } else { return $null }
}

Write-Host ""
Line "  Current version: $cur" White
Line "  Installed versions:" White
$i = 0
$menu = @{}
foreach ($v in $versions) {
    $i++
    $menu["$i"] = $v
    $bk = Find-Backup $v
    $note = $(if ($v -eq $cur) { "  <- running now" } else { "" })
    $bnote = $(if ($bk) { "matching backup: $(Split-Path $bk -Leaf)" } else { "no matching backup" })
    Line ("    [{0}] {1,-10} {2,-45}{3}" -f $i, $v, $bnote, $note)
}
Line "    [0] Cancel (default)"
$pick = Ask "Switch to which version? Type the number from the list (anything else cancels)"
if (-not $menu.ContainsKey($pick)) { Line "  Cancelled. Nothing changed." Yellow; if ($Gui) { Write-Host "@@CANCEL" }; exit 0 }
$target = $menu[$pick]
if ($target -eq $cur) { Line "  That version is already running. Nothing to do." Yellow; if ($Gui) { Write-Host "@@CANCEL" }; exit 0 }
$bakFor = Find-Backup $target

Write-Host ""
Line "  Switching: $cur  ->  $target" White
Line "  NOTE: database migrations are NOT reversed. Older code usually runs on a newer database, but it is not guaranteed." Yellow
Line "        The installer cannot check the database schema of the target version. Test after switching." Yellow
Line ""
Line "    [1] Switch CODE only                (database untouched)"
if ($bakFor) { Line "    [2] Switch code + RESTORE DATABASE from: $(Split-Path $bakFor -Leaf)   (REPLACES current data)" }
else { Line "    [2] not available (no backup matches version $target)" DarkGray }
Line "    [0] Cancel (default)"
$mode = Ask "Your choice: 1 = code only, 2 = code + restore data, anything else cancels"
if ($mode -ne "1" -and -not ($mode -eq "2" -and $bakFor)) { Line "  Cancelled. Nothing changed." Yellow; if ($Gui) { Write-Host "@@CANCEL" }; exit 0 }
if ($mode -eq "2") {
    Write-Host ""
    Line "  WARNING: this replaces ALL current data with the backup from when you left $target." Red
    Line "  Everything entered after that backup is lost (a safety backup of the current data is taken first)." Yellow
    $t = Ask "Type RESTORE (capital letters) to replace the current data with the backup. Anything else cancels"
    if ($t -cne "RESTORE") { Line "  Cancelled. Nothing changed." Yellow; if ($Gui) { Write-Host "@@CANCEL" }; exit 0 }
}

# --- Safety backup of the current database (always) ---
Step "1" "Safety backup of the current database"
$running = docker ps --filter "name=^erp-db$" --filter "status=running" -q
if (-not $running) { Stop-Safe "erp-db is not running." "Start it with: docker start erp-db , then run this again." }
$probe = docker exec erp-db /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P $sa -C -h -1 -W -Q "SET NOCOUNT ON; SELECT CASE WHEN DB_ID('MiniErp') IS NULL THEN 'NO' ELSE 'YES' END" 2>&1 | Out-String
$safetyPath = "(none, no database)"
if ($probe -cmatch '(?m)^\s*YES\s*$') {
    & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "backup.ps1") -BackupDir $BackupDir
    if ($LASTEXITCODE -ne 0) { Stop-Safe "Safety backup failed. Nothing was changed." "Fix the backup problem first, then run again." }
    $sb = Get-ChildItem $BackupDir -Filter "MiniErp_*.bak" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $sb -or $sb.Length -lt 1MB -or $sb.LastWriteTime -lt (Get-Date).AddMinutes(-30)) { Stop-Safe "No fresh valid safety backup found. Nothing was changed." "Run backup.ps1 and check $BackupDir." }
    $safetyPath = $sb.FullName
    Ok "Safety backup: $safetyPath"
}
elseif ($probe -cmatch '(?m)^\s*NO\s*$') { Ok "No MiniErp database yet: nothing to back up" }
else { Stop-Safe "Could not query the database. SQL_SA_PASSWORD in .env may not match." "Check the SQL_SA_PASSWORD line in .env." }
# Record the safety backup as "the data of $cur", so you can come back to $cur later.
Add-Content -Path $hist -Value ("{0}|SWITCH|from={1}|to={2}|backup={3}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $cur, $target, $safetyPath) -Encoding UTF8

# --- Optional restore ---
if ($mode -eq "2") {
    Step "2" "Restoring the database"
    Run-Docker stop erp-api erp-frontend
    Run-Docker exec -u 0 erp-db mkdir -p /var/opt/mssql/backup
    Run-Docker cp $bakFor "erp-db:/var/opt/mssql/backup/restore.bak"
    $q = "ALTER DATABASE [MiniErp] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; RESTORE DATABASE [MiniErp] FROM DISK = N'/var/opt/mssql/backup/restore.bak' WITH REPLACE, STATS=10; ALTER DATABASE [MiniErp] SET MULTI_USER;"
    docker exec erp-db /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P $sa -C -b -Q $q
    if ($LASTEXITCODE -ne 0) {
        docker exec erp-db /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P $sa -C -Q "ALTER DATABASE [MiniErp] SET MULTI_USER;" *> $null
        Stop-Safe "Restore failed. api and frontend are stopped. Your safety backup is $safetyPath." "Send this output to your developer before doing anything else."
    }
    docker exec -u 0 erp-db rm -f /var/opt/mssql/backup/restore.bak
    Ok "Database restored from $bakFor"
}

# --- Switch code ---
Step "3" "Switching code to version $target"
Copy-Item $envFile "$envFile.bak" -Force
$envText = $(if ($envText -match '(?m)^\s*ERP_VERSION\s*=') { [regex]::Replace($envText, '(?m)^\s*ERP_VERSION\s*=.*$', "ERP_VERSION=$target") } else { $envText.TrimEnd() + "`r`nERP_VERSION=$target`r`n" })
[IO.File]::WriteAllText($envFile, $envText, (New-Object Text.UTF8Encoding($false)))
$env:ERP_VERSION = $target
Run-Docker compose -p erp up -d --no-deps api frontend
Ok "api and frontend started on version $target"

Step "4" "Waiting for the system to be ready (up to $HealthTimeoutSec seconds)"
$ok = $false; $deadline = (Get-Date).AddSeconds($HealthTimeoutSec)
while ((Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 5
    try { $r = Invoke-WebRequest -UseBasicParsing -Uri "http://localhost:$apiPort/health/ready" -TimeoutSec 5; if ($r.StatusCode -eq 200) { $ok = $true; break } } catch { }
    Write-Host "." -NoNewline
}
Write-Host ""
if (-not $ok) {
    docker logs --tail 40 erp-api
    Stop-Safe "The API did not become ready on version $target." "Send the log lines above to your developer. Your safety backup: $safetyPath. You can switch back with this same menu."
}
Write-Host ""
Line "  +------------------------------------------------------------+" Green
Line "  |  SWITCH DONE                                               |" Green
Line "  +------------------------------------------------------------+" Green
Line "  Version       : $target  (was $cur)" White
Line ("  Data          : {0}" -f $(if ($mode -eq "2") { "restored from $bakFor" } else { "unchanged" })) White
Line "  Safety backup : $safetyPath" White
Line "  Open          : http://localhost" White
if ($Gui) { Write-Host ("@@DONE|SWITCH|{0}|{1}|" -f $target, $safetyPath) }
exit 0
