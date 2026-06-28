const APP_CACHE = "quik-former-app-shell-v3";
const STATIC_ASSETS = [
  "/manifest.webmanifest",
  "/favicon.svg",
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(cacheAppShell());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => cacheName.startsWith("quik-former-"))
            .filter((cacheName) => cacheName !== APP_CACHE)
            .map((cacheName) => caches.delete(cacheName)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const requestUrl = new URL(request.url);

  if (request.method !== "GET" || requestUrl.origin !== self.location.origin) {
    return;
  }

  if (isNavigationRequest(request)) {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (isStaticAssetRequest(request, requestUrl)) {
    event.respondWith(cacheFirst(request));
  }
});

async function cacheAppShell() {
  const cache = await caches.open(APP_CACHE);
  const indexResponse = await fetch("/index.html", { cache: "no-cache" });

  if (!indexResponse.ok) {
    throw new Error(`App shell request failed with ${indexResponse.status}`);
  }

  const html = await indexResponse.clone().text();
  const buildAssets = findSameOriginBuildAssets(html);
  const requiredAssets = [...new Set([...STATIC_ASSETS, ...buildAssets])];

  await cache.addAll(requiredAssets);
  await cache.put("/index.html", indexResponse);
}

function findSameOriginBuildAssets(html) {
  const assets = new Set();
  const assetPattern = /\b(?:href|src)="([^"]+)"/g;
  let match = assetPattern.exec(html);

  while (match) {
    const assetUrl = new URL(match[1], self.location.origin);

    if (
      assetUrl.origin === self.location.origin &&
      assetUrl.pathname.startsWith("/assets/") &&
      /\.(?:css|js)$/.test(assetUrl.pathname)
    ) {
      assets.add(assetUrl.pathname);
    }

    match = assetPattern.exec(html);
  }

  return [...assets];
}

function isNavigationRequest(request) {
  return (
    request.mode === "navigate" ||
    request.headers.get("accept")?.includes("text/html")
  );
}

function isStaticAssetRequest(request, requestUrl) {
  return (
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "image" ||
    request.destination === "font" ||
    request.destination === "manifest" ||
    requestUrl.pathname.startsWith("/assets/")
  );
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(APP_CACHE);

  try {
    const response = await fetch(request);

    if (response.ok) {
      await cache.put("/index.html", response.clone());
    }

    return response;
  } catch {
    return (await cache.match("/index.html")) ?? Response.error();
  }
}

async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  const response = await fetch(request);

  if (response.ok) {
    const cache = await caches.open(APP_CACHE);
    await cache.put(request, response.clone());
  }

  return response;
}
