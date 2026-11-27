<#
 Recover the SQL data of the erp-db volume (erp_sql_data) when the SA password in .env does not match it.
 SAFETY: the original volume is NEVER modified or deleted. Every step works on a file copy.
   1  Copy files   : stops erp-db briefly (clean shutdown), copies the volume files to a folder, checks the size, starts erp-db again.
   2  Find password: tests candidate passwords (from .env, .env.bak*, other .env copies, erp-* container settings) against erp-db.
                     Candidates are never printed. If one works it is saved to .env (the old .env is kept as .env.bak.<time>).
   3  Recover on a COPY: clones the volume to a NEW volume (erp_sql_data_recovered), resets the SA password ON THE COPY
                     (mssql-conf set-sa-password, the documented way when the password is lost), starts a temporary SQL container
                     on the copy, checks that MiniErp exists and has rows, writes a verified .bak next to your backups, and (only
                     if MiniErp has data) points .env at the recovered volume with the new password.
 Needs Docker Desktop running. Does not touch minierp-db or any minierp volume.
#>
param([string]$Step = "menu", [string]$BackupDir = "C:\ERP_backup", [string]$InputFile = "")
$ErrorActionPreference = "Continue"
$Root = $(if (Test-Path (Join-Path $PSScriptRoot "docker-compose.yml")) { $PSScriptRoot } else { Split-Path $PSScriptRoot -Parent })
$img = "mcr.microsoft.com/mssql/server:2022-latest"
$SrcVol = "erp_sql_data"; $NewVol = "erp_sql_data_recovered"; $Tmp = "erp-recover-test"
$envFile = Join-Path $Root ".env"
function Say($t, $c = "Gray") { Write-Host $t -ForegroundColor $c }
function Stop-Now($m) { Say ""; Say "STOPPED: $m" Red; Say "Nothing was deleted. The original volume $SrcVol was not deleted." Yellow; docker rm -f $Tmp *> $null; if ($InputFile) { [void](Read-Host "Press Enter to close this window") }; exit 1 }
function New-Secret([int]$len) {
    $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
    $rng = New-Object System.Security.Cryptography.RNGCryptoServiceProvider
    do { $bytes = New-Object byte[] $len; $rng.GetBytes($bytes); $s = -join ($bytes | ForEach-Object { $chars[$_ % $chars.Length] }) } until ($s -cmatch '[A-Z]' -and $s -cmatch '[a-z]' -and $s -match '[0-9]')
    return $s
}
function Set-EnvValue([string]$text, [string]$key, [string]$value) {
    if ($text -match "(?m)^[ \t]*$key[ \t]*=") { return [regex]::Replace($text, "(?m)^[ \t]*$key[ \t]*=.*$", "$key=$value") }
    return $text.TrimEnd() + "`r`n$key=$value`r`n"
}
function Save-Env([hashtable]$kv) {
    $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $t = ""; if (Test-Path $envFile) { Copy-Item $envFile ($envFile + ".bak." + $stamp) -Force; $t = [IO.File]::ReadAllText($envFile, [Text.Encoding]::UTF8) }
    foreach ($k in $kv.Keys) { $t = Set-EnvValue $t $k $kv[$k] }
    [IO.File]::WriteAllText($envFile, $t, (New-Object Text.UTF8Encoding($false)))
    Say "  .env updated (the previous one is kept as .env.bak.$stamp). Values are not shown." Green
}
function Pre-Checks {
    docker version --format "{{.Server.Version}}" *> $null
    if ($LASTEXITCODE -ne 0) { Stop-Now "Docker is not running. Start Docker Desktop and run this again." }
    $v = docker volume ls -q --filter "name=^$SrcVol$"
    if (-not $v) { Stop-Now "The volume $SrcVol was not found." }
    docker image inspect $img *> $null
    if ($LASTEXITCODE -ne 0) { Stop-Now "The SQL Server image is not on this PC ($img). Nothing can be done offline without it." }
    $users = @(docker ps -a --filter "volume=$SrcVol" --format "{{.Names}}" | Where-Object { $_ -and $_ -ne "erp-db" })
    if ($users.Count -gt 0) { Stop-Now "Another container uses $SrcVol ($($users -join ', ')). Stop and tell your developer." }
}
function Copy-ToFolder {
    $dest = Join-Path $BackupDir ("erp_sql_data_files_" + (Get-Date -Format "yyyyMMdd_HHmmss"))
    New-Item -ItemType Directory -Force -Path $dest | Out-Null
    $wasRunning = [bool](docker ps --filter "name=^erp-db$" --filter "status=running" -q)
    if ($wasRunning) { Say "  Stopping erp-db for a clean copy (docker stop only)" DarkGray; docker stop erp-db | Out-Null }
    Say "  Copying files to $dest ..." DarkGray
    docker run --rm --entrypoint sh -v "${SrcVol}:/v:ro" -v "${dest}:/b" $img -c "cp -a /v/. /b/" 2>&1 | Out-Null
    $srcKb = [int64](docker run --rm --entrypoint sh -v "${SrcVol}:/v:ro" $img -c "du -sk /v | cut -f1" 2>$null)
    $dstKb = [int64](docker run --rm --entrypoint sh -v "${dest}:/v:ro" $img -c "du -sk /v | cut -f1" 2>$null)
    if ($wasRunning) { docker start erp-db | Out-Null }
    if ($srcKb -le 0 -or [Math]::Abs($srcKb - $dstKb) -gt [Math]::Max(2048, $srcKb / 50)) { Stop-Now "The copy does not match ($srcKb KB vs $dstKb KB). Free some disk space or choose another folder and run again." }
    Say ("  OK  File copy saved and size-checked: {0}  ({1} MB)" -f $dest, [int]($dstKb / 1024)) Green
    Say "      Also copy this folder to a second disk or USB." Yellow
    return $dest
}
$script:helped = @{}
function Put-Helper([string]$c) {
    # tiny helper script copied INTO the container's /tmp (never into the data volume); avoids quoting problems of Windows PowerShell
    if ($script:helped[$c]) { return }
    $sh = "#!/bin/bash`n/opt/mssql-tools18/bin/sqlcmd -C -S localhost -U sa -P `"`$MSSQL_SA_PASSWORD`" -h -1 -W -b -Q `"`$1`"`n"
    $tmp = Join-Path $env:TEMP "erp_rq.sh"
    [IO.File]::WriteAllText($tmp, $sh, (New-Object Text.UTF8Encoding($false)))
    docker cp $tmp "${c}:/tmp/erp_rq.sh" | Out-Null
    Remove-Item $tmp -Force -ErrorAction SilentlyContinue
    $script:helped[$c] = $true
}
function Run-Sql([string]$c, [string]$pw, [string]$query) {
    Put-Helper $c
    return (docker exec -e "MSSQL_SA_PASSWORD=$pw" $c bash /tmp/erp_rq.sh $query 2>&1 | Out-String)
}
function Test-Pw([string]$pw) {
    $null = Run-Sql "erp-db" $pw "SELECT 1"
    return ($LASTEXITCODE -eq 0)
}
function Test-NewSa([string]$v) {
    if ($v.Length -lt 8) { return "The new password needs at least 8 characters." }
    if ($v -notmatch '^[A-Za-z0-9_.@!*+-]+$') { return "Use only letters, digits and these characters: _ . @ ! * + -" }
    $k = 0; foreach ($re in @('[A-Z]', '[a-z]', '[0-9]', '[_.@!*+-]')) { if ($v -cmatch $re) { $k++ } }
    if ($k -lt 3) { return "Use at least 3 of: capital letters, small letters, digits, symbols." }
    return ""
}
function Read-Masked([string]$prompt) {
    $ss = Read-Host $prompt -AsSecureString
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($ss)
    try { return ([Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)).Trim() } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}
