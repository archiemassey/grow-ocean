/* gROW Ocean service worker
   Plain English: this script runs in the background of the browser. On first
   visit it downloads ("pre-caches") every file the app needs, and saves them on
   the device. After that, the app loads from the device — so it works with no
   internet at all (essential mid-Atlantic). Release bumps must also update the
   index.html app-release marker and updates.js APP_RELEASE (see README). */

const CACHE_VERSION = 'grow-ocean-v8';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './js/app.js',
  './js/updates.js',
  './js/db.js',
  './js/log-export.js',
  './js/reminders.js',
  './js/notify.js',
  './js/wikiStore.js',
  './js/entertainment.js',
  './js/hands-free.js',
  './js/shift-perspective.js',
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

const shellURL = (path) => new URL(path, self.location.href).href;
const shellURLs = new Set(APP_SHELL.map(shellURL));
const releaseMarker = `name="app-release" content="${CACHE_VERSION}"`;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    try {
      // Bypass the browser HTTP cache, not just CacheStorage. addAll is atomic:
      // an interrupted download must never replace the previous offline release.
      await cache.addAll(APP_SHELL.map(path => new Request(shellURL(path), { cache: 'reload' })));
      const html = await cache.match(shellURL('./index.html'));
      if (!html || !(await html.text()).includes(releaseMarker))
        throw new Error('App shell and service worker releases do not match');
    } catch (error) {
      await caches.delete(CACHE_VERSION);
      throw error;
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('grow-ocean-') && k !== CACHE_VERSION)
      .map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

function unavailable() {
  return new Response('Not available offline. Download the app before departure.', {
    status: 503, headers: { 'Content-Type': 'text/plain' }
  });
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  url.search = '';
  const appNavigation = request.mode === 'navigate' &&
    (url.href === shellURL('./index.html') || !url.pathname.match(/\.[a-z0-9]+$/i));

  if (appNavigation) {
    // A navigation checks for the next worker, even when the old page has no
    // update UI. Never serve a newer HTML shell with this worker's older modules.
    event.waitUntil(self.registration.update().catch(() => {}));
  }
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_VERSION);
    if (appNavigation) {
      const abort = new AbortController();
      const timeout = setTimeout(() => abort.abort(), 3000);
      try {
        const response = await fetch(new Request(request, { cache: 'reload', signal: abort.signal }));
        if (response.ok && (await response.clone().text()).includes(releaseMarker)) return response;
      } catch { /* The complete installed shell remains usable offline. */ }
      finally { clearTimeout(timeout); }
      return (await cache.match(shellURL('./index.html'))) || unavailable();
    }
    // Read only this release's cache, never an arbitrary older cache. Modules,
    // CSS and packs all come from the same fresh install, not the HTTP cache.
    if (shellURLs.has(url.href))
      return (await cache.match(url.href)) || unavailable();
    try { return await fetch(new Request(request, { cache: 'reload' })); }
    catch { return unavailable(); }
  })());
});
