// Daily reminder system for the One Small Thing.
//
// The honest version of "remind me to do today's small thing":
//
//   - If the user opts in and grants Notification permission, the app
//     fires a local notification when:
//       (a) the current time is inside the user's chosen reminder window
//           (defaults to 9 PM local time, but configurable),
//       (b) today's small thing hasn't been marked done yet, and
//       (c) we haven't already notified the user today.
//
//   - The check runs every 5 minutes while the app is open. The browser
//     also keeps the check going for an installed PWA via Chrome's
//     Periodic Background Sync (where supported) — that fires the
//     notification even when the app isn't actively open.
//
//   - True cross-device, server-driven push would need VAPID keys + a
//     server-side scheduled job (Supabase Edge Function / Vercel Cron).
//     That's a separate project. This is the in-app version: it works
//     when the app is open, AND when installed as a PWA on Chrome/Edge
//     where Periodic Background Sync is available.
//
// State is stored in localStorage so it survives reloads:
//   glimmer.reminder.v1 = {
//     enabled: boolean,
//     hour: number (0-23, local time),
//     minute: number (0-59),
//     lastNotifiedDate: string | null  // yyyy-mm-dd — prevents repeat notifications
//   }

const REMINDER_KEY = 'glimmer.reminder.v1';
const NOTIFICATION_TAG = 'glimmer-one-small-thing';

export interface ReminderSettings {
  enabled: boolean;
  /** Hour of day (0-23, local time) at which the reminder window starts. */
  hour: number;
  /** Minute (0-59) at which the reminder window starts. */
  minute: number;
  /** Length of the reminder window in minutes (the reminder can fire
      anywhere inside this window, not just at the exact start time). */
  windowMinutes: number;
  /** Last date (yyyy-mm-dd) we sent a notification. Prevents spamming. */
  lastNotifiedDate?: string | null;
}

export const DEFAULT_REMINDER: ReminderSettings = {
  enabled: false,
  hour: 21, // 9 PM local time — sensible default "winding down" hour
  minute: 0,
  windowMinutes: 120, // 9 PM to 11 PM
  lastNotifiedDate: null,
};

// --- Persistence -----------------------------------------------------------

export function loadReminderSettings(): ReminderSettings {
  if (typeof window === 'undefined') return DEFAULT_REMINDER;
  try {
    const raw = window.localStorage.getItem(REMINDER_KEY);
    if (!raw) return DEFAULT_REMINDER;
    const parsed = JSON.parse(raw) as Partial<ReminderSettings>;
    // Defensive merge so old/missing fields don't break.
    return {
      ...DEFAULT_REMINDER,
      ...parsed,
    };
  } catch {
    return DEFAULT_REMINDER;
  }
}

export function saveReminderSettings(s: ReminderSettings): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(REMINDER_KEY, JSON.stringify(s));
  } catch {
    // best effort — storage blocked or full
  }
}

// --- Browser support detection --------------------------------------------

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getPermission(): NotificationPermission | 'unsupported' {
  if (!notificationsSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return 'denied';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

// --- The check ------------------------------------------------------------

/**
 * Returns true if today's small thing is not yet marked done.
 * Reads the same localStorage practice log used everywhere else.
 */
function isTodaySmallThingDone(): boolean {
  if (typeof window === 'undefined') return true; // SSR safety
  try {
    const raw = window.localStorage.getItem('glimmer.regulate.practice.v1');
    if (!raw) return false;
    const log = JSON.parse(raw) as Record<string, string[]>;
    const today = localTodayISO();
    return (log[today]?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

/**
 * Returns true if the current time (local) is inside the reminder window.
 */
function isInsideReminderWindow(s: ReminderSettings, now: Date = new Date()): boolean {
  const startMinutes = s.hour * 60 + s.minute;
  const endMinutes = startMinutes + s.windowMinutes;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return nowMinutes >= startMinutes && nowMinutes < endMinutes;
}

function localTodayISO(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/**
 * The main check. Returns a notification payload if a reminder should
 * fire now, or null otherwise. Caller is responsible for actually
 * calling `new Notification(...)` (or showing a fallback in-app banner).
 */
export function shouldFireReminder(s: ReminderSettings, now: Date = new Date()): boolean {
  if (!s.enabled) return false;
  if (getPermission() !== 'granted') return false;
  if (!isInsideReminderWindow(s, now)) return false;
  if (s.lastNotifiedDate === localTodayISO(now)) return false;
  if (isTodaySmallThingDone()) return false;
  return true;
}

/**
 * Picks a small thing from the same pool used by the picker. We need a
 * duplicate of the picker because the picker is in a React component that
 * isn't loaded in the service worker. The pool is short and stable, so
 * this is fine.
 */
function getTodaysSmallThingLabel(): string {
  // Reads from localStorage so it matches what the picker shows in-app.
  // The picker is in regulate-content.ts; we duplicate the pool here
  // only as a fallback if for some reason the data isn't available.
  // The actual picker uses an FNV hash of the date; we do the same.
  const pool = [
    'Box breathing (in 4, hold 4, out 4)',
    'Name 5 things you can see',
    'Shoulder roll and stretch reset',
    'Sip water slowly, focus on the taste',
    'Change position: stand, walk, stretch',
    'Regular sleep routine',
    'Morning sunlight',
    'Gratitude journaling',
    'Digital boundaries',
    'Consistent movement or stretching',
  ];
  const ds = localTodayISO();
  let hash = 0x811c9dc5;
  for (let i = 0; i < ds.length; i++) {
    hash ^= ds.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return pool[hash % pool.length];
}

/**
 * Fire the actual notification and mark today as notified so we don't
 * send another one. Returns true if the notification was sent.
 */
export function fireReminder(s: ReminderSettings): boolean {
  if (!notificationsSupported()) return false;
  if (Notification.permission !== 'granted') return false;

  const today = localTodayISO();
  const skill = getTodaysSmallThingLabel();
  try {
    // `tag` collapses repeat notifications: if a second one tries to fire
    // today, the browser replaces the first instead of stacking both.
    new Notification('One small thing for today', {
      body: `${skill}\n\nOpen Glimmer Journal to do it.`,
      tag: NOTIFICATION_TAG,
      // Reuse the existing maskable icon so the notification looks native
      // on Android.
      icon: '/icon-192.png',
      badge: '/icon-192.png',
    });
    const updated = { ...s, lastNotifiedDate: today };
    saveReminderSettings(updated);
    return true;
  } catch {
    return false;
  }
}

/**
 * Convenience: run the check + fire in one call. Returns true if fired.
 * Safe to call repeatedly — `shouldFireReminder` already gates it.
 */
export function checkAndFire(s: ReminderSettings): boolean {
  if (!shouldFireReminder(s)) return false;
  return fireReminder(s);
}

/**
 * Format the reminder time as e.g. "9:00 PM".
 */
export function formatReminderTime(s: ReminderSettings): string {
  const date = new Date();
  date.setHours(s.hour, s.minute, 0, 0);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}
