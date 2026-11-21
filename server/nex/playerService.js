import {readFile} from "node:fs/promises";
import {getNex} from "./service.js";
import {NEX_PLAYER_LINKS} from "./playerLinks.js";
import {NEX_ROSTER_SOURCE,parseNexRoster,parseNexPlayerMatches} from "./playerParser.js";

async function readPage(url,fetchImpl) {
  const response=await fetchImpl(url,{signal:AbortSignal.timeout(8000),headers:{Accept:"text/html"}});
  if(!response.ok) throw new Error("Nex unavailable");
  const html=await response.text();
  if(html.length>4_000_000) throw new Error("Nex response too large");
  return html;
}

export function createNexRosterService({fetchImpl=fetch,now=Date.now,readSnapshot=()=>readFile(new URL("../../public/data/nex-roster.json",import.meta.url),"utf8")}={}) {
  let cached=null,pending=null,lastAttempt=-Infinity;
  return function load() {
    if(pending) return pending;
    if(cached && now()-lastAttempt<300000) return Promise.resolve(cached);
    lastAttempt=now();
    pending=(async()=>{
      try {cached=parseNexRoster(await readPage(NEX_ROSTER_SOURCE,fetchImpl),new Date(now()).toISOString());}
      catch {
        if(!cached) try {
          const saved=JSON.parse(await readSnapshot());
          if(saved.sourceUrl===NEX_ROSTER_SOURCE && Array.isArray(saved.players) && saved.players.length && Number.isFinite(Date.parse(saved.updatedAt))) cached=saved;
        } catch { /* Report unavailable when there is no verified snapshot. */ }
        if(cached) cached={...cached,status:"stale"};
      }
      return cached || {status:"unavailable",players:[]};
    })().finally(()=>{pending=null;});
    return pending;
  };
}
export const getNexRoster=createNexRosterService();

export function createNexPlayerService({rosterLoader=getNexRoster,leagueLoader=getNex,fetchImpl=fetch,now=Date.now}={}) {
  const cache=new Map(),pending=new Map();
  return async function load(id) {
    if(!/^[1-9]\d{0,9}$/.test(String(id))) return {status:"invalid",player:null};
    const link=NEX_PLAYER_LINKS[id];
    if(!link) return {status:"unlinked",player:null};
    const old=cache.get(String(id));
    if(old && now()-old.at<300000) return old.data;
    if(pending.has(String(id))) return pending.get(String(id));
    const task=(async()=>{
      try {
        const [roster,league,profile]=await Promise.all([
          rosterLoader(),leagueLoader(),readPage(`https://nexleagues.com/players/${link.slug}?view=istatistikler`,fetchImpl).catch(()=>null),
        ]);
        if(roster.status==="unavailable") throw new Error("Roster unavailable");
        const player=roster.players.find(row=>row.id===link.slug);
        if(!player) {
          if(roster.status==="stale") throw new Error("Stale roster");
          return {status:"not-in-roster",player:null};
        }
        let matches=[],matchesAvailable=false;
        if(profile && league.status!=="unavailable") try {matches=parseNexPlayerMatches(profile,link.slug,league.results);matchesAvailable=true;} catch { /* Never substitute team fixtures for player appearances. */ }
        const data={status:roster.status==="stale" || league.status==="stale"?"stale":"fresh",updatedAt:roster.updatedAt,season:roster.season,player:{...player,handle:link.handle,matches,matchesAvailable}};
        cache.set(String(id),{at:now(),data});
        return data;
      } catch {return old?{...old.data,status:"stale"}:{status:"unavailable",player:null};}
      finally {pending.delete(String(id));}
    })();
    pending.set(String(id),task);
    return task;
  };
}
export const getNexPlayer=createNexPlayerService();
