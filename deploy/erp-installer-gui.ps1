<#
 ERP installer - graphical window (Windows PowerShell + WinForms, built in, no installs, no internet).
 It does not contain any install logic. It runs the proven scripts (install-or-update.ps1, rollback.ps1, status.ps1)
 as a child process and shows their output, so every safety rule stays in those scripts.
 Typed confirmations (UNRELATED, RESTORE, version number) appear as input boxes.
 Exit code 100 = the window could not start (the .bat then falls back to the console installer).
#>
param([string]$BackupDir = "C:\ERP_backup")
$ErrorActionPreference = "Stop"
try {
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing
    [System.Windows.Forms.Application]::EnableVisualStyles()
    . (Join-Path $PSScriptRoot "messages-ar.ps1")
}
catch { exit 100 }

$script:lang = "en"
$script:proc = $null
$script:outFile = $null
$script:ioDir = $null
$script:pos = 0L
$script:buf = ""
$script:op = $null          # install | switch | status
$script:stepNames = @()
$script:stepLabels = @()
$script:curStep = 0
$script:failMsg = ""
$script:nextMsg = ""
$script:failKey = ""
$script:finished = $false
$script:recent = New-Object System.Collections.ArrayList

$T = @{
  en = @{
    title = "ERP System - Installer"; sub = "Install, update, switch version or check status. Data is never deleted."
    install = "Install / Update"; switchv = "Switch version / Roll back"; status = "Status"; close = "Close"
    steps = "Steps"; log = "Live log"; ready = "Ready. Choose an action."; running = "Running... please wait. Do not close this window."
    okTitle = "SUCCESS"; failTitle = "STOPPED - nothing was deleted, your data is safe"; cancelTitle = "Cancelled - nothing was changed"
    next = "What to do next"; busy = "An operation is running. Please wait until it finishes."
    ok = "OK"; cancel = "Cancel"; promptTitle = "Your input is needed"; version = "Version"; backup = "Backup"; logfile = "Log file"; open = "Open"
    s_install = @("Check Docker", "Install type and config", "Backup", "Load images", "Start services", "Health check")
    s_switch = @("Safety backup", "Restore database (optional)", "Switch code", "Health check")
    s_status = @("Read status")
    unexpected = "The operation ended unexpectedly. Send the log file to your developer."
  }
  ar = @{
    title = "نظام ERP - المثبّت"; sub = "تثبيت أو تحديث أو تبديل الإصدار أو فحص الحالة. الداتا مبتتمسحش أبداً."
    install = "تثبيت / تحديث"; switchv = "تبديل الإصدار / رجوع"; status = "الحالة"; close = "إغلاق"
    steps = "الخطوات"; log = "السجل المباشر"; ready = "جاهز. اختار إجراء."; running = "جاري التنفيذ... استنى. متقفلش النافذة دي."
    okTitle = "تم بنجاح"; failTitle = "اتوقف - مفيش حاجة اتمسحت والداتا سليمة"; cancelTitle = "اتلغى - مفيش حاجة اتغيّرت"
    next = "الخطوة الجاية"; busy = "فيه عملية شغالة. استنى لحد ما تخلص."
    ok = "موافق"; cancel = "إلغاء"; promptTitle = "محتاج إدخال منك"; version = "الإصدار"; backup = "النسخة الاحتياطية"; logfile = "ملف السجل"; open = "افتح"
    s_install = @("فحص Docker", "نوع التثبيت والإعدادات", "نسخة احتياطية", "تحميل الصور", "تشغيل الخدمات", "فحص الجاهزية")
    s_switch = @("نسخة أمان", "استرجاع الداتا (اختياري)", "تبديل الكود", "فحص الجاهزية")
    s_status = @("قراءة الحالة")
    unexpected = "العملية وقفت بشكل غير متوقع. ابعت ملف السجل للمطوّر."
  }
}
function L($k) { return $T[$script:lang][$k] }

