// Service Worker for OTOIL Araç Bakım PWA
const CACHE_NAME = 'otoil-pwa-v4';

const basePath = self.location.pathname.split('/').slice(0, -1).join('/') || '';
const urlsToCache = [
  basePath + '/',
  basePath + '/index.html',
  basePath + '/manifest.json',
  basePath + '/icon-192.png',
  basePath + '/icon-512.png',
  basePath + '/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache).catch((err) => {
        console.warn('Precache partial warning:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Firebase ve Cloudflare Worker API çağrılarını pas geç (Firebase kendi offline önbelleğine sahiptir)
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('identitytoolkit') ||
    url.hostname.includes('workers.dev')
  ) {
    return;
  }

  // HTML sayfa navigasyonları: Network-First, offline ise önbellekteki index.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => {
          return caches.match(basePath + '/index.html') || caches.match('./index.html');
        })
    );
    return;
  }

  // Statik varlıklar (JS, CSS, Fontlar, Görseller): Cache-First / Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Arka planda güncelle (stale-while-revalidate)
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline fallback
          if (event.request.destination === 'image') {
            return caches.match(basePath + '/icon-192.png');
          }
        });
    })
  );
});
