import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { resolveRoute } from "../src/app/routes.js";
import { getPublishedNews } from "../src/content/news/index.js";
import { buildPublicRouteCatalog, getRouteSeo, SITE_ORIGIN } from "../src/seo/seo.js";

const match = Object.freeze({
  id:"seo-match-1",
  competition:"EML FC26 Summer League",
  round:"11. Hafta",
  startsAt:"2026-08-14T19:30:00.000Z",
  timezone:"Europe/Istanbul",
  status:"scheduled",
  streamUrl:null,
  streamStatus:"unknown",
  score:null,
  homeTeam:{ id:"saray", name:"Saray Bahçe eSpor", shortName:"SAR", logo:null },
  awayTeam:{ id:"altair-esports", name:"ALTAIR eSports", shortName:"ALT", logo:"/logo-ui.png" },
});

const matchCenter = Object.freeze({
  meta:{ generatedAt:"2026-08-11T10:00:00.000Z", lastSuccessfulAt:"2026-08-11T10:00:00.000Z" },
  nextMatch:match,
  recentResults:[],
  upcomingFixtures:[match],
  standings:[],
});

function collectSchemaTypes(value, target = []) {
  if (!value || typeof value !== "object") return target;
  if (typeof value["@type"] === "string") target.push(value["@type"]);
  if (Array.isArray(value)) value.forEach((item) => collectSchemaTypes(item, target));
  else Object.values(value).forEach((item) => collectSchemaTypes(item, target));
  return target;
}

test("public routes have unique titles, canonicals, descriptions and complete locale alternates", () => {
  const records = buildPublicRouteCatalog({ matchCenter });
  const titles = records.map(({ seo }) => seo.title);
  const canonicals = records.map(({ seo }) => seo.canonical);
  assert.equal(new Set(titles).size, titles.length);
  assert.equal(new Set(canonicals).size, canonicals.length);
  assert.equal(records.every(({ seo }) => seo.description.trim().length > 40), true);

  const canonicalSet = new Set(canonicals);
  records.forEach(({ seo }) => {
    assert.deepEqual(seo.alternates.map(({ hreflang }) => hreflang), ["tr", "en", "x-default"]);
    seo.alternates.forEach(({ href }) => assert.equal(canonicalSet.has(href), true));
  });
});

test("homepage structured data contains verified organization entities", () => {
  const seo = getRouteSeo(resolveRoute("/tr"), { matchCenter });
  const types = collectSchemaTypes(seo.structuredData);
  assert.equal(types.includes("SportsTeam"), true);
  assert.equal(types.includes("Organization"), true);
  assert.equal(types.includes("WebSite"), true);
  const serialized = JSON.stringify(seo.structuredData);
  assert.equal(serialized.includes('"address"'), false);
  assert.equal(serialized.includes('"sponsor"'), false);
});

test("match detail emits SportsEvent without inventing a venue", () => {
  const seo = getRouteSeo(resolveRoute("/tr/maclar/match-seo-match-1"), { matchCenter });
  const event = seo.structuredData.find((item) => item["@type"] === "SportsEvent");
  assert.ok(event);
  assert.equal(event.startDate, match.startsAt);
  assert.equal("location" in event, false);
});

test("player detail emits ProfilePage and only known Person fields", () => {
  const records = buildPublicRouteCatalog({ matchCenter });
  const playerRecord = records.find(({ route }) => route.name === "player-detail" && route.locale === "tr");
  assert.ok(playerRecord);
  const profile = playerRecord.seo.structuredData.find((item) => item["@type"] === "ProfilePage");
  assert.ok(profile);
  if (profile.mainEntity) {
    assert.equal(profile.mainEntity["@type"], "Person");
    assert.equal("birthDate" in profile.mainEntity, false);
    assert.equal("nationality" in profile.mainEntity, false);
  }
});

test("404 metadata is noindex and has no canonical or hreflang", () => {
  const seo = getRouteSeo(resolveRoute("/en/not-found"), { matchCenter });
  assert.equal(seo.indexable, false);
  assert.equal(seo.robots, "noindex, nofollow");
  assert.equal(seo.canonical, null);
  assert.deepEqual(seo.alternates, []);
});

test("query filters resolve to the clean locale canonical", () => {
  const seo = getRouteSeo(resolveRoute("/tr/maclar?sezon=fc26&organizasyon=eml"), { matchCenter });
  assert.equal(seo.canonical, `${SITE_ORIGIN}/tr/maclar`);
  assert.equal(seo.ogUrl, `${SITE_ORIGIN}/tr/maclar`);
});

test("draft editorial content cannot enter public SEO routes", () => {
  const draft = {
    id:"draft-news",
    slug:"draft-news",
    locale:"tr",
    status:"draft",
    type:"announcement",
    title:"Taslak haber",
    excerpt:"Henüz yayımlanmamış ve doğrulanmamış içerik özeti.",
    publishedAt:"2026-08-11T10:00:00.000Z",
    updatedAt:null,
    seo:{ title:"Taslak", description:"Taslak açıklama" },
    images:{ primary:null },
    body:["Taslak içerik"],
    related:{ matchIds:[], playerIds:[], newsIds:[] },
    image:null,
    imageAlt:"",
    href:"/tr/haberler/draft-news",
    featured:false,
    verified:true,
    relatedMatchId:null,
    relatedPlayerIds:[],
  };
  assert.deepEqual(getPublishedNews({ items:[draft], locale:"tr", now:"2026-08-12T10:00:00.000Z" }), []);
  assert.equal(buildPublicRouteCatalog({ matchCenter }).some(({ seo }) => seo.canonical === `${SITE_ORIGIN}/tr/haberler/draft-news`), false);
});

test("SEO build owns sitemap generation and source sitemap is not manually maintained", () => {
  const packageJson = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.match(packageJson.scripts.build, /generate-seo\.mjs/);
  assert.equal(fs.existsSync(new URL("../public/sitemap.xml", import.meta.url)), false);
});
