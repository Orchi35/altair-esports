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
      seasonMatches:[recent, nextMatch],
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
  if (/^\/b\/[A-Za-z0-9_-]{12}$/.test(urlPath)) return path.join(outputDirectory,'tr','builder','index.html');
  if (/^\/(tr\/oyuncular|en\/players)\/vpg-[1-9]\d{0,9}$/.test(urlPath)) return path.join(outputDirectory, urlPath.split("/")[1], "index.html");
  if (/^\/(tr\/maclar|en\/matches)\/match-vpg-[1-9]\d{0,9}$/.test(urlPath)) return path.join(outputDirectory, urlPath.split("/")[1], "index.html");
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

export async function startTestServer({builderHandler,penaltyHandler}={}) {
  await fs.access(path.join(outputDirectory, "tr", "index.html"));
  let mode = "fresh";
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", "http://127.0.0.1");
      const handler = url.pathname==='/api/builds' ? builderHandler : url.pathname==='/api/penalty' ? penaltyHandler : null;
      if(handler){
        const chunks=[];for await(const chunk of request)chunks.push(chunk);
        request.body=Buffer.concat(chunks).toString();request.query=Object.fromEntries(url.searchParams);
        response.status=code=>{response.statusCode=code;return response;};
        response.json=body=>response.end(JSON.stringify(body));
        await handler(request,response);return;
      }
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
      if (url.pathname === "/api/vpg-roster") {
        const players = ["GK", "CB", "CM", "ST", "RW"].map((position, index) => ({ id:index + 1, name:`VPG Player ${index + 1}`, position, apps:10 - index, goals:index, assists:5 - index, profileUrl:null }));
        const payload = json({ status:"fresh", updatedAt:isoFromNow(0), statsScope:"team-season", season:20, players });
        response.writeHead(payload.statusCode, payload.headers).end(payload.body);
        return;
      }
      if (url.pathname === "/api/vpg-match") {
        const payload = json({status:"fresh",updatedAt:isoFromNow(0),match:{id:1,startsAt:isoFromNow(86400000),round:1,season:20,competition:"Elite B",status:"scheduled",score:null,homeTeam:{id:38650,name:"ALTAIR eSports",slug:"ALTAIR-eSports",formation:null},awayTeam:{id:2,name:"Test Opponent",slug:"opponent",formation:null},statsAvailable:true,players:[]}});
        response.writeHead(payload.statusCode, payload.headers).end(payload.body);
        return;
      }
      if (url.pathname === "/api/vpg-player") {
        const payload=json({status:"fresh",season:20,partial:false,player:{id:1,name:"VPG Player 1",position:"GK",apps:10,goals:0,assists:5,fullName:null,nationality:"TR",bio:null,joinedAt:null,accounts:{playstation:null,xbox:null,ea:null},totals:{},averageRating:null,matches:[]}});
        response.writeHead(payload.statusCode,payload.headers).end(payload.body);
        return;
      }
      if (url.pathname === "/api/vpg") {
        const payload = json({ status:"fresh", updatedAt:isoFromNow(0), fixtures:[{ id:1, startsAt:isoFromNow(86400000), homeTeam:{name:"ALTAIR eSports",slug:"ALTAIR-eSports"}, awayTeam:{name:"Test Opponent",slug:"opponent"}, score:null, round:1 }], results:[], standings:[{position:1,name:"ALTAIR eSports",slug:"ALTAIR-eSports",played:1,won:1,drawn:0,lost:0,goalDifference:2,points:3}] });
        response.writeHead(payload.statusCode, payload.headers).end(payload.body);
        return;
      }
      if(url.pathname==="/api/vpg-cup"){
        const payload=json({status:"fresh",updatedAt:isoFromNow(0),fixtures:[],results:[{id:2,competition:"European Pro Series HT",startsAt:isoFromNow(-86400000),homeTeam:{name:"ALTAIR eSports",slug:"ALTAIR-eSports"},awayTeam:{name:"Cup Opponent",slug:"cup-opponent"},score:{home:3,away:0},round:1}],standings:[]});
        response.writeHead(payload.statusCode,payload.headers).end(payload.body);return;
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
