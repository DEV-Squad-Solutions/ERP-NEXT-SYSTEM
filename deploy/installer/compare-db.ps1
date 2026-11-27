<#
 Compare databases (READ-ONLY). Shows, for the old SQL container (minierp-db) and the new one (erp-db):
 database names, number of tables, number of rows (sum of all tables), the EF migration history (count + last 3),
 and whether the old database has migrations that this version does not know.
 It only runs SELECT queries. It does not stop, start, change or delete anything and prints no passwords.
#>
param([string]$Old = "minierp-db", [string]$New = "erp-db")
$ErrorActionPreference = "Continue"
. (Join-Path $PSScriptRoot "sql-cred.ps1")
$Root = $(if (Test-Path (Join-Path $PSScriptRoot "docker-compose.yml")) { $PSScriptRoot } else { Split-Path $PSScriptRoot -Parent })
$known = @(
    "20260826065406_createdatabase",
    "20260829094402_modify-employee",
    "20260829163223_AddInvoiceLinePricingExpenses",
    "20260830185827_RemovePayrollPeriodTable",
    "20260830191946_AddBusinessPartnerSpecial",
    "20260830200017_modify-payroll",
    "20260831051228_AddFiscalYears",
    "20260831085253_AddAccountingSetup",
    "20260831111954_AddCashVoucherAccountAndAccountMappings",
    "20260831131640_AddJournalEntries",
    "20260831180405_AddJournalEntrySources",
    "20260831185920_AddExchangeDifferenceAccountMappings",
    "20260831192745_AddOperationalPostingAccountMappings",
    "20260831214203_FiscalYearClosingOpeningEntry",
    "20260903203728_ScopePricingExpensesToItem",
    "20260904084722_BackfillLegacyCashVoucherAccountTargets",
    "20260905085911_OptimizeReportingIndexes",
    "20260908090900_AddJournalEntryLineParties",
    "20260908100800_AddCashboxJournalLineParties",
    "20260908173253_PersistCashVoucherClassification",
    "20260908185639_AddJournalLineCurrency",
    "20260914012409_UpdateFeildsForEmployee",
    "20260921142734_AddManualReturnPricing",
    "20260922161421_AddCashboxRevaluation",
    "20260922174234_AddMonetaryAccountRevaluation",
    "20260925090000_AddRefreshTokenSecurityStamp",
    "20260925191447_AddServiceInvoiceMappings",
    "20260926165941_AddFiscalYearOwnershipToTransactions",
    "20260926191518_AddFiscalYearOwnershipToExchangeRates",
    "20261011130959_AddUserCashboxPermissions",
    "20261011181657_AddCrossCurrencyPartnerVoucherSettlements",
    "20261011193525_cashbox-permissions",
    "20261113121824_AddDriverOpeningBalances",
    "20261113135739_AllowStandaloneDriverTrips",
    "20261117015149_AddManualContainerMovements",
    "20261125183906_AddThemePreferences",
    "20261125185250_AddUserHiddenScreens",
    "20261126023736_AddAuditLogs",
    "20261126132017_AddAiQuestionLog"
)
$sh = @'
#!/bin/bash
S=$(ls /opt/mssql-tools18/bin/sqlcmd /opt/mssql-tools/bin/sqlcmd 2>/dev/null | head -1)
P="${MSSQL_SA_PASSWORD:-$SA_PASSWORD}"
U="${ERP_SQL_USER:-sa}"
[ -z "$S" ] && { echo "ERR_NO_SQLCMD"; exit 2; }
[ -z "$P" ] && { echo "ERR_NO_PASSWORD_ENV"; exit 3; }
Q() { "$S" -S localhost -U "$U" -P "$P" -C -b -h -1 -W -s "|" -Q "SET NOCOUNT ON; $1" 2>&1; }
echo "DBS"; Q "SELECT name FROM sys.databases WHERE database_id > 4 AND state_desc = 'ONLINE'"
for D in $(Q "SELECT name FROM sys.databases WHERE database_id > 4 AND state_desc = 'ONLINE'" | tr -d '\r'); do
  echo "DB|$D"
  Q "USE [$D]; SELECT 'TABLES|' + CAST(COUNT(*) AS varchar(20)) FROM sys.tables"
  Q "USE [$D]; SELECT 'ROWS|' + CAST(ISNULL(SUM(p.rows),0) AS varchar(30)) FROM sys.partitions p JOIN sys.tables t ON t.object_id = p.object_id WHERE p.index_id IN (0,1)"
  Q "USE [$D]; IF OBJECT_ID('dbo.__EFMigrationsHistory') IS NOT NULL SELECT 'MIG|' + MigrationId FROM dbo.__EFMigrationsHistory ORDER BY MigrationId ELSE SELECT 'NOHISTORY'"
