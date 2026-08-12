# ROUND ONE PWA v4 — GitHub Pages update

This version fixes the main PWA problem in v3: the browser was trying to import the Capacitor native-notifications npm package directly from GitHub Pages. That causes the JavaScript module to fail, which makes buttons, navigation, water, tasks, reset, and progress stop working.

## Update on GitHub Pages
1. Open the ROUND-ONE repository.
2. Replace the repository's current files with the contents of this `app` folder.
3. Commit the changes.
4. Wait for GitHub Pages to redeploy.
5. On iPhone, fully close ROUND ONE, reopen Safari, open the website once, then reopen the Home Screen app.
6. If it still shows the old version, delete the Home Screen app and add it again from Safari. This refreshes the service-worker cache.

## Notifications
The PWA version can request browser notification permission, but reliable scheduled notifications while the web app is completely closed require a proper web-push backend. Native Capacitor local notifications are reserved for the future iOS/Android build.
