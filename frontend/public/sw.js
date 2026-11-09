/**
 * MandiSaathi Progressive Web App Service Worker
 * Provides offline shell, asset caching, resilient offline fallback,
 * and passes non-GET voice / grievance requests directly to network.
 */

const CACHE_NAME = 'mandisaathi-core-v2';
const API_CACHE_NAME = 'mandisaathi-api-v2';

const STATIC_PRECACHE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/manifest.json',
  '/icon.svg',
  '/favicon.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png'
];

// Install: Pre-cache core shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_PRECACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate: Purge obsolete caches and claim clients
self.addEventListener('activate', (event) => {
  const currentCaches = [CACHE_NAME, API_CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!currentCaches.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Strategy depending on request type
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Non-GET requests (e.g. POST audio to /api/v1/voice/query, POST /api/v1/complaints)
  // must NEVER be cached by the service worker.
  if (request.method !== 'GET') {
    return;
  }

  // Navigation requests: Network-first falling back to cached /index.html (SPA routing)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', clone));
          }
          return response;
        })
        .catch(async () => {
          const cachedResponse = await caches.match('/index.html');
          if (cachedResponse) {
            return cachedResponse;
          }
          // Fallback offline html response
          return new Response(
            '<!DOCTYPE html><html><head><meta charset="utf-8"><title>MandiSaathi Offline</title></head><body style="font-family:sans-serif;text-align:center;padding:40px;background:#F5F3EA;color:#25352C;"><h2>MandiSaathi Offline</h2><p>You are currently offline. Please check your internet connection.</p></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          );
        })
    );
    return;
  }

  // Static assets (Vite bundle chunks, fonts, images)
  const isStaticAsset =
    url.pathname.startsWith('/assets/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.woff2') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Stale-while-revalidate for local static assets
          fetch(request).then((networkResponse) => {
            if (networkResponse.ok) {
              caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
            }
          }).catch(() => {/* ignore background fetch failure */});
          return cachedResponse;
        }

        return fetch(request).then((networkResponse) => {
          if (networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // API read queries: Explicit allowlist of public agricultural endpoints safe for offline caching
  const isAllowlistedPublicApi =
    url.pathname.startsWith('/api/v1/commodities') ||
    url.pathname.startsWith('/api/v1/mandis') ||
    url.pathname.startsWith('/api/v1/prices') ||
    url.pathname.startsWith('/api/v1/schemes');

  // Explicitly NEVER cache grievance records, personal data, voice endpoints, or administrative routes
  const isExcludedFromCache =
    url.pathname.startsWith('/api/v1/complaints') ||
    url.pathname.startsWith('/api/v1/voice') ||
    url.pathname.startsWith('/api/v1/health') ||
    url.pathname.startsWith('/actuator');

  if (isAllowlistedPublicApi && !isExcludedFromCache) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(API_CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(async () => {
          // Serve from API cache if offline
          const cached = await caches.match(request);
          if (cached) {
            return cached;
          }
          return new Response(
            JSON.stringify({ error: 'Network unavailable. Offline mode active.' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          );
        })
    );
    return;
  }
});

// Update listener
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
