'use client';

// Hook that mounts the daily-reminder polling. Run this once at the app
// root (currently Home.tsx) so it covers every tab.
//
// Polls every 5 minutes while the app is open. Also re-checks when the
// window regains focus (so coming back to the app from another tab or
// app immediately evaluates the reminder condition).
//
// For background firing on installed PWAs, see `public/sw.js` — that's
// where Periodic Background Sync is registered (Chrome/Edge only) so the
// user gets the reminder even when the app is closed.

import { useEffect, useRef } from 'react';
import {
  checkAndFire,
  loadReminderSettings,
  notificationsSupported,
} from '@/lib/reminder';

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function useReminder() {
  // Use a ref so we don't re-run the effect when settings change — we
  // re-read the latest settings on every poll instead. That way the user
  // toggling the reminder doesn't churn the effect's lifecycle.
  const mountedRef = useRef(false);

  useEffect(() => {
    if (mountedRef.current) return;
    if (!notificationsSupported()) return;
    mountedRef.current = true;

    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      const s = loadReminderSettings();
      checkAndFire(s);
    };

    // Run once on mount (covers the case where the user opened the app
    // right at their reminder time).
    tick();
    // Then poll every 5 minutes.
    const id = setInterval(tick, POLL_INTERVAL_MS);
    // Re-check on focus (covers switching away from the app and back).
    const onFocus = () => tick();
    window.addEventListener('focus', onFocus);

    return () => {
      cancelled = true;
      clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, []);
}
