import test from "node:test";
import assert from "node:assert/strict";
import { CANONICAL_SQUAD, SQUAD } from "../src/data/squad.js";
import { createLiveSquadStatsSnapshot, mergeSquadWithStats } from "../src/data/squadStats.js";
import { buildLiveSquad } from "../src/hooks/useSquadStats.js";

const BASE_SQUAD = [
  {
    group:"Goalkeepers",
    abbr:"GK",
    players:[{
      ign:"VerifiedPlayer",
      pos:"GK",
      role:"Goalkeeper",
      apps:12,
      goals:3,
      assists:4,
    }],
  },
];

test("a fresh roster never inherits unverifiable hardcoded statistics", () => {
  const groups = buildLiveSquad(BASE_SQUAD, [{
    ign:"VerifiedPlayer",
    pos:"GK",
    apps:null,
    goals:null,
    assists:null,
    profileUrl:"",
  }]);
  const player = groups.flatMap((group) => group.players).find((item) => item.ign === "VerifiedPlayer");

  assert.equal(player.apps, null);
  assert.equal(player.goals, null);
  assert.equal(player.assists, null);
});

test("canonical squad remains complete when live stats are unavailable", () => {
  const merged = mergeSquadWithStats(SQUAD, null, "2026-08-11T09:00:00.000Z");
  assert.equal(merged.squad.flatMap((group) => group.players).length, CANONICAL_SQUAD.length);
  assert.equal(merged.statsAvailable, false);
});

test("expired live stats are hidden without removing the canonical player", () => {
  const canonicalPlayer = CANONICAL_SQUAD[0];
  const snapshot = createLiveSquadStatsSnapshot(CANONICAL_SQUAD, [{
    ign:canonicalPlayer.gamerTag,
    apps:12,
    goals:3,
    assists:4,
  }], {
    verifiedAt:"2026-08-10T08:00:00.000Z",
    validUntil:"2026-08-11T08:00:00.000Z",
  });
  const merged = mergeSquadWithStats(SQUAD, snapshot, "2026-08-11T09:00:00.000Z");
  const player = merged.squad.flatMap((group) => group.players).find((item) => item.playerId === canonicalPlayer.playerId);
  assert.ok(player);
  assert.equal(player.apps, null);
  assert.equal(player.goals, null);
  assert.equal(merged.statsAvailable, false);
});

test("live stats merge by playerId and unknown stats never add an active player", () => {
  const canonicalPlayer = CANONICAL_SQUAD[0];
  const snapshot = createLiveSquadStatsSnapshot(CANONICAL_SQUAD, [
    { ign:canonicalPlayer.gamerTag, apps:8, goals:0, assists:2 },
    { ign:"not-a-canonical-player", apps:99, goals:99, assists:99 },
  ], {
    verifiedAt:"2026-08-11T08:00:00.000Z",
    validUntil:"2026-08-12T08:00:00.000Z",
  });
  const merged = mergeSquadWithStats(SQUAD, snapshot, "2026-08-11T09:00:00.000Z");
  const players = merged.squad.flatMap((group) => group.players);
  const player = players.find((item) => item.playerId === canonicalPlayer.playerId);
  assert.equal(players.length, CANONICAL_SQUAD.length);
  assert.equal(player.apps, 8);
  assert.equal(player.goals, 0);
  assert.equal(player.assists, 2);
  assert.equal(players.some((item) => item.ign === "not-a-canonical-player"), false);
});
