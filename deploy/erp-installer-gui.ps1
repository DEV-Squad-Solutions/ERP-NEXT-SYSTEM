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
    install = "Install / Update"; switchv = "Switch / Roll back"; status = "Status"; close = "Close"
    steps = "Steps"; log = "Live log"; ready = "Ready. Choose an action."; running = "Running... please wait. Do not close this window."
    okTitle = "SUCCESS"; failTitle = "STOPPED - nothing was deleted, your data is safe"; cancelTitle = "Cancelled - nothing was changed"
    next = "What to do next"; busy = "An operation is running. Please wait until it finishes."
    ok = "OK"; cancel = "Cancel"; promptTitle = "Your input is needed"; version = "Version"; backup = "Backup"; logfile = "Log file"; oldbak = "Old SQL container backup"; copylog = "Copy log"; copied = "Copied"; tipInstall = "Install a new version or update. A backup is taken first."; tipSwitch = "Go back to an earlier installed version."; tipStatus = "Read-only check of what is running."; tipCopy = "Copy the whole log to the clipboard"; open = "Open"
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
    ok = "موافق"; cancel = "إلغاء"; promptTitle = "محتاج إدخال منك"; version = "الإصدار"; backup = "النسخة الاحتياطية"; logfile = "ملف السجل"; oldbak = "نسخة الـ SQL القديم"; copylog = "نسخ السجل"; copied = "تم النسخ"; tipInstall = "تثبيت أو تحديث. بياخد نسخة احتياطية الأول."; tipSwitch = "الرجوع لإصدار متثبّت قبل كده."; tipStatus = "فحص للقراءة بس للي شغال."; tipCopy = "نسخ السجل كله"; open = "افتح"
    s_install = @("فحص Docker", "نوع التثبيت والإعدادات", "نسخة احتياطية", "تحميل الصور", "تشغيل الخدمات", "فحص الجاهزية")
    s_switch = @("نسخة أمان", "استرجاع الداتا (اختياري)", "تبديل الكود", "فحص الجاهزية")
    s_status = @("قراءة الحالة")
    unexpected = "العملية وقفت بشكل غير متوقع. ابعت ملف السجل للمطوّر."
  }
}
function L($k) { return $T[$script:lang][$k] }

