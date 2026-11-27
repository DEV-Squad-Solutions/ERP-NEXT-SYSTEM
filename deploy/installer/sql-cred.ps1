# Shared helper: asks for a SQL login (username + password) in a masked dialog when a backup cannot log in.
# The values are typed locally, never printed, never logged and never written to disk. Cancel returns $null.
function Show-SqlCredDialog([string]$prompt, [string]$defUser = "sa", [string]$lang = "en") {
    try { Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing } catch { return $null }
    $ar = ($lang -eq "ar")
    $S = if ($ar) { @{ title = "بيانات دخول SQL Server"; user = "اسم المستخدم"; pass = "الباسورد"; show = "إظهار"; hide = "إخفاء"; note = "بتتكتب هنا بس على جهازك، مبتتعرضش ومبتتسجلش ومبتتحفظش في أي ملف."; ok = "تحقق وكمّل"; cancel = "إلغاء"; err = "اكتب اسم المستخدم والباسورد." } }
         else { @{ title = "SQL Server sign-in"; user = "Username"; pass = "Password"; show = "Show"; hide = "Hide"; note = "Typed here on this PC only. Never shown, logged or saved to a file."; ok = "Verify and continue"; cancel = "Cancel"; err = "Enter the username and the password." } }
    $bg = [Drawing.Color]::FromArgb(10, 13, 20); $card = [Drawing.Color]::FromArgb(17, 23, 34); $txt = [Drawing.Color]::FromArgb(232, 238, 246)
    $mut = [Drawing.Color]::FromArgb(140, 152, 170); $blue = [Drawing.Color]::FromArgb(37, 120, 214); $cy = [Drawing.Color]::FromArgb(90, 200, 255); $red = [Drawing.Color]::FromArgb(255, 105, 115)
    $W = 520
    $f = New-Object Windows.Forms.Form
    $f.FormBorderStyle = "None"; $f.StartPosition = "CenterScreen"; $f.BackColor = $bg; $f.ForeColor = $txt; $f.TopMost = $true; $f.ShowInTaskbar = $true; $f.Text = $S.title
    $f.Font = New-Object Drawing.Font("Segoe UI", 10); $f.ClientSize = New-Object Drawing.Size($W, 330)
    if ($ar) { $f.RightToLeft = "Yes"; $f.RightToLeftLayout = $true }
    $f.Add_Paint({ param($s, $e) $p = New-Object Drawing.Pen([Drawing.Color]::FromArgb(34, 46, 66)); $e.Graphics.DrawRectangle($p, 0, 0, $s.Width - 1, $s.Height - 1); $p.Dispose() })
    $head = New-Object Windows.Forms.Label; $head.Text = "  " + [string][char]0x1F512 + "  " + $S.title; $head.Font = New-Object Drawing.Font("Segoe UI Semibold", 12); $head.ForeColor = $txt; $head.BackColor = [Drawing.Color]::Black
    $head.SetBounds(0, 0, $W, 54); $head.TextAlign = $(if ($ar) { "MiddleRight" } else { "MiddleLeft" }); $f.Controls.Add($head)
    $acc = New-Object Windows.Forms.Panel; $acc.BackColor = $blue; $acc.SetBounds(0, 54, $W, 2); $f.Controls.Add($acc)
    $script:cdrag = $false
    $head.Add_MouseDown({ $script:cdrag = $true; $p = [Windows.Forms.Cursor]::Position; $script:cdx = $p.X - $f.Left; $script:cdy = $p.Y - $f.Top })
    $head.Add_MouseMove({ if ($script:cdrag) { $p = [Windows.Forms.Cursor]::Position; $f.Location = New-Object Drawing.Point(($p.X - $script:cdx), ($p.Y - $script:cdy)) } })
    $head.Add_MouseUp({ $script:cdrag = $false })
    $lp = New-Object Windows.Forms.Label; $lp.Text = $prompt; $lp.ForeColor = $txt; $lp.BackColor = $bg; $lp.Font = New-Object Drawing.Font("Segoe UI Semibold", 10); $lp.SetBounds(26, 68, ($W - 52), 46); $f.Controls.Add($lp)
    function New-Field([string]$label, [int]$y, [bool]$masked, [string]$val) {
        $l = New-Object Windows.Forms.Label; $l.Text = $label; $l.ForeColor = $mut; $l.BackColor = $bg; $l.Font = New-Object Drawing.Font("Segoe UI", 9); $l.SetBounds(26, $y, ($W - 52), 20); $f.Controls.Add($l)
        $b = New-Object Windows.Forms.Panel; $b.BackColor = $card; $b.SetBounds(26, ($y + 22), ($W - 52), 38); $f.Controls.Add($b)
        $t = New-Object Windows.Forms.TextBox; $t.BorderStyle = "None"; $t.BackColor = $card; $t.ForeColor = $txt; $t.Font = New-Object Drawing.Font("Segoe UI", 11); $t.Text = $val
        $t.RightToLeft = "No"; $t.SetBounds(10, 7, ($W - 52 - $(if ($masked) { 96 } else { 20 })), 26); if ($masked) { $t.UseSystemPasswordChar = $true }; $b.Controls.Add($t)
        return @($b, $t)
    }
    $u = New-Field $S.user 118 $false $defUser
    $p = New-Field $S.pass 188 $true ""
    $eye = New-Object Windows.Forms.Label; $eye.Text = $S.show; $eye.ForeColor = $cy; $eye.BackColor = $card; $eye.Cursor = "Hand"; $eye.TextAlign = "MiddleCenter"; $eye.SetBounds(($W - 52 - 80), 4, 76, 30); $p[0].Controls.Add($eye)
    $eye.Add_Click({ $p[1].UseSystemPasswordChar = -not $p[1].UseSystemPasswordChar; $eye.Text = $(if ($p[1].UseSystemPasswordChar) { $S.show } else { $S.hide }) })
    $nt = New-Object Windows.Forms.Label; $nt.Text = $S.note; $nt.ForeColor = $mut; $nt.BackColor = $bg; $nt.Font = New-Object Drawing.Font("Segoe UI", 9); $nt.SetBounds(26, 254, ($W - 52), 20); $f.Controls.Add($nt)
    $er = New-Object Windows.Forms.Label; $er.ForeColor = $red; $er.BackColor = $bg; $er.Font = New-Object Drawing.Font("Segoe UI", 9); $er.SetBounds(26, 274, ($W - 52), 18); $f.Controls.Add($er)
    $ok = New-Object Windows.Forms.Button; $ok.Text = $S.ok; $ok.FlatStyle = "Flat"; $ok.FlatAppearance.BorderSize = 0; $ok.BackColor = $blue; $ok.ForeColor = [Drawing.Color]::White; $ok.Font = New-Object Drawing.Font("Segoe UI Semibold", 10); $ok.Cursor = "Hand"
    $cn = New-Object Windows.Forms.Button; $cn.Text = $S.cancel; $cn.FlatStyle = "Flat"; $cn.FlatAppearance.BorderSize = 0; $cn.BackColor = [Drawing.Color]::FromArgb(30, 41, 59); $cn.ForeColor = $txt; $cn.Font = New-Object Drawing.Font("Segoe UI", 10); $cn.Cursor = "Hand"
    if ($ar) { $ok.SetBounds(($W - 26 - 200), 288, 200, 80); } else { $ok.SetBounds(26, 288, 200, 80) }
    $ok.Height = 34; $cn.Height = 34; $ok.Top = 292; $cn.Top = 292; $cn.Width = 110; $cn.Left = $(if ($ar) { 26 } else { $W - 26 - 110 })
    $f.ClientSize = New-Object Drawing.Size($W, 340); $f.Controls.Add($ok); $f.Controls.Add($cn)
    $script:credRes = $null
    $ok.Add_Click({ if (-not $u[1].Text.Trim() -or -not $p[1].Text) { $er.Text = $S.err; return }; $script:credRes = @{ user = $u[1].Text.Trim(); pass = $p[1].Text }; $f.DialogResult = "OK"; $f.Close() })
    $cn.Add_Click({ $script:credRes = $null; $f.DialogResult = "Cancel"; $f.Close() })
    $f.AcceptButton = $ok; $f.CancelButton = $cn; $f.Add_Shown({ $f.Activate(); $p[1].Focus() })
    [void]$f.ShowDialog(); $r = $script:credRes; $f.Dispose(); $script:credRes = $null
    return $r
}
function Request-SqlCredential([string]$prompt, [bool]$gui = $false, [string]$ioDir = "", [string]$lang = "en") {
    # GUI installer: the installer window shows the dialog (same prompt protocol as the other dialogs). Console tools: the dialog opens by itself.
    if ($gui) {
        $id = "c" + [guid]::NewGuid().ToString("N").Substring(0, 8)
        Write-Host "@@PROMPT|$id|$($prompt -replace '[\r\n]+', ' ') [[cred]]"
        $af = Join-Path $ioDir "answer-$id.txt"
        while (-not (Test-Path $af)) { Start-Sleep -Milliseconds 300 }
        Start-Sleep -Milliseconds 200
        $a = [IO.File]::ReadAllText($af); Remove-Item $af -Force -ErrorAction SilentlyContinue
        $i = $a.IndexOf("`t"); if ($i -lt 1) { return $null }
        return @{ user = $a.Substring(0, $i).Trim(); pass = $a.Substring($i + 1).TrimEnd("`r", "`n") }
    }
    return (Show-SqlCredDialog $prompt "sa" $lang)
}
function Get-SqlEnvArgs {
    # forwards a typed login to docker exec WITHOUT putting the value on the command line. Only variables that are set are forwarded
    # (a bare "-e NAME" for an unset variable would REMOVE the container's own setting).
    $a = @()
    if ($env:MSSQL_SA_PASSWORD) { $a += @("-e", "MSSQL_SA_PASSWORD") }
    if ($env:ERP_SQL_USER) { $a += @("-e", "ERP_SQL_USER") }
    return $a
}
