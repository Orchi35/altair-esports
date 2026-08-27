import { DEFAULT_TIMEZONE, sourceDateTimeToIso, toIsoString } from "../utils/dateTime.js";

export const MATCH_CENTER_STATUSES = Object.freeze([
  "loading",
  "fresh",
  "stale",
  "empty",
  "season-ended",
  "unavailable",
  "error",
]);

export const ALTAIR_TEAM = Object.freeze({
  id:"altair-esports",
  name:"ALTAIR eSports",
  shortName:"ALT",
  logo:"/logo-ui.png",
});

const ALTAIR_ALIASES = new Set([
  "altair",
  "altairesport",
  "altairesports",
  "altaire spor",
  "altairespor",
].map(canonicalizeTeamName));

/**
 * @typedef {"loading"|"fresh"|"stale"|"empty"|"season-ended"|"unavailable"|"error"} MatchCenterStatus
 * @typedef {{id:string,name:string,shortName:string,logo:string|null}} NormalizedTeam
 * @typedef {{home:number,away:number}} MatchScore
 * @typedef {{id:string,competition:string,round:string,homeTeam:NormalizedTeam,awayTeam:NormalizedTeam,startsAt:string,timezone:string,status:string,streamUrl:string|null,streamStatus:string,score:MatchScore|null,stage:string|null,leg:number|null,tieId:string|null,homeSeed:number|null,awaySeed:number|null}} NormalizedMatch
 * @typedef {{position:number,team:NormalizedTeam,played:number,won:number,drawn:number,lost:number,goalsFor:number,goalsAgainst:number,goalDifference:number,points:number,form:string[]}} StandingRow
 * @typedef {{status:MatchCenterStatus,generatedAt:string|null,fetchedAt:string|null,lastSuccessfulAt:string|null,validUntil:string|null,sourceName:string,sourceType:string,seasonId:string,seasonName:string,seasonStatus:string,isStale:boolean,warningCode:string|null,reason:string|null,checkedAt:string|null,retryAfterSeconds:number|null}} MatchCenterMeta
 * @typedef {{meta:MatchCenterMeta,team:NormalizedTeam,nextMatch:NormalizedMatch|null,seasonMatches:NormalizedMatch[],recentResults:NormalizedMatch[],upcomingFixtures:NormalizedMatch[],standings:StandingRow[],playoffs:object}} MatchCenterData
 */

function canonicalizeTeamName(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/gi, "")
    .toLowerCase();
}

function slugify(value) {
  return String(value || "team")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "team";
}

function teamAbbreviation(name) {
  return String(name || "")
    .replace(/[^\p{L}\p{N}]/gu, "")
    .slice(0, 3)
    .toLocaleUpperCase("tr-TR") || "???";
}

export function normalizeTeam(value, shortName, logo = null) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return normalizeTeam(value.name, value.shortName || value.abbr, value.logo);
  }

  const name = String(value || "").replace(/\(\d+\.\)/g, "").replace(/\s+/g, " ").trim();
  if (!name) return null;
  if (ALTAIR_ALIASES.has(canonicalizeTeamName(name))) return { ...ALTAIR_TEAM };

  return {
    id:slugify(name),
    name,
    shortName:String(shortName || teamAbbreviation(name)).trim().slice(0, 5).toLocaleUpperCase("tr-TR"),
    logo:typeof logo === "string" && logo.trim() ? logo.trim() : null,
  };
}

