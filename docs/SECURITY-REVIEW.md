# Security review (code and configuration review, not a penetration test)

Scope: backend, frontend, Android wrapper, installer scripts, as of the commit that adds this file. Nothing here was tested against the real company system. No real data was used.

## What is already in place (checked in code)
- Every API controller requires a signed-in user with one of the 4 roles (base class); user, company and registration management are Admin-only.
- Anonymous endpoints are only: auth (login, refresh, forgot/reset password), first-run setup, and the new registration request. Setup refuses to run once an Admin exists. Auth and registration are rate limited.
- Passwords: min 8, upper, lower, digit, symbol. Lockout after 5 failures for 5 minutes (appsettings.json). Reset and registration answers do not reveal whether an email or username exists.
- JWT validation options are checked at startup. Security headers are sent (nosniff, X-Frame-Options DENY, no-referrer, Permissions-Policy, CSP).
- Swagger is disabled in production config. No Hangfire dashboard is mapped. Only one raw SQL call exists (parameterised FromSqlInterpolated).
- Frontend: no dangerouslySetInnerHTML anywhere.
- Dependencies: `dotnet list package --vulnerable` finds none. `npm audit` for the Android wrapper finds none.
- Installer: password gate, secrets never printed or logged, .env restricted by icacls, no volume/image deletion.

## Findings and recommendations
1. MEDIUM, CORS is open when `Cors:AllowedOrigins` is empty. Set it on every deployment to the real frontend origin(s) (Android app also needs https://localhost). Config change only.
2. MEDIUM, access and refresh tokens are kept in browser localStorage. Any script injection could read them. Mitigated by no dangerouslySetInnerHTML and the CSP. Moving to httpOnly cookies is a larger design change: not done, needs Ahmed's decision.
3. LOW, `xlsx` 0.18.5 has 2 advisories (prototype pollution and ReDoS when PARSING files). The app only uses it to WRITE exports, so practical exposure is low. No fixed version is on npm. Do not add Excel import with this package without replacing it.
4. LOW, first-run setup is open to anyone who can reach the server until the first Admin exists. Set `Setup:Token` in the server config before exposing a new install.
5. LOW, registration requests are public. Capped at 200 pending, rate limited, nothing is created until an Admin approves. Admin should clear old requests.
6. INFO, SMTP password for reset emails must go in the server's environment/appsettings on the host only, never in the repo.
7. INFO, the Android debug APK is debug-signed and points at the test backend. Release needs Ahmed's own keystore.

Not reviewed: network setup of the real server, Windows hardening, backups offsite storage, physical access.
