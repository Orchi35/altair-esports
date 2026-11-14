import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  getLocalizedRoutePath,
  getLocalizedSectionHref,
  getPreferredLocale,
  getRoutePath,
  getStartupRedirect,
  isRouteAvailable,
  readStoredLocale,
  rememberLocale,
  resolveRoute,
} from "../src/app/routes.js";
import { getMessage, validateLocaleMessages } from "../src/i18n/messages.js";

function createStorage(initialValue = null) {
  let value = initialValue;
  return {
    getItem:() => value,
    setItem:(_key, nextValue) => { value = nextValue; },
  };
}

test("root defaults safely to Turkish", () => {
  assert.equal(getStartupRedirect({ pathname:"/", navigatorLanguage:"de-DE" }), "/tr");
  assert.equal(resolveRoute("/tr").name, "home");
  assert.equal(resolveRoute("/en").name, "home");
});

test('short build routes preserve ID when changing language without becoming content slugs',()=>{
 const route=resolveRoute('/b/Abc_123-xyz0','en');
 assert.equal(route.name,'builder');
 assert.equal(route.locale,'en');
 assert.equal(route.shareId,'Abc_123-xyz0');
 assert.equal(route.detail,false);
 assert.equal(getLocalizedRoutePath(route,'tr'),'/tr/builder#b=Abc_123-xyz0');
 assert.equal(getLocalizedRoutePath(resolveRoute('/tr/builder'),'en','#b=Abc_123-xyz0'),'/en/builder#b=Abc_123-xyz0');
 assert.equal(getLocalizedRoutePath(resolveRoute('/tr/builder'),'en','#build=legacy'),'/en/builder#build=legacy');
 for(const path of ['/b/short','/b/Abc_123-xyz0/more','/b/%3Cscript%3E'])assert.equal(resolveRoute(path).isNotFound,true);
});

test("stored choice has priority over browser language", () => {
  const storage = createStorage("en");
  assert.equal(getPreferredLocale({ storage, navigatorLanguage:"tr-TR" }), "en");
  assert.equal(getStartupRedirect({ pathname:"/", storage, navigatorLanguage:"tr-TR" }), "/en");
  assert.equal(readStoredLocale(storage), "en");
});

test("locale preference can be remembered without throwing", () => {
  const storage = createStorage();
  assert.equal(rememberLocale(storage, "TR"), true);
  assert.equal(readStoredLocale(storage), "tr");
  assert.equal(rememberLocale({ setItem:() => { throw new Error("blocked"); } }, "en"), false);
});

test("route tree exposes every requested Turkish and English path", () => {
  assert.equal(getRoutePath("matches", "tr"), "/tr/maclar");
  assert.equal(getRoutePath("match-detail", "en", "week-1"), "/en/matches/week-1");
  assert.equal(getRoutePath("squad", "tr"), "/tr/kadro");
  assert.equal(getRoutePath("player-detail", "en", "orcun-bektas"), "/en/players/orcun-bektas");
  assert.equal(resolveRoute("/tr/haberler").name, "not-found");
  assert.equal(resolveRoute("/en/news/club-update").name, "not-found");
  assert.equal(getRoutePath("honours", "tr"), "/tr/basarilar");
  assert.equal(getRoutePath("partnerships", "en"), "/en/partnerships");
});

test("language switch keeps the equivalent page and slug", () => {
  assert.equal(getLocalizedRoutePath(resolveRoute("/tr/kadro"), "en"), "/en/squad");
  assert.equal(
    getLocalizedRoutePath(resolveRoute("/tr/oyuncular/orcun-bektas"), "en"),
    "/en/players/orcun-bektas",
  );
  assert.equal(
    getLocalizedRoutePath(resolveRoute("/en/matches/season-report"), "tr"),
    "/tr/maclar/season-report",
  );
});

test("unknown player slug resolves structurally but is not published", () => {
  const route = resolveRoute("/tr/oyuncular/bilinmeyen-oyuncu");
  assert.equal(route.name, "player-detail");
  assert.equal(route.slug, "bilinmeyen-oyuncu");
  assert.equal(isRouteAvailable(route), false);
  assert.equal(isRouteAvailable(route, { players:["bilinmeyen-oyuncu"] }), true);
});

test("legacy homepage hashes redirect to localized routes and tabs", () => {
  assert.equal(getStartupRedirect({ pathname:"/", hash:"#squad" }), "/tr/kadro");
  assert.equal(getStartupRedirect({ pathname:"/en", hash:"#standings" }), "/en/matches#standings");
  assert.equal(getLocalizedSectionHref("tr", "honours"), "/tr/basarilar");
  assert.equal(getLocalizedSectionHref("tr", "jersey"), "/tr#jersey");
  assert.equal(getLocalizedSectionHref("en", "broadcast"), "/en#broadcast");
});

test("invalid localized paths produce a language-aware 404 route", () => {
  const route = resolveRoute("/en/not-a-page");
  assert.equal(route.isNotFound, true);
  assert.equal(route.locale, "en");
  assert.equal(getLocalizedRoutePath(route, "tr"), "/tr/not-a-page");
});

test("message files stay structurally aligned and never expose a missing key", () => {
  assert.deepEqual(validateLocaleMessages(), { EN:[], TR:[] });
  assert.equal(getMessage("TR", "routing.home"), "Ana sayfaya dön");
  assert.equal(getMessage("TR", "missing.translation.key", ""), "");
});

test("content-page hash targets are scrolled after lazy route content mounts", () => {
  const app = fs.readFileSync(new URL("../src/app/App.jsx", import.meta.url), "utf8");
  assert.match(app, /decodeURIComponent\(route\.hash\.slice\(1\)\)/);
  assert.match(app, /getElementById\(targetId\)\?\.scrollIntoView/);
});

test("deep links are emitted as filesystem prerender routes", () => {
  const config = JSON.parse(fs.readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
  const packageJson = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.deepEqual(config.rewrites.map(rule => rule.source), ["/b/:id([A-Za-z0-9_-]{12})","/tr/oyuncular/vpg-:id(\\d+)","/en/players/vpg-:id(\\d+)","/tr/maclar/match-vpg-:id(\\d+)", "/en/matches/match-vpg-:id(\\d+)"]);
  assert.equal(config.rewrites[0].destination,'/tr/builder/index.html');
  assert.match(packageJson.scripts.build, /generate-seo\.mjs/);
});

test("route hook owns document language and History API navigation", () => {
  const hook = fs.readFileSync(new URL("../src/hooks/useLocaleRoute.js", import.meta.url), "utf8");
  assert.match(hook, /document\.documentElement\.lang = route\.locale/);
  assert.match(hook, /window\.history\[replace \? "replaceState" : "pushState"\]/);
  assert.match(hook, /window\.addEventListener\("popstate"/);
});