# ---------------- UI ----------------
$font = New-Object System.Drawing.Font("Segoe UI", 10)
$form = New-Object System.Windows.Forms.Form
# fit small screens (e.g. 1366x768): never bigger than the usable work area
$wa = [System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea
$fw = [Math]::Min(980, $wa.Width - 20); $fh = [Math]::Min(700, $wa.Height - 10)
$form.Size = New-Object System.Drawing.Size($fw, $fh)
$form.MinimumSize = New-Object System.Drawing.Size([Math]::Min(760, $fw), [Math]::Min(560, $fh))
$form.StartPosition = "CenterScreen"
$iconFile = Join-Path $PSScriptRoot "erp-icon.ico"
if (Test-Path $iconFile) { try { $form.Icon = New-Object System.Drawing.Icon($iconFile) } catch {} }
$form.Font = $font
$form.BackColor = [System.Drawing.Color]::FromArgb(10, 13, 20)
$form.ForeColor = [System.Drawing.Color]::FromArgb(232, 238, 246)

$hdr = New-Object System.Windows.Forms.Panel
$hdr.Dock = "Top"; $hdr.Height = 84; $hdr.BackColor = [System.Drawing.Color]::FromArgb(0, 0, 0)
$lblTitle = New-Object System.Windows.Forms.Label
$lblTitle.ForeColor = "White"; $lblTitle.Font = New-Object System.Drawing.Font("Segoe UI", 16, [System.Drawing.FontStyle]::Bold)
$lblTitle.AutoSize = $true; $lblTitle.Location = New-Object System.Drawing.Point((20 + $script:logoW), 14)
$lblSub = New-Object System.Windows.Forms.Label
$lblSub.ForeColor = [System.Drawing.Color]::FromArgb(120, 190, 235); $lblSub.AutoSize = $true; $lblSub.Location = New-Object System.Drawing.Point((22 + $script:logoW), 48)
$btnEn = New-Object System.Windows.Forms.Button; $btnEn.Text = "English"; $btnEn.Width = 90; $btnEn.Height = 30; $btnEn.FlatStyle = "Flat"; $btnEn.ForeColor = "White"; $btnEn.BackColor = [System.Drawing.Color]::FromArgb(24, 44, 72); $btnEn.FlatAppearance.BorderColor = [System.Drawing.Color]::FromArgb(47, 140, 230)
$btnAr = New-Object System.Windows.Forms.Button; $btnAr.Text = "العربية"; $btnAr.Width = 90; $btnAr.Height = 30; $btnAr.FlatStyle = "Flat"; $btnAr.ForeColor = "White"; $btnAr.BackColor = [System.Drawing.Color]::FromArgb(24, 44, 72); $btnAr.FlatAppearance.BorderColor = [System.Drawing.Color]::FromArgb(47, 140, 230)
$logoFile = Join-Path $PSScriptRoot "devsquad-header.png"
$script:logoW = 0
$pic = New-Object System.Windows.Forms.PictureBox
$pic.SizeMode = "Zoom"; $pic.BackColor = [System.Drawing.Color]::Transparent
if (Test-Path $logoFile) { try { $pic.Image = [System.Drawing.Image]::FromFile($logoFile); $pic.Size = New-Object System.Drawing.Size(146, 72); $pic.Location = New-Object System.Drawing.Point(14, 6); $script:logoW = 160 } catch {} }
$hdr.Controls.AddRange(@($pic, $lblTitle, $lblSub, $btnEn, $btnAr))

$bar = New-Object System.Windows.Forms.FlowLayoutPanel
$bar.Dock = "Top"; $bar.Height = 60; $bar.Padding = New-Object System.Windows.Forms.Padding(14, 10, 14, 6); $bar.WrapContents = $false; $bar.BackColor = [System.Drawing.Color]::FromArgb(16, 21, 31)
function New-Btn($color) {
    $b = New-Object System.Windows.Forms.Button
    $b.Width = 200; $b.Height = 40; $b.Cursor = [System.Windows.Forms.Cursors]::Hand; $b.FlatStyle = "Flat"; $b.BackColor = $color; $b.ForeColor = "White"
    $b.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold); $b.FlatAppearance.BorderSize = 0
    $b.Margin = New-Object System.Windows.Forms.Padding(4, 0, 4, 0)
    return $b
}
$btnInstall = New-Btn ([System.Drawing.Color]::FromArgb(37, 120, 214))
$btnSwitch = New-Btn ([System.Drawing.Color]::FromArgb(170, 105, 20))
$btnStatus = New-Btn ([System.Drawing.Color]::FromArgb(22, 135, 160))
$btnClose = New-Btn ([System.Drawing.Color]::FromArgb(72, 80, 94))
$btnClose.Width = 100
$bar.Controls.AddRange(@($btnInstall, $btnSwitch, $btnStatus, $btnClose))

