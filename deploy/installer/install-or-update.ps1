<#
 ERP installer / updater for the offline server. Double-click install-or-update.bat.
 [1/6] Docker  [2/6] Install type + config  [3/6] Backup (update only)  [4/6] Load images  [5/6] Start  [6/6] Health check
 Safety: never runs "down", "-v" or volume removal. The database container is not touched during an update.
 Any error stops the script. A log file is written next to this script.
#>
param(
    [string]$BackupDir = "C:\ERP_backup",
    [int]$HealthTimeoutSec = 300,
    [switch]$Gui,          # used by the graphical installer: no menus, prompts go through files in -IoDir
    [string]$IoDir = ""
)
$ErrorActionPreference = "Continue"
$Root = $(if (Test-Path (Join-Path $PSScriptRoot "docker-compose.yml")) { $PSScriptRoot } else { Split-Path $PSScriptRoot -Parent })   # folder with .env, docker-compose.yml, images, logs
Set-Location $Root
$total = 6
New-Item -ItemType Directory -Force -Path (Join-Path $Root "logs") | Out-Null
Get-ChildItem $Root -Filter "erp-install-*.log" -File -ErrorAction SilentlyContinue | ForEach-Object { Move-Item $_.FullName (Join-Path $Root "logs") -Force -ErrorAction SilentlyContinue }
$logFile = Join-Path (Join-Path $Root "logs") ("erp-install-{0}.log" -f (Get-Date -Format "yyyyMMdd_HHmmss"))
try { Start-Transcript -Path $logFile -Force | Out-Null } catch { }

# ---- Language: English (default, safe) or Arabic. A console cannot lay out Arabic right-to-left correctly, so Arabic
# ---- mode shows the Arabic messages in popup windows (true RTL) while the console keeps short English progress lines.
$script:Lang = "en"
. (Join-Path $PSScriptRoot "messages-ar.ps1")
$script:AR = $AR
function Show-Ar([string]$key, [string]$kind = "Information") {
    if ($script:Lang -ne "ar") { return }
    try {
        Add-Type -AssemblyName System.Windows.Forms
        $opts = [System.Windows.Forms.MessageBoxOptions]::RtlReading -bor [System.Windows.Forms.MessageBoxOptions]::RightAlign
        [void][System.Windows.Forms.MessageBox]::Show($script:AR[$key], "ERP", "OK", $kind, "Button1", $opts)
    } catch { }
}
function Choose-Language {
    Write-Host ""
    Write-Host "  Language:  [1] English (default)    [2] Arabic (messages shown in popup windows)" -ForegroundColor White
    Write-Host "  Press 1 or 2, or wait 10 seconds for English: " -NoNewline
    $end = (Get-Date).AddSeconds(10)
    try {
        while ((Get-Date) -lt $end) {
            if ([Console]::KeyAvailable) {
                $k = [Console]::ReadKey($true).KeyChar
                if ($k -eq "2") { $script:Lang = "ar" }
                break
            }
            Start-Sleep -Milliseconds 200
        }
    } catch { }
    Write-Host $(if ($script:Lang -eq "ar") { "Arabic" } else { "English" })
}

function Choose-Action {
    Write-Host ""
    Write-Host "  What do you want to do?" -ForegroundColor White
    Write-Host "    [1] Install / Update   (default)"
    Write-Host "    [2] Switch version / roll back"
    Write-Host "    [3] Show status (read-only)"
    Write-Host "  Press 1, 2 or 3, or wait 10 seconds for [1]: " -NoNewline
    $end = (Get-Date).AddSeconds(10)
    $a = "1"
    try {
        while ((Get-Date) -lt $end) {
            if ([Console]::KeyAvailable) { $k = [Console]::ReadKey($true).KeyChar; if ($k -eq "2" -or $k -eq "3") { $a = "$k" }; break }
            Start-Sleep -Milliseconds 200
        }
    } catch { }
    Write-Host $(switch ($a) { "2" { "Roll back" } "3" { "Status" } default { "Install / Update" } })
    return $a
}

