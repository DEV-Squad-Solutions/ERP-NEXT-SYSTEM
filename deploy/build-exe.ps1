<#
 Run on the DEV PC (Windows, any normal install). Builds ONE file:  dist\DevSquad-ERP-Installer-<Version>.exe
 - it has the Dev Squad icon, contains the whole installer package (compressed), and when double-clicked it unpacks to
   C:\ERP-Installer\DevSquad-ERP-Installer-<Version>\ and opens the installer window.
 - it never contains .env, passwords, logs or backups. Updating: new versions unpack over the app files only
   (.env and release-history.txt of the customer are never overwritten).
 - uses only what Windows already has: PowerShell, .NET Framework 4 (csc.exe) and the zip classes. No installs, no internet.
 Steps on the dev PC:  git pull ; build-images.ps1 -Version 2.1 ; build-exe.ps1 -Version 2.1
 If the erp-images-<Version>.tar is bigger than what you want inside the exe, use -NoImages and copy the tar next to the
 unpacked folder's "images" directory yourself.
#>
param(
    [Parameter(Mandatory = $true)][string]$Version,
    [switch]$NoImages
)
$ErrorActionPreference = "Stop"
if ($Version -notmatch '^[A-Za-z0-9._-]+$') { throw "Version may only contain letters, digits, dot, dash, underscore." }
$dist = Join-Path (Split-Path $PSScriptRoot -Parent) "dist"
$pkg = Join-Path $dist "DevSquad-ERP-Installer-$Version"
$exe = Join-Path $dist "DevSquad-ERP-Installer-$Version.exe"
if (Test-Path $exe) { throw "File already exists: $exe . Delete it yourself or choose another version (nothing is overwritten)." }

# 1. package folder (build-package.ps1 does the checks: no .env, logs, secrets)
if (-not (Test-Path $pkg)) {
    Write-Host "=== Building the package folder ===" -ForegroundColor Cyan
    & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "build-package.ps1") -Version $Version
    if ($LASTEXITCODE -ne 0) { throw "build-package.ps1 failed" }
}
if ($NoImages) { Get-ChildItem (Join-Path $pkg "images") -Filter "*.tar" -ErrorAction SilentlyContinue | ForEach-Object { Remove-Item $_.FullName -Force; Write-Host "Left out: $($_.Name)" -ForegroundColor Yellow } }
$hasTar = [bool](Get-ChildItem (Join-Path $pkg "images") -Filter "erp-images-*.tar" -ErrorAction SilentlyContinue)
if (-not $hasTar) { Write-Host "NOTE: no erp-images-*.tar inside. The exe will work, but the server needs the tar copied into the images folder." -ForegroundColor Yellow }

