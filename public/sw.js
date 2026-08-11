/* global ALTAIR_SW_POLICY, importScripts */
importScripts("/sw-policy.js");

const {
  ACTIVE_CACHE_NAMES,
  CACHE_NAMES,
  classifyRequest,
  isAltairCacheName,
  isCurrentCacheName,
  isHardRefresh,
  isJsonResponse,
  isSuccessfulResponse,
  isUsableDataPayload,
  markPayloadStale,
} = ALTAIR_SW_POLICY;

const CORE_ASSETS = Object.freeze([
  "/",
  "/offline.html",
  "/site.webmanifest",
]);
const INITIAL_IMAGES = Object.freeze(["/logo-ui.png"]);
const DATA_TIMEOUT_MS = 3_500;
const DOCUMENT_TIMEOUT_MS = 6_000;
const CACHE_WARNING_CODE = "SERVICE_WORKER_CACHE_FALLBACK";

function createJsonResponse(payload, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(payload), { ...init, headers });
}

function createUnavailableResponse(code = "OFFLINE_NO_VALID_CACHE", lastSuccessfulAt = null) {
  const checkedAt = new Date().toISOString();
  return createJsonResponse({
    meta:{
      status:"unavailable",
      reason:"UPSTREAM_UNAVAILABLE",
      checkedAt,
      lastSuccessfulAt,
      retryAfterSeconds:900,
      sourceName:"EML",
      isStale:false,
      warningCode:code,
    },
    data:null,
  }, {
    status:503,
    statusText:"Match Center Unavailable",
    headers:{ "cache-control":"no-store", "retry-after":"900" },
  });
}

async function fetchWithTimeout(request, timeoutMs, init = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(request, { ...init, signal:controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function readUsableDataResponse(response, now = Date.now()) {
  if (!isSuccessfulResponse(response) || !isJsonResponse(response)) return null;
  try {
    const payload = await response.clone().json();
    return isUsableDataPayload(payload, now) ? payload : null;
  } catch {
    return null;
  }
}

async function staleResponseFromCache(response, warningCode = CACHE_WARNING_CODE) {
  const payload = await readUsableDataResponse(response);
  if (!payload) return null;
  return createJsonResponse(markPayloadStale(payload, warningCode), {
    status:200,
    statusText:"OK",
    headers:{
      "cache-control":"no-store",
      "x-altair-cache":"stale",
    },
  });
}

async function validCachedData(cache, request) {
  const cached = await cache.match(request);
  if (!cached) return { response:null, lastSuccessfulAt:null };

  const stale = await staleResponseFromCache(cached);
  if (stale) return { response:stale, lastSuccessfulAt:null };

  let lastSuccessfulAt = null;
  try {
    const payload = await cached.clone().json();
    lastSuccessfulAt = payload?.meta?.lastSuccessfulAt || payload?.meta?.generatedAt || payload?.generatedAt || null;
  } catch { /* invalid cached payload is discarded */ }

  await cache.delete(request);
  return { response:null, lastSuccessfulAt };
}

async function networkFirstData(request) {
  const cache = await caches.open(CACHE_NAMES.data);
  let networkResponse = null;

  try {
    networkResponse = await fetchWithTimeout(request, DATA_TIMEOUT_MS, {
      cache:"no-store",
      headers:{ accept:"application/json" },
    });
    const payload = await readUsableDataResponse(networkResponse);
    if (payload) {
      await cache.put(request, networkResponse.clone());
      return networkResponse;
    }
  } catch {
    networkResponse = null;
  }

  const cached = await validCachedData(cache, request);
  if (cached.response) return cached.response;
  if (networkResponse && !networkResponse.ok) return networkResponse;
  return createUnavailableResponse(
    networkResponse ? "INVALID_OR_EXPIRED_DATA" : "OFFLINE_NO_VALID_CACHE",
    cached.lastSuccessfulAt,
  );
}

async function cacheFirstAsset(request) {
  const cache = await caches.open(CACHE_NAMES.assets);
  if (!isHardRefresh(request)) {
    const cached = await cache.match(request);
    if (cached) return cached;
  }

  try {
    const response = await fetch(request);
    if (isSuccessfulResponse(response)) await cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) || Response.error();
  }
}

async function updateImage(cache, request) {
  const response = await fetch(request, { cache:"no-cache" });
  if (isSuccessfulResponse(response)) await cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidateImage(request, event) {
  const cache = await caches.open(CACHE_NAMES.images);
  if (isHardRefresh(request)) {
    try {
      return await updateImage(cache, request);
    } catch {
      return (await cache.match(request)) || Response.error();
    }
  }

  const cached = await cache.match(request);
  const update = updateImage(cache, request).catch(() => null);
  if (cached) {
    event?.waitUntil?.(update);
    return cached;
  }
  return (await update) || Response.error();
}

async function networkFirstDocument(request) {
  const cache = await caches.open(CACHE_NAMES.shell);
  const fallback = async () => (await cache.match(request, { ignoreSearch:true }))
    || (await cache.match("/"))
    || (await cache.match("/offline.html"))
    || Response.error();

  try {
    const response = await fetchWithTimeout(request, DOCUMENT_TIMEOUT_MS, { cache:"no-cache" });
    const contentType = String(response.headers.get("content-type") || "").toLowerCase();
    if (isSuccessfulResponse(response) && contentType.includes("text/html")) {
      await cache.put(request, response.clone());
    }
    if (response.status >= 500) return fallback();
    return response;
  } catch {
    return fallback();
  }
}

async function networkOnly(request) {
  try {
    return await fetch(request);
  } catch {
    return Response.error();
  }
}

async function deleteOldAltairCaches() {
  const keys = await caches.keys();
  const oldKeys = keys.filter((key) => isAltairCacheName(key) && !isCurrentCacheName(key));
  await Promise.all(oldKeys.map((key) => caches.delete(key)));
  return oldKeys;
}

self.addEventListener("install", (event) => {
  event.waitUntil(Promise.all([
    caches.open(CACHE_NAMES.shell).then((cache) => cache.addAll(CORE_ASSETS)),
    caches.open(CACHE_NAMES.images).then((cache) => cache.addAll(INITIAL_IMAGES)),
  ]));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    deleteOldAltairCaches()
      .then(() => self.clients.claim())
      .then(async () => {
        const clients = await self.clients.matchAll({ type:"window" });
        clients.forEach((client) => client.postMessage({ type:"ALTAIR_SW_ACTIVATED" }));
      }),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "ALTAIR_SW_ACTIVATE") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const strategy = classifyRequest(event.request, self.location.origin);
  if (strategy === "bypass") return;
  if (strategy === "document") event.respondWith(networkFirstDocument(event.request));
  else if (strategy === "data") event.respondWith(networkFirstData(event.request));
  else if (strategy === "asset") event.respondWith(cacheFirstAsset(event.request));
  else if (strategy === "image") event.respondWith(staleWhileRevalidateImage(event.request, event));
  else event.respondWith(networkOnly(event.request));
});

if (self.__ALTAIR_SW_TEST__) {
  self.ALTAIR_SW_TEST_API = Object.freeze({
    ACTIVE_CACHE_NAMES,
    CACHE_NAMES,
    cacheFirstAsset,
    deleteOldAltairCaches,
    fetchWithTimeout,
    networkFirstData,
    networkFirstDocument,
    staleWhileRevalidateImage,
  });
}
