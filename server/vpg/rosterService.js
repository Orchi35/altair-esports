const BASE = "https://api.virtualprogaming.com/public";
const TTL = 5 * 60 * 1000;
const PAGE_SIZE = 100;
const MAX_PAGES = 20;
let cached = null;
let pending = null;

export function normalizeRoster(rows) {
  if (!Array.isArray(rows)) throw new Error("Invalid VPG roster");
  const active = rows.filter((row) => row.status === "active" && row.team_id === 38650);
  const seen = new Set();
  return active.map((row) => {
    if (!Number.isInteger(row.user_id) || row.user_id <= 0 || typeof row.username !== "string" || !row.username.trim() || seen.has(row.user_id)) throw new Error("Invalid VPG player");
    seen.add(row.user_id);
    return { id:row.user_id, name:row.username.trim(), position:typeof row.position === "string" && row.position.trim() ? row.position.trim() : null, apps:null, goals:null, assists:null, profileUrl:null };
  });
}

async function getJson(path, fetchImpl, signal) {
  const response = await fetchImpl(`${BASE}${path}`, { signal, headers:{ Accept:"application/json" } });
  if (!response.ok) throw new Error("VPG request failed");
  const body = await response.text();
  if (body.length > 2_000_000) throw new Error("VPG response too large");
  return JSON.parse(body);
}

async function leaderboard(type, fetchImpl, signal) {
  const rows = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const payload = await getJson(`/teams/ALTAIR-eSports/leaderboard/?leaderboard=${type}&season=20&limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`, fetchImpl, signal);
    if (!Array.isArray(payload?.data) || payload.data.length > PAGE_SIZE || !Number.isInteger(payload.count) || payload.count < 0) throw new Error("Invalid VPG leaderboard");
    rows.push(...payload.data);
    if (rows.length >= payload.count) return rows;
    if (!payload.data.length) throw new Error("Incomplete VPG leaderboard");
  }
  throw new Error("VPG leaderboard pagination limit reached");
}

function applyStats(players, rows, field) {
  const matches = new Map();
  for (const row of rows) {
    if (row.team_slug !== "ALTAIR-eSports" || typeof row.username !== "string") continue;
    const key = row.username.toLowerCase();
    if (matches.has(key)) matches.set(key, null);
    else matches.set(key, row);
  }
  const names = new Map();
  for (const player of players) names.set(player.name.toLowerCase(), (names.get(player.name.toLowerCase()) || 0) + 1);
  for (const player of players) {
    const key = player.name.toLowerCase();
    const row = names.get(key) === 1 ? matches.get(key) : null;
    if (!row) continue;
    if (Number.isInteger(row[field]) && row[field] >= 0) player[field] = row[field];
    if (Number.isInteger(row.matches_played) && row.matches_played >= 0) player.apps = row.matches_played;
  }
}

export async function fetchVpgRoster({ fetchImpl = fetch, now = () => new Date() } = {}) {
  const signal = AbortSignal.timeout(8000);
  const [contracts, scorers, assists] = await Promise.allSettled([
    getJson("/teams/ALTAIR-eSports/contracts/", fetchImpl, signal),
    leaderboard("top_scorer", fetchImpl, signal), leaderboard("top_assist", fetchImpl, signal),
  ]);
  if (contracts.status !== "fulfilled") throw contracts.reason;
  const players = normalizeRoster(contracts.value);
  if (scorers.status === "fulfilled") applyStats(players, scorers.value, "goals");
  if (assists.status === "fulfilled") applyStats(players, assists.value, "assists");
  return { status:"fresh", updatedAt:now().toISOString(), statsScope:"team-season", statsStatus:scorers.status === "fulfilled" && assists.status === "fulfilled" ? "complete" : "partial", season:20, players };
}

export async function getVpgRoster({ fetchImpl = fetch, now = () => new Date() } = {}) {
  const timestamp = now().getTime();
  if (cached && timestamp - cached.at < TTL) return cached.data;
  if (pending) return pending;
  pending = (async () => {
    try {
      const data = await fetchVpgRoster({ fetchImpl, now });
      if (cached && data.statsStatus === "partial" && cached.data.statsStatus === "complete") return { ...cached.data, status:"stale" };
      cached = { at:timestamp, data };
      return data;
    } catch {
      return cached ? { ...cached.data, status:"stale" } : { status:"unavailable", updatedAt:null, statsScope:"team-season", season:20, players:[] };
    }
  })();
  try { return await pending; } finally { pending = null; }
}
