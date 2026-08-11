import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import {
  createNoopAnalyticsAdapter,
  createSpyAnalyticsAdapter,
  createVercelAnalyticsAdapter,
} from "../src/services/analytics/adapters.js";
import {
  createPartnershipFormTracker,
  trackHeroCta,
  trackLanguageSwitch,
  trackMatchTabChange,
  trackSocialDestination,
} from "../src/services/analytics/actions.js";
import {
  ANALYTICS_EVENTS,
  setAnalyticsAdapter,
  trackEvent,
} from "../src/services/analytics/index.js";
import { ANALYTICS_EVENT_NAMES } from "../src/services/analytics/events.js";

const EXPECTED_EVENTS = [
  "hero_primary_cta_click",
  "hero_secondary_cta_click",
  "match_center_open",
  "match_tab_change",
  "next_match_open",
  "match_detail_open",
  "twitch_open",
  "instagram_open",
  "discord_open",
  "youtube_open",
  "player_profile_open",
  "squad_open",
  "news_open",
  "media_kit_open",
  "media_kit_download",
  "partnership_form_start",
  "partnership_form_validation_error",
  "partnership_form_submit",
  "partnership_form_success",
  "partnership_form_error",
  "language_switch",
  "stale_data_notice_view",
  "retry_data_request",
];

afterEach(() => setAnalyticsAdapter(createNoopAnalyticsAdapter()));

test("event names come from the central immutable catalog", () => {
  assert.deepEqual([...ANALYTICS_EVENT_NAMES], EXPECTED_EVENTS);
  assert.equal(Object.isFrozen(ANALYTICS_EVENTS), true);
});

test("hero CTA click records the CTA variant without user data", () => {
  const spy = createSpyAnalyticsAdapter();
  setAnalyticsAdapter(spy);
  trackHeroCta({ primary:true, locale:"tr", ctaVariant:"matchCenter" });
  assert.deepEqual(spy.events, [{
    eventName:ANALYTICS_EVENTS.HERO_PRIMARY_CTA_CLICK,
    properties:{ locale:"tr", ctaVariant:"matchCenter" },
  }]);
});

test("language switch and match tab change use their dedicated events", () => {
  const spy = createSpyAnalyticsAdapter();
  setAnalyticsAdapter(spy);
  trackLanguageSwitch("en", "matches");
  trackMatchTabChange("en", "fixtures");
  assert.deepEqual(spy.events.map(({ eventName }) => eventName), [
    ANALYTICS_EVENTS.LANGUAGE_SWITCH,
    ANALYTICS_EVENTS.MATCH_TAB_CHANGE,
  ]);
});

test("stream destination is classified without sending its URL", () => {
  const spy = createSpyAnalyticsAdapter();
  setAnalyticsAdapter(spy);
  trackSocialDestination("https://www.youtube.com/@AltairESPOR", "tr");
  trackSocialDestination("https://example.com/watch", "tr");
  assert.deepEqual(spy.events, [{
    eventName:ANALYTICS_EVENTS.YOUTUBE_OPEN,
    properties:{ locale:"tr", destination:"youtube" },
  }]);
});

test("partnership form start is emitted only for the first interaction", () => {
  const spy = createSpyAnalyticsAdapter();
  setAnalyticsAdapter(spy);
  const form = createPartnershipFormTracker("tr");
  form.start();
  form.start();
  form.start();
  assert.equal(spy.events.length, 1);
  assert.equal(spy.events[0].eventName, ANALYTICS_EVENTS.PARTNERSHIP_FORM_START);
});

test("partnership form success and error remain separate technical outcomes", () => {
  const spy = createSpyAnalyticsAdapter();
  setAnalyticsAdapter(spy);
  const form = createPartnershipFormTracker("tr");
  form.submit("jersey");
  form.success("jersey");
  form.error("network");
  assert.deepEqual(spy.events.map(({ eventName }) => eventName), [
    ANALYTICS_EVENTS.PARTNERSHIP_FORM_SUBMIT,
    ANALYTICS_EVENTS.PARTNERSHIP_FORM_SUCCESS,
    ANALYTICS_EVENTS.PARTNERSHIP_FORM_ERROR,
  ]);
  assert.deepEqual(spy.events[2].properties, { locale:"tr", errorType:"network" });
});

test("PII, free text, nested data and unsupported properties are removed", () => {
  const spy = createSpyAnalyticsAdapter();
  setAnalyticsAdapter(spy);
  trackEvent(ANALYTICS_EVENTS.PARTNERSHIP_FORM_SUBMIT, {
    locale:"tr",
    category:"jersey",
    name:"Ada Lovelace",
    email:"ada@example.com",
    phone:"+90 555 000 00 00",
    message:"Please call me",
    ip:"127.0.0.1",
    secret:"token",
    nested:{ unsafe:true },
  });
  assert.deepEqual(spy.events[0].properties, { locale:"tr", category:"jersey" });
});

test("undefined provider and unsupported event names never crash the application", () => {
  setAnalyticsAdapter(undefined);
  assert.doesNotThrow(() => trackEvent(ANALYTICS_EVENTS.NEWS_OPEN, { locale:"tr", page:"news" }));
  assert.equal(trackEvent(ANALYTICS_EVENTS.NEWS_OPEN, { locale:"tr", page:"news" }), false);
  assert.equal(trackEvent("made_up_event", { locale:"tr" }), false);
});

test("Vercel adapter uses the verified custom event queue signature", () => {
  const calls = [];
  const adapter = createVercelAnalyticsAdapter(() => ({ va:(...args) => calls.push(args) }));
  adapter.track(ANALYTICS_EVENTS.MATCH_TAB_CHANGE, { locale:"tr", tabName:"results" });
  assert.deepEqual(calls, [["event", {
    name:ANALYTICS_EVENTS.MATCH_TAB_CHANGE,
    data:{ locale:"tr", tabName:"results" },
  }]]);
});
