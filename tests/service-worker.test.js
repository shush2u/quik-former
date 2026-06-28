import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { expect, test } from "vitest";

const serviceWorkerSource = await readFile(
  new URL("../public/sw.js", import.meta.url),
  "utf8",
);

function cacheKey(request) {
  return typeof request === "string" ? request : request.url;
}

function createServiceWorkerHarness({
  indexStatus = 200,
  addAllError,
  cacheNames = [],
  cachedResponses = new Map(),
  fetchImplementation,
} = {}) {
  const listeners = new Map();
  const cacheOperations = [];
  const cachedAssets = [];
  const clientClaims = [];
  const deletedCaches = [];
  const fetchCalls = [];
  const openedCaches = [];
  const storedResponses = [];
  const cache = {
    async addAll(assets) {
      cacheOperations.push("addAll");
      cachedAssets.push(...assets);
      if (addAllError) throw addAllError;
    },
    async put(request, response) {
      cacheOperations.push(`put:${cacheKey(request)}`);
      storedResponses.push({ request, response });
    },
    async match(request) {
      return cachedResponses.get(cacheKey(request));
    },
  };

  vm.runInNewContext(serviceWorkerSource, {
    URL,
    caches: {
      async delete(cacheName) {
        cacheOperations.push(`delete:${cacheName}`);
        deletedCaches.push(cacheName);
      },
      async keys() {
        return cacheNames;
      },
      async match(request) {
        return cachedResponses.get(cacheKey(request));
      },
      async open(cacheName) {
        cacheOperations.push(`open:${cacheName}`);
        openedCaches.push(cacheName);
        return cache;
      },
    },
    fetch: async (input, init) => {
      fetchCalls.push({ input, init });
      if (fetchImplementation) {
        return fetchImplementation(input, init);
      }
      return new Response(
        [
          '<script src="/assets/app.js"></script>',
          '<link rel="stylesheet" href="/assets/app.css" />',
          '<link rel="canonical" href="/builder" />',
          '<img src="/assets/logo.svg" />',
        ].join(""),
        { status: indexStatus },
      );
    },
    Response,
    self: {
      addEventListener(type, listener) {
        listeners.set(type, listener);
      },
      clients: {
        async claim() {
          cacheOperations.push("claim");
          clientClaims.push(true);
        },
      },
      location: { origin: "https://quik-former.test" },
      skipWaiting() {},
    },
  });

  return {
    cacheOperations,
    cachedAssets,
    clientClaims,
    deletedCaches,
    fetchCalls,
    openedCaches,
    storedResponses,
    install() {
      let installation;
      listeners.get("install")({
        waitUntil(promise) {
          installation = promise;
        },
      });
      return installation;
    },
    activate() {
      let activation;
      listeners.get("activate")({
        waitUntil(promise) {
          activation = promise;
        },
      });
      return activation;
    },
    dispatchFetch(request) {
      let response;
      listeners.get("fetch")({
        request,
        respondWith(value) {
          response = Promise.resolve(value);
        },
      });
      return { handled: response !== undefined, response };
    },
  };
}

function createRequest(
  path,
  { method = "GET", mode = "cors", destination = "", accept = "" } = {},
) {
  return {
    destination,
    headers: {
      get(name) {
        return name.toLowerCase() === "accept" ? accept : null;
      },
    },
    method,
    mode,
    url: new URL(path, "https://quik-former.test").href,
  };
}

test("fails installation when a required app-shell asset cannot be cached", async () => {
  const expectedError = new Error("asset unavailable");
  const harness = createServiceWorkerHarness({ addAllError: expectedError });

  await expect(harness.install()).rejects.toBe(expectedError);
  expect(harness.storedResponses).toHaveLength(0);
});

test("fails installation when index.html cannot be fetched", async () => {
  const harness = createServiceWorkerHarness({ indexStatus: 503 });

  await expect(harness.install()).rejects.toThrow(
    "App shell request failed with 503",
  );
  expect(harness.cachedAssets).toHaveLength(0);
});

test("caches required and discovered assets before storing index.html", async () => {
  const harness = createServiceWorkerHarness();

  await harness.install();

  expect(harness.cachedAssets).toEqual([
    "/manifest.webmanifest",
    "/favicon.svg",
    "/icon-192.png",
    "/icon-512.png",
    "/assets/app.js",
    "/assets/app.css",
  ]);
  expect(harness.storedResponses).toHaveLength(1);
  expect(harness.storedResponses[0].request).toBe("/index.html");
  expect(harness.openedCaches).toEqual(["quik-former-app-shell-v3"]);
  expect(harness.cacheOperations).toEqual([
    "open:quik-former-app-shell-v3",
    "addAll",
    "put:/index.html",
  ]);
});

