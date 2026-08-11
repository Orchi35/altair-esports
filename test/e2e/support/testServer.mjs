import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const outputDirectory = path.join(projectDirectory, "dist");
const CONTENT_TYPES = Object.freeze({
  ".avif":"image/avif",
  ".css":"text/css; charset=utf-8",
  ".html":"text/html; charset=utf-8",
  ".ico":"image/x-icon",
  ".jpg":"image/jpeg",
  ".js":"text/javascript; charset=utf-8",
  ".json":"application/json; charset=utf-8",
  ".pdf":"application/pdf",
  ".png":"image/png",
  ".svg":"image/svg+xml",
  ".webmanifest":"application/manifest+json",
  ".webp":"image/webp",
  ".xml":"application/xml; charset=utf-8",
});

function isoFromNow(offsetMs) {
  return new Date(Date.now() + offsetMs).toISOString();
}

function team(id, name, shortName, logo = null) {
  return { id, name, shortName, logo };
}

function matchCenterEnvelope(mode = "fresh") {
  const generatedAt = isoFromNow(-5 * 60 * 1000);
  if (mode === "unavailable") {
    return {
      meta:{
        status:"unavailable",
        reason:"UPSTREAM_UNAVAILABLE",
        warningCode:"DNS_FAILURE",
        checkedAt:generatedAt,
        lastSuccessfulAt:isoFromNow(-48 * 60 * 60 * 1000),
        retryAfterSeconds:900,
        sourceName:"EML",
        isStale:false,
      },
      data:null,
    };
  }
  const altair = team("altair-esports", "ALTAIR eSports", "ALT", "/logo-ui.png");
  const gunners = team("gunners", "Gunners", "GUN");
  const shelter = team("shelter-fc", "Shelter FC", "SHE");
  const nextMatch = {
    id:"quality-next-match",
    competition:"EML FC26 Summer League",
    round:"GW 11",
    homeTeam:gunners,
    awayTeam:altair,
    startsAt:isoFromNow(36 * 60 * 60 * 1000),
    timezone:"Europe/Istanbul",
    status:"scheduled",
    streamUrl:"https://www.twitch.tv/altairespor",
    streamStatus:"scheduled",
    score:null,
  };
  const recent = {
    id:"quality-result",
    competition:"EML FC26 Summer League",
    round:"GW 10",
    homeTeam:altair,
    awayTeam:shelter,
    startsAt:isoFromNow(-24 * 60 * 60 * 1000),
    timezone:"Europe/Istanbul",
    status:"finished",
    streamUrl:null,
    streamStatus:"ended",
    score:{ home:2, away:1 },
  };
  const status = mode === "stale" ? "stale" : "fresh";
  return {
    meta:{
      status,
      generatedAt,
      fetchedAt:generatedAt,
      lastSuccessfulAt:generatedAt,
      validUntil:isoFromNow(24 * 60 * 60 * 1000),
      sourceName:"Deterministic quality fixture",
      sourceType:mode === "stale" ? "snapshot" : "test",
      seasonId:"42",
      seasonName:"EML FC26 Summer League",
      seasonStatus:"active",
      isStale:mode === "stale",
      warningCode:mode === "stale" ? "TEST_NETWORK_FALLBACK" : null,
    },
    data:{
      team:altair,
      nextMatch,
      recentResults:[recent],
      upcomingFixtures:[nextMatch],
      standings:[
        { position:1, team:gunners, played:10, won:8, drawn:0, lost:2, goalsFor:30, goalsAgainst:8, goalDifference:22, points:24, form:["W", "W", "L"] },
        { position:2, team:altair, played:10, won:6, drawn:1, lost:3, goalsFor:22, goalsAgainst:13, goalDifference:9, points:19, form:["W", "D", "W"] },
        { position:3, team:shelter, played:10, won:5, drawn:2, lost:3, goalsFor:18, goalsAgainst:14, goalDifference:4, points:17, form:["L", "W", "D"] },
      ],
    },
  };
}

function json(response, statusCode = 200) {
  return {
    statusCode,
    headers:{ "content-type":"application/json; charset=utf-8", "cache-control":"no-store", "x-content-type-options":"nosniff" },
    body:JSON.stringify(response),
  };
}

function safeOutputPath(urlPath) {
  const decoded = decodeURIComponent(urlPath).replaceAll("\\", "/");
  const relative = decoded.replace(/^\/+/, "");
  const candidate = path.resolve(outputDirectory, relative);
  return candidate === outputDirectory || candidate.startsWith(`${outputDirectory}${path.sep}`) ? candidate : null;
}

async function findStaticFile(urlPath) {
  const candidate = safeOutputPath(urlPath);
  if (!candidate) return null;
  const choices = path.extname(candidate)
    ? [candidate]
    : [path.join(candidate, "index.html"), `${candidate}.html`];
  if (urlPath === "/") choices.unshift(path.join(outputDirectory, "index.html"));
  for (const filename of choices) {
    try {
      if ((await fs.stat(filename)).isFile()) return filename;
    } catch { /* continue */ }
  }
  return null;
}

export async function startTestServer() {
  await fs.access(path.join(outputDirectory, "tr", "index.html"));
  let mode = "fresh";
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", "http://127.0.0.1");
      if (url.pathname === "/__test__/match-center-mode") {
        const requestedMode = url.searchParams.get("value");
        mode = requestedMode === "stale" || requestedMode === "unavailable" ? requestedMode : "fresh";
        const payload = json({ ok:true, mode });
        response.writeHead(payload.statusCode, payload.headers).end(payload.body);
        return;
      }
      if (url.pathname === "/api/match-center") {
        const payload = json(matchCenterEnvelope(mode), mode === "unavailable" ? 503 : 200);
        if (mode === "unavailable") payload.headers["retry-after"] = "900";
        response.writeHead(payload.statusCode, payload.headers).end(payload.body);
        return;
      }
      if (url.pathname === "/api/partnership-inquiry") {
        const payload = request.method === "GET"
          ? json({ ok:true, data:{ configured:true } })
          : json({ ok:false, code:"VALIDATION_ERROR", errors:{ message:"required" } }, 422);
        response.writeHead(payload.statusCode, payload.headers).end(payload.body);
        return;
      }
      if (url.pathname === "/api/eml-proxy") {
        const payload = json({ ok:false, code:"DISABLED_IN_DETERMINISTIC_TEST" }, 503);
        response.writeHead(payload.statusCode, payload.headers).end(payload.body);
        return;
      }

      const filename = await findStaticFile(url.pathname);
      if (!filename) {
        const fallback = path.join(outputDirectory, "404.html");
        response.writeHead(404, { "content-type":"text/html; charset=utf-8", "cache-control":"no-store" });
        response.end(await fs.readFile(fallback));
        return;
      }
      const contentType = CONTENT_TYPES[path.extname(filename).toLowerCase()] || "application/octet-stream";
      response.writeHead(200, { "content-type":contentType, "cache-control":"no-store" });
      response.end(await fs.readFile(filename));
    } catch (error) {
      response.writeHead(500, { "content-type":"text/plain; charset=utf-8", "cache-control":"no-store" });
      response.end(error instanceof Error ? error.message : String(error));
    }
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  return {
    baseUrl:`http://127.0.0.1:${address.port}`,
    close:() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
  };
}
