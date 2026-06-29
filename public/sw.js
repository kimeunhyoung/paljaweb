// 팔자연구소 PWA 서비스 워커
// 설치 가능(PWA) 요건 충족용. 동적 콘텐츠·API·결제 흐름을 깨지 않도록
// 적극적 캐싱은 하지 않고 네트워크 우선(passthrough)으로 동작합니다.

const VERSION = 'palja-sw-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // GET이 아니거나 API 요청은 그대로 네트워크로 통과
  if (req.method !== 'GET' || req.url.includes('/api/')) return;
  event.respondWith(fetch(req).catch(() => caches.match(req)));
});
