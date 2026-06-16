/* notify.js — one notification layer, two backends.
   Plain English: when the app runs as a NATIVE app (wrapped with Capacitor), this
   schedules alarms with the phone's own operating system, so they fire reliably
   even when the screen is off / the app is closed. When it runs as a plain web
   page/PWA, it falls back to web notifications (which only fire while open).

   This is what makes background alarms reliable on the native build. */

export function isNative() {
  return !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function'
    && window.Capacitor.isNativePlatform());
}

function LN() { return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications; }
export function appPlugin() { return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App; }

/* Ask for notification permission on whichever platform we're on. */
export async function ensureNotifPermission() {
  if (isNative()) {
    const ln = LN(); if (!ln) return false;
    try {
      let p = await ln.checkPermissions();
      if (p.display !== 'granted') p = await ln.requestPermissions();
      return p.display === 'granted';
    } catch (_) { return false; }
  }
  if ('Notification' in window) {
    if (Notification.permission === 'default') {
      try { return (await Notification.requestPermission()) === 'granted'; } catch (_) { return false; }
    }
    return Notification.permission === 'granted';
  }
  return false;
}

/* Stable small integer id per reminder + occurrence slot (Capacitor needs Int ids). */
function numId(id, slot = 0) {
  let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 90000;
  return h * 10 + (slot % 10);
}

/* Schedule a set of future occurrences for one reminder on the native OS.
   `occurrences` is an array of timestamps (ms). allowWhileIdle fires in Doze. */
export async function scheduleNative(reminder, occurrences) {
  const ln = LN(); if (!ln) return;
  const notifications = occurrences.map((at, i) => ({
    id: numId(reminder.id, i),
    title: '⏰ ' + reminder.title,
    body: reminder.detail,
    schedule: { at: new Date(at), allowWhileIdle: true },
    smallIcon: 'ic_stat_icon',
    extra: { reminderId: reminder.id }
  }));
  if (notifications.length) await ln.schedule({ notifications });
}

/* Cancel any pending OS notifications previously scheduled for this reminder. */
export async function cancelNative(reminderId, maxSlots = 10) {
  const ln = LN(); if (!ln) return;
  const ids = [];
  for (let i = 0; i < maxSlots; i++) ids.push({ id: numId(reminderId, i) });
  try { await ln.cancel({ notifications: ids }); } catch (_) {}
}
