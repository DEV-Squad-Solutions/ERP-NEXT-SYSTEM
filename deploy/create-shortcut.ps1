<#
 Creates a desktop shortcut "ERP Installer" with the ERP icon that opens the installer window.
 Works from the package (ERP Installer.bat next to the app folder) and from the deploy folder of the repo.
 It only creates one .lnk file on the Desktop. Nothing else is changed.
#>
$ErrorActionPreference = "Stop"
try {
    $pkgBat = Join-Path (Split-Path $PSScriptRoot -Parent) "ERP Installer.bat"
    $target = $(if (Test-Path $pkgBat) { $pkgBat } else { Join-Path $PSScriptRoot "install-or-update.bat" })
    $icon = Join-Path $PSScriptRoot "erp-icon.ico"
    $desktop = [Environment]::GetFolderPath("Desktop")
    $lnk = Join-Path $desktop "ERP Installer.lnk"
    $sh = New-Object -ComObject WScript.Shell
    $s = $sh.CreateShortcut($lnk)
    $s.TargetPath = $target
    $s.WorkingDirectory = (Split-Path $target -Parent)
    $s.WindowStyle = 7
    $s.Description = "ERP System installer"
    if (Test-Path $icon) { $s.IconLocation = "$icon,0" }
    $s.Save()
    Write-Host "Shortcut created on the Desktop: $lnk" -ForegroundColor Green
    Write-Host "It points to: $target"
    exit 0
}
catch { Write-Host "Could not create the shortcut: $($_.Exception.Message)" -ForegroundColor Red; exit 1 }
