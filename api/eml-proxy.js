import { fetchAllowedHtml, UpstreamError } from "../server/match-center/upstream.js";

// Kadro ekranının ihtiyaç duyduğu izinli eMajor League HTML sayfalarını alır.
// Maç, fikstür ve puan durumu verileri yalnızca /api/match-center üzerinden sunulur.

const UPSTREAM_ORIGIN = "https://emajorleague.com";
const ALLOWED_PATHS = [
  /^\/team\/ALTAIReSports\/?$/i,
  /^\/teams\/team\/\d+\/\d+\/\d+\/squad\/?$/i,
];

function setCorsHeaders(req, res) {
  const origin = String(req.headers.origin || "");
  const isLocalOrigin = /^http:\/\/(?:localhost|127\.0\.0\.1):\d+$/i.test(origin);
  const isProductionOrigin = /^https:\/\/(?:www\.)?altairesports\.com$/i.test(origin);

  if (isLocalOrigin || isProductionOrigin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }

  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const rawPath = Array.isArray(req.query.path) ? req.query.path[0] : req.query.path;
  const fresh = req.query.fresh === "1";

  if (!rawPath || typeof rawPath !== "string") {
    return res.status(400).json({ error: "A valid path is required" });
  }

  let targetUrl;
  try {
    targetUrl = new URL(rawPath, UPSTREAM_ORIGIN);
  } catch {
    return res.status(400).json({ error: "Invalid path" });
  }

  const allowedPath = targetUrl.origin === UPSTREAM_ORIGIN
    && ALLOWED_PATHS.some((pattern) => pattern.test(targetUrl.pathname));

  if (!allowedPath) {
    return res.status(403).json({ error: "Path is not allowed" });
  }

  try {
    const html = await fetchAllowedHtml(targetUrl.pathname);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader(
      "Cache-Control",
      fresh ? "no-store, no-cache, must-revalidate, max-age=0" : "s-maxage=3600, stale-while-revalidate",
    );
    return res.status(200).send(html);

  } catch (error) {
    const code = error instanceof UpstreamError ? error.code : "UPSTREAM_UNAVAILABLE";
    return res.status(502).json({ error: "Upstream data could not be loaded", code });
  }
}
