import test from "node:test";
import assert from "node:assert/strict";
import { fetchVpgRoster, getVpgRoster, normalizeRoster } from "../server/vpg/rosterService.js";
import { createVpgRosterHandler } from "../api/vpg-roster.js";

const player = { user_id:701340, username:"ByakuzaD", position:"CDM", status:"active", team_id:38650 };

test("roster includes only active contracts for ALTAIR and leaves unknown statistics empty", () => {
  assert.deepEqual(normalizeRoster([player, { ...player, user_id:2, status:"expired" }, { ...player, user_id:3, team_id:5 }]), [{ id:701340, name:"ByakuzaD", position:"CDM", apps:null, goals:null, assists:null, profileUrl:null }]);
  assert.throws(() => normalizeRoster([player, player]));
});

test("fetches official contracts and rejects malformed data", async () => {
  const urls = [];
  const data = await fetchVpgRoster({ fetchImpl:async (url) => { urls.push(url); return { ok:true, text:async () => JSON.stringify([player]) }; }, now:() => new Date("2026-11-08T00:00:00Z") });
  assert.match(urls[0], /teams\/ALTAIR-eSports\/contracts\/$/);
  assert.equal(data.status, "fresh");
  assert.equal(data.players[0].name, "ByakuzaD");
  await assert.rejects(fetchVpgRoster({ fetchImpl:async () => ({ ok:true, text:async () => "{}" }) }));
});

test("failed refresh reports stale and method restrictions are enforced", async () => {
  const now = () => new Date("2026-11-08T01:00:00Z");
  const initial = await getVpgRoster({ now, fetchImpl:async () => ({ ok:true, text:async () => JSON.stringify([player]) }) });
  const stale = await getVpgRoster({ now:() => new Date("2026-11-08T01:06:00Z"), fetchImpl:async () => { throw new Error("offline"); } });
  assert.equal(stale.status, "stale");
  assert.equal(stale.updatedAt, initial.updatedAt);
  let code;
  const response = { setHeader() {}, status(value) { code = value; return this; }, json(value) { return value; } };
  await createVpgRosterHandler(() => { throw new Error("must not load"); })({ method:"POST" }, response);
  assert.equal(code, 405);
});

test("joins season leaderboards to active players and tolerates a partial stats failure", async () => {
  const requests = [];
  const fetchImpl = async (url) => {
    requests.push(url);
    if (url.includes("contracts")) return { ok:true, text:async () => JSON.stringify([player]) };
    if (url.includes("top_assist")) throw new Error("offline");
    return { ok:true, text:async () => JSON.stringify({ count:1, data:[{ username:"byakuzad", team_slug:"ALTAIR-eSports", goals:0, matches_played:12 }] }) };
  };
  const result = await fetchVpgRoster({ fetchImpl });
  assert.equal(result.statsScope, "team-season");
  assert.equal(result.season, 20);
  assert.equal(result.players[0].goals, 0);
  assert.equal(result.players[0].apps, 12);
  assert.equal(result.players[0].assists, null);
  assert.equal(requests.length, 3);
});
