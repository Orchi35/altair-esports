import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ACTIVE_COMPETITION } from "../../src/config/competition.js";
import {
  ALTAIR_TEAM,
  createErrorMatchCenterData,
  createUnavailableMatchCenterData,
  isMatchCenterData,
  normalizeMatch,
  normalizeMatchCenterSource,
  normalizePlayoffs,
  normalizeStandings,
  resolveMatchCenterData,
} from "../../src/data/matchCenter.js";
import { toIsoString } from "../../src/utils/dateTime.js";
import { ParserError, parseFixtureHtml, parsePlayoffFixtureHtml, parseStandingsHtml } from "./emlParser.js";
import { UpstreamError, fetchAllowedHtml } from "./upstream.js";

const serverDirectory = path.dirname(fileURLToPath(import.meta.url));
export const SNAPSHOT_FILE = path.resolve(serverDirectory, "..", "..", "public", "data", "eml-snapshot.json");
export const SNAPSHOT_REFRESH_AFTER_MS = 60 * 60 * 1000;
export const LIVE_VALIDITY_MS = 24 * 60 * 60 * 1000;
export const RETRY_AFTER_SECONDS = 900;

const ACTIVE_SEASON = Object.freeze({
  id:String(ACTIVE_COMPETITION.tournamentId),
  name:ACTIVE_COMPETITION.competition,
  status:ACTIVE_COMPETITION.status,
  verifiedEndAt:ACTIVE_COMPETITION.verifiedEndAt,
});

export class SnapshotError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "SnapshotError";
    this.code = code;
  }
}

function snapshotToSource(snapshot) {
  return {
    generatedAt:snapshot.generatedAt,
    fetchedAt:snapshot.generatedAt,
    lastSuccessfulAt:snapshot.generatedAt,
    validUntil:snapshot.validUntil,
    sourceName:String(snapshot.source || "eMajor League"),
    sourceType:"snapshot",
    season:{
      ...ACTIVE_SEASON,
      id:String(snapshot.competition.tournamentId),
      name:String(snapshot.competition.name),
      status:String(snapshot.competition.status || ACTIVE_SEASON.status),
      verifiedEndAt:snapshot.competition.verifiedEndAt ?? ACTIVE_SEASON.verifiedEndAt,
    },
    team:ALTAIR_TEAM,
    matches:snapshot.matches,
    playoffMatches:Array.isArray(snapshot.playoffMatches) ? snapshot.playoffMatches : [],
    standings:snapshot.standings[String(snapshot.competition.tournamentId)],
  };
}

