const CACHE_NAME = "kulpio-v110";
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

// Tapping an expiry notification focuses an open Kulpio tab, or opens one.
self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.includes("kulpio_app.html") && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow("./kulpio_app.html");
    })
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
          // Never cache an error page over a working copy вЂ” a transient 404/500
          // would otherwise be served forever once offline.
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then(cached => cached || caches.match("./kulpio_app.html")))
    );
    return;
  }

  // Static assets (images, scripts, styles, fonts): cache-first, then
  // network. Only successful (or opaque cross-origin) responses are cached вЂ”
  // a cached 404 would stick forever.
  const dest = event.request.destination;
  if (dest === "image" || dest === "script" || dest === "style" || dest === "font") {
    event.respondWith(
      caches.match(event.request).then(cached =>
        cached || fetch(event.request).then(response => {
          if (response.ok || response.type === "opaque") {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          }
          return response;
        })
      )
    );
    return;
  }

  // API calls (barcode lookups, recipes, random mealsвЂ¦): network-first so
  // results stay live вЂ” cache-first here froze "Surprise me" to one meal and
  // served stale product data. The cache is only a fallback for offline.
  event.respondWith(
    fetch(event.request).then(response => {
      if (response.ok || response.type === "opaque") {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
      }
      return response;
    }).catch(() => caches.match(event.request))
  );
});
