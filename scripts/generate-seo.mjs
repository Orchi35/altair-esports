import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inspectSnapshot } from "../server/match-center/service.js";
import { buildPublicRouteCatalog, getRouteSeo, SITE_ORIGIN } from "../src/seo/seo.js";
import { resolveRoute } from "../src/app/routes.js";
import { PARTNERSHIP_CONTENT } from "../src/content/partnerships/index.js";
import { injectPartnershipMetrics } from "./partnership-media-kit.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, "..");
const outputDirectory = path.join(projectDirectory, "dist");
const snapshotFile = path.join(projectDirectory, "public", "data", "eml-snapshot.json");
const templateFile = path.join(outputDirectory, "index.html");

const STATIC_PAGES = Object.freeze([
  {
    path:"/media-kit.html",
    file:"media-kit.html",
    locale:"tr",
    title:"Medya Kiti ve Marka İş Birlikleri | ALTAIR eSports",
    description:"ALTAIR eSports marka kimliği, doğrulanmış rekabet geçmişi ve partnerlik yaklaşımını içeren güncel medya kiti.",
    image:"/og.jpg",
    lastModified:PARTNERSHIP_CONTENT.mediaKit.updatedAt,
  },
  {
    path:"/privacy.html",
    file:"privacy.html",
    locale:"tr",
    title:"Gizlilik Bildirimi | ALTAIR eSports",
    description:"ALTAIR eSports internet sitesinde kullanılan veriler, analiz araçları, tarayıcı depolama alanı ve ziyaretçi hakları hakkında gizlilik bildirimi.",
    image:"/og.jpg",
    lastModified:"2026-08-11",
  },
  {
    path:"/terms.html",
    file:"terms.html",
    locale:"tr",
    title:"Kullanım Koşulları | ALTAIR eSports",
    description:"ALTAIR eSports internet sitesinin içerik, fikri mülkiyet, güncel veri ve kabul edilebilir kullanım koşulları.",
    image:"/og.jpg",
    lastModified:"2026-08-09",
  },
]);

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeXml(value) {
  return escapeHtml(value);
}

function renderStructuredData(items = []) {
  return items.map((item) => {
    const json = JSON.stringify(item).replaceAll("<", "\\u003c");
    return `    <script type="application/ld+json" data-seo-jsonld="true">${json}</script>`;
  }).join("\n");
}

function renderMetadata(metadata) {
  const tags = [
    `    <title>${escapeHtml(metadata.title)}</title>`,
    `    <meta name="description" content="${escapeHtml(metadata.description)}" />`,
    `    <meta name="robots" content="${escapeHtml(metadata.robots)}" />`,
  ];
  if (metadata.canonical) tags.push(`    <link rel="canonical" href="${escapeHtml(metadata.canonical)}" />`);
  metadata.alternates.forEach(({ hreflang, href }) => {
    tags.push(`    <link rel="alternate" hreflang="${escapeHtml(hreflang)}" href="${escapeHtml(href)}" />`);
  });
  tags.push(
    `    <meta property="og:type" content="${escapeHtml(metadata.ogType)}" />`,
    "    <meta property=\"og:site_name\" content=\"ALTAIR eSports\" />",
    `    <meta property="og:locale" content="${escapeHtml(metadata.ogLocale)}" />`,
  );
  if (metadata.alternateOgLocale) {
    tags.push(`    <meta property="og:locale:alternate" content="${escapeHtml(metadata.alternateOgLocale)}" />`);
  }
  [
    ["og:title", metadata.ogTitle],
    ["og:description", metadata.ogDescription],
    ["og:url", metadata.ogUrl],
    ["og:image", metadata.ogImage],
    ["og:image:alt", metadata.ogImageAlt],
    ["og:image:width", metadata.ogImageWidth],
    ["og:image:height", metadata.ogImageHeight],
  ].forEach(([property, content]) => {
    if (content) tags.push(`    <meta property="${property}" content="${escapeHtml(content)}" />`);
  });
  [
    ["twitter:card", metadata.twitterCard],
    ["twitter:title", metadata.ogTitle],
    ["twitter:description", metadata.ogDescription],
    ["twitter:image", metadata.ogImage],
    ["twitter:image:alt", metadata.ogImageAlt],
  ].forEach(([name, content]) => {
    if (content) tags.push(`    <meta name="${name}" content="${escapeHtml(content)}" />`);
  });
  const structuredData = renderStructuredData(metadata.structuredData);
  if (structuredData) tags.push(structuredData);
  return tags.join("\n");
}

function renderPrerender(metadata) {
  const breadcrumbs = metadata.prerender.breadcrumbs || [];
  const breadcrumbMarkup = breadcrumbs.length > 1
    ? `<nav aria-label="${metadata.locale === "tr" ? "Sayfa yolu" : "Breadcrumb"}"><ol>${breadcrumbs.map((item, index) => {
      const content = index === breadcrumbs.length - 1
        ? `<span aria-current="page">${escapeHtml(item.label)}</span>`
        : `<a href="${escapeHtml(item.path)}">${escapeHtml(item.label)}</a>`;
      return `<li>${content}</li>`;
    }).join("")}</ol></nav>`
    : "";
  return `<main class="seo-prerender"><div>${breadcrumbMarkup}<h1>${escapeHtml(metadata.prerender.h1)}</h1><p>${escapeHtml(metadata.prerender.description)}</p></div></main>`;
}

function injectRoute(template, metadata) {
  return template
    .replace(/<html\s+lang="[^"]*"/, `<html lang="${escapeHtml(metadata.locale)}"`)
    .replace(/<!-- SEO:START -->[\s\S]*?<!-- SEO:END -->/, `<!-- SEO:START -->\n${renderMetadata(metadata)}\n    <!-- SEO:END -->`)
    .replace(/<!-- PRERENDER:START -->[\s\S]*?<!-- PRERENDER:END -->/, `<!-- PRERENDER:START -->${renderPrerender(metadata)}<!-- PRERENDER:END -->`);
}

