import { useEffect } from "react";

function setMeta(attribute, key, content) {
  const selector = `meta[${attribute}="${key}"]`;
  let element = document.head.querySelector(selector);
  if (content === null || content === undefined || content === "") {
    element?.remove();
    return;
  }
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.append(element);
  }
  element.setAttribute("content", String(content));
}

function setCanonical(href) {
  let element = document.head.querySelector('link[rel="canonical"]');
  if (!href) {
    element?.remove();
    return;
  }
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", "canonical");
    document.head.append(element);
  }
  element.setAttribute("href", href);
}

function setAlternates(alternates) {
  document.head.querySelectorAll('link[rel="alternate"][hreflang]').forEach((element) => element.remove());
  alternates.forEach(({ hreflang, href }) => {
    if (!hreflang || !href) return;
    const element = document.createElement("link");
    element.setAttribute("rel", "alternate");
    element.setAttribute("hreflang", hreflang);
    element.setAttribute("href", href);
    document.head.append(element);
  });
}

function setStructuredData(items) {
  document.head.querySelectorAll('script[type="application/ld+json"][data-seo-jsonld]').forEach((element) => element.remove());
  items.forEach((item) => {
    const element = document.createElement("script");
    element.type = "application/ld+json";
    element.dataset.seoJsonld = "true";
    element.textContent = JSON.stringify(item).replace(/</g, "\\u003c");
    document.head.append(element);
  });
}

export function useDocumentMeta(metadata) {
  useEffect(() => {
    if (!metadata) return;
    document.documentElement.lang = metadata.locale || "tr";
    if (metadata.title) document.title = metadata.title;
    setMeta("name", "description", metadata.description);
    setMeta("name", "robots", metadata.robots);
    setCanonical(metadata.canonical);
    setAlternates(metadata.alternates || []);

    setMeta("property", "og:type", metadata.ogType);
    setMeta("property", "og:site_name", "ALTAIR eSports");
    setMeta("property", "og:locale", metadata.ogLocale);
    document.head.querySelectorAll('meta[property="og:locale:alternate"]').forEach((element) => element.remove());
    if (metadata.alternateOgLocale) {
      const alternateLocale = document.createElement("meta");
      alternateLocale.setAttribute("property", "og:locale:alternate");
      alternateLocale.setAttribute("content", metadata.alternateOgLocale);
      document.head.append(alternateLocale);
    }
    setMeta("property", "og:title", metadata.ogTitle || metadata.title);
    setMeta("property", "og:description", metadata.ogDescription || metadata.description);
    setMeta("property", "og:url", metadata.ogUrl || metadata.canonical);
    setMeta("property", "og:image", metadata.ogImage);
    setMeta("property", "og:image:alt", metadata.ogImageAlt);
    setMeta("property", "og:image:width", metadata.ogImageWidth);
    setMeta("property", "og:image:height", metadata.ogImageHeight);

    setMeta("name", "twitter:card", metadata.twitterCard || "summary_large_image");
    setMeta("name", "twitter:title", metadata.ogTitle || metadata.title);
    setMeta("name", "twitter:description", metadata.ogDescription || metadata.description);
    setMeta("name", "twitter:image", metadata.ogImage);
    setMeta("name", "twitter:image:alt", metadata.ogImageAlt);
    setStructuredData(metadata.structuredData || []);
  }, [metadata]);
}

