import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.join(projectDirectory, "dist");

function countMatches(value, pattern) {
  return [...value.matchAll(pattern)].length;
}

function decodeEntities(value) {
  return String(value || "")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function readAttribute(html, pattern) {
  return decodeEntities(html.match(pattern)?.[1] || "");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function parseJsonLd(html, label) {
  const scripts = [...html.matchAll(/<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
  scripts.forEach((match, index) => {
    try {
      JSON.parse(match[1]);
    } catch (error) {
      throw new Error(`${label}: JSON-LD ${index + 1} is invalid (${error.message})`);
    }
  });
}

async function verifyPage(record) {
  const filename = path.join(outputDirectory, record.output);
  const html = await fs.readFile(filename, "utf8");
  const label = record.path;
  assert(countMatches(html, /<title>[\s\S]*?<\/title>/gi) === 1, `${label}: expected one title`);
  assert(countMatches(html, /<meta\s+name="description"[^>]*>/gi) === 1, `${label}: expected one description`);
  assert(countMatches(html, /<link\s+rel="canonical"[^>]*>/gi) === 1, `${label}: expected one canonical`);
  assert(countMatches(html, /<h1(?:\s[^>]*)?>/gi) === 1, `${label}: expected one h1`);
  assert(readAttribute(html, /<title>([\s\S]*?)<\/title>/i) === record.title, `${label}: title differs from manifest`);
  assert(readAttribute(html, /<link\s+rel="canonical"\s+href="([^"]+)"/i) === record.canonical, `${label}: canonical differs from manifest`);
  assert(readAttribute(html, /<meta\s+name="description"\s+content="([^"]+)"/i), `${label}: empty description`);
  record.alternates.forEach(({ hreflang, href }) => {
    const escapedLanguage = hreflang.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`<link\\s+rel="alternate"\\s+hreflang="${escapedLanguage}"\\s+href="([^"]+)"`, "i");
    assert(readAttribute(html, pattern) === href, `${label}: missing or incorrect ${hreflang} alternate`);
  });
  parseJsonLd(html, label);
}

async function main() {
  const manifest = JSON.parse(await fs.readFile(path.join(outputDirectory, "seo-manifest.json"), "utf8"));
  const records = manifest.records.filter((record) => record.indexable);
  assert(records.length > 0, "SEO manifest has no public records");

  const titles = new Set();
  const canonicals = new Set();
  for (const record of records) {
    assert(record.title && !titles.has(record.title), `Duplicate title: ${record.title}`);
    assert(record.canonical && !canonicals.has(record.canonical), `Duplicate canonical: ${record.canonical}`);
    titles.add(record.title);
    canonicals.add(record.canonical);
    await verifyPage(record);
  }

  for (const record of records.filter((item) => item.kind === "app")) {
    const alternates = new Map(record.alternates.map((item) => [item.hreflang, item.href]));
    assert(alternates.has("tr") && alternates.has("en") && alternates.has("x-default"), `${record.path}: incomplete hreflang set`);
    for (const href of alternates.values()) {
      assert(canonicals.has(href), `${record.path}: hreflang target is not public: ${href}`);
    }
  }

  const sitemap = await fs.readFile(path.join(outputDirectory, "sitemap.xml"), "utf8");
  const sitemapUrls = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => decodeEntities(match[1])));
  assert(sitemapUrls.size === records.length, `Sitemap has ${sitemapUrls.size} URLs; expected ${records.length}`);
  records.forEach((record) => assert(sitemapUrls.has(record.canonical), `Sitemap is missing ${record.canonical}`));

  const notFound = await fs.readFile(path.join(outputDirectory, "404.html"), "utf8");
  assert(/<meta\s+name="robots"\s+content="noindex, nofollow"/i.test(notFound), "404 page must be noindex, nofollow");
  assert(!/<link\s+rel="canonical"/i.test(notFound), "404 page must not have a canonical URL");
  assert(countMatches(notFound, /<h1(?:\s[^>]*)?>/gi) === 1, "404 page must have one h1");
  parseJsonLd(notFound, "404");

  console.log(`SEO verification passed for ${records.length} public routes.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
