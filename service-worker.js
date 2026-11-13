const CACHE_NAME = "billmaster-shell-v104";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css?v=20261105-task-1",
  "./billmaster-config.js?v=20260601-1",
  "./app.js?v=20261113-push-1",
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
        Promise.all(keys.filter((key) => key.startsWith("billmaster-shell-") && key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  const shellUrls = new Set(APP_SHELL.map((asset) => new URL(asset, self.registration.scope).href));
  const isShell = shellUrls.has(url.href);
  const localPreview = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  const isVersionedAsset = isShell && url.searchParams.has("v") && !localPreview;
  event.respondWith((async () => {
    let cache;
    try { cache = await caches.open(CACHE_NAME); } catch { /* Private/full storage must not block the network. */ }
    const cachedResponse = async (key) => {
      try { return await cache?.match(key); } catch { return undefined; }
    };
    if (isVersionedAsset) {
      const cached = await cachedResponse(request);
      if (cached) return cached;
    }
    try {
      const response = await fetch(request);
      if (cache && isShell && response.ok && response.type === "basic") {
        try { await cache.put(request, response.clone()); } catch { /* A full cache must not break a valid response. */ }
      }
      return response;
    } catch {
      const cached = await cachedResponse(request);
      if (cached) return cached;
      if (request.mode === "navigate") return (await cachedResponse("./index.html")) || Response.error();
      return Response.error();
    }
  })());
});

self.addEventListener("push", (event) => {
  // Keep financial and task details off the device lock screen.
  event.waitUntil(self.registration.showNotification("BillMaster reminder", {
    body: "Open your Review Inbox to see your reminders.",
    icon: new URL("billmaster-icon-192.png", self.registration.scope).href,
    data: { kind: "billmaster-reminder" }
  }));
});

self.addEventListener("notificationclick", (event) => {
  if (event.notification.data?.kind !== "billmaster-reminder") return;
  event.notification.close();
  const inbox = new URL("index.html#inbox", self.registration.scope);
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window" });
    const existing = windows.find(client => {
      const url = new URL(client.url);
      return url.origin === inbox.origin && url.pathname === inbox.pathname;
    });
    if (existing) {
      const target = await existing.navigate(inbox.href);
      if (target) return target.focus();
    }
    return self.clients.openWindow(inbox.href);
  })());
});