function asNonNegativeInteger(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function normalizeScore(raw, isFinished) {
  const home = raw?.score?.home ?? raw?.homeScore ?? raw?.hs;
  const away = raw?.score?.away ?? raw?.awayScore ?? raw?.as;
  if (!isFinished && (home === null || home === undefined || away === null || away === undefined)) return null;
  const normalized = { home:Number(home), away:Number(away) };
  return Number.isInteger(normalized.home) && normalized.home >= 0 && Number.isInteger(normalized.away) && normalized.away >= 0
    ? normalized
    : null;
}

export function normalizeMatch(raw, index = 0) {
  if (!raw || typeof raw !== "object") return null;
  const homeTeam = normalizeTeam(raw.homeTeam || raw.home, raw.homeAbbr);
  const awayTeam = normalizeTeam(raw.awayTeam || raw.away, raw.awayAbbr);
  const startsAt = sourceDateTimeToIso(raw);
  if (!homeTeam || !awayTeam || !startsAt) return null;

  const finished = raw.status === "finished" || raw.played === true;
  const score = normalizeScore(raw, finished);
  if (finished && !score) return null;
  const allowedStatus = new Set(["scheduled", "finished", "postponed", "cancelled"]);
  const status = allowedStatus.has(raw.status) ? raw.status : finished ? "finished" : "scheduled";
  const streamStatus = new Set(["unknown", "offline", "scheduled", "live", "ended"]).has(raw.streamStatus)
    ? raw.streamStatus
    : "unknown";

  return {
    id:String(raw.id ?? `${startsAt}-${homeTeam.id}-${awayTeam.id}-${index}`),
    competition:String(raw.competition || "").trim(),
    round:String(raw.round || raw.matchday || "").trim(),
    homeTeam,
    awayTeam,
    startsAt,
    timezone:String(raw.timezone || DEFAULT_TIMEZONE),
    status,
    streamUrl:typeof raw.streamUrl === "string" && /^https:\/\//i.test(raw.streamUrl) ? raw.streamUrl : null,
    streamStatus,
    score,
    stage:typeof raw.stage === "string" && raw.stage.trim() ? raw.stage.trim() : null,
    leg:Number.isInteger(Number(raw.leg)) && Number(raw.leg) > 0 ? Number(raw.leg) : null,
    tieId:typeof raw.tieId === "string" && raw.tieId.trim() ? raw.tieId.trim() : null,
    homeSeed:Number.isInteger(Number(raw.homeSeed)) && Number(raw.homeSeed) > 0 ? Number(raw.homeSeed) : null,
    awaySeed:Number.isInteger(Number(raw.awaySeed)) && Number(raw.awaySeed) > 0 ? Number(raw.awaySeed) : null,
  };
}

function emptyPlayoffs(status = "empty") {
  return {
    status,
    currentStage:"quarterfinal",
    format:"two-legged",
    rounds:[{ id:"quarterfinal", status, ties:[] }],
  };
}

export function normalizePlayoffs(rows) {
  if (!Array.isArray(rows) || !rows.length) return emptyPlayoffs();
  const matches = rows.map(normalizeMatch).filter((match) => (
    match
    && match.stage === "quarterfinal"
    && match.tieId
    && match.leg
    && match.homeSeed
    && match.awaySeed
  ));
  if (!matches.length) return emptyPlayoffs();

  const groups = new Map();
  for (const match of matches) {
    const existing = groups.get(match.tieId) || [];
    existing.push(match);
    groups.set(match.tieId, existing);
  }

  const ties = [...groups.entries()].map(([id, legs]) => {
    const orderedLegs = legs.sort((left, right) => left.leg - right.leg);
    const seeds = [...new Set(orderedLegs.flatMap((match) => [match.homeSeed, match.awaySeed]))].sort((left, right) => left - right);
    if (seeds.length !== 2) return null;
    const [firstSeed, secondSeed] = seeds;
    const teamForSeed = (seed) => {
      for (const match of orderedLegs) {
        if (match.homeSeed === seed) return match.homeTeam;
        if (match.awaySeed === seed) return match.awayTeam;
      }
      return null;
    };
    const firstTeam = teamForSeed(firstSeed);
    const secondTeam = teamForSeed(secondSeed);
    if (!firstTeam || !secondTeam) return null;

    const completedLegs = orderedLegs.filter((match) => match.status === "finished" && match.score);
    const aggregate = completedLegs.length ? completedLegs.reduce((totals, match) => ({
      first:totals.first + (match.homeSeed === firstSeed ? match.score.home : match.score.away),
      second:totals.second + (match.homeSeed === secondSeed ? match.score.home : match.score.away),
    }), { first:0, second:0 }) : null;
    const complete = orderedLegs.length === 2 && completedLegs.length === 2;
    const winner = complete && aggregate?.first !== aggregate?.second
      ? aggregate.first > aggregate.second ? firstTeam : secondTeam
      : null;

    return {
      id,
      order:firstSeed,
      stage:"quarterfinal",
      status:complete ? "finished" : completedLegs.length ? "in-progress" : "scheduled",
      firstSeed,
      secondSeed,
      firstTeam,
      secondTeam,
      legs:orderedLegs,
      aggregate,
      winner,
    };
  }).filter(Boolean).sort((left, right) => left.order - right.order);

  return {
    status:ties.some((tie) => tie.status !== "finished") ? "active" : "completed",
    currentStage:"quarterfinal",
    format:"two-legged",
    rounds:[{
      id:"quarterfinal",
      status:ties.some((tie) => tie.status !== "finished") ? "active" : "completed",
      ties,
    }],
  };
}

export function normalizeStandings(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map((raw, index) => {
    const team = normalizeTeam(raw?.team || raw?.name, raw?.shortName || raw?.abbr, raw?.logo);
    if (!team) return null;
    const goalsFor = asNonNegativeInteger(raw.goalsFor ?? raw.gf);
    const goalsAgainst = asNonNegativeInteger(raw.goalsAgainst ?? raw.ga);
    const suppliedDifference = Number.parseInt(raw.goalDifference ?? raw.gd, 10);
    return {
      position:Math.max(1, asNonNegativeInteger(raw.position ?? raw.rank) || index + 1),
      team,
      played:asNonNegativeInteger(raw.played ?? raw.pld),
      won:asNonNegativeInteger(raw.won ?? raw.w),
      drawn:asNonNegativeInteger(raw.drawn ?? raw.d),
      lost:asNonNegativeInteger(raw.lost ?? raw.l),
      goalsFor,
      goalsAgainst,
      goalDifference:Number.isFinite(suppliedDifference) ? suppliedDifference : goalsFor - goalsAgainst,
      points:asNonNegativeInteger(raw.points ?? raw.pts),
      form:Array.isArray(raw.form)
        ? raw.form.filter((item) => /^[WDL]$/.test(item)).slice(0, 5)
        : String(raw.form || "").toUpperCase().match(/[WDL]/g)?.slice(0, 5) || [],
    };
  }).filter(Boolean).sort((left, right) => left.position - right.position)
    .map((row, index) => ({ ...row, position:index + 1 }));
}

function normalizeDateOrNull(value) {
  return value ? toIsoString(value) : null;
}

function hasVerifiedSeasonEnded(season, nowIso) {
  if (season?.status === "ended") return true;
  const verifiedEndAt = normalizeDateOrNull(season?.verifiedEndAt);
  return Boolean(verifiedEndAt && Date.parse(verifiedEndAt) <= Date.parse(nowIso));
}

export function normalizeMatchCenterSource(source, { now = new Date().toISOString() } = {}) {
  if (!source || typeof source !== "object" || !Array.isArray(source.matches) || !Array.isArray(source.standings)) return null;
  const nowIso = toIsoString(now);
  if (!nowIso) return null;

  const seasonMatches = source.matches
    .map(normalizeMatch)
    .filter(Boolean)
    .sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt));
  const nowTimestamp = Date.parse(nowIso);
  const recentResults = seasonMatches
    .filter((match) => match.status === "finished")
    .sort((left, right) => Date.parse(right.startsAt) - Date.parse(left.startsAt))
    .slice(0, 5);
  const upcomingFixtures = seasonMatches
    .filter((match) => match.status !== "finished" && match.status !== "cancelled" && Date.parse(match.startsAt) >= nowTimestamp)
    .sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt));
  const seasonEnded = hasVerifiedSeasonEnded(source.season, nowIso);
  const fetchedAt = normalizeDateOrNull(source.fetchedAt) || nowIso;
  const generatedAt = normalizeDateOrNull(source.generatedAt) || fetchedAt;
  const validUntil = normalizeDateOrNull(source.validUntil);
  const status = seasonEnded ? "season-ended" : upcomingFixtures.length ? "fresh" : "empty";

  return {
    meta:{
      status,
      generatedAt,
      fetchedAt,
      lastSuccessfulAt:normalizeDateOrNull(source.lastSuccessfulAt) || fetchedAt,
      validUntil,
      sourceName:String(source.sourceName || "Unknown"),
      sourceType:String(source.sourceType || "live"),
      seasonId:String(source.season?.id || ""),
      seasonName:String(source.season?.name || ""),
      seasonStatus:seasonEnded ? "ended" : String(source.season?.status || "active"),
      isStale:false,
      warningCode:null,
      reason:null,
      checkedAt:fetchedAt,
      retryAfterSeconds:null,
    },
    team:normalizeTeam(source.team || ALTAIR_TEAM) || { ...ALTAIR_TEAM },
    nextMatch:upcomingFixtures[0] || null,
    seasonMatches,
    recentResults,
    upcomingFixtures,
    standings:normalizeStandings(source.standings),
    playoffs:normalizePlayoffs(source.playoffMatches),
  };
}

