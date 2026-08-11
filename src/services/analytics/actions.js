import { ANALYTICS_EVENTS, trackEvent } from "./index.js";

const SOCIAL_EVENTS = Object.freeze({
  twitch:ANALYTICS_EVENTS.TWITCH_OPEN,
  instagram:ANALYTICS_EVENTS.INSTAGRAM_OPEN,
  discord:ANALYTICS_EVENTS.DISCORD_OPEN,
  youtube:ANALYTICS_EVENTS.YOUTUBE_OPEN,
});

export function trackHeroCta({ primary, locale, ctaVariant, destination }) {
  trackEvent(primary ? ANALYTICS_EVENTS.HERO_PRIMARY_CTA_CLICK : ANALYTICS_EVENTS.HERO_SECONDARY_CTA_CLICK, {
    locale,
    ctaVariant,
  });
  if (ctaVariant === "twitch") {
    trackSocialOpen("twitch", locale);
  } else if (destination) {
    trackSocialDestination(destination, locale);
  }
}

export function trackSocialOpen(channel, locale) {
  const eventName = SOCIAL_EVENTS[channel];
  if (!eventName) return false;
  return trackEvent(eventName, { locale, destination:channel });
}

export function trackSocialDestination(destination, locale) {
  try {
    const hostname = new URL(destination).hostname.toLowerCase();
    if (hostname === "twitch.tv" || hostname.endsWith(".twitch.tv")) return trackSocialOpen("twitch", locale);
    if (hostname === "instagram.com" || hostname.endsWith(".instagram.com")) return trackSocialOpen("instagram", locale);
    if (hostname === "youtube.com" || hostname.endsWith(".youtube.com") || hostname === "youtu.be") return trackSocialOpen("youtube", locale);
    if (hostname === "discord.gg" || hostname === "discord.com" || hostname.endsWith(".discord.com")) return trackSocialOpen("discord", locale);
  } catch {
    return false;
  }
  return false;
}

export function trackLanguageSwitch(locale, page) {
  return trackEvent(ANALYTICS_EVENTS.LANGUAGE_SWITCH, { locale, page });
}

export function trackMatchTabChange(locale, tabName) {
  return trackEvent(ANALYTICS_EVENTS.MATCH_TAB_CHANGE, { locale, tabName });
}

export function trackMediaKitAction(kind, locale) {
  const download = kind === "download";
  return trackEvent(download ? ANALYTICS_EVENTS.MEDIA_KIT_DOWNLOAD : ANALYTICS_EVENTS.MEDIA_KIT_OPEN, {
    locale,
    destination:download ? "media-kit-pdf" : "media-kit-html",
  });
}

export function createPartnershipFormTracker(locale) {
  let started = false;
  return Object.freeze({
    start() {
      if (started) return false;
      started = true;
      return trackEvent(ANALYTICS_EVENTS.PARTNERSHIP_FORM_START, { locale, page:"partnerships" });
    },
    validationError(errorType) {
      return trackEvent(ANALYTICS_EVENTS.PARTNERSHIP_FORM_VALIDATION_ERROR, { locale, errorType });
    },
    submit(category) {
      return trackEvent(ANALYTICS_EVENTS.PARTNERSHIP_FORM_SUBMIT, { locale, category });
    },
    success(category) {
      return trackEvent(ANALYTICS_EVENTS.PARTNERSHIP_FORM_SUCCESS, { locale, category });
    },
    error(errorType) {
      return trackEvent(ANALYTICS_EVENTS.PARTNERSHIP_FORM_ERROR, { locale, errorType });
    },
  });
}
