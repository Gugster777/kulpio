const CACHE_NAME = "kulpio-v6";
const APP_FILES = [
  "./",
  "./index.html",
  "./kulpio_app.html",
  "./manifest.webmanifest",
  "./kulpio-icon.svg"
];

// Precache with {cache:"reload"} so install always pulls fresh files from the
// network instead of the browser's HTTP cache.
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.all(
        APP_FILES.map(url =>
          fetch(new Request(url, {cache: "reload"}))
            .then(res => res.ok ? cache.put(url, res) : null)
            .catch(() => null)
        )
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  // HTML pages: network-first, bypassing the HTTP cache, so a new deploy is
  // always shown. Falls back to cache only when offline.
  if (event.request.mode === "navigate" || event.request.destination === "document") {
    event.respondWith(
      fetch(new Request(event.request.url, {cache: "reload"}))
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request).then(cached => cached || caches.match("./kulpio_app.html")))
    );
    return;
  }

  // Everything else: cache-first, then network.
  event.respondWith(
    caches.match(event.request).then(cached =>
      cached || fetch(event.request).then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      })
    )
  );
});