function staticMetadata(page) {
  const canonical = new URL(page.path, SITE_ORIGIN).href;
  const image = new URL(page.image, SITE_ORIGIN).href;
  return {
    ...page,
    canonical,
    robots:"index, follow, max-image-preview:large",
    ogType:"website",
    ogLocale:"tr_TR",
    ogTitle:page.title,
    ogDescription:page.description,
    ogUrl:canonical,
    ogImage:image,
    ogImageAlt:"ALTAIR eSports",
    ogImageWidth:1200,
    ogImageHeight:630,
    twitterCard:"summary_large_image",
    alternates:[],
    structuredData:[],
    indexable:true,
  };
}

function injectStaticMetadata(html, metadata) {
  const cleaned = html
    .replace(/\s*<title>[\s\S]*?<\/title>/i, "")
    .replace(/\s*<meta\s+name="description"[^>]*>/i, "")
    .replace(/\s*<meta\s+name="robots"[^>]*>/i, "")
    .replace(/\s*<link\s+rel="canonical"[^>]*>/i, "")
    .replace(/\s*<link\s+rel="alternate"[^>]*>/gi, "")
    .replace(/\s*<meta\s+property="og:[^"]+"[^>]*>/gi, "")
    .replace(/\s*<meta\s+name="twitter:[^"]+"[^>]*>/gi, "");
  return cleaned.replace("</head>", `    <!-- SEO:STATIC -->\n${renderMetadata(metadata)}\n  </head>`);
}

function routeOutputFile(canonicalPath) {
  const safeSegments = canonicalPath.split("/").filter(Boolean);
  return path.join(outputDirectory, ...safeSegments, "index.html");
}

function toDateOnly(value) {
  const timestamp = Date.parse(value || "");
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString().slice(0, 10) : null;
}

function renderSitemap(records) {
  const entries = records.map((record) => {
    const alternateTags = (record.alternates || [])
      .map(({ hreflang, href }) => `    <xhtml:link rel="alternate" hreflang="${escapeXml(hreflang)}" href="${escapeXml(href)}" />`)
      .join("\n");
    const lastmod = toDateOnly(record.lastModified);
    return [
      "  <url>",
      `    <loc>${escapeXml(record.canonical)}</loc>`,
      ...(lastmod ? [`    <lastmod>${lastmod}</lastmod>`] : []),
      ...(alternateTags ? [alternateTags] : []),
      "  </url>",
    ].join("\n");
  }).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries}\n</urlset>\n`;
}

async function readCurrentMatchCenter() {
  try {
    const snapshot = JSON.parse(await fs.readFile(snapshotFile, "utf8"));
    return inspectSnapshot(snapshot, { now:new Date().toISOString(), requireCurrent:true }).data;
  } catch (error) {
    console.warn(`SEO build omitted match detail routes: ${error?.code || error?.message || String(error)}`);
    return null;
  }
}

async function main() {
  const template = await fs.readFile(templateFile, "utf8");
  const matchCenter = await readCurrentMatchCenter();
  const routeRecords = buildPublicRouteCatalog({ matchCenter });
  const manifest = [];

  for (const { route, seo } of routeRecords) {
    const outputFile = routeOutputFile(seo.canonicalPath);
    await fs.mkdir(path.dirname(outputFile), { recursive:true });
    await fs.writeFile(outputFile, injectRoute(template, seo), "utf8");
    manifest.push({
      kind:"app",
      routeName:route.name,
      locale:route.locale,
      path:seo.canonicalPath,
      output:path.relative(outputDirectory, outputFile).replaceAll("\\", "/"),
      title:seo.title,
      description:seo.description,
      canonical:seo.canonical,
      alternates:seo.alternates,
      lastModified:seo.lastModified,
      indexable:seo.indexable,
    });
  }

  const trHome = routeRecords.find(({ route }) => route.name === "home" && route.locale === "tr");
  if (!trHome) throw new Error("Turkish homepage metadata is missing");
  await fs.writeFile(templateFile, injectRoute(template, trHome.seo), "utf8");

  for (const page of STATIC_PAGES) {
    const metadata = staticMetadata(page);
    const staticFile = path.join(outputDirectory, page.file);
    let html = await fs.readFile(staticFile, "utf8");
    if (page.file === "media-kit.html") html = injectPartnershipMetrics(html);
    await fs.writeFile(staticFile, injectStaticMetadata(html, metadata), "utf8");
    manifest.push({
      kind:"static",
      locale:metadata.locale,
      path:page.path,
      output:page.file,
      title:metadata.title,
      description:metadata.description,
      canonical:metadata.canonical,
      alternates:metadata.alternates,
      lastModified:metadata.lastModified,
      indexable:true,
    });
  }

  const notFound = getRouteSeo(resolveRoute("/tr/sayfa-bulunamadi"));
  await fs.writeFile(path.join(outputDirectory, "404.html"), injectRoute(template, notFound), "utf8");

  const publicRecords = manifest.filter((record) => record.indexable);
  await fs.writeFile(path.join(outputDirectory, "sitemap.xml"), renderSitemap(publicRecords), "utf8");
  await fs.writeFile(path.join(outputDirectory, "seo-manifest.json"), `${JSON.stringify({ generatedAt:new Date().toISOString(), records:manifest }, null, 2)}\n`, "utf8");
  console.log(`SEO prerender generated ${routeRecords.length} app routes and ${STATIC_PAGES.length} static routes.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
