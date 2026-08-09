import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ACTIVE_COMPETITION,
  EML_TEAM_PATH,
} from "../src/config/competition.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const outputFile = path.join(rootDir, "public", "data", "eml-snapshot.json");
const upstreamOrigin = "https://emajorleague.com";
const proxyEndpoint = process.env.EML_PROXY_ENDPOINT || "";
const altairName = "altair esports";

const entityMap = {
  amp:"&", quot:'"', apos:"'", nbsp:" ",
  uuml:"ü", ouml:"ö", ccedil:"ç", Uuml:"Ü", Ouml:"Ö", Ccedil:"Ç",
  iuml:"ï", Iuml:"Ï", auml:"ä", Auml:"Ä",
};

function decodeHtml(value) {
  return String(value || "")
    .replace(/&([a-z]+);/gi, (match, name) => entityMap[name] ?? match)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([a-f0-9]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));
}

function stripTags(value) {
  return decodeHtml(String(value || "").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function getTables(html) {
  return [...String(html || "").matchAll(/<table\b[\s\S]*?<\/table>/gi)].map((match) => match[0]);
}

function getRows(tableHtml) {
  return [...String(tableHtml || "").matchAll(/<tr\b[\s\S]*?<\/tr>/gi)].map((rowMatch) => {
    const html = [...rowMatch[0].matchAll(/<t[dh]\b[\s\S]*?<\/t[dh]>/gi)].map((cell) => cell[0]);
    return { html, text:html.map(stripTags) };
  });
}

function canonicalize(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "")
    .toLowerCase();
}

function cleanTeamName(value) {
  return String(value || "")
    .replace(/\(\d+\.\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getLinkedText(cellHtml) {
  const link = cellHtml?.match(/<a\b[^>]*>([\s\S]*?)<\/a>/i)?.[1];
  return cleanTeamName(stripTags(link || cellHtml));
}

function abbr3(name) {
  return String(name || "").replace(/[^\p{L}]/gu, "").slice(0, 3).toUpperCase() || "???";
}

function parseStandings(html) {
  let best = [];

  for (const table of getTables(html)) {
    const parsed = getRows(table).map(({ html:cellsHtml, text:cells }, index) => {
      if (cells.length < 10 || !/^\d+$/.test(cells[0])) return null;
      const name = getLinkedText(cellsHtml[1]);
      const gd = Number.parseInt(cells[8], 10) || 0;
      return {
        rank:Number.parseInt(cells[0], 10) || index + 1,
        abbr:abbr3(name),
        name,
        pld:Number.parseInt(cells[2], 10) || 0,
        w:Number.parseInt(cells[3], 10) || 0,
        d:Number.parseInt(cells[4], 10) || 0,
        l:Number.parseInt(cells[5], 10) || 0,
        gf:Number.parseInt(cells[6], 10) || 0,
        ga:Number.parseInt(cells[7], 10) || 0,
        gd:gd >= 0 ? `+${gd}` : String(gd),
        pts:Number.parseInt(cells[9], 10) || 0,
        form:String(cells[10] || "").replace(/\s+/g, "").toUpperCase().slice(0, 5),
        me:name.toLowerCase().includes("altair"),
      };
    }).filter(Boolean);

    if (parsed.length > best.length) best = parsed;
  }

  if (best.length < 5 || !best.some((team) => team.me)) {
    throw new Error("Standings validation failed");
  }
  return best;
}

function normalizePosition(value) {
  const position = stripTags(value).toUpperCase().replace(/[^A-Z]/g, "");
  return new Set(["GK","LB","LWB","CB","RB","RWB","CDM","CM","CAM","LM","RM","LW","RW","CF","ST"]).has(position)
    ? position
    : "";
}

function parseRoster(html) {
  let best = [];

  for (const table of getTables(html)) {
    const seen = new Set();
    const parsed = [];
    for (const { html:cellsHtml, text:cells } of getRows(table)) {
      if (cells.length < 2) continue;
      const pos = normalizePosition(cells[0]);
      const ign = String(cells[1] || "").trim();
      const key = canonicalize(ign);
      if (!pos || !key || seen.has(key) || /^\d+$/.test(ign)) continue;

      const numericCells = cells.slice(2).map((cell) => {
        const normalized = String(cell).replace(",", ".").trim();
        return /^\d+(\.\d+)?$/.test(normalized) ? Number(normalized) : null;
      }).filter((value) => value !== null);

      const profileHref = cellsHtml[1]?.match(/href=["']([^"']+)["']/i)?.[1] || "";
      seen.add(key);
      parsed.push({
        ign,
        pos,
        apps:numericCells.length >= 3 ? Number(numericCells[0]) : null,
        goals:numericCells.length >= 3 ? Number(numericCells[1]) : null,
        assists:numericCells.length >= 3 ? Number(numericCells[2]) : null,
        profileUrl:profileHref ? new URL(profileHref, upstreamOrigin).toString() : "",
      });
    }
    if (parsed.length > best.length) best = parsed;
  }

  if (best.length < 5 || best.length > 40) throw new Error("Roster validation failed");
  return best;
}

function parseDateParts(value) {
  const match = String(value || "").match(/(\d{1,2})\s+([\p{L}]+)\s+(\d{4})/iu);
  return {
    date:match ? `${match[1].padStart(2, "0")} ${match[2]} ${match[3]}` : "",
    day:match?.[1]?.padStart(2, "0") || "",
    month:match?.[2] || "",
  };
}

function parseFixturePage(html, matchday) {
  const table = getTables(html)[0] || "";
  const tableText = stripTags(table || html);
  const date = parseDateParts(tableText);
  const time = tableText.match(/(\d{2}:\d{2})\s*(?:UTC)?/i)?.[1] || "22:30";
  const matches = [];

  for (const { html:cellsHtml, text:cells } of getRows(table)) {
    if (cells.length < 6) continue;
    const home = getLinkedText(cellsHtml[1]);
    const away = getLinkedText(cellsHtml[5]);
    if (!home || !away) continue;
    if (!home.toLowerCase().includes(altairName) && !away.toLowerCase().includes(altairName)) continue;

    const homeScore = String(cells[2] || "").trim();
    const awayScore = String(cells[4] || "").trim();
    const played = /^\d+$/.test(homeScore) && /^\d+$/.test(awayScore);
    matches.push({
      id:matchday + (matches.length + 1) / 10,
      matchday:`GW ${matchday}`,
      competition:ACTIVE_COMPETITION.competition,
      date:date.date,
      day:date.day,
      month:date.month,
      time,
      home,
      homeAbbr:abbr3(home),
      away,
      awayAbbr:abbr3(away),
      hs:played ? Number(homeScore) : null,
      as:played ? Number(awayScore) : null,
      played,
      venue:home.toLowerCase().includes(altairName) ? "Home" : "Away",
    });
  }
  return matches;
}

async function fetchPath(pathname) {
  const url = proxyEndpoint
    ? (() => {
        const target = new URL(proxyEndpoint);
        target.searchParams.set("path", pathname);
        target.searchParams.set("fresh", "1");
        target.searchParams.set("ts", String(Date.now()));
        return target;
      })()
    : new URL(pathname, upstreamOrigin);

  const response = await fetch(url, {
    headers:{
      "user-agent":"Mozilla/5.0 (compatible; ALTAIR-Snapshot-Updater/1.0)",
      accept:"text/html,application/xhtml+xml",
    },
    signal:AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error(`Request failed (${response.status}) for ${pathname}`);
  return response.text();
}

async function main() {
  const [standingsHtml, teamHtml] = await Promise.all([
    fetchPath(`/tournaments/league_table/${ACTIVE_COMPETITION.tournamentId}/`),
    fetchPath(EML_TEAM_PATH),
  ]);

  const matches = [];
  for (let index = 0; index < ACTIVE_COMPETITION.matchdays.length; index += 3) {
    const batch = ACTIVE_COMPETITION.matchdays.slice(index, index + 3);
    const pages = await Promise.all(batch.map(async (matchday) => ({
      matchday,
      html:await fetchPath(`/tournaments/league_fixture/${ACTIVE_COMPETITION.tournamentId}/${matchday}/`),
    })));
    pages.forEach(({ matchday, html }) => matches.push(...parseFixturePage(html, matchday)));
  }

  matches.sort((left, right) => left.id - right.id);
  if (matches.length < 5) throw new Error("Fixture snapshot validation failed");

  const snapshot = {
    schemaVersion:1,
    generatedAt:new Date().toISOString(),
    source:"eMajor League",
    competition:{
      key:ACTIVE_COMPETITION.key,
      tournamentId:ACTIVE_COMPETITION.tournamentId,
      name:ACTIVE_COMPETITION.competition,
    },
    standings:{
      [String(ACTIVE_COMPETITION.tournamentId)]:parseStandings(standingsHtml),
    },
    matches,
    roster:parseRoster(teamHtml),
  };

  try {
    const existing = JSON.parse(await fs.readFile(outputFile, "utf8"));
    const comparableExisting = { ...existing, generatedAt:null };
    const comparableNext = { ...snapshot, generatedAt:null };
    if (JSON.stringify(comparableExisting) === JSON.stringify(comparableNext)) {
      console.log("Snapshot is already current; no file change required.");
      return;
    }
  } catch { /* first snapshot write */ }

  await fs.mkdir(path.dirname(outputFile), { recursive:true });
  await fs.writeFile(outputFile, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  console.log(`Snapshot updated: ${snapshot.matches.length} matches, ${snapshot.roster.length} players.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
