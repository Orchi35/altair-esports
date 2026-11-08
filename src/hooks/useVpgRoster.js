import { useCallback, useEffect, useState } from "react";

const POLL_MS = 5 * 60 * 1000;

export function useVpgRoster() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const refetch = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    let pending = false;
    let controller;
    let lastAttempt = 0;
    async function load() {
      if (pending) return;
      pending = true;
      lastAttempt = Date.now();
      controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      setLoading(true);
      try {
        const response = await fetch("/api/vpg-roster", { cache:"no-store", signal:controller.signal });
        if (!response.ok) throw new Error("Roster unavailable");
        const next = await response.json();
        if (!Array.isArray(next.players)) throw new Error("Invalid roster");
        if (active) { setData(next); setError(next.status === "stale"); }
      } catch {
        if (active) setError(true);
      } finally {
        clearTimeout(timeout);
        pending = false;
        if (active) setLoading(false);
      }
    }
    load();
    function refreshVisible() {
      if (document.visibilityState === "visible" && Date.now() - lastAttempt >= 60000) load();
    }
    const interval = setInterval(refreshVisible, POLL_MS);
    window.addEventListener("focus", refreshVisible);
    document.addEventListener("visibilitychange", refreshVisible);
    return () => {
      active = false;
      controller?.abort();
      clearInterval(interval);
      window.removeEventListener("focus", refreshVisible);
      document.removeEventListener("visibilitychange", refreshVisible);
    };
  }, [revision]);

  return { data, loading, error, refetch };
}