export function createLoadingMatchCenterData(season = {}) {
  return {
    meta:{
      status:"loading",
      generatedAt:null,
      fetchedAt:null,
      lastSuccessfulAt:null,
      validUntil:null,
      sourceName:"",
      sourceType:"none",
      seasonId:String(season.id || ""),
      seasonName:String(season.name || ""),
      seasonStatus:String(season.status || "active"),
      isStale:false,
      warningCode:null,
      reason:null,
      checkedAt:null,
      retryAfterSeconds:null,
    },
    team:{ ...ALTAIR_TEAM },
    nextMatch:null,
    seasonMatches:[],
    recentResults:[],
    upcomingFixtures:[],
    standings:[],
    playoffs:emptyPlayoffs("loading"),
  };
}

export function createErrorMatchCenterData(season = {}, warningCode = "MATCH_CENTER_ERROR", now = new Date().toISOString()) {
  const data = createLoadingMatchCenterData(season);
  const checkedAt = toIsoString(now);
  return {
    ...data,
    meta:{ ...data.meta, status:"error", warningCode, reason:warningCode, checkedAt },
  };
}

export function createUnavailableMatchCenterData({
  season = {},
  reason = "UPSTREAM_UNAVAILABLE",
  warningCode = reason,
  checkedAt = new Date().toISOString(),
  lastSuccessfulAt = null,
  retryAfterSeconds = 900,
  sourceName = "eMajor League",
} = {}) {
  const data = createLoadingMatchCenterData(season);
  return {
    ...data,
    meta:{
      ...data.meta,
      status:"unavailable",
      sourceName:String(sourceName || "eMajor League"),
      sourceType:"none",
      reason:String(reason || "UPSTREAM_UNAVAILABLE"),
      warningCode:String(warningCode || reason || "UPSTREAM_UNAVAILABLE"),
      checkedAt:toIsoString(checkedAt),
      lastSuccessfulAt:normalizeDateOrNull(lastSuccessfulAt),
      retryAfterSeconds:Number.isInteger(retryAfterSeconds) && retryAfterSeconds > 0 ? retryAfterSeconds : 900,
    },
  };
}

