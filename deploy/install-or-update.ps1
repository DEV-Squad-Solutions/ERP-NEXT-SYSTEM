<#
 تثبيت أو تحديث ERP على السيرفر (بدون إنترنت). شغّله بدبل كليك على install-or-update.bat
 الخطوات: فحص Docker -> تحديد (تثبيت جديد / تحديث) -> نسخة احتياطية (في التحديث) -> تحميل الصور من ملف tar
          -> تشغيل -> انتظار /health/ready -> رسالة نجاح أو فشل.
 أمان: مبيعملش down ولا -v ولا حذف volume، ولا بيلمس erp-db أثناء التحديث. أي خطأ = توقف.
#>
param(
    [string]$BackupDir = "C:\ERP_backup",
    [int]$HealthTimeoutSec = 300
)
$ErrorActionPreference = "Continue"
Set-Location $PSScriptRoot

function Fail($m) { Write-Host ""; Write-Host "X $m" -ForegroundColor Red; exit 1 }
function Step($m) { Write-Host ""; Write-Host "=== $m ===" -ForegroundColor Cyan }
function Run-Docker { & docker @args; if ($LASTEXITCODE -ne 0) { Fail "فشل الأمر: docker $($args -join ' ')" } }

try {
    # 1) فحوصات أولية
    Step "فحص Docker"
    docker version --format "{{.Server.Version}}" *> $null
    if ($LASTEXITCODE -ne 0) { Fail "Docker مش شغال. شغّل Docker Desktop واستنى يجهز وجرّب تاني." }

    $envFile = Join-Path $PSScriptRoot ".env"
    if (-not (Test-Path $envFile)) {
        Copy-Item (Join-Path $PSScriptRoot ".env.example") $envFile
        Fail "اتعمل ملف .env جديد. افتحه بالنوتباد واملا SQL_SA_PASSWORD و JWT_SIGNING_KEY (لو عندك .env قديم انسخه مكانه) ثم شغّل تاني."
    }
    $envText = Get-Content $envFile -Raw
    if ($envText -notmatch '(?m)^\s*SQL_SA_PASSWORD\s*=\s*\S+') { Fail "SQL_SA_PASSWORD فاضي في .env" }
    if ($envText -notmatch '(?m)^\s*JWT_SIGNING_KEY\s*=\s*\S+') { Fail "JWT_SIGNING_KEY فاضي في .env" }
    if ($envText -match '(?im)^\s*SEED_ENABLED\s*=\s*true') { Fail "SEED_ENABLED لازم يكون false في .env (التشغيل على داتا حقيقية)." }

    # 2) أي ملف صور؟ الإصدار بيتاخد من اسم الملف erp-images-<version>.tar
    $tar = Get-ChildItem $PSScriptRoot -Filter "erp-images-*.tar" -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1
    $version = $null
    if ($tar) { $version = ($tar.BaseName -replace '^erp-images-', '') }
    elseif ($envText -match '(?m)^\s*ERP_VERSION\s*=\s*(\S+)') { $version = $Matches[1] }
    if (-not $version) { Fail "مفيش ملف erp-images-*.tar جنب السكربت. انسخه من الفلاشة لنفس الفولدر." }
    $env:ERP_VERSION = $version

    # 3) تثبيت جديد ولا تحديث؟
    $dbContainer = docker ps -a --filter "name=^erp-db$" -q
    $ourVolume = docker volume ls -q --filter "name=^erp_sql_data$"
    $isUpdate = [bool]$dbContainer -or [bool]$ourVolume
    if (-not $isUpdate) {
        $other = docker volume ls -q | Where-Object { $_ -match 'sql_?data|mssql' }
        if ($other) { Fail "لقيت volume قاعدة بيانات بإسم مختلف ($($other -join ', ')) وده معناه إن فيه تثبيت قديم. مش هكمل عشان مفيش قاعدة بيانات فاضية تتعمل بالغلط. ابعتلي الاسم ده." }
    }
    Step ($(if ($isUpdate) { "تحديث لإصدار $version" } else { "تثبيت جديد إصدار $version" }))

    # 4) نسخة احتياطية قبل أي تحديث
    if ($isUpdate) {
        $running = docker ps --filter "name=^erp-db$" --filter "status=running" -q
        if (-not $running) {
            Step "تشغيل erp-db للنسخ الاحتياطي"
            Run-Docker start erp-db
            Start-Sleep -Seconds 40
        }
        Step "نسخة احتياطية قبل التحديث"
        & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "backup.ps1") -BackupDir $BackupDir
        if ($LASTEXITCODE -ne 0) { Fail "فشلت النسخة الاحتياطية. التحديث اتلغى ومفيش حاجة اتغيّرت." }
        $bak = Get-ChildItem $BackupDir -Filter "MiniErp_*.bak" -ErrorAction SilentlyContinue |
            Sort-Object LastWriteTime -Descending | Select-Object -First 1
        if (-not $bak -or $bak.Length -lt 1MB -or $bak.LastWriteTime -lt (Get-Date).AddMinutes(-30)) {
            Fail "مفيش نسخة احتياطية حديثة وسليمة في $BackupDir. التحديث اتلغى."
        }
        Write-Host "نسخة احتياطية سليمة: $($bak.Name) ($([math]::Round($bak.Length/1MB,1)) MB)" -ForegroundColor Green
    }

    # 5) تحميل الصور
    if ($tar) {
        Step "تحميل الصور من $($tar.Name)"
        Run-Docker load -i $tar.FullName
    }
    foreach ($img in "erp-api:$version", "erp-frontend:$version") {
        docker image inspect $img *> $null
        if ($LASTEXITCODE -ne 0) { Fail "الصورة $img مش متحمّلة." }
    }

    # تثبيت رقم الإصدار في .env (سطر واحد بس، مع نسخة .env.bak)
    Copy-Item $envFile "$envFile.bak" -Force
    if ($envText -match '(?m)^\s*ERP_VERSION\s*=') { $new = [regex]::Replace($envText, '(?m)^\s*ERP_VERSION\s*=.*$', "ERP_VERSION=$version") }
    else { $new = $envText.TrimEnd() + "`r`nERP_VERSION=$version`r`n" }
    [IO.File]::WriteAllText($envFile, $new, (New-Object Text.UTF8Encoding($false)))

    # 6) تشغيل
    Step "تشغيل الخدمات"
    if ($isUpdate) { Run-Docker compose -p erp up -d --no-deps api frontend }
    else { Run-Docker compose -p erp up -d }

    # 7) انتظار الصحة
    Step "انتظار الجاهزية (حد أقصى $HealthTimeoutSec ثانية)"
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
        Write-Host "آخر سطور من سجل الـ API:" -ForegroundColor Yellow
        docker logs --tail 40 erp-api
        Fail "الـ API ماجهزش في الوقت المحدد. البيانات سليمة (متحذفش حاجة). ابعت السطور اللي فوق، ولو عايز ترجع للنسخة الاحتياطية ابعتلي أول."
    }
    Write-Host ""
    Write-Host "OK  تم بنجاح - الإصدار $version" -ForegroundColor Green
    Write-Host "افتح: http://localhost  (أو http://192.168.1.5 من باقي الأجهزة)" -ForegroundColor Green
    exit 0
}
catch {
    Fail $_.Exception.Message
}