# ---------------- UI ----------------
# Palette (Dev Squad): near-black surfaces, blue/cyan accents, light text
$cBg = [System.Drawing.Color]::FromArgb(10, 13, 20)
$cSide = [System.Drawing.Color]::FromArgb(0, 0, 0)
$cCard = [System.Drawing.Color]::FromArgb(17, 23, 34)
$cBorder = [System.Drawing.Color]::FromArgb(34, 46, 66)
$cText = [System.Drawing.Color]::FromArgb(232, 238, 246)
$cMuted = [System.Drawing.Color]::FromArgb(140, 152, 170)
$cBlue = [System.Drawing.Color]::FromArgb(37, 120, 214)
$cCyan = [System.Drawing.Color]::FromArgb(90, 200, 255)
$cGreen = [System.Drawing.Color]::FromArgb(80, 215, 130)
$cRed = [System.Drawing.Color]::FromArgb(255, 105, 115)
$font = New-Object System.Drawing.Font("Segoe UI", 10)
$fontB = New-Object System.Drawing.Font("Segoe UI Semibold", 10)
$form = New-Object System.Windows.Forms.Form
# fit small screens (e.g. 1366x768): never bigger than the usable work area
$wa = [System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea
$fw = [Math]::Min(1000, $wa.Width - 20); $fh = [Math]::Min(700, $wa.Height - 10)
$form.Size = New-Object System.Drawing.Size($fw, $fh)
$form.MinimumSize = New-Object System.Drawing.Size([Math]::Min(780, $fw), [Math]::Min(560, $fh))
$form.StartPosition = "CenterScreen"
$iconFile = Join-Path $PSScriptRoot "erp-icon.ico"
if (Test-Path $iconFile) { try { $form.Icon = New-Object System.Drawing.Icon($iconFile) } catch {} }
$form.Font = $font
$form.BackColor = $cBg
$form.ForeColor = $cText

# ---------------- animation engine: one 30 ms timer; any error turns animations off and snaps to the final values ----------------
$cCyanDark = [System.Drawing.Color]::FromArgb(30, 110, 160)
$script:animOn = $true
$script:tw = New-Object System.Collections.ArrayList
$script:fades = New-Object System.Collections.ArrayList
$script:clock = [System.Diagnostics.Stopwatch]::StartNew()
$script:progCur = 0.0; $script:progTarget = 0.0; $script:busy = $false; $script:pulseIdx = 0
$script:resTarget = 0; $script:copiedUntil = 0
function Mix($a, $b, [double]$t) {
    return [System.Drawing.Color]::FromArgb([int]($a.R + ($b.R - $a.R) * $t), [int]($a.G + ($b.G - $a.G) * $t), [int]($a.B + ($b.B - $a.B) * $t))
}
function Tween($c, $to, [int]$ms = 180) {
    if (-not $script:animOn) { $c.BackColor = $to; return }
    for ($i = $script:tw.Count - 1; $i -ge 0; $i--) { if ([object]::ReferenceEquals($script:tw[$i].c, $c)) { $script:tw.RemoveAt($i) } }
    [void]$script:tw.Add(@{ c = $c; from = $c.BackColor; to = $to; t0 = $script:clock.ElapsedMilliseconds; ms = $ms })
}
function Set-Prog([double]$f) { $script:progTarget = $f; if ($f -le 0) { $script:progCur = 0.0 } }

function New-Panel($color) { $p = New-Object System.Windows.Forms.Panel; $p.BackColor = $color; $p.Margin = New-Object System.Windows.Forms.Padding(0); return $p }
function Round-Region($c, [int]$r) {
    if ($c.Width -lt 4 -or $c.Height -lt 4) { return }
    $gp = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $r * 2; $w = $c.Width; $h = $c.Height
    $gp.AddArc(0, 0, $d, $d, 180, 90); $gp.AddArc($w - $d, 0, $d, $d, 270, 90); $gp.AddArc($w - $d, $h - $d, $d, $d, 0, 90); $gp.AddArc(0, $h - $d, $d, $d, 90, 90); $gp.CloseFigure()
    $c.Region = New-Object System.Drawing.Region($gp)
}
function Make-Round($c, [int]$r) { $c.Add_Resize({ param($s, $e) Round-Region $s 9 }); Round-Region $c $r }
function New-Btn($color, $w = 200) {
    $b = New-Object System.Windows.Forms.Button
    $b.Width = $w; $b.Height = 44; $b.FlatStyle = "Flat"; $b.BackColor = $color; $b.ForeColor = "White"; $b.UseVisualStyleBackColor = $false
    $b.Font = $fontB; $b.FlatAppearance.BorderSize = 0; $b.Cursor = [System.Windows.Forms.Cursors]::Hand
    $b.Margin = New-Object System.Windows.Forms.Padding(0, 0, 0, 10); $b.TextAlign = "MiddleCenter"
    Make-Round $b 9
    $b.Tag = $color
    $b.FlatAppearance.MouseOverBackColor = $color; $b.FlatAppearance.MouseDownBackColor = $color
    $b.Add_MouseEnter({ param($s, $e) if ($s.Enabled) { Tween $s ([System.Windows.Forms.ControlPaint]::Light($s.Tag, 0.22)) 140 } })
    $b.Add_MouseLeave({ param($s, $e) Tween $s $s.Tag 220 })
    $b.Add_MouseDown({ param($s, $e) Tween $s ([System.Windows.Forms.ControlPaint]::Dark($s.Tag, 0.08)) 60 })
    $b.Add_MouseUp({ param($s, $e) if ($s.Enabled) { Tween $s ([System.Windows.Forms.ControlPaint]::Light($s.Tag, 0.22)) 100 } })
    return $b
}

# ----- left sidebar: logo, actions, language, close -----
$side = New-Panel $cSide
$side.Dock = "Fill"
$pic = New-Object System.Windows.Forms.PictureBox
$pic.SizeMode = "Zoom"; $pic.Dock = "Top"; $pic.Height = 170; $pic.BackColor = $cSide
$logoFile = Join-Path $PSScriptRoot "devsquad-logo.jpg"
if (Test-Path $logoFile) { try { $pic.Image = [System.Drawing.Image]::FromFile($logoFile) } catch {} }
$nav = New-Object System.Windows.Forms.FlowLayoutPanel
$nav.Dock = "Fill"; $nav.FlowDirection = "TopDown"; $nav.WrapContents = $false; $nav.Padding = New-Object System.Windows.Forms.Padding(14, 18, 14, 0); $nav.BackColor = $cSide
$btnInstall = New-Btn $cBlue 192
$btnSwitch = New-Btn ([System.Drawing.Color]::FromArgb(30, 41, 59)) 192
$btnStatus = New-Btn ([System.Drawing.Color]::FromArgb(30, 41, 59)) 192
foreach ($nb in @($btnInstall, $btnSwitch, $btnStatus)) { $nb.TextAlign = "MiddleLeft"; $nb.Padding = New-Object System.Windows.Forms.Padding(16, 0, 10, 0); $nb.Height = 46 }
$nav.Controls.AddRange(@($btnInstall, $btnSwitch, $btnStatus))
$foot = New-Panel $cSide
$foot.Dock = "Bottom"; $foot.Height = 112; $foot.Padding = New-Object System.Windows.Forms.Padding(14, 8, 14, 14)
$langRow = New-Object System.Windows.Forms.TableLayoutPanel
$langRow.Dock = "Top"; $langRow.Height = 38; $langRow.ColumnCount = 2; $langRow.RowCount = 1; $langRow.Margin = New-Object System.Windows.Forms.Padding(0)
[void]$langRow.ColumnStyles.Add((New-Object System.Windows.Forms.ColumnStyle("Percent", 50)))
[void]$langRow.ColumnStyles.Add((New-Object System.Windows.Forms.ColumnStyle("Percent", 50)))
$btnEn = New-Btn ([System.Drawing.Color]::FromArgb(24, 34, 52)) 90; $btnEn.Text = "English"; $btnEn.Dock = "Fill"; $btnEn.Height = 34; $btnEn.Margin = New-Object System.Windows.Forms.Padding(0, 0, 3, 0)
$btnAr = New-Btn ([System.Drawing.Color]::FromArgb(24, 34, 52)) 90; $btnAr.Text = "العربية"; $btnAr.Dock = "Fill"; $btnAr.Height = 34; $btnAr.Margin = New-Object System.Windows.Forms.Padding(3, 0, 0, 0)
foreach ($lb in @($btnEn, $btnAr)) { $lb.FlatAppearance.BorderSize = 1; $lb.FlatAppearance.BorderColor = $cBorder; $lb.Font = $font }
$langRow.Controls.Add($btnEn, 0, 0); $langRow.Controls.Add($btnAr, 1, 0)
$btnClose = New-Btn ([System.Drawing.Color]::FromArgb(60, 68, 84)) 192
$btnClose.Dock = "Bottom"; $btnClose.Height = 38; $btnClose.Margin = New-Object System.Windows.Forms.Padding(0)
$foot.Controls.Add($btnClose); $foot.Controls.Add($langRow)
$side.Controls.Add($nav); $side.Controls.Add($foot); $side.Controls.Add($pic)

# ----- right content -----
$content = New-Object System.Windows.Forms.TableLayoutPanel
$content.Dock = "Fill"; $content.ColumnCount = 1; $content.RowCount = 5; $content.BackColor = $cBg
$content.Margin = New-Object System.Windows.Forms.Padding(0); $content.Padding = New-Object System.Windows.Forms.Padding(24, 18, 24, 18)
[void]$content.ColumnStyles.Add((New-Object System.Windows.Forms.ColumnStyle("Percent", 100)))
foreach ($h in @(66, 46, 100)) { [void]$content.RowStyles.Add((New-Object System.Windows.Forms.RowStyle("Absolute", $h))) }
[void]$content.RowStyles.Add((New-Object System.Windows.Forms.RowStyle("Percent", 100)))
[void]$content.RowStyles.Add((New-Object System.Windows.Forms.RowStyle("AutoSize")))

$hdr = New-Panel $cBg
$lblTitle = New-Object System.Windows.Forms.Label
$lblTitle.Dock = "Top"; $lblTitle.Height = 36; $lblTitle.ForeColor = "White"; $lblTitle.Font = New-Object System.Drawing.Font("Segoe UI Semibold", 18)
$lblSub = New-Object System.Windows.Forms.Label
$lblSub.Dock = "Fill"; $lblSub.ForeColor = $cMuted; $lblSub.Font = $font
$verTxt = ""
$tarFound = Get-ChildItem @($PSScriptRoot, (Join-Path $PSScriptRoot "..\images")) -Filter "erp-images-*.tar" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($tarFound) { $verTxt = "v" + ($tarFound.BaseName -replace '^erp-images-', '') }
$chip = New-Object System.Windows.Forms.Label
$chip.Dock = "Right"; $chip.Width = 84; $chip.Text = $(if ($verTxt) { $verTxt } else { "ERP" }); $chip.TextAlign = "MiddleCenter"
$chip.Font = New-Object System.Drawing.Font("Segoe UI Semibold", 9.5); $chip.ForeColor = $cCyan; $chip.BackColor = [System.Drawing.Color]::FromArgb(14, 40, 68)
$chipHolder = New-Panel $cBg; $chipHolder.Dock = "Right"; $chipHolder.Width = 96; $chipHolder.Padding = New-Object System.Windows.Forms.Padding(0, 8, 0, 24)
$chip.Dock = "Fill"; $chipHolder.Controls.Add($chip); Make-Round $chip 8
$hdr.Controls.Add($lblSub); $hdr.Controls.Add($lblTitle); $hdr.Controls.Add($chipHolder)

$stateP = New-Panel $cBg
$lblState = New-Object System.Windows.Forms.Label
$lblState.Dock = "Fill"; $lblState.ForeColor = $cCyan; $lblState.Font = $fontB; $lblState.TextAlign = "MiddleLeft"
$prog = New-Panel ([System.Drawing.Color]::FromArgb(30, 40, 58))
$prog.Dock = "Bottom"; $prog.Height = 6
$progFill = New-Panel $cBlue; $progFill.Left = 0; $progFill.Top = 0; $progFill.Height = 6; $progFill.Width = 0
$shim = New-Panel ([System.Drawing.Color]::FromArgb(140, 205, 255)); $shim.Top = 0; $shim.Height = 6; $shim.Width = 70; $shim.Visible = $false
$progFill.Controls.Add($shim); $prog.Controls.Add($progFill)
$stateP.Controls.Add($lblState); $stateP.Controls.Add($prog)

$stepsBox = New-Panel $cBg
$stepsCap = New-Object System.Windows.Forms.Label
$stepsCap.Dock = "Top"; $stepsCap.Height = 22; $stepsCap.ForeColor = $cMuted; $stepsCap.Font = New-Object System.Drawing.Font("Segoe UI Semibold", 9)
$stepsPanel = New-Object System.Windows.Forms.TableLayoutPanel
$stepsPanel.Dock = "Fill"; $stepsPanel.ColumnCount = 3; $stepsPanel.RowCount = 1; $stepsPanel.BackColor = $cBg; $stepsPanel.Margin = New-Object System.Windows.Forms.Padding(0)
$stepsBox.Controls.Add($stepsPanel); $stepsBox.Controls.Add($stepsCap)

$logBox = New-Panel $cBorder
$logBox.Padding = New-Object System.Windows.Forms.Padding(1); $logBox.Margin = New-Object System.Windows.Forms.Padding(0, 6, 0, 0)
$logInner = New-Panel ([System.Drawing.Color]::FromArgb(5, 8, 13))
$logInner.Dock = "Fill"; $logInner.Padding = New-Object System.Windows.Forms.Padding(12, 8, 8, 8)
$logCap = New-Object System.Windows.Forms.Label
$logCap.Dock = "Top"; $logCap.Height = 22; $logCap.ForeColor = $cMuted; $logCap.Font = New-Object System.Drawing.Font("Segoe UI Semibold", 9); $logCap.BackColor = [System.Drawing.Color]::FromArgb(5, 8, 13)
$log = New-Object System.Windows.Forms.RichTextBox
$log.Dock = "Fill"; $log.ReadOnly = $true; $log.HideSelection = $false; $log.BorderStyle = "None"
$log.BackColor = [System.Drawing.Color]::FromArgb(5, 8, 13); $log.ForeColor = [System.Drawing.Color]::Gainsboro
$log.Font = New-Object System.Drawing.Font("Consolas", 10); $log.RightToLeft = "No"; $log.WordWrap = $true
$logHead = New-Panel ([System.Drawing.Color]::FromArgb(5, 8, 13)); $logHead.Dock = "Top"; $logHead.Height = 22
$logCap.Dock = "Fill"
$btnCopy = New-Object System.Windows.Forms.Label
$btnCopy.Dock = "Right"; $btnCopy.Width = 110; $btnCopy.TextAlign = "MiddleRight"; $btnCopy.ForeColor = $cCyan; $btnCopy.Cursor = [System.Windows.Forms.Cursors]::Hand
$btnCopy.Font = New-Object System.Drawing.Font("Segoe UI Semibold", 9); $btnCopy.BackColor = [System.Drawing.Color]::FromArgb(5, 8, 13)
$btnCopy.Add_MouseEnter({ param($s, $e) $s.ForeColor = [System.Drawing.Color]::White })
$btnCopy.Add_MouseLeave({ param($s, $e) $s.ForeColor = $cCyan })
$btnCopy.Add_Click({ try { if ($log.TextLength -gt 0) { [System.Windows.Forms.Clipboard]::SetText($log.Text); $btnCopy.Text = (L "copied"); $script:copiedUntil = $script:clock.ElapsedMilliseconds + 1600 } } catch { } })
$logHead.Controls.Add($logCap); $logHead.Controls.Add($btnCopy)
$logInner.Controls.Add($log); $logInner.Controls.Add($logHead)
$tip = New-Object System.Windows.Forms.ToolTip; $tip.InitialDelay = 300
$logBox.Controls.Add($logInner)

$result = New-Panel $cCard
$result.Margin = New-Object System.Windows.Forms.Padding(0, 12, 0, 0); $result.Height = 70; $result.Visible = $false
$resBar = New-Panel $cGreen; $resBar.Dock = "Left"; $resBar.Width = 6
$resTitle = New-Object System.Windows.Forms.Label
$resTitle.Dock = "Top"; $resTitle.Height = 32; $resTitle.Font = New-Object System.Drawing.Font("Segoe UI Semibold", 12); $resTitle.TextAlign = "MiddleLeft"; $resTitle.Padding = New-Object System.Windows.Forms.Padding(14, 6, 10, 0)
$resBody = New-Object System.Windows.Forms.Label
$resBody.Dock = "Fill"; $resBody.Font = New-Object System.Drawing.Font("Segoe UI", 10); $resBody.Padding = New-Object System.Windows.Forms.Padding(14, 0, 10, 8)
$result.Controls.Add($resBody); $result.Controls.Add($resTitle); $result.Controls.Add($resBar)
Make-Round $result 10
foreach ($c in @($hdr, $stateP, $stepsBox, $logBox, $result)) { $c.Dock = "Fill" }
$i = 0; foreach ($c in @($hdr, $stateP, $stepsBox, $logBox, $result)) { $content.Controls.Add($c, 0, $i); $i++ }

$root = New-Object System.Windows.Forms.TableLayoutPanel
$root.Dock = "Fill"; $root.ColumnCount = 2; $root.RowCount = 1; $root.Margin = New-Object System.Windows.Forms.Padding(0); $root.BackColor = $cBg
[void]$root.ColumnStyles.Add((New-Object System.Windows.Forms.ColumnStyle("Absolute", 224)))
[void]$root.ColumnStyles.Add((New-Object System.Windows.Forms.ColumnStyle("Percent", 100)))
$side.Dock = "Fill"
$root.Controls.Add($side, 0, 0); $root.Controls.Add($content, 1, 0)
$form.Controls.Add($root)

function Layout-Header { }

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
    $cols = [Math]::Max(1, $names.Count)
    $stepsPanel.ColumnCount = $cols
    for ($c = 0; $c -lt $cols; $c++) { [void]$stepsPanel.ColumnStyles.Add((New-Object System.Windows.Forms.ColumnStyle("Percent", (100.0 / $cols)))) }
    $script:stepLabels = @(); $script:stepStrips = @(); $script:pulseIdx = 0
    for ($i = 0; $i -lt $names.Count; $i++) {
        $card = New-Panel $cBg
        $card.Dock = "Fill"; $card.Margin = New-Object System.Windows.Forms.Padding(0, 0, 8, 0)
        $strip = New-Panel $cBg; $strip.Dock = "Top"; $strip.Height = 4
        $l = New-Object System.Windows.Forms.Label
        $l.AutoSize = $false; $l.Dock = "Fill"; $l.TextAlign = "MiddleCenter"
        $l.Font = New-Object System.Drawing.Font("Segoe UI", 9)
        $l.ForeColor = $cMuted
        $l.Text = ("{0}`r`n{1}" -f [char]0x25CB, $names[$i])
        $card.Controls.Add($l); $card.Controls.Add($strip)
        Make-Round $card 8
        Tween $card $cCard 450; Tween $strip $cBorder 450
        $stepsPanel.Controls.Add($card)
        $script:stepLabels += $l; $script:stepStrips += $strip
    }
}
function Set-Step([int]$i, [string]$state) {   # state: run | ok | fail | skip | pending
    if ($i -lt 1 -or $i -gt $script:stepLabels.Count) { return }
    $l = $script:stepLabels[$i - 1]; $n = $script:stepNames[$i - 1]; $st = $script:stepStrips[$i - 1]; $card = $l.Parent
    $bold = New-Object System.Drawing.Font("Segoe UI Semibold", 9)
    switch ($state) {
        "run"  { $script:pulseIdx = $i; $l.Text = ("{0}`r`n{1}" -f [char]0x25B6, $n); $l.ForeColor = $cCyan; Tween $card ([System.Drawing.Color]::FromArgb(14, 40, 68)) 300; Tween $st $cCyan 300; $l.Font = $bold }
        "ok"   { if ($script:pulseIdx -eq $i) { $script:pulseIdx = 0 }; $l.Text = ("{0}`r`n{1}" -f [char]0x2714, $n); $l.ForeColor = $cGreen; Tween $card ([System.Drawing.Color]::FromArgb(14, 40, 30)) 300; Tween $st $cGreen 300; $l.Font = $bold }
        "fail" { if ($script:pulseIdx -eq $i) { $script:pulseIdx = 0 }; $l.Text = ("{0}`r`n{1}" -f [char]0x2716, $n); $l.ForeColor = $cRed; Tween $card ([System.Drawing.Color]::FromArgb(58, 20, 26)) 300; Tween $st $cRed 300; $l.Font = $bold }
        "skip" { if ($script:pulseIdx -eq $i) { $script:pulseIdx = 0 }; $l.Text = ("-`r`n{0}" -f $n); $l.ForeColor = $cMuted; Tween $card $cCard 300; Tween $st $cBorder 300 }
    }
}

