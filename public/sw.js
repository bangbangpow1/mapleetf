const CACHE_NAME = 'mapleetf-v2';

// Install - skip waiting to activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  // Don't pre-cache paths — we use network-first strategy
  // This avoids 404s when paths don't match the deployment URL
  event.waitUntil(caches.open(CACHE_NAME));
});

// Activate - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch - network first for everything, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and other non-http
  if (!request.url.startsWith('http')) return;

  const url = new URL(request.url);

  // For API calls (Yahoo Finance via proxy) - network only, don't cache
  if (url.hostname.includes('corsproxy') || 
      url.hostname.includes('allorigins') || 
      url.hostname.includes('yahoo')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(JSON.stringify({ error: 'offline' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // For static assets - network first, fallback to cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          // For navigation requests, try to return the cached index page
          if (request.mode === 'navigate') {
            return caches.match(new Request(self.registration.scope));
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});
