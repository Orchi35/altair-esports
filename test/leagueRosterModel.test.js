import test from "node:test";
import assert from "node:assert/strict";
import { groupLeaguePlayers, getLeagueLeaders } from "../src/features/squad/leagueRosterModel.js";
import { getLeaguePlayerImage, LEAGUE_PLAYER_IMAGES } from "../src/features/squad/leaguePlayerImages.js";

test("leaders use each metric independently with stable ties and no invented missing values", () => {
  const players = [{ id:2, name:"A", apps:10, goals:5, assists:null }, { id:1, name:"B", apps:10, goals:2, assists:3 }];
  assert.deepEqual(getLeagueLeaders(players).map(item => item.player.id), [1, 2, 1]);
  assert.equal(getLeagueLeaders([{ id:1, name:"A", apps:0 }])[0].player.apps, 0);
  assert.equal(getLeagueLeaders(players.map(player => ({ ...player, assists:null })))[2].player, null);
  assert.equal(players[0].id, 2);
});

test("groups every player once in field order, retaining unknown positions", () => {
  const players = [{ id:1, name:"Striker", position:"ST" }, { id:2, name:"Keeper", position:"gk" }, { id:3, name:"Unknown" }, { id:4, name:"Mid", position:"CM" }, { id:5, name:"Back", position:"CB" }];
  const groups = groupLeaguePlayers(players);
  assert.deepEqual(groups.map(group => group.id), ["keepers", "defenders", "midfielders", "forwards", "other"]);
  assert.equal(groups.flatMap(group => group.players).length, players.length);
  assert.equal(players[0].id, 1);
  assert.equal(groupLeaguePlayers(players, "en")[0].label, "Goalkeepers");
});

test("artwork is isolated by league and stable player ID", () => {
  LEAGUE_PLAYER_IMAGES.vpg.test = { src:"/players/example.webp" };
  try {
    assert.equal(getLeaguePlayerImage("vpg", "test").src, "/players/example.webp");
    assert.equal(getLeaguePlayerImage("nex", "test"), null);
    assert.equal(getLeaguePlayerImage("vpg", "missing"), null);
  } finally { delete LEAGUE_PLAYER_IMAGES.vpg.test; }
});
