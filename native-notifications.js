import { LocalNotifications } from '@capacitor/local-notifications';

export const nativeNotifications = {
  isNative() {
    return Boolean(window.Capacitor?.isNativePlatform?.());
  },
  async permission() {
    try {
      if (this.isNative()) return await LocalNotifications.requestPermissions();
      if ('Notification' in window) return { display: await Notification.requestPermission() };
    } catch (e) { console.warn('Notification permission:', e); }
    return null;
  },
  async scheduleDaily(tasks) {
    if (!this.isNative()) return false;
    try {
      const pending = await LocalNotifications.getPending();
      if (pending.notifications?.length) {
        await LocalNotifications.cancel({ notifications: pending.notifications.map(n => ({ id: n.id })) });
      }
      const notifications = tasks.map((task, index) => {
        const [hour, minute] = task.time.split(':').map(Number);
        return {
          id: 1000 + index,
          title: 'ROUND ONE',
          body: `${task.icon} ${task.label}`,
          schedule: { on: { hour, minute }, repeats: true, allowWhileIdle: true },
          extra: { taskId: task.id }
        };
      });
      await LocalNotifications.schedule({ notifications });
      return true;
    } catch (e) { console.warn('Native scheduling:', e); return false; }
  },
  notify(title, body) {
    if (window.roundOneNative?.notify) return window.roundOneNative.notify(title, body);
    if ('Notification' in window && Notification.permission === 'granted') {
      try { new Notification(title, { body }); } catch {}
    }
  }
};
