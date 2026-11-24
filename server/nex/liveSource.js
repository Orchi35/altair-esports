const FRESH_INTERVAL = 5 * 60_000;
const RETRY_INTERVAL = 60_000;

export async function readNexPage(url, fetchImpl) {
  const response = await fetchImpl(url, {
    signal: AbortSignal.timeout(8000),
    headers: { Accept: "text/html", "Accept-Language": "tr-TR,tr;q=0.9" },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const html = await response.text();
  if (html.length > 4_000_000) throw new Error("Nex response too large");
  return html;
}

export function createNexFeed(name, refresh, unavailable, now) {
  let data = unavailable;
  let nextAttempt = 0;
  let pending;
  return function load() {
    if (pending) return pending;
    if (now() < nextAttempt) return Promise.resolve(data);
    pending = (async () => {
      try {
        data = await refresh();
        nextAttempt = now() + FRESH_INTERVAL;
      } catch (error) {
        console.warn(`Nex ${name} refresh failed:`, error.message);
        if (data.status === "fresh") data = { ...data, status: "stale" };
        nextAttempt = now() + RETRY_INTERVAL;
      }
      return data;
    })().finally(() => { pending = null; });
    return pending;
  };
}