$prog = New-Object System.Windows.Forms.ProgressBar
$prog.Dock = "Top"; $prog.Height = 10; $prog.Style = "Continuous"
$lblState = New-Object System.Windows.Forms.Label
$lblState.Dock = "Top"; $lblState.Height = 28; $lblState.Padding = New-Object System.Windows.Forms.Padding(14, 5, 14, 0)

$stepsBox = New-Object System.Windows.Forms.GroupBox
$stepsBox.Dock = "Top"; $stepsBox.Height = 96; $stepsBox.Padding = New-Object System.Windows.Forms.Padding(8, 4, 8, 4)
$stepsPanel = New-Object System.Windows.Forms.TableLayoutPanel
$stepsPanel.Dock = "Fill"; $stepsPanel.ColumnCount = 3; $stepsPanel.RowCount = 2
$stepsBox.Controls.Add($stepsPanel)

$result = New-Object System.Windows.Forms.Label
$result.Dock = "Bottom"; $result.Height = 118; $result.AutoEllipsis = $true; $result.Padding = New-Object System.Windows.Forms.Padding(14, 8, 14, 8)
$result.Font = New-Object System.Drawing.Font("Segoe UI", 10); $result.Visible = $false

$logBox = New-Object System.Windows.Forms.GroupBox
$logBox.Dock = "Fill"; $logBox.Padding = New-Object System.Windows.Forms.Padding(8, 4, 8, 8)
$log = New-Object System.Windows.Forms.RichTextBox
$log.Dock = "Fill"; $log.ReadOnly = $true; $log.BackColor = [System.Drawing.Color]::FromArgb(5, 8, 13); $log.ForeColor = [System.Drawing.Color]::Gainsboro
$log.Font = New-Object System.Drawing.Font("Consolas", 10); $log.BorderStyle = "None"; $log.RightToLeft = "No"; $log.WordWrap = $true
$logBox.Controls.Add($log)

# dock order: last added docks first
$form.Controls.Add($logBox)
$form.Controls.Add($result)
$form.Controls.Add($stepsBox)
$form.Controls.Add($lblState)
$form.Controls.Add($prog)
$form.Controls.Add($bar)
$form.Controls.Add($hdr)

function Layout-Header {
    if ($script:lang -eq "ar") {
        $btnEn.Location = New-Object System.Drawing.Point(14, 27); $btnAr.Location = New-Object System.Drawing.Point(110, 27)
        $pic.Location = New-Object System.Drawing.Point(($form.ClientSize.Width - 160), 6)
    } else {
        $btnAr.Location = New-Object System.Drawing.Point(($form.ClientSize.Width - 110), 27)
        $btnEn.Location = New-Object System.Drawing.Point(($form.ClientSize.Width - 206), 27)
        $pic.Location = New-Object System.Drawing.Point(14, 6)
    }
}
$form.Add_Resize({ Layout-Header })

function Write-Log([string]$text, $color) {
    $log.SelectionStart = $log.TextLength
    $log.SelectionColor = $color
    $log.AppendText($text + "`r`n")
    $log.SelectionStart = $log.TextLength
    $log.ScrollToCaret()
}

