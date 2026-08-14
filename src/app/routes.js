export const DEFAULT_LOCALE = "tr";
export const LOCALE_STORAGE_KEY = "altair.locale";
export const SUPPORTED_LOCALES = Object.freeze(["tr", "en"]);

export const ROUTE_DEFINITIONS = Object.freeze([
  { name:"home", paths:{ tr:[], en:[] }, sectionId:"top" },
  { name:"matches", paths:{ tr:["maclar"], en:["matches"] }, sectionId:"match-center" },
  { name:"match-detail", paths:{ tr:["maclar", ":slug"], en:["matches", ":slug"] }, sectionId:"match-center", detail:true },
  { name:"squad", paths:{ tr:["kadro"], en:["squad"] }, sectionId:"squad" },
  { name:"player-detail", paths:{ tr:["oyuncular", ":slug"], en:["players", ":slug"] }, sectionId:"squad", detail:true },
  { name:"news", paths:{ tr:["haberler"], en:["news"] }, sectionId:"updates" },
  { name:"news-detail", paths:{ tr:["haberler", ":slug"], en:["news", ":slug"] }, sectionId:"updates", detail:true },
  { name:"honours", paths:{ tr:["basarilar"], en:["honours"] }, sectionId:"honours" },
  { name:"partnerships", paths:{ tr:["partnerlik"], en:["partnerships"] }, sectionId:"sponsors" },
]);

const ROUTE_BY_NAME = new Map(ROUTE_DEFINITIONS.map((route) => [route.name, route]));
const TAB_HASHES = new Set(["#results", "#fixtures", "#standings"]);
const HOME_HASHES = new Set(["#jersey", "#identity", "#broadcast", "#main-content", "#hero-countdown"]);

const LEGACY_HASH_TARGETS = Object.freeze({
  "#top":{ routeName:"home", hash:"" },
  "#match-center":{ routeName:"matches", hash:"" },
  "#matches":{ routeName:"matches", hash:"#results" },
  "#results":{ routeName:"matches", hash:"#results" },
  "#fixtures":{ routeName:"matches", hash:"#fixtures" },
  "#standings":{ routeName:"matches", hash:"#standings" },
  "#jersey":{ routeName:"home", hash:"#jersey" },
  "#updates":{ routeName:"news", hash:"" },
  "#squad":{ routeName:"squad", hash:"" },
  "#identity":{ routeName:"home", hash:"#identity" },
  "#honours":{ routeName:"honours", hash:"" },
  "#sponsors":{ routeName:"partnerships", hash:"" },
  "#broadcast":{ routeName:"home", hash:"#broadcast" },
});

export function normalizeLocale(value) {
  const locale = String(value || "").trim().toLowerCase().split("-")[0];
  return SUPPORTED_LOCALES.includes(locale) ? locale : null;
}

export function localeToLangCode(locale) {
  return normalizeLocale(locale) === "tr" ? "TR" : "EN";
}

