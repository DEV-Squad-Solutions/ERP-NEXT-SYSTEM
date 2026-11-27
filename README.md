# ERP System

Single repository for the ERP system.

| Folder | What it is |
| --- | --- |
| `backend/` | ASP.NET Core (.NET 10), Clean Architecture (Api, Application, Domain, Infrastructure), SQL Server, xUnit tests |
| `frontend/` | React 19 + Vite + Tailwind, Arabic RTL first, English available, light and dark themes |
| `deploy/` | Windows installer, Docker compose files, backup and restore scripts, client guides (Arabic and English) |
| `android/` | Android app (debug APK build) |
| `desktop/` | Electron desktop app scaffold (Windows installer via electron-builder, not yet built on Windows) |
| `docs/` | Security review, QA notes, AI notes |

Start here:

- Installing or updating a company server: `deploy/README-EN.md`, `deploy/README-AR.md`, `deploy/CLIENT-GUIDE-AR.md`, `deploy/DELIVERY.md`.
- Backups and restore: `deploy/BACKUP-RESTORE.md`.
- Security findings: `docs/SECURITY-REVIEW.md`.
- Test status and known stale tests: `docs/QA-NOTES.md`.
- Running locally: each part has its own README (`backend/`, `frontend/`).

Accounts: sign in with username or email. New users send a registration request at `/register`; an Admin approves it and assigns the company and role (Admin or User).

Both original repositories were merged with their full commit history:
`DEV-Squad-Solutions/ERP_SYSTEM` (backend) and `DEV-Squad-Solutions/ERP-SYSTEM_FRONTENDTEAM` (frontend).
