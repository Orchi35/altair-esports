import test from "node:test";
import assert from "node:assert/strict";
import { UpstreamError } from "../server/match-center/upstream.js";
import { createRateLimitedHtmlLoader, getRateLimitDelayMs } from "../scripts/lib/eml-rate-limit.mjs";

test("rate-limited loader retries HTTP 429 and eventually returns HTML", async () => {
  let calls = 0;
  const delays = [];
  const loadHtml = createRateLimitedHtmlLoader({
    requestGapMs:0,
    random:() => 0,
    sleep:async (delayMs) => { delays.push(delayMs); },
    fetchHtml:async () => {
      calls += 1;
      if (calls < 3) throw new UpstreamError("HTTP_429", "rate limited", { retryAfterSeconds:1 });
      return "<html>ok</html>";
    },
  });

  assert.equal(await loadHtml("/tournaments/league_table/42/"), "<html>ok</html>");
  assert.equal(calls, 3);
  assert.deepEqual(delays, [1000, 1000]);
});

test("rate-limited loader serializes concurrent source requests", async () => {
  let active = 0;
  let maxActive = 0;
  const loadHtml = createRateLimitedHtmlLoader({
    requestGapMs:0,
    fetchHtml:async (pathname) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 2));
      active -= 1;
      return pathname;
    },
  });

  assert.deepEqual(await Promise.all([loadHtml("/one"), loadHtml("/two"), loadHtml("/three")]), ["/one", "/two", "/three"]);
  assert.equal(maxActive, 1);
});

test("rate limit delay is bounded even when Retry-After is excessive", () => {
  const error = new UpstreamError("HTTP_429", "rate limited", { retryAfterSeconds:600 });
  assert.equal(getRateLimitDelayMs(error, 0, () => 1), 30_000);
});