export function readStoredLocale(storage) {
  try {
    return normalizeLocale(storage?.getItem?.(LOCALE_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function rememberLocale(storage, locale) {
  const normalized = normalizeLocale(locale);
  if (!normalized) return false;
  try {
    storage?.setItem?.(LOCALE_STORAGE_KEY, normalized);
    return true;
  } catch {
    return false;
  }
}

export function getPreferredLocale({ storage, navigatorLanguage } = {}) {
  return readStoredLocale(storage) || normalizeLocale(navigatorLanguage) || DEFAULT_LOCALE;
}

export function getLocaleFromPath(pathname) {
  const firstSegment = String(pathname || "/").split("/").filter(Boolean)[0];
  return normalizeLocale(firstSegment);
}

function safeDecodeSegment(segment) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

function normalizePathname(pathname) {
  const path = String(pathname || "/").split("?")[0].replace(/\/{2,}/g, "/");
  if (path === "/") return path;
  return `/${path.split("/").filter(Boolean).join("/")}`;
}

function matchRouteSegments(pattern, segments) {
  if (pattern.length !== segments.length) return null;
  let slug = null;
  for (let index = 0; index < pattern.length; index += 1) {
    if (pattern[index] === ":slug") {
      slug = safeDecodeSegment(segments[index]);
      if (!slug) return null;
    } else if (pattern[index] !== segments[index]) {
      return null;
    }
  }
  return { slug };
}

export function resolveRoute(pathname, fallbackLocale = DEFAULT_LOCALE) {
  const normalizedPath = normalizePathname(pathname);
  const segments = normalizedPath.split("/").filter(Boolean);
  const locale = normalizeLocale(segments[0]);
  const safeFallback = normalizeLocale(fallbackLocale) || DEFAULT_LOCALE;
  if (!locale) {
    return {
      name:"not-found",
      locale:safeFallback,
      langCode:localeToLangCode(safeFallback),
      sectionId:null,
      slug:null,
      detail:false,
      isNotFound:true,
      pathname:normalizedPath,
      remainder:segments,
    };
  }

  const routeSegments = segments.slice(1);
  for (const definition of ROUTE_DEFINITIONS) {
    const match = matchRouteSegments(definition.paths[locale], routeSegments);
    if (!match) continue;
    return {
      ...definition,
      locale,
      langCode:localeToLangCode(locale),
      slug:match.slug,
      detail:Boolean(definition.detail),
      isNotFound:false,
      pathname:normalizedPath,
      remainder:routeSegments,
    };
  }

  return {
    name:"not-found",
    locale,
    langCode:localeToLangCode(locale),
    sectionId:null,
    slug:null,
    detail:false,
    isNotFound:true,
    pathname:normalizedPath,
    remainder:routeSegments,
  };
}

export function isRouteAvailable(route, contentIndex = {}) {
  if (!route || route.isNotFound) return false;
  if (!route.detail) return true;
  const detailCollections = {
    "match-detail":contentIndex.matches,
    "player-detail":contentIndex.players,
    "news-detail":contentIndex.news,
  };
  const slugs = detailCollections[route.name];
  return Array.isArray(slugs) && slugs.includes(route.slug);
}

export function getRoutePath(routeName, locale = DEFAULT_LOCALE, slug = null) {
  const normalizedLocale = normalizeLocale(locale) || DEFAULT_LOCALE;
  const definition = ROUTE_BY_NAME.get(routeName) || ROUTE_BY_NAME.get("home");
  const parts = definition.paths[normalizedLocale].map((part) => (
    part === ":slug" ? encodeURIComponent(String(slug || "")) : part
  ));
  return `/${[normalizedLocale, ...parts].filter(Boolean).join("/")}`;
}

export function getLocalizedRoutePath(route, targetLocale, currentHash = "") {
  const locale = normalizeLocale(targetLocale) || DEFAULT_LOCALE;
  if (route?.isNotFound) {
    const suffix = (route.remainder || []).map((part) => encodeURIComponent(part)).join("/");
    return `/${locale}${suffix ? `/${suffix}` : ""}`;
  }
  const base = getRoutePath(route?.name || "home", locale, route?.slug);
  if (route?.name === "matches" && TAB_HASHES.has(currentHash)) return `${base}${currentHash}`;
  if (route?.name === "home" && HOME_HASHES.has(currentHash)) return `${base}${currentHash}`;
  return base;
}

export function getLocalizedSectionHref(locale, sectionOrHash) {
  const hash = String(sectionOrHash || "").startsWith("#")
    ? String(sectionOrHash)
    : `#${sectionOrHash}`;
  const target = LEGACY_HASH_TARGETS[hash];
  if (!target) return hash;
  return `${getRoutePath(target.routeName, locale)}${target.hash}`;
}

export function getRouteScrollTarget(route, hash = "") {
  const normalizedHash = String(hash || "").toLowerCase();
  if (TAB_HASHES.has(normalizedHash)) return "match-center";
  if (HOME_HASHES.has(normalizedHash)) return normalizedHash.slice(1);
  return route?.sectionId || null;
}

export function getStartupRedirect({ pathname, hash = "", storage, navigatorLanguage } = {}) {
  const normalizedPath = normalizePathname(pathname);
  const explicitLocale = getLocaleFromPath(normalizedPath);
  const preferredLocale = explicitLocale || getPreferredLocale({ storage, navigatorLanguage });
  const segments = normalizedPath.split("/").filter(Boolean);
  const isLegacyRoot = normalizedPath === "/" || normalizedPath.toLowerCase() === "/index.html";
  const isLocaleHomepage = Boolean(explicitLocale && segments.length === 1);
  if (!isLegacyRoot && !isLocaleHomepage) return null;

  const legacyTarget = LEGACY_HASH_TARGETS[String(hash || "").toLowerCase()];
  if (legacyTarget) {
    return `${getRoutePath(legacyTarget.routeName, preferredLocale)}${legacyTarget.hash}`;
  }
  if (isLegacyRoot) return getRoutePath("home", preferredLocale);
  return null;
}

export function isLocalizedAppPath(pathname) {
  return Boolean(getLocaleFromPath(pathname));
}
