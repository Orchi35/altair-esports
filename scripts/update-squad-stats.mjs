import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const appFile = path.join(rootDir, "src", "App.jsx");

const TEAM_PAGE_URL = "https://emajorleague.com/team/ALTAIReSports/";
const SQUAD_ROUTE_RE = /href=["']([^"'#?]*\/teams\/team\/\d+\/\d+\/\d+\/squad[^"'#?]*)["']/gi;
const PLAYER_RE = /\{[^{}]*?ign:"([^"]*)"[^{}]*?apps:(\d+),\s+goals:(\d+),\s+assists:(\d+)[^{}]*?\}/g;

function canonicalize(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&[a-z0-9#]+;/gi, "")
    .replace(/[^a-z0-9]+/gi, "")
    .toLowerCase();
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&uuml;/gi, "u")
    .replace(/&ouml;/gi, "o")
    .replace(/&ccedil;/gi, "c")
    .replace(/&Uuml;/gi, "U")
    .replace(/&Ouml;/gi, "O")
    .replace(/&Ccedil;/gi, "C")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([a-f0-9]+);/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16)));
}

function stripTags(value) {
  return decodeHtml(String(value || "").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function extractPlayers(source) {
  const players = [];
  for (const match of source.matchAll(PLAYER_RE)) {
    const ign = match[1];
    if (!ign) continue;
    players.push({
      ign,
      key: canonicalize(ign),
      apps: Number(match[2]),
      goals: Number(match[3]),
      assists: Number(match[4]),
    });
  }
  return players;
}

function parseStatsTable(tableHtml, knownKeys) {
  const statsByIgn = new Map();
  const rowMatches = tableHtml.match(/<tr\b[\s\S]*?<\/tr>/gi) || [];

  for (const rowHtml of rowMatches) {
    const cells = [...rowHtml.matchAll(/<t[dh]\b[\s\S]*?<\/t[dh]>/gi)].map((match) => stripTags(match[0]));
    if (cells.length < 5) continue;

    const ignIndex = cells.findIndex((cell) => knownKeys.has(canonicalize(cell)));
    if (ignIndex === -1) continue;

    const ign = cells[ignIndex];
    const numericCells = cells
      .slice(ignIndex + 1)
      .map((cell) => {
        const normalized = cell.replace(",", ".").trim();
        return /^\d+(\.\d+)?$/.test(normalized) ? Number(normalized) : null;
      })
      .filter((value) => value !== null);

    if (numericCells.length < 3) continue;

    statsByIgn.set(canonicalize(ign), {
      ign,
      apps: Number(numericCells[0]),
      goals: Number(numericCells[1]),
      assists: Number(numericCells[2]),
    });
  }

  return statsByIgn;
}

function findBestStatsTable(html, playerKeys) {
  const tables = html.match(/<table\b[\s\S]*?<\/table>/gi) || [];
  let bestTable = null;
  let bestScore = 0;

  for (const tableHtml of tables) {
    const tableText = stripTags(tableHtml);
    let score = 0;
    for (const key of playerKeys) {
      if (tableText.toLowerCase().includes(key)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestTable = tableHtml;
    }
  }

  return bestScore > 0 ? bestTable : null;
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; ALTAIR-Squad-Updater/1.0)",
      accept: "text/html,application/xhtml+xml",
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${url}`);
  }

  return response.text();
}

function resolveSquadUrl(baseUrl, html) {
  const urls = [];
  for (const match of html.matchAll(SQUAD_ROUTE_RE)) {
    urls.push(new URL(match[1], baseUrl).toString());
  }

  const uniqueUrls = [...new Set(urls)];
  uniqueUrls.sort((left, right) => right.localeCompare(left));
  return uniqueUrls[0] || null;
}

async function main() {
  const source = await fs.readFile(appFile, "utf8");
  const players = extractPlayers(source);
  const playerKeys = new Set(players.map((player) => player.key).filter(Boolean));

  if (!playerKeys.size) {
    throw new Error("No squad players with nicknames were found in src/App.jsx.");
  }

  const teamHtml = await fetchHtml(TEAM_PAGE_URL);
  let tableHtml = findBestStatsTable(teamHtml, playerKeys);

  if (!tableHtml) {
    const squadUrl = resolveSquadUrl(TEAM_PAGE_URL, teamHtml);
    if (!squadUrl) {
      throw new Error("Could not locate a squad statistics page from the team page.");
    }
    const squadHtml = await fetchHtml(squadUrl);
    tableHtml = findBestStatsTable(squadHtml, playerKeys);
  }

  if (!tableHtml) {
    throw new Error("Could not find a squad statistics table with player nicknames.");
  }

  const statsByIgn = parseStatsTable(tableHtml, playerKeys);
  if (!statsByIgn.size) {
    throw new Error("Squad statistics table was found, but no matching nicknames were parsed.");
  }

  let updatedCount = 0;
  const updatedSource = source.replace(PLAYER_RE, (playerBlock, ign, apps, goals, assists) => {
    const stats = statsByIgn.get(canonicalize(ign));
    if (!stats) return playerBlock;

    const hasChanged =
      Number(apps) !== stats.apps ||
      Number(goals) !== stats.goals ||
      Number(assists) !== stats.assists;

    if (hasChanged) updatedCount += 1;

    return playerBlock.replace(
      /apps:\d+,\s+goals:\d+,\s+assists:\d+/,
      `apps:${stats.apps}, goals:${stats.goals}, assists:${stats.assists}`,
    );
  });

  if (updatedSource !== source) {
    await fs.writeFile(appFile, updatedSource, "utf8");
  }

  const matched = players.filter((player) => statsByIgn.has(player.key)).length;
  console.log(`Matched ${matched} squad nicknames from eMajor League.`);
  console.log(`Updated ${updatedCount} player stat line(s) in src/App.jsx.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
