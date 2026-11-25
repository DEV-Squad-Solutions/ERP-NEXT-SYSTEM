# ERP Android app (Capacitor)

Packages the existing React frontend (`../frontend`) as an Android app. No business logic lives here.

- App id: `com.devsquad.erp`
- Web build is created with `VITE_API_URL` pointing at the live API (default `https://ai-job-hunter.runasp.net/api/v1`), because the app has no Vercel proxy.
- The app loads from `https://localhost` inside the WebView, so if you restrict CORS on the backend (`Cors:AllowedOrigins`), add `https://localhost` next to the website origin.

## Build a debug APK (installable for testing)

Needs JDK 21 and the Android SDK (platform 35, build-tools 35).

```
cd android
npm install
npm run apk:debug
# result: android/app/build/outputs/apk/debug/app-debug.apk
```

## What you do by hand (release)

1. Create a keystore once (keep it and its password safe, losing it means you can never update the app):
   `keytool -genkey -v -keystore erp-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias erp`
2. Sign: `npm run aab:release`, then sign the bundle/APK with that keystore (Android Studio: Build > Generate Signed Bundle / APK).
3. Install the APK on a phone (enable "install unknown apps"), or upload the `.aab` to Google Play (one-time $25 developer fee, set by Google, not by us).

Update the app after frontend changes: `npm run sync`, then rebuild.
