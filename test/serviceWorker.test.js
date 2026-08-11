import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, test } from "node:test";
import vm from "node:vm";

const ORIGIN = "https://www.altairesports.com";
const POLICY_SOURCE = await readFile(new URL("../public/sw-policy.js", import.meta.url), "utf8");
const WORKER_SOURCE = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");

function requestKey(request) {
  const value = typeof request === "string" ? request : request.url;
  return new URL(value, ORIGIN).href;
}

class MemoryCache {
  constructor(fetcher) {
    this.fetcher = fetcher;
    this.entries = new Map();
  }

  async addAll(requests) {
    for (const request of requests) {
      const response = await this.fetcher(request);
      if (!response.ok) throw new Error(`Unable to precache ${request}`);
      await this.put(request, response);
    }
  }

  async delete(request) {
    return this.entries.delete(requestKey(request));
  }

  async match(request, options = {}) {
    const key = requestKey(request);
    const direct = this.entries.get(key);
    if (direct) return direct.clone();
    if (!options.ignoreSearch) return undefined;

    const url = new URL(key);
    for (const [candidate, response] of this.entries) {
      const candidateUrl = new URL(candidate);
      if (candidateUrl.origin === url.origin && candidateUrl.pathname === url.pathname) return response.clone();
    }
    return undefined;
  }

  async put(request, response) {
    this.entries.set(requestKey(request), response.clone());
  }
}

class MemoryCacheStorage {
  constructor(fetcher) {
    this.fetcher = fetcher;
    this.stores = new Map();
  }

  async delete(name) {
    return this.stores.delete(name);
  }

  async keys() {
    return [...this.stores.keys()];
  }

  async match(request, options) {
    for (const cache of this.stores.values()) {
      const response = await cache.match(request, options);
      if (response) return response;
    }
    return undefined;
  }

  async open(name) {
    if (!this.stores.has(name)) this.stores.set(name, new MemoryCache(this.fetcher));
    return this.stores.get(name);
  }
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers:{ "content-type":"application/json; charset=utf-8" },
  });
}

function matchCenterEnvelope({ validUntil = "2999-08-11T08:30:00.000Z", status = "fresh" } = {}) {
  return {
    meta:{
      status,
      generatedAt:"2026-08-10T08:30:00.000Z",
      fetchedAt:"2026-08-10T08:30:00.000Z",
      lastSuccessfulAt:"2026-08-10T08:30:00.000Z",
      validUntil,
      isStale:status === "stale",
      warningCode:null,
    },
    data:{ recentResults:[], upcomingFixtures:[], standings:[] },
  };
}

function createWorkerHarness(initialFetch) {
  const listeners = new Map();
  let fetchImplementation = initialFetch;
  let skipWaitingCalls = 0;
  const postedMessages = [];

  const context = {
    AbortController,
    Date,
    Headers,
    Object,
    Promise,
    Request,
    Response,
    URL,
    clearTimeout,
    console,
    fetch:(...args) => fetchImplementation(...args),
    setTimeout,
  };
  context.globalThis = context;
  context.__ALTAIR_SW_TEST__ = true;
  context.location = { origin:ORIGIN };
  context.addEventListener = (type, handler) => listeners.set(type, handler);
  context.clients = {
    claim:async () => undefined,
    matchAll:async () => [{ postMessage:(message) => postedMessages.push(message) }],
  };
  context.skipWaiting = () => {
    skipWaitingCalls += 1;
    return Promise.resolve();
  };
  context.self = context;
  context.caches = new MemoryCacheStorage((...args) => context.fetch(...args));

  vm.createContext(context);
  context.importScripts = () => vm.runInContext(POLICY_SOURCE, context, { filename:"sw-policy.js" });
  vm.runInContext(WORKER_SOURCE, context, { filename:"sw.js" });

  return {
    caches:context.caches,
    context,
    listeners,
    postedMessages,
    policy:context.ALTAIR_SW_POLICY,
    setFetch(nextFetch) {
      fetchImplementation = nextFetch;
    },
    skipWaitingCalls:() => skipWaitingCalls,
    worker:context.ALTAIR_SW_TEST_API,
  };
}

