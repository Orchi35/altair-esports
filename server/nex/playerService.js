import {createNexFeed,readNexPage} from "./liveSource.js";
import {getNex} from "./service.js";
import {NEX_PLAYER_LINKS} from "./playerLinks.js";
import {NEX_ROSTER_SOURCE,parseNexRoster,parseNexPlayerMatches} from "./playerParser.js";

const profileIds = new Map(Object.entries(NEX_PLAYER_LINKS).map(([id, link]) => [link.slug, id]));

export function createNexRosterService({fetchImpl=fetch,now=Date.now}={}) {
  return createNexFeed("roster", async () => {
    const html = await readNexPage(NEX_ROSTER_SOURCE, fetchImpl);
    const roster = parseNexRoster(html, new Date(now()).toISOString());
    return { ...roster, players: roster.players.map(player => ({
      ...player, profileId: profileIds.get(player.id) ?? null,
    })) };
  }, { status:"unavailable", updatedAt:null, players:[] }, now);
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
          rosterLoader(),leagueLoader(),readNexPage(`https://nexleagues.com/players/${link.slug}?view=istatistikler`,fetchImpl).catch(()=>null),
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
