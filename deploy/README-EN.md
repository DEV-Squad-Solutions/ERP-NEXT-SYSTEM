# ERP server install and update guide (offline Windows server)

**One file does it all:** double-click `ERP Installer.bat`. It opens a window (English or Arabic, switch with the buttons at the top) with buttons **Install / Update**, **Switch version / Roll back** and **Status**, a step list, a progress bar, a live log, and a green SUCCESS or red STOPPED box with "what to do next". Typed confirmations (UNRELATED, RESTORE, version number) appear as input boxes. The window only runs the same scripts described below, so every safety rule is unchanged. If the window cannot start, the .bat falls back to the console version; you can also run `install-or-update-console.bat` directly.

The rest of this guide describes what the steps do (same in the window and in the console). It detects a fresh install or an update and runs steps [1/6] to [6/6].
At start it asks for a language: `1` English (default after 10 seconds) or `2` Arabic. In Arabic mode the messages (start, success, every error with its fix) appear in popup windows laid out right-to-left. The black console keeps short English progress lines because a console cannot lay out Arabic correctly. Full Arabic guide: `README-AR.md`.

> **Golden rule:** the data lives in the Docker volume `erp_sql_data`. The installer never deletes it. You must never run `docker compose down -v`, `docker volume rm` or `docker system prune --volumes`.

## 1. On the dev PC (internet + Docker + the repo)
| Step | Command | What it does |
|---|---|---|
| 1 | `git pull` | Gets the latest main |
| 2 | `cd deploy`, then `powershell -ExecutionPolicy Bypass -File .\build\build-images.ps1 -Version 2.1` | Builds API + web and writes `erp-images-2.1.tar` into deploy (new number each time) |
| 3 | Copy the whole **deploy** folder to the USB drive | |

Success: `erp-images-2.1.tar` exists in deploy and the script prints DONE.

## 2. On the server (192.168.1.5)
1. Copy the deploy folder from the USB drive to a fixed place, e.g. `C:\ERP\deploy` (same place every time).
2. Start Docker Desktop and wait until it is running.
3. Double-click **ERP Installer.bat** and choose a language.
4. Wait. Loading images the first time can take a few minutes.

| Step | What it does | Success looks like |
|---|---|---|
| [1/6] Docker | Checks Docker is running | `OK Docker is running` |
| [2/6] Install type | Fresh install or update, checks `.env` | `Mode: FRESH INSTALL` or `Mode: UPDATE` |
| [3/6] Backup | Update only: backup to `C:\ERP_backup` (must succeed or it stops) | `Backup verified: ERP_DB_backup_<version>_<date>.bak` |
| [4/6] Load images | Loads the images from the tar file | `Images ready` |
| [5/6] Start | Starts services (update: API + web only, database untouched) | `Containers started` |
| [6/6] Health | Waits up to 5 minutes | `System is ready`, then the green SUCCESS box |

The summary shows the version, URLs, backup path and the log file (`erp-install-....log` next to the script). Open `http://localhost` (other PCs: `http://192.168.1.5`).

### The `.env` file (secrets)
- **Fresh install:** nothing to do. The installer creates `.env` with a strong generated SQL password and JWT key and never prints them. Copy `.env` to a private safe place (not git, not chat).
- **Update of a running system:** the installer does **not** create new secrets (they would break the database login). If `.env` is missing them it stops and tells you to open `.env` in Notepad and type `SQL_SA_PASSWORD=` and `JWT_SIGNING_KEY=` with the same values as the old `.env`. Type them yourself. Never send them in chat.

## Next update
Dev PC: `git pull` + `build\build-images.ps1 -Version 2.2`, copy deploy to the USB drive. Server: copy it over the old one (keep `.env`), double-click `ERP Installer.bat`. A backup is taken automatically first.

## Errors
The installer stops with a red STOPPED box and a "What to do next" line. Nothing is deleted.
| Message | Fix |
|---|---|
| `Docker is not running` | Start Docker Desktop, wait, run again |
| `No erp-images-*.tar file found` | Copy the tar from the USB drive next to the script |
| `.env is missing the existing secrets` | Type the two lines into `.env` with the old values |
| `Backup failed` | Check erp-db is running and the disk has space, run again |
| `database volume with another name` | Stop. This is an older install under another name. Send the name shown |
| `The API did not become ready` | Send the log file and the API log lines shown |

## Switch version / roll back (menu)
Double-click `ERP Installer.bat`, choose **[2] Switch version / roll back** (or run `installer\rollback.ps1`). Nothing runs automatically.
- It lists **every installed version** (their images stay on the server and are never deleted) and you pick any one, older or newer.
- It **always** takes a safety backup of the current database first.
- **[1] Code only:** database untouched (safest). Migrations are additive and are NOT reversed. Older code usually runs on a newer database but this is not guaranteed. Test after switching.
- **[2] Code + restore data:** restores the backup taken when you left that version. It **replaces all current data**; anything entered after that backup is lost (the safety backup protects you). You must type `RESTORE`.
- If the version you want is not installed: put its `erp-images-<version>.tar` next to the script and run `docker load -i` on it.
- Backups listed in `release-history.txt` are never removed by the 14-day cleanup.
- **Status (read-only):** choose **[3]** or run `installer\status.ps1`: running version, containers, latest backup, last update.

