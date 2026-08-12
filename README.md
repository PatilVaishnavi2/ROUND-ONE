## ROUND ONE iPhone PWA v3

Mobile-first PWA with iPhone safe-area support, offline caching, persistent local data, and bottom navigation for Home, Routine, Water, and Progress.

# ROUND ONE — Daily Discipline Tracker (iPhone-first PWA v2)

ROUND ONE is an offline-first daily routine tracker designed to work well on iPhone 16, Android, Windows, and modern browsers.

## v2 improvements

- iPhone-safe-area and standalone web-app metadata
- Improved mobile layout and touch targets
- Install helper for supported browsers
- iPhone installation guide
- Notification permission control
- Web notification support when permitted
- Quick daily stats: tasks, water, study blocks, streak
- Progress mini-dashboard
- Offline service-worker cache versioning
- Local data persistence
- Existing water, routine, custom tasks, alarm, and native Capacitor hooks retained

## Important iPhone limitation

A PWA can be installed on the iPhone Home Screen and run as a web app. However, JavaScript `setInterval()` timers are not a guaranteed background scheduling mechanism when the app is fully closed. This version therefore treats browser reminders as an active-app feature and exposes notification permission where supported.

For guaranteed recurring reminders while the app is closed, build the Capacitor iOS version with native local notifications, or add a production web-push service.

## Deploy

The PWA should be served over **HTTPS**. Do not distribute it by opening `file://` directly on the phone.

## Local desktop preview

```bash
npm install
npm run dev
```

Then open the local Vite address shown in the terminal.

## Production build

```bash
npm install
npm run build
```

The production files are generated in `dist/`.

## iPhone install

Open the deployed HTTPS URL in Safari → Share → Add to Home Screen → enable Open as Web App → Add.