function Build-Steps([string[]]$names) {
    $script:stepNames = $names
    $stepsPanel.Controls.Clear()
    $stepsPanel.ColumnStyles.Clear()
    $cols = 3
    $stepsPanel.ColumnCount = $cols
    for ($c = 0; $c -lt $cols; $c++) { [void]$stepsPanel.ColumnStyles.Add((New-Object System.Windows.Forms.ColumnStyle("Percent", 33.3))) }
    $script:stepLabels = @()
    for ($i = 0; $i -lt $names.Count; $i++) {
        $l = New-Object System.Windows.Forms.Label
        $l.AutoSize = $false; $l.Dock = "Fill"; $l.TextAlign = "MiddleLeft"
        $l.Text = ("   {0}  {1}" -f [char]0x25CB, $names[$i])
        $l.ForeColor = [System.Drawing.Color]::FromArgb(130, 140, 155)
        $stepsPanel.Controls.Add($l)
        $script:stepLabels += $l
    }
}
function Set-Step([int]$i, [string]$state) {   # state: run | ok | fail | skip | pending
    if ($i -lt 1 -or $i -gt $script:stepLabels.Count) { return }
    $l = $script:stepLabels[$i - 1]; $n = $script:stepNames[$i - 1]
    switch ($state) {
        "run"  { $l.Text = ("   {0}  {1}" -f [char]0x25B6, $n); $l.ForeColor = [System.Drawing.Color]::FromArgb(90, 200, 255); $l.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold) }
        "ok"   { $l.Text = ("   {0}  {1}" -f [char]0x2714, $n); $l.ForeColor = [System.Drawing.Color]::FromArgb(80, 215, 130); $l.Font = $font }
        "fail" { $l.Text = ("   {0}  {1}" -f [char]0x2716, $n); $l.ForeColor = [System.Drawing.Color]::FromArgb(255, 105, 115); $l.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold) }
        "skip" { $l.Text = ("   -  {0}" -f $n); $l.ForeColor = [System.Drawing.Color]::FromArgb(130, 140, 155); $l.Font = $font }
    }
}

function Apply-Lang {
    $rtl = ($script:lang -eq "ar")
    $form.RightToLeft = $(if ($rtl) { "Yes" } else { "No" })
    $form.RightToLeftLayout = $rtl
    foreach ($c in @($bar, $stepsBox, $logBox, $result, $lblState)) { $c.RightToLeft = $form.RightToLeft }
    $log.RightToLeft = "No"
    $form.Text = (L "title"); $lblTitle.Text = (L "title"); $lblSub.Text = (L "sub")
    $btnInstall.Text = (L "install"); $btnSwitch.Text = (L "switchv"); $btnStatus.Text = (L "status"); $btnClose.Text = (L "close")
    $stepsBox.Text = (L "steps"); $logBox.Text = (L "log")
    if ($rtl) { $lblTitle.Location = New-Object System.Drawing.Point(($form.ClientSize.Width - $lblTitle.Width - 20 - $script:logoW), 14); $lblSub.Location = New-Object System.Drawing.Point(($form.ClientSize.Width - $lblSub.Width - 22 - $script:logoW), 48) }
    else { $lblTitle.Location = New-Object System.Drawing.Point((20 + $script:logoW), 14); $lblSub.Location = New-Object System.Drawing.Point((22 + $script:logoW), 48) }
    if (-not $script:proc) { $lblState.Text = (L "ready") } else { $lblState.Text = (L "running") }
    if ($script:op) { $key = "s_" + $script:op; $cur = $script:curStep; Build-Steps (L $key); for ($i = 1; $i -lt $cur; $i++) { Set-Step $i "ok" }; if ($script:proc -and $cur -gt 0) { Set-Step $cur "run" } }
        if ($rtl) { $pic.Location = New-Object System.Drawing.Point(($form.ClientSize.Width - 160), 6) } else { $pic.Location = New-Object System.Drawing.Point(14, 6) }
    Layout-Header
}

function Set-Busy([bool]$b) {
    $btnInstall.Enabled = -not $b; $btnSwitch.Enabled = -not $b; $btnStatus.Enabled = -not $b
    $btnEn.Enabled = $true; $btnAr.Enabled = $true
    if ($b) { $prog.Style = "Marquee"; $prog.MarqueeAnimationSpeed = 30; $lblState.Text = (L "running") }
    else { $prog.Style = "Continuous"; $prog.MarqueeAnimationSpeed = 0 }
}