# 2. find the C# compiler that ships with Windows
$csc = @("$env:WINDIR\Microsoft.NET\Framework64\v4.0.30319\csc.exe", "$env:WINDIR\Microsoft.NET\Framework\v4.0.30319\csc.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $csc) { throw "csc.exe (.NET Framework 4) was not found on this PC." }

$work = Join-Path $env:TEMP ("dsexe-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $work | Out-Null
try {
    # 3. stub program (extracts the payload appended to itself, then starts the installer)
    $cs = @'
using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Text;
using System.Windows.Forms;

class SubStream : Stream
{
    Stream s; long start, len, pos;
    public SubStream(Stream s, long start, long len) { this.s = s; this.start = start; this.len = len; this.pos = 0; }
    public override bool CanRead { get { return true; } }
    public override bool CanSeek { get { return true; } }
    public override bool CanWrite { get { return false; } }
    public override long Length { get { return len; } }
    public override long Position { get { return pos; } set { pos = value; } }
    public override void Flush() { }
    public override int Read(byte[] b, int o, int c)
    {
        if (pos >= len) return 0;
        if (c > len - pos) c = (int)(len - pos);
        s.Position = start + pos;
        int r = s.Read(b, o, c);
        pos += r;
        return r;
    }
    public override long Seek(long off, SeekOrigin so)
    {
        if (so == SeekOrigin.Begin) pos = off; else if (so == SeekOrigin.Current) pos += off; else pos = len + off;
        return pos;
    }
    public override void SetLength(long v) { throw new NotSupportedException(); }
    public override void Write(byte[] b, int o, int c) { throw new NotSupportedException(); }
}

static class Program
{
    const string Version = "__VERSION__";

    [STAThread]
    static int Main(string[] args)
    {
        Form f = null;
        try
        {
            string self = Assembly.GetExecutingAssembly().Location;
            string root = Path.Combine(Environment.GetEnvironmentVariable("SystemDrive") + "\\", "ERP-Installer");
            string dest = Path.Combine(root, "DevSquad-ERP-Installer-" + Version);
            Application.EnableVisualStyles();
            f = new Form();
            f.Text = "Dev Squad - ERP Installer";
            f.StartPosition = FormStartPosition.CenterScreen;
            f.FormBorderStyle = FormBorderStyle.FixedDialog;
            f.MaximizeBox = false; f.MinimizeBox = false; f.ControlBox = false;
            f.ClientSize = new Size(440, 90);
            f.BackColor = Color.FromArgb(10, 13, 20);
            try { f.Icon = Icon.ExtractAssociatedIcon(self); } catch { }
            Label l = new Label();
            l.Dock = DockStyle.Fill; l.ForeColor = Color.White; l.Font = new Font("Segoe UI", 11);
            l.TextAlign = ContentAlignment.MiddleCenter;
            l.Text = "Preparing the installer, please wait...\n" + dest;
            f.Controls.Add(l);
            f.Show(); Application.DoEvents();

            using (FileStream fs = new FileStream(self, FileMode.Open, FileAccess.Read, FileShare.Read))
            {
                long total = fs.Length;
                if (total < 16) throw new Exception("The installer payload is missing.");
                byte[] tail = new byte[16];
                fs.Position = total - 16;
                int got = 0;
                while (got < 16) { int r = fs.Read(tail, got, 16 - got); if (r <= 0) break; got += r; }
                if (Encoding.ASCII.GetString(tail, 0, 8) != "DSERPZIP") throw new Exception("The installer payload is damaged or missing.");
                long zlen = BitConverter.ToInt64(tail, 8);
                long zstart = total - 16 - zlen;
                if (zlen <= 0 || zstart < 0) throw new Exception("The installer payload size is invalid.");
                Directory.CreateDirectory(dest);
                string full = Path.GetFullPath(dest).TrimEnd('\\') + "\\";
                using (SubStream ss = new SubStream(fs, zstart, zlen))
                using (ZipArchive za = new ZipArchive(ss, ZipArchiveMode.Read))
                {
                    foreach (ZipArchiveEntry e in za.Entries)
                    {
                        string rel = e.FullName.Replace('/', '\\');
                        string target = Path.GetFullPath(Path.Combine(dest, rel));
                        if (!target.StartsWith(full, StringComparison.OrdinalIgnoreCase)) continue;
                        if (rel.EndsWith("\\")) { Directory.CreateDirectory(target); continue; }
                        string name = Path.GetFileName(target).ToLowerInvariant();
                        // never overwrite the customer's own files
                        if (name == ".env" || name == ".env.bak" || name == "release-history.txt") continue;
                        Directory.CreateDirectory(Path.GetDirectoryName(target));
                        if (name.EndsWith(".tar") && File.Exists(target) && new FileInfo(target).Length == e.Length) continue;
                        e.ExtractToFile(target, true);
                        Application.DoEvents();
                    }
                }
            }
            f.Close();
            ProcessStartInfo psi = new ProcessStartInfo(Path.Combine(dest, "ERP Installer.bat"));
            psi.WorkingDirectory = dest;
            psi.UseShellExecute = true;
            Process.Start(psi);
            return 0;
        }
        catch (Exception ex)
        {
            try { if (f != null) f.Close(); } catch { }
            MessageBox.Show("The installer could not be prepared.\n\n" + ex.Message + "\n\nNothing was changed on your data.", "Dev Squad - ERP Installer", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return 1;
        }
    }
}
'@
    $cs = $cs.Replace("__VERSION__", $Version)
    $csFile = Join-Path $work "stub.cs"
    [IO.File]::WriteAllText($csFile, $cs, (New-Object Text.UTF8Encoding($false)))
    $stub = Join-Path $work "stub.exe"
    $icon = Join-Path $PSScriptRoot "erp-icon.ico"
    Write-Host "=== Compiling the launcher ===" -ForegroundColor Cyan
    & $csc /nologo /target:winexe /optimize+ "/out:$stub" "/win32icon:$icon" /r:System.dll /r:System.Drawing.dll /r:System.Windows.Forms.dll /r:System.IO.Compression.dll /r:System.IO.Compression.FileSystem.dll $csFile
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path $stub)) { throw "Compiling the launcher failed (see the messages above)." }

    # 4. compress the package
    Write-Host "=== Compressing the package (the images file can take a few minutes) ===" -ForegroundColor Cyan
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zip = Join-Path $work "payload.zip"
    [IO.Compression.ZipFile]::CreateFromDirectory($pkg, $zip, [IO.Compression.CompressionLevel]::Optimal, $false)

    # 5. exe = stub + zip + 8-byte marker + 8-byte zip length
    Write-Host "=== Writing $exe ===" -ForegroundColor Cyan
    $out = [IO.File]::Open($exe, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write)
    try {
        foreach ($p in @($stub, $zip)) {
            $in = [IO.File]::OpenRead($p)
            try { $in.CopyTo($out, 4MB) } finally { $in.Dispose() }
        }
        $zlen = (Get-Item $zip).Length
        $tail = [System.Text.Encoding]::ASCII.GetBytes("DSERPZIP") + [BitConverter]::GetBytes([int64]$zlen)
        $out.Write($tail, 0, $tail.Length)
    } finally { $out.Dispose() }
}
finally { Remove-Item $work -Recurse -Force -ErrorAction SilentlyContinue }

$mb = [math]::Round((Get-Item $exe).Length / 1MB, 1)
Write-Host "DONE: $exe ($mb MB)" -ForegroundColor Green
Write-Host "Copy this ONE file to the USB drive. On the server double-click it. It unpacks to C:\ERP-Installer\DevSquad-ERP-Installer-$Version and opens the installer." -ForegroundColor Green
Write-Host "Windows may show a blue 'unknown publisher' (SmartScreen) message because the file is not code-signed: click More info, then Run anyway." -ForegroundColor Yellow