export function isMatchCenterData(value) {
  if (!value || typeof value !== "object" || !value.meta || !MATCH_CENTER_STATUSES.includes(value.meta.status)) return false;
  if (!value.team || !Array.isArray(value.seasonMatches) || !Array.isArray(value.recentResults) || !Array.isArray(value.upcomingFixtures) || !Array.isArray(value.standings)) return false;
  if (value.playoffs !== undefined) {
    if (
      !value.playoffs
      || !["loading", "empty", "active", "completed"].includes(value.playoffs.status)
      || !Array.isArray(value.playoffs.rounds)
    ) return false;
    const playoffTiesAreValid = value.playoffs.rounds.every((round) => (
      round
      && typeof round.id === "string"
      && Array.isArray(round.ties)
      && round.ties.every((tie) => (
        tie
        && typeof tie.id === "string"
        && Boolean(normalizeTeam(tie.firstTeam))
        && Boolean(normalizeTeam(tie.secondTeam))
        && Array.isArray(tie.legs)
        && tie.legs.every((leg) => Boolean(normalizeMatch(leg)))
      ))
    ));
    if (!playoffTiesAreValid) return false;
  }
  const dateFields = ["generatedAt", "fetchedAt", "lastSuccessfulAt", "validUntil"];
  if (dateFields.some((field) => value.meta[field] !== null && !toIsoString(value.meta[field]))) return false;
  const requiredMetaStrings = ["sourceName", "sourceType", "seasonId", "seasonName", "seasonStatus"];
  if (requiredMetaStrings.some((field) => typeof value.meta[field] !== "string") || typeof value.meta.isStale !== "boolean") return false;
  if (value.meta.checkedAt !== null && value.meta.checkedAt !== undefined && !toIsoString(value.meta.checkedAt)) return false;
  if (value.meta.retryAfterSeconds !== null && value.meta.retryAfterSeconds !== undefined
    && (!Number.isInteger(value.meta.retryAfterSeconds) || value.meta.retryAfterSeconds <= 0)) return false;
  if (!normalizeTeam(value.team) || (value.nextMatch !== null && !normalizeMatch(value.nextMatch))) return false;
  const matchesAreValid = [...value.seasonMatches, ...value.recentResults, ...value.upcomingFixtures]
    .every((match) => Boolean(normalizeMatch(match)));
  const standingsAreValid = value.standings.every((row) => (
    row
    && Number.isInteger(row.position)
    && row.position > 0
    && Boolean(normalizeTeam(row.team))
    && ["played", "won", "drawn", "lost", "goalsFor", "goalsAgainst", "goalDifference", "points"]
      .every((field) => Number.isInteger(row[field]))
    && Array.isArray(row.form)
  ));
  return matchesAreValid && standingsAreValid;
}

