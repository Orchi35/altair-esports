import { ACTIVE_COMPETITION } from "../../src/config/competition.js";

const ALTAIR_KEY = "altairesports";
const ENTITY_MAP = {
  amp:"&", quot:'"', apos:"'", nbsp:" ",
  uuml:"ü", ouml:"ö", ccedil:"ç", Uuml:"Ü", Ouml:"Ö", Ccedil:"Ç",
  iuml:"ï", Iuml:"Ï", auml:"ä", Auml:"Ä",
};

export class ParserError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ParserError";
    this.code = code;
  }
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&([a-z]+);/gi, (match, name) => ENTITY_MAP[name] ?? match)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([a-f0-9]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));
}

function stripTags(value) {
  return decodeHtml(String(value || "").replace(/<script\b[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function getTables(html) {
  return [...String(html || "").matchAll(/<table\b[\s\S]*?<\/table>/gi)].map((match) => match[0]);
}

function getRows(tableHtml) {
  return [...String(tableHtml || "").matchAll(/<tr\b[\s\S]*?<\/tr>/gi)].map((rowMatch) => {
    const html = [...rowMatch[0].matchAll(/<t[dh]\b[\s\S]*?<\/t[dh]>/gi)].map((cell) => cell[0]);
    return { html, text:html.map(stripTags), raw:rowMatch[0] };
  });
}

function canonicalize(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/gi, "")
    .toLowerCase();
}

function cleanTeamName(value) {
  return String(value || "").replace(/\(\d+\.\)/g, "").replace(/\s+/g, " ").trim();
}

function getLinkedText(cellHtml) {
  const link = cellHtml?.match(/<a\b[^>]*>([\s\S]*?)<\/a>/i)?.[1];
  return cleanTeamName(stripTags(link || cellHtml));
}

function abbreviation(name) {
  return String(name || "").replace(/[^\p{L}\p{N}]/gu, "").slice(0, 3).toLocaleUpperCase("tr-TR") || "???";
}

export function parseStandingsHtml(html) {
  let best = [];
  let malformedRow = false;

  for (const table of getTables(html)) {
    const parsed = getRows(table).map(({ html:cellsHtml, text:cells }) => {
      if (!/^\d+$/.test(cells[0] || "")) return null;
      if (cells.length < 10) {
        malformedRow = true;
        return null;
      }
      const name = getLinkedText(cellsHtml[1]);
      if (!name) {
        malformedRow = true;
        return null;
      }
      return {
        rank:Number.parseInt(cells[0], 10),
        abbr:abbreviation(name),
        name,
        pld:Number.parseInt(cells[2], 10) || 0,
        w:Number.parseInt(cells[3], 10) || 0,
        d:Number.parseInt(cells[4], 10) || 0,
        l:Number.parseInt(cells[5], 10) || 0,
        gf:Number.parseInt(cells[6], 10) || 0,
        ga:Number.parseInt(cells[7], 10) || 0,
        gd:Number.parseInt(cells[8], 10) || 0,
        pts:Number.parseInt(cells[9], 10) || 0,
        form:String(cells[10] || "").replace(/\s+/g, "").toUpperCase().slice(0, 5),
      };
    }).filter(Boolean);
    if (parsed.length > best.length) best = parsed;
  }

  if (malformedRow) throw new ParserError("STANDINGS_FIELDS_MISSING", "Standings row is missing required fields");
  if (best.length < 5) throw new ParserError("STANDINGS_TOO_SHORT", "Standings table contains fewer than five teams");
  if (!best.some((team) => canonicalize(team.name) === ALTAIR_KEY)) {
    throw new ParserError("ALTAIR_NOT_IN_STANDINGS", "ALTAIR is missing from the standings table");
  }
  return best;
}

function parseFixtureDate(tableText) {
  const textDate = tableText.match(/(\d{1,2})\s+([\p{L}]+)\s+(\d{4})/iu);
  if (textDate) return `${textDate[1].padStart(2, "0")} ${textDate[2]} ${textDate[3]}`;
  const numericDate = tableText.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  return numericDate ? `${numericDate[1].padStart(2, "0")} ${numericDate[2]} ${numericDate[3]}` : "";
}

function getSeed(value) {
  const seed = String(value || "").match(/\((\d+)\.\)/)?.[1];
  return seed ? Number.parseInt(seed, 10) : null;
}

function parseFixtureRow({ cellsHtml, cells }, matchday, date, time, index) {
  if (cells.length < 6) throw new ParserError("FIXTURE_FIELDS_MISSING", `Matchday ${matchday} row is missing required fields`);
  const home = getLinkedText(cellsHtml[1]);
  const away = getLinkedText(cellsHtml[5]);
  if (!home || !away) throw new ParserError("FIXTURE_TEAM_MISSING", `Matchday ${matchday} has an incomplete team field`);
  if (!date || !time) throw new ParserError("FIXTURE_DATETIME_MISSING", `Matchday ${matchday} has no verified date or time`);

  const homeScore = String(cells[2] || "").trim();
  const awayScore = String(cells[4] || "").trim();
  const played = /^\d+$/.test(homeScore) && /^\d+$/.test(awayScore);
  return {
    id:`${ACTIVE_COMPETITION.tournamentId}-${matchday}-${index + 1}`,
    round:`GW ${matchday}`,
    competition:ACTIVE_COMPETITION.competition,
    date,
    time,
    timezone:"Europe/Istanbul",
    home,
    homeAbbr:abbreviation(home),
    away,
    awayAbbr:abbreviation(away),
    hs:played ? Number(homeScore) : null,
    as:played ? Number(awayScore) : null,
    played,
    status:played ? "finished" : "scheduled",
    streamStatus:"unknown",
  };
}

export function parseFixtureHtml(html, matchday) {
  const candidate = getTables(html).find((table) => canonicalize(stripTags(table)).includes(ALTAIR_KEY));
  if (!candidate) return [];

  const tableText = stripTags(candidate);
  const date = parseFixtureDate(tableText);
  const time = tableText.match(/(\d{1,2}:\d{2})\s*(?:UTC|TSİ|TRT)?/i)?.[1] || "";
  const matches = [];

  for (const { html:cellsHtml, text:cells, raw } of getRows(candidate)) {
    if (!canonicalize(stripTags(raw)).includes(ALTAIR_KEY)) continue;
    matches.push(parseFixtureRow({ cellsHtml, cells }, matchday, date, time, matches.length));
  }
  return matches;
}

export function parsePlayoffFixtureHtml(html, matchday) {
  const quarterfinalMatchdays = ACTIVE_COMPETITION.playoffs?.quarterfinalMatchdays || [];
  const leg = quarterfinalMatchdays.indexOf(matchday) + 1;
  if (!leg) return [];

  const matches = [];
  for (const table of getTables(html)) {
    const tableText = stripTags(table);
    const date = parseFixtureDate(tableText);
    const time = tableText.match(/(\d{1,2}:\d{2})\s*(?:UTC|TSİ|TRT)?/i)?.[1] || "";
    for (const { html:cellsHtml, text:cells } of getRows(table)) {
      const homeSeed = getSeed(cells[1]);
      const awaySeed = getSeed(cells[5]);
      if (!homeSeed || !awaySeed) continue;
      const match = parseFixtureRow({ cellsHtml, cells }, matchday, date, time, matches.length);
      const firstSeed = Math.min(homeSeed, awaySeed);
      const secondSeed = Math.max(homeSeed, awaySeed);
      matches.push({
        ...match,
        id:`${ACTIVE_COMPETITION.tournamentId}-qf-${firstSeed}-${secondSeed}-leg-${leg}`,
        round:`Quarterfinal · Leg ${leg}`,
        stage:"quarterfinal",
        leg,
        tieId:`qf-${firstSeed}-${secondSeed}`,
        homeSeed,
        awaySeed,
      });
    }
  }
  return matches;
}

const VALID_POSITIONS = new Set(["GK","LB","LWB","CB","RB","RWB","CDM","CM","CAM","LM","RM","LW","RW","CF","ST"]);

export function parseRosterHtml(html, upstreamOrigin = "https://emajorleague.com") {
  let best = [];
  for (const table of getTables(html)) {
    const seen = new Set();
    const parsed = [];
    for (const { html:cellsHtml, text:cells } of getRows(table)) {
      if (cells.length < 2) continue;
      const position = stripTags(cells[0]).toUpperCase().replace(/[^A-Z]/g, "");
      const ign = String(cells[1] || "").trim();
      const key = canonicalize(ign);
      if (!VALID_POSITIONS.has(position) || !key || seen.has(key) || /^\d+$/.test(ign)) continue;
      const numbers = cells.slice(2)
        .map((cell) => String(cell).replace(",", ".").trim())
        .filter((cell) => /^\d+(?:\.\d+)?$/.test(cell))
        .map(Number);
      const href = cellsHtml[1]?.match(/href=["']([^"']+)["']/i)?.[1] || "";
      seen.add(key);
      parsed.push({
        ign,
        pos:position,
        apps:numbers.length >= 3 ? numbers[0] : null,
        goals:numbers.length >= 3 ? numbers[1] : null,
        assists:numbers.length >= 3 ? numbers[2] : null,
        profileUrl:href ? new URL(href, upstreamOrigin).toString() : "",
      });
    }
    if (parsed.length > best.length) best = parsed;
  }
  if (best.length < 5 || best.length > 40) throw new ParserError("ROSTER_INVALID", "Roster table failed validation");
  return best;
}
