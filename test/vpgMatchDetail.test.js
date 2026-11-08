import test from "node:test";
import assert from "node:assert/strict";
import { normalizeMatchDetail, fetchMatchDetail, getMatchDetail } from "../server/vpg/matchService.js";
import { toVpgMatch } from "../src/pages/matches/vpgMatchModel.js";
import { createMatchSlug } from "../src/content/matches/index.js";
const row = {id:123, home_id:38650,away_id:2,home_name:"ALTAIR",away_name:"Other",home_slug:"ALTAIR-eSports",away_slug:"other",league_id:1505,season:20,datetime:"2026-11-06T00:15:00+03:00",status:"complete",home_score:2,away_score:1};
test("detail only accepts ALTAIR Elite B season matches and preserves missing values", () => {
  const detail = normalizeMatchDetail(row,[{user_id:1,username:"Player",team_id:38650,match_id:123,goals:0,assists:null},{user_id:2,username:"Unrelated",team_id:3,match_id:123}]);
  assert.equal(detail.players.length,1);
  assert.equal(detail.players[0].goals,0);
  assert.equal(detail.players[0].assists,null);
  assert.deepEqual(detail.score,{home:2,away:1});
  assert.throws(() => normalizeMatchDetail({...row,home_id:3},[]));
  assert.equal(normalizeMatchDetail({...row,status:"scheduled"},null).score,null);
});
test("summary survives player-stat failure and rejects a mismatched match ID",async () => {
  const fetchImpl = async url => { if(url.endsWith('/data/')) throw new Error('offline'); return {ok:true,text:async()=>JSON.stringify(row)}; };
  const result=await fetchMatchDetail(123,{fetchImpl});
  assert.equal(result.match.statsAvailable,false);
  await assert.rejects(fetchMatchDetail(124,{fetchImpl}));
  assert.equal((await getMatchDetail('../test')).status,'invalid');
});
test("VPG cards use distinct localized detail slugs", () => {
  const match=toVpgMatch({id:123,homeTeam:{slug:"ALTAIR-eSports",name:"ALTAIR"},awayTeam:{slug:"other",name:"Other"},score:{home:2,away:1}});
  assert.equal(createMatchSlug(match),'match-vpg-123');
  assert.equal(match.status,'finished');
  assert.equal(match.homeTeam.logo,'/logo-ui.png');
});
