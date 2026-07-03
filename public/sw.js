// 팔자연구소 PWA 서비스 워커
// 설치 가능(PWA) 요건 충족용. 동적 콘텐츠·API·결제 흐름을 깨지 않도록
// 적극적 캐싱은 하지 않고 네트워크 우선(passthrough)으로 동작합니다.

const VERSION = 'palja-sw-v2';

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

self.addEventListener('push', (event) => {
  let data = { title: '팔자연구소', body: '', url: '/counselor.html' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (_) { /* ignore */ }
  event.waitUntil(
    self.registration.showNotification(data.title || '팔자연구소', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag || 'palja-push',
      data: { url: data.url || '/counselor.html' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || '/counselor.html';
  const abs = new URL(target, self.location.origin).href;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.startsWith(self.location.origin) && 'focus' in c) {
          return c.focus().then((w) => {
            if (w && 'navigate' in w) return w.navigate(abs);
            return w;
          });
        }
      }
      if (clients.openWindow) return clients.openWindow(abs);
    }),
  );
});