test("fetches index.html without using the HTTP cache during installation", async () => {
  const harness = createServiceWorkerHarness();

  await harness.install();

  expect(harness.fetchCalls).toEqual([
    { input: "/index.html", init: { cache: "no-cache" } },
  ]);
});

test("deletes obsolete Quik Former caches before claiming clients", async () => {
  const harness = createServiceWorkerHarness({
    cacheNames: [
      "quik-former-app-shell-v1",
      "quik-former-app-shell-v2",
      "quik-former-app-shell-v3",
      "unrelated-cache",
    ],
  });

  await harness.activate();

  expect(harness.deletedCaches).toEqual([
    "quik-former-app-shell-v1",
    "quik-former-app-shell-v2",
  ]);
  expect(harness.clientClaims).toHaveLength(1);
  expect(harness.cacheOperations).toEqual([
    "delete:quik-former-app-shell-v1",
    "delete:quik-former-app-shell-v2",
    "claim",
  ]);
});

test("serves navigation from the network and refreshes the offline shell", async () => {
  const networkResponse = new Response("fresh shell");
  const harness = createServiceWorkerHarness({
    fetchImplementation: async () => networkResponse,
  });
  const request = createRequest("/responses", { mode: "navigate" });

  const event = harness.dispatchFetch(request);

  await expect(event.response).resolves.toBe(networkResponse);
  expect(event.handled).toBe(true);
  expect(harness.fetchCalls).toEqual([{ input: request, init: undefined }]);
  expect(harness.storedResponses).toHaveLength(1);
  expect(harness.storedResponses[0].request).toBe("/index.html");
});

test("falls back to the cached app shell when navigation is offline", async () => {
  const cachedShell = new Response("cached shell");
  const harness = createServiceWorkerHarness({
    cachedResponses: new Map([["/index.html", cachedShell]]),
    fetchImplementation: async () => {
      throw new TypeError("offline");
    },
  });

  const event = harness.dispatchFetch(
    createRequest("/responses", { mode: "navigate" }),
  );

  await expect(event.response).resolves.toBe(cachedShell);
});

test("serves static assets from the cache without a network request", async () => {
  const request = createRequest("/assets/app.js", { destination: "script" });
  const cachedAsset = new Response("cached asset");
  const harness = createServiceWorkerHarness({
    cachedResponses: new Map([[request.url, cachedAsset]]),
  });

  const event = harness.dispatchFetch(request);

  await expect(event.response).resolves.toBe(cachedAsset);
  expect(harness.fetchCalls).toHaveLength(0);
});

test.each([
  ["images", "/icon-192.png", "image"],
  ["fonts", "/assets/app.woff2", "font"],
  ["manifests", "/manifest.webmanifest", "manifest"],
  ["destinationless build assets", "/assets/chunk.wasm", ""],
])("handles %s with the static cache strategy", async (_, path, destination) => {
  const request = createRequest(path, { destination });
  const cachedAsset = new Response("cached asset");
  const harness = createServiceWorkerHarness({
    cachedResponses: new Map([[request.url, cachedAsset]]),
  });

  const event = harness.dispatchFetch(request);

  expect(event.handled).toBe(true);
  await expect(event.response).resolves.toBe(cachedAsset);
});

test("caches a successful network response for a missing static asset", async () => {
  const request = createRequest("/assets/app.css", { destination: "style" });
  const networkResponse = new Response("fresh asset");
  const harness = createServiceWorkerHarness({
    fetchImplementation: async () => networkResponse,
  });

  const event = harness.dispatchFetch(request);

  await expect(event.response).resolves.toBe(networkResponse);
  expect(harness.storedResponses).toHaveLength(1);
  expect(harness.storedResponses[0].request).toBe(request);
});

test("does not cache an unsuccessful static-asset response", async () => {
  const request = createRequest("/assets/app.css", { destination: "style" });
  const networkResponse = new Response("unavailable", { status: 503 });
  const harness = createServiceWorkerHarness({
    fetchImplementation: async () => networkResponse,
  });

  const event = harness.dispatchFetch(request);

  await expect(event.response).resolves.toBe(networkResponse);
  expect(harness.storedResponses).toHaveLength(0);
});

test("does not intercept cross-origin, non-GET, or form-data requests", () => {
  const harness = createServiceWorkerHarness();
  const requests = [
    createRequest("https://cdn.example.com/app.js", { destination: "script" }),
    createRequest("/assets/app.js", { method: "POST", destination: "script" }),
    createRequest("/forms/123.json"),
  ];

  for (const request of requests) {
    expect(harness.dispatchFetch(request).handled).toBe(false);
  }
});
