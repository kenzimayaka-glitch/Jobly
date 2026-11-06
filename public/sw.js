const CACHE = "jobly-pwa-v2";
const APP_SHELL = [
  "/",
  "/manifest.webmanifest",
  "/jobly-logo-official-transparent.png",
  "/hero-jobly-community.webp"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(APP_SHELL.map((path) => cache.add(path).catch(() => undefined)))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith("jobly-pwa-") && key !== CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // API, auth and Next data can contain user-specific content: never cache them.
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/") ||
    url.pathname.startsWith("/_next/data/")
  ) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && response.type === "basic") {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put("/", copy));
          }
          return response;
        })
        .catch(async () => (await caches.match("/")) || Response.error())
    );
    return;
  }

  const staticAsset =
    request.destination === "image" ||
    request.destination === "font" ||
    request.destination === "style" ||
    request.destination === "script" ||
    url.pathname.startsWith("/_next/static/") ||
    url.pathname === "/manifest.webmanifest";

  if (!staticAsset) return;

  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      const network = fetch(request)
        .then((response) => {
          if (response.ok && response.type === "basic") {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })()
  );
});
