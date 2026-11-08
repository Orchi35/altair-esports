const BASE = "https://api.virtualprogaming.com/public";
const cache = new Map();
const pending = new Map();
const number = value => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;

export function normalizeMatchDetail(row, stats) {
  if (!row || !Number.isSafeInteger(row.id) || ![row.home_id, row.away_id].includes(38650) || !(row.tournament_id === 2162 || row.league_id === 1505 && row.tournament_id == null) || row.season !== 20 || !Number.isFinite(Date.parse(row.datetime)) || !row.home_name || !row.away_name) throw new Error("Invalid ALTAIR match");
  const team = side => ({ id:row[`${side}_id`], name:row[`${side}_name`], slug:row[`${side}_slug`], formation:row[`${side}_formation`] || null });
  const fields = ["match_rating", "goals", "assists", "shots", "passes_made", "tackles_made", "saves", "yellow_card", "red_card"];
  return {
    id:row.id, startsAt:new Date(row.datetime).toISOString(), round:row.match_day, season:row.season, competition:row.tournament_id === 2162 ? "European Pro Series HT" : "Elite B", status:row.status,
    homeTeam:team("home"), awayTeam:team("away"), score:row.status === "complete" && number(row.home_score) !== null && number(row.away_score) !== null ? { home:row.home_score, away:row.away_score } : null,
    statsAvailable:Array.isArray(stats),
    players:(Array.isArray(stats) ? stats : []).filter(player => player.match_id === row.id && [row.home_id, row.away_id].includes(player.team_id) && Number.isSafeInteger(player.user_id) && typeof player.username === "string").map(player => ({ id:player.user_id, teamId:player.team_id, name:player.username, position:player.position || null, order:number(player.position_idx) ?? 99, ...Object.fromEntries(fields.map(field => [field, number(player[field])])) })).sort((a,b) => a.order - b.order || a.id - b.id),
  };
}

export async function fetchMatchDetail(id, { fetchImpl = fetch } = {}) {
  const signal = AbortSignal.timeout(8000);
  async function read(suffix) {
    const response = await fetchImpl(`${BASE}/matches/${id}/${suffix}`, { signal, headers:{Accept:"application/json"} });
    if (response.status === 404) throw new Error("NOT_FOUND");
    if (!response.ok) throw new Error("Unavailable");
    const body = await response.text();
    if (body.length > 2_000_000) throw new Error("Response too large");
    return JSON.parse(body);
  }
  const [match, stats] = await Promise.allSettled([read(""), read("data/")]);
  if (match.status === "rejected") throw match.reason;
  const normalized = normalizeMatchDetail(match.value, stats.status === "fulfilled" ? stats.value : null);
  if (normalized.id !== Number(id)) throw new Error("Invalid match ID");
  return {status:"fresh", updatedAt:new Date().toISOString(), match:normalized};
}

export async function getMatchDetail(id) {
  if (!/^[1-9]\d{0,9}$/.test(String(id))) return {status:"invalid", match:null};
  const cached = cache.get(String(id));
  if (cached && Date.now() - cached.at < (cached.data.match.statsAvailable ? 300000 : 30000)) return cached.data;
  if (pending.has(String(id))) return pending.get(String(id));
  const request = (async () => {
    try {
      const data = await fetchMatchDetail(id);
      if (!data.match.statsAvailable && cached?.data.match.statsAvailable) return {...cached.data,status:"stale"};
      if (cache.size >= 100) cache.delete(cache.keys().next().value);
      cache.set(String(id), {at:Date.now(), data});
      return data;
    } catch(error) {
      return cached ? {...cached.data, status:"stale"} : {status:error.message === "NOT_FOUND" || error.message === "Invalid ALTAIR match" ? "not-found" : "unavailable", match:null};
    } finally { pending.delete(String(id)); }
  })();
  pending.set(String(id), request);
  return request;
}
