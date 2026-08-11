import { useEffect, useState } from "react";
import { EML_TEAM_PATH } from "../config/competition.js";
import { CANONICAL_SQUAD, SQUAD } from "../data/squad.js";
import { createLiveSquadStatsSnapshot, mergeSquadWithStats } from "../data/squadStats.js";
import { getSnapshotDate, isSiteSnapshotValid, readSiteSnapshot } from "../data/siteSnapshot.js";

const SQUAD_CACHE_KEY = "altair_squad_stats_v7";
const SQUAD_CACHE_MAX = 15 * 60 * 1000;
const SQUAD_CACHE_VALIDITY = 24 * 60 * 60 * 1000;
const SQUAD_POLL_MS = 5 * 60 * 1000;
const TEAM_PAGE_PATH = EML_TEAM_PATH;
const SQUAD_ROUTE_RE = /href=["']([^"'#?]*\/teams\/team\/\d+\/\d+\/\d+\/squad[^"'#?]*)["']/gi;
const POSITION_META = {
  GK:  { group:"Goalkeepers", role:"Goalkeeper" },
  LB:  { group:"Defenders", role:"Left-Back" },
  LWB: { group:"Defenders", role:"Left Wing-Back" },
  CB:  { group:"Defenders", role:"Centre-Back" },
  RB:  { group:"Defenders", role:"Right-Back" },
  RWB: { group:"Defenders", role:"Right Wing-Back" },
  CDM: { group:"Midfielders", role:"Defensive Midfielder" },
  CM:  { group:"Midfielders", role:"Central Midfielder" },
  CAM: { group:"Midfielders", role:"Attacking Midfielder" },
  LM:  { group:"Midfielders", role:"Left Midfielder" },
  RM:  { group:"Midfielders", role:"Right Midfielder" },
  LW:  { group:"Forwards", role:"Left Winger" },
  RW:  { group:"Forwards", role:"Right Winger" },
  CF:  { group:"Forwards", role:"Centre-Forward" },
  ST:  { group:"Forwards", role:"Striker" },
};

function canonicalizeIgn(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&[a-z0-9#]+;/gi, "")
    .replace(/[^a-z0-9]+/gi, "")
    .toLowerCase();
}

function decodeHtmlValue(value) {
  return String(value || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&uuml;/gi, "u")
    .replace(/&ouml;/gi, "o")
    .replace(/&ccedil;/gi, "c")
    .replace(/&Uuml;/gi, "U")
    .replace(/&Ouml;/gi, "O")
    .replace(/&Ccedil;/gi, "C")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([a-f0-9]+);/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16)));
}

