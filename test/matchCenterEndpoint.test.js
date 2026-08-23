import fs from "node:fs/promises";
import test from "node:test";
import assert from "node:assert/strict";
import { createMatchCenterHandler } from "../api/match-center.js";
import {
  getMatchCenter,
  inspectSnapshot,
  SNAPSHOT_FILE,
  toResponseEnvelope,
} from "../server/match-center/service.js";
import { UpstreamError } from "../server/match-center/upstream.js";

const NOW = "2026-08-10T09:00:00.000Z";

const DETERMINISTIC_FUTURE_MATCH = Object.freeze({
  id:"test-future-match",
  matchday:"GW TEST",
  competition:"EML FC26 Summer League",
  date:"12 August 2026",
  day:"12",
  month:"August",
  time:"20:00",
  home:"ALTAIR eSports",
  homeAbbr:"ALT",
  away:"Test Fixture FC",
  awayAbbr:"TST",
  hs:null,
  as:null,
  played:false,
  venue:"Home",
});

async function baseSnapshot() {
  return JSON.parse(await fs.readFile(SNAPSHOT_FILE, "utf8"));
}

async function makeSnapshot({
  generatedAt = "2026-08-10T08:30:00.000Z",
  validFrom = "2026-08-10T08:30:00.000Z",
  validUntil = "2026-08-11T08:30:00.000Z",
  seasonStatus = "active",
} = {}) {
  const snapshot = await baseSnapshot();
  snapshot.generatedAt = generatedAt;
  snapshot.validFrom = validFrom;
  snapshot.validUntil = validUntil;
  snapshot.competition.status = seasonStatus;
  snapshot.matches = [DETERMINISTIC_FUTURE_MATCH];
  return snapshot;
}

function createResponse() {
  return {
    headers:{},
    statusCode:200,
    body:null,
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
  };
}

test("service returns a recent verified snapshot without external network", async () => {
  let externalCalled = false;
  const result = await getMatchCenter({
    now:NOW,
    loadSnapshot:() => makeSnapshot(),
    fetchLive:async () => { externalCalled = true; throw new Error("must not run"); },
  });
  assert.equal(result.statusCode, 200);
  assert.equal(result.data.meta.status, "fresh");
  assert.equal(externalCalled, false);
});

test("external failure + valid snapshot returns stale", async () => {
  const result = await getMatchCenter({
    now:NOW,
    loadSnapshot:() => makeSnapshot({
      generatedAt:"2026-08-09T09:00:00.000Z",
      validFrom:"2026-08-09T09:00:00.000Z",
      validUntil:"2026-08-11T09:00:00.000Z",
    }),
    fetchLive:async () => { throw new UpstreamError("UPSTREAM_TIMEOUT", "timeout"); },
  });
  assert.equal(result.statusCode, 200);
  assert.equal(result.data.meta.status, "stale");
  assert.equal(result.data.meta.isStale, true);
  assert.equal(result.data.meta.warningCode, "UPSTREAM_TIMEOUT");
  assert.equal(result.data.meta.lastSuccessfulAt, "2026-08-09T09:00:00.000Z");
});

test("expired fallback is excluded and returns normalized unavailable state", async () => {
  const result = await getMatchCenter({
    now:NOW,
    loadSnapshot:() => makeSnapshot({
      generatedAt:"2026-08-09T08:00:00.000Z",
      validFrom:"2026-08-09T08:00:00.000Z",
      validUntil:"2026-08-10T08:59:59.000Z",
    }),
    fetchLive:async () => { throw new UpstreamError("UPSTREAM_UNAVAILABLE", "offline"); },
  });
  assert.equal(result.statusCode, 503);
  assert.equal(result.data.meta.status, "unavailable");
  assert.equal(result.data.nextMatch, null);
  assert.deepEqual(result.data.upcomingFixtures, []);
  assert.equal(toResponseEnvelope(result.data).data, null);
});

test("ended season snapshot returns season-ended without refresh", async () => {
  let externalCalled = false;
  const result = await getMatchCenter({
    now:NOW,
    loadSnapshot:() => makeSnapshot({ seasonStatus:"ended" }),
    fetchLive:async () => { externalCalled = true; throw new Error("must not run"); },
  });
  assert.equal(result.statusCode, 200);
  assert.equal(result.data.meta.status, "season-ended");
  assert.equal(externalCalled, false);
});

test("endpoint returns only the normalized response envelope", async () => {
  const snapshot = await makeSnapshot();
  const data = inspectSnapshot(snapshot, { now:NOW, requireCurrent:true }).data;
  const handler = createMatchCenterHandler(async () => ({ statusCode:200, data }));
  const response = createResponse();
  await handler({ method:"GET", query:{ locale:"tr" } }, response);
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.meta.status, "fresh");
  assert.ok(response.body.data.team);
  assert.equal("meta" in response.body.data, false);
  assert.match(response.headers["content-type"], /application\/json/);
});

test("endpoint rejects user-controlled upstream parameters", async () => {
  let loaderCalled = false;
  const handler = createMatchCenterHandler(async () => {
    loaderCalled = true;
    throw new Error("must not run");
  });
  const response = createResponse();
  await handler({ method:"GET", query:{ url:"https://example.com" } }, response);
  assert.equal(response.statusCode, 400);
  assert.equal(response.body.meta.warningCode, "INVALID_QUERY");
  assert.equal(loaderCalled, false);
});

test("endpoint sends unavailable data as 503 with no-store and no match payload", async () => {
  const result = await getMatchCenter({
    now:NOW,
    loadSnapshot:() => makeSnapshot({
      generatedAt:"2026-08-09T08:00:00.000Z",
      validFrom:"2026-08-09T08:00:00.000Z",
      validUntil:"2026-08-10T08:59:59.000Z",
    }),
    fetchLive:async () => { throw new UpstreamError("DNS_FAILURE", "offline"); },
  });
  const handler = createMatchCenterHandler(async () => result);
  const response = createResponse();
  await handler({ method:"GET", query:{} }, response);
  assert.equal(response.statusCode, 503);
  assert.equal(response.body.meta.status, "unavailable");
  assert.equal(response.body.data, null);
  assert.equal(response.headers["cache-control"], "no-store");
  assert.equal(response.headers["retry-after"], "900");
});

test("endpoint converts unexpected server failures to normalized internal errors", async () => {
  const handler = createMatchCenterHandler(async () => { throw new Error("unexpected"); });
  const response = createResponse();
  await handler({ method:"GET", query:{} }, response);
  assert.equal(response.statusCode, 500);
  assert.equal(response.body.meta.status, "error");
  assert.equal(response.body.meta.warningCode, "MATCH_CENTER_INTERNAL_ERROR");
  assert.deepEqual(response.body.data.upcomingFixtures, []);
});
