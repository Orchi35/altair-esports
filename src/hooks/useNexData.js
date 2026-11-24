import { useSyncExternalStore } from "react";

const POLL_INTERVAL = 5 * 60 * 1000;
const REVALIDATE_INTERVAL = 60 * 1000;
const REQUEST_TIMEOUT = 15 * 1000;
const initialSnapshot = { data: null, failed: false, loading: true };

function createFeedStore(path) {
  let snapshot = initialSnapshot;
  let lastAttempt = 0;
  let request = null;
  let timer = null;
  const listeners = new Set();

  function publish(next) {
    snapshot = next;
    listeners.forEach(listener => listener());
  }

  function fetchData() {
    if (request) return;
    lastAttempt = Date.now();
    const controller = new AbortController();
    const current = { controller, timeout: setTimeout(() => controller.abort(), REQUEST_TIMEOUT) };
    request = current;
    publish({ ...snapshot, loading: true });
    fetch(path, { cache: "no-store", signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error("Unavailable");
        return response.json();
      })
      .then(data => {
        if (request === current) publish({ data, failed: false, loading: false });
      })
      .catch(() => {
        if (request === current) {
          publish({ data: snapshot.data ? { ...snapshot.data, status: "stale" } : null, failed: true, loading: false });
        }
      })
      .finally(() => {
        clearTimeout(current.timeout);
        if (request === current) request = null;
      });
  }

  function revalidate() {
    if (document.visibilityState === "visible" && Date.now() - lastAttempt > REVALIDATE_INTERVAL) fetchData();
  }

  function subscribe(listener) {
    listeners.add(listener);
    if (listeners.size === 1) {
      fetchData();
      timer = setInterval(() => {
        const interval = snapshot.failed || snapshot.data?.status === "stale" ? REVALIDATE_INTERVAL : POLL_INTERVAL;
        if (document.visibilityState === "visible" && Date.now() - lastAttempt >= interval) fetchData();
      }, REVALIDATE_INTERVAL);
      window.addEventListener("focus", revalidate);
      document.addEventListener("visibilitychange", revalidate);
    }
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        clearInterval(timer);
        timer = null;
        window.removeEventListener("focus", revalidate);
        document.removeEventListener("visibilitychange", revalidate);
        if (request) {
          const current = request;
          request = null;
          clearTimeout(current.timeout);
          current.controller.abort();
        }
      }
    };
  }

  function getSnapshot() {
    return snapshot;
  }

  function getServerSnapshot() {
    return initialSnapshot;
  }
  return { subscribe, getSnapshot, getServerSnapshot, refetch: fetchData };
}

const league = createFeedStore("/api/nex");
const roster = createFeedStore("/api/nex?view=roster");

export function useNexData() {
  return useSyncExternalStore(league.subscribe, league.getSnapshot, league.getServerSnapshot);
}

export function useNexRoster() {
  const state = useSyncExternalStore(roster.subscribe, roster.getSnapshot, roster.getServerSnapshot);
  return { ...state, error: state.failed || state.data?.status === "stale", refetch: roster.refetch };
}
