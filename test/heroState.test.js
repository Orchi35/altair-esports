import test from "node:test";
import assert from "node:assert/strict";
import { createFixedClock, readClock } from "../src/utils/clock.js";
import {
  formatMatchDate,
  formatMatchTime,
  formatTimezoneLabel,
} from "../src/utils/dateTime.js";
import {
  getCountdownParts,
  resolveHeroState,
} from "../src/features/hero/heroState.js";

const NOW = "2026-08-10T09:00:00.000Z";
const NOW_MS = readClock(createFixedClock(NOW));

function match(overrides = {}) {
  return {
    id:"next",
    competition:"EML FC26 Summer League",
    round:"GW 11",
    homeTeam:{ id:"altair-esports", name:"ALTAIR eSports", shortName:"ALT", logo:null },
    awayTeam:{ id:"gunners", name:"Gunners", shortName:"GUN", logo:null },
    startsAt:"2026-08-12T12:00:00.000Z",
    timezone:"Europe/Istanbul",
    status:"scheduled",
    streamUrl:"https://www.twitch.tv/altairespor",
    streamStatus:"unknown",
    score:null,
    ...overrides,
  };
}

function matchCenter(nextMatch, overrides = {}) {
  return {
    meta:{ status:"fresh", ...overrides.meta },
    nextMatch,
    recentResults:overrides.recentResults || [],
  };
}

test("48 hours remaining uses Match Center CTA", () => {
  const state = resolveHeroState({
    matchCenter:matchCenter(match({ startsAt:"2026-08-12T09:00:00.000Z", streamStatus:"scheduled" })),
    nowMs:NOW_MS,
  });
  assert.equal(state.kind, "upcoming");
  assert.equal(state.primary.action, "matchCenter");
  assert.notEqual(state.primary.action, "watchLive");
});

test("6 hours remaining with a scheduled stream uses countdown CTA", () => {
  const state = resolveHeroState({
    matchCenter:matchCenter(match({ startsAt:"2026-08-10T15:00:00.000Z", streamStatus:"scheduled" })),
    nowMs:NOW_MS,
  });
  assert.equal(state.kind, "countdown");
  assert.equal(state.primary.action, "countdown");
  assert.equal(state.secondary.action, "twitch");
});

test("10 minutes remaining with unknown stream status never becomes live", () => {
  const state = resolveHeroState({
    matchCenter:matchCenter(match({ startsAt:"2026-08-10T09:10:00.000Z", streamStatus:"unknown" })),
    nowMs:NOW_MS,
  });
  assert.equal(state.kind, "countdown");
  assert.notEqual(state.primary.action, "watchLive");
  assert.deepEqual(getCountdownParts(state.remainingMs), { days:0, hours:0, minutes:10, seconds:0 });
});

test("verified live stream uses Watch Live CTA", () => {
  const state = resolveHeroState({
    matchCenter:matchCenter(match({ startsAt:"2026-08-10T15:00:00.000Z", streamStatus:"live" })),
    nowMs:NOW_MS,
  });
  assert.equal(state.kind, "live");
  assert.equal(state.primary.action, "watchLive");
  assert.equal(state.primary.href, "https://www.twitch.tv/altairespor");
});

test("completed match uses result CTA instead of a stale live status", () => {
  const state = resolveHeroState({
    matchCenter:matchCenter(match({ status:"completed", streamStatus:"live", score:{ home:2, away:1 } })),
    nowMs:NOW_MS,
  });
  assert.equal(state.kind, "completed");
  assert.equal(state.primary.action, "result");
  assert.equal(state.secondary.action, "nextMatch");
});

test("season-ended state can intentionally show the latest completed match", () => {
  const latest = match({ status:"finished", startsAt:"2026-08-09T18:00:00.000Z", score:{ home:1, away:0 } });
  const state = resolveHeroState({
    matchCenter:matchCenter(null, { meta:{ status:"season-ended" }, recentResults:[latest] }),
    nowMs:NOW_MS,
  });
  assert.equal(state.kind, "completed");
  assert.equal(state.match.id, "next");
});

test("missing next match uses fixture and Twitch CTAs", () => {
  const state = resolveHeroState({ matchCenter:matchCenter(null), nowMs:NOW_MS });
  assert.equal(state.kind, "no-match");
  assert.equal(state.primary.action, "fixtures");
  assert.equal(state.secondary.action, "twitch");
});

test("unavailable Match Center uses safe Twitch and squad actions without stale match data", () => {
  const state = resolveHeroState({
    matchCenter:matchCenter(null, { meta:{ status:"unavailable" } }),
    nowMs:NOW_MS,
  });
  assert.equal(state.kind, "unavailable");
  assert.equal(state.match, null);
  assert.equal(state.primary.action, "twitch");
  assert.equal(state.secondary.action, "squad");
  assert.notEqual(state.primary.action, "watchLive");
});

test("invalid match date fails safely without countdown or live inference", () => {
  const state = resolveHeroState({
    matchCenter:matchCenter(match({ startsAt:"not-a-date", streamStatus:"unknown" })),
    nowMs:NOW_MS,
  });
  assert.equal(state.kind, "invalid-date");
  assert.equal(state.startsAt, null);
  assert.equal(state.remainingMs, null);
  assert.equal(state.primary.action, "matchCenter");
});

test("Turkish and English hero date metadata uses the central timezone formatter", () => {
  const startsAt = "2026-08-12T17:30:00.000Z";
  assert.equal(formatMatchDate(startsAt, "TR", "Europe/Istanbul"), "12 Ağu 2026");
  assert.equal(formatMatchDate(startsAt, "EN", "Europe/Istanbul"), "12 Aug 2026");
  assert.equal(formatMatchTime(startsAt, "TR", "Europe/Istanbul"), "20:30");
  assert.equal(formatMatchTime(startsAt, "EN", "Europe/Istanbul"), "20:30");
  assert.equal(formatTimezoneLabel("Europe/Istanbul", "TR"), "TSİ");
  assert.equal(formatTimezoneLabel("Europe/Istanbul", "EN"), "UTC+3");
});
