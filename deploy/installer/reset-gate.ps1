<#
 Reset the installer password. Needs: Administrator rights, this PC, and a typed confirmation.
 The old gate file is kept (renamed .reset-<time>), nothing else is touched. The next run asks for a NEW password.
 HONEST LIMIT: anyone who is Administrator on this PC can do this. The gate is not protection against that person.
#>
$Root = $(if (Test-Path (Join-Path $PSScriptRoot "docker-compose.yml")) { $PSScriptRoot } else { Split-Path $PSScriptRoot -Parent })
$gate = Join-Path $Root ".installer-gate.json"
$admin = $false
try { $admin = (New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator) } catch { }
if (-not $admin) { Write-Host "STOPPED: run this as Administrator (right-click, Run as administrator). Nothing was changed." -ForegroundColor Red; [void](Read-Host "Press Enter to close"); exit 1 }
if (-not (Test-Path $gate)) { Write-Host "No installer password is set. Nothing to reset." -ForegroundColor Yellow; [void](Read-Host "Press Enter to close"); exit 0 }
Write-Host ("This PC: {0}. The installer password will be removed and you will choose a new one at the next run." -f $env:COMPUTERNAME) -ForegroundColor Cyan
$c = Read-Host "Type exactly RESET INSTALLER PASSWORD to continue (anything else cancels)"
if ($c -cne "RESET INSTALLER PASSWORD") { Write-Host "Cancelled. Nothing was changed." -ForegroundColor Yellow; [void](Read-Host "Press Enter to close"); exit 0 }
Move-Item $gate ($gate + ".reset-" + (Get-Date -Format "yyyyMMdd_HHmmss")) -Force
Write-Host "Done. The next run of the installer asks for a new password." -ForegroundColor Green
[void](Read-Host "Press Enter to close")
