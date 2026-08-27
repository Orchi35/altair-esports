(function exposeAltairServiceWorkerPolicy(scope) {
  "use strict";

  const RELEASE_VERSION = "2026.08.27.1";
  const CACHE_PREFIX = "altair-";
  const CACHE_NAMES = Object.freeze({
    shell:`${CACHE_PREFIX}shell-${RELEASE_VERSION}`,
    assets:`${CACHE_PREFIX}assets-${RELEASE_VERSION}`,
    images:`${CACHE_PREFIX}images-${RELEASE_VERSION}`,
    data:`${CACHE_PREFIX}data-${RELEASE_VERSION}`,
  });
  const ACTIVE_CACHE_NAMES = Object.freeze(Object.values(CACHE_NAMES));
  const DATA_STATUSES = Object.freeze([
    "fresh",
    "stale",
    "empty",
    "season-ended",
  ]);
  const HASHED_ASSET_PATTERN = /-[a-z0-9_-]{6,}\.(?:css|js|mjs|woff2?|ttf|otf)$/i;
  const IMAGE_PATTERN = /\.(?:avif|gif|jpe?g|png|svg|webp)$/i;

  function isAltairCacheName(name) {
    return typeof name === "string" && name.startsWith(CACHE_PREFIX);
  }

  function isCurrentCacheName(name) {
    return ACTIVE_CACHE_NAMES.includes(name);
  }

  function isSuccessfulResponse(response) {
    return Boolean(
      response
      && response.ok
      && response.status >= 200
      && response.status < 300
      && response.type !== "opaque",
    );
  }

  function isJsonResponse(response) {
    const contentType = String(response?.headers?.get?.("content-type") || "").toLowerCase();
    return contentType.includes("application/json") || contentType.includes("+json");
  }

  function isHardRefresh(request) {
    return request?.cache === "reload" || request?.cache === "no-cache";
  }

  function classifyRequest(request, origin) {
    if (!request || request.method !== "GET") return "bypass";

    const url = new URL(request.url, origin);
    if (url.origin !== origin || url.pathname.startsWith("/_vercel/")) return "bypass";
    if (request.mode === "navigate" || request.destination === "document") return "document";
    if (url.pathname === "/api/match-center" || url.pathname.startsWith("/data/")) return "data";
    if (url.pathname.startsWith("/assets/") && HASHED_ASSET_PATTERN.test(url.pathname)) return "asset";
    if (request.destination === "image" || IMAGE_PATTERN.test(url.pathname)) return "image";
    return "network";
  }

  function getPayloadValidity(payload) {
    if (!payload || typeof payload !== "object") return null;
    const meta = payload.meta && typeof payload.meta === "object" ? payload.meta : null;
    if (meta && !DATA_STATUSES.includes(meta.status)) return null;

    const validFrom = meta?.validFrom ?? payload.validFrom ?? null;
    const validUntil = meta?.validUntil ?? payload.validUntil ?? null;
    const validFromTime = validFrom === null ? null : Date.parse(validFrom);
    const validUntilTime = Date.parse(validUntil);

    if (!Number.isFinite(validUntilTime)) return null;
    if (validFrom !== null && !Number.isFinite(validFromTime)) return null;
    return { validFromTime, validUntilTime };
  }

  function isUsableDataPayload(payload, now = Date.now()) {
    const validity = getPayloadValidity(payload);
    if (!validity || !Number.isFinite(now)) return false;
    if (validity.validFromTime !== null && now < validity.validFromTime) return false;
    return now < validity.validUntilTime;
  }

  function markPayloadStale(payload, warningCode) {
    if (!payload || typeof payload !== "object") return payload;

    if (payload.meta && typeof payload.meta === "object") {
      return {
        ...payload,
        meta:{
          ...payload.meta,
          status:"stale",
          isStale:true,
          lastSuccessfulAt:payload.meta.lastSuccessfulAt || payload.meta.generatedAt || null,
          upstreamWarningCode:payload.meta.warningCode || null,
          warningCode,
        },
      };
    }

    return {
      ...payload,
      isStale:true,
      lastSuccessfulAt:payload.lastSuccessfulAt || payload.generatedAt || null,
      warningCode,
    };
  }

  scope.ALTAIR_SW_POLICY = Object.freeze({
    ACTIVE_CACHE_NAMES,
    CACHE_NAMES,
    CACHE_PREFIX,
    RELEASE_VERSION,
    classifyRequest,
    isAltairCacheName,
    isCurrentCacheName,
    isHardRefresh,
    isJsonResponse,
    isSuccessfulResponse,
    isUsableDataPayload,
    markPayloadStale,
  });
}(globalThis));
