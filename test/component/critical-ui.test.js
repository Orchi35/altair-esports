import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import test, { after, before } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import react from "@vitejs/plugin-react";
import { createServer } from "vite";
import { createFixedClock } from "../../src/utils/clock.js";
import { PARTNERSHIP_CONTENT } from "../../src/content/partnerships/index.js";
import { getMessages } from "../../src/i18n/messages.js";

const projectDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const NOW = "2026-08-11T09:00:00.000Z";
const copy = getMessages("TR");
let vite;
let Hero;
let MatchCenter;
let Navigation;
let PartnershipInquiryForm;

const altair = Object.freeze({ id:"altair-esports", name:"ALTAIR eSports", shortName:"ALT", logo:"/logo-ui.png" });
const opponent = Object.freeze({ id:"gunners", name:"Gunners", shortName:"GUN", logo:null });

function match(overrides = {}) {
  return {
    id:"e2e-next",
    competition:"EML FC26 Summer League",
    round:"GW 11",
    homeTeam:altair,
    awayTeam:opponent,
    startsAt:"2026-08-11T15:00:00.000Z",
    timezone:"Europe/Istanbul",
    status:"scheduled",
    streamUrl:"https://www.twitch.tv/altairespor",
    streamStatus:"scheduled",
    score:null,
    ...overrides,
  };
}

function standings() {
  return [
    { position:1, team:opponent, played:10, won:8, drawn:0, lost:2, goalsFor:30, goalsAgainst:8, goalDifference:22, points:24, form:["W", "W"] },
    { position:2, team:altair, played:10, won:6, drawn:1, lost:3, goalsFor:22, goalsAgainst:13, goalDifference:9, points:19, form:["W", "D"] },
  ];
}

function matchCenter(status, overrides = {}) {
  const nextMatch = ["fresh", "stale"].includes(status) ? match() : null;
  return {
    meta:{
      status,
      generatedAt:NOW,
      fetchedAt:NOW,
      lastSuccessfulAt:NOW,
      validUntil:"2026-08-13T09:00:00.000Z",
      sourceName:"E2E fixture",
      sourceType:status === "stale" ? "snapshot" : "test",
      seasonId:"42",
      seasonName:"EML FC26 Summer League",
      seasonStatus:status === "season-ended" ? "ended" : "active",
      isStale:status === "stale",
      warningCode:status === "error" ? "TEST_ERROR" : status === "unavailable" ? "DNS_FAILURE" : null,
      reason:status === "unavailable" ? "UPSTREAM_UNAVAILABLE" : null,
      checkedAt:NOW,
      retryAfterSeconds:status === "unavailable" ? 900 : null,
    },
    team:altair,
    nextMatch,
    seasonMatches:nextMatch ? [nextMatch] : [],
    recentResults:status === "season-ended" ? [match({ id:"last", status:"finished", score:{ home:2, away:1 }, startsAt:"2026-08-10T18:00:00.000Z" })] : [],
    upcomingFixtures:nextMatch ? [nextMatch] : [],
    standings:status === "loading" || status === "error" ? [] : standings(),
    ...overrides,
  };
}

before(async () => {
  try {
    vite = await createServer({
      root:projectDirectory,
      configFile:false,
      cacheDir:path.join(os.tmpdir(), `altair-component-${process.pid}`),
      appType:"custom",
      plugins:[react()],
      optimizeDeps:{ noDiscovery:true },
      server:{ middlewareMode:true, hmr:false },
    });
    ({ Hero } = await vite.ssrLoadModule("/src/features/hero/Hero.jsx"));
    ({ MatchCenter } = await vite.ssrLoadModule("/src/features/match-center/MatchCenter.jsx"));
    ({ Navigation } = await vite.ssrLoadModule("/src/features/navigation/Navigation.jsx"));
    ({ PartnershipInquiryForm } = await vite.ssrLoadModule("/src/features/partnerships/PartnershipInquiryForm.jsx"));
  } catch (error) {
    console.error("Component test loader failed", error);
    await vite?.close();
    throw error;
  }
});

after(async () => {
  await vite?.close();
});

