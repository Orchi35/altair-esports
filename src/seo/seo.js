import { getRoutePath, resolveRoute, SUPPORTED_LOCALES } from "../app/routes.js";
import { HONOURS_CONTENT } from "../content/honours/index.js";
import { createMatchSlug, findMatchBySlug, getAllMatches } from "../content/matches/index.js";
import { getNewsBySlug, getPublishedNews, NEWS_CONTENT } from "../content/news/index.js";
import { PARTNERSHIP_CONTENT } from "../content/partnerships/index.js";
import { getPlayerContentBySlug, getPublishedPlayers } from "../content/players/index.js";
import { SITE_LINKS } from "../config/site.js";
import { formatMatchDate, formatMatchTime, formatTimezoneLabel } from "../utils/dateTime.js";

export const SITE_ORIGIN = "https://www.altairesports.com";
export const DEFAULT_OG_IMAGE_PATH = "/og.jpg";

const LOCALE_CONFIG = Object.freeze({
  tr:{ html:"tr", og:"tr_TR", alternateOg:"en_US" },
  en:{ html:"en", og:"en_US", alternateOg:"tr_TR" },
});

const SEO_COPY = Object.freeze({
  tr:{
    home:{ title:"ALTAIR eSports | Resmî FC 26 Pro Clubs Takımı", description:"ALTAIR eSports resmî sitesi: doğrulanmış maçlar, güncel kadro, başarılar, kulüp haberleri ve partnerlik bilgileri.", h1:"Birlikte oynar, birlikte kazanırız." },
    matches:{ title:"Maçlar ve Sonuçlar | ALTAIR eSports", description:"ALTAIR eSports yaklaşan maçları, doğrulanmış son sonuçları ve güncel sezon bilgileri.", h1:"Maçlar" },
    squad:{ title:"Güncel Kadro | ALTAIR eSports", description:"ALTAIR eSports aktif kadrosunu kaleci, defans, orta saha ve hücum gruplarında inceleyin.", h1:"Kadro" },
    news:{ title:"Kulüp Haberleri | ALTAIR eSports", description:"ALTAIR eSports tarafından tarihli ve doğrulanmış olarak yayımlanan haberler, raporlar ve açıklamalar.", h1:"Haberler" },
    honours:{ title:"Kulüp Başarıları | ALTAIR eSports", description:"ALTAIR eSports takımının doğrulanmış lig dereceleri, finalleri ve turnuva başarıları.", h1:"Başarılar" },
    partnerships:{ title:"Marka Partnerlikleri | ALTAIR eSports", description:"ALTAIR eSports marka partnerliği, iş birliği alanları ve resmî iletişim bilgileri.", h1:"Partnerlik" },
    matchDetail:"Maç Detayı",
    playerDetail:"Oyuncu Profili",
    notFound:{ title:"Sayfa Bulunamadı | ALTAIR eSports", description:"İstenen ALTAIR eSports sayfası bulunamadı.", h1:"Sayfa bulunamadı" },
    breadcrumbs:{ home:"Ana Sayfa", matches:"Maçlar", squad:"Kadro", news:"Haberler", honours:"Başarılar", partnerships:"Partnerlik" },
  },
  en:{
    home:{ title:"ALTAIR eSports | Official FC 26 Pro Clubs Team", description:"The official ALTAIR eSports site for verified matches, the active squad, club honours, news and partnership information.", h1:"Together we play, together we win." },
    matches:{ title:"Matches and Results | ALTAIR eSports", description:"Upcoming ALTAIR eSports fixtures, verified recent results and current season information.", h1:"Matches" },
    squad:{ title:"Active Squad | ALTAIR eSports", description:"Explore the active ALTAIR eSports squad grouped into goalkeepers, defenders, midfielders and forwards.", h1:"Squad" },
    news:{ title:"Club News | ALTAIR eSports", description:"Dated and verified news, reports and official statements published by ALTAIR eSports.", h1:"News" },
    honours:{ title:"Club Honours | ALTAIR eSports", description:"Verified league finishes, finals and tournament honours achieved by ALTAIR eSports.", h1:"Honours" },
    partnerships:{ title:"Brand Partnerships | ALTAIR eSports", description:"ALTAIR eSports brand partnership opportunities, collaboration areas and official contact information.", h1:"Partnerships" },
    matchDetail:"Match Details",
    playerDetail:"Player Profile",
    notFound:{ title:"Page Not Found | ALTAIR eSports", description:"The requested ALTAIR eSports page could not be found.", h1:"Page not found" },
    breadcrumbs:{ home:"Home", matches:"Matches", squad:"Squad", news:"News", honours:"Honours", partnerships:"Partnerships" },
  },
});