## Manual restore (emergency only, ask first)
The menu ([2] then [2]) does this safely with a safety backup and a typed confirmation. By hand:
1. `powershell -ExecutionPolicy Bypass -File .\installer\backup.ps1`
2. `docker stop erp-api erp-frontend`
3. `docker cp C:\ERP_backup\ERP_DB_backup_XXXX.bak erp-db:/var/opt/mssql/backup/restore.bak`
4. `docker exec erp-db /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "<SQL_SA_PASSWORD>" -C -Q "ALTER DATABASE MiniErp SET SINGLE_USER WITH ROLLBACK IMMEDIATE; RESTORE DATABASE MiniErp FROM DISK='/var/opt/mssql/backup/restore.bak' WITH REPLACE; ALTER DATABASE MiniErp SET MULTI_USER;"`
5. `docker start erp-api erp-frontend`, then check `http://localhost:8080/health/ready`.

## Manual backup any time
`powershell -ExecutionPolicy Bypass -File .\installer\backup.ps1` (saved to `C:\ERP_backup`, keeps 14 days).

**Honest status:** the scripts are written and reviewed but not yet run on real Docker. Watch the first run on the server and send the log file if anything fails.

## Building the USB package (dev PC)

1. `git pull`, then `powershell -ExecutionPolicy Bypass -File .\build\build-images.ps1 -Version 2.1` (makes `erp-images-2.1.tar`).
2. `powershell -ExecutionPolicy Bypass -File .\build\build-package.ps1 -Version 2.1`
3. Copy `dist\DevSquad-ERP-Installer-2.1` to the USB drive. On the server double-click `ERP Installer.bat`.
   Optional: `Create Desktop Shortcut.bat` adds a Desktop icon.

The package never contains `.env`, passwords, logs or backups. Layout: `ERP Installer.bat`, `installer\`, `images\`, `tools\`, `docker-compose.yml`, `.env.example`.
Ports can be changed in `.env` with `ERP_API_PORT` / `ERP_WEB_PORT` (defaults 8080 / 80).

## Backing up an old MiniErp container (read-only)

`powershell -ExecutionPolicy Bypass -File .\installer\minierp-backup.ps1` (or `tools\Backup old MiniErp container.bat`).
It makes a verified COPY_ONLY backup of every database in `minierp-db` into `D:\minierp_backup`. It changes nothing in the container.

## Other SQL Server container / busy ports (automatic)

If the installer finds another SQL Server container (for example an old MiniErp), it first takes a verified read-only backup of it (COPY_ONLY, RESTORE VERIFYONLY, size and SHA256 check) into `D:\minierp_backup\<container>` (or `C:\ERP_backup\old-sql-backup\<container>` if there is no D: drive), shows the path in the window and the summary, then continues. The other container is never stopped or changed by the backup. If the backup or the check fails, the installer stops. A stopped container cannot be read, so it is only reported and left untouched.
If port 80 or 8080 is used by another container, the window shows two buttons: stop that container (stop only, never deleted; start it again with `docker start <name>`) or let ERP use other ports (saved in `.env`). Copy the backup folder to a second disk or USB.

## One-file installer (.exe)

On the dev PC: `git pull`, `build\build-images.ps1 -Version 2.1`, then `powershell -ExecutionPolicy Bypass -File .\build\build-exe.ps1 -Version 2.1`.
Result: `dist\DevSquad-ERP-Installer-2.1.exe` (Dev Squad icon, compressed, contains the whole package including the images tar). Copy that single file to the USB drive. On the server double-click it: it unpacks to `C:\ERP-Installer\DevSquad-ERP-Installer-2.1` and opens the installer window. Newer versions unpack over the app files only; `.env` and release history are never overwritten. The exe is not code-signed, so Windows SmartScreen may ask: More info, Run anyway. Use `-NoImages` to leave the big tar out and copy it into the `images` folder yourself.

## If the SQL password does not match the database
Never reset or delete the volume. Double-click `tools\Recover database.bat`: 1 = copy the database files to a folder first, 2 = test old passwords from old .env files, 3 = recover on a COPY (the original volume is never changed). Details are printed on screen.

## Use your EXISTING database (no new database)
Click **Existing DB** in the installer (or `tools\Use existing database.bat`). 1 = verified backup, then ERP 2.0 connects to your old SQL container and upgrades the MiniErp database in place (you type UPGRADE EXISTING DATABASE; the old app containers are stopped, not deleted). 2 = Restore from the backup file (type RESTORE DATABASE; a pre-restore backup is made first). The old SQL container and its data are never deleted.


## Installer password

The installer asks for a password before anything that changes the system (install, update, switch version, restore, new volume, DB password, get images). Read-only tools (Status, Compare, Look inside volume) and the plain backup tools do not ask.

- First run: you choose the password (typed twice, hidden, at least 8 characters). Only a salted PBKDF2 hash is stored in `.installer-gate.json`. The password itself is never saved, logged or put in `.env`.
- Wrong password: from the 3rd wrong try in a row the installer locks for 15 s, then 30 s, 60 s, and so on up to 15 minutes.
- After a correct password, the scripts started by that run do not ask again (up to 2 hours).
- Forgot it: run `tools\Reset installer password.bat` as Administrator on this PC and type `RESET INSTALLER PASSWORD`. The old gate file is kept as `.installer-gate.json.reset-<time>`. Nothing else is touched.
- `.env`, its backups, the state file and the logs folder are restricted to your Windows user, Administrators and SYSTEM each time the installer starts a protected action. `.env` and its backups do contain the database password and the JWT key: copy them only to a private place.
- Honest limit: this gate stops casual or accidental use. Someone who is Administrator on this PC, can edit these scripts or can run `docker` directly is not stopped by it. Keep the PC itself physically and account-wise private.