function Apply-Lang {
    $rtl = ($script:lang -eq "ar")
    $form.RightToLeft = $(if ($rtl) { "Yes" } else { "No" })
    $log.RightToLeft = "No"
    $form.Text = (L "title"); $lblTitle.Text = (L "title"); $lblSub.Text = (L "sub")
    $btnInstall.Text = ([string][char]0x2B07 + "   " + (L "install")); $btnSwitch.Text = ([string][char]0x21C4 + "   " + (L "switchv")); $btnStatus.Text = ([string][char]0x25C9 + "   " + (L "status")); $btnClose.Text = (L "close")
    $stepsCap.Text = (L "steps"); $logCap.Text = (L "log"); $btnCopy.Text = (L "copylog")
    $tip.SetToolTip($btnInstall, (L "tipInstall")); $tip.SetToolTip($btnSwitch, (L "tipSwitch")); $tip.SetToolTip($btnStatus, (L "tipStatus")); $tip.SetToolTip($btnCopy, (L "tipCopy"))
    $btnEn.FlatAppearance.BorderColor = $(if (-not $rtl) { $cCyan } else { $cBorder })
    $btnAr.FlatAppearance.BorderColor = $(if ($rtl) { $cCyan } else { $cBorder })
    if (-not $script:proc) { $lblState.Text = (L "ready") } else { $lblState.Text = (L "running") }
    if ($script:op) { $key = "s_" + $script:op; $cur = $script:curStep; Build-Steps (L $key); for ($i = 1; $i -lt $cur; $i++) { Set-Step $i "ok" }; if ($script:proc -and $cur -gt 0) { Set-Step $cur "run" } }
}

