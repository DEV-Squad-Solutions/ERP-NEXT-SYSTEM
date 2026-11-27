<#
.SYNOPSIS
    نسخ احتياطي لقاعدة بيانات ERP (داخل حاوية erp-db) إلى مجلد محلي على الخادم.

.DESCRIPTION
    1) يقرأ كلمة مرور SQL من ملف .env
    2) ينفذ BACKUP DATABASE داخل حاوية SQL Server (بضغط)
    3) ينقل النسخة إلى مجلد C:\ERP_backup (قابل للتغيير)
    4) يحذف النسخ الأقدم من عدد محدد (الاحتفاظ الافتراضي: 14)
    5) ينبّه إن كانت مساحة القرص الحرة منخفضة

    يوصى بجدولته أسبوعياً عبر Task Scheduler (الأمر في README.md).

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\backup.ps1
#>

[CmdletBinding()]
param(
    [string]$BackupDir = "C:\ERP_backup",
    [int]$RetainDays = 14
)

$ErrorActionPreference = "Stop"
$envFile = Join-Path $PSScriptRoot ".env"

if (-not (Test-Path $envFile)) { throw "ملف .env غير موجود بجانب السكربت!" }

# قراءة كلمة مرور SQL من .env
$saPass = $null
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*SQL_SA_PASSWORD\s*=\s*(.+?)\s*$') { $saPass = $Matches[1] }
}
if (-not $saPass) { throw "لم يتم العثور على SQL_SA_PASSWORD في .env" }

New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
$stamp = Get-Date -Format "yyyyMMdd_HHmm"
$bakName = "MiniErp_$stamp.bak"
$inContainer = "/var/opt/mssql/backup/$bakName"

# تأكد من أن erp-db يعمل
if (-not (docker ps --filter "name=^erp-db$" --filter "status=running" -q)) {
    throw "حاوية erp-db غير عاملة! شغّلها أولاً: docker compose up -d"
}

Write-Host "=== إنشاء مجلد النسخ داخل الحاوية ===" -ForegroundColor Cyan
docker exec -u 0 erp-db bash -lc "mkdir -p '/var/opt/mssql/backup' && chown mssql:mssql '/var/opt/mssql/backup'"
if ($LASTEXITCODE -ne 0) { throw "فشل إنشاء مجلد النسخ داخل الحاوية" }

# اختيار أداة sqlcmd الصحيحة (موجودة بمسار tools18 في صور 2022)
$sqlcmd = "sqlcmd"
docker exec erp-db bash -lc "test -x /opt/mssql-tools18/bin/sqlcmd && echo tools18" 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) { $sqlcmd = "/opt/mssql-tools18/bin/sqlcmd" }

Write-Host "=== تنفيذ BACKUP DATABASE (مضغوط) ===" -ForegroundColor Cyan
$query = "BACKUP DATABASE [MiniErp] TO DISK = N'$inContainer' WITH FORMAT, COMPRESSION, INIT, STATS=10"
docker exec erp-db $sqlcmd -S localhost -U sa -P $saPass -C -b -Q $query
if ($LASTEXITCODE -ne 0) { throw "فشل تنفيذ BACKUP — تحقق من كلمة المرور في .env" }

Write-Host "=== نقل النسخة إلى $BackupDir ===" -ForegroundColor Cyan
docker cp "erp-db:$inContainer" (Join-Path $BackupDir $bakName)
if ($LASTEXITCODE -ne 0) { throw "فشل نقل النسخة إلى المضيف" }

# مسح النسخة من داخل الحاوية (لا داعي لشغل مساحة volume القاعدة)
docker exec -u 0 erp-db rm -f $inContainer

# حذف النسخ الأقدم من مدة الاحتفاظ
$cutoff = (Get-Date).AddDays(-$RetainDays)
Get-ChildItem $BackupDir -Filter "MiniErp_*.bak" |
    Where-Object { $_.LastWriteTime -lt $cutoff } |
    ForEach-Object { Remove-Item $_.FullName -Force }

# فحص المساحة الحرة
$drive = (Get-PSDrive -Name $BackupDir.Substring(0,1).ToUpper()).Free
$freeGB = [math]::Round($drive / 1GB, 1)
if ($freeGB -lt 15) {
    Write-Warning "مساحة القرص منخفضة: $freeGB GB فقط — امسح الملفات القديمة أو أضف قرصاً."
} else {
    Write-Host "  مساحة القرص الحرة: $freeGB GB" -ForegroundColor Green
}

Write-Host ""
Write-Host "✅ النسخ الاحتياطي اكتمل:" -ForegroundColor Green
Write-Host "  $(Join-Path $BackupDir $bakName) - الحجم: $([math]::Round((Get-Item (Join-Path $BackupDir $bakName)).Length/1MB,1)) MB" -ForegroundColor Green
Write-Host "  أقدم نسخة محفوظة: $(Get-ChildItem $BackupDir -Filter 'MiniErp_*.bak' | Sort-Object Name | Select-Object -First 1 -ExpandProperty Name)"
