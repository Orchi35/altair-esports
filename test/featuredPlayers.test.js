import assert from "node:assert/strict";
import test from "node:test";
import { getFeaturedPlayers } from "../src/features/squad/featuredPlayers.js";

const SQUAD = [
  { group:"Midfielders", players:[
    { ign:"captain", captain:true, apps:9, goals:1, assists:1 },
    { ign:"scorer", captain:false, apps:8, goals:7, assists:0 },
  ] },
  { group:"Forwards", players:[
    { ign:"creator", captain:false, apps:9, goals:2, assists:5 },
    { ign:"editorial", captain:false, apps:null, goals:null, assists:null },
  ] },
];

const CAPTAIN_CONFIG = [{
  ign:"captain",
  featuredReason:"captain",
  roleLabel:{ TR:"Kaptan", EN:"Captain" },
  displayOrder:10,
  verified:true,
}];

test("verified stats select captain, goal leader and assist leader", () => {
  const featured = getFeaturedPlayers(SQUAD, { statsVerified:true, editorialConfig:CAPTAIN_CONFIG });
  assert.deepEqual(featured.map((player) => player.ign), ["captain", "scorer", "creator"]);
  assert.deepEqual(featured.map((player) => player.featuredReason), ["captain", "goal-leader", "assist-leader"]);
});

test("performance titles are not produced without verified statistics", () => {
  const featured = getFeaturedPlayers(SQUAD, { statsVerified:false, editorialConfig:CAPTAIN_CONFIG });
  assert.deepEqual(featured.map((player) => player.featuredReason), ["captain"]);
});

test("verified editorial selection works when statistics are unavailable", () => {
  const featured = getFeaturedPlayers(SQUAD, {
    statsVerified:false,
    editorialConfig:[{
      ign:"editorial",
      featuredReason:"editorial",
      roleLabel:{ TR:"Takım Seçimi", EN:"Team Selection" },
      displayOrder:20,
      verified:true,
    }],
  });
  assert.equal(featured.length, 1);
  assert.equal(featured[0].ign, "editorial");
  assert.equal(featured[0].roleLabel.TR, "Takım Seçimi");
});

test("unverified config and unconfirmed captain claims are rejected", () => {
  const featured = getFeaturedPlayers(SQUAD, {
    statsVerified:false,
    editorialConfig:[
      { ign:"editorial", featuredReason:"editorial", displayOrder:10, verified:false },
      { ign:"scorer", featuredReason:"captain", displayOrder:20, verified:true },
    ],
  });
  assert.deepEqual(featured, []);
});

test("featured players never invent missing players and stay capped at four", () => {
  const config = ["captain", "scorer", "creator", "editorial", "missing"].map((ign, index) => ({
    ign,
    featuredReason:ign === "captain" ? "captain" : "editorial",
    displayOrder:index,
    verified:true,
  }));
  const featured = getFeaturedPlayers(SQUAD, { statsVerified:true, editorialConfig:config });
  assert.equal(featured.length, 4);
  assert.ok(featured.every((player) => player.ign !== "missing"));
});

test("invalid squad input returns an empty selection", () => {
  assert.deepEqual(getFeaturedPlayers(null), []);
});