function Show-Result([string]$kind, [string]$text) {   # kind: ok | fail | cancel
    $result.Visible = $true
    switch ($kind) {
        "ok"     { $result.BackColor = [System.Drawing.Color]::FromArgb(214, 241, 222); $result.ForeColor = [System.Drawing.Color]::FromArgb(10, 90, 40) }
        "fail"   { $result.BackColor = [System.Drawing.Color]::FromArgb(250, 220, 222); $result.ForeColor = [System.Drawing.Color]::FromArgb(140, 20, 30) }
        default  { $result.BackColor = [System.Drawing.Color]::FromArgb(255, 240, 205); $result.ForeColor = [System.Drawing.Color]::FromArgb(120, 80, 0) }
    }
    $result.Text = $text
}

function Ask-Input([string]$prompt) {
    $dlg = New-Object System.Windows.Forms.Form
    $dlg.Text = (L "promptTitle"); $dlg.ClientSize = New-Object System.Drawing.Size([Math]::Min(720, $wa.Width - 40), [Math]::Min(470, $wa.Height - 60)); $dlg.StartPosition = "CenterParent"; $dlg.Font = $font
    $dlg.RightToLeft = $form.RightToLeft; $dlg.RightToLeftLayout = ($script:lang -eq "ar")
    $dlg.FormBorderStyle = "FixedDialog"; $dlg.MaximizeBox = $false; $dlg.MinimizeBox = $false
    $ctx = New-Object System.Windows.Forms.TextBox
    $ctx.Multiline = $true; $ctx.ReadOnly = $true; $ctx.ScrollBars = "Vertical"; $ctx.RightToLeft = "No"; $ctx.Font = New-Object System.Drawing.Font("Consolas", 9.5)
        $ctx.Text = (($script:recent | Select-Object -Last 22) -join "`r`n")
    $ctx.SelectionStart = $ctx.TextLength; $ctx.ScrollToCaret()
    $lbl = New-Object System.Windows.Forms.Label
    $lbl.Dock = "Top"; $lbl.Height = 70; $lbl.Padding = New-Object System.Windows.Forms.Padding(8, 8, 8, 0); $lbl.RightToLeft = "No"; $lbl.Text = $prompt
    $lbl.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
    $tb = New-Object System.Windows.Forms.TextBox; $tb.Dock = "Top"; $tb.RightToLeft = "No"; $tb.Font = New-Object System.Drawing.Font("Segoe UI", 12)
    $pnl = New-Object System.Windows.Forms.FlowLayoutPanel; $pnl.Dock = "Bottom"; $pnl.Height = 52; $pnl.Padding = New-Object System.Windows.Forms.Padding(8)
    $ok = New-Object System.Windows.Forms.Button; $ok.Text = (L "ok"); $ok.Width = 110; $ok.Height = 34; $ok.DialogResult = "OK"
    $cn = New-Object System.Windows.Forms.Button; $cn.Text = (L "cancel"); $cn.Width = 110; $cn.Height = 34; $cn.DialogResult = "Cancel"
    $pnl.Controls.AddRange(@($ok, $cn))
    $ctx.Dock = "Fill"; $ctx.Height = 100
    $dlg.Controls.Add($ctx); $dlg.Controls.Add($tb); $dlg.Controls.Add($lbl); $dlg.Controls.Add($pnl)
    $dlg.AcceptButton = $ok; $dlg.CancelButton = $cn
    $dlg.ActiveControl = $tb
    $r = $dlg.ShowDialog($form)
    $ans = $(if ($r -eq "OK") { $tb.Text.Trim() } else { "" })
    $dlg.Dispose()
    return $ans
}

