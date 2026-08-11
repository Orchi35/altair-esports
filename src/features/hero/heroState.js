import { SITE_LINKS } from "../../config/site.js";
import { toIsoString } from "../../utils/dateTime.js";

export const HERO_COUNTDOWN_THRESHOLD_MS = 24 * 60 * 60 * 1000;

const FINISHED_MATCH_STATUSES = new Set(["completed", "finished", "ended"]);

export function isFinishedHeroMatch(match) {
  return Boolean(match && FINISHED_MATCH_STATUSES.has(match.status));
}

export function selectHeroMatch(matchCenter) {
  if (matchCenter?.nextMatch) return { match:matchCenter.nextMatch, showsLastMatch:false };
  if (matchCenter?.meta?.status !== "season-ended") return { match:null, showsLastMatch:false };
  const lastMatch = matchCenter.recentResults?.find(isFinishedHeroMatch) || null;
  return { match:lastMatch, showsLastMatch:Boolean(lastMatch) };
}

function internalAction(action, href) {
  return { action, href, external:false };
}

function externalAction(action, href) {
  return { action, href, external:true };
}

export function resolveHeroState({ matchCenter, nowMs }) {
  if (matchCenter?.meta?.status === "unavailable") {
    return {
      kind:"unavailable",
      match:null,
      showsLastMatch:false,
      startsAt:null,
      remainingMs:null,
      primary:externalAction("twitch", SITE_LINKS.twitch),
      secondary:internalAction("squad", "#squad"),
    };
  }
  const { match, showsLastMatch } = selectHeroMatch(matchCenter);
  if (!match) {
    return {
      kind:"no-match",
      match:null,
      showsLastMatch:false,
      startsAt:null,
      remainingMs:null,
      primary:internalAction("fixtures", "#fixtures"),
      secondary:externalAction("twitch", SITE_LINKS.twitch),
    };
  }

  const startsAt = toIsoString(match.startsAt);
  const startMs = startsAt ? Date.parse(startsAt) : null;
  const currentMs = Number(nowMs);
  const remainingMs = Number.isFinite(startMs) && Number.isFinite(currentMs)
    ? startMs - currentMs
    : null;

  if (isFinishedHeroMatch(match) || showsLastMatch) {
    return {
      kind:"completed",
      match,
      showsLastMatch:true,
      startsAt,
      remainingMs,
      primary:internalAction("result", "#results"),
      secondary:internalAction("nextMatch", "#fixtures"),
    };
  }

  if (match.streamStatus === "live") {
    return {
      kind:"live",
      match,
      showsLastMatch:false,
      startsAt,
      remainingMs,
      primary:externalAction("watchLive", match.streamUrl || SITE_LINKS.twitch),
      secondary:internalAction("matchDetails", "#match-center"),
    };
  }

  if (remainingMs !== null && remainingMs >= 0 && remainingMs <= HERO_COUNTDOWN_THRESHOLD_MS) {
    return {
      kind:"countdown",
      match,
      showsLastMatch:false,
      startsAt,
      remainingMs,
      primary:internalAction("countdown", "#hero-countdown"),
      secondary:externalAction("twitch", SITE_LINKS.twitch),
    };
  }

  return {
    kind:startsAt ? "upcoming" : "invalid-date",
    match,
    showsLastMatch:false,
    startsAt,
    remainingMs,
    primary:internalAction("matchCenter", "#match-center"),
    secondary:internalAction("squad", "#squad"),
  };
}

export function getCountdownParts(remainingMs) {
  const totalSeconds = Math.max(0, Math.floor((Number(remainingMs) || 0) / 1000));
  return {
    days:Math.floor(totalSeconds / 86400),
    hours:Math.floor((totalSeconds % 86400) / 3600),
    minutes:Math.floor((totalSeconds % 3600) / 60),
    seconds:totalSeconds % 60,
  };
}

export function getCountdownAnnouncementKey(remainingMs) {
  return Math.max(0, Math.ceil((Number(remainingMs) || 0) / 60000));
}
