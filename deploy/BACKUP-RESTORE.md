# Backups and restore (what exists and how to use it)

Everything below already exists in the installer folder. Nothing deletes data. Run from the installer folder on the server PC. The installer password is asked first.

## Backups
- Automatic: every Install/Update takes a backup BEFORE it changes anything (the run stops if the backup fails).
- Manual: `tools\Backup now.bat`. Old MiniErp container: `tools\Backup old MiniErp container.bat`.
- Each backup is: SQL Server BACKUP with CHECKSUM, then RESTORE VERIFYONLY with CHECKSUM, then copied out of the container, then size-checked and given a SHA256. If any step fails the backup is reported as failed, not as done.
- Location: the backup folder shown by the installer (default C:\ERP_backup). Copy it to a second disk or USB regularly: a backup on the same disk does not survive a dead disk.

## Check that you can restore (do this once a month, on a COPY)
1. `tools\Use existing database.bat`, choose the dry-run/restore-copy option. It restores the backup into a NEW database name and never replaces an existing one.
2. Open the app against that copy, check a few invoices and balances, then stop.
This proves the backup file is usable. `tools\Compare databases.bat` shows row counts side by side.

## Restore
- Restore always goes into a new name (erp_version_<n>, then _2, _3). The state file lets you go back with the typed phrase GO BACK.
- Replacing a live database in place is a separate typed-confirmation option (RESTORE over an existing name) and is only for an emergency. Take a fresh backup first.

## If something fails
The installer prints a WHAT HAPPENED card and writes logs\ (no passwords in logs). Send the card and the newest log file.

Status: these scripts were written and syntax-checked here but not run on Windows/Docker by me. The first real run on Ahmed's PC is the test.
