import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { HONOURS_CONTENT, getVerifiedHonours } from "../src/content/honours/index.js";
import { createMatchSlug, findMatchBySlug, getAllMatches } from "../src/content/matches/index.js";
import { NEWS_CONTENT, getPublishedNews } from "../src/content/news/index.js";
import { PARTNERSHIP_CONTENT } from "../src/content/partnerships/index.js";
import { PLAYER_CONTENT, getPlayerContentBySlug, getPublishedPlayers, isPlayerContent } from "../src/content/players/index.js";
import { createSquadPageGroups } from "../src/pages/squad/squadPageModel.js";

test("player content exposes CMS-ready records without hardcoded verified statistics", () => {
  assert.equal(PLAYER_CONTENT.length, 17);
  assert.equal(getPublishedPlayers().every(isPlayerContent), true);
  assert.equal(PLAYER_CONTENT.every((player) => player.verifiedStats === null), true);
  const player = getPlayerContentBySlug("orcun-bektas");
  assert.equal(player.player.ign, "ORC-HI");
  assert.equal(player.locales.tr.name, "ORÇUN BEKTAŞ");
  assert.equal(getPlayerContentBySlug("bilinmeyen-oyuncu"), null);
});

test("news stays empty until a dated and verified editorial item exists", () => {
  assert.deepEqual(NEWS_CONTENT, []);
  assert.deepEqual(getPublishedNews({ locale:"tr", now:"2026-08-11T12:00:00.000Z" }), []);
});

test("honours contain only the three user-verified records and do not invent dates", () => {
  assert.equal(getVerifiedHonours().length, 3);
  assert.equal(HONOURS_CONTENT.every((honour) => honour.verified && honour.achievedAt === null), true);
});

test("partnership content carries localized SEO and no invented metrics", () => {
  assert.equal(PARTNERSHIP_CONTENT.status, "published");
  assert.ok(PARTNERSHIP_CONTENT.seo.tr.title);
  assert.ok(PARTNERSHIP_CONTENT.seo.en.title);
  assert.equal("metrics" in PARTNERSHIP_CONTENT, false);
  assert.equal(PARTNERSHIP_CONTENT.collaborationAreas.length, 7);
  assert.equal(PARTNERSHIP_CONTENT.mediaKit.pdfPath, "/media/altair-esports-media-kit.pdf");
});

test("match slugs resolve only normalized matches supplied by match center", () => {
  const match = {
    id:"11.1",
    startsAt:"2026-08-14T19:30:00.000Z",
    homeTeam:{ id:"saray", name:"Saray Bahçe eSpor", shortName:"SAR" },
    awayTeam:{ id:"altair-esports", name:"ALTAIR eSports", shortName:"ALT" },
  };
  const center = { nextMatch:match, recentResults:[], upcomingFixtures:[match] };
  assert.equal(createMatchSlug(match), "match-11-1");
  assert.equal(getAllMatches(center).length, 1);
  assert.equal(findMatchBySlug(center, "match-11-1"), match);
  assert.equal(findMatchBySlug(center, "match-99"), null);
});

test("squad page separates wide attackers from full-backs in the four requested groups", () => {
  const groups = createSquadPageGroups([{ players:[
    { ign:"keeper", pos:"GK" },
    { ign:"fullback", pos:"RB" },
    { ign:"winger", pos:"RW" },
    { ign:"midfielder", pos:"CM" },
  ] }]);
  assert.deepEqual(groups.map((group) => [group.id, group.players.map((player) => player.ign)]), [
    ["Goalkeepers", ["keeper"]],
    ["Defenders", ["fullback"]],
    ["Midfielders", ["midfielder"]],
    ["Forwards", ["winger"]],
  ]);
});

test("all eight content pages are route-level lazy chunks", () => {
  const source = fs.readFileSync(new URL("../src/app/App.jsx", import.meta.url), "utf8");
  [
    "MatchesPage",
    "MatchDetailPage",
    "SquadPage",
    "PlayerDetailPage",
    "NewsPage",
    "NewsDetailPage",
    "HonoursPage",
    "PartnershipsPage",
  ].forEach((page) => assert.match(source, new RegExp(`const ${page} = lazy`)));
});