function Set-Busy([bool]$b) {
    $btnInstall.Enabled = -not $b; $btnSwitch.Enabled = -not $b; $btnStatus.Enabled = -not $b
    $btnEn.Enabled = $true; $btnAr.Enabled = $true
    $script:busy = $b
    if ($b) { if ($script:progTarget -lt 0.05) { Set-Prog 0.05 }; $lblState.Text = (L "running") }
}

function Show-Result([string]$kind, [string]$text) {   # kind: ok | fail | cancel
    if (-not $result.Visible) { $result.Height = 6; $result.BackColor = $cCard }
    $result.Visible = $true
    switch ($kind) {
        "ok"     { $tcol = [System.Drawing.Color]::FromArgb(14, 46, 34); $col = [System.Drawing.Color]::FromArgb(150, 240, 185); $bar = $cGreen; $ico = [char]0x2714 }
        "fail"   { $tcol = [System.Drawing.Color]::FromArgb(58, 20, 28); $col = [System.Drawing.Color]::FromArgb(255, 170, 178); $bar = $cRed; $ico = [char]0x2716 }
        default  { $tcol = [System.Drawing.Color]::FromArgb(58, 44, 14); $col = [System.Drawing.Color]::FromArgb(255, 220, 140); $bar = [System.Drawing.Color]::Gold; $ico = [char]0x26A0 }
    }
    $parts = $text -split "`r?`n", 2
    $body = $(if ($parts.Count -gt 1) { $parts[1].Trim() } else { "" })
    $resTitle.Text = ("{0}  {1}" -f $ico, $parts[0]); $resBody.Text = $body
    $resTitle.ForeColor = $col; $resBody.ForeColor = $col; $resBar.BackColor = $bar
    $w = [Math]::Max(300, $content.ClientSize.Width - 48 - 40)
    $bh = 0
    if ($body) { $sz = [System.Windows.Forms.TextRenderer]::MeasureText($body, $resBody.Font, (New-Object System.Drawing.Size($w, 0)), [System.Windows.Forms.TextFormatFlags]::WordBreak); $bh = $sz.Height + 12 }
    $script:resTarget = [Math]::Min(190, 36 + $bh + 6)
    Tween $result $tcol 450
    if (-not $script:animOn) { $result.Height = $script:resTarget }
}

