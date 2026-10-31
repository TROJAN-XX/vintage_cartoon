/* ============================================================================
   Vintage Cartoon — service worker (pendingworks.md P3-2, PWA basics)
   ----------------------------------------------------------------------------
   Scope: the APP SHELL ONLY (same-origin static assets + navigations).

   HARD RULE (AGENTS.md guardrail #2/#3): archive.org media is streamed on
   demand and is NEVER cached, intercepted-for-storage, or downloaded here.
   Cross-origin requests (archive.org video/audio/thumbs) are passed straight
   through with `no-store` — they must not enter the cache and must not be
   bulk-fetched.

   Strategy:
   - Navigations: network-first → cached shell → offline.html fallback.
   - Same-origin static assets (hashed /assets/, /favicon.svg, ...):
     cache-first (they're content-hashed, immutable) with background fill.
   - Everything else (incl. archive.org): bypass the SW cache entirely.
   ========================================================================== */

const CACHE_NAME = 'vintage-shell-v1';
const OFFLINE_URL = '/offline.html';
const SHELL_URLS = [
  '/',
  '/offline.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icon-maskable.svg',
  '/thumb-placeholder.svg',
  '/icons.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_URLS).catch(() => undefined))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Never touch cross-origin (archive.org media) — let the browser stream it.
  if (url.origin !== self.location.origin) return;

  // Navigations: network-first with offline fallback.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/', copy));
          return response;
        })
        .catch(() =>
          caches.match('/').then((cached) => cached || caches.match(OFFLINE_URL))
        )
    );
    return;
  }

  // Same-origin assets: cache-first (content-hashed / immutable), fill on miss.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