function Handle-Line([string]$line) {
    if ($line.Length -eq 0) { return }
    if ($line.StartsWith("@@PROMPT|")) {
        $p = $line.Split("|", 3)
        $timer.Stop()
        $ans = Ask-Input $p[2]
        $timer.Start()
        $f = Join-Path $script:ioDir ("answer-" + $p[1] + ".txt")
        [IO.File]::WriteAllText($f, $ans, (New-Object Text.UTF8Encoding($false)))
        Write-Log ("   > " + $(if ($ans) { $ans } else { "(cancelled)" })) ([System.Drawing.Color]::LightSkyBlue)
        return
    }
    if ($line.StartsWith("@@FAIL|")) { $script:failKey = $line.Substring(7); return }
    if ($line.StartsWith("@@CANCEL")) { $script:cancelled = $true; return }
    if ($line.StartsWith("@@DONE|")) {
        $script:done = $line.Split("|")
        return
    }
    $script:recent.Add($line) | Out-Null
    if ($script:recent.Count -gt 200) { $script:recent.RemoveAt(0) }
    $color = [System.Drawing.Color]::Gainsboro
    if ($line -match '^\[(\d)(?:/\d)?\]\s') {
        $n = [int]$Matches[1]
        if ($script:curStep -gt 0 -and $script:curStep -lt $n) { for ($k = $script:curStep; $k -lt $n; $k++) { Set-Step $k "ok" } }
        $script:curStep = $n
        Set-Step $n "run"
        $color = [System.Drawing.Color]::FromArgb(110, 200, 255)
        $lblState.Text = ("{0}  [{1}/{2}]" -f (L "running"), $n, $script:stepNames.Count)
    }
    elseif ($line -match '^\s+OK\s') { $color = [System.Drawing.Color]::FromArgb(90, 220, 120) }
    elseif ($line -match '^\s+FAIL\s') { $color = [System.Drawing.Color]::FromArgb(255, 110, 110); $script:failMsg = ($line -replace '^\s+FAIL\s+', '') }
    elseif ($line -match '^\s*What to do next:\s*(.*)$') { $script:nextMsg = $Matches[1]; $color = [System.Drawing.Color]::Gold }
    elseif ($line -match '^\s+\.\.\s') { $color = [System.Drawing.Color]::Silver }
    elseif ($line -match 'WARNING|IMPORTANT') { $color = [System.Drawing.Color]::Gold }
    Write-Log $line $color
}

function Finish-Run {
    $timer.Stop()
    $script:finished = $true
    $code = $null
    try { $code = $script:proc.ExitCode } catch { }
    $script:proc = $null
    Set-Busy $false
    $prog.Value = 0
    if ($script:done) {
        for ($k = 1; $k -le $script:stepLabels.Count; $k++) { if ($script:stepLabels[$k - 1].Text -match [char]0x25B6) { Set-Step $k "ok" } }
        $prog.Value = 100
        $d = $script:done
        $mode = $d[1]; $ver = $d[2]; $bak = $d[3]; $lf = $d[4]
        $lblState.Text = (L "okTitle")
        if ($mode -eq "STATUS") { Set-Step 1 "ok"; Show-Result "ok" ((L "okTitle")); return }
        $lines = @((L "okTitle"), ("{0}: {1}" -f (L "version"), $ver), ("{0}: {1}" -f (L "open"), "http://localhost   (http://192.168.1.5)"))
        if ($bak) { $lines += ("{0}: {1}" -f (L "backup"), $bak) }
        if ($lf) { $lines += ("{0}: {1}" -f (L "logfile"), $lf) }
        if ($script:lang -eq "ar") {
            $key = $(if ($mode -eq "UPDATE") { "okupd" } elseif ($mode -eq "INSTALL") { "okfresh" } else { "" })
            if ($key) { $lines = @($AR[$key]) + $lines[1..($lines.Count - 1)] }
        }
        Show-Result "ok" ($lines -join "`r`n")
        return
    }
    if ($script:cancelled) { $lblState.Text = (L "cancelTitle"); Show-Result "cancel" (L "cancelTitle"); return }
    for ($k = 1; $k -le $script:stepLabels.Count; $k++) { if ($script:stepLabels[$k - 1].Text -match [char]0x25B6) { Set-Step $k "fail" } }
    $lblState.Text = (L "failTitle")
    $msg = ""
    if ($script:lang -eq "ar" -and $script:failKey -and $AR.ContainsKey($script:failKey)) { $msg = $AR[$script:failKey] }
    elseif ($script:failMsg) { $msg = $script:failMsg; if ($script:nextMsg) { $msg += "`r`n" + (L "next") + ": " + $script:nextMsg } }
    else { $msg = (L "unexpected") }
    Show-Result "fail" ((L "failTitle") + "`r`n`r`n" + $msg)
}

