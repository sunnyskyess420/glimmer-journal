'use client';

// Bridge between the service worker and the client's localStorage.
//
// The service worker can't read localStorage for the page directly (it's
// a separate execution context). Instead it sends `postMessage` requests
// like { type: 'GLIMMER_READ_REMINDER' } and we respond with the data.
// This is what powers the SW-side periodic-background-sync firing of the
// daily reminder — without it, the SW can't tell whether the user has
// already done today's small thing, so it would fire the notification
// even after they completed the practice.
//
// Mount this once at the app root (currently Home.tsx).

import { useEffect } from 'react';
import { loadReminderSettings, saveReminderSettings } from '@/lib/reminder';
import { loadPracticeLog } from '@/lib/regulate-content';

export function useReminderBridge() {
  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      const port = (event.ports && event.ports[0]) || null;

      switch (data.type) {
        case 'GLIMMER_READ_REMINDER': {
          const settings = loadReminderSettings();
          if (port) port.postMessage(settings);
          break;
        }
        case 'GLIMMER_READ_PRACTICE': {
          const log = loadPracticeLog();
          if (port) port.postMessage(log);
          break;
        }
        case 'GLIMMER_WRITE_REMINDER': {
          // The SW is telling us it fired the notification and wants us
          // to mark today as lastNotifiedDate so we don't spam.
          if (data.settings) {
            saveReminderSettings(data.settings);
          }
          break;
        }
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
  }, []);
}
