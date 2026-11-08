import {normalizeMatches,normalizeStandings} from "./service.js";
let cached=null,pending=null;
export function normalizeCupStandings(table){
  if(!Array.isArray(table))throw new Error("Invalid cup table");
  const rows=Array.isArray(table[0]) ? table.find(group=>Array.isArray(group)&&group.some(row=>row.team_slug==="ALTAIR-eSports")) || [] : table;
  return rows.length ? normalizeStandings(rows) : [];
}
export async function fetchVpgCup({fetchImpl=fetch}={}){
  const signal=AbortSignal.timeout(8000);
  async function read(path){
    const response=await fetchImpl(`https://api.virtualprogaming.com/public${path}`,{signal,headers:{Accept:"application/json"}});
    if(!response.ok)throw new Error("Cup unavailable");
    const body=await response.text();if(body.length>2_000_000)throw new Error("Response too large");return JSON.parse(body);
  }
  async function matches(status){
    const rows=[];
    for(let offset=0;offset<2000;offset+=100){
      const payload=await read(`/teams/ALTAIR-eSports/matches/?match_status=${status}&season=20&limit=100&offset=${offset}`);
      if(!Array.isArray(payload.data)||payload.data.length>100)throw new Error("Invalid cup page");
      rows.push(...payload.data);
      if(payload.data.length<100)return normalizeMatches(rows,status,2162).filter(match=>[match.homeTeam.slug,match.awayTeam.slug].includes("ALTAIR-eSports")).map(match=>({...match,competition:"European Pro Series HT"}));
    }
    throw new Error("Pagination exceeded");
  }
  const [fixtures,results,table]=await Promise.all([matches("scheduled"),matches("complete"),read("/tournaments/European-Pro-Series-HT/groups/?season=20")]);
  return {status:"fresh",updatedAt:new Date().toISOString(),fixtures,results,standings:normalizeCupStandings(table)};
}
export async function getVpgCup(){
  if(cached&&Date.now()-cached.at<300000)return cached.data;
  if(pending)return pending;
  pending=(async()=>{try{const data=await fetchVpgCup();cached={at:Date.now(),data};return data;}catch{return cached?{...cached.data,status:"stale"}:{status:"unavailable",fixtures:[],results:[],standings:[]};}})();
  try{return await pending;}finally{pending=null;}
}
