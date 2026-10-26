/**
 * Glimmer Journal service worker.
 *
 * This is a minimal, network-first service worker. Its purpose is to satisfy
 * Chrome/Brave's PWA installability criteria (which require a registered
 * service worker with a fetch handler). It does NOT cache anything — we
 * always fetch from the network so the user always sees fresh data from
 * Supabase, and Vercel always serves the latest deployed JS/CSS.
 *
 * If you later want offline support, replace this with a Workbox-generated
 * service worker that caches static assets but never API responses.
 *
 * In addition to the fetch handler, this SW also registers a periodic
 * background sync (where supported by the browser — Chrome/Edge only) so
 * that the daily "One Small Thing" reminder can fire even when the user
 * doesn't have the app open. Safari/Firefox don't support this API, so
 * on those browsers the reminder only fires while the app is open (via
 * the in-app polling in `useReminder`).
 */

const CACHE_NAME = 'glimmer-journal-v1';
const PERIODIC_SYNC_TAG = 'glimmer-daily-reminder';

self.addEventListener('install', (event) => {
  // Skip waiting so the SW activates immediately on first install
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add('/'))
  );
});

self.addEventListener('activate', (event) => {
  // Take control of all clients immediately
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Clean up any old caches (if we ever introduce versioning)
      caches.keys().then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      ),
      // Try to register a periodic background sync (Chrome/Edge only).
      // If the browser doesn't support it, this no-ops.
      registerPeriodicSyncIfSupported(),
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Never intercept non-GET requests (POST/PATCH for Supabase go straight to network)
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Never intercept Supabase API calls — always fetch fresh
  if (url.hostname.includes('supabase.co')) return;

  // Never intercept Vercel HMR / dev endpoints
  if (url.pathname.startsWith('/_next/webpack-hmr')) return;

  // Network-first strategy for everything else.
  // If the network fails (offline), fall back to cache.
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful GET responses for offline fallback (only same-origin)
        if (response.ok && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
  );
});

// --- Periodic background sync (Chrome/Edge only) ----------------------------
// Lets us fire the daily reminder even when the app isn't actively open.
// The browser decides how often to actually wake us (based on site
// engagement) — the minInterval is a *minimum*, not a guarantee. The user
// must have installed the PWA for this to fire at all on most browsers.
self.addEventListener('periodicsync', (event) => {
  if (event.tag === PERIODIC_SYNC_TAG) {
    event.waitUntil(fireReminderFromSW());
  }
});

async function registerPeriodicSyncIfSupported() {
  try {
    // @ts-expect-error - registration.periodicSync isn't in standard lib.dom types yet
    const reg = await self.registration.periodicSync?.getRegistration(PERIODIC_SYNC_TAG);
    if (reg) return; // Already registered — don't churn.

    // @ts-expect-error - registration.periodicSync isn't in standard lib.dom types yet
    if (!self.registration.periodicSync) return;

    // 1 day in milliseconds. The browser rounds this up to its own
    // minimum (Chrome uses 1 day as the smallest interval in practice).
    const minInterval = 24 * 60 * 60 * 1000;
    // @ts-expect-error - registration.periodicSync isn't in standard lib.dom types yet
    await self.registration.periodicSync.register(PERIODIC_SYNC_TAG, {
      minInterval,
    });
  } catch {
    // Silently no-op — periodic sync isn't supported, or registration failed.
    // In that case the in-app polling still handles reminders when the app is open.
  }
}

/**
 * The SW-side check. Mirrors the `checkAndFire` logic in src/lib/reminder.ts
 * but re-implemented here because the SW can't import from the app bundle
 * (different execution context, different module graph).
 */
async function fireReminderFromSW() {
  try {
    // Read settings from the same localStorage key used by the app.
    // The SW has access to localStorage via the registered client's origin.
    const settings = await readReminderSettingsFromClient();
    if (!settings || !settings.enabled) return;

    // Check permission — the SW runs as the same origin so it inherits
    // the user's granted permission.
    if (Notification.permission !== 'granted') return;

    // Check the window.
    const now = new Date();
    const startMinutes = settings.hour * 60 + settings.minute;
    const endMinutes = startMinutes + (settings.windowMinutes || 120);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    if (nowMinutes < startMinutes || nowMinutes >= endMinutes) return;

    // Today's date in local time (yyyy-mm-dd)
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    if (settings.lastNotifiedDate === today) return;

    // Check if today's small thing is done.
    const practiceLog = await readPracticeLogFromClient();
    if (practiceLog && (practiceLog[today]?.length ?? 0) > 0) return;

    // Fire.
    await self.registration.showNotification('One small thing for today', {
      body: 'Open Glimmer Journal to see today\u2019s pick and mark it done.',
      tag: 'glimmer-one-small-thing',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
    });

    // Mark today as notified so we don't spam. This writes through the
    // registered client's localStorage via postMessage (best-effort).
    settings.lastNotifiedDate = today;
    await writeReminderSettingsToClient(settings);
  } catch {
    // best effort — silent no-op on any error
  }
}

// Bridge between the SW and the client's localStorage. The SW can't
// directly read localStorage for the page; it has to ask a controlled
// client via postMessage. These helpers do that with a short timeout.

async function withClient<T>(fn: (client: Client) => Promise<T>, timeoutMs = 2000): Promise<T | null> {
  const clients = await self.clients.matchAll({ type: 'window' });
  if (clients.length === 0) return null;
  // Use the first controlled window. In practice there's usually only one.
  return await fn(clients[0]).catch(() => null);
}

async function readReminderSettingsFromClient(): Promise<any | null> {
  return await withClient(async (client) => {
    return new Promise((resolve) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = (e) => resolve(e.data);
      client.postMessage({ type: 'GLIMMER_READ_REMINDER' }, [channel.port2]);
      setTimeout(() => resolve(null), 2000);
    });
  });
}

async function writeReminderSettingsToClient(settings: any): Promise<void> {
  await withClient(async (client) => {
    return new Promise<void>((resolve) => {
      client.postMessage({ type: 'GLIMMER_WRITE_REMINDER', settings });
      // Don't wait for ack — the read on the next fire will see the update.
      resolve();
    });
  });
}

async function readPracticeLogFromClient(): Promise<any | null> {
  return await withClient(async (client) => {
    return new Promise((resolve) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = (e) => resolve(e.data);
      client.postMessage({ type: 'GLIMMER_READ_PRACTICE' }, [channel.port2]);
      setTimeout(() => resolve(null), 2000);
    });
  });
}

// Listen for messages from the client (in response to our read requests
// above, or in response to the user toggling the reminder in the UI).
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;
  // The client sent us data back — forward via the port it provided.
  // The actual handling of these messages is in src/lib/reminder-bridge.ts
  // (loaded by Home.tsx). Here we just relay nothing; the client handles
  // the actual localStorage reads/writes when it receives the requests.
});