test("Hero component renders the verified CTA state variants", () => {
  const upcoming = renderToStaticMarkup(React.createElement(Hero, {
    copy,
    lang:"TR",
    locale:"tr",
    matchCenter:matchCenter("fresh"),
    clock:createFixedClock(NOW),
  }));
  assert.match(upcoming, new RegExp(copy.hero.actions.countdown));
  assert.doesNotMatch(upcoming, new RegExp(copy.hero.actions.watchLive));

  const live = renderToStaticMarkup(React.createElement(Hero, {
    copy,
    lang:"TR",
    locale:"tr",
    matchCenter:matchCenter("fresh", { nextMatch:match({ streamStatus:"live" }) }),
    clock:createFixedClock(NOW),
  }));
  assert.match(live, new RegExp(copy.hero.actions.watchLive));
});

test("Match Center renders loading, fresh, stale, empty, ended, unavailable and error states", () => {
  const expectations = {
    loading:"aria-busy=\"true\"",
    fresh:"mc-next-teams",
    stale:"mc-warning",
    empty:"mc-next--empty",
    "season-ended":"mc-next--season-ended",
    unavailable:"mc-unavailable",
    error:"mc-next--error",
  };
  for (const [status, expected] of Object.entries(expectations)) {
    const html = renderToStaticMarkup(React.createElement(MatchCenter, {
      lang:"TR",
      copy,
      locale:"tr",
      matchCenter:matchCenter(status),
      refetch:() => {},
    }));
    assert.match(html, new RegExp(expected), `Missing ${status} component state`);
  }
});

test("unavailable Match Center hides old match details and exposes a cooled-down retry", () => {
  const html = renderToStaticMarkup(React.createElement(MatchCenter, {
    lang:"TR",
    copy,
    locale:"tr",
    matchCenter:matchCenter("unavailable"),
    refetch:() => false,
    isRetryCoolingDown:true,
    retryWaitSeconds:7,
  }));
  assert.match(html, new RegExp(copy.matchCenter.unavailableTitle));
  assert.match(html, /disabled=""/);
  assert.doesNotMatch(html, /mc-next-teams/);
  assert.doesNotMatch(html, new RegExp(copy.matchCenter.watchLive));
});

test("Hero unavailable state keeps only safe Twitch and squad actions", () => {
  const html = renderToStaticMarkup(React.createElement(Hero, {
    copy,
    lang:"TR",
    locale:"tr",
    matchCenter:matchCenter("unavailable"),
    clock:createFixedClock(NOW),
  }));
  assert.match(html, new RegExp(copy.hero.actions.twitch));
  assert.match(html, new RegExp(copy.hero.actions.squad));
  assert.doesNotMatch(html, new RegExp(copy.hero.actions.watchLive));
});

test("Standings component output uses a semantic table", () => {
  const html = renderToStaticMarkup(React.createElement(MatchCenter, {
    lang:"TR",
    copy,
    locale:"tr",
    matchCenter:matchCenter("fresh"),
    refetch:() => {},
  }));
  assert.match(html, /<table class="mc-standings-table">/);
  assert.match(html, /<caption/);
  assert.match(html, /scope="col"/);
  assert.match(html, /scope="row"/);
});

test("Language selector and mobile menu expose their closed accessible state", () => {
  const html = renderToStaticMarkup(React.createElement(Navigation, {
    scrolled:false,
    activeLang:"TR",
    activeSection:"top",
    locale:"tr",
    page:"home",
    onLanguageChange:() => {},
    copy,
  }));
  assert.match(html, /aria-controls="mobile-navigation"/);
  assert.match(html, /aria-controls="language-selector-panel"/);
  assert.equal((html.match(/aria-expanded="false"/g) || []).length, 2);
});

test("Partnership form exposes labelled fields, live status and a real endpoint state", () => {
  const html = renderToStaticMarkup(React.createElement(PartnershipInquiryForm, {
    areas:[{ key:"jersey", title:"Forma entegrasyonu" }],
    copy:PARTNERSHIP_CONTENT.locales.tr.form,
    locale:"tr",
  }));
  assert.match(html, /class="partnership-form"/);
  assert.match(html, /name="email"/);
  assert.match(html, /name="privacyAccepted"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /<fieldset disabled=""/);
});

test("Interactive components depend on the central analytics service", () => {
  const heroSource = fs.readFileSync(path.join(projectDirectory, "src/features/hero/Hero.jsx"), "utf8");
  const matchCenterSource = fs.readFileSync(path.join(projectDirectory, "src/features/match-center/MatchCenter.jsx"), "utf8");
  assert.match(heroSource, /trackHeroCta/);
  assert.match(matchCenterSource, /trackMatchTabChange/);
  assert.doesNotMatch(`${heroSource}${matchCenterSource}`, /window\.va|@vercel\/analytics/);
});
