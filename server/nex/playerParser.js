import {text} from "./parser.js";

export const NEX_ROSTER_SOURCE="https://nexleagues.com/teams/ALT?view=kadro&league=nex-super-lig&season=2026";
export const NEX_SEASON="FC 27 1. SEZON";

function numeric(html) {
  const value=text(html);
  if(value==="—" || value==="-") return null;
  if(!/^\d+(?:[.,]\d+)?\*?$/.test(value)) throw new Error("Invalid Nex player statistic");
  return Number(value.replace(/\*$/,"").replace(",","."));
}

export function parseNexRoster(html,updatedAt=new Date().toISOString()) {
  const table=html.match(/<table\b[^>]*class="nxt-table nxt-table--roster"[^>]*>([\s\S]*?)<\/table>/)?.[1];
  const selection=text(html.match(/<span\b[^>]*class="nxt-select__value[^"]*"[^>]*>([\s\S]*?)<\/span>/)?.[1] || "");
  if(!table || selection!==`Nex Süper Lig · ${NEX_SEASON}`) throw new Error("Nex roster scope missing");
  const headers=[...table.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/g)].map(([,cell])=>text(cell));
  if(headers.length!==13 || headers[5]!=="Maç" || headers[6]!=="Gol" || headers[7]!=="Asist" || headers[11]!=="Ort. P.") throw new Error("Nex roster columns changed");
  const players=[...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)].filter(([,row])=>row.includes("<td")).map(([,row])=>{
    const cells=[...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map(([,cell])=>cell);
    const link=cells[1]?.match(/href="\/players\/([\w-]+)"[^>]*>([\s\S]*?)<\/a>/);
    if(cells.length!==13 || !link) throw new Error("Invalid Nex roster row");
    const stats=cells.slice(5,12).map(numeric);
    return {id:link[1],name:text(link[2]),position:text(cells[2])==="—"?null:text(cells[2]),apps:stats[0],goals:stats[1],assists:stats[2],passes:stats[3],tackles:stats[4],manOfMatch:stats[5],averageRating:stats[6],partialStats:cells.slice(5,12).some(cell=>text(cell).includes("*")),sourceUrl:`https://nexleagues.com/players/${link[1]}`};
  });
  if(!players.length || new Set(players.map(player=>player.id)).size!==players.length) throw new Error("Incomplete Nex roster");
  return {status:"fresh",updatedAt,season:NEX_SEASON,sourceUrl:NEX_ROSTER_SOURCE,players};
}

// A player's own recent-match list establishes participation. Joining only the
// current league's ALTAIR results prevents mixing teams, seasons or providers.
export function parseNexPlayerMatches(html,slug,leagueMatches) {
  const canonical=html.match(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/)?.[1];
  if(canonical!==`https://nexleagues.com/players/${slug}`) throw new Error("Nex player identity mismatch");
  const recent=html.match(/<section\b[^>]*aria-labelledby="player-stats-recent-heading"[^>]*>([\s\S]*?)<\/section>/)?.[1];
  if(!recent) throw new Error("Nex player match list missing");
  if(text(recent).includes("Henüz oynanmış bir maç yok.")) return [];
  const ids=new Set([...recent.matchAll(/href="\/leagues\/nex-super-lig\/matches\/([\w-]+)(?:\?[^"]*)?"/g)].map(match=>match[1]));
  // Other Nex competitions may legitimately occupy the recent-match list.
  if(!ids.size && !/href="\/(?:leagues|tournaments)\/[^ "]+\/matches\//.test(recent)) throw new Error("Unrecognized Nex match list");
  return leagueMatches.filter(match=>ids.has(match.id) && match.score && (match.homeTeam.slug==="ALT" || match.awayTeam.slug==="ALT"));
}