function asNormalizedFallback(fallback, now) {
  if (isMatchCenterData(fallback)) return fallback;
  return normalizeMatchCenterSource(fallback, { now });
}

export function resolveMatchCenterData({ primary = null, fallback = null, error = null, now = new Date().toISOString(), season = {} } = {}) {
  const nowIso = toIsoString(now);
  if (!nowIso) return createErrorMatchCenterData(season, "INVALID_CLOCK");

  if (!error && primary) {
    return normalizeMatchCenterSource(primary, { now:nowIso }) || createErrorMatchCenterData(season, "PRIMARY_INVALID");
  }

  if (error && fallback) {
    const normalizedFallback = asNormalizedFallback(fallback, nowIso);
    if (!normalizedFallback) return createErrorMatchCenterData(season, "FALLBACK_INVALID");
    const validUntil = normalizedFallback.meta.validUntil;
    if (!validUntil || Date.parse(validUntil) <= Date.parse(nowIso)) {
      return createUnavailableMatchCenterData({
        season,
        reason:"UPSTREAM_UNAVAILABLE",
        warningCode:"FALLBACK_EXPIRED",
        checkedAt:nowIso,
        lastSuccessfulAt:normalizedFallback.meta.lastSuccessfulAt,
      });
    }
    return {
      ...normalizedFallback,
      meta:{
        ...normalizedFallback.meta,
        status:"stale",
        isStale:true,
        warningCode:"PRIMARY_SOURCE_UNAVAILABLE",
      },
    };
  }

  return error
    ? createErrorMatchCenterData(season, "PRIMARY_SOURCE_UNAVAILABLE", nowIso)
    : createErrorMatchCenterData(season, "PRIMARY_INVALID", nowIso);
}

export function getTeamMatchOutcome(match, teamId = ALTAIR_TEAM.id) {
  if (!match?.score || match.status !== "finished") return null;
  const isHome = match.homeTeam.id === teamId;
  const isAway = match.awayTeam.id === teamId;
  if (!isHome && !isAway) return null;
  const own = isHome ? match.score.home : match.score.away;
  const opponent = isHome ? match.score.away : match.score.home;
  return own > opponent ? "W" : own < opponent ? "L" : "D";
}

export function getCompactStandings(rows, teamId = ALTAIR_TEAM.id) {
  if (!Array.isArray(rows)) return [];
  const index = rows.findIndex((row) => row.team.id === teamId);
  if (index < 0) return rows.slice(0, 3);
  return rows.slice(Math.max(0, index - 1), Math.max(0, index - 1) + 3);
}
