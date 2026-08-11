import { slugifyContent } from "../../utils/slug.js";
import { toIsoString } from "../../utils/dateTime.js";

export const MATCH_EDITORIAL_CONTENT = Object.freeze([]);

export function isMatchEditorialContent(item) {
  if (!item || typeof item !== "object") return false;
  return typeof item.id === "string"
    && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug)
    && typeof item.matchId === "string"
    && ["draft", "published", "archived"].includes(item.status)
    && typeof item.verified === "boolean"
    && Boolean(toIsoString(item.publishedAt))
    && (item.updatedAt === null || Boolean(toIsoString(item.updatedAt)))
    && typeof item.seo?.tr?.title === "string"
    && typeof item.seo?.en?.title === "string"
    && Array.isArray(item.images)
    && Array.isArray(item.related?.newsIds)
    && Array.isArray(item.locales?.tr?.body)
    && Array.isArray(item.locales?.en?.body);
}

export function createMatchSlug(match) {
  if (!match || typeof match !== "object") return null;
  const id = slugifyContent(match.id, "");
  if (id) return `match-${id}`;
  const date = String(match.startsAt || "").slice(0, 10);
  return slugifyContent(`${date}-${match.homeTeam?.name || "home"}-${match.awayTeam?.name || "away"}`, "") || null;
}

export function getAllMatches(matchCenter) {
  const matches = [
    matchCenter?.nextMatch,
    ...(matchCenter?.recentResults || []),
    ...(matchCenter?.upcomingFixtures || []),
  ].filter(Boolean);
  const byId = new Map();
  matches.forEach((match) => byId.set(String(match.id), match));
  return [...byId.values()].sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt));
}

export function findMatchBySlug(matchCenter, slug) {
  return getAllMatches(matchCenter).find((match) => createMatchSlug(match) === slug) || null;
}

export function getMatchEditorial(matchId, locale, items = MATCH_EDITORIAL_CONTENT) {
  return items.find((item) => isMatchEditorialContent(item)
    && item.status === "published"
    && item.verified === true
    && item.matchId === String(matchId)
    && item.locales?.[locale]) || null;
}