export function inspectSnapshot(snapshot, { now = new Date().toISOString(), requireCurrent = false } = {}) {
  const nowIso = toIsoString(now);
  if (!nowIso) throw new SnapshotError("SNAPSHOT_CLOCK_INVALID", "Snapshot verification clock is invalid");
  if (!snapshot || typeof snapshot !== "object" || snapshot.schemaVersion !== 1) {
    throw new SnapshotError("SNAPSHOT_SCHEMA_INVALID", "Snapshot schema version is unsupported");
  }
  const generatedAt = toIsoString(snapshot.generatedAt);
  const validFrom = toIsoString(snapshot.validFrom);
  const validUntil = toIsoString(snapshot.validUntil);
  if (
    !generatedAt
    || !validFrom
    || !validUntil
    || Date.parse(validFrom) > Date.parse(generatedAt)
    || Date.parse(generatedAt) > Date.parse(validUntil)
  ) {
    throw new SnapshotError("SNAPSHOT_DATES_INVALID", "Snapshot validity dates are missing or invalid");
  }
  if (!snapshot.competition || Number(snapshot.competition.tournamentId) !== ACTIVE_COMPETITION.tournamentId) {
    throw new SnapshotError("SNAPSHOT_COMPETITION_INVALID", "Snapshot competition does not match the active configuration");
  }
  const standings = snapshot.standings?.[String(ACTIVE_COMPETITION.tournamentId)];
  if (!Array.isArray(snapshot.matches) || !Array.isArray(standings)) {
    throw new SnapshotError("SNAPSHOT_COLLECTIONS_INVALID", "Snapshot match or standings collections are missing");
  }
  if (snapshot.matches.some((match, index) => !normalizeMatch(match, index))) {
    throw new SnapshotError("SNAPSHOT_MATCH_INVALID", "Snapshot contains an invalid match record");
  }
  if (snapshot.playoffMatches !== undefined && (
    !Array.isArray(snapshot.playoffMatches)
    || snapshot.playoffMatches.some((match, index) => !normalizeMatch(match, index))
  )) {
    throw new SnapshotError("SNAPSHOT_PLAYOFF_INVALID", "Snapshot contains an invalid playoff match record");
  }
  if (snapshot.playoffMatches?.length) {
    const playoffRound = normalizePlayoffs(snapshot.playoffMatches).rounds[0];
    const playoffLegCount = playoffRound?.ties.reduce((total, tie) => total + tie.legs.length, 0) || 0;
    if (playoffRound?.ties.length !== 4 || playoffLegCount !== 8) {
      throw new SnapshotError("SNAPSHOT_PLAYOFF_INCOMPLETE", "Snapshot quarterfinal bracket is incomplete");
    }
  }
  if (normalizeStandings(standings).length !== standings.length || standings.length < 5) {
    throw new SnapshotError("SNAPSHOT_STANDINGS_INVALID", "Snapshot standings failed validation");
  }

  const source = snapshotToSource(snapshot);
  const data = normalizeMatchCenterSource(source, { now:nowIso });
  if (!data || !isMatchCenterData(data)) {
    throw new SnapshotError("SNAPSHOT_NORMALIZATION_FAILED", "Snapshot could not be normalized");
  }

  const nowTimestamp = Date.parse(nowIso);
  const isUsable = Date.parse(validFrom) <= nowTimestamp && nowTimestamp < Date.parse(validUntil);
  if (requireCurrent && !isUsable) throw new SnapshotError("SNAPSHOT_EXPIRED", "Snapshot fallback has expired");
  return { snapshot, source, data, generatedAt, validFrom, validUntil, isUsable };
}

export async function readSnapshotFile(filename = SNAPSHOT_FILE) {
  return JSON.parse(await fs.readFile(filename, "utf8"));
}

export async function fetchLiveSource({
  fetchImpl = fetch,
  now = new Date().toISOString(),
  fetchHtml = null,
} = {}) {
  const nowIso = toIsoString(now);
  if (!nowIso) throw new SnapshotError("LIVE_CLOCK_INVALID", "Live source clock is invalid");
  const loadHtml = fetchHtml || ((pathname) => fetchAllowedHtml(pathname, { fetchImpl }));
  const standingsPath = `/tournaments/league_table/${ACTIVE_COMPETITION.tournamentId}/`;
  const fixturePaths = ACTIVE_COMPETITION.matchdays.map((matchday) => ({
    matchday,
    pathname:`/tournaments/league_fixture/${ACTIVE_COMPETITION.tournamentId}/${matchday}/`,
  }));

  const [standingsHtml, fixturePages] = await Promise.all([
    loadHtml(standingsPath),
    Promise.all(fixturePaths.map(async ({ matchday, pathname }) => ({ matchday, html:await loadHtml(pathname) }))),
  ]);
  const standings = parseStandingsHtml(standingsHtml);
  const matches = fixturePages.flatMap(({ matchday, html }) => parseFixtureHtml(html, matchday));
  const playoffMatches = fixturePages
    .filter(({ matchday }) => ACTIVE_COMPETITION.playoffMatchdays.includes(matchday))
    .flatMap(({ matchday, html }) => parsePlayoffFixtureHtml(html, matchday));
  if (matches.length < Math.min(5, ACTIVE_COMPETITION.matchdays.length)) {
    throw new ParserError("FIXTURE_SET_TOO_SHORT", "Live fixture set contains too few ALTAIR matches");
  }
  if (playoffMatches.length && playoffMatches.length !== ACTIVE_COMPETITION.playoffMatchdays.length * 4) {
    throw new ParserError("PLAYOFF_SET_INCOMPLETE", "Live playoff fixture set is incomplete");
  }

  const source = {
    generatedAt:nowIso,
    fetchedAt:nowIso,
    lastSuccessfulAt:nowIso,
    validFrom:nowIso,
    validUntil:new Date(Date.parse(nowIso) + LIVE_VALIDITY_MS).toISOString(),
    sourceName:"eMajor League",
    sourceType:"live",
    season:ACTIVE_SEASON,
    team:ALTAIR_TEAM,
    matches,
    playoffMatches,
    standings,
  };
  const normalized = normalizeMatchCenterSource(source, { now:nowIso });
  if (!normalized || !isMatchCenterData(normalized)) {
    throw new ParserError("LIVE_SCHEMA_INVALID", "Live match center data failed runtime validation");
  }
  return { source, data:normalized };
}

