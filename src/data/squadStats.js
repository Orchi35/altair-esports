import { toIsoString } from "../utils/dateTime.js";

const ALLOWED_STATUSES = new Set(["fresh", "stale"]);
const STAT_FIELDS = Object.freeze(["matches", "goals", "assists", "cleanSheets", "rating", "cards"]);

export function canonicalizeGamerTag(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&[a-z0-9#]+;/gi, "")
    .replace(/[^a-z0-9]+/gi, "")
    .toLowerCase();
}

function nullableNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

export function createLiveSquadStatsSnapshot(canonicalSquad, roster, {
  verifiedAt = new Date().toISOString(),
  validUntil = new Date(Date.parse(verifiedAt) + 24 * 60 * 60 * 1000).toISOString(),
  source = "eMajor League",
  status = "fresh",
} = {}) {
  const lastVerifiedAt = toIsoString(verifiedAt);
  const normalizedValidUntil = toIsoString(validUntil);
  if (!lastVerifiedAt || !normalizedValidUntil || Date.parse(lastVerifiedAt) >= Date.parse(normalizedValidUntil)) return null;

  const playerIdBySourceKey = new Map(
    (Array.isArray(canonicalSquad) ? canonicalSquad : [])
      .map((player) => [canonicalizeGamerTag(player.gamerTag || player.ign), player.playerId])
      .filter(([key, playerId]) => key && playerId),
  );
  const seen = new Set();
  const stats = [];
  for (const raw of Array.isArray(roster) ? roster : []) {
    const playerId = playerIdBySourceKey.get(canonicalizeGamerTag(raw?.gamerTag || raw?.ign));
    if (!playerId || seen.has(playerId)) continue;
    seen.add(playerId);
    stats.push(Object.freeze({
      playerId,
      matches:nullableNumber(raw.matches ?? raw.apps),
      goals:nullableNumber(raw.goals),
      assists:nullableNumber(raw.assists),
      cleanSheets:nullableNumber(raw.cleanSheets),
      rating:nullableNumber(raw.rating),
      cards:nullableNumber(raw.cards),
      lastVerifiedAt,
      source:String(source || "eMajor League"),
      status:ALLOWED_STATUSES.has(status) ? status : "fresh",
    }));
  }
  return Object.freeze({
    schemaVersion:1,
    status:ALLOWED_STATUSES.has(status) ? status : "fresh",
    lastVerifiedAt,
    validUntil:normalizedValidUntil,
    source:String(source || "eMajor League"),
    stats:Object.freeze(stats),
  });
}

export function isLiveSquadStatsUsable(snapshot, now = new Date().toISOString()) {
  const nowIso = toIsoString(now);
  if (!snapshot || snapshot.schemaVersion !== 1 || !nowIso || !ALLOWED_STATUSES.has(snapshot.status)) return false;
  const verifiedAt = toIsoString(snapshot.lastVerifiedAt);
  const validUntil = toIsoString(snapshot.validUntil);
  if (!verifiedAt || !validUntil || Date.parse(verifiedAt) > Date.parse(nowIso) || Date.parse(nowIso) >= Date.parse(validUntil)) return false;
  if (!Array.isArray(snapshot.stats)) return false;
  const ids = new Set();
  return snapshot.stats.every((stat) => {
    if (!stat?.playerId || ids.has(stat.playerId) || toIsoString(stat.lastVerifiedAt) !== verifiedAt) return false;
    ids.add(stat.playerId);
    return STAT_FIELDS.every((field) => stat[field] === null || (Number.isFinite(stat[field]) && stat[field] >= 0));
  });
}

export function mergeSquadWithStats(baseSquad, statsSnapshot, now = new Date().toISOString()) {
  const usable = isLiveSquadStatsUsable(statsSnapshot, now);
  const byPlayerId = usable
    ? new Map(statsSnapshot.stats.map((stats) => [stats.playerId, stats]))
    : new Map();

  const squad = (Array.isArray(baseSquad) ? baseSquad : []).map((group) => ({
    ...group,
    players:(group.players || []).map((player) => {
      const stats = byPlayerId.get(player.playerId) || null;
      return {
        ...player,
        apps:stats?.matches ?? null,
        goals:stats?.goals ?? null,
        assists:stats?.assists ?? null,
        liveStats:stats,
      };
    }),
  }));

  return {
    squad,
    statsAvailable:usable && byPlayerId.size > 0,
    lastVerifiedAt:usable ? statsSnapshot.lastVerifiedAt : null,
  };
}