function stripHtmlTags(value) {
  return decodeHtmlValue(String(value || "").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSquadPosition(value) {
  const position = stripHtmlTags(value).toUpperCase().replace(/[^A-Z]/g, "");
  return POSITION_META[position] ? position : "";
}

function findBestSquadRosterTable(html) {
  const tables = html.match(/<table\b[\s\S]*?<\/table>/gi) || [];
  let bestTable = null;
  let bestScore = 0;

  for (const tableHtml of tables) {
    const rows = tableHtml.match(/<tr\b[\s\S]*?<\/tr>/gi) || [];
    const score = rows.reduce((count, rowHtml) => {
      const cells = [...rowHtml.matchAll(/<t[dh]\b[\s\S]*?<\/t[dh]>/gi)].map((match) => stripHtmlTags(match[0]));
      const position = normalizeSquadPosition(cells[0]);
      const ign = cells[1] || "";
      return count + (position && canonicalizeIgn(ign) && !/^\d+$/.test(ign) ? 1 : 0);
    }, 0);

    if (score > bestScore) {
      bestScore = score;
      bestTable = tableHtml;
    }
  }

  return bestScore >= 5 ? bestTable : null;
}

function parseSquadRosterTable(tableHtml) {
  const roster = [];
  const seen = new Set();
  const rowMatches = tableHtml.match(/<tr\b[\s\S]*?<\/tr>/gi) || [];

  for (const rowHtml of rowMatches) {
    const cellHtml = [...rowHtml.matchAll(/<t[dh]\b[\s\S]*?<\/t[dh]>/gi)].map((match) => match[0]);
    const cells = cellHtml.map((cell) => stripHtmlTags(cell));
    if (cells.length < 2) continue;

    const pos = normalizeSquadPosition(cells[0]);
    const ign = cells[1]?.trim();
    const key = canonicalizeIgn(ign);
    if (!pos || !key || seen.has(key) || /^\d+$/.test(ign)) continue;

    const profileHref = cellHtml[1]?.match(/href=["']([^"']+)["']/i)?.[1] || "";
    const numericCells = cells
      .slice(2)
      .map((cell) => {
        const normalized = cell.replace(",", ".").trim();
        return /^\d+(\.\d+)?$/.test(normalized) ? Number(normalized) : null;
      })
      .filter((value) => value !== null);

    seen.add(key);
    roster.push({
      ign,
      pos,
      apps:numericCells.length >= 3 ? Number(numericCells[0]) : null,
      goals:numericCells.length >= 3 ? Number(numericCells[1]) : null,
      assists:numericCells.length >= 3 ? Number(numericCells[2]) : null,
      profileUrl:profileHref
        ? new URL(profileHref, "https://emajorleague.com").toString()
        : "",
    });
  }

  return roster;
}

function resolveSquadStatsPath(html) {
  const paths = [];
  for (const match of html.matchAll(SQUAD_ROUTE_RE)) {
    paths.push(match[1]);
  }

  const uniquePaths = [...new Set(paths)];
  uniquePaths.sort((left, right) => right.localeCompare(left));
  return uniquePaths[0] || null;
}

export function buildLiveStatsSnapshot(roster, options = {}) {
  return createLiveSquadStatsSnapshot(CANONICAL_SQUAD, roster, options);
}

export function buildLiveSquad(baseSquad, roster, options = {}) {
  const statsSnapshot = buildLiveStatsSnapshot(roster, options);
  return mergeSquadWithStats(baseSquad, statsSnapshot, options.now).squad;
}

function readSquadCache(allowStale = false) {
  try {
    const raw = localStorage.getItem(SQUAD_CACHE_KEY);
    if (!raw) return null;
    const { ts, validUntil, data } = JSON.parse(raw);
    const validUntilTimestamp = Date.parse(validUntil || "");
    const now = Date.now();
    if (!Number.isFinite(ts) || !Number.isFinite(validUntilTimestamp) || now >= validUntilTimestamp) {
      localStorage.removeItem(SQUAD_CACHE_KEY);
      return null;
    }
    if (allowStale || now - ts < SQUAD_CACHE_MAX) {
      return { ts, validUntil, data };
    }
  } catch { /**/ }
  return null;
}

function writeSquadCache(data) {
  try {
    const ts = Date.now();
    const validUntil = data?.validUntil || new Date(ts + SQUAD_CACHE_VALIDITY).toISOString();
    localStorage.setItem(SQUAD_CACHE_KEY, JSON.stringify({ ts, validUntil, data }));
  } catch { /**/ }
}

export function useSquadStats() {
  const [squad, setSquad] = useState(SQUAD);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [tick, setTick] = useState(0);

  const refetch = () => {
    localStorage.removeItem(SQUAD_CACHE_KEY);
    setTick((value) => value + 1);
  };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const cached = readSquadCache();
      if (cached) {
        if (!cancelled) {
          const merged = mergeSquadWithStats(SQUAD, cached.data);
          setSquad(merged.squad);
          setLastUpdate(merged.lastVerifiedAt ? new Date(merged.lastVerifiedAt) : null);
          setLoading(false);
        }
        return;
      }

      try {
        const freshQuery = `&fresh=1&ts=${Date.now()}`;
        const teamRes = await fetch(`/api/eml-proxy?path=${encodeURIComponent(TEAM_PAGE_PATH)}${freshQuery}`, { cache:"no-store" });
        if (!teamRes.ok) throw new Error(`HTTP ${teamRes.status}`);
        const teamHtml = await teamRes.text();

        let tableHtml = findBestSquadRosterTable(teamHtml);

        if (!tableHtml) {
          const squadPath = resolveSquadStatsPath(teamHtml);
          if (!squadPath) throw new Error("Squad page not found");
          const squadRes = await fetch(`/api/eml-proxy?path=${encodeURIComponent(squadPath)}${freshQuery}`, { cache:"no-store" });
          if (!squadRes.ok) throw new Error(`HTTP ${squadRes.status}`);
          const squadHtml = await squadRes.text();
          tableHtml = findBestSquadRosterTable(squadHtml);
        }

        if (!tableHtml) throw new Error("Squad roster table not found");

        const roster = parseSquadRosterTable(tableHtml);
        if (roster.length < 5 || roster.length > 40) throw new Error("Squad roster validation failed");

        const verifiedAt = new Date().toISOString();
        const statsSnapshot = buildLiveStatsSnapshot(roster, {
          verifiedAt,
          validUntil:new Date(Date.parse(verifiedAt) + SQUAD_CACHE_VALIDITY).toISOString(),
        });
        const live = mergeSquadWithStats(SQUAD, statsSnapshot);
        writeSquadCache(statsSnapshot);

        if (!cancelled) {
          setSquad(live.squad);
          setLastUpdate(live.lastVerifiedAt ? new Date(live.lastVerifiedAt) : null);
        }
      } catch (err) {
        const staleCache = readSquadCache(true);
        let snapshotSquad = null;
        let snapshotDate = null;

        if (!staleCache?.data) {
          try {
            const snapshot = await readSiteSnapshot();
            if (isSiteSnapshotValid(snapshot) && Array.isArray(snapshot?.roster) && snapshot.roster.length >= 5) {
              const verifiedAt = getSnapshotDate(snapshot)?.toISOString();
              const statsSnapshot = buildLiveStatsSnapshot(snapshot.roster, {
                verifiedAt,
                validUntil:snapshot.validUntil,
                source:String(snapshot.source || "eMajor League snapshot"),
                status:"stale",
              });
              const merged = mergeSquadWithStats(SQUAD, statsSnapshot);
              snapshotSquad = merged.squad;
              snapshotDate = merged.lastVerifiedAt ? new Date(merged.lastVerifiedAt) : null;
            }
          } catch { /* local fallback remains available */ }
        }

        if (!cancelled) {
          setError(err.message);
          const cached = staleCache?.data ? mergeSquadWithStats(SQUAD, staleCache.data) : null;
          setSquad(cached?.squad || snapshotSquad || SQUAD);
          if (cached?.lastVerifiedAt) setLastUpdate(new Date(cached.lastVerifiedAt));
          else if (snapshotDate) setLastUpdate(snapshotDate);
          else setLastUpdate(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const interval = setInterval(() => setTick((value) => value + 1), SQUAD_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [tick]);

  return { squad, loading, error, lastUpdate, refetch };
}
