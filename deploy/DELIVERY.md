# Delivering the installer to a client (for the developer)

All build steps run on the Windows dev PC (the exe builder uses csc.exe and the zip classes that ship with Windows). They have NOT been run or tested from this repo's CI or sandbox: treat the first build as a test.

## 1. Build (dev PC, in this order)
1. `git pull`
2. `deploy\build\build-images.ps1 -Version 2.1` (Docker + internet; builds erp-api and erp-frontend, saves `deploy\images\erp-images-2.1.tar`)
3. `deploy\build\build-exe.ps1 -Version 2.1` (or `-NoImages` and send the tar separately)
   Output: `dist\DevSquad-ERP-Installer-2.1.exe` and `dist\DevSquad-ERP-Installer-2.1.exe.sha256.txt`.
The package check refuses to build if it finds .env, .env.bak*, release-history.txt, existing-db-state.json, .installer-gate.json*, .bak, .key or .pfx files.

## 2. Package layout (inside the exe)
```
ERP Installer.bat, Create Desktop Shortcut.bat, START-HERE.txt
README-EN.md, README-AR.md, CLIENT-GUIDE-AR.md, .env.example
docker-compose.yml, docker-compose.existing.yml, docker-compose.dryrun.yml
images\erp-images-<version>.tar      (api + frontend)
tools\   Backup now, Status, Compare, Recover, Look inside volume, New empty volume, Reset installer password ...
installer\  scripts and assets
```
The client's .env, backups, logs and installer password never come from you: they are created on the client PC.

## 3. Size (estimate, not measured)
The real size is printed by build-exe.ps1. Rough expectation: erp-api image about 250-400 MB and erp-frontend about 50-100 MB, so the tar is roughly 300-500 MB, and the exe (zip-compressed) a bit smaller. The SQL Server image (mcr.microsoft.com/mssql/server:2022-latest, roughly 1.5 GB) is NOT inside the tar. A client server that already runs SQL Server in Docker (like the old minierp-db) has it. A brand new server without it needs that image loaded too (`docker save` it on the dev PC and `docker load` it there).

## 4. Sending it safely
- Best: USB stick handed over, or a private cloud link (OneDrive/Google Drive, "specific people", with an expiry). Do not post it in a public place.
- Send the SHA256 (the .sha256.txt content) in a different message than the exe. The client compares it with `Get-FileHash -Algorithm SHA256 <file>` (steps are in CLIENT-GUIDE-AR.md).
- Send the installer password in a third, separate message or by voice. Never inside the exe, the folder or the same chat as the file.
- The exe contains no secrets by design (checked at build time). It does contain the whole installer scripts and the compose files, so treat it as confidential business software anyway.

## 5. "Unknown publisher" and antivirus (the exe is not code-signed)
- Windows SmartScreen shows "Windows protected your PC": More info, then Run anyway. Say this in advance so the client is not alarmed.
- Some antivirus products flag self-extracting exes. Free workarounds: send the zip package instead of the exe (build-package.ps1 output folder zipped), or ask the client to add `C:\ERP-Installer` as an exclusion after checking the SHA256.
- A paid code-signing certificate removes the warning. Not bought, no purchase made.