function Ask-Input([string]$prompt) {
    $choices = @()
    if ($prompt -match '\[\[choices:(.*?)\]\]\s*$') {
        foreach ($p in ($Matches[1] -split ';')) { $kv = $p -split '=', 2; $choices += , @($kv[0], $kv[1]) }
        $prompt = ($prompt -replace '\s*\[\[choices:.*?\]\]\s*$', '')
    }
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
    $script:choiceAns = ""
    if ($choices.Count -gt 0) {
        $pnl.Height = 60 * $choices.Count + 50; $pnl.FlowDirection = "TopDown"; $pnl.WrapContents = $false
        foreach ($c in $choices) {
            $cb = New-Object System.Windows.Forms.Button; $cb.Text = $c[1]; $cb.Tag = $c[0]; $cb.Width = [Math]::Max(300, $dlg.ClientSize.Width - 40); $cb.Height = 48
            $cb.FlatStyle = "Flat"; $cb.BackColor = [System.Drawing.Color]::FromArgb(37, 120, 214); $cb.ForeColor = "White"; $cb.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
            $cb.Add_Click({ param($s, $e) $script:choiceAns = [string]$s.Tag; $fm = $s.FindForm(); $fm.DialogResult = "OK"; $fm.Close() })
            $pnl.Controls.Add($cb)
        }
        $pnl.Controls.Add($cn)
        $tb.Visible = $false
    } else { $pnl.Controls.AddRange(@($ok, $cn)) }
    $ctx.Dock = "Fill"; $ctx.Height = 100
    $dlg.Controls.Add($ctx); $dlg.Controls.Add($tb); $dlg.Controls.Add($lbl); $dlg.Controls.Add($pnl)
    $dlg.BackColor = $cBg; $dlg.ForeColor = $cText
    $ctx.BackColor = [System.Drawing.Color]::FromArgb(5, 8, 13); $ctx.ForeColor = [System.Drawing.Color]::Gainsboro
    $tb.BackColor = $cCard; $tb.ForeColor = "White"; $tb.BorderStyle = "FixedSingle"
    foreach ($bb in @($ok, $cn)) { $bb.FlatStyle = "Flat"; $bb.UseVisualStyleBackColor = $false; $bb.BackColor = [System.Drawing.Color]::FromArgb(30, 41, 59); $bb.ForeColor = "White"; $bb.FlatAppearance.BorderColor = $cBorder }
    $ok.BackColor = $cBlue
    $dlg.AcceptButton = $ok; $dlg.CancelButton = $cn
    $dlg.ActiveControl = $tb
    if ($script:animOn) { $dlg.Opacity = 0; [void]$script:fades.Add($dlg) }
    $r = $dlg.ShowDialog($form)
    $ans = $(if ($r -eq "OK") { $(if ($choices.Count -gt 0) { $script:choiceAns } else { $tb.Text.Trim() }) } else { "" })
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
        Set-Prog (($n - 0.5) / [Math]::Max(1, $script:stepNames.Count))
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
    if ($script:done) {
        for ($k = 1; $k -le $script:stepLabels.Count; $k++) { if ($script:stepLabels[$k - 1].Text -match [char]0x25B6) { Set-Step $k "ok" } }
        Set-Prog 1; Tween $progFill $cGreen 400
        $d = $script:done
        $mode = $d[1]; $ver = $d[2]; $bak = $d[3]; $lf = $d[4]; $oldBak = $(if ($d.Count -gt 5) { $d[5] } else { "" }); $wp = $(if ($d.Count -gt 6 -and $d[6]) { $d[6] } else { "80" })
        $lblState.Text = (L "okTitle")
        if ($mode -eq "STATUS") { Set-Step 1 "ok"; Show-Result "ok" ((L "okTitle")); return }
        $lines = @((L "okTitle"), ("{0}: {1}" -f (L "version"), $ver), ("{0}: {1}" -f (L "open"), $(if ($wp -eq "80") { "http://localhost   (http://192.168.1.5)" } else { "http://localhost:$wp   (http://192.168.1.5:$wp)" })))
        if ($bak) { $lines += ("{0}: {1}" -f (L "backup"), $bak) }
        if ($oldBak) { $lines += ("{0}: {1}" -f (L "oldbak"), $oldBak) }
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
    $lblState.Text = (L "failTitle"); Tween $progFill $cRed 400
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
    $result.Visible = $false; $log.Clear(); Set-Prog 0; $progFill.BackColor = $cBlue; $script:resTarget = 0
    Build-Steps (L ("s_" + $op))
    $content.RowStyles[2].Height = $(if ($op -eq "status") { 0 } else { 100 })
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

$anim = New-Object System.Windows.Forms.Timer
$anim.Interval = 30
$anim.Add_Tick({
    try {
        $now = $script:clock.ElapsedMilliseconds
        for ($i = $script:tw.Count - 1; $i -ge 0; $i--) {
            $e = $script:tw[$i]
            $t = [Math]::Min(1.0, ($now - $e.t0) / [double]$e.ms); $k = $t * $t * (3 - 2 * $t)
            $e.c.BackColor = Mix $e.from $e.to $k
            if ($t -ge 1.0) { $script:tw.RemoveAt($i) }
        }
        $script:progCur += ($script:progTarget - $script:progCur) * 0.12
        if ([Math]::Abs($script:progTarget - $script:progCur) -lt 0.002) { $script:progCur = $script:progTarget }
        $w = [int]($prog.Width * $script:progCur)
        if ($progFill.Width -ne $w) { $progFill.Width = $w }
        if ($script:busy -and $w -gt 12) { $shim.Left = [int](($now % 1300) / 1300.0 * ($w + 70)) - 70; $shim.Visible = $true } else { $shim.Visible = $false }
        if ($script:pulseIdx -gt 0 -and $script:pulseIdx -le $script:stepStrips.Count) {
            $stp = $script:stepStrips[$script:pulseIdx - 1]; $moving = $false
            foreach ($e in $script:tw) { if ([object]::ReferenceEquals($e.c, $stp)) { $moving = $true } }
            if (-not $moving) { $stp.BackColor = Mix $cCyanDark $cCyan (([Math]::Sin($now / 280.0) + 1) / 2) }
        }
        for ($i = $script:fades.Count - 1; $i -ge 0; $i--) {
            $fm = $script:fades[$i]
            if ($fm.IsDisposed) { $script:fades.RemoveAt($i); continue }
            $o = [Math]::Min(1.0, $fm.Opacity + 0.09); $fm.Opacity = $o
            if ($o -ge 1.0) { $script:fades.RemoveAt($i) }
        }
        if ($script:resTarget -gt 0 -and $result.Visible -and $result.Height -lt $script:resTarget) {
            $result.Height = [int][Math]::Min($script:resTarget, $result.Height + [Math]::Max(4, ($script:resTarget - $result.Height) * 0.25))
        }
        if ($script:copiedUntil -gt 0 -and $now -gt $script:copiedUntil) { $btnCopy.Text = (L "copylog"); $script:copiedUntil = 0 }
    }
    catch { $script:animOn = $false; $anim.Stop() }
})
$form.Opacity = 0; [void]$script:fades.Add($form)
$anim.Start()
[void]$form.ShowDialog()
exit 0
