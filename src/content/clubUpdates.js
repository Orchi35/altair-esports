import { toIsoString } from "../utils/dateTime.js";

export const CLUB_UPDATE_TYPES = Object.freeze([
  "transfer",
  "match-report",
  "lineup",
  "club-statement",
  "player-achievement",
  "tournament",
  "jersey",
  "announcement",
]);

const CONTENT_TYPE_SET = new Set(CLUB_UPDATE_TYPES);
const CONTENT_LOCALES = new Set(["tr", "en"]);

/**
 * Repository-managed editorial records. Keep this list empty until an item has
 * an authored title/excerpt, a real publication timestamp and a verified link.
 *
 * @typedef {Object} ClubUpdate
 * @property {string} id
 * @property {string} slug
 * @property {"tr"|"en"} locale
 * @property {"draft"|"published"|"archived"} status
 * @property {"transfer"|"match-report"|"lineup"|"club-statement"|"player-achievement"|"tournament"|"jersey"|"announcement"} type
 * @property {string} title
 * @property {string} excerpt
 * @property {string} publishedAt ISO 8601 with timezone
 * @property {string|null} updatedAt ISO 8601 with timezone
 * @property {{title:string,description:string}} seo
 * @property {{primary:null|{src:string,alt:string}}} images
 * @property {string[]} body
 * @property {{matchIds:string[],playerIds:string[],newsIds:string[]}} related
 * @property {string|null} image
 * @property {string} imageAlt
 * @property {string} href
 * @property {boolean} featured
 * @property {boolean} verified
 * @property {string|null} relatedMatchId
 * @property {string[]} relatedPlayerIds
 */
export const CLUB_UPDATES = Object.freeze([]);

function isNonEmptyString(value) {
  return typeof value === "string" && Boolean(value.trim());
}

function isSafeContentHref(value) {
  if (!isNonEmptyString(value)) return false;
  if (value.startsWith("#")) return /^#[a-z0-9-]+$/i.test(value);
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export function isClubUpdate(item) {
  if (!item || typeof item !== "object") return false;
  const publishedAt = toIsoString(item.publishedAt);
  const hasValidImage = item.image === null
    || (isNonEmptyString(item.image) && isNonEmptyString(item.imageAlt));
  const updatedAt = item.updatedAt === null || Boolean(toIsoString(item.updatedAt));
  const hasValidPrimaryImage = item.images?.primary === null
    || (isNonEmptyString(item.images?.primary?.src) && isNonEmptyString(item.images?.primary?.alt));
  return isNonEmptyString(item.id)
    && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug)
    && CONTENT_LOCALES.has(item.locale)
    && ["draft", "published", "archived"].includes(item.status)
    && CONTENT_TYPE_SET.has(item.type)
    && isNonEmptyString(item.title)
    && isNonEmptyString(item.excerpt)
    && Boolean(publishedAt)
    && updatedAt
    && isNonEmptyString(item.seo?.title)
    && isNonEmptyString(item.seo?.description)
    && hasValidPrimaryImage
    && Array.isArray(item.body)
    && item.body.every(isNonEmptyString)
    && Array.isArray(item.related?.matchIds)
    && item.related.matchIds.every(isNonEmptyString)
    && Array.isArray(item.related?.playerIds)
    && item.related.playerIds.every(isNonEmptyString)
    && Array.isArray(item.related?.newsIds)
    && item.related.newsIds.every(isNonEmptyString)
    && hasValidImage
    && isSafeContentHref(item.href)
    && typeof item.featured === "boolean"
    && typeof item.verified === "boolean"
    && (item.relatedMatchId === null || isNonEmptyString(item.relatedMatchId))
    && Array.isArray(item.relatedPlayerIds)
    && item.relatedPlayerIds.every(isNonEmptyString);
}

export function getLatestClubUpdates({
  items = CLUB_UPDATES,
  locale = "tr",
  now = new Date().toISOString(),
  limit = 3,
} = {}) {
  const nowIso = toIsoString(now);
  if (!Array.isArray(items) || !nowIso) return [];
  const normalizedLocale = String(locale).toLowerCase();
  const safeLimit = Math.min(3, Math.max(0, Number.parseInt(limit, 10) || 0));
  return items
    .filter((item) => isClubUpdate(item)
      && item.verified
      && item.status === "published"
      && item.locale === normalizedLocale
      && Date.parse(item.publishedAt) <= Date.parse(nowIso))
    .sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt))
    .slice(0, safeLimit);
}
