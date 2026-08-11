import test from "node:test";
import assert from "node:assert/strict";
import {
  createLoadingMatchCenterData,
  normalizeMatch,
  normalizeStandings,
  normalizeTeam,
  resolveMatchCenterData,
} from "../src/data/matchCenter.js";

const NOW = "2026-08-10T09:00:00.000Z";
const ACTIVE_SEASON = { id:"42", name:"EML FC26 Summer League", status:"active" };

function source(overrides = {}) {
  return {
    generatedAt:"2026-08-10T08:55:00.000Z",
    fetchedAt:"2026-08-10T08:55:00.000Z",
    lastSuccessfulAt:"2026-08-10T08:55:00.000Z",
    validUntil:"2026-08-11T08:55:00.000Z",
    sourceName:"eMajor League",
    sourceType:"live",
    season:ACTIVE_SEASON,
    team:"ALTAIR eSports",
    standings:[],
    matches:[{
      id:"future",
      competition:"EML FC26 Summer League",
      round:"GW 11",
      home:"ALTAIR eSports",
      away:"Shelter FC",
      startsAt:"2026-08-14T20:00:00+03:00",
      status:"scheduled",
    }],
    ...overrides,
  };
}

test("loading → fresh", () => {
  assert.equal(createLoadingMatchCenterData(ACTIVE_SEASON).meta.status, "loading");
  const result = resolveMatchCenterData({ primary:source(), now:NOW, season:ACTIVE_SEASON });
  assert.equal(result.meta.status, "fresh");
});

test("loading → error", () => {
  const result = resolveMatchCenterData({ error:new Error("offline"), now:NOW, season:ACTIVE_SEASON });
  assert.equal(result.meta.status, "error");
  assert.deepEqual(result.upcomingFixtures, []);
});

test("error + valid fallback → stale", () => {
  const result = resolveMatchCenterData({ error:new Error("offline"), fallback:source({ sourceType:"snapshot" }), now:NOW, season:ACTIVE_SEASON });
  assert.equal(result.meta.status, "stale");
  assert.equal(result.meta.isStale, true);
  assert.equal(result.meta.lastSuccessfulAt, "2026-08-10T08:55:00.000Z");
});

test("error + expired fallback → unavailable", () => {
  const fallback = source({ validUntil:"2026-08-10T08:59:59.000Z", sourceType:"snapshot" });
  const result = resolveMatchCenterData({ error:new Error("offline"), fallback, now:NOW, season:ACTIVE_SEASON });
  assert.equal(result.meta.status, "unavailable");
  assert.equal(result.meta.warningCode, "FALLBACK_EXPIRED");
  assert.equal(result.nextMatch, null);
});

test("fallback expires exactly at validUntil and is never shown", () => {
  const fallback = source({ validUntil:NOW, sourceType:"snapshot" });
  const result = resolveMatchCenterData({ error:new Error("offline"), fallback, now:NOW, season:ACTIVE_SEASON });
  assert.equal(result.meta.status, "unavailable");
  assert.equal(result.meta.warningCode, "FALLBACK_EXPIRED");
});

test("empty fixtures + active season → empty", () => {
  const result = resolveMatchCenterData({ primary:source({ matches:[] }), now:NOW, season:ACTIVE_SEASON });
  assert.equal(result.meta.status, "empty");
});

test("empty fixtures + ended season → season-ended", () => {
  const ended = { ...ACTIVE_SEASON, status:"ended" };
  const result = resolveMatchCenterData({ primary:source({ matches:[], season:ended }), now:NOW, season:ended });
  assert.equal(result.meta.status, "season-ended");
});

test("past scheduled match is excluded from upcoming fixtures", () => {
  const past = {
    id:"past",
    home:"ALTAIR eSports",
    away:"Gunners",
    startsAt:"2026-08-09T20:00:00+03:00",
    status:"scheduled",
  };
  const result = resolveMatchCenterData({ primary:source({ matches:[past] }), now:NOW, season:ACTIVE_SEASON });
  assert.equal(result.meta.status, "empty");
  assert.deepEqual(result.upcomingFixtures, []);
});

test("the earliest valid future match is selected as nextMatch", () => {
  const later = source().matches[0];
  const earlier = { ...later, id:"earlier", startsAt:"2026-08-11T20:00:00+03:00" };
  const result = resolveMatchCenterData({ primary:source({ matches:[later, earlier] }), now:NOW, season:ACTIVE_SEASON });
  assert.equal(result.nextMatch.id, "earlier");
  assert.deepEqual(result.upcomingFixtures.map((match) => match.id), ["earlier", "future"]);
});

test("a verified finished score is normalized without confusing zero and missing data", () => {
  const finished = normalizeMatch({
    id:"finished",
    home:"ALTAIR eSports",
    away:"Gunners",
    startsAt:"2026-08-09T20:00:00+03:00",
    status:"finished",
    score:{ home:0, away:2 },
  });
  assert.deepEqual(finished.score, { home:0, away:2 });
  assert.equal(normalizeMatch({ ...finished, score:null }), null);
});

test("team name aliases normalize to the same team", () => {
  assert.deepEqual(normalizeTeam("AltairEsports"), normalizeTeam("ALTAIR eSports"));
  assert.equal(normalizeTeam("ALTAIR eSpor").id, "altair-esports");
});

test("invalid dates are safely rejected", () => {
  const match = normalizeMatch({
    id:"invalid",
    home:"ALTAIR eSports",
    away:"Gunners",
    startsAt:"2026-02-30T22:00:00+03:00",
    status:"scheduled",
  });
  assert.equal(match, null);
});

test("standings positions and numeric fields are normalized", () => {
  const rows = normalizeStandings([
    { rank:7, name:"ALTAIR eSports", pld:"10", w:"4", d:"2", l:"4", gf:"18", ga:"17", pts:"14" },
    { rank:2, name:"Gunners", pld:10, w:8, d:0, l:2, gf:30, ga:8, pts:24 },
  ]);
  assert.deepEqual(rows.map((row) => row.position), [1, 2]);
  assert.equal(rows[0].team.name, "Gunners");
  assert.equal(rows[1].goalDifference, 1);
});
