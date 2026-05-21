/* 라이프코드 PWA — Android 「앱 설치」·전용 아이콘용 최소 서비스 워커 */
const CACHE = 'lifecode-pwa-v2';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll([
        '/lifecode/',
        '/lifecode/manifest.webmanifest',
        '/lifecode/icon-192.png',
        '/lifecode/icon-512.png',
      ]),
    ),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith('/lifecode/')) return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request)),
  );
});
