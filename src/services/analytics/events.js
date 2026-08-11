export const ANALYTICS_EVENTS = Object.freeze({
  HERO_PRIMARY_CTA_CLICK:"hero_primary_cta_click",
  HERO_SECONDARY_CTA_CLICK:"hero_secondary_cta_click",
  MATCH_CENTER_OPEN:"match_center_open",
  MATCH_TAB_CHANGE:"match_tab_change",
  NEXT_MATCH_OPEN:"next_match_open",
  MATCH_DETAIL_OPEN:"match_detail_open",
  TWITCH_OPEN:"twitch_open",
  INSTAGRAM_OPEN:"instagram_open",
  DISCORD_OPEN:"discord_open",
  YOUTUBE_OPEN:"youtube_open",
  PLAYER_PROFILE_OPEN:"player_profile_open",
  SQUAD_OPEN:"squad_open",
  NEWS_OPEN:"news_open",
  MEDIA_KIT_OPEN:"media_kit_open",
  MEDIA_KIT_DOWNLOAD:"media_kit_download",
  PARTNERSHIP_FORM_START:"partnership_form_start",
  PARTNERSHIP_FORM_VALIDATION_ERROR:"partnership_form_validation_error",
  PARTNERSHIP_FORM_SUBMIT:"partnership_form_submit",
  PARTNERSHIP_FORM_SUCCESS:"partnership_form_success",
  PARTNERSHIP_FORM_ERROR:"partnership_form_error",
  LANGUAGE_SWITCH:"language_switch",
  STALE_DATA_NOTICE_VIEW:"stale_data_notice_view",
  RETRY_DATA_REQUEST:"retry_data_request",
});

export const ANALYTICS_EVENT_NAMES = Object.freeze(Object.values(ANALYTICS_EVENTS));

const EVENT_PROPERTY_KEYS = Object.freeze({
  [ANALYTICS_EVENTS.HERO_PRIMARY_CTA_CLICK]:["locale", "ctaVariant"],
  [ANALYTICS_EVENTS.HERO_SECONDARY_CTA_CLICK]:["locale", "ctaVariant"],
  [ANALYTICS_EVENTS.MATCH_CENTER_OPEN]:["locale", "dataStatus"],
  [ANALYTICS_EVENTS.MATCH_TAB_CHANGE]:["locale", "tabName"],
  [ANALYTICS_EVENTS.NEXT_MATCH_OPEN]:["locale", "matchId"],
  [ANALYTICS_EVENTS.MATCH_DETAIL_OPEN]:["locale", "matchId"],
  [ANALYTICS_EVENTS.TWITCH_OPEN]:["locale", "destination"],
  [ANALYTICS_EVENTS.INSTAGRAM_OPEN]:["locale", "destination"],
  [ANALYTICS_EVENTS.DISCORD_OPEN]:["locale", "destination"],
  [ANALYTICS_EVENTS.YOUTUBE_OPEN]:["locale", "destination"],
  [ANALYTICS_EVENTS.PLAYER_PROFILE_OPEN]:["locale", "playerId"],
  [ANALYTICS_EVENTS.SQUAD_OPEN]:["locale", "page"],
  [ANALYTICS_EVENTS.NEWS_OPEN]:["locale", "page"],
  [ANALYTICS_EVENTS.MEDIA_KIT_OPEN]:["locale", "destination"],
  [ANALYTICS_EVENTS.MEDIA_KIT_DOWNLOAD]:["locale", "destination"],
  [ANALYTICS_EVENTS.PARTNERSHIP_FORM_START]:["locale", "page"],
  [ANALYTICS_EVENTS.PARTNERSHIP_FORM_VALIDATION_ERROR]:["locale", "errorType"],
  [ANALYTICS_EVENTS.PARTNERSHIP_FORM_SUBMIT]:["locale", "category"],
  [ANALYTICS_EVENTS.PARTNERSHIP_FORM_SUCCESS]:["locale", "category"],
  [ANALYTICS_EVENTS.PARTNERSHIP_FORM_ERROR]:["locale", "errorType"],
  [ANALYTICS_EVENTS.LANGUAGE_SWITCH]:["locale", "page"],
  [ANALYTICS_EVENTS.STALE_DATA_NOTICE_VIEW]:["locale", "page"],
  [ANALYTICS_EVENTS.RETRY_DATA_REQUEST]:["locale", "page"],
});

const ALLOWED_VALUES = Object.freeze({
  locale:new Set(["tr", "en"]),
  page:new Set(["home", "matches", "match-detail", "squad", "player-detail", "news", "news-detail", "honours", "partnerships"]),
  destination:new Set(["twitch", "instagram", "discord", "youtube", "media-kit-html", "media-kit-pdf"]),
  ctaVariant:new Set(["fixtures", "twitch", "result", "nextMatch", "watchLive", "matchDetails", "countdown", "matchCenter", "squad"]),
  tabName:new Set(["results", "fixtures", "standings"]),
  dataStatus:new Set(["fresh", "stale", "empty", "season-ended", "error"]),
  errorType:new Set(["client-validation", "server-validation", "rate-limit", "server", "network", "unconfigured", "unknown"]),
});

const SAFE_IDENTIFIER = /^[a-z0-9][a-z0-9._-]{0,79}$/i;

function sanitizeProperty(key, value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized || normalized.length > 80) return null;
  if (ALLOWED_VALUES[key]) return ALLOWED_VALUES[key].has(normalized) ? normalized : null;
  if (key === "matchId" || key === "playerId" || key === "category") {
    return SAFE_IDENTIFIER.test(normalized) ? normalized : null;
  }
  return null;
}

export function isAnalyticsEventName(eventName) {
  return ANALYTICS_EVENT_NAMES.includes(eventName);
}

export function sanitizeAnalyticsProperties(eventName, properties = {}) {
  const allowedKeys = EVENT_PROPERTY_KEYS[eventName];
  if (!allowedKeys || !properties || typeof properties !== "object" || Array.isArray(properties)) return {};
  return Object.fromEntries(allowedKeys.flatMap((key) => {
    const value = sanitizeProperty(key, properties[key]);
    return value === null ? [] : [[key, value]];
  }));
}
