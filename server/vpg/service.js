import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

const BASE = "https://api.virtualprogaming.com/public";
const SNAPSHOT = fileURLToPath(new URL("../../public/data/vpg-elite-b.json", import.meta.url));
const TTL = 5 * 60 * 1000;
const PAGE_SIZE = 100;
const MAX_PAGES = 20;
let cached = null;
let pending = null;

const integer = (value) => Number.isInteger(value) && value >= 0;
const text = (value) => typeof value === "string" && value.trim().length > 0;

export function normalizeMatches(rows, status, tournamentId = null) {
  if (!Array.isArray(rows)) throw new Error("Invalid matches");
  return rows.filter((row) => (tournamentId ? Number(row.tournament_id) === tournamentId : Number(row.league_id) === 1505 && row.tournament_id == null) && Number(row.season) === 20 && row.status === status).map((row) => {
    if (!integer(row.id) || !text(row.datetime) || !Number.isFinite(Date.parse(row.datetime)) || !text(row.home_name) || !text(row.away_name) || !text(row.home_slug) || !text(row.away_slug) || !integer(row.match_day) || (status === "complete" && (!integer(row.home_score) || !integer(row.away_score)))) throw new Error("Invalid match");
    return { id:row.id, startsAt:new Date(row.datetime).toISOString(), homeTeam:{ name:row.home_name, slug:row.home_slug }, awayTeam:{ name:row.away_name, slug:row.away_slug }, score:status === "complete" ? { home:row.home_score, away:row.away_score } : null, round:row.match_day };
  }).sort((a, b) => status === "complete" ? Date.parse(b.startsAt) - Date.parse(a.startsAt) : Date.parse(a.startsAt) - Date.parse(b.startsAt));
}

export function normalizeStandings(rows) {
  if (!Array.isArray(rows) || !rows.length) throw new Error("Invalid standings");
  return rows.map((row, index) => {
    if (!text(row.team_name) || !text(row.team_slug) || ![row.played, row.wins, row.draws, row.losses, row.score_for, row.score_against, row.points].every(integer)) throw new Error("Invalid standing");
    return { position:index + 1, name:row.team_name, slug:row.team_slug, played:row.played, won:row.wins, drawn:row.draws, lost:row.losses, goalDifference:row.score_for - row.score_against, points:row.points };
  });
}

async function getJson(path, fetchImpl, signal) {
  const response = await fetchImpl(`${BASE}${path}`, { signal, headers:{ Accept:"application/json" } });
  if (!response.ok) throw new Error("VPG request failed");
  const body = await response.text();
  if (body.length > 2_000_000) throw new Error("VPG response too large");
  return JSON.parse(body);
}

async function fetchMatches(status, fetchImpl, signal) {
  const all = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const payload = await getJson(`/teams/ALTAIR-eSports/matches/?match_status=${status}&league_id=1505&season=20&limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`, fetchImpl, signal);
    if (!Array.isArray(payload?.data) || payload.data.length > PAGE_SIZE) throw new Error("Invalid VPG page");
    all.push(...payload.data);
    if (payload.data.length < PAGE_SIZE) return normalizeMatches(all, status);
  }
  throw new Error("VPG pagination limit reached");
}

export async function fetchVpg({ fetchImpl = fetch, now = () => new Date() } = {}) {
  const signal = AbortSignal.timeout(10000);
  const [fixtures, results, table] = await Promise.all([
    fetchMatches("scheduled", fetchImpl, signal), fetchMatches("complete", fetchImpl, signal),
    getJson("/leagues/Elite-B/table/?season=20", fetchImpl, signal),
  ]);
  return { status:"fresh", updatedAt:now().toISOString(), fixtures, results, standings:normalizeStandings(table) };
}

export async function getVpg({ fetchImpl = fetch, now = () => new Date(), readSnapshot = () => fs.readFile(SNAPSHOT, "utf8") } = {}) {
  const timestamp = now().getTime();
  if (cached && timestamp - cached.at < TTL) return cached.data;
  if (pending) return pending;
  pending = (async () => {
    try {
      const data = await fetchVpg({ fetchImpl, now });
      cached = { at:timestamp, data };
      return data;
    } catch {
      if (cached) return { ...cached.data, status:"stale" };
      try {
        const data = JSON.parse(await readSnapshot());
        if (!Number.isFinite(Date.parse(data.updatedAt)) || !Array.isArray(data.fixtures) || !Array.isArray(data.results) || !Array.isArray(data.standings) || !data.standings.length) throw new Error("Invalid snapshot");
        return { ...data, status:"stale" };
      } catch {
        return { status:"unavailable", updatedAt:null, fixtures:[], results:[], standings:[] };
      }
    }
  })();
  try { return await pending; } finally { pending = null; }
}
