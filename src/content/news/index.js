import { CLUB_UPDATES, getLatestClubUpdates, isClubUpdate } from "../clubUpdates.js";

export const NEWS_CONTENT = CLUB_UPDATES;
export const getLatestNews = getLatestClubUpdates;
export const isNewsContent = isClubUpdate;

export const NEWS_CATEGORIES = Object.freeze([
  "transfer",
  "match-report",
  "lineup",
  "club-statement",
  "player-achievement",
  "tournament",
  "jersey",
  "announcement",
]);

export function getPublishedNews({ items = NEWS_CONTENT, locale = "tr", now = new Date().toISOString() } = {}) {
  const timestamp = Date.parse(now);
  if (!Number.isFinite(timestamp)) return [];
  return items
    .filter((item) => isClubUpdate(item)
      && item.verified === true
      && item.status === "published"
      && item.locale === locale
      && Date.parse(item.publishedAt) <= timestamp)
    .sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt));
}

export function getNewsBySlug(slug, { items = NEWS_CONTENT, locale = "tr", now } = {}) {
  return getPublishedNews({ items, locale, now }).find((item) => item.slug === slug) || null;
}
