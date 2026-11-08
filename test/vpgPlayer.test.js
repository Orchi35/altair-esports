import test from "node:test";
import assert from "node:assert/strict";
import {normalizePlayerProfile,fetchPlayerProfile,getPlayerProfile} from "../server/vpg/playerService.js";
const player={id:1,name:"Player",apps:2,goals:0,assists:1};
test("profile only exposes selected public fields and own ALTAIR matches",()=>{
  const row={user_id:1,team_id:38650,match_id:1,goals:0,assists:1,match_rating:8,saves:0};
  const result=normalizePlayerProfile(player,{id:1,username:"Player",email:"private@example.test",given_name:"Test",family_name:"Player",psn:"GameName",date_joined:"2025-01-01"},[row,row,{...row,match_id:2,user_id:2},{...row,match_id:3,team_id:5}]);
  assert.equal(result.matches.length,1);
  assert.equal(result.totals.goals,0);
  assert.equal(result.totals.shots,null);
  assert.equal(result.averageRating,8);
  assert.equal(result.fullName,"Test Player");
  assert.equal(result.accounts.playstation,"GameName");
  assert.equal("email" in result,false);
  assert.throws(()=>normalizePlayerProfile(player,{id:2},[]));
});
test("profile keeps unknown statistics missing and only resolves active roster IDs",async()=>{
  const result=normalizePlayerProfile(player,null,null);
  assert.equal(result.totals.goals,null);
  assert.equal(result.averageRating,null);
  assert.equal(result.statsAvailable,false);
  assert.equal((await getPlayerProfile('../test')).status,'invalid');
  const missing=await fetchPlayerProfile(2,{rosterLoader:async()=>({status:"fresh",players:[player]}),fetchImpl:()=>{throw new Error("must not fetch");}});
  assert.equal(missing.status,"not-found");
});
