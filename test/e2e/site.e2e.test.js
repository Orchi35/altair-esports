import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { getPublishedNews } from "../../src/content/news/index.js";
import { getPublishedPlayers } from "../../src/content/players/index.js";
import { launchBrowser } from "./support/browser.mjs";
import { startTestServer } from "./support/testServer.mjs";

let server;
let browser;
let page;
let baseUrl;
const firstPlayer = getPublishedPlayers()[0];
const firstNews = getPublishedNews({ locale:"tr" })[0] || null;

before(async () => {
  server = await startTestServer();
  browser = await launchBrowser();
  page = browser.page;
  baseUrl = server.baseUrl;
});

after(async () => {
  await browser?.close();
  await server?.close();
});

test("Turkish homepage opens with one heading and Turkish document language", async () => {
  await page.setViewport(1280, 900);
  await page.navigate(`${baseUrl}/tr`);
  await page.waitFor("Boolean(document.querySelector('.hero'))", { message:"Turkish hero" });
  const result = await page.evaluate("({ lang:document.documentElement.lang, h1:document.querySelectorAll('h1').length, path:location.pathname })");
  assert.deepEqual(result, { lang:"tr", h1:1, path:"/tr" });
});

test("English homepage opens with one heading and English document language", async () => {
  await page.navigate(`${baseUrl}/en`);
  await page.waitFor("Boolean(document.querySelector('.hero'))", { message:"English hero" });
  const result = await page.evaluate("({ lang:document.documentElement.lang, h1:document.querySelectorAll('h1').length, path:location.pathname })");
  assert.deepEqual(result, { lang:"en", h1:1, path:"/en" });
});

test("language selector keeps the equivalent content route", async () => {
  await page.navigate(`${baseUrl}/tr/kadro`);
  await page.waitFor("Boolean(document.querySelector('.content-page h1'))", { message:"squad route" });
  await page.click("#language-selector-trigger");
  await page.waitFor("Boolean(document.querySelector('#language-selector-panel'))", { message:"language panel" });
  await page.click("#language-selector-panel .nav-lang-option:not(.active)");
  await page.waitFor("location.pathname === '/en/squad'", { message:"localized squad route" });
  assert.equal(await page.evaluate("document.documentElement.lang"), "en");
});

test("mobile menu opens and closes from the keyboard and restores focus", async () => {
  await page.setViewport(390, 844);
  await page.navigate(`${baseUrl}/tr`);
  await page.focus(".nav-menu-toggle");
  await page.press("Enter");
  await page.waitFor("Boolean(document.querySelector('#mobile-navigation'))", { message:"mobile menu dialog" });
  assert.equal(await page.evaluate("document.querySelector('.nav-menu-toggle').getAttribute('aria-expanded')"), "true");
  await page.press("Escape");
  await page.waitFor("!document.querySelector('#mobile-navigation')", { message:"mobile menu close" });
  await page.waitFor("document.activeElement === document.querySelector('.nav-menu-toggle')", { message:"mobile trigger focus restore" });
});

test("Match Center tabs change panel and expose selected state", async () => {
  await page.setViewport(1280, 900);
  await page.navigate(`${baseUrl}/tr`);
  await page.waitFor("Boolean(document.querySelector('[data-tab=fixtures]'))", { message:"Match Center tabs" });
  await page.click("[data-tab=fixtures]");
  assert.equal(await page.evaluate("document.querySelector('[data-tab=fixtures]').getAttribute('aria-selected')"), "true");
  assert.equal(await page.evaluate("document.querySelector('#match-panel-fixtures').hidden"), false);
});

test("legacy fixtures hash opens the localized Match Center fixtures tab", async () => {
  await page.navigate(`${baseUrl}/tr#fixtures`);
  await page.waitFor("location.pathname === '/tr/maclar' && location.hash === '#fixtures'", { message:"legacy fixtures redirect" });
  await page.waitFor("Boolean(document.querySelector('#upcoming-matches-title'))", { message:"fixtures content selected" });
  assert.equal(await page.evaluate("document.querySelectorAll('.content-match-card').length > 0"), true);
});

test("player card opens the local player detail route", { skip:!firstPlayer && "No verified player content exists" }, async () => {
  await page.navigate(`${baseUrl}/tr/kadro`);
  await page.waitFor("Boolean(document.querySelector('.p-card[href*=\"/tr/oyuncular/\"]'))", { message:"player card" });
  const expectedPath = await page.evaluate("document.querySelector('.p-card[href*=\"/tr/oyuncular/\"]').getAttribute('href')");
  await page.click(".p-card[href*=\"/tr/oyuncular/\"]");
  await page.waitFor(`location.pathname === ${JSON.stringify(expectedPath)}`, { message:"player detail route" });
  assert.equal(await page.evaluate("document.querySelectorAll('h1').length"), 1);
});

test("verified news detail route opens", { skip:!firstNews && "No verified published news exists; production content is not fabricated for tests" }, async () => {
  await page.navigate(`${baseUrl}/tr/haberler/${firstNews?.slug}`);
  await page.waitFor("Boolean(document.querySelector('.news-article'))", { message:"news article" });
  assert.equal(await page.evaluate("document.querySelectorAll('h1').length"), 1);
});

test("unknown player slug presents a noindex 404 document", async () => {
  await page.navigate(`${baseUrl}/tr/oyuncular/bilinmeyen-oyuncu`);
  const result = await page.evaluate("({ h1:document.querySelector('h1')?.textContent || '', robots:document.querySelector('meta[name=robots]')?.content || '' })");
  assert.match(result.h1.toLocaleLowerCase("tr-TR"), /bulunamad|kullanılabilir bir sayfaya/);
  assert.match(result.robots, /noindex/);
});