function errorCode(error) {
  if (error instanceof UpstreamError || error instanceof ParserError || error instanceof SnapshotError) return error.code;
  return "UPSTREAM_UNAVAILABLE";
}

function withWarning(data, warningCode) {
  return { ...data, meta:{ ...data.meta, warningCode } };
}

export function createMatchCenterError(warningCode, now = new Date().toISOString()) {
  return createErrorMatchCenterData(ACTIVE_SEASON, warningCode, now);
}

export function createMatchCenterUnavailable({
  warningCode = "UPSTREAM_UNAVAILABLE",
  now = new Date().toISOString(),
  lastSuccessfulAt = null,
} = {}) {
  return createUnavailableMatchCenterData({
    season:ACTIVE_SEASON,
    reason:"UPSTREAM_UNAVAILABLE",
    warningCode,
    checkedAt:now,
    lastSuccessfulAt,
    retryAfterSeconds:RETRY_AFTER_SECONDS,
    sourceName:"EML",
  });
}

export async function getMatchCenter({
  now = new Date().toISOString(),
  fetchImpl = fetch,
  loadSnapshot = readSnapshotFile,
  refreshAfterMs = SNAPSHOT_REFRESH_AFTER_MS,
  fetchLive = null,
} = {}) {
  const nowIso = toIsoString(now) || new Date().toISOString();
  let snapshotRecord = null;
  try {
    snapshotRecord = inspectSnapshot(await loadSnapshot(), { now:nowIso });
  } catch {
    snapshotRecord = null;
  }

  const snapshotIsRecent = snapshotRecord?.isUsable
    && Date.parse(nowIso) - Date.parse(snapshotRecord.generatedAt) < refreshAfterMs;
  const seasonEnded = snapshotRecord?.data.meta.seasonStatus === "ended";
  if (snapshotIsRecent || (snapshotRecord?.isUsable && seasonEnded)) {
    return { statusCode:200, data:snapshotRecord.data };
  }

  try {
    const live = fetchLive
      ? await fetchLive({ now:nowIso, fetchImpl })
      : await fetchLiveSource({ now:nowIso, fetchImpl });
    return { statusCode:200, data:live.data };
  } catch (error) {
    if (snapshotRecord?.isUsable) {
      const stale = resolveMatchCenterData({
        error,
        fallback:snapshotRecord.source,
        now:nowIso,
        season:ACTIVE_SEASON,
      });
      return { statusCode:200, data:withWarning(stale, errorCode(error)) };
    }
    return {
      statusCode:503,
      data:createMatchCenterUnavailable({
        warningCode:errorCode(error),
        now:nowIso,
        lastSuccessfulAt:snapshotRecord?.generatedAt || null,
      }),
    };
  }
}

export function createSnapshotFromSource(source, { roster = [], validityMs = ACTIVE_COMPETITION.snapshotValidityMs } = {}) {
  const generatedAt = toIsoString(source.generatedAt);
  if (!generatedAt) throw new SnapshotError("SNAPSHOT_GENERATED_AT_INVALID", "Cannot create snapshot without a valid generation time");
  return {
    schemaVersion:1,
    generatedAt,
    validFrom:generatedAt,
    validUntil:new Date(Date.parse(generatedAt) + validityMs).toISOString(),
    source:source.sourceName,
    competition:{
      key:ACTIVE_COMPETITION.key,
      tournamentId:ACTIVE_COMPETITION.tournamentId,
      name:ACTIVE_COMPETITION.competition,
      status:ACTIVE_COMPETITION.status,
      verifiedEndAt:ACTIVE_COMPETITION.verifiedEndAt,
    },
    standings:{ [String(ACTIVE_COMPETITION.tournamentId)]:source.standings },
    matches:source.matches,
    playoffMatches:Array.isArray(source.playoffMatches) ? source.playoffMatches : [],
    roster,
  };
}

export function toResponseEnvelope(matchCenterData) {
  const { meta, ...data } = matchCenterData;
  return { meta, data:meta.status === "unavailable" ? null : data };
}
