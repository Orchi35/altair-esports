import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { fetchVpg, getVpg, normalizeMatches, normalizeStandings } from "../server/vpg/service.js";
import { createVpgHandler } from "../api/vpg.js";

const fixture = { id:1, datetime:"2026-11-09T20:00:00Z", home_name:"ALTAIR", home_slug:"ALTAIR-eSports", away_name:"Opponent", away_slug:"Opponent", match_day:13, league_id:1505, season:20, tournament_id:null, status:"scheduled", home_score:0, away_score:0 };
const row = { team_name:"ALTAIR", team_slug:"ALTAIR-eSports", played:2, wins:1, draws:1, losses:0, score_for:3, score_against:1, points:4 };

test("normalizes Elite B matches only and hides scheduled scores", () => {
  const matches = normalizeMatches([fixture, { ...fixture, id:2, league_id:null, tournament_id:5 }, { ...fixture, id:3, season:19 }], "scheduled");
  assert.equal(matches.length, 1);
  assert.equal(matches[0].score, null);
  assert.equal(matches[0].round, 13);
  assert.deepEqual(normalizeStandings([row])[0], { position:1, name:"ALTAIR", slug:"ALTAIR-eSports", played:2, won:1, drawn:1, lost:0, goalDifference:2, points:4 });
});

test("requests subsequent full pages and validates results", async () => {
  const requests = [];
  const fetchImpl = async (url) => {
    requests.push(url);
    let payload;
    if (url.includes("/table/")) payload = [row];
    else if (url.includes("match_status=complete")) payload = { data:[] };
    else payload = { data:url.includes("offset=0") ? Array.from({ length:100 }, (_, i) => ({ ...fixture, id:i + 1 })) : [] };
    return { ok:true, text:async () => JSON.stringify(payload) };
  };
  const data = await fetchVpg({ fetchImpl, now:() => new Date("2026-11-08T00:00:00Z") });
  assert.equal(data.fixtures.length, 100);
  assert.ok(requests.some((url) => url.includes("offset=100")));
  assert.equal(data.status, "fresh");
  assert.throws(() => normalizeStandings([{ ...row, points:null }]));
});

test("snapshot is scoped and endpoint rejects other methods", async () => {
  const snapshot = JSON.parse(await fs.readFile(new URL("../public/data/vpg-elite-b.json", import.meta.url), "utf8"));
  assert.equal(snapshot.status, "stale");
  assert.ok(snapshot.fixtures.length && snapshot.results.length && snapshot.standings.length);
  assert.ok(snapshot.fixtures.every((match) => match.score === null));
  let code;
  const response = { setHeader() {}, status(value) { code = value; return this; }, json(value) { return value; } };
  await createVpgHandler(() => { throw new Error("must not load"); })({ method:"POST" }, response);
  assert.equal(code, 405);
});

test("uses a labeled snapshot when VPG is unavailable", async () => {
  const snapshot = JSON.parse(await fs.readFile(new URL("../public/data/vpg-elite-b.json", import.meta.url), "utf8"));
  const data = await getVpg({ fetchImpl:async () => { throw new Error("offline"); }, readSnapshot:async () => JSON.stringify({ ...snapshot, status:"fresh" }) });
  assert.equal(data.status, "stale");
  assert.equal(data.updatedAt, snapshot.updatedAt);
  assert.deepEqual(data.results, snapshot.results);
});

test("reports unavailable when both VPG and snapshot fail", async () => {
  const data = await getVpg({ fetchImpl:async () => { throw new Error("offline"); }, readSnapshot:async () => { throw new Error("missing"); } });
  assert.deepEqual(data, { status:"unavailable", updatedAt:null, fixtures:[], results:[], standings:[] });
});