done
'@
function Probe([string]$c, [string]$saFromEnv) {
    Write-Host ""; Write-Host "=== $c ===" -ForegroundColor Cyan
    $run = docker ps --filter "name=^$c$" --filter "status=running" -q
    if (-not $run) { Write-Host "  not running (nothing was started). Skipped." -ForegroundColor Yellow; return }
    $tmp = Join-Path $env:TEMP "erp_cmp.sh"
    [IO.File]::WriteAllText($tmp, ($sh -replace "`r", ""), (New-Object Text.UTF8Encoding($false)))
    docker cp $tmp "${c}:/tmp/erp_cmp.sh" | Out-Null; Remove-Item $tmp -Force -ErrorAction SilentlyContinue
    if ($saFromEnv) { $env:MSSQL_SA_PASSWORD = $saFromEnv }
    $out = docker exec @(Get-SqlEnvArgs) $c bash /tmp/erp_cmp.sh 2>&1 | Out-String
    if ($saFromEnv) { Remove-Item Env:MSSQL_SA_PASSWORD -ErrorAction SilentlyContinue }
    if ($out -match 'Login failed|ERR_NO_PASSWORD_ENV') {
        Write-Host "  The saved login does not work. Looking for an old .env, then a dialog asks if needed (hidden, not saved; Cancel skips)." -ForegroundColor Yellow
        $auto = Try-AutoLogin {
            param($u, $p)
            $env:ERP_SQL_USER = $u; $env:MSSQL_SA_PASSWORD = $p
            $r = docker exec @(Get-SqlEnvArgs) $c bash /tmp/erp_cmp.sh 2>&1 | Out-String
            Remove-Item Env:MSSQL_SA_PASSWORD, Env:ERP_SQL_USER -ErrorAction SilentlyContinue
            return ($r -notmatch 'Login failed|ERR_NO_PASSWORD_ENV|ERR_NO_SQLCMD' -and $r.Trim().Length -gt 0)
        } $Root
        if ($auto) { $env:ERP_SQL_USER = $auto.user; $env:MSSQL_SA_PASSWORD = $auto.pass; $out = docker exec @(Get-SqlEnvArgs) $c bash /tmp/erp_cmp.sh 2>&1 | Out-String; Remove-Item Env:MSSQL_SA_PASSWORD, Env:ERP_SQL_USER -ErrorAction SilentlyContinue }
        for ($t = 1; $t -le 3 -and -not $auto; $t++) {
            $cr = Request-SqlCredential $(if ($t -eq 1) { "Compare cannot sign in to $c. Enter the SQL username and password." } else { "Sign-in failed. Try again (try $t of 3)." }) $false "" "en"
            if (-not $cr) { break }
            $env:ERP_SQL_USER = $cr.user; $env:MSSQL_SA_PASSWORD = $cr.pass
            $out = docker exec @(Get-SqlEnvArgs) $c bash /tmp/erp_cmp.sh 2>&1 | Out-String
            Remove-Item Env:MSSQL_SA_PASSWORD, Env:ERP_SQL_USER -ErrorAction SilentlyContinue
            if ($out -notmatch 'Login failed|ERR_NO_PASSWORD_ENV') { break }
            Write-Host "  Login failed (try $t of 3)." -ForegroundColor Yellow
        }
    }
    docker exec -u 0 $c rm -f /tmp/erp_cmp.sh | Out-Null
    if ($out -match 'ERR_NO_PASSWORD_ENV') { Write-Host "  no SA password variable in this container." -ForegroundColor Yellow; return }
    if ($out -match 'Login failed') { Write-Host "  login failed: the SQL password does not match this database." -ForegroundColor Red; return }
    $mig = @(); $cur = ""
    foreach ($l in ($out -split "`n")) {
        $l = $l.Trim()
        if ($l -like "DB|*") { if ($cur) { Summarize $cur $mig }; $cur = $l.Substring(3); $mig = @(); Write-Host ("  Database: " + $cur) -ForegroundColor White }
        elseif ($l -like "TABLES|*") { Write-Host ("    tables: " + $l.Substring(7)) }
        elseif ($l -like "ROWS|*") { Write-Host ("    rows (all tables): " + $l.Substring(5)) }
        elseif ($l -like "MIG|*") { $mig += $l.Substring(4) }
        elseif ($l -eq "NOHISTORY") { Write-Host "    no EF migration history table" }
    }
    if ($cur) { Summarize $cur $mig }
}
function Summarize($db, $mig) {
    if ($mig.Count -eq 0) { return }
    Write-Host ("    migrations applied: " + $mig.Count + "   (this version has " + $known.Count + ")")
    Write-Host ("    last 3: " + (($mig | Select-Object -Last 3) -join ", "))
    $unknown = @($mig | Where-Object { $known -notcontains $_ })
    $missing = @($known | Where-Object { $mig -notcontains $_ })
    if ($unknown.Count -gt 0) { Write-Host ("    NOT KNOWN to this version (" + $unknown.Count + "): " + ($unknown -join ", ")) -ForegroundColor Red }
    else { Write-Host ("    all applied migrations are known to this version. Still to apply on start: " + $missing.Count) -ForegroundColor Green }
}
$envFile = Join-Path $Root ".env"; $sa = ""
if (Test-Path $envFile) { $t = [IO.File]::ReadAllText($envFile, [Text.Encoding]::UTF8); if ($t -match "(?m)^[ \t]*SQL_SA_PASSWORD[ \t]*=[ \t]*([^\r\n]*)") { $sa = $Matches[1].Trim() } }
Probe $Old ""
Probe $New $sa
Write-Host ""; Write-Host "Read-only. Nothing was changed." -ForegroundColor Green
