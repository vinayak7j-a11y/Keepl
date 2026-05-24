const CACHE_NAME = "keepl-v2";

const STATIC_ASSETS = [
  "/",
  "/keepl.css",
  "/manifest.json"
];

// Install — cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch — never cache dynamic pages, only static assets
self.addEventListener("fetch", (event) => {

  const url = new URL(event.request.url);

  if (event.request.method !== "GET" || url.pathname.includes("/api/")) {
    return;
  }

  const neverCache = [
    "/dashboard",
    "/customers",
    "/analytics",
    "/scan",
    "/poster",
    "/login",
    "/register",
    "/shop"
  ];

  if (neverCache.some(path => url.pathname.startsWith(path))) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, clone);
        });
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