$script:askN = 0
$script:typedSa = $false
$script:oldBackups = @()
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
function Ask-Choice([string]$text, [string[]]$keys, [string[]]$labels) {
    # GUI: shows one button per choice. Console: asks to type the key. Returns the chosen key, or "" if cancelled.
    if ($Gui) {
        $pairs = for ($i = 0; $i -lt $keys.Count; $i++) { "{0}={1}" -f $keys[$i], $labels[$i] }
        return (Ask ($text + " [[choices:" + ($pairs -join ";") + "]]"))
    }
    Write-Host ""; Write-Host "      $text" -ForegroundColor Yellow
    for ($i = 0; $i -lt $keys.Count; $i++) { Write-Host ("        type {0} = {1}" -f $keys[$i], $labels[$i]) }
    $a = (Read-Host "      Your choice (anything else cancels)").Trim().ToUpper()
    if ($keys -contains $a) { return $a } else { return "" }
}
function Test-PortFree([int]$port) {
    try { $l = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Any, $port); $l.Start(); $l.Stop(); return $true } catch { return $false }
}
function Line($t, $c = "Gray") { Write-Host $t -ForegroundColor $c }
function Step($n, $t) { Write-Host ""; Write-Host ("[{0}/{1}] {2}" -f $n, $total, $t) -ForegroundColor Cyan }
function Ok($t) { Write-Host "      OK   " -ForegroundColor Green -NoNewline; Write-Host $t }
function Info($t) { Write-Host "      ..   " -ForegroundColor DarkGray -NoNewline; Write-Host $t }
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
function Fail($m, $next, $ar = "other") {
    Write-Host ""
    Write-Host "      FAIL " -ForegroundColor Red -NoNewline; Write-Host $m
    Write-Host ""
    Line "  +------------------------------------------------------------+" Red
    Line "  |  STOPPED. Nothing was deleted. Your data is safe.          |" Red
    Line "  +------------------------------------------------------------+" Red
    if ($next) { Line "  What to do next: $next" Yellow }
    Line "  Log file: $logFile" Yellow
    try { Stop-Transcript | Out-Null } catch { }
    if ($Gui) { Write-Host "@@FAIL|$ar" }
    Show-Ar $ar "Error"
    exit 1
}
function Run-Docker { & docker @args; if ($LASTEXITCODE -ne 0) { Fail "Command failed: docker $($args -join ' ')" "Send the log file to your developer." "docker2" } }
function New-Secret([int]$len) {
    # letters and digits only: safe in .env and in the SQL connection string, meets SQL Server complexity rules
    $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
    $rng = New-Object System.Security.Cryptography.RNGCryptoServiceProvider
    do {
        $bytes = New-Object byte[] $len
        $rng.GetBytes($bytes)
        $s = -join ($bytes | ForEach-Object { $chars[$_ % $chars.Length] })
    } until ($s -cmatch '[A-Z]' -and $s -cmatch '[a-z]' -and $s -match '[0-9]')
    return $s
}
function Ask-Secret([string]$text, [bool]$allowGen) {
    # typed locally, never echoed, never logged. Returns the typed text, "@@GENERATE" (only if allowed) or "" (cancelled).
    if ($Gui) { return (Ask ($text + " [[secret:" + $(if ($allowGen) { "gen" } else { "nogen" }) + "]]")) }
    Write-Host ""; Write-Host "      $text" -ForegroundColor Yellow
    if ($allowGen) { Write-Host "      Type it (hidden), or just press Enter to generate a strong one automatically." } else { Write-Host "      Type it (hidden). Press Enter with nothing to cancel." }
    $ss = Read-Host "      Value" -AsSecureString
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($ss)
    try { $v = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
    $v = $v.Trim()
    if (-not $v -and $allowGen) { return "@@GENERATE" }
    return $v
}
function Test-NewSa([string]$v) {   # SQL Server password policy for a NEW password; returns an error text or ""
    if ($v.Length -lt 8) { return "At least 8 characters." }
    if ($v -notmatch '^[A-Za-z0-9_.@!*+-]+$') { return "Use only letters, digits and these characters: _ . @ ! * + -" }
    $k = 0; foreach ($re in @('[A-Z]', '[a-z]', '[0-9]', '[_.@!*+-]')) { if ($v -cmatch $re) { $k++ } }
    if ($k -lt 3) { return "Use at least 3 of: capital letters, small letters, digits, symbols." }
    return ""
}
function Test-OldSa([string]$v) {   # an EXISTING password is only checked for characters that would break .env; the real check is a login against erp-db
    if ($v -match '\s' -or $v -match '["''`]') { return "The password must not contain spaces or quotes (they cannot be stored in .env)." }
    return ""
}
function Test-Jwt([string]$v) {
    if ($v.Length -lt 32) { return "At least 32 characters." }
    if ($v -notmatch '^[A-Za-z0-9_.@!*+/=-]+$') { return "Use only letters, digits and these characters: _ . @ ! * + / = -" }
    return ""
}
function Read-Secret-Valid([string]$text, [bool]$allowGen, [int]$genLen, [scriptblock]$check) {
    for ($try = 1; $try -le 3; $try++) {
        $v = Ask-Secret $text $allowGen
        if (-not $v) { return "" }
        if ($v -eq "@@GENERATE") { return (New-Secret $genLen) }
        $err = & $check $v
        if (-not $err) { return $v }
        Info "Not accepted: $err (try $try of 3)"
    }
    return ""
}
function Set-EnvValue([string]$text, [string]$key, [string]$value) {
    if ($text -match "(?m)^\s*$key\s*=") { return [regex]::Replace($text, "(?m)^\s*$key\s*=.*$", "$key=$value") }
    return $text.TrimEnd() + "`r`n$key=$value`r`n"
}
function Get-EnvValue([string]$text, [string]$key) {
    # same line only ([ \t]*, never \s*: that would jump over an empty value to the next line); empty or whitespace-only = missing
    if ($text -match "(?m)^[ \t]*$key[ \t]*=[ \t]*([^\r\n]*)") { $v = $Matches[1].Trim().Trim('"').Trim("'"); if ($v) { return $v } }
    return $null
}

Write-Host ""
Line "  ================================================================" Cyan
Line "    ERP SYSTEM  -  Installer / Updater" White
Line "    Offline server mode (Docker). Data is never deleted." Gray
Line "  ================================================================" Cyan

if ($Gui) { [Console]::OutputEncoding = [Text.Encoding]::UTF8; $script:Lang = "en"; $action = "1" } else { Choose-Language; $action = Choose-Action }
if ($action -ne "1") {
    try { Stop-Transcript | Out-Null } catch { }
    $target = $(if ($action -eq "2") { "rollback.ps1" } else { "status.ps1" })
    & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot $target) -BackupDir $BackupDir
    exit $LASTEXITCODE
}
Show-Ar "start"

