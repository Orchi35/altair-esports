import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (filename) => fs.readFileSync(new URL(filename, import.meta.url), "utf8");

test("home page follows the unified information architecture", () => {
  const app = read("../src/app/App.jsx");
  const sectionComponents = [
    "<Hero",
    "<QuickTeamStatus",
    "<MatchCenter",
    'id="jersey"',
    'id="squad"',
    'id="identity"',
    'id="honours"',
    'id="sponsors"',
    'id="broadcast"',
  ];
  const positions = sectionComponents.map((component) => app.indexOf(component));

  assert.ok(positions.every((position) => position >= 0));
  assert.deepEqual(positions, [...positions].sort((left, right) => left - right));
  assert.doesNotMatch(app, /<(?:Ticker|Results|Fixtures|Standings)\b/);
});

test("existing navigation section ids remain registered", async () => {
  const { OBSERVED_SECTION_IDS } = await import("../src/app/sectionRegistry.js");

  assert.deepEqual(OBSERVED_SECTION_IDS, [
    "match-center",
    "jersey",
    "squad",
    "identity",
    "honours",
    "sponsors",
    "broadcast",
  ]);
});

test("the app uses modular styles instead of the legacy App.css bundle", () => {
  const app = read("../src/app/App.jsx");
  const styleIndex = read("../src/styles/index.css");
  const squad = read("../src/features/squad/Squad.jsx");

  assert.match(app, /styles\/index\.css/);
  assert.doesNotMatch(app, /App\.css/);
  assert.match(styleIndex, /features\/navigation\/navigation\.css/);
  assert.match(styleIndex, /features\/match-center\/match-center\.css/);
  assert.match(styleIndex, /features\/match-center\/quick-team-status\.css/);
  assert.match(app, /lazy\(\(\) => import/);
  assert.match(app, /DeferredSection/);
  assert.doesNotMatch(styleIndex, /features\/squad\/squad\.css/);
  assert.match(squad, /\.\/featured-players\.css/);
  assert.match(squad, /\.\/squad\.css/);
});

test("Match Center exposes accessible tabs and no duplicate full-size match sections", () => {
  const matchCenter = read("../src/features/match-center/MatchCenter.jsx");

  assert.match(matchCenter, /role="tablist"/);
  assert.match(matchCenter, /role="tab"/);
  assert.match(matchCenter, /aria-selected=/);
  assert.match(matchCenter, /aria-controls=/);
  assert.match(matchCenter, /role="tabpanel"/);
  assert.match(matchCenter, /hidden=\{activeTab !== tab\}/);
  assert.doesNotMatch(matchCenter, /<Results\b|<Fixtures\b|<Standings\b/);
});