function absoluteUrl(value) {
  if (!value) return null;
  try {
    return new URL(value, SITE_ORIGIN).href;
  } catch {
    return null;
  }
}

function organizationNode() {
  return {
    "@type":"Organization",
    "@id":`${SITE_ORIGIN}/#organization`,
    name:"ALTAIR eSports",
    url:`${SITE_ORIGIN}/tr`,
    logo:absoluteUrl("/logo-ui.png"),
    foundingDate:"2025",
    sameAs:[SITE_LINKS.instagram, SITE_LINKS.twitch, SITE_LINKS.youtube, SITE_LINKS.discord].filter(Boolean),
  };
}

function sportsTeamNode() {
  return {
    "@type":"SportsTeam",
    "@id":`${SITE_ORIGIN}/#sports-team`,
    name:"ALTAIR eSports",
    url:`${SITE_ORIGIN}/tr`,
    logo:absoluteUrl("/logo-ui.png"),
    foundingDate:"2025",
    sport:"EA SPORTS FC Pro Clubs",
    parentOrganization:{ "@id":`${SITE_ORIGIN}/#organization` },
    sameAs:[SITE_LINKS.instagram, SITE_LINKS.twitch, SITE_LINKS.youtube, SITE_LINKS.discord].filter(Boolean),
  };
}

function websiteNode() {
  return {
    "@type":"WebSite",
    "@id":`${SITE_ORIGIN}/#website`,
    name:"ALTAIR eSports",
    url:`${SITE_ORIGIN}/tr`,
    inLanguage:["tr", "en"],
    publisher:{ "@id":`${SITE_ORIGIN}/#organization` },
  };
}

function breadcrumbNode(items) {
  if (!Array.isArray(items) || items.length < 2) return null;
  return {
    "@context":"https://schema.org",
    "@type":"BreadcrumbList",
    itemListElement:items.map((item, index) => ({
      "@type":"ListItem",
      position:index + 1,
      name:item.label,
      item:absoluteUrl(item.path),
    })),
  };
}

function eventStatus(status) {
  const values = {
    scheduled:"https://schema.org/EventScheduled",
    finished:"https://schema.org/EventCompleted",
    postponed:"https://schema.org/EventPostponed",
    cancelled:"https://schema.org/EventCancelled",
  };
  return values[status] || "https://schema.org/EventScheduled";
}

function getNewsAlternate(article, locale) {
  if (!article) return null;
  const alternateLocale = locale === "tr" ? "en" : "tr";
  return NEWS_CONTENT.find((item) => item.status === "published"
    && item.verified === true
    && item.locale === alternateLocale
    && (item.id === article.id || item.slug === article.slug)) || null;
}

function buildAlternates(route, article = null) {
  if (!route || route.isNotFound) return [];
  if (route.name === "news-detail") {
    const current = article;
    const alternate = getNewsAlternate(article, route.locale);
    if (!current || !alternate) return [];
    const trArticle = current.locale === "tr" ? current : alternate;
    const enArticle = current.locale === "en" ? current : alternate;
    return [
      { hreflang:"tr", href:absoluteUrl(getRoutePath("news-detail", "tr", trArticle.slug)) },
      { hreflang:"en", href:absoluteUrl(getRoutePath("news-detail", "en", enArticle.slug)) },
      { hreflang:"x-default", href:absoluteUrl(getRoutePath("news-detail", "tr", trArticle.slug)) },
    ];
  }
  const trPath = getRoutePath(route.name, "tr", route.slug);
  const enPath = getRoutePath(route.name, "en", route.slug);
  return [
    { hreflang:"tr", href:absoluteUrl(trPath) },
    { hreflang:"en", href:absoluteUrl(enPath) },
    { hreflang:"x-default", href:absoluteUrl(trPath) },
  ];
}

function baseMetadata({ route, title, description, h1, breadcrumbs, ogImage, ogType = "website", lastModified = null, structuredData = [], article = null }) {
  const locale = route.locale;
  const canonicalPath = getRoutePath(route.name, locale, route.slug);
  const image = absoluteUrl(ogImage || DEFAULT_OG_IMAGE_PATH);
  const imageIsDefault = image === absoluteUrl(DEFAULT_OG_IMAGE_PATH);
  const breadcrumb = breadcrumbNode(breadcrumbs);
  return {
    title,
    description,
    canonical:absoluteUrl(canonicalPath),
    canonicalPath,
    robots:"index, follow, max-image-preview:large",
    locale:LOCALE_CONFIG[locale].html,
    ogLocale:LOCALE_CONFIG[locale].og,
    alternateOgLocale:LOCALE_CONFIG[locale].alternateOg,
    ogType,
    ogTitle:title,
    ogDescription:description,
    ogUrl:absoluteUrl(canonicalPath),
    ogImage:image,
    ogImageAlt:`${h1} · ALTAIR eSports`,
    ogImageWidth:imageIsDefault ? 1200 : null,
    ogImageHeight:imageIsDefault ? 630 : null,
    twitterCard:"summary_large_image",
    alternates:buildAlternates(route, article),
    lastModified,
    structuredData:[...structuredData, ...(breadcrumb ? [breadcrumb] : [])],
    prerender:{ h1, description, breadcrumbs },
    indexable:true,
  };
}