$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 400
$timer.Add_Tick({
    try {
        if (Test-Path $script:outFile) {
            $fs = [IO.File]::Open($script:outFile, "Open", "Read", "ReadWrite")
            try {
                [void]$fs.Seek($script:pos, "Begin")
                $bytes = New-Object byte[] ([int]($fs.Length - $script:pos))
                if ($bytes.Length -gt 0) {
                    [void]$fs.Read($bytes, 0, $bytes.Length)
                    $script:pos = $fs.Length
                    $script:buf += [Text.Encoding]::UTF8.GetString($bytes).Replace([string][char]0xFEFF, "")
                }
            } finally { $fs.Dispose() }
            while ($true) {
                $idx = $script:buf.IndexOf("`n")
                if ($idx -lt 0) { break }
                $line = $script:buf.Substring(0, $idx).TrimEnd("`r")
                $script:buf = $script:buf.Substring($idx + 1)
                Handle-Line $line
            }
        }
        if ($script:proc -and $script:proc.HasExited) {
            $timer.Stop()
            # flush what is left
            if ($script:buf.Length -gt 0) { Handle-Line $script:buf.TrimEnd("`r"); $script:buf = "" }
            Finish-Run
        }
    } catch { Write-Log ("GUI error: " + $_.Exception.Message) ([System.Drawing.Color]::OrangeRed) }
})

function Start-Op([string]$op) {
    if ($script:proc) { [void][System.Windows.Forms.MessageBox]::Show((L "busy")); return }
    $script:op = $op; $script:curStep = 0; $script:failMsg = ""; $script:nextMsg = ""; $script:failKey = ""
    $script:done = $null; $script:cancelled = $false; $script:finished = $false; $script:pos = 0L; $script:buf = ""
    $script:recent.Clear()
    $result.Visible = $false; $log.Clear(); $prog.Value = 0
    Build-Steps (L ("s_" + $op))
    $engine = switch ($op) { "install" { "install-or-update.ps1" } "switch" { "rollback.ps1" } default { "status.ps1" } }
    $script:ioDir = Join-Path $env:TEMP ("erp-installer-" + [guid]::NewGuid().ToString("N"))
    New-Item -ItemType Directory -Force -Path $script:ioDir | Out-Null
    $script:outFile = Join-Path $script:ioDir "out.txt"
    $inner = ('powershell.exe -NoProfile -ExecutionPolicy Bypass -File "{0}" -Gui -IoDir "{1}" -BackupDir "{2}" > "{3}" 2>&1' -f (Join-Path $PSScriptRoot $engine), $script:ioDir, $BackupDir, $script:outFile)
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "cmd.exe"; $psi.Arguments = '/s /c "' + $inner + '"'
    $psi.UseShellExecute = $false; $psi.CreateNoWindow = $true; $psi.WorkingDirectory = $PSScriptRoot
    Set-Busy $true
    try { $script:proc = [System.Diagnostics.Process]::Start($psi) }
    catch { Set-Busy $false; Show-Result "fail" ((L "failTitle") + "`r`n" + $_.Exception.Message); return }
    $timer.Start()
}

$btnInstall.Add_Click({ Start-Op "install" })
$btnSwitch.Add_Click({ Start-Op "switch" })
$btnStatus.Add_Click({ Start-Op "status" })
$btnClose.Add_Click({ $form.Close() })
$btnEn.Add_Click({ $script:lang = "en"; Apply-Lang })
$btnAr.Add_Click({ $script:lang = "ar"; Apply-Lang })
$form.Add_FormClosing({
    if ($script:proc -and -not $script:proc.HasExited) {
        [void][System.Windows.Forms.MessageBox]::Show((L "busy"))
        $_.Cancel = $true
    }
})

Build-Steps (L "s_install")
Apply-Lang
Layout-Header
Write-Log "ERP installer ready. Choose an action above." ([System.Drawing.Color]::Silver)
[void]$form.ShowDialog()
exit 0
