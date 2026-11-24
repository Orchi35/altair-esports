export const NEX_SOURCE = "https://nexleagues.com/leagues/nex-super-lig";

function spanContent(html, className) {
  const opening=new RegExp(`<span\\b[^>]*class="[^"]*\\b${className}\\b[^"]*"[^>]*>`).exec(html);
  if(!opening) return "";
  const start=opening.index+opening[0].length;
  let depth=1;
  for(const token of html.slice(start).matchAll(/<\/?span\b[^>]*>/g)) {
    depth+=token[0].startsWith("</")?-1:1;
    if(depth===0) return html.slice(start,start+token.index);
  }
  throw new Error("Incomplete Nex markup");
}

export function text(html) {
  const entities = { amp:"&", lt:"<", gt:">", quot:'"', apos:"'", nbsp:" " };
  return html.replace(/<[^>]*>/g, " ").replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (whole, entity) => {
    if (!entity.startsWith("#")) return entities[entity] ?? whole;
    const code = entity[1].toLowerCase() === "x" ? parseInt(entity.slice(2),16) : Number(entity.slice(1));
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
  }).replace(/\s+/g," ").trim();
}

export function parseStandings(html) {
  const table = html.match(/<table\b[^>]*class="nexl-standings"[^>]*>([\s\S]*?)<\/table>/)?.[1];
  if (!table) throw new Error("Nex standings missing");
  const body = table.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/)?.[1] || "";
  const rows = [...body.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)].map(([, row]) => {
    const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map(([,cell])=>cell);
    const team = cells[1]?.match(/<a\b[^>]*href="\/teams\/([\w-]+)"[^>]*>([\s\S]*?)<\/a>/);
    const values = [cells[0],...cells.slice(2)].map(cell => text(cell || ""));
    if (cells.length !== 10 || !team || values.some(value=> !/^-?\d+$/.test(value))) throw new Error("Invalid Nex standing");
    const [position,played,won,drawn,lost,goalsFor,goalsAgainst,goalDifference,points] = values.map(Number);
    if (position < 1 || [played,won,drawn,lost,goalsFor,goalsAgainst].some(n=>n<0) || played !== won+drawn+lost || goalDifference !== goalsFor-goalsAgainst) throw new Error("Inconsistent Nex standing");
    return {slug:team[1],name:text(team[2]),position,played,won,drawn,lost,goalsFor,goalsAgainst,goalDifference,points};
  });
  if (!rows.some(row=>row.slug === "ALT") || new Set(rows.map(row=>row.slug)).size !== rows.length) throw new Error("Incomplete Nex standings");
  return rows;
}

export function parseMatches(html, standings) {
  const list = html.match(/<ul\b[^>]*class="nexl-matches"[^>]*>([\s\S]*?)<\/ul>/)?.[1];
  if (!list) throw new Error("Nex fixtures missing");
  const teams = new Map(standings.map(team=>[team.name,{slug:team.slug,name:team.name}]));
  const matches = [...list.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)].map(([,row])=>{
    const id = row.match(/href="\/leagues\/nex-super-lig\/matches\/([\w-]+)"/)?.[1];
    const time = row.match(/<time\b[^>]*datetime="([^"]+)"/i)?.[1];
    const round = Number(text(row.match(/class="nexl-week-chip"[^>]*>([\s\S]*?)<\/span>/)?.[1] || "").match(/^\d+/)?.[0]);
    const names = [...row.matchAll(/class="nexl-team__name"[^>]*>([\s\S]*?)<\/span>/g)].map(([,name])=>text(name));
    const scoreText = text(spanContent(row,"nexl-score"));
    const scoreMatch = scoreText.match(/^(\d+)\s*[-–—:]\s*(\d+)$/);
    const status = text(spanContent(row,"nexl-badge"));
    const finished = /tamamland|sona erdi|oynand|hükmen|completed|finished/i.test(status);
    if (!id || !round || names.length !== 2 || names.some(name=>!teams.has(name)) || (time && !Number.isFinite(Date.parse(time))) || (finished && !scoreMatch)) throw new Error("Invalid Nex match");
    return { id, round, startsAt:time ? new Date(time).toISOString() : null, homeTeam:teams.get(names[0]), awayTeam:teams.get(names[1]), score:finished ? {home:Number(scoreMatch[1]),away:Number(scoreMatch[2])} : null, status, sourceUrl:`${NEX_SOURCE}/matches/${id}` };
  });
  if (!matches.length || new Set(matches.map(match=>match.id)).size !== matches.length) throw new Error("Incomplete Nex fixtures");
  return matches;
}

export function parseNex(standingsHtml, fixturesHtml, updatedAt = new Date().toISOString()) {
  const standings = parseStandings(standingsHtml);
  const matches = parseMatches(fixturesHtml, standings).filter(match =>
    match.homeTeam.slug === "ALT" || match.awayTeam.slug === "ALT"
  );
  return {status:"fresh",updatedAt,sourceUrl:NEX_SOURCE,season:text(standingsHtml.match(/class="nexl-view-head__eyebrow"[^>]*>([\s\S]*?)<\/p>/)?.[1] || ""),standings,
    fixtures:matches.filter(match=>!match.score).sort((a,b)=>(a.startsAt || "9999").localeCompare(b.startsAt || "9999") || a.round-b.round),
    results:matches.filter(match=>match.score).sort((a,b)=>(b.startsAt || "").localeCompare(a.startsAt || "") || b.round-a.round)};
}