describe("service worker veri cache stratejisi", () => {
  test("online fresh veri ağdan gelir ve doğrulanmış cache'e yazılır", async () => {
    let networkCalls = 0;
    const harness = createWorkerHarness(async () => {
      networkCalls += 1;
      return jsonResponse(matchCenterEnvelope());
    });
    const request = new Request(`${ORIGIN}/api/match-center`);
    const cache = await harness.caches.open(harness.worker.CACHE_NAMES.data);
    await cache.put(request, jsonResponse(matchCenterEnvelope({ status:"stale" })));

    const response = await harness.worker.networkFirstData(request);
    const cached = await cache.match(request);

    assert.equal(networkCalls, 1);
    assert.equal((await response.json()).meta.status, "fresh");
    assert.equal((await cached.json()).meta.status, "fresh");
  });

  test("geçerli /data snapshot cache'i tarihleri korunarak stale işaretlenir", async () => {
    const harness = createWorkerHarness(async () => {
      throw new TypeError("offline");
    });
    const request = new Request(`${ORIGIN}/data/eml-snapshot.json`);
    const cache = await harness.caches.open(harness.worker.CACHE_NAMES.data);
    await cache.put(request, jsonResponse({
      generatedAt:"2026-08-10T08:30:00.000Z",
      validFrom:"2026-08-10T08:30:00.000Z",
      validUntil:"2999-08-11T08:30:00.000Z",
      standings:{},
      fixtures:{},
    }));

    const payload = await (await harness.worker.networkFirstData(request)).json();

    assert.equal(payload.isStale, true);
    assert.equal(payload.lastSuccessfulAt, "2026-08-10T08:30:00.000Z");
    assert.equal(payload.validUntil, "2999-08-11T08:30:00.000Z");
  });

  test("offline durumda geçerli cache stale olarak ve son güncelleme korunarak döner", async () => {
    const harness = createWorkerHarness(async () => {
      throw new TypeError("offline");
    });
    const request = new Request(`${ORIGIN}/api/match-center`);
    const cache = await harness.caches.open(harness.worker.CACHE_NAMES.data);
    await cache.put(request, jsonResponse(matchCenterEnvelope()));

    const payload = await (await harness.worker.networkFirstData(request)).json();

    assert.equal(payload.meta.status, "stale");
    assert.equal(payload.meta.isStale, true);
    assert.equal(payload.meta.lastSuccessfulAt, "2026-08-10T08:30:00.000Z");
    assert.equal(payload.meta.warningCode, "SERVICE_WORKER_CACHE_FALLBACK");
  });

  test("offline durumda süresi geçmiş cache silinir ve 503 döner", async () => {
    const harness = createWorkerHarness(async () => {
      throw new TypeError("offline");
    });
    const request = new Request(`${ORIGIN}/api/match-center`);
    const cache = await harness.caches.open(harness.worker.CACHE_NAMES.data);
    await cache.put(request, jsonResponse(matchCenterEnvelope({ validUntil:"2000-01-01T00:00:00.000Z" })));

    const response = await harness.worker.networkFirstData(request);

    assert.equal(response.status, 503);
    const payload = await response.json();
    assert.equal(payload.meta.status, "unavailable");
    assert.equal(payload.meta.warningCode, "OFFLINE_NO_VALID_CACHE");
    assert.equal(payload.data, null);
    assert.equal(response.headers.get("retry-after"), "900");
    assert.equal(await cache.match(request), undefined);
  });

  test("API 500 verirse geçerli cache kullanılır; cache yoksa 500 korunur", async () => {
    const request = new Request(`${ORIGIN}/api/match-center`);
    const harness = createWorkerHarness(async () => jsonResponse({ error:"upstream" }, 500));
    const cache = await harness.caches.open(harness.worker.CACHE_NAMES.data);
    await cache.put(request, jsonResponse(matchCenterEnvelope()));

    const cachedResponse = await harness.worker.networkFirstData(request);
    assert.equal(cachedResponse.status, 200);
    assert.equal((await cachedResponse.json()).meta.status, "stale");

    await cache.delete(request);
    const errorResponse = await harness.worker.networkFirstData(request);
    assert.equal(errorResponse.status, 500);
    assert.equal(await cache.match(request), undefined);
  });

  test("hatalı content type ve 4xx cevaplar cache'e yazılmaz", async () => {
    const request = new Request(`${ORIGIN}/api/match-center`);
    const harness = createWorkerHarness(async () => new Response("not json", {
      status:200,
      headers:{ "content-type":"text/html" },
    }));
    const response = await harness.worker.networkFirstData(request);
    assert.equal(response.status, 503);

    harness.setFetch(async () => jsonResponse({ error:"denied" }, 403));
    const forbidden = await harness.worker.networkFirstData(request);
    const cache = await harness.caches.open(harness.worker.CACHE_NAMES.data);
    assert.equal(forbidden.status, 403);
    assert.equal(await cache.match(request), undefined);
  });
});

