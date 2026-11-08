import {getVpgRoster} from "./rosterService.js";
const cache=new Map();
const pending=new Map();
const fields=["match_rating","goals","assists","shots","passes_made","tackles_made","saves","clean_sheet","yellow_card","red_card"];
const value=number => typeof number === "number" && Number.isFinite(number) && number >= 0 ? number : null;
const text=input => typeof input === "string" && input.trim() ? input.trim() : null;

export function normalizePlayerProfile(player, profile, rows) {
  if (profile && profile.id !== player.id) throw new Error("Player identity mismatch");
  const seen=new Set();
  const matches=(Array.isArray(rows) ? rows : []).filter(row => {
    if (row.user_id !== player.id || row.team_id !== 38650 || !Number.isSafeInteger(row.match_id) || seen.has(row.match_id)) return false;
    seen.add(row.match_id);return true;
  }).map(row => ({id:row.match_id,position:text(row.position),...Object.fromEntries(fields.map(field => [field,value(row[field])]))}));
  const totals=Object.fromEntries(fields.filter(field => field !== "match_rating").map(field => [field,matches.length && matches.every(match => match[field] !== null) ? matches.reduce((sum,match) => sum+match[field],0) : null]));
  const ratings=matches.map(match=>match.match_rating).filter(number=>number !== null);
  return {
    ...player,
    fullName:profile ? [text(profile.given_name),text(profile.family_name)].filter(Boolean).join(" ") || null : null,
    nationality:text(profile?.nationality),bio:text(profile?.bio),
    joinedAt:profile?.date_joined && Number.isFinite(Date.parse(profile.date_joined)) ? new Date(profile.date_joined).toISOString() : null,
    accounts:{playstation:text(profile?.psn),xbox:text(profile?.xbox),ea:text(profile?.origin)},
    totals,averageRating:ratings.length ? Number((ratings.reduce((sum,rating)=>sum+rating,0)/ratings.length).toFixed(2)) : null,
    matches,statsAvailable:Array.isArray(rows),profileAvailable:Boolean(profile),
  };
}

export async function fetchPlayerProfile(id,{rosterLoader=getVpgRoster,fetchImpl=fetch}={}) {
  const roster=await rosterLoader();
  if(roster.status === "unavailable") return {status:"unavailable",player:null};
  const player=roster.players.find(item=>String(item.id)===String(id));
  if(!player) return {status:roster.status === "stale" ? "unavailable" : "not-found",player:null};
  const signal=AbortSignal.timeout(8000);
  async function read(suffix) {
    const response=await fetchImpl(`https://api.virtualprogaming.com/public/users/${encodeURIComponent(player.name)}/${suffix}`,{signal,headers:{Accept:"application/json"}});
    if(!response.ok) throw new Error("Unavailable");
    const body=await response.text();
    if(body.length>2_000_000) throw new Error("Response too large");
    return JSON.parse(body);
  }
  const [profile,stats]=await Promise.allSettled([read(""),read("match_data/?season=20")]);
  const normalized=normalizePlayerProfile(player,profile.status === "fulfilled" ? profile.value : null,stats.status === "fulfilled" ? stats.value : null);
  return {status:roster.status,updatedAt:new Date().toISOString(),season:20,partial:!normalized.profileAvailable || !normalized.statsAvailable,player:normalized};
}

export async function getPlayerProfile(id) {
  if(!/^[1-9]\d{0,9}$/.test(String(id))) return {status:"invalid",player:null};
  const key=String(id),old=cache.get(key);
  if(old && Date.now()-old.at<(old.data.partial ? 30000 : 300000)) return old.data;
  if(pending.has(key)) return pending.get(key);
  const task=(async()=>{
    try {
      const data=await fetchPlayerProfile(id);
      if(old && (!data.player || data.partial)) return {...old.data,status:"stale"};
      if(data.player){if(cache.size>=100)cache.delete(cache.keys().next().value);cache.set(key,{at:Date.now(),data});}
      return data;
    } catch {return old ? {...old.data,status:"stale"} : {status:"unavailable",player:null};}
    finally {pending.delete(key);}
  })();
  pending.set(key,task);return task;
}