try {
    . (Join-Path $PSScriptRoot "gate.ps1")
    Require-Gate $Root $Gui.IsPresent $IoDir
    # ---------- 1. Docker ----------
    Step 1 "Checking Docker"
    docker version --format "{{.Server.Version}}" *> $null
    if ($LASTEXITCODE -ne 0) { Fail "Docker is not running." "Start Docker Desktop, wait until it says it is running, then double-click ERP Installer.bat again." "docker" }
    Ok "Docker is running"

    # ---------- Old stack (minierp-db) is the source of truth: hand over to the Existing DB upgrade (verified backup, typed confirmation, Restore) ----------
    if (-not $Gui -and (docker ps -a --filter "name=^minierp-db$" --format "{{.Names}}" 2>$null)) {
        Write-Host "  Found the old stack (minierp-db). Using it as the source of truth. erp-db / erp_sql_data are ignored and not touched." -ForegroundColor Cyan
        try { Stop-Transcript | Out-Null } catch { }
        & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "use-existing-db.ps1") -Mode connect -BackupDir $BackupDir
        exit $LASTEXITCODE
    }

    # ---------- 2. Install type + config ----------
    Step 2 "Detecting install type and checking configuration"
    $dbContainer = docker ps -a --filter "name=^erp-db$" -q
    $sqlVol = "erp_sql_data"
    if (Test-Path (Join-Path $Root ".env")) { $mv = [regex]::Match([IO.File]::ReadAllText((Join-Path $Root ".env"), [Text.Encoding]::UTF8), "(?m)^[ \t]*ERP_SQL_VOLUME[ \t]*=[ \t]*([A-Za-z0-9_.-]+)"); if ($mv.Success) { $sqlVol = $mv.Groups[1].Value } }
    $ourVolume = docker volume ls -q --filter "name=^$sqlVol$"
    $isUpdate = [bool]$dbContainer -or [bool]$ourVolume
    Info ("Container erp-db : {0}" -f $(if ($dbContainer) { "found" } else { "not found" }))
    Info ("Volume {0}: {1}" -f $sqlVol, $(if ($ourVolume) { "found" } else { "not found" }))
    if (-not $dbContainer) {
        $foreign = docker ps -a --format "{{.Names}} ({{.Image}}, {{.Status}})" | Where-Object { $_ -match 'mssql|sql' -and $_ -notmatch '^erp-db ' }
        if ($foreign) {
            Info "Another SQL Server container exists (running or stopped): $($foreign -join ', ')"
            Info "It will NOT be touched, stopped or deleted. A verified read-only backup is taken first."
            $bakRoot = $(if (Test-Path "D:\") { "D:\minierp_backup" } else { Join-Path $BackupDir "old-sql-backup" })
            $runningNow = @(docker ps --format "{{.Names}}")
            foreach ($f in $foreign) {
                $n = ($f -split ' ')[0]
                if ($runningNow -notcontains $n) { Info "$n is stopped, so it cannot be read or backed up. It is left untouched."; continue }
                Info "Backing up $n (read-only, verified). This can take a few minutes."
                $dest = Join-Path $bakRoot $n
                & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "minierp-backup.ps1") -Container $n -OutDir $dest -Embedded @(if ($Gui) { "-Gui"; "-IoDir"; $IoDir })
                if ($LASTEXITCODE -ne 0) { Fail "The safety backup of container $n failed or could not be verified." "Nothing was changed and the container was not touched. Send the log file to your developer." "volume" }
                $rep = Get-ChildItem $dest -Filter "backup-report_*.txt" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
                $script:oldBackups += $dest
                Ok "Verified backup of $n saved in: $dest"
                if ($rep) { Info "Report (sizes and SHA256): $($rep.FullName)" }
            }
            Info "Please also copy that backup folder to a second disk or USB."
            Ok "Continuing. The other SQL container was left untouched."
        }
    }
    if (-not $isUpdate) {
        $other = docker volume ls -q | Where-Object { $_ -match 'sql_?data|mssql' }
        if ($other) { Fail "Found a database volume with another name ($($other -join ', ')). This looks like an older install." "Do not continue. Send this volume name to your developer (stopped so no empty database is created next to your data)." "volume" }
    }

    # a data volume must never be used by two SQL Server containers at once (data corruption risk)
    if ($ourVolume) {
        $users = docker ps -a --filter "volume=$sqlVol" --format "{{.Names}}" | Where-Object { $_ -notmatch '^erp-' }
        if ($users) { Fail "The data volume $sqlVol is already used by another container: $($users -join ', '). Two SQL Server containers on the same data would corrupt it." "Do not continue. Send this name to your developer. Nothing was changed." "volume" }
    }

    $envFile = Join-Path $Root ".env"
    $envText = ""
    if (Test-Path $envFile) { $envText = [IO.File]::ReadAllText($envFile, [Text.Encoding]::UTF8) }
    $sa = Get-EnvValue $envText "SQL_SA_PASSWORD"
    $jwt = Get-EnvValue $envText "JWT_SIGNING_KEY"

    if ($isUpdate) { Ok "Mode: UPDATE (existing database found)" } else { Ok "Mode: FRESH INSTALL (no existing database)" }
    if (-not $envText) {
        $ex = Join-Path $Root ".env.example"
        $envText = $(if (Test-Path $ex) { [IO.File]::ReadAllText($ex, [Text.Encoding]::UTF8) } else { "" })
    }
    $changed = $false
    if (-not $sa) {
        if ($isUpdate) {
            Info "SQL_SA_PASSWORD is empty in .env, but the database already exists. The password it was created with is needed (a new one would not open it)."
            $sa = Read-Secret-Valid "Type the existing SQL_SA_PASSWORD (the one from your old .env). It is saved only in .env on this PC." $false 0 { param($v) Test-OldSa $v }
            if (-not $sa) { Fail "No SQL password was entered. Nothing was changed." "Run again and type the old SQL_SA_PASSWORD, or put it in the .env file yourself." "envmiss" }
            $script:typedSa = $true
            Ok "SQL password received (not shown). It will be checked against the database before anything else happens."
        }
        else {
            $sa = Read-Secret-Valid "SQL_SA_PASSWORD is empty. Type a new SQL password (min 8, mixed), or generate one." $true 28 { param($v) Test-NewSa $v }
            if (-not $sa) { Fail "No SQL password was set. Nothing was changed." "Run again and type a password or choose Generate." "envmiss" }
            Ok "SQL password set (stored only in .env, not shown)"
        }
        $envText = Set-EnvValue $envText "SQL_SA_PASSWORD" $sa; $changed = $true
    }
    if (-not $jwt) {
        $jwt = Read-Secret-Valid "JWT_SIGNING_KEY is empty. Type a key (min 32 characters), or generate one. (Users must log in again after a new key.)" $true 48 { param($v) Test-Jwt $v }
        if (-not $jwt) { Fail "No signing key was set. Nothing was changed." "Run again and type a key or choose Generate." "envmiss" }
        $envText = Set-EnvValue $envText "JWT_SIGNING_KEY" $jwt; $changed = $true
        Ok "JWT signing key set (stored only in .env, not shown)"
    }
    if ($changed) {
        [IO.File]::WriteAllText($envFile, $envText, (New-Object Text.UTF8Encoding($false)))
        Info "IMPORTANT: copy the .env file to a safe private place. It is not in git."
    }
    Ok "Secrets in .env: both have a value"
    $envText = [IO.File]::ReadAllText($envFile, [Text.Encoding]::UTF8)
    if ($envText -match '(?im)^\s*SEED_ENABLED\s*=\s*true') { Fail "SEED_ENABLED is true in .env." "Set SEED_ENABLED=false in .env (this is a real-data server), then run again." "seed" }
    Ok "Seeding is off"

    $apiPort = $(if (Get-EnvValue $envText "ERP_API_PORT") { Get-EnvValue $envText "ERP_API_PORT" } else { "8080" })
    $webPort = $(if (Get-EnvValue $envText "ERP_WEB_PORT") { Get-EnvValue $envText "ERP_WEB_PORT" } else { "80" })
    $owners = @()
    foreach ($p in @($apiPort, $webPort)) { $o = Get-PortOwner $p; if ($o -and $o -notmatch '^erp-' -and $owners -notcontains $o) { $owners += $o } }
    $busyPorts = @($apiPort, $webPort) | Where-Object { (-not (Get-PortOwner $_ | Where-Object { $_ -match '^erp-' })) -and (-not (Test-PortFree ([int]$_))) }
    if ($busyPorts) {
        $who = $(if ($owners) { "container(s): " + ($owners -join ", ") } else { "another program on this PC" })
        Info "Port(s) $($busyPorts -join ', ') are in use by $who."
        $keys = @(); $labels = @()
        if ($owners) { $keys += "STOP"; $labels += "Stop " + ($owners -join ", ") + " (stop only, nothing deleted)" }
        $keys += "PORTS"; $labels += "Use other ports for ERP (set in .env)"
        $c = Ask-Choice "Ports $($busyPorts -join ' and ') are in use by $who. Nothing is deleted either way. What do you want to do?" $keys $labels
        if ($c -eq "STOP" -and $owners) {
            foreach ($o in $owners) {
                Info "Stopping $o (docker stop only; it is NOT removed and its data stays; start it again later with: docker start $o)"
                docker stop $o | Out-Null
                if ($LASTEXITCODE -ne 0) { Fail "Could not stop $o." "Nothing was deleted. Send the log file to your developer." "docker2" }
            }
            Start-Sleep -Seconds 2
            $still = @($apiPort, $webPort) | Where-Object { -not (Test-PortFree ([int]$_)) }
            if ($still) { Fail "Port(s) $($still -join ', ') are still in use after stopping the container(s)." "Another program uses them. Run again and choose other ports." "docker2" }
            Ok "Stopped: $($owners -join ', '). Not deleted."
        }
        elseif ($c -eq "PORTS") {
            $newApi = 18080; while (-not (Test-PortFree $newApi)) { $newApi++ }
            $newWeb = 8081; while (($newWeb -eq $newApi) -or -not (Test-PortFree $newWeb)) { $newWeb++ }
            $envText = Set-EnvValue (Set-EnvValue $envText "ERP_API_PORT" "$newApi") "ERP_WEB_PORT" "$newWeb"
            [IO.File]::WriteAllText($envFile, $envText, (New-Object Text.UTF8Encoding($false)))
            $apiPort = "$newApi"; $webPort = "$newWeb"
            Ok "ERP will use port $webPort (web) and $apiPort (api). Saved in .env."
        }
        else { Fail "Ports $($busyPorts -join ', ') are in use and no choice was made." "Nothing was changed. Run again and choose Stop or Other ports." "docker2" }
    }
    Ok "Ports $webPort (web) and $apiPort (api) are free"

    $tar = Get-ChildItem @($Root, (Join-Path $Root "images")) -Filter "erp-images-*.tar" -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1
    $version = $null
    if ($tar) { $version = ($tar.BaseName -replace '^erp-images-', '') }
    else { $version = Get-EnvValue $envText "ERP_VERSION" }
    if (-not $version) { Fail "No erp-images-*.tar file found next to this script." "Copy the erp-images-<version>.tar file from the USB drive into the "images" folder of this package, then run again." "notar" }
    $env:ERP_VERSION = $version
    Ok "Version to install: $version"

    # ---------- 3. Backup ----------
    $bakName = "(none, fresh install)"
    if ($isUpdate) {
        Step 3 "Backing up the database (required before any update)"
        $running = docker ps --filter "name=^erp-db$" --filter "status=running" -q
        if (-not $dbContainer) {
            Info "Container erp-db is missing but its data volume exists. Starting only the database container on that volume (data is not changed)."
            docker image inspect mcr.microsoft.com/mssql/server:2022-latest *> $null
            if ($LASTEXITCODE -ne 0) { Fail "The SQL Server image is not on this PC, so the database container cannot be started." "Load the SQL Server image first (docker load), or send the log file to your developer." "docker2" }
            Run-Docker compose -p erp up -d db
        }
        elseif (-not $running) {
            Info "Starting erp-db for the backup"
            Run-Docker start erp-db
        }
        Info "Waiting for the database to accept connections"
        $dbReady = $false
        $loginBad = $false
        $t0 = Get-Date; $lastNote = 0
        for ($i = 0; $i -lt 90; $i++) {
            $st = docker inspect -f "{{.State.Status}}" erp-db 2>$null
            if ($st -and $st -ne "running" -and $st -ne "restarting") { break }   # container stopped: diagnosis below
            # a real login probe every ~2 s: tells "still starting" (keep waiting) from "up, but this password is refused" (stop waiting now)
            $env:SQLCMDPASSWORD = $sa
            $pr = ""
            try { $eapOld = $ErrorActionPreference; $ErrorActionPreference = "Continue"; $pr = docker exec -e SQLCMDPASSWORD erp-db /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -C -b -l 3 -Q "SELECT 1" 2>&1 | Out-String; $prc = $LASTEXITCODE } catch { $prc = 1 } finally { $ErrorActionPreference = $eapOld; Remove-Item Env:SQLCMDPASSWORD -ErrorAction SilentlyContinue }
            if ($prc -eq 0) { $dbReady = $true; break }
            if ($pr -match 'Login failed|18456') {
                $dbReady = $true; $loginBad = $true
                Info "The database is running but refuses the password in .env (login failed). Not waiting any longer: the backup step looks for the right login (old .env files, then a masked dialog)."
                break
            }
            $sec = [int]((Get-Date) - $t0).TotalSeconds
            if ($sec - $lastNote -ge 10) { Info ("Still waiting for the database to start... {0} s (up to 180 s)" -f $sec); $lastNote = $sec }
            Start-Sleep -Seconds 2
        }
        if (-not $dbReady) {
            # diagnosis: last lines of the SQL Server log and the last health probe (SQL logs contain no passwords)
            Info "Database did not become healthy. Last health check result and last 40 lines of the erp-db log:"
            $hl = docker inspect -f "{{range .State.Health.Log}}{{.Output}}{{end}}" erp-db 2>&1 | Out-String
            $dl = docker logs --tail 40 erp-db 2>&1 | Out-String
            Write-Host ($hl.Trim() -split "`n" | Select-Object -Last 6 | ForEach-Object { "      | " + $_.TrimEnd() } | Out-String)
            Write-Host ($dl.TrimEnd() -split "`n" | ForEach-Object { "      | " + $_.TrimEnd() } | Out-String)
            $pwBad = ($hl -match 'Login failed' -or $dl -match "Login failed for user 'sa'")
            if ($pwBad) { Info "Diagnosis: SQL Server is running but refuses the password in .env. The password stored inside the data volume is a different one." }
            elseif ($dl -match 'memory|Insufficient|OutOfMemory') { Info "Diagnosis: SQL Server may be short of memory. Give Docker Desktop more RAM (at least 4 GB) and run again." }
            else { Info "Diagnosis: not clear from the log. Send the log file to your developer." }
            if ($pwBad) { Info "DO NOT reset or delete anything: the data volume may hold your real data. If you KNOW the old password: use the "DB password" button in the installer (or tools\Recover database.bat, option 4): old + new + confirm, changed inside the database. If you do not: tools\Recover database.bat (copies the files first, then works on a COPY only)." }
            if (-not $dbReady) { Fail "The database container did not become healthy in 3 minutes." "Send the log file to your developer (it now contains the last 40 lines of the database log, no passwords)." "docker2" }
        }

        # Is there a MiniErp database to back up?
        $sqlcmd = "/opt/mssql-tools18/bin/sqlcmd"
        if ($loginBad) { $probe = "YES" } else { $probe = docker exec erp-db $sqlcmd -S localhost -U sa -P $sa -C -h -1 -W -Q "SET NOCOUNT ON; SELECT CASE WHEN DB_ID('MiniErp') IS NULL THEN 'NO' ELSE 'YES' END" 2>&1 | Out-String }
        if ($probe -cmatch '(?m)^\s*YES\s*$') { $hasDb = $true }
        elseif ($probe -cmatch '(?m)^\s*NO\s*$') { $hasDb = $false }
        else {
            if ($script:typedSa) {
                # the password typed just now is wrong: remove it again so the next run asks again (nothing else was changed)
                try { [IO.File]::WriteAllText($envFile, (Set-EnvValue ([IO.File]::ReadAllText($envFile, [Text.Encoding]::UTF8)) "SQL_SA_PASSWORD" ""), (New-Object Text.UTF8Encoding($false))) } catch { }
                Fail "The SQL password you typed does not open the existing database. It was NOT saved." "Run again and type the correct old SQL_SA_PASSWORD. Nothing was changed or deleted." "envmiss"
            }
            Fail "Could not query the database. SQL_SA_PASSWORD in .env may not match this database." "Check the SQL_SA_PASSWORD line in .env (same value as the old .env). Do not continue until it matches." "envmiss"
        }

        if (-not $hasDb) {
            Ok "No MiniErp database in the volume yet: nothing to back up"
            $bakName = "(none, no database yet)"
        }
        else {
        & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "backup.ps1") -BackupDir $BackupDir @(if ($Gui) { "-Gui"; "-IoDir"; $IoDir })
        if ($LASTEXITCODE -eq 3) { Fail "SQL Server rejected the username/password. The update was cancelled and nothing was changed." "The password of erp-db is not the one in .env or the ones typed. Run the installer again and retype it carefully (user is usually sa), or use the DB password button. Your data is untouched." "backup" }
        if ($LASTEXITCODE -eq 4) { Fail "No SQL login was entered. The update was cancelled and nothing was changed." "Run the installer again and enter the SQL username and password when asked." "backup" }
        if ($LASTEXITCODE -ne 0) { Fail "Backup failed. The update was cancelled and nothing was changed." "Make sure erp-db is running and the disk has free space, then run again. Send the log file if it repeats." "backup" }
        $bak = Get-ChildItem $BackupDir -Filter "*.bak" -ErrorAction SilentlyContinue | Where-Object { $_.Name -match '^(ERP_DB_backup_|MiniErp_).*\.bak$' } |
            Sort-Object LastWriteTime -Descending | Select-Object -First 1
        if (-not $bak -or $bak.Length -lt 1MB -or $bak.LastWriteTime -lt (Get-Date).AddMinutes(-30)) {
            Fail "No fresh, valid backup found in $BackupDir. The update was cancelled." "Run backup.ps1 manually and check the folder, then run again." "backup"
        }
        $bakName = Join-Path $BackupDir $bak.Name
        Ok ("Backup verified: {0} ({1} MB)" -f $bak.Name, [math]::Round($bak.Length / 1MB, 1))
        }
    }
    else { Step 3 "Backup"; Ok "Not needed on a fresh install" }

    # ---------- 4. Load images ----------
    Step 4 "Loading images"
    if ($tar) {
        Info "Loading $($tar.Name) (this can take a few minutes)"
        Run-Docker load -i $tar.FullName
    }
    foreach ($img in "erp-api:$version", "erp-frontend:$version") {
        docker image inspect $img *> $null
        if ($LASTEXITCODE -ne 0) { Fail "Image $img is not loaded." "Copy the right erp-images-<version>.tar next to this script and run again." "image" }
    }
    Ok "Images ready: erp-api:$version, erp-frontend:$version"
    Copy-Item $envFile "$envFile.bak" -Force
    $envText = Set-EnvValue $envText "ERP_VERSION" $version
    [IO.File]::WriteAllText($envFile, $envText, (New-Object Text.UTF8Encoding($false)))

    # remember what we are moving from, so a rollback is possible (images are never deleted)
    $prevImg = docker inspect -f "{{.Config.Image}}" erp-api 2>$null
    $prevVer = $(if ($prevImg -and $prevImg -match ':(.+)$') { $Matches[1] } else { "none" })
    Add-Content -Path (Join-Path $Root "release-history.txt") -Value ("{0}|from={1}|to={2}|backup={3}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $prevVer, $version, $bakName) -Encoding UTF8

    # ---------- 5. Start ----------
    Step 5 "Starting services"
    if ($isUpdate) { Info "Updating api and frontend only. The database is not touched."; Run-Docker compose -p erp up -d --no-deps api frontend }
    else { Run-Docker compose -p erp up -d }
    Ok "Containers started"

    # ---------- 6. Health ----------
    Step 6 "Waiting for the system to be ready (up to $HealthTimeoutSec seconds)"
    $ok = $false
    $deadline = (Get-Date).AddSeconds($HealthTimeoutSec)
    while ((Get-Date) -lt $deadline) {
        Start-Sleep -Seconds 5
        try {
            if (Test-ErpApiOnPort $apiPort) {
                $r = Invoke-WebRequest -UseBasicParsing -Uri "http://localhost:$apiPort/health/ready" -TimeoutSec 5
                if ($r.StatusCode -eq 200) { $ok = $true; break }
            }
        } catch { }
        Write-Host "." -NoNewline
    }
    Write-Host ""
    if (-not $ok) {
        Line "      Last lines of the API log:" Yellow
        docker logs --tail 40 erp-api
        Fail "The API did not become ready in time." "Send the log file (and the lines above) to your developer. Do not delete anything." "health"
    }
    Ok "System is ready"

    # First-run setup token: only matters while no Admin exists yet. Never stops the install.
    $script:setupToken = $null
    try {
        $st = Invoke-RestMethod -UseBasicParsing -Uri "http://localhost:$apiPort/api/v1/setup/status" -TimeoutSec 10
        if ($st.requiresSetup -and $st.tokenRequired) {
            $tok = Get-EnvValue ([IO.File]::ReadAllText($envFile, [Text.Encoding]::UTF8)) "SETUP_TOKEN"
            if (-not $tok) {
                $m = docker logs erp-api 2>&1 | Select-String -Pattern 'restarts\): ([0-9A-Fa-f]{32})' | Select-Object -Last 1
                if ($m) { $tok = $m.Matches[0].Groups[1].Value }
            }
            $script:setupToken = $tok
        }
    } catch { }

    Write-Host ""
    Line "  +------------------------------------------------------------+" Green
    Line "  |  SUCCESS                                                   |" Green
    Line "  +------------------------------------------------------------+" Green
    Line ("  Mode      : {0}" -f $(if ($isUpdate) { "UPDATE" } else { "FRESH INSTALL" })) White
    Line "  Version   : $version" White
    Line ("  Open      : http://localhost{0}   (other PCs: http://192.168.1.5{0})" -f $(if ($webPort -ne "80") { ":$webPort" } else { "" })) White
    Line "  Health    : http://localhost:$apiPort/health/ready" White
    if ($script:setupToken) { Line "  Setup token (type it once on the first-run page to create the first Admin): $($script:setupToken)" Yellow }
    foreach ($ob in $script:oldBackups) { Line "  Old SQL backup : $ob" White }
    Line "  Backup    : $bakName" White
    Line "  Log file  : $logFile" White
    Write-Host ""
    try { Stop-Transcript | Out-Null } catch { }
    if ($Gui) { Write-Host ("@@DONE|{0}|{1}|{2}|{3}|{4}|{5}" -f $(if ($isUpdate) { "UPDATE" } else { "INSTALL" }), $version, $bakName, $logFile, ($script:oldBackups -join "; "), $webPort) }
    Show-Ar $(if ($isUpdate) { "okupd" } else { "okfresh" })
    exit 0
}
catch {
    Fail $_.Exception.Message "Send the log file to your developer." "other"
}
