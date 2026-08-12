/* Browser-safe notification adapter.
   Capacitor's native plugin must NOT be imported from the PWA bundle,
   because GitHub Pages serves this file directly and cannot resolve npm packages.
   The native iOS/Android build can provide window.roundOneNative if desired. */
export const nativeNotifications = {
  isNative() {
    return Boolean(window.Capacitor?.isNativePlatform?.());
  },
  async permission() {
    try {
      if (window.roundOneNative?.permission) return await window.roundOneNative.permission();
      if ("Notification" in window) return { display: await Notification.requestPermission() };
    } catch (e) { console.warn("Notification permission:", e); }
    return null;
  },
  async scheduleDaily(tasks) {
    if (window.roundOneNative?.scheduleDaily) {
      try { return await window.roundOneNative.scheduleDaily(tasks); } catch (e) { console.warn(e); }
    }
    return false;
  },
  notify(title, body) {
    if (window.roundOneNative?.notify) {
      try { window.roundOneNative.notify(title, body); return; } catch (e) { console.warn(e); }
    }
    if ("Notification" in window && Notification.permission === "granted") {
      try { new Notification(title, { body, icon: "icon-192.png" }); } catch (e) { console.warn(e); }
    }
  }
};