function notFoundMetadata(route) {
  const locale = route?.locale === "en" ? "en" : "tr";
  const copy = SEO_COPY[locale].notFound;
  return {
    title:copy.title,
    description:copy.description,
    canonical:null,
    canonicalPath:null,
    robots:"noindex, nofollow",
    locale,
    ogLocale:LOCALE_CONFIG[locale].og,
    alternateOgLocale:LOCALE_CONFIG[locale].alternateOg,
    ogType:"website",
    ogTitle:copy.title,
    ogDescription:copy.description,
    ogUrl:null,
    ogImage:absoluteUrl(DEFAULT_OG_IMAGE_PATH),
    ogImageAlt:"ALTAIR eSports",
    ogImageWidth:1200,
    ogImageHeight:630,
    twitterCard:"summary_large_image",
    alternates:[],
    lastModified:null,
    structuredData:[],
    prerender:{ h1:copy.h1, description:copy.description, breadcrumbs:[] },
    indexable:false,
  };
}

export function getRouteSeo(route, { matchCenter = null } = {}) {
  if (!route || route.isNotFound) return notFoundMetadata(route);
  const locale = route.locale === "en" ? "en" : "tr";
  const copy = SEO_COPY[locale];
  const homePath = getRoutePath("home", locale);
  const lastSuccessfulAt = matchCenter?.meta?.lastSuccessfulAt || matchCenter?.meta?.generatedAt || null;
  const rootBreadcrumb = { label:copy.breadcrumbs.home, path:homePath };

  if (route.name === "home") {
    return baseMetadata({
      route,
      ...copy.home,
      breadcrumbs:[rootBreadcrumb],
      lastModified:lastSuccessfulAt,
      structuredData:[{ "@context":"https://schema.org", "@graph":[organizationNode(), sportsTeamNode(), websiteNode()] }],
    });
  }

  const listCopy = copy[route.name];
  if (["matches", "squad", "news", "honours", "partnerships"].includes(route.name) && listCopy) {
    const breadcrumbLabel = copy.breadcrumbs[route.name];
    const contentLastModified = route.name === "partnerships"
      ? PARTNERSHIP_CONTENT.updatedAt || PARTNERSHIP_CONTENT.publishedAt
      : route.name === "honours"
        ? HONOURS_CONTENT.map((item) => item.updatedAt || item.publishedAt || item.achievedAt).filter(Boolean).sort().at(-1) || null
        : route.name === "matches" ? lastSuccessfulAt : null;
    return baseMetadata({ route, ...listCopy, breadcrumbs:[rootBreadcrumb, { label:breadcrumbLabel, path:getRoutePath(route.name, locale) }], lastModified:contentLastModified });
  }

  if (route.name === "match-detail") {
    const match = findMatchBySlug(matchCenter, route.slug);
    if (!match) return notFoundMetadata(route);
    const date = formatMatchDate(match.startsAt, locale === "tr" ? "TR" : "EN", match.timezone);
    const time = formatMatchTime(match.startsAt, locale === "tr" ? "TR" : "EN", match.timezone);
    const score = match.status === "finished" && match.score ? ` ${match.score.home}-${match.score.away}.` : "";
    const title = `${match.homeTeam.name} - ${match.awayTeam.name} · ${match.round || copy.matchDetail} | ${copy.matchDetail}`;
    const description = locale === "tr"
      ? `${match.homeTeam.name} - ${match.awayTeam.name} karşılaşması: ${date}, ${time} ${formatTimezoneLabel(match.timezone, "TR")}.${score} ${match.competition}.`
      : `${match.homeTeam.name} vs ${match.awayTeam.name}: ${date}, ${time} ${formatTimezoneLabel(match.timezone, "EN")}.${score} ${match.competition}.`;
    const breadcrumbs = [rootBreadcrumb, { label:copy.breadcrumbs.matches, path:getRoutePath("matches", locale) }, { label:`${match.homeTeam.shortName} - ${match.awayTeam.shortName}`, path:getRoutePath("match-detail", locale, route.slug) }];
    const event = {
      "@context":"https://schema.org",
      "@type":"SportsEvent",
      name:`${match.homeTeam.name} - ${match.awayTeam.name}`,
      url:absoluteUrl(getRoutePath("match-detail", locale, route.slug)),
      startDate:match.startsAt,
      eventStatus:eventStatus(match.status),
      sport:"EA SPORTS FC Pro Clubs",
      homeTeam:{ "@type":"SportsTeam", name:match.homeTeam.name, ...(match.homeTeam.id === "altair-esports" ? { "@id":`${SITE_ORIGIN}/#sports-team` } : {}) },
      awayTeam:{ "@type":"SportsTeam", name:match.awayTeam.name, ...(match.awayTeam.id === "altair-esports" ? { "@id":`${SITE_ORIGIN}/#sports-team` } : {}) },
      image:absoluteUrl(DEFAULT_OG_IMAGE_PATH),
    };
    return baseMetadata({ route, title, description, h1:`${match.homeTeam.name} · ${match.awayTeam.name}`, breadcrumbs, lastModified:lastSuccessfulAt, structuredData:[event] });
  }

  if (route.name === "player-detail") {
    const player = getPlayerContentBySlug(route.slug);
    if (!player) return notFoundMetadata(route);
    const localized = player.locales[locale];
    const seo = player.seo[locale];
    const title = seo.title;
    const description = seo.description;
    const canonicalPath = getRoutePath("player-detail", locale, player.slug);
    const breadcrumbs = [rootBreadcrumb, { label:copy.breadcrumbs.squad, path:getRoutePath("squad", locale) }, { label:localized.name, path:canonicalPath }];
    const person = player.player.detailsPending ? null : {
      "@type":"Person",
      name:localized.name,
      alternateName:player.player.ign,
      ...(player.images.profile?.src ? { image:absoluteUrl(player.images.profile.src) } : {}),
      affiliation:{ "@id":`${SITE_ORIGIN}/#sports-team` },
    };
    const profilePage = {
      "@context":"https://schema.org",
      "@type":"ProfilePage",
      name:title,
      url:absoluteUrl(canonicalPath),
      ...(person ? { mainEntity:person } : {}),
    };
    return baseMetadata({ route, title, description, h1:localized.name, breadcrumbs, ogImage:seo.ogImage, lastModified:player.updatedAt || player.publishedAt, structuredData:[profilePage], ogType:"profile" });
  }

  if (route.name === "news-detail") {
    const article = getNewsBySlug(route.slug, { locale });
    if (!article) return notFoundMetadata(route);
    const title = article.seo?.title || `${article.title} | ALTAIR eSports`;
    const description = article.seo?.description || article.excerpt;
    const canonicalPath = getRoutePath("news-detail", locale, article.slug);
    const breadcrumbs = [rootBreadcrumb, { label:copy.breadcrumbs.news, path:getRoutePath("news", locale) }, { label:article.title, path:canonicalPath }];
    const newsArticle = {
      "@context":"https://schema.org",
      "@type":"NewsArticle",
      headline:article.title,
      description,
      datePublished:article.publishedAt,
      ...(article.updatedAt ? { dateModified:article.updatedAt } : {}),
      mainEntityOfPage:absoluteUrl(canonicalPath),
      author:{ "@id":`${SITE_ORIGIN}/#organization` },
      publisher:{ "@id":`${SITE_ORIGIN}/#organization` },
      image:[absoluteUrl(article.seo?.ogImage || article.image || DEFAULT_OG_IMAGE_PATH)],
    };
    return baseMetadata({ route, title, description, h1:article.title, breadcrumbs, ogImage:article.seo?.ogImage || article.image, ogType:"article", lastModified:article.updatedAt || article.publishedAt, structuredData:[newsArticle], article });
  }

  return notFoundMetadata(route);
}

export function buildPublicRouteCatalog({ matchCenter = null } = {}) {
  const routeRecords = [];
  const add = (name, locale, slug = null) => {
    const path = getRoutePath(name, locale, slug);
    const route = resolveRoute(path, locale);
    const seo = getRouteSeo(route, { matchCenter });
    if (seo.indexable) routeRecords.push({ route, seo });
  };

  SUPPORTED_LOCALES.forEach((locale) => {
    ["home", "matches", "squad", "news", "honours", "partnerships"].forEach((name) => add(name, locale));
    getPublishedPlayers().forEach((player) => add("player-detail", locale, player.slug));
    getAllMatches(matchCenter).forEach((match) => add("match-detail", locale, createMatchSlug(match)));
    getPublishedNews({ locale }).forEach((article) => add("news-detail", locale, article.slug));
  });

  return routeRecords.sort((left, right) => left.seo.canonical.localeCompare(right.seo.canonical));
}

export function getSeoCopy(locale = "tr") {
  return SEO_COPY[locale === "en" ? "en" : "tr"];
}
