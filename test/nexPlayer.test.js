import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {parseNexRoster,parseNexPlayerMatches} from "../server/nex/playerParser.js";
import {NEX_PLAYER_LINKS} from "../server/nex/playerLinks.js";
import {createNexRosterService,createNexPlayerService} from "../server/nex/playerService.js";
import {createNexPlayerHandler} from "../api/nex-player.js";

const rosterHtml=await readFile(new URL("./fixtures/nex/roster.html",import.meta.url),"utf8");
const playerHtml=await readFile(new URL("./fixtures/nex/player.html",import.meta.url),"utf8");
const slug="p-pjar6nvy4gqa";
const roster=parseNexRoster(rosterHtml);
const offline=async()=>{throw new Error("offline");};
const fixture={id:"test-match",homeTeam:{slug:"ALT",name:"ALTAIR"},awayTeam:{slug:"BTN",name:"BETON"},score:{home:2,away:1}};
const recentHtml=(links)=>`<link rel="canonical" href="https://nexleagues.com/players/${slug}"/><section aria-labelledby="player-stats-recent-heading">${links.map(id=>`<a href="/leagues/nex-super-lig/matches/${id}">Match</a>`).join("")}</section>`;

test("Nex roster preserves unpublished values and refuses an all-time or changed column scope",()=>{
  assert.equal(roster.players.length,15);
  assert.equal(roster.players.find(p=>p.id===slug).apps,null);
  assert.equal(roster.players.find(p=>p.id===slug).goals,null);
  assert.throws(()=>parseNexRoster(rosterHtml.replace("Nex Süper Lig · FC 27 1. SEZON","Tüm Zamanlar")));
  assert.throws(()=>parseNexRoster(rosterHtml.replace(">Asist</th>",">Other</th>")));
  const updated=rosterHtml.replace(/>—<\/td>/g,">0</td>");
  assert.equal(parseNexRoster(updated).players[0].apps,0);
});

test("verified provider IDs include renamed players, never fuzzy display-name matches",()=>{
  assert.equal(NEX_PLAYER_LINKS["893787"].slug,"p-oysqpjhierno");
  assert.equal(NEX_PLAYER_LINKS["893787"].handle,"GK-mcbbt");
  assert.equal(NEX_PLAYER_LINKS["927200"].slug,"p-mtvcurok2awq");
  assert.equal(NEX_PLAYER_LINKS["887118"],undefined);
  assert.equal(new Set(Object.values(NEX_PLAYER_LINKS).map(p=>p.slug)).size,Object.keys(NEX_PLAYER_LINKS).length);
});

test("player match list cannot include other players, teams, seasons, providers or scheduled fixtures",()=>{
  assert.deepEqual(parseNexPlayerMatches(playerHtml,slug,[fixture]),[]);
  const html=recentHtml(["test-match","away-team","scheduled","old-season","test-match"]);
  const matches=parseNexPlayerMatches(html,slug,[fixture,{...fixture,id:"away-team",homeTeam:{slug:"NOT-ALT"}},{...fixture,id:"scheduled",score:null}]);
  assert.deepEqual(matches,[fixture]);
  assert.throws(()=>parseNexPlayerMatches(html,"different-player",[fixture]));
  assert.throws(()=>parseNexPlayerMatches("broken",slug,[fixture]));
});

test("Nex player service handles unmapped/invalid IDs without requests and keeps provider stats separate",async()=>{
  const none=createNexPlayerService({rosterLoader:offline,leagueLoader:offline,fetchImpl:offline});
  assert.equal((await none("../test")).status,"invalid");
  assert.equal((await none("887118")).status,"unlinked");
  let calls=0;
  const service=createNexPlayerService({rosterLoader:async()=>roster,leagueLoader:async()=>({status:"fresh",results:[fixture]}),fetchImpl:async()=>{calls++;return {ok:true,text:async()=>recentHtml([fixture.id])};}});
  const [a,b]=await Promise.all([service("732864"),service("732864")]);
  assert.deepEqual(a,b);
  assert.equal(calls,1);
  assert.equal(a.player.id,slug);
  assert.equal(a.player.apps,null);
  assert.equal(a.player.matches.length,1);
  assert.equal(a.player.matchesAvailable,true);
  assert.equal((await service("893787")).player.name,"Mehmetcan");
});

test("missing Nex history is explicitly unavailable and a failed roster preserves the last profile",async()=>{
  let fail=false,now=0;
  const service=createNexPlayerService({now:()=>now,rosterLoader:async()=>fail?{status:"unavailable"}:roster,leagueLoader:async()=>({status:"fresh",results:[]}),fetchImpl:offline});
  const data=await service("732864");
  assert.equal(data.player.matchesAvailable,false);
  fail=true;now=300001;
  const stale=await service("732864");
  assert.equal(stale.status,"stale");
  assert.equal(stale.updatedAt,data.updatedAt);
  assert.deepEqual(stale.player,data.player);
});

test("roster returns only live source data and retains the last successful response on outage",async()=>{
  let time=0,online=false;
  const load=createNexRosterService({now:()=>time,fetchImpl:async()=>{
    if(!online) return offline();
    return {ok:true,text:async()=>rosterHtml};
  }});
  assert.equal((await load()).status,"unavailable");
  online=true; time+=60000;
  const fresh=await load();
  assert.equal(fresh.status,"fresh");
  assert.equal(fresh.players.find(p=>p.id===slug).profileId,"732864");
  online=false; time+=300000;
  const stale=await load();
  assert.equal(stale.status,"stale");
  assert.equal(stale.updatedAt,fresh.updatedAt);
  assert.deepEqual(stale.players,fresh.players);
});

test("Nex player API disallows writes and preserves explicit unlinked/unavailable responses",async()=>{
  let code;
  const response={setHeader(){},status(value){code=value;return this;},json(value){return value;}};
  await createNexPlayerHandler(offline)({method:"POST"},response);
  assert.equal(code,405);
  await createNexPlayerHandler(async id=>{assert.equal(id,"893787");return {status:"unavailable"};})({method:"GET",url:"/api/nex-player?id=893787"},response);
  assert.equal(code,503);
  await createNexPlayerHandler(async()=>({status:"unlinked",player:null}))({method:"GET",url:"/api/nex-player?id=887118"},response);
  assert.equal(code,200);
});
