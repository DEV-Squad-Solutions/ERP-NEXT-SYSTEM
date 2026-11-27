<#
 ERP installer / updater for the offline server. Double-click install-or-update.bat.
 [1/6] Docker  [2/6] Install type + config  [3/6] Backup (update only)  [4/6] Load images  [5/6] Start  [6/6] Health check
 Safety: never runs "down", "-v" or volume removal. The database container is not touched during an update.
 Any error stops the script. A log file is written next to this script.
#>
param(
    [string]$BackupDir = "C:\ERP_backup",
    [int]$HealthTimeoutSec = 300
)
$ErrorActionPreference = "Continue"
Set-Location $PSScriptRoot
$total = 6
$logFile = Join-Path $PSScriptRoot ("erp-install-{0}.log" -f (Get-Date -Format "yyyyMMdd_HHmmss"))
try { Start-Transcript -Path $logFile -Force | Out-Null } catch { }

# ---- Language: English (default, safe) or Arabic. A console cannot lay out Arabic right-to-left correctly, so Arabic
# ---- mode shows the Arabic messages in popup windows (true RTL) while the console keeps short English progress lines.
$script:Lang = "en"
$script:AR = @{
    start   = "تثبيت / تحديث نظام ERP`n`nهيتم تنفيذ 6 خطوات. تابع الشاشة السوداء. مفيش حاجة هتتمسح من الداتا."
    docker  = "برنامج Docker مش شغال.`n`nالحل: شغّل Docker Desktop، استنى لحد ما يقول إنه شغال، وبعدين اضغط دبل كليك على install-or-update.bat تاني."
    volume  = "لقيت قاعدة بيانات قديمة باسم مختلف.`n`nالسكربت وقف عشان ميعملش قاعدة فاضية جنبها.`n`nالحل: ابعت الاسم اللي ظهر في الشاشة للمطوّر."
    envmiss = "ملف .env ناقص الأسرار القديمة.`n`nفي التحديث السكربت مبيعملش أسرار جديدة.`n`nالحل: افتح ملف .env بالنوتباد واكتب بإيدك السطرين SQL_SA_PASSWORD و JWT_SIGNING_KEY بنفس القيم القديمة. ماتبعتهمش في أي شات. وبعدين شغّل السكربت تاني."
    seed    = "SEED_ENABLED مفعّل في ملف .env.`n`nالحل: خليه false وشغّل تاني (ده سيرفر بداتا حقيقية)."
    notar   = "مفيش ملف erp-images-*.tar جنب السكربت.`n`nالحل: انسخ الملف من الفلاشة لنفس الفولدر وشغّل تاني."
    backup  = "النسخة الاحتياطية فشلت، فالتحديث اتلغى ومفيش حاجة اتغيّرت.`n`nالحل: اتأكد إن erp-db شغال وفيه مساحة على القرص وشغّل تاني. لو اتكرر ابعت ملف اللوج."
    image   = "الصورة مش متحمّلة.`n`nالحل: انسخ ملف erp-images-*.tar الصحيح جنب السكربت وشغّل تاني."
    docker2 = "أمر Docker فشل.`n`nالحل: ابعت ملف اللوج للمطوّر. مفيش حاجة اتمسحت."
    health  = "الـ API ماجهزش في الوقت المحدد.`n`nالداتا سليمة ومفيش حاجة اتمسحت.`n`nالحل: ابعت ملف اللوج وآخر سطور الـ API للمطوّر."
    other   = "حصل خطأ غير متوقع.`n`nالداتا سليمة. ابعت ملف اللوج للمطوّر."
    okfresh = "تم التثبيت بنجاح.`n`nافتح http://localhost (أو http://192.168.1.5 من باقي الأجهزة).`n`nاحتفظ بنسخة من ملف .env في مكان خاص."
    okupd   = "تم التحديث بنجاح.`n`nافتح http://localhost (أو http://192.168.1.5 من باقي الأجهزة).`n`nراجع النسخة الاحتياطية في C:\ERP_backup ومكان ملف اللوج في الشاشة."
}
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

function Line($t, $c = "Gray") { Write-Host $t -ForegroundColor $c }
function Step($n, $t) { Write-Host ""; Write-Host ("[{0}/{1}] {2}" -f $n, $total, $t) -ForegroundColor Cyan }
function Ok($t) { Write-Host "      OK   " -ForegroundColor Green -NoNewline; Write-Host $t }
function Info($t) { Write-Host "      ..   " -ForegroundColor DarkGray -NoNewline; Write-Host $t }
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
function Set-EnvValue([string]$text, [string]$key, [string]$value) {
    if ($text -match "(?m)^\s*$key\s*=") { return [regex]::Replace($text, "(?m)^\s*$key\s*=.*$", "$key=$value") }
    return $text.TrimEnd() + "`r`n$key=$value`r`n"
}
function Get-EnvValue([string]$text, [string]$key) {
    if ($text -match "(?m)^\s*$key\s*=\s*(\S+)") { return $Matches[1] }
    return $null
}

