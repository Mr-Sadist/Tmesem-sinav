/* TMESEM Sınav — Service Worker (P0: reliable updates + offline)
   Стратегия:
   - HTML-навигации (/, /index.html, /dersler/*): NETWORK-FIRST → после деплоя
     пользователь всегда получает свежий HTML; офлайн — кэш.
   - Статические ресурсы (css/js/png/svg/ico/json/xml/txt): CACHE-FIRST +
     фоновое обновление кэша (stale-while-revalidate) → быстро, и кэш
     догоняет новые версии при следующем визите.
   - Версионирование: каждый деплой с новым sw.js активирует новый кэш
     (tmesem-vN) и удаляет все старые (activate).
   - skipWaiting + clients.claim → обновление применяется немедленно.
*/
const CACHE = 'tmesem-v2';
const CORE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/og-image.png',
  '/dersler/landing.css',
  '/dersler/matematik/index.html',
  '/dersler/elektrik/index.html',
  '/dersler/din-kulturu/index.html',
  '/dersler/turk-dili-ve-edebiyati/index.html'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  const isNavigation = e.request.mode === 'navigate' ||
    e.request.destination === 'document' ||
    (e.request.mode === 'same-origin' && (url.pathname === '/' || url.pathname === '/index.html'));

  if (isNavigation) {
    // NETWORK-FIRST: свежий HTML после каждого деплоя, кэш только офлайн.
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, clone)).catch(() => {});
          }
          return res;
        })
        .catch(() =>
          caches.match(e.request).then((hit) => hit || caches.match('/index.html'))
        )
    );
    return;
  }

  // Сам Service Worker всегда из сети (иначе «ловушка бутстрапа»:
  // закешированный sw.js не даст браузеру увидеть новую версию).
  if (url.pathname === '/sw.js') {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }

  // Статика: CACHE-FIRST + фоновое обновление (stale-while-revalidate).
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const refresh = fetch(e.request)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, clone)).catch(() => {});
          }
          return res;
        })
        .catch(() => null);
      if (cached) return cached;
      return refresh;
    })
  );
});
