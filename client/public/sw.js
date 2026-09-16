// FarmToHome (KisanSetu) Service Worker
const CACHE_NAME = 'kisansetu-v1.0.0';
const DATA_CACHE_NAME = 'kisansetu-data-v1.0.0';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Install Event: Cache Core App Shell
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching offline app shell');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Non-fatal pre-cache error:', err);
      });
    })
  );
});

// Activate Event: Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) {
            console.log('[SW] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event Strategy:
// 1. API Products / Prices: Stale-While-Revalidate
// 2. Images (Unsplash / Local): Cache-First
// 3. Navigation / App Shell: Network-First with Offline Fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-GET requests (handled by CartContext offline sync)
  if (request.method !== 'GET') {
    return;
  }

  // 1. Product Catalog & Market Prices (Stale-While-Revalidate)
  if (url.pathname.includes('/api/products') || url.pathname.includes('/api/market')) {
    event.respondWith(
      caches.open(DATA_CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 2. Images: Cache-First
  if (request.destination === 'image' || url.hostname.includes('images.unsplash.com')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        }).catch(() => {
          // Return generic fallback if image fails
          return new Response('', { status: 408, statusText: 'Offline Image' });
        });
      })
    );
    return;
  }

  // 3. HTML Navigation & Static JS/CSS
  event.respondWith(
    caches.match(request).then((cached) => {
      return (
        cached ||
        fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return response;
          })
          .catch(async () => {
            if (request.mode === 'navigate') {
              const fallback = await caches.match('/index.html');
              if (fallback) return fallback;
            }
            return new Response('Offline: Network unavailable', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          })
      );
    })
  );
});

// Push Notifications
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: '🌾 FarmToHome Alert', body: event.data ? event.data.text() : 'New order update' };
  }

  const title = data.title || '🌾 FarmToHome (KisanSetu)';
  const options = {
    body: data.body || 'You have a new farm transaction update.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification Click Handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
