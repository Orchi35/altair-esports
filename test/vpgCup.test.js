import test from "node:test";
import assert from "node:assert/strict";
import {fetchVpgCup,normalizeCupStandings} from "../server/vpg/cupService.js";
import {normalizeMatchDetail} from "../server/vpg/matchService.js";
const cup={id:1,home_id:38650,away_id:2,home_name:"ALTAIR",away_name:"Other",home_slug:"ALTAIR-eSports",away_slug:"other",league_id:null,tournament_id:2162,season:20,datetime:"2026-11-12T23:25:00+03:00",status:"complete",home_score:1,away_score:0,match_day:1};
test("cup standings select ALTAIR's group without combining unrelated groups",()=>{
 const row={team_name:"ALTAIR eSports",team_slug:"ALTAIR-eSports",played:2,wins:2,draws:0,losses:0,score_for:4,score_against:0,points:6};
 const result=normalizeCupStandings([[{...row,team_slug:"other"}],[row]]);
 assert.equal(result.length,1);assert.equal(result[0].slug,"ALTAIR-eSports");assert.equal(result[0].points,6);
});
test("cup feed excludes Elite B and other tournaments",async()=>{
 const fetchImpl=async url=>({ok:true,text:async()=>JSON.stringify(url.includes('/groups/')?[]:{data:[cup,{...cup,id:2,tournament_id:999},{...cup,id:3,tournament_id:null,league_id:1505}]})});
 const data=await fetchVpgCup({fetchImpl});
 assert.equal(data.results.length,1);assert.equal(data.fixtures.length,0);assert.equal(data.results[0].competition,'European Pro Series HT');
});
test("cup details are accepted without mislabelling them Elite B",()=>{
 assert.equal(normalizeMatchDetail(cup,[]).competition,'European Pro Series HT');
 assert.throws(()=>normalizeMatchDetail({...cup,tournament_id:999},[]));
});
