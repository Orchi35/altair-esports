import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {parseNex,parseStandings} from "../server/nex/parser.js";
import {createNexService} from "../server/nex/service.js";
import {createNexHandler} from "../api/nex.js";

const standings=await readFile(new URL("./fixtures/nex/standings.html",import.meta.url),"utf8");
const fixtures=await readFile(new URL("./fixtures/nex/fixtures.html",import.meta.url),"utf8");
const now=()=>Date.parse("2026-11-21T12:00:00Z");
const offline=async()=>{throw new Error("offline");};
const fetchImpl=async url=>({ok:true,text:async()=>url.includes("?section")?fixtures:standings});

test("Nex public HTML preserves tied ranks, Turkish names, UTC times and scheduled scores",()=>{
  const data=parseNex(standings,fixtures);
  assert.equal(data.standings.length,16);
  assert.ok(data.standings.every(row=>row.position===1));
  assert.equal(data.fixtures.length,8);
  const match=data.fixtures.find(row=>row.homeTeam.slug==="ALT");
  assert.equal(match.awayTeam.name,"BETON UNİTED");
  assert.equal(match.startsAt,"2026-11-24T19:00:00.000Z");
  assert.equal(match.score,null);
  assert.equal(data.results.length,0);
  assert.ok(match.sourceUrl.startsWith("https://nexleagues.com/leagues/nex-super-lig/matches/"));
});

test("completed scores, including 0–0, move to results; live scores do not",()=>{
  const completed=fixtures.replaceAll("Planlandı","Tamamlandı").replaceAll(">VS</span>","><span>0</span> – <span>0</span></span>");
  const data=parseNex(standings,completed);
  assert.equal(data.fixtures.length,0);
  assert.equal(data.results.length,8);
  assert.deepEqual(data.results[0].score,{home:0,away:0});
  assert.equal(parseNex(standings,completed.replaceAll("Tamamlandı","Canlı")).results.length,0);
});

test("broken and partial source markup is rejected instead of publishing invented data",()=>{
  assert.throws(()=>parseStandings("<html>maintenance</html>"));
  assert.throws(()=>parseNex(standings,fixtures.replace("BETON UNİTED</span>","Unknown</span>")));
  assert.throws(()=>parseNex(standings,fixtures.replaceAll("Planlandı","Tamamlandı")));
  assert.throws(()=>parseNex(standings,fixtures.replace("2026-11-24T19:00:00.000Z","bad-date")));
});

test("service deduplicates requests, caches for five minutes and preserves timestamp on outage",async()=>{
  let requests=0, time=now(), fail=false;
  const load=createNexService({now:()=>time,fetchImpl:async url=>{requests++;if(fail)throw new Error();return fetchImpl(url);}});
  const [a,b]=await Promise.all([load(),load()]);
  assert.deepEqual(a,b);
  await load();
  assert.equal(requests,2);
  fail=true; time+=300001;
  const stale=await load();
  assert.equal(stale.status,"stale");
  assert.equal(stale.updatedAt,a.updatedAt);
  assert.deepEqual(stale.standings,a.standings);
});

test("offline service labels the checked-in snapshot and missing snapshot returns unavailable",async()=>{
  const snapshot=await readFile(new URL("../public/data/nex-super-lig.json",import.meta.url),"utf8");
  const data=await createNexService({fetchImpl:offline,now,readSnapshot:async()=>snapshot})();
  assert.equal(data.status,"stale");
  assert.equal(data.fixtures.filter(m=>m.homeTeam.slug==="ALT"||m.awayTeam.slug==="ALT").length,30);
  assert.equal((await createNexService({fetchImpl:offline,readSnapshot:offline})()).status,"unavailable");
});

test("API rejects writes and returns 503 only when no data is available",async()=>{
  let status;
  const res={setHeader(){},status(value){status=value;return this;},json(value){return value;}};
  await createNexHandler(()=>{throw new Error("must not call");})({method:"POST"},res);
  assert.equal(status,405);
  await createNexHandler(async()=>({status:"unavailable"}))({method:"GET"},res);
  assert.equal(status,503);
  await createNexHandler(async()=>({status:"stale"}))({method:"GET"},res);
  assert.equal(status,200);
});
