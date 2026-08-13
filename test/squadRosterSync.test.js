import test from "node:test";
import assert from "node:assert/strict";
import { createLiveSquadStatsSnapshot, mergeSquadWithStats } from "../src/data/squadStats.js";
import { createSquadFromLiveRoster, reconcileSquadRoster } from "../src/data/squadRosterSync.js";

const canonical = [
  { playerId:"known", slug:"known-player", firstName:"Known", lastName:"Player", gamerTag:"OldTag", shirtNumber:"9", position:"ST", positionGroup:"Forwards", image:"/known.webp", status:"active", joinedAt:null, displayOrder:1, profileUrl:"https://emajorleague.com/players/profile/42/", captain:true, initials:"KP" },
  { playerId:"departed", slug:"departed", firstName:"Departed", lastName:"Player", gamerTag:"Departed", shirtNumber:"4", position:"CB", positionGroup:"Defenders", image:null, status:"active", joinedAt:null, displayOrder:2, profileUrl:"https://emajorleague.com/players/profile/50/", captain:false, initials:"DP" },
];

test("live roster adds new players, removes departed players and preserves known profile details", () => {
  const live = [
    { ign:"RenamedTag", pos:"CM", apps:8, goals:1, assists:3, profileUrl:"https://emajorleague.com/players/profile/42/" },
    { ign:"BrandNew", pos:"GK", apps:2, goals:0, assists:0, profileUrl:"https://emajorleague.com/players/profile/99/" },
  ];
  const reconciled = reconcileSquadRoster(canonical, live);

  assert.deepEqual(reconciled.map((player) => player.gamerTag), ["RenamedTag", "BrandNew"]);
  assert.equal(reconciled[0].playerId, "known");
  assert.equal(reconciled[0].firstName, "Known");
  assert.equal(reconciled[0].image, "/known.webp");
  assert.equal(reconciled[0].position, "CM");
  assert.equal(reconciled[0].positionGroup, "Midfielders");
  assert.equal(reconciled[1].playerId, "eml-99");
  assert.equal(reconciled.some((player) => player.playerId === "departed"), false);
});

test("synchronized roster exposes verified stats for new and renamed players", () => {
  const live = [
    { ign:"RenamedTag", pos:"CM", apps:8, goals:1, assists:3, profileUrl:"https://emajorleague.com/players/profile/42/" },
    { ign:"BrandNew", pos:"GK", apps:2, goals:0, assists:0, profileUrl:"https://emajorleague.com/players/profile/99/" },
    { ign:"Third", pos:"CB", apps:4, goals:0, assists:1, profileUrl:"" },
    { ign:"Fourth", pos:"RW", apps:4, goals:2, assists:0, profileUrl:"" },
    { ign:"Fifth", pos:"ST", apps:4, goals:3, assists:0, profileUrl:"" },
  ];
  const reconciled = reconcileSquadRoster(canonical, live);
  const squad = createSquadFromLiveRoster(canonical, live);
  const snapshot = createLiveSquadStatsSnapshot(reconciled, live, {
    verifiedAt:"2026-08-13T10:00:00.000Z",
    validUntil:"2026-08-14T10:00:00.000Z",
  });
  const merged = mergeSquadWithStats(squad, snapshot, "2026-08-13T11:00:00.000Z");
  const players = merged.squad.flatMap((group) => group.players);

  assert.equal(players.length, 5);
  assert.equal(players.find((player) => player.playerId === "known").assists, 3);
  assert.equal(players.find((player) => player.playerId === "eml-99").apps, 2);
});

test("invalid or suspiciously short roster never replaces the canonical fallback", () => {
  assert.equal(createSquadFromLiveRoster(canonical, [{ ign:"OnlyOne", pos:"GK" }]), null);
});