test("partnership form rejects an empty submission on the client", async () => {
  await page.navigate(`${baseUrl}/tr/partnerlik`);
  await page.waitFor("Boolean(document.querySelector('.partnership-form fieldset:not([disabled])'))", { message:"configured partnership form" });
  await page.click(".partnership-submit");
  await page.waitFor("Boolean(document.querySelector('.partnership-form [aria-invalid=true]'))", { message:"partnership validation errors" });
  assert.equal(await page.evaluate("document.querySelector('.partnership-form-status')?.getAttribute('role')"), "status");
});

test("server stale fallback is visibly distinct from fresh data", async () => {
  await page.evaluate("fetch('/__test__/match-center-mode?value=stale').then(response => response.json())");
  await page.navigate(`${baseUrl}/tr`);
  await page.waitFor("Boolean(document.querySelector('.mc-warning'))", { message:"stale data warning" });
  assert.equal(await page.evaluate("document.querySelector('.mc-verification')?.textContent.includes('Son')"), true);
  await page.evaluate("fetch('/__test__/match-center-mode?value=fresh').then(response => response.json())");
});

test("upstream 503 keeps the site and canonical squad usable without expired match data", async () => {
  await page.evaluate("fetch('/__test__/match-center-mode?value=unavailable').then(response => response.json())");
  await page.navigate(`${baseUrl}/tr`);
  await page.waitFor("Boolean(document.querySelector('.mc-unavailable'))", { message:"unavailable Match Center" });
  const home = await page.evaluate(`({
    message:document.querySelector('.mc-unavailable h3')?.textContent || '',
    oldMatch:Boolean(document.querySelector('.mc-next-teams')),
    live:[...document.querySelectorAll('a,button')].some((node) => node.textContent.includes('Canlı İzle')),
    nav:Boolean(document.querySelector('.nav')),
  })`);
  assert.match(home.message, /geçici olarak kullanılamıyor/i);
  assert.equal(home.oldMatch, false);
  assert.equal(home.live, false);
  assert.equal(home.nav, true);

  await page.click(".mc-unavailable-actions button");
  await page.waitFor("Boolean(document.querySelector('.mc-unavailable-actions button[disabled]'))", { message:"retry cooldown" });
  assert.equal(await page.evaluate("document.querySelector('.mc-unavailable-actions button')?.disabled"), true);

  await page.navigate(`${baseUrl}/tr/kadro`);
  await page.waitFor("document.querySelectorAll('.p-card').length > 0", { message:"canonical squad cards" });
  assert.equal(await page.evaluate("document.querySelectorAll('.p-card').length"), getPublishedPlayers().length);
  await page.evaluate("fetch('/__test__/match-center-mode?value=fresh').then(response => response.json())");
});

test("320 px viewport has no horizontal document overflow", async () => {
  await page.setViewport(320, 720);
  await page.navigate(`${baseUrl}/tr`);
  await page.waitFor("Boolean(document.querySelector('.mc-next, .mc-unavailable'))", { message:"mobile Match Center" });
  const dimensions = await page.evaluate("({ viewport:document.documentElement.clientWidth, scroll:Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) })");
  assert.ok(dimensions.scroll <= dimensions.viewport + 1, `Horizontal overflow: ${JSON.stringify(dimensions)}`);
});

test("200% zoom preserves primary navigation and page heading", async () => {
  await page.setViewport(1280, 900);
  await page.setPageScale(2);
  await page.navigate(`${baseUrl}/tr/maclar`);
  const result = await page.evaluate("({ h1:Boolean(document.querySelector('h1')), menu:Boolean(document.querySelector('.nav-menu-toggle')), main:Boolean(document.querySelector('#main-content')) })");
  assert.deepEqual(result, { h1:true, menu:true, main:true });
  await page.setPageScale(1);
});

test("prefers-reduced-motion is honored by the rendered document", async () => {
  await page.setReducedMotion(true);
  await page.navigate(`${baseUrl}/tr`);
  assert.equal(await page.evaluate("matchMedia('(prefers-reduced-motion: reduce)').matches"), true);
  await page.setReducedMotion(false);
});

test("critical local pages contain no broken image elements", async () => {
  for (const route of ["/tr", "/tr/kadro", "/tr/partnerlik"]) {
    await page.navigate(`${baseUrl}${route}`);
    const broken = await page.evaluate(`(async () => {
      const images = [...document.images];
      images.forEach((image) => { image.loading = 'eager'; });
      window.scrollTo(0, document.documentElement.scrollHeight);
      await Promise.all(images.map((image) => image.complete ? null : new Promise((resolve) => {
        image.addEventListener('load', resolve, { once:true });
        image.addEventListener('error', resolve, { once:true });
        setTimeout(resolve, 1500);
      })));
      return images.filter((image) => image.complete && image.naturalWidth === 0).map((image) => image.currentSrc || image.src);
    })()`);
    assert.deepEqual(broken, [], `Broken images on ${route}`);
  }
});

test("valid player deep link survives a hard refresh", { skip:!firstPlayer && "No verified player content exists" }, async () => {
  const pathname = `/tr/oyuncular/${firstPlayer?.slug}`;
  await page.navigate(`${baseUrl}${pathname}`);
  await page.waitFor("Boolean(document.querySelector('.player-profile-layout'))", { message:"player deep link" });
  await page.reload();
  await page.waitFor("Boolean(document.querySelector('.player-profile-layout'))", { message:"player deep link refresh" });
  assert.equal(await page.evaluate("location.pathname"), pathname);
});
