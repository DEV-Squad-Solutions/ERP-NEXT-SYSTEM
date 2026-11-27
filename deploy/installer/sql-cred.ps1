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
    $head = New-Object Windows.Forms.Label; $head.Text = "  " + [char]::ConvertFromUtf32(0x1F512) + "  " + $S.title; $head.Font = New-Object Drawing.Font("Segoe UI Semibold", 12); $head.ForeColor = $txt; $head.BackColor = [Drawing.Color]::Black
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

function Find-OldEnvFiles([string]$root) {
    # Looks for old .env files (read only): this deploy folder, its parent and sibling folders, backup folders, and the folders the old
    # Docker Compose projects were started from (compose labels of minierp-* / erp-* containers). Returns full paths. Values are never read here.
    $dirs = New-Object System.Collections.ArrayList
    function Add-Dir($d) { if ($d -and (Test-Path $d -PathType Container) -and -not $dirs.Contains($d)) { [void]$dirs.Add($d) } }
    Add-Dir $root
    $par = Split-Path $root -Parent
    if ($par) {
        Add-Dir $par
        foreach ($sd in @(Get-ChildItem -Path $par -Directory -ErrorAction SilentlyContinue | Select-Object -First 40)) { Add-Dir $sd.FullName }
        $gp = Split-Path $par -Parent; if ($gp) { Add-Dir $gp }
    }
    foreach ($d in @("C:\ERP_backup", "D:\minierp_backup", "C:\ERP_backup\old-sql-backup")) { Add-Dir $d }
    try {
        foreach ($n in @(docker ps -a --format "{{.Names}}" 2>$null | Where-Object { $_ -match '^(minierp|erp)' })) {
            $wd = docker inspect -f '{{index .Config.Labels "com.docker.compose.project.working_dir"}}' $n 2>$null
            if ($wd -and $wd -ne "<no value>") { Add-Dir ($wd.Trim()); $pd = Split-Path ($wd.Trim()) -Parent; if ($pd) { Add-Dir $pd } }
        }
    } catch { }
    $files = New-Object System.Collections.ArrayList
    foreach ($d in $dirs) {
        foreach ($f in @(Get-ChildItem -Path $d -File -Force -ErrorAction SilentlyContinue | Where-Object { ($_.Name -like ".env*" -or $_.Name -like "*.env") -and $_.Length -lt 65536 })) {
            if (-not $files.Contains($f.FullName)) { [void]$files.Add($f.FullName) }
        }
    }
    # the current .env first, then the rest
    return @($files | Sort-Object { if ($_ -ieq (Join-Path $root ".env")) { 0 } else { 1 } })
}
function Get-EnvLoginCandidates([string[]]$files) {
    # returns @{ user; pass; src } for each distinct password found in the files (values kept in memory only)
    $out = New-Object System.Collections.ArrayList; $seen = @{}
    foreach ($f in $files) {
        $t = ""; try { $t = [IO.File]::ReadAllText($f, [Text.Encoding]::UTF8).TrimStart([char]0xFEFF) } catch { continue }
        $user = "sa"
        $um = [regex]::Match($t, '(?m)^[ \t]*(?:export[ \t]+)?(?:SQL_USER|SQL_USERNAME|DB_USER|MSSQL_USER)[ \t]*=[ \t]*([^\r\n#]+)')
        if ($um.Success) { $u2 = $um.Groups[1].Value.Trim().Trim('"').Trim("'"); if ($u2) { $user = $u2 } }
        $pw = New-Object System.Collections.ArrayList
        foreach ($m in [regex]::Matches($t, '(?m)^[ \t]*(?:export[ \t]+)?(?:SQL_SA_PASSWORD|MSSQL_SA_PASSWORD|SA_PASSWORD|SQL_PASSWORD|DB_PASSWORD)[ \t]*=[ \t]*([^\r\n]+)')) { [void]$pw.Add($m.Groups[1].Value.Trim().Trim('"').Trim("'")) }
        foreach ($m in [regex]::Matches($t, '(?i)Password=([^;\r\n"'']+)')) { [void]$pw.Add($m.Groups[1].Value.Trim()) }
        foreach ($p in $pw) {
            if (-not $p -or $p.Length -lt 3 -or $seen.ContainsKey($p)) { continue }
            $seen[$p] = $true; [void]$out.Add(@{ user = $user; pass = $p; src = $f })
            if ($user -ne "sa") { [void]$out.Add(@{ user = "sa"; pass = $p; src = $f }) }
        }
    }
    return @($out)
}
function Try-AutoLogin([scriptblock]$test, [string]$root, [int]$max = 10) {
    # Tries the passwords found in old .env files with a REAL login (the $test block gets user and password). Returns @{user;pass;src} or $null.
    # At most $max attempts so the sa login is never locked. Nothing secret is printed or logged; only counts and the folder of the file that worked.
    $files = @(Find-OldEnvFiles $root)
    $cands = @(Get-EnvLoginCandidates $files)
    Write-Host ("  Looked for old .env files automatically: {0} file(s) found, {1} candidate login(s) (values are not shown)." -f $files.Count, $cands.Count) -ForegroundColor DarkGray
    $n = 0
    foreach ($c in $cands) {
        if ($n -ge $max) { break }; $n++
        if (& $test $c.user $c.pass) {
            Write-Host ("  OK  A saved login from an old .env worked ({0}). Not shown and not copied anywhere." -f (Split-Path $c.src -Parent)) -ForegroundColor Green
            return $c
        }
    }
    if ($n -gt 0) { Write-Host "  None of the saved logins worked." -ForegroundColor Yellow }
    return $null
}
