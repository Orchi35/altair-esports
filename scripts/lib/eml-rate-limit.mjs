import { UpstreamError } from "../../server/match-center/upstream.js";

const DEFAULT_REQUEST_GAP_MS = 800;
const DEFAULT_MAX_RETRIES = 2;
const MAX_RETRY_DELAY_MS = 30_000;

export function getRateLimitDelayMs(error, attempt, random = Math.random) {
  const retryAfterMs = Number(error?.details?.retryAfterSeconds) * 1000;
  const exponentialMs = 2_000 * (2 ** attempt);
  const baseMs = Number.isFinite(retryAfterMs) && retryAfterMs > 0 ? retryAfterMs : exponentialMs;
  const jitterMs = Math.floor(Math.max(0, Math.min(1, random())) * 500);
  return Math.min(MAX_RETRY_DELAY_MS, baseMs + jitterMs);
}

export function createRateLimitedHtmlLoader({
  fetchHtml,
  maxRetries = DEFAULT_MAX_RETRIES,
  requestGapMs = DEFAULT_REQUEST_GAP_MS,
  sleep = (delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs)),
  now = Date.now,
  random = Math.random,
  onRetry = null,
} = {}) {
  if (typeof fetchHtml !== "function") throw new TypeError("fetchHtml must be a function");
  let queue = Promise.resolve();
  let nextRequestAt = 0;

  const run = async (pathname) => {
    for (let attempt = 0; ; attempt += 1) {
      const gapDelay = Math.max(0, nextRequestAt - now());
      if (gapDelay) await sleep(gapDelay);
      nextRequestAt = now() + requestGapMs;

      try {
        return await fetchHtml(pathname);
      } catch (error) {
        if (!(error instanceof UpstreamError) || error.code !== "HTTP_429" || attempt >= maxRetries) throw error;
        const delayMs = getRateLimitDelayMs(error, attempt, random);
        onRetry?.({ attempt:attempt + 1, delayMs, pathname });
        await sleep(delayMs);
      }
    }
  };

  return (pathname) => {
    const request = queue.then(() => run(pathname));
    queue = request.catch(() => undefined);
    return request;
  };
}

