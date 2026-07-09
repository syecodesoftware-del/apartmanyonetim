// Komşu Asistanı — Sakin Portalı service worker
// Kapsam SADECE /portal — personel paneline (money-critical) dokunmaz.
// Strateji: navigasyonlarda network-first + offline cache fallback; statik varlıklarda cache-first.
const CACHE = 'komsu-portal-v1';
const FALLBACK = '/portal';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isPortalNav = req.mode === 'navigate' && url.pathname.startsWith('/portal');
  const isStatic = url.pathname.startsWith('/_next/static') || url.pathname === '/icon.svg' || url.pathname === '/manifest.webmanifest';

  // /portal navigasyonları: network-first, offline'da son önbelleği göster
  if (isPortalNav) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match(FALLBACK))),
    );
    return;
  }

  // Statik varlıklar: cache-first (yalnız portal kabuğu için gereken ortak varlıklar)
  if (isStatic) {
    event.respondWith(
      caches.match(req).then((cached) =>
        cached ||
        fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        }),
      ),
    );
  }
  // Diğer tüm istekler (personel paneli dahil) → dokunma, tarayıcı varsayılanı
});
