# ROUND ONE — iPhone 16 PWA Guide

## Use without a Mac

1. Publish the `app/` folder on an HTTPS host.
2. Open the HTTPS address in Safari on your iPhone 16.
3. Tap **Share** → **Add to Home Screen**.
4. Enable **Open as Web App** → **Add**.
5. Launch ROUND ONE from the new Home Screen icon.

## Important reminder behavior

The PWA uses browser timers while it is running and can request web notification permission. iOS supports installed web apps receiving notifications, but a simple offline-only JavaScript timer is **not** a reliable replacement for native scheduled notifications when the app is fully closed.

For guaranteed recurring reminders while the app is closed, the later native iOS/Capacitor version should use iOS local notifications or a proper web-push backend.

## Data

Routine completion, water, custom tasks, and settings are stored locally on the device. There is no account or cloud synchronization in this version.

## Recommended deployment

Use HTTPS (for example, a static hosting provider) rather than opening `index.html` directly. Secure HTTPS hosting is required for reliable PWA/service-worker behavior.
