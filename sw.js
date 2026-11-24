// MySheet's service worker (plans/offline-app.md): keeps the last copy of the page so MySheet opens without internet.
// Network first, so an online visit always gets the newest version; the saved copy is used only when the network fails.
// Only MySheet's own files are touched; your data is never here (it lives in the browser's IndexedDB).
const CACHE = 'mysheet-pages';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE).then((cache) => cache.put(request, copy)));
        }
        return response;
      })
      .catch(async () => (await caches.match(request, { ignoreSearch: true })) ?? (await caches.match('./')) ?? Response.error()),
  );
});
