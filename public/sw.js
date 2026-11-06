const CACHE = "jobly-pwa-v3";
const APP_SHELL = [
  "/",
  "/offline",
  "/manifest.webmanifest",
  "/jobly-logo-official-transparent.png",
  "/hero-jobly-community.webp"
];

async function precacheOfflineWorkspace(cache) {
  try {
    const response = await fetch("/offline", { cache: "reload", credentials: "same-origin" });
    if (!response.ok) return;
    const copy = response.clone();
    await cache.put("/offline", copy);
    const html = await response.text();
    const assets = new Set();
    for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
      if (!match[1].includes("/_next/static/")) continue;
      try {
        const url = new URL(match[1], self.location.origin);
        if (url.origin === self.location.origin) assets.add(url.href);
      } catch {}
    }
    await Promise.all([...assets].map((asset) => cache.add(asset).catch(() => undefined)));
  } catch {}
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(APP_SHELL.map((path) => cache.add(path).catch(() => undefined)));
    await precacheOfflineWorkspace(cache);
  })());
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
    event.respondWith((async () => {
      if (url.pathname === "/offline") {
        const cached = await caches.match("/offline");
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put("/offline", copy));
          }
          return response;
        } catch {
          return Response.error();
        }
      }

      try {
        const response = await fetch(request);
        // Only the public homepage is stored as a navigable HTML document.
        // Never cache a private dashboard/profile route under the root key.
        if (url.pathname === "/" && response.ok && response.type === "basic") {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put("/", copy));
        }
        return response;
      } catch {
        return Response.redirect(new URL("/offline", self.location.origin).href, 302);
      }
    })());
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
