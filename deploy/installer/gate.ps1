<#
 Installer password gate (dot-sourced by the installer scripts).
 - The password is set on the first run (masked, typed twice) and is NEVER stored: only a salted PBKDF2 hash goes to .installer-gate.json.
 - Wrong passwords are delayed: from the 3rd failure in a row the gate locks for 15 s, then 30 s, 60 s ... up to 15 minutes.
 - After a correct password the scripts started by this one (same session, up to 2 hours) are not asked again (a signed temp ticket in %TEMP%).
 - Reset: tools\Reset installer password.bat (Administrator, typed confirmation). Needs the PC itself.
 HONEST LIMIT: this stops casual or accidental use. Someone who is Administrator on the PC and can edit these scripts or run docker directly is not stopped.
#>
function Gate-File([string]$root) { return (Join-Path $root ".installer-gate.json") }
function Gate-Protect([string]$path) {
    # Restrict a file or folder to the current user, Administrators and SYSTEM (Windows). Errors are ignored (not Windows, no rights).
    try {
        if (-not (Test-Path $path)) { return }
        $dir = (Get-Item $path -Force).PSIsContainer
        $perm = $(if ($dir) { "(OI)(CI)F" } else { "F" })
        & icacls $path /inheritance:r /grant:r ("{0}\{1}:{2}" -f $env:USERDOMAIN, $env:USERNAME, $perm) ("BUILTIN\Administrators:" + $perm) ("NT AUTHORITY\SYSTEM:" + $perm) 2>&1 | Out-Null
    } catch { }
}
function Protect-ErpFiles([string]$root) {
    # .env and its backups hold the database password and the JWT key: keep them private. The state file and logs hold no secrets, but are restricted too.
    foreach ($n in @(".env", ".env.pending", ".installer-gate.json", "existing-db-state.json", "logs")) { Gate-Protect (Join-Path $root $n) }
    foreach ($f in @(Get-ChildItem -Path $root -Force -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -like ".env.bak*" -or $_.Name -like ".env.*.bak" })) { Gate-Protect $f.FullName }
}
function Gate-Derive([string]$pw, [byte[]]$salt, [int]$iter, [string]$alg) {
    if ($alg -eq "SHA256") { $d = New-Object Security.Cryptography.Rfc2898DeriveBytes($pw, $salt, $iter, [Security.Cryptography.HashAlgorithmName]::SHA256) }
    else { $d = New-Object Security.Cryptography.Rfc2898DeriveBytes($pw, $salt, $iter) }
    try { return $d.GetBytes(32) } finally { $d.Dispose() }
}
function Gate-Equal([byte[]]$a, [byte[]]$b) {
    if ($a.Length -ne $b.Length) { return $false }
    $x = 0; for ($i = 0; $i -lt $a.Length; $i++) { $x = $x -bor ($a[$i] -bxor $b[$i]) }
    return ($x -eq 0)
}
function Gate-Load([string]$root) {
    $f = Gate-File $root
    if (-not (Test-Path $f)) { return $null }
    try { return (Get-Content $f -Raw | ConvertFrom-Json) } catch { return $null }
}
function Gate-Save([string]$root, $g) {
    $f = Gate-File $root
    [IO.File]::WriteAllText($f, ($g | ConvertTo-Json), (New-Object Text.UTF8Encoding($false)))
    Gate-Protect $f
}
$script:gateN = 0
function Gate-Ask([string]$text, [bool]$gui, [string]$ioDir) {
    if (-not $gui) {
        $ss = Read-Host $text -AsSecureString
        $b = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($ss)
        try { return ([Runtime.InteropServices.Marshal]::PtrToStringBSTR($b)).Trim() } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b) }
    }
    $script:gateN++; $id = "gate$($script:gateN)"
    Write-Host "@@PROMPT|$id|$text [[secret:nogen]]"
    $f = Join-Path $ioDir "answer-$id.txt"
    while (-not (Test-Path $f)) { Start-Sleep -Milliseconds 300 }
    Start-Sleep -Milliseconds 200
    $a = [IO.File]::ReadAllText($f).Trim(); Remove-Item $f -Force -ErrorAction SilentlyContinue
    return $a
}
function Gate-Fail([string]$m, [bool]$gui) {
    if ($gui) { Write-Host "  FAIL $m" } else { Write-Host "  FAIL $m" -ForegroundColor Red; [void](Read-Host "Press Enter to close") }
    exit 1
}
function New-GateTicket([string]$root, $g) {
    $nonce = -join ((1..16) | ForEach-Object { '{0:x2}' -f (Get-Random -Maximum 256) })
    $exp = (Get-Date).ToUniversalTime().AddHours(2).Ticks
    $h = New-Object Security.Cryptography.HMACSHA256 (, [Convert]::FromBase64String([string]$g.hash))
    $mac = [BitConverter]::ToString($h.ComputeHash([Text.Encoding]::UTF8.GetBytes("$nonce|$exp"))) -replace '-', ''
    [IO.File]::WriteAllText((Join-Path $env:TEMP "erp-gate-$nonce.ticket"), $mac)
    $env:ERP_GATE_TICKET = "$nonce|$exp"
}
function Test-GateTicket([string]$root, $g) {
    try {
        $t = [string]$env:ERP_GATE_TICKET; if (-not $t -or $t -notmatch '^[0-9a-f]{32}\|\d+$') { return $false }
        $nonce, $exp = $t -split '\|'
        if ([int64]$exp -lt (Get-Date).ToUniversalTime().Ticks) { return $false }
        $file = Join-Path $env:TEMP "erp-gate-$nonce.ticket"; if (-not (Test-Path $file)) { return $false }
        $h = New-Object Security.Cryptography.HMACSHA256 (, [Convert]::FromBase64String([string]$g.hash))
        $mac = [BitConverter]::ToString($h.ComputeHash([Text.Encoding]::UTF8.GetBytes("$nonce|$exp"))) -replace '-', ''
        return ($mac -ceq ([IO.File]::ReadAllText($file).Trim()))
    } catch { return $false }
}
function Require-Gate([string]$root, [bool]$gui = $false, [string]$ioDir = "") {
    $g = Gate-Load $root
    if ($g -and (Test-GateTicket $root $g)) { Protect-ErpFiles $root; return }
    if (-not $g) {
        Write-Host "  First run: set the installer password. It is asked before anything is installed, upgraded, restored or switched." -ForegroundColor Cyan
        Write-Host "  Only a salted hash is stored on this PC (never the password). Write it down: the reset needs Administrator rights on this PC." -ForegroundColor DarkGray
        for ($t = 1; $t -le 3; $t++) {
            $p1 = Gate-Ask "Choose the installer password (at least 8 characters)." $gui $ioDir
            if (-not $p1 -or $p1.Length -lt 8) { Write-Host "  Too short (8 characters minimum)." -ForegroundColor Yellow; continue }
            $p2 = Gate-Ask "Type the installer password again." $gui $ioDir
            if ($p1 -cne $p2) { Write-Host "  The two entries are different. Try again." -ForegroundColor Yellow; continue }
            $salt = New-Object byte[] 16; (New-Object Security.Cryptography.RNGCryptoServiceProvider).GetBytes($salt)
            $alg = "SHA256"; $iter = 200000
            try { $hash = Gate-Derive $p1 $salt $iter $alg } catch { $alg = "SHA1"; $hash = Gate-Derive $p1 $salt $iter $alg }
            $p1 = $null; $p2 = $null
            $g = [pscustomobject]@{ v = 1; alg = $alg; iter = $iter; salt = [Convert]::ToBase64String($salt); hash = [Convert]::ToBase64String($hash); fails = 0; lockUntil = 0 }
            Gate-Save $root $g
            Write-Host "  OK  Installer password set." -ForegroundColor Green
            New-GateTicket $root $g; Protect-ErpFiles $root; return
        }
        Gate-Fail "The installer password was not set. Nothing was changed." $gui
    }
    for ($t = 1; $t -le 3; $t++) {
        $g = Gate-Load $root
        $now = (Get-Date).ToUniversalTime().Ticks
        if ([int64]$g.lockUntil -gt $now) { Gate-Fail ("Too many wrong passwords. Locked for {0} more seconds. Nothing was changed." -f [int](([int64]$g.lockUntil - $now) / 1e7)) $gui }
        $p = Gate-Ask "Enter the installer password." $gui $ioDir
        $ok = $false
        try { $calc = Gate-Derive $p ([Convert]::FromBase64String([string]$g.salt)) ([int]$g.iter) ([string]$g.alg); $ok = Gate-Equal $calc ([Convert]::FromBase64String([string]$g.hash)) } catch { $ok = $false }
        $p = $null
        if ($ok) {
            $g.fails = 0; $g.lockUntil = 0; Gate-Save $root $g
            New-GateTicket $root $g; Protect-ErpFiles $root; return
        }
        $g.fails = [int]$g.fails + 1
        if ($g.fails -ge 3) { $delay = [Math]::Min(900, 15 * [Math]::Pow(2, $g.fails - 3)); $g.lockUntil = ((Get-Date).ToUniversalTime().AddSeconds($delay)).Ticks }
        Gate-Save $root $g
        Write-Host "  Wrong installer password." -ForegroundColor Yellow
    }
    Gate-Fail "Wrong installer password. Nothing was changed." $gui
}