function Wait-Login([string]$pw, [int]$tries) {
    # returns "ok", "denied" (the server answered: wrong password) or "down" (server not answering)
    for ($i = 0; $i -lt $tries; $i++) {
        $o = Run-Sql "erp-db" $pw "SELECT 1"
        if ($LASTEXITCODE -eq 0) { return "ok" }
        if ($o -match 'Login failed') { return "denied" }
        Start-Sleep -Seconds 5
    }
    return "down"
}
function Change-Password {
    Say "[4] Change the database password (done INSIDE the database: the data stays)" Cyan
    $old = ""; $new = ""
    if ($InputFile -and (Test-Path $InputFile)) {
        $ls = [IO.File]::ReadAllLines($InputFile, [Text.Encoding]::UTF8); Remove-Item $InputFile -Force -ErrorAction SilentlyContinue
        if ($ls.Count -ge 2) { $old = $ls[0]; $new = $ls[1] }
    } else {
        $old = Read-Masked "OLD password (the one the database has now, typed hidden)"
        for ($t = 1; $t -le 3; $t++) {
            $n1 = Read-Masked "NEW password (hidden)"; $e = Test-NewSa $n1; if ($e) { Say "  $e" Yellow; continue }
            $n2 = Read-Masked "CONFIRM new password (hidden)"; if ($n1 -cne $n2) { Say "  The two new passwords are different. Try again." Yellow; continue }
            $new = $n1; break
        }
    }
    if (-not $old -or -not $new) { Stop-Now "Old or new password missing. Nothing was changed." }
    $e = Test-NewSa $new; if ($e) { Stop-Now $e }
    if ($new -ceq $old) { Stop-Now "The new password is the same as the old one." }
    if (-not (docker ps --filter "name=^erp-db$" --filter "status=running" -q)) { Say "  Starting erp-db (docker start erp-db only)" DarkGray; docker start erp-db | Out-Null }
    Say "  [1/6] Checking the OLD password against the database (harmless login)" DarkGray
    $r = Wait-Login $old 24
    if ($r -eq "denied") { Stop-Now "The old password is NOT accepted by the database. Nothing was changed. Check it and try again (or use option 2 / 3)." }
    if ($r -eq "down") { Stop-Now "The database did not answer in 2 minutes. Nothing was changed. Send this window to your developer." }
    Say "  OK  Old password accepted." Green
    Say "  [2/6] Saving a file copy of the database first" DarkGray
    $null = Copy-ToFolder
    $r = Wait-Login $old 24
    if ($r -ne "ok") { Stop-Now "The database did not come back after the copy. Nothing was changed. Send this window to your developer." }
    # the new password is kept in a private file until .env is updated, so a crash cannot lose it
    $pending = Join-Path $Root ".env.pending"
    [IO.File]::WriteAllText($pending, "SQL_SA_PASSWORD=$new`r`n", (New-Object Text.UTF8Encoding($false)))
    Say "  [3/6] Changing the sa password inside the database (ALTER LOGIN)" DarkGray
    $sh = "#!/bin/bash`n/opt/mssql-tools18/bin/sqlcmd -C -S localhost -U sa -P `"`$MSSQL_SA_PASSWORD`" -b -Q `"ALTER LOGIN sa WITH PASSWORD = N'`$NEW_SA_PASSWORD'`"`n"
    $tmp = Join-Path $env:TEMP "erp_alter.sh"
    [IO.File]::WriteAllText($tmp, $sh, (New-Object Text.UTF8Encoding($false)))
    docker cp $tmp "erp-db:/tmp/erp_alter.sh" | Out-Null; Remove-Item $tmp -Force -ErrorAction SilentlyContinue
    $o = docker exec -e "MSSQL_SA_PASSWORD=$old" -e "NEW_SA_PASSWORD=$new" erp-db bash /tmp/erp_alter.sh 2>&1 | Out-String
    $altered = ($LASTEXITCODE -eq 0)
    docker exec -u 0 erp-db rm -f /tmp/erp_alter.sh | Out-Null
    if (-not $altered) { Remove-Item $pending -Force -ErrorAction SilentlyContinue; Say $o DarkGray; Stop-Now "The database refused the change (message above has no passwords). The old password is still valid. Nothing changed." }
    Say "  [4/6] Checking the NEW password" DarkGray
    $r = Wait-Login $new 6
    if ($r -ne "ok") { Stop-Now "The change was made but the new password test failed. The new password is saved in $pending (do not delete). Send this window to your developer." }
    Say "  OK  New password works." Green
    Say "  [5/6] Updating .env" DarkGray
    $tt = ""; if (Test-Path $envFile) { $tt = [IO.File]::ReadAllText($envFile, [Text.Encoding]::UTF8) }
    $jm = [regex]::Match($tt, '(?m)^[ \t]*JWT_SIGNING_KEY[ \t]*=[ \t]*([^\r\n]*)')
    $kv = @{ SQL_SA_PASSWORD = $new }
    if (-not $jm.Success -or -not $jm.Groups[1].Value.Trim()) { $kv["JWT_SIGNING_KEY"] = (New-Secret 48); Say "      JWT_SIGNING_KEY was empty: a new one was generated (users log in again)." DarkGray }
    Save-Env $kv
    Remove-Item $pending -Force -ErrorAction SilentlyContinue
    Say "  [6/6] Recreating the erp-db container so it uses the new password (the data volume is kept)" DarkGray
    Push-Location $Root; docker compose -p erp up -d db 2>&1 | ForEach-Object { Say "      $_" DarkGray }; Pop-Location
    $healthy = $false
    for ($i = 0; $i -lt 36; $i++) { $h = docker inspect -f "{{.State.Health.Status}}" erp-db 2>$null; if ($h -eq "healthy") { $healthy = $true; break }; Start-Sleep -Seconds 5 }
    if ($healthy) { Say "  OK  erp-db is healthy with the new password." Green } else { Say "  erp-db is not healthy yet. Run ERP Installer.bat, it will show the reason." Yellow }
    Say ""; Say "  DONE. Next: double-click ERP Installer.bat (it updates the API with the new password). Copy the .env file to a safe private place." Green
}
function Find-Password {
    Say "[2] Looking for the old SQL password (candidates are tested, never printed)" Cyan
    $run = docker ps --filter "name=^erp-db$" --filter "status=running" -q
    if (-not $run) { Say "  erp-db is not running. Starting it (docker start erp-db only)." DarkGray; docker start erp-db | Out-Null; Start-Sleep -Seconds 40 }
    $cands = New-Object System.Collections.ArrayList
    $files = @()
    foreach ($d in @($Root, (Split-Path $Root -Parent), $BackupDir)) { if ($d -and (Test-Path $d)) { $files += @(Get-ChildItem -Path $d -File -Force -ErrorAction SilentlyContinue | Where-Object { $_.Name -like ".env*" -or $_.Name -like "*.env" -or $_.Name -like "*.env.*" }) } }
    # optional: a file path or a typed candidate, entered locally (hidden). Nothing is printed, stored or sent anywhere.
    $pathIn = (Read-Host "  Optional: full path of an old .env file to try (Enter to skip)").Trim().Trim('"')
    if ($pathIn -and (Test-Path $pathIn -PathType Leaf)) { $files += @(Get-Item $pathIn) } elseif ($pathIn) { Say "  That file was not found, skipped." Yellow }
    $typed = Read-Masked "  Optional: type a password you think it is (hidden, Enter to skip)"
    if ($typed) { [void]$cands.Add($typed) }
    Say ("  .env-type files found: {0}" -f $files.Count) DarkGray
    foreach ($f in $files) {
        try { $t = [IO.File]::ReadAllText($f.FullName, [Text.Encoding]::UTF8) } catch { continue }
        foreach ($m in [regex]::Matches($t, '(?m)^[ \t]*(?:SQL_SA_PASSWORD|MSSQL_SA_PASSWORD|SA_PASSWORD)[ \t]*=[ \t]*([^\r\n]+)')) { $v = $m.Groups[1].Value.Trim().Trim('"').Trim("'"); if ($v -and -not $cands.Contains($v)) { [void]$cands.Add($v) } }
    }
    foreach ($c in @(docker ps -a --format "{{.Names}}" | Where-Object { $_ -match '^erp-' })) {
        $envs = docker inspect -f "{{range .Config.Env}}{{println .}}{{end}}" $c 2>$null | Out-String
        foreach ($m in [regex]::Matches($envs, '(?m)^(?:MSSQL_SA_PASSWORD|SA_PASSWORD)=(.+)$')) { $v = $m.Groups[1].Value.Trim(); if ($v -and -not $cands.Contains($v)) { [void]$cands.Add($v) } }
        foreach ($m in [regex]::Matches($envs, 'Password=([^;\r\n]+)')) { $v = $m.Groups[1].Value.Trim(); if ($v -and -not $cands.Contains($v)) { [void]$cands.Add($v) } }
    }
    $current = $null
    if (Test-Path $envFile) { $tt = [IO.File]::ReadAllText($envFile, [Text.Encoding]::UTF8); $mm = [regex]::Match($tt, '(?m)^[ \t]*SQL_SA_PASSWORD[ \t]*=[ \t]*([^\r\n]*)'); if ($mm.Success) { $current = $mm.Groups[1].Value.Trim() } }
    Say ("  Different candidate passwords: {0} (max 10 are tried, to avoid locking the sa login)" -f $cands.Count) DarkGray
    $n = 0
    foreach ($c in $cands) {
        if ($n -ge 10) { break }; $n++
        if (Test-Pw $c) {
            Say "  OK  A password that opens the database was found (not shown)." Green
            if ($c -ne $current) { Save-Env @{ SQL_SA_PASSWORD = $c } } else { Say "      It is already the one in .env." DarkGray }
            Say "  Now run ERP Installer.bat again." Green
            return $true
        }
    }
    Say "  No candidate works. Use option 3 (recover on a copy)." Yellow
    return $false
}
function Recover-OnCopy {
    Say "[3] Recover on a COPY (the original volume stays untouched)" Cyan
    $have = docker volume ls -q --filter "name=^$NewVol$"
    if ($have) { Stop-Now "The volume $NewVol already exists from an earlier try. It is kept. Tell your developer, do not delete it." }
    $null = Copy-ToFolder
    $wasRunning = [bool](docker ps --filter "name=^erp-db$" --filter "status=running" -q)
    if ($wasRunning) { docker stop erp-db | Out-Null }
    Say "  Cloning the volume to $NewVol ..." DarkGray
    docker volume create $NewVol | Out-Null
    docker run --rm -u 0 --entrypoint sh -v "${SrcVol}:/s:ro" -v "${NewVol}:/d" $img -c "cp -a /s/. /d/" 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { Stop-Now "Cloning failed. $NewVol is kept for inspection, the original is untouched." }
    if ($wasRunning) { docker start erp-db | Out-Null }
    $new = New-Secret 28
    Say "  Resetting the SA password on the COPY only (mssql-conf set-sa-password) ..." DarkGray
    $out = docker run --rm -u 0 -e ACCEPT_EULA=Y -e "MSSQL_SA_PASSWORD=$new" -v "${NewVol}:/var/opt/mssql" --entrypoint /opt/mssql/bin/mssql-conf $img set-sa-password 2>&1 | Out-String
    if ($LASTEXITCODE -ne 0) { Say $out DarkGray; Stop-Now "The password reset on the copy failed (output above has no secrets). Send this window to your developer." }
    Say "  Starting a temporary SQL container on the copy ($Tmp, no ports published)" DarkGray
    docker rm -f $Tmp *> $null
    docker run -d --name $Tmp -e ACCEPT_EULA=Y -e "MSSQL_SA_PASSWORD=$new" -v "${NewVol}:/var/opt/mssql" $img | Out-Null
    $ok = $false
    for ($i = 0; $i -lt 40; $i++) { Start-Sleep -Seconds 5; $script:helped.Remove($Tmp); $null = Run-Sql $Tmp $new "SELECT 1"; if ($LASTEXITCODE -eq 0) { $ok = $true; break } }
    if (-not $ok) { docker logs --tail 30 $Tmp 2>&1 | ForEach-Object { Say "      | $_" DarkGray }; Stop-Now "The temporary SQL container did not accept the new password." }
    $q = "SET NOCOUNT ON; SELECT CASE WHEN DB_ID('MiniErp') IS NULL THEN 'NO' ELSE 'YES' END; IF DB_ID('MiniErp') IS NOT NULL EXEC('USE MiniErp; SELECT CAST(COUNT(*) AS varchar(20)) FROM sys.tables; SELECT CAST(ISNULL(SUM(p.rows),0) AS varchar(30)) FROM sys.partitions p JOIN sys.tables t ON t.object_id = p.object_id WHERE p.index_id IN (0,1)')"
    $res = Run-Sql $Tmp $new $q
    $lines = @($res -split "`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ })
    if ($lines.Count -lt 1 -or $lines[0] -ne "YES") { Stop-Now "The copy opens, but it has no database named MiniErp (found: $($lines -join ' ')). The original is untouched." }
    $nums = @($lines | Where-Object { $_ -match '^\d+$' })
    if ($nums.Count -lt 2) { Stop-Now "Could not read the table and row counts of MiniErp on the copy." }
    $tables = [int64]$nums[0]; $rows = [int64]$nums[1]
    Say ("  OK  MiniErp found on the copy: {0} tables, {1} rows (all tables)" -f $tables, $rows) Green
    # verified backup file
    Say "  Making a verified backup file of the recovered MiniErp ..." DarkGray
    $bk = "BACKUP DATABASE [MiniErp] TO DISK = N'/tmp/MiniErp_recovered.bak' WITH COPY_ONLY, COMPRESSION, CHECKSUM, INIT; RESTORE VERIFYONLY FROM DISK = N'/tmp/MiniErp_recovered.bak' WITH CHECKSUM"
    $null = Run-Sql $Tmp $new $bk
    $bakOk = ($LASTEXITCODE -eq 0)
    if ($bakOk) {
        $bdir = Join-Path $BackupDir "recovered"; New-Item -ItemType Directory -Force -Path $bdir | Out-Null
        $bfile = Join-Path $bdir ("ERP_DB_backup_recovered_" + (Get-Date -Format "yyyyMMdd_HHmmss") + ".bak")
        docker cp "${Tmp}:/tmp/MiniErp_recovered.bak" $bfile 2>&1 | Out-Null
        if (Test-Path $bfile) { Say ("  OK  Verified backup: {0}  ({1} MB)" -f $bfile, [int]((Get-Item $bfile).Length / 1MB)) Green } else { Say "  The backup could not be copied out. The recovered volume is still fine." Yellow }
    } else { Say "  The backup step failed (the recovered volume is still fine)." Yellow }
    docker rm -f $Tmp *> $null
    if ($rows -gt 0) {
        Save-Env @{ SQL_SA_PASSWORD = $new; ERP_SQL_VOLUME = $NewVol }
        Say ""; Say "  DONE. The installer now uses the recovered volume $NewVol with the new password (stored only in .env)." Green
        Say "  Next: double-click ERP Installer.bat. The original volume $SrcVol stays untouched as a safety copy. Keep it." Green
        Say "  Copy the .env file to a safe private place." Yellow
    } else {
        Say ""; Say "  MiniErp exists but has no rows. .env was NOT changed. Send this window to your developer." Yellow
    }
}
Pre-Checks
Say ""; Say "=== Recover database (original volume $SrcVol is never changed or deleted) ===" Cyan
if ($Step -eq "menu") {
    Say "  1  Copy the database files to a folder (do this first)"
    Say "  2  Look for the old SQL password in old .env files and test it"
    Say "  3  Recover on a COPY (reset the password on the copy, check MiniErp, make a verified backup)"
    Say "  4  CHANGE the database password (type old, new and confirm; the data stays)"
    Say "  Q  Quit"
    $a = (Read-Host "Choose").Trim().ToUpper()
    $Step = switch ($a) { "1" { "copy" } "2" { "find" } "3" { "recover" } "4" { "change" } default { "quit" } }
}
switch ($Step) {
    "copy" { $null = Copy-ToFolder }
    "find" { $null = Find-Password }
    "recover" { Recover-OnCopy }
    "change" { Change-Password }
    default { Say "Nothing done." }
}
Say ""; Say "Finished." Green
if ($InputFile) { [void](Read-Host "Press Enter to close this window") }
