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
 */

const CACHE_NAME = 'glimmer-journal-v1';

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
