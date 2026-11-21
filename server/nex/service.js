import { readFile } from "node:fs/promises";
import { NEX_SOURCE, parseNex } from "./parser.js";

const snapshotUrl = new URL("../../public/data/nex-super-lig.json", import.meta.url);
export function createNexService({fetchImpl=fetch,now=Date.now,readSnapshot=()=>readFile(snapshotUrl,"utf8")}={}) {
  let cache=null, pending=null, lastAttempt=-Infinity;
  async function refresh() {
    const controller = new AbortController();
    const timer = setTimeout(()=>controller.abort(),8000);
    try {
      const pages = await Promise.all([NEX_SOURCE,`${NEX_SOURCE}?section=fixtures`].map(async url=>{
        const response=await fetchImpl(url,{signal:controller.signal,headers:{Accept:"text/html"}});
        if (!response.ok) throw new Error("Nex unavailable");
        const html=await response.text();
        if (html.length > 4_000_000) throw new Error("Nex response too large");
        return html;
      }));
      cache=parseNex(...pages,new Date(now()).toISOString());
    } catch {
      if (!cache) {
        try {
          const saved=JSON.parse(await readSnapshot());
          if (saved.sourceUrl === NEX_SOURCE && Number.isFinite(Date.parse(saved.updatedAt)) && saved.standings?.some(row=>row.slug==="ALT") && Array.isArray(saved.fixtures) && Array.isArray(saved.results)) cache=saved;
        } catch { /* The unavailable state is returned when no verified copy exists. */ }
      }
      if(cache) cache={...cache,status:"stale"};
    } finally { clearTimeout(timer); }
    return cache || {status:"unavailable",updatedAt:null,standings:[],fixtures:[],results:[]};
  }
  return function getNex() {
    if(pending) return pending;
    if(cache && now()-lastAttempt < 5*60*1000) return Promise.resolve(cache);
    lastAttempt=now();
    pending=refresh().finally(()=>{pending=null;});
    return pending;
  };
}
export const getNex=createNexService();
