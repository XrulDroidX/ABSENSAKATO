
const CACHE_NAME = "sakato-pro-v4";
const DYNAMIC_CACHE = "sakato-dynamic-v1";

// Assets to pre-cache immediately
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./manifest.json"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch(err => console.warn('Precache warning:', err));
    })
  );
});

self.addEventListener("activate", (event) => {
  self.clients.claim();
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== DYNAMIC_CACHE) {
            return caches.delete(key);
          }
        })
      );
    })
  );
});

// Stale-While-Revalidate Strategy for most resources
self.addEventListener("fetch", (event) => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  // Strategy: Try Cache First, then Network (updating cache)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            const targetCache = event.request.url.includes('cdn') ? DYNAMIC_CACHE : CACHE_NAME;
            caches.open(targetCache).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
           // Fallback logic if needed
        });

      return cachedResponse || fetchPromise;
    })
  );
});
