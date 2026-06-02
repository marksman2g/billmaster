const CACHE_NAME = "billmaster-shell-v33";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./billmaster-config.js",
  "./app.js",
  "./manifest.json",
  "./billmaster-icon-192.png",
  "./billmaster-icon-512.png",
  "./billmaster-icon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const sameOrigin = new URL(request.url).origin === self.location.origin;
        if (sameOrigin && response.status === 200 && response.type === "basic") {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => {
        if (request.mode === "navigate") return caches.match("./index.html");
        return caches.match(request).then((cached) => cached || Response.error());
      })
  );
});
