# Dev Squad ERP desktop app (Windows)

A small Electron window around the ERP web app. It holds no business logic and no data: it opens the address of your own ERP server. The address is asked on first start and can be changed from the menu (ERP > Change server address).

Security: contextIsolation on, nodeIntegration off, sandbox on, only http/https server addresses, other sites open in the normal browser, one window instance.

## Build the installer (on a Windows PC with Node 20+, internet needed once)
```
cd desktop
npm install
npm run check
npm start            (try it)
npm run dist         (makes dist\Dev Squad ERP Setup 1.0.0.exe)
```
The installer is unsigned (no paid certificate): Windows SmartScreen shows "Windows protected your PC", then More info > Run anyway. Send it the same safe way as the server installer (see ../deploy/DELIVERY.md): SHA256 in a separate message.

## Status
Written and syntax-checked in a Linux sandbox. NOT built into an installer and NOT run on Windows yet.
