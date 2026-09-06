import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { getResponsivePlayerImage } from "../src/utils/responsiveImage.js";

const read = (filename) => fs.readFileSync(new URL(filename, import.meta.url), "utf8");
const exists = (filename) => fs.existsSync(new URL(filename, import.meta.url));

test("font delivery is limited to the two brand families and six weights", () => {
  const html = read("../index.html");
  const tokens = read("../src/styles/tokens.css");

  assert.match(html, /family=Barlow:wght@400;500;700&family=Barlow\+Condensed:wght@500;700;800/);
  assert.doesNotMatch(html, /JetBrains|Rajdhani/);
  assert.doesNotMatch(tokens, /JetBrains|Rajdhani|monospace/);
});

test("production observability does not create failed localhost requests", () => {
  const observability = read("../src/observability.js");

  assert.match(observability, /isVercelObservabilityHost/);
  assert.match(observability, /normalizedHostname === 'altairesports\.com'/);
  assert.match(observability, /normalizedHostname\.endsWith\('\.vercel\.app'\)/);
});

test("hero uses the supplied crest with explicit dimensions and high priority", () => {
  const hero = read("../src/features/hero/Hero.jsx");
  assert.match(hero, /src="\/altair-brand-logo.png"/);
  assert.match(hero, /width="500" height="500" fetchPriority="high"/);
  assert.doesNotMatch(hero, /hero-scene-picture/);
  assert.ok(exists("../public/altair-brand-logo.png"));
  assert.ok(fs.statSync(new URL("../public/altair-brand-logo.png", import.meta.url)).size < 350_000);
});

test("social preview uses the optimized JPEG asset", () => {
  const html = read("../index.html");

  assert.match(html, /https:\/\/www\.altairesports\.com\/og\.jpg/);
  assert.doesNotMatch(html, /og\.png/);
  assert.ok(exists("../public/og.jpg"));
});

test("player image helper produces fixed 4:5 AVIF and WebP variants", () => {
  const sources = getResponsivePlayerImage("/players/ORC-HI-720.webp");

  assert.deepEqual(sources, {
    avif:"/players/ORC-HI-360.avif 360w, /players/ORC-HI-720.avif 720w",
    webp:"/players/ORC-HI-360.webp 360w, /players/ORC-HI-720.webp 720w",
    fallback:"/players/ORC-HI-720.webp",
  });
  assert.ok(exists("../public/players/ORC-HI-360.avif"));
  assert.ok(exists("../public/players/ORC-HI-720.webp"));
});

test("below-fold features and squad requests stay outside the initial bundle", () => {
  const app = read("../src/app/App.jsx");
  const squad = read("../src/features/squad/Squad.jsx");
  const styleIndex = read("../src/styles/index.css");

  assert.match(app, /const Squad = lazy/);
  assert.doesNotMatch(app, /useSquadStats/);
  assert.match(squad, /useSquadStats\(\)/);
  assert.doesNotMatch(styleIndex, /club-updates|club-identity|honours|partnerships|social-hub|squad\.css/);
});

test("Match Center uses one internal client endpoint", () => {
  const hook = read("../src/hooks/useMatchCenterData.js");

  assert.match(hook, /const ENDPOINT = "\/api\/match-center"/);
  assert.equal((hook.match(/fetch\(/g) || []).length, 1);
  assert.doesNotMatch(hook, /emajorleague\.com|\/tournaments\//);
});

