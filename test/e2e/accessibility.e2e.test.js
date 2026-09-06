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

async function auditCurrentPage(label) {
  const dom = await page.evaluate(`(() => {
    const visible = (element) => {
      const style = getComputedStyle(element);
      return style.display !== 'none' && style.visibility !== 'hidden';
    };
    const controlName = (element) => {
      const label = element.labels?.[0]?.textContent || '';
      const linkedLabel = element.id ? document.querySelector('label[for="' + CSS.escape(element.id) + '"]')?.textContent || '' : '';
      return (element.getAttribute('aria-label') || element.getAttribute('aria-labelledby') || label || linkedLabel || element.textContent || element.title || '').trim();
    };
    const ids = [...document.querySelectorAll('[id]')].map((element) => element.id);
    const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
    return {
      lang:document.documentElement.lang,
      h1Count:document.querySelectorAll('h1').length,
      hasMain:Boolean(document.querySelector('main')),
      hasSkipLink:Boolean(document.querySelector('a.skip-link[href="#main-content"]')),
      missingAlt:[...document.querySelectorAll('img:not([alt])')].map((image) => image.src),
      unnamedControls:[...document.querySelectorAll('button, a[href], input:not([type=hidden]), select, textarea')]
        .filter(visible).filter((element) => !controlName(element)).map((element) => element.outerHTML.slice(0, 120)),
      duplicateIds:duplicates,
      badTableHeaders:[...document.querySelectorAll('table th')].filter((cell) => !['col', 'row'].includes(cell.getAttribute('scope'))).map((cell) => cell.textContent.trim()),
      invalidTabSelection:[...document.querySelectorAll('[role=tablist]')].filter((list) => list.querySelectorAll('[role=tab][aria-selected=true]').length !== 1).length,
    };
  })()`);
  assert.ok(["tr", "en"].includes(dom.lang), `${label}: missing valid document language`);
  assert.equal(dom.h1Count, 1, `${label}: expected one h1`);
  assert.equal(dom.hasMain, true, `${label}: missing main landmark`);
  assert.equal(dom.hasSkipLink, true, `${label}: missing skip link`);
  assert.deepEqual(dom.missingAlt, [], `${label}: images without alt`);
  assert.deepEqual(dom.unnamedControls, [], `${label}: unnamed controls`);
  assert.deepEqual(dom.duplicateIds, [], `${label}: duplicate IDs`);
  assert.deepEqual(dom.badTableHeaders, [], `${label}: table headers without scope`);
  assert.equal(dom.invalidTabSelection, 0, `${label}: tablist selection is invalid`);

  const { nodes = [] } = await page.accessibilityTree();
  const interactiveRoles = new Set(["button", "link", "checkbox", "combobox", "textbox", "tab"]);
  const unnamed = nodes.filter((node) => !node.ignored && interactiveRoles.has(node.role?.value) && !String(node.name?.value || "").trim());
  assert.deepEqual(unnamed.map((node) => node.role?.value), [], `${label}: unnamed interactive accessibility-tree nodes`);
}

const firstPlayer = getPublishedPlayers()[0];
const firstNews = getPublishedNews({ locale:"tr" })[0] || null;
const routes = [
  ["homepage", "/tr", ".brand-hero"],
  ["matches", "/tr/maclar", ".content-page"],
  ["squad", "/tr/kadro", ".content-page"],
  ["player detail", firstPlayer ? `/tr/oyuncular/${firstPlayer.slug}` : null, ".player-profile-layout"],
  ["news detail", firstNews ? `/tr/haberler/${firstNews.slug}` : null, ".news-article"],
  ["partnerships", "/tr/partnerlik", ".partnership-form"],
];

for (const [label, route, selector] of routes) {
  test(`${label} passes the accessibility smoke audit`, { skip:!route && `No verified ${label} content exists` }, async () => {
    await page.setViewport(1280, 900);
    await page.navigate(`${baseUrl}${route}`);
    await page.waitFor(`Boolean(document.querySelector(${JSON.stringify(selector)}))`, { message:`${label} content` });
    await auditCurrentPage(label);
  });
}