describe("service worker yaşam döngüsü ve yönlendirme", () => {
  test("yalnızca eski ALTAIR cache'leri silinir", async () => {
    const harness = createWorkerHarness(async () => new Response("ok"));
    await harness.caches.open("altair-shell-v1");
    await harness.caches.open("altair-data-v1");
    await harness.caches.open("third-party-cache-v1");
    await harness.caches.open(harness.worker.CACHE_NAMES.shell);

    const deleted = await harness.worker.deleteOldAltairCaches();
    const remaining = await harness.caches.keys();

    assert.deepEqual([...deleted].sort(), ["altair-data-v1", "altair-shell-v1"]);
    assert.ok(remaining.includes("third-party-cache-v1"));
    assert.ok(remaining.includes(harness.worker.CACHE_NAMES.shell));
  });

  test("worker install sırasında zorla aktive olmaz, yalnızca kullanıcı mesajıyla aktive olur", async () => {
    const harness = createWorkerHarness(async (request) => {
      const isManifest = String(request).endsWith(".webmanifest");
      return new Response(isManifest ? "{}" : "<!doctype html>", {
        status:200,
        headers:{ "content-type":isManifest ? "application/manifest+json" : "text/html" },
      });
    });
    let installPromise;
    harness.listeners.get("install")({ waitUntil:(promise) => { installPromise = promise; } });
    await installPromise;
    assert.equal(harness.skipWaitingCalls(), 0);

    harness.listeners.get("message")({ data:{ type:"ALTAIR_SW_ACTIVATE" } });
    assert.equal(harness.skipWaitingCalls(), 1);
  });

  test("ağ isteği belirlenen kısa sürede iptal edilir", async () => {
    const harness = createWorkerHarness((request, init) => new Promise((resolve, reject) => {
      init.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    }));

    await assert.rejects(
      harness.worker.fetchWithTimeout(new Request(`${ORIGIN}/api/match-center`), 5),
      { name:"AbortError" },
    );
  });

  test("navigation 500 durumunda doğrulanmış uygulama kabuğuna döner", async () => {
    const harness = createWorkerHarness(async () => new Response("server error", { status:500 }));
    const request = new Request(`${ORIGIN}/`, { headers:{ accept:"text/html" } });
    const cache = await harness.caches.open(harness.worker.CACHE_NAMES.shell);
    await cache.put("/", new Response("offline shell", {
      status:200,
      headers:{ "content-type":"text/html" },
    }));

    const response = await harness.worker.networkFirstDocument(request);
    assert.equal(await response.text(), "offline shell");
  });

  test("hard refresh hashli asset cache'ini ağdan yeniler", async () => {
    let networkCalls = 0;
    const harness = createWorkerHarness(async () => {
      networkCalls += 1;
      return new Response("new bundle", { status:200 });
    });
    const request = new Request(`${ORIGIN}/assets/index-ABC12345.js`, { cache:"reload" });
    const cache = await harness.caches.open(harness.worker.CACHE_NAMES.assets);
    await cache.put(request, new Response("old bundle", { status:200 }));

    const response = await harness.worker.cacheFirstAsset(request);

    assert.equal(networkCalls, 1);
    assert.equal(await response.text(), "new bundle");
    assert.equal(await (await cache.match(request)).text(), "new bundle");
  });

  test("mobil görsel isteği image stratejisine, Match Center data stratejisine yönlenir", () => {
    const harness = createWorkerHarness(async () => new Response("ok"));
    assert.equal(harness.policy.classifyRequest({
      method:"GET",
      mode:"cors",
      destination:"image",
      url:`${ORIGIN}/players/altair-player.webp`,
    }, ORIGIN), "image");
    assert.equal(harness.policy.classifyRequest({
      method:"GET",
      mode:"cors",
      destination:"",
      url:`${ORIGIN}/api/match-center?locale=tr`,
    }, ORIGIN), "data");
  });
});
