<#
 ERP installer - graphical window (Windows PowerShell + WinForms, built in, no installs, no internet).
 It does not contain any install logic. It runs the proven scripts (install-or-update.ps1, rollback.ps1, status.ps1)
 as a child process and shows their output, so every safety rule stays in those scripts.
 Typed confirmations (UNRELATED, RESTORE, version number) appear as input boxes.
 Exit code 100 = the window could not start (the .bat then falls back to the console installer).
#>
param([string]$BackupDir = "C:\ERP_backup", [string]$Open = "")
$ErrorActionPreference = "Stop"
try {
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing
    [System.Windows.Forms.Application]::EnableVisualStyles()
    . (Join-Path $PSScriptRoot "messages-ar.ps1")
}
catch { exit 100 }

$RootDir = $(if (Test-Path (Join-Path $PSScriptRoot "docker-compose.yml")) { $PSScriptRoot } else { Split-Path $PSScriptRoot -Parent })   # folder with .env, docker-compose.yml, images, logs
try {
    [System.Windows.Forms.Application]::SetUnhandledExceptionMode([System.Windows.Forms.UnhandledExceptionMode]::CatchException)
    [System.Windows.Forms.Application]::add_ThreadException({ param($s, $e) Log-GuiError $e.Exception "ui" })
} catch { }
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
    ok = "OK"; gen = "Generate for me"; exSide = "Existing DB"; tipEx = "Use your existing database (for example minierp-db) with ERP 2.0: verified backup first, upgrade in place, one-step restore."; pwSide = "DB password"; pwTitle = "Change database password"; pwHelp = "Type the OLD password, then the NEW one twice. The password is changed inside the database, your data stays."; pwOld = "Old password (the one the database has now)"; pwNew = "New password"; pwConf = "Confirm new password"; errMatch = "The two new passwords are different"; errSame = "The new password must be different from the old one"; pwNote = "A copy of the database files is saved first (a few minutes). Nothing is deleted. Typed on this PC only, never shown in the log."; pwBtn = "Change password"; pwReady = "Ready"; pwStarted = "Password change started in a separate window. Follow it there (no passwords are shown)."; tipPw = "Change the SQL password of the ERP database without losing data."; show = "Show"; hide = "Hide"; weak = "Weak"; fair = "Fair"; good = "Good"; strong = "Strong"; looksOk = "Looks good"; rulesNew = "At least 8 characters, 3 of: capitals, small letters, digits, symbols. Allowed: letters, digits and _ . @ ! * + -"; rulesOld = "Type it exactly as in your old .env. No spaces or quotes. It is checked against the database before anything is saved for good."; rulesJwt = "At least 32 characters. Allowed: letters, digits and _ . @ ! * + / = -"; errMin8 = "At least 8 characters"; errChars = "Allowed characters: letters, digits and _ . @ ! * + -"; errMix = "Use at least 3 kinds: capitals, small letters, digits, symbols"; errJwt = "At least 32 characters, no spaces"; errSpace = "No spaces or quotes"; ctxCap = "Recent log"; secretNote2 = "Typed on this PC and saved only in the .env file. Never shown in the log."; secretNote = "Typed here on this PC, saved only in the .env file. Never shown in the log."; cancel = "Cancel"; promptTitle = "Your input is needed"; version = "Version"; backup = "Backup"; logfile = "Log file"; oldbak = "Old SQL container backup"; copylog = "Copy log"; copied = "Copied"; tipInstall = "Install a new version or update. A backup is taken first."; tipSwitch = "Go back to an earlier installed version."; tipStatus = "Read-only check of what is running."; tipCopy = "Copy the whole log to the clipboard"; open = "Open"
    s_install = @("Check Docker", "Install type and config", "Backup", "Load images", "Start services", "Health check")
    s_switch = @("Safety backup", "Restore database (optional)", "Switch code", "Health check")
    s_status = @("Read status")
    s_exconnect = @("Check old database", "Read tables and migrations", "Old app containers", "Verified backup", "Stop old app", "Write settings", "Images", "Start ERP 2.0")
    s_exrestore = @("Verify backup file", "Pre-restore backup", "Stop ERP 2.0", "Restore", "Check result", "Start old app")
    s_exstatus = @("Read status")
    s_images = @("Check Docker and images", "Load images file", "Build from the repo", "Save a copy for the server", "Check result")
    imgAsk = "The ERP 2.0 images are not on this PC yet. One click gets them (loads erp-images-*.tar if present, otherwise builds them from the repo; the build needs internet once and takes 10-20 minutes). Your data is not touched."; imgGo = "Get the images now"
    s_exdry = @("Choose backup", "Check images and ports", "Throwaway SQL Server", "Restore into the copy", "Run migrations on the copy", "Check result", "Remove the copy")
    exDry = "Test the upgrade on a COPY first (recommended, changes nothing real)"
    exTitle = "Existing database (no new database)"; exHelp = "Choose what to do with your existing database."; exConnect = "Connect ERP 2.0 (verified backup first, then upgrade in place)"; exRestore = "Restore from a backup file (rollback)"; exStatus = "Status (read only)"
    unexpected = "The operation ended unexpectedly. Send the log file to your developer."
  }
  ar = @{
    title = "نظام ERP - المثبّت"; sub = "تثبيت أو تحديث أو تبديل الإصدار أو فحص الحالة. الداتا مبتتمسحش أبداً."
    install = "تثبيت / تحديث"; switchv = "تبديل الإصدار / رجوع"; status = "الحالة"; close = "إغلاق"
    steps = "الخطوات"; log = "السجل المباشر"; ready = "جاهز. اختار إجراء."; running = "جاري التنفيذ... استنى. متقفلش النافذة دي."
    okTitle = "تم بنجاح"; failTitle = "اتوقف - مفيش حاجة اتمسحت والداتا سليمة"; cancelTitle = "اتلغى - مفيش حاجة اتغيّرت"
    next = "الخطوة الجاية"; busy = "فيه عملية شغالة. استنى لحد ما تخلص."
    ok = "موافق"; gen = "ولّدلي تلقائي"; exSide = "الداتابيز الحالية"; tipEx = "استخدم الداتابيز الحالية (زي minierp-db) مع ERP 2.0: نسخة احتياطية متحقق منها الأول، ترقية في نفس المكان، واسترجاع بخطوة واحدة."; pwSide = "باسورد الداتابيز"; pwTitle = "تغيير باسورد الداتابيز"; pwHelp = "اكتب الباسورد القديم وبعدين الجديد مرتين. التغيير بيتم جوه الداتابيز والداتا بتفضل زي ما هي."; pwOld = "الباسورد القديم (اللي الداتابيز شغالة بيه دلوقتي)"; pwNew = "الباسورد الجديد"; pwConf = "تأكيد الباسورد الجديد"; errMatch = "الباسوردين الجداد مش زي بعض"; errSame = "الباسورد الجديد لازم يختلف عن القديم"; pwNote = "بياخد نسخة من ملفات الداتابيز الأول (كام دقيقة). مفيش حاجة بتتمسح. بتكتبه على الجهاز ده بس ومش بيظهر في السجل."; pwBtn = "غيّر الباسورد"; pwReady = "جاهز"; pwStarted = "بدأ تغيير الباسورد في نافذة منفصلة. تابعه هناك (مفيش باسوردات بتظهر)."; tipPw = "تغيير باسورد SQL للداتابيز من غير ما تضيع الداتا."; show = "إظهار"; hide = "إخفاء"; weak = "ضعيف"; fair = "مقبول"; good = "جيد"; strong = "قوي"; looksOk = "تمام"; rulesNew = "8 حروف على الأقل، ومن 3 أنواع: كبيرة وصغيرة وأرقام ورموز. المسموح: حروف وأرقام و _ . @ ! * + -"; rulesOld = "اكتبه زي ما هو في ملف .env القديم. من غير مسافات أو علامات تنصيص. هيتفحص على الداتابيز قبل ما يتحفظ نهائي."; rulesJwt = "32 حرف على الأقل. المسموح: حروف وأرقام و _ . @ ! * + / = -"; errMin8 = "8 حروف على الأقل"; errChars = "المسموح: حروف وأرقام و _ . @ ! * + -"; errMix = "استخدم 3 أنواع على الأقل: كبيرة وصغيرة وأرقام ورموز"; errJwt = "32 حرف على الأقل ومن غير مسافات"; errSpace = "من غير مسافات أو علامات تنصيص"; ctxCap = "آخر السجل"; secretNote2 = "بتكتبه على الجهاز ده وبيتحفظ في ملف .env بس. مش بيظهر في السجل."; secretNote = "بتكتبه هنا على الجهاز ده وبيتحفظ في ملف .env بس. مش بيظهر في السجل."; cancel = "إلغاء"; promptTitle = "محتاج إدخال منك"; version = "الإصدار"; backup = "النسخة الاحتياطية"; logfile = "ملف السجل"; oldbak = "نسخة الـ SQL القديم"; copylog = "نسخ السجل"; copied = "تم النسخ"; tipInstall = "تثبيت أو تحديث. بياخد نسخة احتياطية الأول."; tipSwitch = "الرجوع لإصدار متثبّت قبل كده."; tipStatus = "فحص للقراءة بس للي شغال."; tipCopy = "نسخ السجل كله"; open = "افتح"
    s_install = @("فحص Docker", "نوع التثبيت والإعدادات", "نسخة احتياطية", "تحميل الصور", "تشغيل الخدمات", "فحص الجاهزية")
    s_switch = @("نسخة أمان", "استرجاع الداتا (اختياري)", "تبديل الكود", "فحص الجاهزية")
    s_status = @("قراءة الحالة")
    s_exconnect = @("فحص الداتابيز القديمة", "قراءة الجداول والـ migrations", "حاويات التطبيق القديم", "نسخة احتياطية متحقق منها", "إيقاف التطبيق القديم", "كتابة الإعدادات", "الصور", "تشغيل ERP 2.0")
    s_exrestore = @("فحص ملف النسخة", "نسخة قبل الاسترجاع", "إيقاف ERP 2.0", "الاسترجاع", "فحص النتيجة", "تشغيل التطبيق القديم")
    s_exstatus = @("قراءة الحالة")
    s_images = @("فحص Docker والصور", "تحميل ملف الصور", "بناء من الكود", "حفظ نسخة للسيرفر", "فحص النتيجة")
    imgAsk = "صور ERP 2.0 مش موجودة على الجهاز لسه. ضغطة واحدة تجيبها (بتحمّل erp-images-*.tar لو موجود، وإلا بتبنيها من الكود؛ البناء محتاج إنترنت مرة واحدة وبياخد 10-20 دقيقة). الداتا متلمسّتش."; imgGo = "هات الصور دلوقتي"
    s_exdry = @("اختيار النسخة", "فحص الصور والبورتات", "SQL مؤقت", "استرجاع في النسخة", "تشغيل الـ migrations على النسخة", "فحص النتيجة", "مسح النسخة")
    exDry = "جرّب الترقية على نسخة الأول (موصى بيه، مش بيغيّر حاجة حقيقية)"
    exTitle = "الداتابيز الحالية (من غير داتابيز جديدة)"; exHelp = "اختار هتعمل إيه في الداتابيز الحالية."; exConnect = "وصّل ERP 2.0 (نسخة احتياطية متحقق منها وبعدين ترقية في نفس المكان)"; exRestore = "استرجاع من ملف نسخة (رجوع)"; exStatus = "الحالة (قراءة فقط)"
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
$form.StartPosition = "Manual"; $form.AutoScaleMode = "None"
$form.Location = New-Object System.Drawing.Point([Math]::Max($wa.Left, $wa.Left + [int](($wa.Width - $fw) / 2)), [Math]::Max($wa.Top, $wa.Top + [int](($wa.Height - $fh) / 2)))
$form.Add_Shown({ try { $w2 = [System.Windows.Forms.Screen]::FromControl($form).WorkingArea; if ($form.Height -gt $w2.Height) { $form.Height = $w2.Height }; if ($form.Width -gt $w2.Width) { $form.Width = $w2.Width }; $x = [Math]::Min([Math]::Max($form.Left, $w2.Left), $w2.Right - $form.Width); $y = [Math]::Min([Math]::Max($form.Top, $w2.Top), $w2.Bottom - $form.Height); $form.Location = New-Object System.Drawing.Point($x, $y) } catch { } })
$iconFile = Join-Path $PSScriptRoot "assets\erp-icon.ico"
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
$logoFile = Join-Path $PSScriptRoot "assets\devsquad-logo.jpg"
if (Test-Path $logoFile) { try { $pic.Image = [System.Drawing.Image]::FromFile($logoFile) } catch {} }
$nav = New-Object System.Windows.Forms.FlowLayoutPanel
$nav.Dock = "Fill"; $nav.FlowDirection = "TopDown"; $nav.WrapContents = $false; $nav.Padding = New-Object System.Windows.Forms.Padding(14, 18, 14, 0); $nav.BackColor = $cSide
$btnInstall = New-Btn $cBlue 192
$btnSwitch = New-Btn ([System.Drawing.Color]::FromArgb(30, 41, 59)) 192
$btnStatus = New-Btn ([System.Drawing.Color]::FromArgb(30, 41, 59)) 192
$btnPw = New-Btn ([System.Drawing.Color]::FromArgb(24, 34, 52)) 192
$btnEx = New-Btn ([System.Drawing.Color]::FromArgb(24, 34, 52)) 192
foreach ($nb in @($btnInstall, $btnSwitch, $btnStatus, $btnPw, $btnEx)) { $nb.TextAlign = "MiddleLeft"; $nb.Padding = New-Object System.Windows.Forms.Padding(16, 0, 10, 0); $nb.Height = 42; $nb.Margin = New-Object System.Windows.Forms.Padding(0, 0, 0, 6) }
$nav.Controls.AddRange(@($btnInstall, $btnSwitch, $btnStatus, $btnPw, $btnEx))
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
$tarFound = Get-ChildItem @($RootDir, (Join-Path $RootDir "images")) -Filter "erp-images-*.tar" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
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

function Log-GuiError($ex, [string]$where) {
    try {
        $d = Join-Path $RootDir "logs"; New-Item -ItemType Directory -Force -Path $d | Out-Null
        Add-Content -Path (Join-Path $d "gui-error.log") -Value ("{0} [{1}] {2}`r`n{3}`r`n" -f (Get-Date -Format s), $where, $ex.Message, $ex.ToString()) -Encoding UTF8
    } catch { }
    try { Write-Log ("GUI error ({0}): {1}   (details: logs\gui-error.log)" -f $where, $ex.Message) ([System.Drawing.Color]::OrangeRed) } catch { }
}
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
        if ($script:lang -eq "ar") { $stepsPanel.Controls.Add($card, ($cols - 1 - $i), 0) } else { $stepsPanel.Controls.Add($card, $i, 0) }
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

function Set-Rtl([bool]$rtl) {
    # manual right-to-left: text alignment per control and mirrored placement of the main blocks (the whole-form RightToLeft mirror is not used: it can break painting)
    $rt = $(if ($rtl) { "Yes" } else { "No" })
    foreach ($c in @($lblTitle, $lblSub, $lblState, $stepsCap, $logCap, $btnCopy, $resTitle, $resBody)) { $c.RightToLeft = $rt }
    foreach ($nb in @($btnInstall, $btnSwitch, $btnStatus, $btnPw, $btnEx)) { $nb.RightToLeft = $rt; $nb.TextAlign = $(if ($rtl) { "MiddleRight" } else { "MiddleLeft" }); $nb.Padding = $(if ($rtl) { New-Object System.Windows.Forms.Padding(10, 0, 16, 0) } else { New-Object System.Windows.Forms.Padding(16, 0, 10, 0) }) }
    $log.RightToLeft = "No"
    $root.SuspendLayout()
    $root.ColumnStyles.Clear()
    if ($rtl) {
        [void]$root.ColumnStyles.Add((New-Object System.Windows.Forms.ColumnStyle("Percent", 100)))
        [void]$root.ColumnStyles.Add((New-Object System.Windows.Forms.ColumnStyle("Absolute", 224)))
        $root.SetColumn($content, 0); $root.SetColumn($side, 1)
        $chipHolder.Dock = "Left"; $btnCopy.Dock = "Left"
    } else {
        [void]$root.ColumnStyles.Add((New-Object System.Windows.Forms.ColumnStyle("Absolute", 224)))
        [void]$root.ColumnStyles.Add((New-Object System.Windows.Forms.ColumnStyle("Percent", 100)))
        $root.SetColumn($side, 0); $root.SetColumn($content, 1)
        $chipHolder.Dock = "Right"; $btnCopy.Dock = "Right"
    }
    $root.ResumeLayout($true)
}

function Apply-Lang {
    try {
        $rtl = ($script:lang -eq "ar")
        Set-Rtl $rtl
        $form.Text = (L "title"); $lblTitle.Text = (L "title"); $lblSub.Text = (L "sub")
        $btnInstall.Text = ([string][char]0x2B07 + "   " + (L "install")); $btnSwitch.Text = ([string][char]0x21C4 + "   " + (L "switchv")); $btnStatus.Text = ([string][char]0x25C9 + "   " + (L "status")); $btnPw.Text = ([string][char]0x26BF + "   " + (L "pwSide")); $tip.SetToolTip($btnPw, (L "tipPw")); $btnEx.Text = ([string][char]0x26C1 + "   " + (L "exSide")); $tip.SetToolTip($btnEx, (L "tipEx")); $btnClose.Text = (L "close")
        $stepsCap.Text = (L "steps"); $logCap.Text = (L "log"); $btnCopy.Text = (L "copylog")
        $tip.SetToolTip($btnInstall, (L "tipInstall")); $tip.SetToolTip($btnSwitch, (L "tipSwitch")); $tip.SetToolTip($btnStatus, (L "tipStatus")); $tip.SetToolTip($btnCopy, (L "tipCopy"))
        $btnEn.FlatAppearance.BorderColor = $(if (-not $rtl) { $cCyan } else { $cBorder })
        $btnAr.FlatAppearance.BorderColor = $(if ($rtl) { $cCyan } else { $cBorder })
        if (-not $script:proc) { $lblState.Text = (L "ready") } else { $lblState.Text = (L "running") }
        if ($script:op) { $key = "s_" + $script:op; $cur = $script:curStep; Build-Steps (L $key); for ($i = 1; $i -lt $cur; $i++) { Set-Step $i "ok" }; if ($script:proc -and $cur -gt 0) { Set-Step $cur "run" } }
        else { Build-Steps (L "s_install") }
    }
    catch {
        Log-GuiError $_.Exception "language"
        if ($script:lang -eq "ar") {
            $script:lang = "en"
            try { Set-Rtl $false; $form.Text = (L "title"); $lblTitle.Text = (L "title"); $lblSub.Text = (L "sub"); $btnInstall.Text = (L "install"); $btnSwitch.Text = (L "switchv"); $btnStatus.Text = (L "status"); $btnClose.Text = (L "close") } catch { }
        }
    }
}

function Set-Busy([bool]$b) {
    $btnInstall.Enabled = -not $b; $btnSwitch.Enabled = -not $b; $btnStatus.Enabled = -not $b; $btnPw.Enabled = -not $b; $btnEx.Enabled = -not $b
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

function Get-StrengthScore([string]$v) {
    $k = 0; foreach ($re in @('[A-Z]', '[a-z]', '[0-9]', '[_.@!*+-]')) { if ($v -cmatch $re) { $k++ } }
    if ($v.Length -lt 8 -or $k -lt 3) { return $(if ($v.Length -eq 0) { 0 } else { 1 }) }
    $s = 2; if ($v.Length -ge 12) { $s = 3 }; if ($v.Length -ge 16 -and $k -ge 4) { $s = 4 }
    return $s
}
function Get-DlgError([string]$kind, [string]$v) {   # returns a message key, or "" when the value is acceptable
    if (-not $v) { return "" }
    if ($kind -eq "old") { if ($v -match '\s' -or $v -match '["''`]') { return "errSpace" }; return "" }
    if ($kind -eq "jwt") { if ($v.Length -lt 32 -or $v -notmatch '^[A-Za-z0-9_.@!*+/=-]+$') { return "errJwt" }; return "" }
    if ($v.Length -lt 8) { return "errMin8" }
    if ($v -notmatch '^[A-Za-z0-9_.@!*+-]+$') { return "errChars" }
    $k = 0; foreach ($re in @('[A-Z]', '[a-z]', '[0-9]', '[_.@!*+-]')) { if ($v -cmatch $re) { $k++ } }
    if ($k -lt 3) { return "errMix" }
    return ""
}
function New-RoundedPath([int]$w, [int]$h, [int]$r) {
    $gp = New-Object System.Drawing.Drawing2D.GraphicsPath; $d = $r * 2
    $gp.AddArc(0, 0, $d, $d, 180, 90); $gp.AddArc($w - $d, 0, $d, $d, 270, 90); $gp.AddArc($w - $d, $h - $d, $d, $d, 0, 90); $gp.AddArc(0, $h - $d, $d, $d, 90, 90); $gp.CloseFigure()
    return $gp
}
function Measure-H([string]$text, $fnt, [int]$w) {
    $sz = [System.Windows.Forms.TextRenderer]::MeasureText($text, $fnt, (New-Object System.Drawing.Size($w, 0)), [System.Windows.Forms.TextFormatFlags]::WordBreak)
    return ($sz.Height + 4)
}
function New-DlgLabel([string]$text, $fnt, $color, [int]$x, [int]$y, [int]$w, [bool]$rtl) {
    $l = New-Object System.Windows.Forms.Label
    $l.AutoSize = $false; $l.Font = $fnt; $l.ForeColor = $color; $l.BackColor = [System.Drawing.Color]::Transparent; $l.Text = $text
    $l.Location = New-Object System.Drawing.Point($x, $y); $l.Width = $w; $l.Height = (Measure-H $text $fnt $w)
    if ($rtl) { $l.RightToLeft = "Yes" }
    return $l
}
function New-DlgField([int]$x, [int]$y, [int]$w, [bool]$masked, [bool]$rtl) {
    # outer panel = border/glow colour, inner panel = field surface, both rounded; focus tweens the outer colour
    $outer = New-Panel $cBorder; $outer.Location = New-Object System.Drawing.Point($x, $y); $outer.Size = New-Object System.Drawing.Size($w, 46)
    $inner = New-Panel $cCard; $inner.Location = New-Object System.Drawing.Point(2, 2); $inner.Size = New-Object System.Drawing.Size(($w - 4), 42)
    $tb = New-Object System.Windows.Forms.TextBox; $tb.BorderStyle = "None"; $tb.BackColor = $cCard; $tb.ForeColor = "White"; $tb.Font = New-Object System.Drawing.Font("Segoe UI", 12)
    $tb.Location = New-Object System.Drawing.Point(12, 9); $tb.Width = ($w - 4 - 24 - $(if ($masked) { 64 } else { 0 })); $tb.UseSystemPasswordChar = $masked; $tb.RightToLeft = "No"
    $inner.Controls.Add($tb)
    $eye = $null
    if ($masked) {
        $eye = New-Object System.Windows.Forms.Label; $eye.AutoSize = $false; $eye.Size = New-Object System.Drawing.Size(58, 42); $eye.Location = New-Object System.Drawing.Point(($w - 4 - 60), 0)
        $eye.TextAlign = "MiddleCenter"; $eye.ForeColor = $cCyan; $eye.BackColor = $cCard; $eye.Cursor = [System.Windows.Forms.Cursors]::Hand; $eye.Font = New-Object System.Drawing.Font("Segoe UI Semibold", 9)
        $eye.Text = (L "show"); $inner.Controls.Add($eye)
    }
    $outer.Controls.Add($inner)
    Round-Region $outer 11; Round-Region $inner 9
    $tb.Add_Enter({ param($s, $e) try { Tween $s.Parent.Parent $cCyan 160 } catch { } })
    $tb.Add_Leave({ param($s, $e) try { Tween $s.Parent.Parent $cBorder 200 } catch { } })
    return @($outer, $tb, $eye)
}
function Show-Dlg([string]$prompt, [string]$mode, [bool]$allowGen, $choices) {
    # mode: secret | text | choice. One look for every input dialog. Values are never logged or echoed.
    $rtl = ($script:lang -eq "ar")
    $script:D = @{ kind = "new"; result = ""; ok = $null; tb = $null; msg = $null; segs = @(); strLbl = $null; glow = $null }
    $W = [Math]::Min(580, $wa.Width - 30); $pad = 26; $cw = $W - 2 * $pad
    $kind = "new"
    if ($mode -eq "secret") { if ($prompt -match 'JWT_SIGNING_KEY') { $kind = "jwt" } elseif (-not $allowGen) { $kind = "old" } }
    $script:D.kind = $kind
    $dlg = New-Object System.Windows.Forms.Form
    $dlg.FormBorderStyle = "None"; $dlg.StartPosition = "CenterParent"; $dlg.ShowInTaskbar = $false; $dlg.BackColor = $cBg; $dlg.ForeColor = $cText; $dlg.Font = $font
    $dlg.Text = (L "promptTitle")
    # header: icon + title (drag the dialog by it)
    $head = New-Panel $cSide; $head.Location = New-Object System.Drawing.Point(0, 0); $head.Size = New-Object System.Drawing.Size($W, 58)
    $ic = New-Object System.Windows.Forms.PictureBox; $ic.SizeMode = "Zoom"; $ic.Size = New-Object System.Drawing.Size(34, 34); $ic.BackColor = $cSide
    try { if ($form.Icon) { $ic.Image = $form.Icon.ToBitmap() } } catch { }
    $tt = New-Object System.Windows.Forms.Label; $tt.AutoSize = $false; $tt.Text = $(if ($mode -eq "secret") { (L "promptTitle") + " " + [char]0x2022 + " .env" } else { (L "promptTitle") }); $tt.Font = New-Object System.Drawing.Font("Segoe UI Semibold", 12); $tt.ForeColor = $cText; $tt.BackColor = $cSide
    $tt.TextAlign = "MiddleLeft"; $tt.Size = New-Object System.Drawing.Size(($W - 2 * $pad - 48), 58)
    if ($rtl) { $ic.Location = New-Object System.Drawing.Point(($W - $pad - 34), 12); $tt.Location = New-Object System.Drawing.Point($pad, 0); $tt.TextAlign = "MiddleRight"; $tt.RightToLeft = "Yes" } else { $ic.Location = New-Object System.Drawing.Point($pad, 12); $tt.Location = New-Object System.Drawing.Point(($pad + 46), 0) }
    $head.Controls.Add($ic); $head.Controls.Add($tt)
    $accent = New-Panel $cBlue; $accent.Location = New-Object System.Drawing.Point(0, 58); $accent.Size = New-Object System.Drawing.Size($W, 2)
    $dlg.Controls.Add($head); $dlg.Controls.Add($accent)
    $script:D.drag = $false; $script:D.dx = 0; $script:D.dy = 0; $script:D.form = $dlg
    foreach ($dc in @($head, $ic, $tt)) {
        $dc.Add_MouseDown({ param($s, $e) $script:D.drag = $true; $p = [System.Windows.Forms.Cursor]::Position; $script:D.dx = $p.X - $script:D.form.Left; $script:D.dy = $p.Y - $script:D.form.Top })
        $dc.Add_MouseMove({ param($s, $e) if ($script:D.drag) { $p = [System.Windows.Forms.Cursor]::Position; $script:D.form.Location = New-Object System.Drawing.Point(($p.X - $script:D.dx), ($p.Y - $script:D.dy)) } })
        $dc.Add_MouseUp({ param($s, $e) $script:D.drag = $false })
    }
    $y = 78
    $lb = New-DlgLabel $prompt (New-Object System.Drawing.Font("Segoe UI Semibold", 10.5)) $cText $pad $y $cw $rtl
    $dlg.Controls.Add($lb); $y += $lb.Height + 6
    $cancelText = (L "cancel")
    if ($mode -eq "secret") {
        $rk = $(if ($kind -eq "jwt") { "rulesJwt" } elseif ($kind -eq "old") { "rulesOld" } else { "rulesNew" })
        $rl = New-DlgLabel (L $rk) (New-Object System.Drawing.Font("Segoe UI", 9)) $cMuted $pad $y $cw $rtl
        $dlg.Controls.Add($rl); $y += $rl.Height + 12
    } elseif ($mode -eq "choice" -and $script:recent.Count -gt 0) {
        $ctxText = (($script:recent | Select-Object -Last 6) -join "`r`n")
        $cb2 = New-Object System.Windows.Forms.TextBox; $cb2.Multiline = $true; $cb2.ReadOnly = $true; $cb2.BorderStyle = "None"; $cb2.RightToLeft = "No"; $cb2.Font = New-Object System.Drawing.Font("Consolas", 9)
        $cb2.BackColor = [System.Drawing.Color]::FromArgb(5, 8, 13); $cb2.ForeColor = $cMuted; $cb2.Text = $ctxText; $cb2.ScrollBars = "Vertical"
        $cb2.Location = New-Object System.Drawing.Point($pad, $y); $cb2.Size = New-Object System.Drawing.Size($cw, 96)
        $dlg.Controls.Add($cb2); $y += 108
    }
    if ($mode -eq "secret" -or $mode -eq "text") {
        $parts = New-DlgField $pad $y $cw ($mode -eq "secret") $rtl
        $dlg.Controls.Add($parts[0]); $script:D.tb = $parts[1]; $y += 54
        if ($parts[2]) {
            $script:D.eye = $parts[2]
            $parts[2].Add_Click({ try { $t = $script:D.tb; $t.UseSystemPasswordChar = (-not $t.UseSystemPasswordChar); $script:D.eye.Text = $(if ($t.UseSystemPasswordChar) { (L "show") } else { (L "hide") }); $t.Focus() } catch { } })
        }
        if ($mode -eq "secret" -and $kind -ne "old") {
            $segW = [int](($cw - 120 - 3 * 6) / 4)
            for ($si = 0; $si -lt 4; $si++) {
                $sg = New-Panel $cBorder; $sg.Size = New-Object System.Drawing.Size($segW, 6); $sg.Location = New-Object System.Drawing.Point(($pad + $si * ($segW + 6)), ($y + 7)); Round-Region $sg 3
                $dlg.Controls.Add($sg); $script:D.segs += $sg
            }
            $sl = New-Object System.Windows.Forms.Label; $sl.AutoSize = $false; $sl.Size = New-Object System.Drawing.Size(110, 20); $sl.Location = New-Object System.Drawing.Point(($pad + $cw - 110), ($y)); $sl.ForeColor = $cMuted; $sl.BackColor = [System.Drawing.Color]::Transparent
            $sl.TextAlign = "MiddleRight"; $sl.Font = New-Object System.Drawing.Font("Segoe UI", 9); $dlg.Controls.Add($sl); $script:D.strLbl = $sl
            $y += 26
        }
        $mg = New-Object System.Windows.Forms.Label; $mg.AutoSize = $false; $mg.Size = New-Object System.Drawing.Size($cw, 22); $mg.Location = New-Object System.Drawing.Point($pad, $y); $mg.Font = New-Object System.Drawing.Font("Segoe UI", 9.5); $mg.ForeColor = $cMuted; $mg.BackColor = [System.Drawing.Color]::Transparent
        if ($rtl) { $mg.RightToLeft = "Yes" }
        if ($mode -eq "secret") { $mg.Text = (L "secretNote2") }
        $dlg.Controls.Add($mg); $script:D.msg = $mg; $y += 34
    }
    # buttons
    $ok = New-Btn $cBlue 150; $ok.Height = 42; $ok.Text = (L "ok"); $ok.Margin = New-Object System.Windows.Forms.Padding(0)
    $cn = New-Btn ([System.Drawing.Color]::FromArgb(30, 41, 59)) 120; $cn.Height = 42; $cn.Text = $cancelText; $cn.Margin = New-Object System.Windows.Forms.Padding(0)
    $script:D.ok = $ok
    $cn.Add_Click({ $script:D.result = ""; $script:D.form.DialogResult = "Cancel"; $script:D.form.Close() })
    if ($mode -eq "choice") {
        $first = $true
        foreach ($c in $choices) {
            $b = New-Btn $(if ($first) { $cBlue } else { [System.Drawing.Color]::FromArgb(30, 41, 59) }) $cw; $b.Height = 46; $b.Text = $c[1]
            $b.Location = New-Object System.Drawing.Point($pad, $y); $b.Margin = New-Object System.Windows.Forms.Padding(0)
            $b.Name = [string]$c[0]
            $b.Add_Click({ param($s, $e) $script:D.result = [string]$s.Name; $script:D.form.DialogResult = "OK"; $script:D.form.Close() })
            $dlg.Controls.Add($b); $y += 54; $first = $false
        }
        $cn.Width = $cw; $cn.Location = New-Object System.Drawing.Point($pad, $y); $dlg.Controls.Add($cn); $y += 56
    }
    else {
        $ok.Add_Click({ $t = $script:D.tb.Text.Trim(); $script:D.result = $t; $script:D.form.DialogResult = "OK"; $script:D.form.Close() })
        $xs = @(); $btns = @($ok); $gn = $null
        if ($mode -eq "secret" -and $allowGen) {
            $gn = New-Btn ([System.Drawing.Color]::FromArgb(22, 58, 96)) 170; $gn.Height = 42; $gn.Text = (L "gen"); $gn.Margin = New-Object System.Windows.Forms.Padding(0)
            $gn.Add_Click({ $script:D.result = "@@GENERATE"; $script:D.form.DialogResult = "OK"; $script:D.form.Close() })
            $btns += $gn
        }
        $btns += $cn
        # primary first on the leading side; mirrored for Arabic
        $total = 0; foreach ($bb in $btns) { $total += $bb.Width + 10 }; $total -= 10
        $x = $W - $pad - $total   # primary action on the right in both languages (the leading side when reading Arabic)
        $ordered = @($cn) + @($gn) + @($ok) | Where-Object { $_ }
        foreach ($bb in $ordered) { $bb.Location = New-Object System.Drawing.Point($x, $y); $dlg.Controls.Add($bb); $x += $bb.Width + 10 }
        $y += 56
        $script:D.ok.Enabled = ($mode -eq "text")
        if ($mode -eq "secret") {
            $script:D.tb.Add_TextChanged({ try {
                $v = $script:D.tb.Text; $k = $script:D.kind; $ek = Get-DlgError $k $v
                if ($v.Length -eq 0) { $script:D.msg.ForeColor = $cMuted; $script:D.msg.Text = (L "secretNote2"); $script:D.ok.Enabled = $false }
                elseif ($ek) { $script:D.msg.ForeColor = $cRed; $script:D.msg.Text = [string][char]0x2716 + "  " + (L $ek); $script:D.ok.Enabled = $false }
                else { $script:D.msg.ForeColor = $cGreen; $script:D.msg.Text = [string][char]0x2714 + "  " + (L "looksOk"); $script:D.ok.Enabled = $true }
                if ($script:D.segs.Count -eq 4) {
                    $sc = $(if ($ek) { [Math]::Min(1, (Get-StrengthScore $v)) } else { Get-StrengthScore $v })
                    $cols = @($cRed, [System.Drawing.Color]::FromArgb(255, 170, 70), [System.Drawing.Color]::FromArgb(190, 220, 90), $cGreen); $names = @("", "weak", "fair", "good", "strong")
                    for ($i = 0; $i -lt 4; $i++) { Tween $script:D.segs[$i] $(if ($i -lt $sc) { $cols[[Math]::Max(0, $sc - 1)] } else { $cBorder }) 140 }
                    $script:D.strLbl.Text = $(if ($sc -gt 0) { L $names[$sc] } else { "" })
                }
            } catch { } })
        }
    }
    $dlg.ClientSize = New-Object System.Drawing.Size($W, [Math]::Min($y + 10, $wa.Height - 40))
    Round-Region $dlg 14
    $dlg.Add_Paint({ param($s, $e) try { $e.Graphics.SmoothingMode = "AntiAlias"; $pn = New-Object System.Drawing.Pen($cBorder, 2); $gp = New-RoundedPath ($s.Width - 1) ($s.Height - 1) 14; $e.Graphics.DrawPath($pn, $gp); $pn.Dispose(); $gp.Dispose() } catch { } })
    if ($mode -ne "choice") { $dlg.AcceptButton = $script:D.ok; $dlg.ActiveControl = $script:D.tb }
    $dlg.CancelButton = $cn
    if ($script:animOn) { $dlg.Opacity = 0; [void]$script:fades.Add($dlg) }
    $r = $dlg.ShowDialog($form)
    $res = $(if ($r -eq "OK") { [string]$script:D.result } else { "" })
    if ($script:D.tb) { $script:D.tb.Text = "" }
    $script:D = $null
    $dlg.Dispose()
    return $res
}
function Show-ChangePwDialog {
    # old + new + confirm, masked. Returns @{ old; new } or $null. Values are never logged.
    $rtl = ($script:lang -eq "ar")
    $script:D = @{ form = $null; drag = $false; dx = 0; dy = 0; result = $null }
    $W = [Math]::Min(600, $wa.Width - 30); $pad = 26; $cw = $W - 2 * $pad
    $dlg = New-Object System.Windows.Forms.Form
    $dlg.FormBorderStyle = "None"; $dlg.StartPosition = "CenterParent"; $dlg.ShowInTaskbar = $false; $dlg.BackColor = $cBg; $dlg.ForeColor = $cText; $dlg.Font = $font; $dlg.Text = (L "pwTitle")
    $script:D.form = $dlg
    $head = New-Panel $cSide; $head.Location = New-Object System.Drawing.Point(0, 0); $head.Size = New-Object System.Drawing.Size($W, 58)
    $ic = New-Object System.Windows.Forms.PictureBox; $ic.SizeMode = "Zoom"; $ic.Size = New-Object System.Drawing.Size(34, 34); $ic.BackColor = $cSide
    try { if ($form.Icon) { $ic.Image = $form.Icon.ToBitmap() } } catch { }
    $tt = New-Object System.Windows.Forms.Label; $tt.AutoSize = $false; $tt.Text = (L "pwTitle"); $tt.Font = New-Object System.Drawing.Font("Segoe UI Semibold", 12); $tt.ForeColor = $cText; $tt.BackColor = $cSide; $tt.Size = New-Object System.Drawing.Size(($W - 2 * $pad - 48), 58)
    if ($rtl) { $ic.Location = New-Object System.Drawing.Point(($W - $pad - 34), 12); $tt.Location = New-Object System.Drawing.Point($pad, 0); $tt.TextAlign = "MiddleRight"; $tt.RightToLeft = "Yes" } else { $ic.Location = New-Object System.Drawing.Point($pad, 12); $tt.Location = New-Object System.Drawing.Point(($pad + 46), 0); $tt.TextAlign = "MiddleLeft" }
    $head.Controls.Add($ic); $head.Controls.Add($tt)
    $accent = New-Panel $cBlue; $accent.Location = New-Object System.Drawing.Point(0, 58); $accent.Size = New-Object System.Drawing.Size($W, 2)
    $dlg.Controls.Add($head); $dlg.Controls.Add($accent)
    foreach ($dc in @($head, $ic, $tt)) {
        $dc.Add_MouseDown({ param($s, $e) $script:D.drag = $true; $p = [System.Windows.Forms.Cursor]::Position; $script:D.dx = $p.X - $script:D.form.Left; $script:D.dy = $p.Y - $script:D.form.Top })
        $dc.Add_MouseMove({ param($s, $e) if ($script:D.drag) { $p = [System.Windows.Forms.Cursor]::Position; $script:D.form.Location = New-Object System.Drawing.Point(($p.X - $script:D.dx), ($p.Y - $script:D.dy)) } })
        $dc.Add_MouseUp({ param($s, $e) $script:D.drag = $false })
    }
    $y = 76
    $lb = New-DlgLabel (L "pwHelp") (New-Object System.Drawing.Font("Segoe UI Semibold", 10)) $cText $pad $y $cw $rtl; $dlg.Controls.Add($lb); $y += $lb.Height + 4
    $rl = New-DlgLabel (L "rulesNew") (New-Object System.Drawing.Font("Segoe UI", 9)) $cMuted $pad $y $cw $rtl; $dlg.Controls.Add($rl); $y += $rl.Height + 10
    $tbs = @()
    foreach ($cap in @("pwOld", "pwNew", "pwConf")) {
        $cl = New-DlgLabel (L $cap) (New-Object System.Drawing.Font("Segoe UI Semibold", 9.5)) $cText $pad $y $cw $rtl; $dlg.Controls.Add($cl); $y += $cl.Height + 2
        $parts = New-DlgField $pad $y $cw $true $rtl
        $dlg.Controls.Add($parts[0]); $tbs += $parts[1]; $parts[2].Tag = $parts[1]
        $parts[2].Add_Click({ param($s, $e) try { $t = $s.Tag; $t.UseSystemPasswordChar = (-not $t.UseSystemPasswordChar); $s.Text = $(if ($t.UseSystemPasswordChar) { (L "show") } else { (L "hide") }); $t.Focus() } catch { } })
        $y += 52
        if ($cap -eq "pwNew") {
            $segW = [int](($cw - 120 - 3 * 6) / 4); $script:D.segs = @()
            for ($si = 0; $si -lt 4; $si++) { $sg = New-Panel $cBorder; $sg.Size = New-Object System.Drawing.Size($segW, 6); $sg.Location = New-Object System.Drawing.Point(($pad + $si * ($segW + 6)), ($y + 5)); Round-Region $sg 3; $dlg.Controls.Add($sg); $script:D.segs += $sg }
            $sl = New-Object System.Windows.Forms.Label; $sl.AutoSize = $false; $sl.Size = New-Object System.Drawing.Size(110, 18); $sl.Location = New-Object System.Drawing.Point(($pad + $cw - 110), $y); $sl.ForeColor = $cMuted; $sl.TextAlign = "MiddleRight"; $sl.Font = New-Object System.Drawing.Font("Segoe UI", 9); $dlg.Controls.Add($sl); $script:D.strLbl = $sl
            $y += 22
        }
    }
    $script:D.tbs = $tbs
    $mg = New-Object System.Windows.Forms.Label; $mg.AutoSize = $false; $mg.Size = New-Object System.Drawing.Size($cw, 22); $mg.Location = New-Object System.Drawing.Point($pad, $y); $mg.Font = New-Object System.Drawing.Font("Segoe UI", 9.5); $mg.ForeColor = $cMuted; $mg.BackColor = [System.Drawing.Color]::Transparent
    if ($rtl) { $mg.RightToLeft = "Yes" }; $dlg.Controls.Add($mg); $script:D.msg = $mg; $y += 26
    $nt = New-DlgLabel (L "pwNote") (New-Object System.Drawing.Font("Segoe UI", 9)) $cMuted $pad $y $cw $rtl; $dlg.Controls.Add($nt); $y += $nt.Height + 12
    $ok = New-Btn $cBlue 190; $ok.Height = 42; $ok.Text = (L "pwBtn"); $ok.Margin = New-Object System.Windows.Forms.Padding(0); $ok.Enabled = $false
    $cn = New-Btn ([System.Drawing.Color]::FromArgb(30, 41, 59)) 120; $cn.Height = 42; $cn.Text = (L "cancel"); $cn.Margin = New-Object System.Windows.Forms.Padding(0)
    $cn.Location = New-Object System.Drawing.Point(($W - $pad - 190 - 10 - 120), $y); $ok.Location = New-Object System.Drawing.Point(($W - $pad - 190), $y)
    $dlg.Controls.Add($cn); $dlg.Controls.Add($ok); $script:D.ok = $ok; $y += 56
    $cn.Add_Click({ $script:D.result = $null; $script:D.form.DialogResult = "Cancel"; $script:D.form.Close() })
    $ok.Add_Click({ $script:D.result = @{ old = $script:D.tbs[0].Text.Trim(); new = $script:D.tbs[1].Text.Trim() }; $script:D.form.DialogResult = "OK"; $script:D.form.Close() })
    $check = {
        try {
            $o = $script:D.tbs[0].Text.Trim(); $n = $script:D.tbs[1].Text.Trim(); $c = $script:D.tbs[2].Text.Trim()
            $ek = ""; $okv = $false
            if (-not $o) { $ek = "" } elseif (Get-DlgError "old" $o) { $ek = "errSpace" }
            elseif (-not $n) { $ek = "" } elseif (Get-DlgError "new" $n) { $ek = Get-DlgError "new" $n }
            elseif ($n -ceq $o) { $ek = "errSame" }
            elseif (-not $c) { $ek = "" } elseif ($c -cne $n) { $ek = "errMatch" } else { $okv = $true }
            if ($okv) { $script:D.msg.ForeColor = $cGreen; $script:D.msg.Text = [string][char]0x2714 + "  " + (L "pwReady") }
            elseif ($ek) { $script:D.msg.ForeColor = $cRed; $script:D.msg.Text = [string][char]0x2716 + "  " + (L $ek) }
            else { $script:D.msg.ForeColor = $cMuted; $script:D.msg.Text = "" }
            $script:D.ok.Enabled = $okv
            $sc = $(if ($n) { Get-StrengthScore $n } else { 0 }); if (Get-DlgError "new" $n) { $sc = [Math]::Min(1, $sc) }
            $cols = @($cRed, [System.Drawing.Color]::FromArgb(255, 170, 70), [System.Drawing.Color]::FromArgb(190, 220, 90), $cGreen); $names = @("", "weak", "fair", "good", "strong")
            for ($i = 0; $i -lt 4; $i++) { Tween $script:D.segs[$i] $(if ($i -lt $sc) { $cols[[Math]::Max(0, $sc - 1)] } else { $cBorder }) 140 }
            $script:D.strLbl.Text = $(if ($sc -gt 0) { L $names[$sc] } else { "" })
        } catch { }
    }
    foreach ($t in $tbs) { $t.Add_TextChanged($check) }
    $dlg.ClientSize = New-Object System.Drawing.Size($W, [Math]::Min($y + 6, $wa.Height - 30))
    Round-Region $dlg 14
    $dlg.Add_Paint({ param($s, $e) try { $e.Graphics.SmoothingMode = "AntiAlias"; $pn = New-Object System.Drawing.Pen($cBorder, 2); $gp = New-RoundedPath ($s.Width - 1) ($s.Height - 1) 14; $e.Graphics.DrawPath($pn, $gp); $pn.Dispose(); $gp.Dispose() } catch { } })
    $dlg.AcceptButton = $ok; $dlg.CancelButton = $cn; $dlg.ActiveControl = $tbs[0]
    if ($script:animOn) { $dlg.Opacity = 0; [void]$script:fades.Add($dlg) }
    $r = $dlg.ShowDialog($form)
    $res = $(if ($r -eq "OK") { $script:D.result } else { $null })
    foreach ($t in $tbs) { $t.Text = "" }
    $script:D = $null
    $dlg.Dispose()
    return $res
}
function Ask-Input([string]$prompt) {
    # all input dialogs go through Show-Dlg. Any error here falls back to a cancelled answer (the installer then stops safely).
    try {
        $choices = @()
        if ($prompt -match '\[\[choices:(.*?)\]\]\s*$') {
            foreach ($p in ($Matches[1] -split ';')) { $kv = $p -split '=', 2; $choices += , @($kv[0], $kv[1]) }
            $prompt = ($prompt -replace '\s*\[\[choices:.*?\]\]\s*$', '')
            return (Show-Dlg $prompt "choice" $false $choices)
        }
        if ($prompt -match '\[\[secret:(gen|nogen)\]\]\s*$') {
            $gen = ($Matches[1] -eq "gen"); $prompt = ($prompt -replace '\s*\[\[secret:(gen|nogen)\]\]\s*$', '')
            return (Show-Dlg $prompt "secret" $gen @())
        }
        return (Show-Dlg $prompt "text" $false @())
    }
    catch { Log-GuiError $_.Exception "dialog"; return "" }
}

function Handle-Line([string]$line) {
    if ($line.Length -eq 0) { return }
    if ($line.StartsWith("@@PROMPT|")) {
        $p = $line.Split("|", 3)
        $timer.Stop()
        $isSecret = ($p[2] -match '\[\[secret:')
        $ans = Ask-Input $p[2]
        $timer.Start()
        $f = Join-Path $script:ioDir ("answer-" + $p[1] + ".txt")
        [IO.File]::WriteAllText($f, $ans, (New-Object Text.UTF8Encoding($false)))
        Write-Log ("   > " + $(if (-not $ans) { "(cancelled)" } elseif ($isSecret) { "(hidden, " + $(if ($ans -eq "@@GENERATE") { "generate" } else { "typed" }) + ")" } else { $ans })) ([System.Drawing.Color]::LightSkyBlue)
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
        if ($mode -eq "IMAGES") { Show-Result "ok" ((L "okTitle") + "`r`n" + $d[2]); if ($script:retryOp) { $r = $script:retryOp; $script:retryOp = $null; Start-Op $r }; return }
        if ($mode -eq "EXISTING") { Show-Result "ok" ((L "okTitle") + "`r`n" + $d[2]); return }
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
    if (($script:failKey -eq "noimages" -or $script:failKey -eq "notar") -and $script:op -ne "images") {
        $script:retryOp = $script:op
        try { $pk = Show-Dlg (L "imgAsk") "choice" $false @(, @("go", (L "imgGo"))); if ($pk -eq "go") { Start-Op "images" } else { $script:retryOp = $null } } catch { Log-GuiError $_.Exception "imgoffer" }
    }
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
    $content.RowStyles[2].Height = $(if ($op -eq "status" -or $op -eq "exstatus") { 0 } else { 100 })
    $engine = switch ($op) { "install" { "install-or-update.ps1" } "switch" { "rollback.ps1" } "exconnect" { "use-existing-db.ps1" } "exrestore" { "use-existing-db.ps1" } "exstatus" { "use-existing-db.ps1" } "exdry" { "use-existing-db.ps1" } "images" { "get-images.ps1" } default { "status.ps1" } }
    $exMode = switch ($op) { "exdry" { "dryrun" } "exconnect" { "connect" } "exrestore" { "restore" } default { "status" } }
    $script:ioDir = Join-Path $env:TEMP ("erp-installer-" + [guid]::NewGuid().ToString("N"))
    New-Item -ItemType Directory -Force -Path $script:ioDir | Out-Null
    $script:outFile = Join-Path $script:ioDir "out.txt"
    $inner = ('powershell.exe -NoProfile -ExecutionPolicy Bypass -File "{0}" -Gui -IoDir "{1}" -BackupDir "{2}" > "{3}" 2>&1' -f (Join-Path $PSScriptRoot $engine), $script:ioDir, $BackupDir, $script:outFile)
    if ($op -like "ex*") { $inner = $inner.Replace(' > "' + $script:outFile + '"', (' -Mode {0} -Lang {1} > "{2}"' -f $exMode, $script:lang, $script:outFile)) }
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
function Start-Existing {
    try {
        if ($script:busy) { return }
        $ch = @(@("exdry", (L "exDry")), @("exconnect", (L "exConnect")), @("exrestore", (L "exRestore")), @("exstatus", (L "exStatus")))
        $pick = Show-Dlg ((L "exTitle") + "`n" + (L "exHelp")) "choice" $false $ch
        if ($pick -in @("exdry", "exconnect", "exrestore", "exstatus")) { Start-Op $pick }
    } catch { Log-GuiError $_.Exception "existingdb" }
}
$btnEx.Add_Click({ Start-Existing })
$btnPw.Add_Click({
    try {
        if ($script:busy) { return }
        $r = Show-ChangePwDialog
        if ($r) {
            # values travel only through a private temp file that the script deletes as its first action; never in arguments or the log
            $f = Join-Path $env:TEMP ("erp-pw-" + [guid]::NewGuid().ToString("N") + ".txt")
            [IO.File]::WriteAllText($f, ($r.old + "`r`n" + $r.new + "`r`n"), (New-Object Text.UTF8Encoding($false)))
            $r = $null
            $rs = Join-Path $PSScriptRoot "recover-erp-data.ps1"
            Start-Process powershell -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ('"' + $rs + '"'), "-Step", "change", "-InputFile", ('"' + $f + '"')) -WorkingDirectory $RootDir
            Write-Log (L "pwStarted") ([System.Drawing.Color]::LightSkyBlue)
        }
    } catch { Log-GuiError $_.Exception "changepw" }
})
$btnClose.Add_Click({ $form.Close() })
$btnEn.Add_Click({ try { $script:lang = "en"; Apply-Lang } catch { Log-GuiError $_.Exception "btnEn" } })
$btnAr.Add_Click({ try { $script:lang = "ar"; Apply-Lang } catch { Log-GuiError $_.Exception "btnAr" } })
$form.Add_FormClosing({
    if ($script:proc -and -not $script:proc.HasExited) {
        [void][System.Windows.Forms.MessageBox]::Show((L "busy"))
        $_.Cancel = $true
    }
})

Build-Steps (L "s_install")
Apply-Lang
Layout-Header
if ($Open -eq "existing") { $form.Add_Shown({ Start-Existing }) }
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
