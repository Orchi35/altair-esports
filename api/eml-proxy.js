// api/eml-proxy.js
// Vercel Serverless Function — emajorleague.com için CORS proxy
// URL: /api/eml-proxy?path=/tournaments/league_table/39/

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const path = req.query.path || "/";
  const fresh = req.query.fresh === "1";
  const targetUrl = `https://emajorleague.com${path}`;

  try {
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
        "Referer": "https://emajorleague.com/",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `EML returned ${response.status}` });
    }

    const html = await response.text();
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader(
      "Cache-Control",
      fresh ? "no-store, no-cache, must-revalidate, max-age=0" : "s-maxage=3600, stale-while-revalidate",
    );
    return res.status(200).send(html);

  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
}
