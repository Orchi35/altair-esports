import { useCallback, useEffect, useState } from "react";
import {
  getLocalizedRoutePath,
  getPreferredLocale,
  getStartupRedirect,
  isLocalizedAppPath,
  normalizeLocale,
  rememberLocale,
  resolveRoute,
} from "../app/routes.js";

function readBrowserLocation() {
  if (typeof window === "undefined") {
    return { ...resolveRoute("/tr"), hash:"", key:"/tr" };
  }

  const redirect = getStartupRedirect({
    pathname:window.location.pathname,
    hash:window.location.hash,
    storage:window.localStorage,
    navigatorLanguage:window.navigator.language,
  });
  const current = `${window.location.pathname}${window.location.hash}`;
  if (redirect && redirect !== current) window.history.replaceState(null, "", redirect);

  const preferredLocale = getPreferredLocale({
    storage:window.localStorage,
    navigatorLanguage:window.navigator.language,
  });
  const route = resolveRoute(window.location.pathname, preferredLocale);
  return {
    ...route,
    hash:window.location.hash,
    key:`${window.location.pathname}${window.location.search}${window.location.hash}`,
  };
}

export function useLocaleRoute() {
  const [route, setRoute] = useState(readBrowserLocation);

  const syncFromLocation = useCallback(() => {
    setRoute(readBrowserLocation());
  }, []);

  const navigate = useCallback((href, { replace = false } = {}) => {
    const url = new URL(href, window.location.origin);
    if (url.origin !== window.location.origin) return false;
    const destination = `${url.pathname}${url.search}${url.hash}`;
    window.history[replace ? "replaceState" : "pushState"](null, "", destination);
    syncFromLocation();
    return true;
  }, [syncFromLocation]);

  const switchLocale = useCallback((localeOrCode) => {
    const locale = normalizeLocale(localeOrCode);
    if (!locale) return;
    rememberLocale(window.localStorage, locale);
    navigate(getLocalizedRoutePath(route, locale, window.location.hash));
  }, [navigate, route]);

  useEffect(() => {
    const onLocationChange = () => syncFromLocation();
    window.addEventListener("popstate", onLocationChange);
    window.addEventListener("hashchange", onLocationChange);
    return () => {
      window.removeEventListener("popstate", onLocationChange);
      window.removeEventListener("hashchange", onLocationChange);
    };
  }, [syncFromLocation]);

  useEffect(() => {
    document.documentElement.lang = route.locale;
    rememberLocale(window.localStorage, route.locale);
  }, [route.locale]);

  useEffect(() => {
    const onClick = (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target.closest?.("a[href]");
      if (!anchor || anchor.target || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.origin);
      if (url.origin !== window.location.origin || !isLocalizedAppPath(url.pathname)) return;
      event.preventDefault();
      navigate(`${url.pathname}${url.search}${url.hash}`);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [navigate]);

  return { route, navigate, switchLocale };
}