Write-Host ""
Line "  ================================================================" Cyan
Line "    ERP SYSTEM  -  Installer / Updater" White
Line "    Offline server mode (Docker). Data is never deleted." Gray
Line "  ================================================================" Cyan

Choose-Language
$action = Choose-Action
if ($action -ne "1") {
    try { Stop-Transcript | Out-Null } catch { }
    $target = $(if ($action -eq "2") { "rollback.ps1" } else { "status.ps1" })
    & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot $target) -BackupDir $BackupDir
    exit $LASTEXITCODE
}
Show-Ar "start"

try {
    # ---------- 1. Docker ----------
    Step 1 "Checking Docker"
    docker version --format "{{.Server.Version}}" *> $null
    if ($LASTEXITCODE -ne 0) { Fail "Docker is not running." "Start Docker Desktop, wait until it says it is running, then double-click install-or-update.bat again." "docker" }
    Ok "Docker is running"

    # ---------- 2. Install type + config ----------
    Step 2 "Detecting install type and checking configuration"
    $dbContainer = docker ps -a --filter "name=^erp-db$" -q
    $ourVolume = docker volume ls -q --filter "name=^erp_sql_data$"
    $isUpdate = [bool]$dbContainer -or [bool]$ourVolume
    Info ("Container erp-db : {0}" -f $(if ($dbContainer) { "found" } else { "not found" }))
    Info ("Volume erp_sql_data: {0}" -f $(if ($ourVolume) { "found" } else { "not found" }))
    if (-not $dbContainer) {
        $foreign = docker ps -a --format "{{.Names}} ({{.Image}}, {{.Status}})" | Where-Object { $_ -match 'mssql|sql' -and $_ -notmatch '^erp-db ' }
        if ($foreign) {
            Info "Another SQL Server container exists (running or stopped): $($foreign -join ', ')"
            Info "It is not managed by this installer and will NOT be touched."
            Write-Host ""
            Write-Host "      If it is unrelated to this ERP (for example an old test stack), type UNRELATED and press Enter to continue." -ForegroundColor Yellow
            Write-Host "      If it holds your real data, press Enter only, and send the name to your developer." -ForegroundColor Yellow
            $ans = Read-Host "      Your answer"
            if ($ans -cne "UNRELATED") { Fail "Stopped by you: another SQL Server container exists ($($foreign -join ', '))." "Nothing was changed. Send the container name to your developer." "volume" }
            Ok "Continuing. The other SQL container is left untouched."
        }
    }
    if (-not $isUpdate) {
        $other = docker volume ls -q | Where-Object { $_ -match 'sql_?data|mssql' }
        if ($other) { Fail "Found a database volume with another name ($($other -join ', ')). This looks like an older install." "Do not continue. Send this volume name to your developer (stopped so no empty database is created next to your data)." "volume" }
    }

    # ports 80 and 8080 must be free (or used by our own erp-* containers)
    $busy = docker ps --format "{{.Names}}|{{.Ports}}" | Where-Object { $_ -notmatch '^erp-' -and $_ -match '(:|^|, )(80|8080)->' }
    if ($busy) { Fail "Port 80 or 8080 is already used by another container: $(($busy | ForEach-Object { ($_ -split '\|')[0] }) -join ', ')." "Stop that container (docker stop <name>) if it is not needed, then run this again. It is not deleted by stopping." "docker2" }

    $envFile = Join-Path $PSScriptRoot ".env"
    $envText = ""
    if (Test-Path $envFile) { $envText = [IO.File]::ReadAllText($envFile, [Text.Encoding]::UTF8) }
    $sa = Get-EnvValue $envText "SQL_SA_PASSWORD"
    $jwt = Get-EnvValue $envText "JWT_SIGNING_KEY"

    if ($isUpdate) {
        Ok "Mode: UPDATE (existing database found)"
        if (-not $sa -or -not $jwt) {
            if (-not (Test-Path $envFile)) { Copy-Item (Join-Path $PSScriptRoot ".env.example") $envFile }
            Fail "The .env file is missing the existing secrets. New secrets are NOT created on an update (they would break the database login)." ("Open this file in Notepad: $envFile . Fill these two lines with the SAME values as your old .env: SQL_SA_PASSWORD= and JWT_SIGNING_KEY= . Type them yourself in the file. Never send them in chat. Then run install-or-update.bat again.") "envmiss"
        }
        Ok "Existing secrets found in .env"
    }
    else {
        Ok "Mode: FRESH INSTALL (no existing database)"
        if (-not $envText) { $envText = [IO.File]::ReadAllText((Join-Path $PSScriptRoot ".env.example"), [Text.Encoding]::UTF8) }
        $changed = $false
        if (-not $sa)  { $envText = Set-EnvValue $envText "SQL_SA_PASSWORD" (New-Secret 28); $changed = $true; Ok "Generated a strong SQL password (stored only in .env, not shown)" }
        if (-not $jwt) { $envText = Set-EnvValue $envText "JWT_SIGNING_KEY" (New-Secret 48); $changed = $true; Ok "Generated a JWT signing key (stored only in .env, not shown)" }
        if ($changed) {
            [IO.File]::WriteAllText($envFile, $envText, (New-Object Text.UTF8Encoding($false)))
            Info "IMPORTANT: copy the .env file to a safe private place. It is not in git."
        }
    }
    $envText = [IO.File]::ReadAllText($envFile, [Text.Encoding]::UTF8)
    if ($envText -match '(?im)^\s*SEED_ENABLED\s*=\s*true') { Fail "SEED_ENABLED is true in .env." "Set SEED_ENABLED=false in .env (this is a real-data server), then run again." "seed" }
    Ok "Seeding is off"

    $tar = Get-ChildItem $PSScriptRoot -Filter "erp-images-*.tar" -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1
    $version = $null
    if ($tar) { $version = ($tar.BaseName -replace '^erp-images-', '') }
    else { $version = Get-EnvValue $envText "ERP_VERSION" }
    if (-not $version) { Fail "No erp-images-*.tar file found next to this script." "Copy the erp-images-<version>.tar file from the USB drive into this same folder, then run again." "notar" }
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
        for ($i = 0; $i -lt 36; $i++) {
            $h = docker inspect -f "{{.State.Health.Status}}" erp-db 2>$null
            if ($h -eq "healthy") { $dbReady = $true; break }
            if (-not $h -or $h -eq "<no value>") { Start-Sleep -Seconds 40; $dbReady = $true; break }
            Start-Sleep -Seconds 5
        }
        if (-not $dbReady) { Fail "The database container did not become healthy in 3 minutes." "Send the log file to your developer." "docker2" }

        # Is there a MiniErp database to back up?
        $sqlcmd = "/opt/mssql-tools18/bin/sqlcmd"
        $probe = docker exec erp-db $sqlcmd -S localhost -U sa -P $sa -C -h -1 -W -Q "SET NOCOUNT ON; SELECT CASE WHEN DB_ID('MiniErp') IS NULL THEN 'NO' ELSE 'YES' END" 2>&1 | Out-String
        if ($probe -cmatch '(?m)^\s*YES\s*$') { $hasDb = $true }
        elseif ($probe -cmatch '(?m)^\s*NO\s*$') { $hasDb = $false }
        else { Fail "Could not query the database. SQL_SA_PASSWORD in .env may not match this database." "Check the SQL_SA_PASSWORD line in .env (same value as the old .env). Do not continue until it matches." "envmiss" }

        if (-not $hasDb) {
            Ok "No MiniErp database in the volume yet: nothing to back up"
            $bakName = "(none, no database yet)"
        }
        else {
        & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "backup.ps1") -BackupDir $BackupDir
        if ($LASTEXITCODE -ne 0) { Fail "Backup failed. The update was cancelled and nothing was changed." "Make sure erp-db is running and the disk has free space, then run again. Send the log file if it repeats." "backup" }
        $bak = Get-ChildItem $BackupDir -Filter "MiniErp_*.bak" -ErrorAction SilentlyContinue |
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
    Add-Content -Path (Join-Path $PSScriptRoot "release-history.txt") -Value ("{0}|from={1}|to={2}|backup={3}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $prevVer, $version, $bakName) -Encoding UTF8

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
            $r = Invoke-WebRequest -UseBasicParsing -Uri "http://localhost:8080/health/ready" -TimeoutSec 5
            if ($r.StatusCode -eq 200) { $ok = $true; break }
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

    Write-Host ""
    Line "  +------------------------------------------------------------+" Green
    Line "  |  SUCCESS                                                   |" Green
    Line "  +------------------------------------------------------------+" Green
    Line ("  Mode      : {0}" -f $(if ($isUpdate) { "UPDATE" } else { "FRESH INSTALL" })) White
    Line "  Version   : $version" White
    Line "  Open      : http://localhost   (other PCs: http://192.168.1.5)" White
    Line "  Health    : http://localhost:8080/health/ready" White
    Line "  Backup    : $bakName" White
    Line "  Log file  : $logFile" White
    Write-Host ""
    try { Stop-Transcript | Out-Null } catch { }
    Show-Ar $(if ($isUpdate) { "okupd" } else { "okfresh" })
    exit 0
}
catch {
    Fail $_.Exception.Message "Send the log file to your developer." "other"
}
