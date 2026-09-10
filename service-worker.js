/* gROW Ocean service worker
   Plain English: this script runs in the background of the browser. On first
   visit it downloads ("pre-caches") every file the app needs, and saves them on
   the device. After that, the app loads from the device — so it works with no
   internet at all (essential mid-Atlantic). Bump CACHE_VERSION to push updates. */

const CACHE_VERSION = 'grow-ocean-v7';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './js/app.js',
  './js/db.js',
  './js/log-export.js',
  './js/reminders.js',
  './js/notify.js',
  './js/wikiStore.js',
  './js/entertainment.js',
  './js/safety.js',
  './js/rules.js',
  './js/data/content.js',
  './js/data/entertainment-pack.json',
  './js/data/entertainment-base.json',
  './js/data/rules-data.js',
  './references/race-rules-wtr-atlantic-2025-v1.0.pdf',
  './js/views/home.js',
  './js/views/wiki.js',
  './js/views/reminders.js',
  './js/views/checklists.js',
  './js/views/log.js',
  './js/views/entertain.js',
  './js/views/feedback.js',
  './js/views/shortcuts.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k.startsWith('grow-ocean-') && k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* Cache-first strategy: serve from device cache, fall back to network.
   This guarantees the app opens instantly and offline. */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((resp) => {
          // Stash newly fetched same-origin files for next time.
          if (resp && resp.status === 200 && new URL(request.url).origin === self.location.origin) {
            const copy = resp.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return resp;
        })
        .catch(() => {
          // Never substitute app HTML for a missing PDF, JSON pack or module.
          if (request.mode === 'navigate' && !new URL(request.url).pathname.match(/\.[a-z0-9]+$/i))
            return caches.match('./index.html');
          return new Response('Not available offline. Download the app before departure.', {
            status: 503, headers: { 'Content-Type': 'text/plain' }
          });
        });
    })
  );
});
