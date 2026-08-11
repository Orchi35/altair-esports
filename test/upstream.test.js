import test from "node:test";
import assert from "node:assert/strict";
import { fetchAllowedHtml, UpstreamError } from "../server/match-center/upstream.js";

const ALLOWED_PATH = "/tournaments/league_table/42/";

test("safe upstream fetch accepts a bounded HTML response", async () => {
  const html = await fetchAllowedHtml(ALLOWED_PATH, {
    fetchImpl:async () => new Response("<html>ok</html>", { headers:{ "content-type":"text/html; charset=utf-8" } }),
  });
  assert.equal(html, "<html>ok</html>");
});

test("safe upstream fetch accepts only the allowlisted roster route shape", async () => {
  const html = await fetchAllowedHtml("/teams/team/337/42/1/squad/", {
    fetchImpl:async () => new Response("<html>roster</html>", { headers:{ "content-type":"text/html" } }),
  });
  assert.equal(html, "<html>roster</html>");

  await assert.rejects(
    fetchAllowedHtml("/teams/team/337/42/1/admin/", {
      fetchImpl:async () => new Response("<html>blocked</html>", { headers:{ "content-type":"text/html" } }),
    }),
    (error) => error instanceof UpstreamError && error.code === "UPSTREAM_PATH_BLOCKED",
  );
});

test("safe upstream fetch enforces timeout", async () => {
  const fetchImpl = (_url, { signal }) => new Promise((resolve, reject) => {
    void resolve;
    signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
  });
  await assert.rejects(
    fetchAllowedHtml(ALLOWED_PATH, { fetchImpl, timeoutMs:5 }),
    (error) => error instanceof UpstreamError && error.code === "REQUEST_TIMEOUT",
  );
});

test("safe upstream fetch rejects oversized responses", async () => {
  await assert.rejects(
    fetchAllowedHtml(ALLOWED_PATH, {
      fetchImpl:async () => new Response("x".repeat(64), { headers:{ "content-type":"text/html" } }),
      maxBytes:16,
    }),
    (error) => error instanceof UpstreamError && error.code === "RESPONSE_TOO_LARGE",
  );
});

test("safe upstream fetch limits redirects", async () => {
  await assert.rejects(
    fetchAllowedHtml(ALLOWED_PATH, {
      fetchImpl:async () => new Response(null, { status:302, headers:{ location:ALLOWED_PATH } }),
      maxRedirects:0,
    }),
    (error) => error instanceof UpstreamError && error.code === "TOO_MANY_REDIRECTS",
  );
});

test("safe upstream fetch blocks redirects to another host", async () => {
  await assert.rejects(
    fetchAllowedHtml(ALLOWED_PATH, {
      fetchImpl:async () => new Response(null, {
        status:302,
        headers:{ location:`https://example.com${ALLOWED_PATH}` },
      }),
    }),
    (error) => error instanceof UpstreamError && error.code === "UPSTREAM_HOST_BLOCKED",
  );
});

test("safe upstream fetch rejects an invalid content type", async () => {
  await assert.rejects(
    fetchAllowedHtml(ALLOWED_PATH, {
      fetchImpl:async () => new Response("{}", { headers:{ "content-type":"application/json" } }),
    }),
    (error) => error instanceof UpstreamError && error.code === "INVALID_CONTENT_TYPE",
  );
});

test("safe upstream fetch rejects non-success responses before parsing", async () => {
  await assert.rejects(
    fetchAllowedHtml(ALLOWED_PATH, {
      fetchImpl:async () => new Response("<html>error</html>", { status:500, headers:{ "content-type":"text/html" } }),
    }),
    (error) => error instanceof UpstreamError && error.code === "HTTP_5XX",
  );
});

test("safe upstream fetch classifies DNS, TLS and blocked egress failures", async () => {
  for (const [causeCode, expected] of [
    ["ENOTFOUND", "DNS_FAILURE"],
    ["CERT_HAS_EXPIRED", "TLS_FAILURE"],
    ["ENETUNREACH", "NETWORK_EGRESS_BLOCKED"],
  ]) {
    await assert.rejects(
      fetchAllowedHtml(ALLOWED_PATH, {
        fetchImpl:async () => { throw Object.assign(new TypeError("fetch failed"), { cause:{ code:causeCode } }); },
      }),
      (error) => error instanceof UpstreamError && error.code === expected,
    );
  }
});

test("safe upstream fetch classifies important HTTP statuses", async () => {
  for (const [status, expected] of [[403, "HTTP_403"], [404, "HTTP_404"], [429, "HTTP_429"], [503, "HTTP_5XX"]]) {
    await assert.rejects(
      fetchAllowedHtml(ALLOWED_PATH, {
        fetchImpl:async () => new Response("error", { status, headers:{ "content-type":"text/html" } }),
      }),
      (error) => error instanceof UpstreamError && error.code === expected && error.details.httpStatus === status,
    );
  }
});
