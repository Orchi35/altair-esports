import { useState, useEffect, useRef } from "react";
import { SQUAD } from "./data/squad";
import "./App.css";
import { PartnershipSection } from "./components/PartnershipSection";
import { SocialHub } from "./components/SocialHub";
import { SiteFooter } from "./components/SiteFooter";
import {
  ACTIVE_COMPETITION,
  COMPETITION_SEASONS,
  DEFAULT_COMPETITION_SEASON,
  EML_SNAPSHOT_PATH,
  EML_TEAM_PATH,
} from "./config/competition";

/* useStandings - inline hook for EML standings */

const CACHE_MAX  = 24 * 60 * 60 * 1000;  // 24 saat
const FRIDAY_TTL = 60 * 60 * 1000;       // Cuma günü 1 saat

const STANDING_SEASONS = COMPETITION_SEASONS;
const DEFAULT_STANDING_SEASON = DEFAULT_COMPETITION_SEASON;

let snapshotRequest = null;

async function readSiteSnapshot() {
  if (!snapshotRequest) {
    snapshotRequest = fetch(EML_SNAPSHOT_PATH, { cache:"no-store" })
      .then((response) => {
        if (!response.ok) throw new Error(`Snapshot HTTP ${response.status}`);
        return response.json();
      })
      .catch((error) => {
        snapshotRequest = null;
        throw error;
      });
  }

  return snapshotRequest;
}

function getSnapshotDate(snapshot) {
  const timestamp = Date.parse(snapshot?.generatedAt || "");
  return Number.isFinite(timestamp) ? new Date(timestamp) : null;
}

const STANDINGS_S2_LOCKED = [
  { rank:1, abbr:"SAM", name:"SAMURAI", pld:34, w:28, d:4, l:2, gf:91, ga:19, gd:"+72", pts:88, form:"WWW", me:false },
  { rank:2, abbr:"GOL", name:"Golden Fellas", pld:34, w:28, d:4, l:2, gf:86, ga:21, gd:"+65", pts:88, form:"WWW", me:false },
  { rank:3, abbr:"GLA", name:"Glarung FC", pld:34, w:27, d:1, l:6, gf:116, ga:26, gd:"+90", pts:82, form:"WLW", me:false },
  { rank:4, abbr:"SON", name:"Sons Of Hell", pld:34, w:24, d:4, l:6, gf:101, ga:41, gd:"+60", pts:76, form:"LWD", me:false },
  { rank:5, abbr:"JUV", name:"JUVEON", pld:34, w:24, d:4, l:6, gf:73, ga:35, gd:"+38", pts:76, form:"LWL", me:false },
  { rank:6, abbr:"ALT", name:"ALTAIR eSports", pld:34, w:21, d:2, l:11, gf:77, ga:36, gd:"+41", pts:65, form:"WWL", me:true },
  { rank:7, abbr:"BOL", name:"Bolton VFC", pld:34, w:20, d:3, l:11, gf:57, ga:47, gd:"+10", pts:63, form:"LWW", me:false },
  { rank:8, abbr:"SEM", name:"Semt-i Müdafa", pld:34, w:20, d:1, l:13, gf:75, ga:50, gd:"+25", pts:61, form:"WWL", me:false },
  { rank:9, abbr:"FCB", name:"FC BIG BANG", pld:34, w:19, d:1, l:14, gf:54, ga:40, gd:"+14", pts:58, form:"WLW", me:false },
  { rank:10, abbr:"NOR", name:"Northturks", pld:34, w:15, d:6, l:13, gf:60, ga:80, gd:"-20", pts:51, form:"LLD", me:false },
  { rank:11, abbr:"ABR", name:"Abrakadabra eSports", pld:34, w:12, d:4, l:18, gf:29, ga:44, gd:"-15", pts:40, form:"LLD", me:false },
  { rank:12, abbr:"MAV", name:"Mavi City FC", pld:33, w:11, d:2, l:20, gf:40, ga:94, gd:"-54", pts:35, form:"LWW", me:false },
  { rank:13, abbr:"BAS", name:"Baston Villa FC", pld:33, w:10, d:0, l:23, gf:37, ga:73, gd:"-36", pts:30, form:"WLL", me:false },
  { rank:14, abbr:"ATM", name:"Atmaca eSpor", pld:34, w:7, d:2, l:25, gf:30, ga:67, gd:"-37", pts:23, form:"WWW", me:false },
  { rank:15, abbr:"VOG", name:"VOGUE", pld:34, w:6, d:4, l:24, gf:21, ga:74, gd:"-53", pts:22, form:"DLL", me:false },
  { rank:16, abbr:"TEA", name:"Team Derstar", pld:34, w:4, d:6, l:24, gf:17, ga:89, gd:"-72", pts:18, form:"LLL", me:false },
  { rank:17, abbr:"BLA", name:"Blackburn FC", pld:34, w:0, d:6, l:28, gf:1, ga:60, gd:"-59", pts:6, form:"DLL", me:false },
  { rank:18, abbr:"REV", name:"Revenge Esports", pld:34, w:0, d:6, l:28, gf:5, ga:69, gd:"-64", pts:6, form:"LLD", me:false },
];
const STANDINGS_SUMMER_FALLBACK = [
  { rank:"-", abbr:"ALT", name:"ALTAIR eSports", pld:0, w:0, d:0, l:0, gf:0, ga:0, gd:"0", pts:0, form:"", me:true },
];
const STANDINGS_BY_SEASON = {
  s2: STANDINGS_S2_LOCKED,
  summer: STANDINGS_SUMMER_FALLBACK,
};

function getStandingSeason(key = DEFAULT_STANDING_SEASON) {
  return STANDING_SEASONS[key] || STANDING_SEASONS[DEFAULT_STANDING_SEASON];
}

function getStandingsCacheKey(seasonKey) {
  return `altair_standings_${seasonKey}_v1`;
}

function parseEMLTable(html) {
  try {
    const parser = new DOMParser();
    const doc    = parser.parseFromString(html, "text/html");
    const rows   = [...doc.querySelectorAll("table tbody tr")];
    if (!rows.length) return null;
    const teams  = rows.map((tr, idx) => {
      const td = [...tr.querySelectorAll("td")];
      if (td.length < 10) return null;
      const raw  = (s) => td[s]?.textContent?.trim() || "0";
      const name = td[1]?.querySelector("a")?.textContent?.trim() || td[1]?.textContent?.trim() || "-";
      const gd   = parseInt(raw(8)) || 0;
      const form = (td[10]?.textContent || "").replace(/\s+/g,"").toUpperCase().slice(0,5);
      const abbr = name.replace(/[^\p{L}]/gu,"").slice(0,3).toUpperCase() || "???";
      return {
        rank: parseInt(raw(0)) || idx + 1,
        abbr, name,
        pld: parseInt(raw(2))||0,
        w:   parseInt(raw(3))||0,
        d:   parseInt(raw(4))||0,
        l:   parseInt(raw(5))||0,
        gf:  parseInt(raw(6))||0,
        ga:  parseInt(raw(7))||0,
        gd:  gd >= 0 ? `+${gd}` : `${gd}`,
        pts: parseInt(raw(9))||0,
        form,
        me:  name.toLowerCase().includes("altair"),
      };
    }).filter(Boolean);
    return teams.length ? teams : null;
  } catch { return null; }
}

function compactView(all) {
  const idx  = all.findIndex(t => t.me);
  if (idx === -1) return all.slice(0, 3);
  const from = Math.max(0, idx - 1);
  return all.slice(from, from + 3);
}

function readCache(seasonKey) {
  try {
    const raw = localStorage.getItem(getStandingsCacheKey(seasonKey));
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    const ttl = new Date().getDay() === 5 ? FRIDAY_TTL : CACHE_MAX;
    if (Date.now() - ts < ttl) return { data, ts };
  } catch { /* ignore */ }
  return null;
}

function writeCache(seasonKey, data) {
  try { localStorage.setItem(getStandingsCacheKey(seasonKey), JSON.stringify({ ts: Date.now(), data })); }
  catch { /* ignore */ }
}

function useStandings(seasonKey = DEFAULT_STANDING_SEASON) {
  const season = getStandingSeason(seasonKey);
  const fallback = STANDINGS_BY_SEASON[season.key] || STANDINGS_SUMMER_FALLBACK;
  const [allTeams,   setAllTeams]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [tick,       setTick]       = useState(0);

  const refetch = () => {
    if (season.locked) return;
    localStorage.removeItem(getStandingsCacheKey(season.key));
    setTick(t => t + 1);
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (season.locked) {
        if (!cancelled) {
          setAllTeams(fallback);
          setLastUpdate(null);
          setError(null);
          setLoading(false);
        }
        return;
      }

      setLoading(true); setError(null);
      const cached = readCache(season.key);
      if (cached) {
        if (!cancelled) { setAllTeams(cached.data); setLastUpdate(new Date(cached.ts)); setLoading(false); }
        return;
      }
      try {
        const url = `/api/eml-proxy?path=/tournaments/league_table/${season.tournamentId}/`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html   = await res.text();
        const parsed = parseEMLTable(html);
        if (!parsed) throw new Error("Parse hatası");
        writeCache(season.key, parsed);
        if (!cancelled) { setAllTeams(parsed); setLastUpdate(new Date()); }
      } catch (err) {
        console.warn("[useStandings]", err.message);
        let snapshotTeams = null;
        let snapshotDate = null;

        try {
          const snapshot = await readSiteSnapshot();
          snapshotTeams = snapshot?.standings?.[String(season.tournamentId)] || null;
          snapshotDate = getSnapshotDate(snapshot);
        } catch { /* static fallback remains available */ }

        if (!cancelled) {
          setError(err.message);
          setAllTeams(Array.isArray(snapshotTeams) && snapshotTeams.length ? snapshotTeams : fallback);
          if (snapshotDate) setLastUpdate(snapshotDate);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const interval = new Date().getDay() === 5
      ? setInterval(() => setTick(t => t + 1), FRIDAY_TTL) : null;
    return () => { cancelled = true; if (interval) clearInterval(interval); };
  }, [tick, season.key, season.locked, season.tournamentId, fallback]);

  const altairRow = allTeams.find(t => t.me) || null;
  const standings = allTeams.length ? compactView(allTeams) : fallback;
  return { standings, allTeams, altairRow, loading, error, lastUpdate, refetch, season };
}

/* useFixtures - fetches EML matchdays, then splits ALTAIR results and fixtures */

const FIX_CACHE_KEY  = "altair_fixtures_v10";
const FIX_CACHE_MAX  = 24 * 60 * 60 * 1000;  // 24 saat
const FIX_FRIDAY_TTL = 60 * 60 * 1000;       // Cuma günü 1 saat
const TOTAL_MATCHDAYS = ACTIVE_COMPETITION.totalMatchdays;
const TOURNAMENT_ID   = ACTIVE_COMPETITION.tournamentId;
// ALTAIR'in oynadığı bilinen aktif sezon maç haftaları; gereksiz istekleri azaltır.
const ALTAIR_MATCHDAYS = ACTIVE_COMPETITION.matchdays;
const ALTAIR_NAME     = "altair esports";
const COMPETITION     = ACTIVE_COMPETITION.competition;

// Month helpers
const MONTHS = ["","JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
const MONTH_ALIASES = {
  JAN: "JAN",
  JANUARY: "JAN",
  OCA: "JAN",
  OCAK: "JAN",
  FEB: "FEB",
  FEBRUARY: "FEB",
  SUB: "FEB",
  SUBAT: "FEB",
  MAR: "MAR",
  MARCH: "MAR",
  MART: "MAR",
  NIS: "APR",
  NISAN: "APR",
  APR: "APR",
  APRIL: "APR",
  MAY: "MAY",
  MAYIS: "MAY",
  HAZ: "JUN",
  HAZIRAN: "JUN",
  JUN: "JUN",
  JUNE: "JUN",
  TEM: "JUL",
  TEMMUZ: "JUL",
  JUL: "JUL",
  JULY: "JUL",
  AGU: "AUG",
  AGUSTOS: "AUG",
  AUG: "AUG",
  AUGUST: "AUG",
  EYL: "SEP",
  EYLUL: "SEP",
  SEP: "SEP",
  SEPTEMBER: "SEP",
  EKI: "OCT",
  EKIM: "OCT",
  OCT: "OCT",
  OCTOBER: "OCT",
  KAS: "NOV",
  KASIM: "NOV",
  NOV: "NOV",
  NOVEMBER: "NOV",
  ARA: "DEC",
  ARALIK: "DEC",
  DEC: "DEC",
  DECEMBER: "DEC",
};

function normalizeMonthKey(value) {
  return String(value || "")
    .trim()
    .replace(/ı/g, "i")
    .replace(/İ/g, "I")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\./g, "")
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase();
}

function toEnglishMonthAbbr(value) {
  const key = normalizeMonthKey(value);

  return MONTH_ALIASES[key] || key.slice(0, 3) || "APR";
}

function getMonthIndex(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const numeric = Number(raw);
  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= 12) return numeric;

  const normalizedKey = normalizeMonthKey(raw);
  const key = MONTH_ALIASES[normalizedKey] || normalizedKey;
  return MONTH_INDEX_BY_ALIAS[key] || null;
}

function getMonthAbbr(value, lang = "EN") {
  const monthIndex = getMonthIndex(value);
  if (!monthIndex) return lang === "TR" ? "NİS" : "APR";
  return lang === "TR" ? (MONTHS_TR[monthIndex] || "NİS") : (MONTHS[monthIndex] || "APR");
}

function getMonthTitle(value, lang = "EN") {
  const monthIndex = getMonthIndex(value);
  if (!monthIndex) return lang === "TR" ? "Nis" : "Apr";
  return lang === "TR" ? (MONTH_TITLES_TR[monthIndex] || "Nis") : (MONTH_TITLES_EN[monthIndex] || "Apr");
}

function toEnglishDateLabel(value) {
  const raw = String(value || "").trim();
  if (!raw) return "01 Apr 2026";

  const textMatch = raw.match(/(\d{1,2})\s+([\p{L}]+)\s+(\d{4})/iu);
  if (textMatch) {
    const day = textMatch[1].padStart(2, "0");
    const month = getMonthTitle(textMatch[2], "EN");
    const year = textMatch[3];
    return `${day} ${month} ${year}`;
  }

  const numericMatch = raw.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  if (numericMatch) {
    const day = numericMatch[1].padStart(2, "0");
    const month = getMonthTitle(numericMatch[2], "EN");
    const year = numericMatch[3];
    return `${day} ${month} ${year}`;
  }

  return raw;
}

function toTurkishDateLabel(value) {
  const raw = String(value || "").trim();
  if (!raw) return "01 Nis 2026";

  const textMatch = raw.match(/(\d{1,2})\s+([\p{L}]+)\s+(\d{4})/iu);
  if (textMatch) {
    const day = textMatch[1].padStart(2, "0");
    const month = getMonthTitle(textMatch[2], "TR");
    const year = textMatch[3];
    return `${day} ${month} ${year}`;
  }

  const numericMatch = raw.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  if (numericMatch) {
    const day = numericMatch[1].padStart(2, "0");
    const month = getMonthTitle(numericMatch[2], "TR");
    const year = numericMatch[3];
    return `${day} ${month} ${year}`;
  }

  return raw;
}

function getEnglishDateParts(value) {
  const normalizedDate = toEnglishDateLabel(value);
  const match = normalizedDate.match(/(\d{2})\s+([A-Za-z]{3})\s+(\d{4})/);

  return {
    date: normalizedDate,
    day: match?.[1] || "01",
    month: match?.[2] || "APR",
    year: match?.[3] || "2026",
  };
}

function localizeCompetition(lang = "EN") {
  return ACTIVE_COMPETITION.label[lang] || ACTIVE_COMPETITION.label.EN;
}

function localizeDisplayMatch(match, lang = "EN") {
  return {
    ...match,
    competition: localizeCompetition(lang),
    date: match.date ? (lang === "TR" ? toTurkishDateLabel(match.date) : toEnglishDateLabel(match.date)) : match.date,
    month: match.month ? getMonthAbbr(match.month, lang) : match.month,
  };
}

function normalizeFixtureMatch(match) {
  return {
    ...match,
    competition: COMPETITION,
    date: match.date ? toEnglishDateLabel(match.date) : match.date,
    month: match.month ? toEnglishMonthAbbr(match.month) : match.month,
  };
}

function getMatchDateTimestamp(match) {
  const raw = String(
    match?.date || `${match?.day || ""} ${match?.month || ""} ${match?.year || "2026"}`,
  ).trim();
  const dateMatch = raw.match(/(\d{1,2})\s+([\p{L}]+)\s+(\d{4})/iu);
  if (!dateMatch) return null;

  const day = Number(dateMatch[1]);
  const month = getMonthIndex(dateMatch[2]);
  const year = Number(dateMatch[3]);
  if (!day || !month || !year) return null;

  return new Date(year, month - 1, day, 23, 59, 59, 999).getTime();
}

function isPastUnplayedFixture(match, now = Date.now()) {
  if (match?.played) return false;
  const timestamp = getMatchDateTimestamp(match);
  return timestamp !== null && timestamp < now;
}

function abbr3(name) {
  return (name || "").replace(/[^A-Za-z]/g,"").slice(0,3).toUpperCase() || "???";
}

function cleanFixtureTeamName(value) {
  return String(value || "")
    .replace(/\(\d+\.\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getFixtureTeamName(td) {
  if (!td) return "";
  const linkName = cleanFixtureTeamName(td.querySelector("a")?.textContent);
  return linkName || cleanFixtureTeamName(td.textContent);
}

function parseFixturePage(html, matchday) {
  const parser = new DOMParser();
  const doc    = parser.parseFromString(html, "text/html");
  const rows   = [...doc.querySelectorAll("table tbody tr")];
  const matches = [];

  // Tarih/saat baÅŸlÄ±k satÄ±rÄ±nÄ± bul
  let date = "", time = "22:30";
  const dateCandidates = [
    ...doc.querySelectorAll("h1, h2, h3, h4, h5, h6, caption, th, td[colspan], .card-body, .text-center"),
  ];
  dateCandidates.forEach((el) => {
    const t = (el.textContent || "").replace(/\s+/g, " ").trim();
    if (!t) return;

    const dateMatch =
      t.match(/(\d{1,2})\s+([\p{L}]+)\s+(\d{4})/iu) ||
      t.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);

    if (dateMatch) {
      if (dateMatch[2] && Number.isNaN(Number(dateMatch[2]))) {
        date = `${dateMatch[1].padStart(2, "0")} ${dateMatch[2]} ${dateMatch[3]}`;
      } else {
        const numericMonth = Number(dateMatch[2]);
        date = `${dateMatch[1].padStart(2, "0")} ${MONTHS[numericMonth] || "APR"} ${dateMatch[3]}`;
      }
    }

    const timeMatch = t.match(/(\d{2}:\d{2})\s*(UTC)?/i);
    if (timeMatch) time = timeMatch[1];
  });

  rows.forEach(tr => {
    const tds = [...tr.querySelectorAll("td")];
    if (tds.length < 5) return;

    // home takÄ±m, skorlar, away takÄ±m
    const homeName = getFixtureTeamName(tds[1]);
    const awayName = getFixtureTeamName(tds[5]);
    if (!homeName || !awayName) return;

    const scoreH   = tds[2]?.textContent?.trim();
    const scoreA   = tds[4]?.textContent?.trim();
    const played   = scoreH !== "" && scoreH !== "-" && !isNaN(Number(scoreH));

    const isAltair = homeName.toLowerCase().includes(ALTAIR_NAME) ||
                     awayName.toLowerCase().includes(ALTAIR_NAME);
    if (!isAltair) return;

    const parsedDate = getEnglishDateParts(date);
    const rowNumber = matches.length + 1;

    matches.push({
      id:          matchday + rowNumber / 10,
      matchday:    `GW ${matchday}`,
      competition: COMPETITION,
      date:        parsedDate.date,
      day:         parsedDate.day,
      month:       parsedDate.month,
      time,
      home:        homeName,
      homeAbbr:    abbr3(homeName),
      away:        awayName,
      awayAbbr:    abbr3(awayName),
      hs:          played ? Number(scoreH) : null,
      as:          played ? Number(scoreA) : null,
      played,
      venue:       homeName.toLowerCase().includes(ALTAIR_NAME) ? "Home" : "Away",
    });
  });

  return matches;
}

function readFixCache() {
  try {
    const raw = localStorage.getItem(FIX_CACHE_KEY);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    const ttl = new Date().getDay() === 5 ? FIX_FRIDAY_TTL : FIX_CACHE_MAX;
    if (Date.now() - ts < ttl) return { ts, data };
  } catch { /**/ }
  return null;
}
function writeFixCache(data) {
  try { localStorage.setItem(FIX_CACHE_KEY, JSON.stringify({ ts: Date.now(), data })); }
  catch { /**/ }
}

async function readFixtureSnapshot() {
  try {
    const snapshot = await readSiteSnapshot();
    const matches = Array.isArray(snapshot?.matches)
      ? snapshot.matches.map(normalizeFixtureMatch)
      : [];
    return { matches, date:getSnapshotDate(snapshot) };
  } catch {
    return { matches:[], date:null };
  }
}

function useFixtures() {
  const [allMatches,  setAllMatches]  = useState(null);
  const [fixturesLoading, setFixturesLoading] = useState(true);
  const [error,       setError]       = useState(null);
  const [lastUpdate,  setLastUpdate]  = useState(null);
  const [tick,        setTick]        = useState(0);
  const allMatchesRef = useRef(null);
  const forceFreshRef = useRef(false);

  const refetch = () => {
    localStorage.removeItem(FIX_CACHE_KEY);
    forceFreshRef.current = true;
    setTick(t => t+1);
  };

  useEffect(() => {
    allMatchesRef.current = allMatches;
  }, [allMatches]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const hasExistingData = Array.isArray(allMatchesRef.current);
      const forceFresh = forceFreshRef.current;
      forceFreshRef.current = false;
      const refreshNonce = forceFresh ? Date.now() : null;
      setFixturesLoading(true);
      setError(null);

      const cached = readFixCache();
      if (cached) {
        if (!cancelled) {
          setAllMatches(cached.data.map(normalizeFixtureMatch));
          setLastUpdate(new Date(cached.ts));
          setFixturesLoading(false);
        }
        return;
      }

      const fetchPage = async (md) => {
        try {
          const freshQuery = forceFresh ? `&fresh=1&ts=${refreshNonce}` : "";
          const url = `/api/eml-proxy?path=/tournaments/league_fixture/${TOURNAMENT_ID}/${md}/${freshQuery}`;
          const res = await fetch(url, { cache:"no-store", signal:AbortSignal.timeout(6000) });
          if (!res.ok) return [];
          const html = await res.text();
          return parseFixturePage(html, md);
        } catch { return []; }
      };

      try {
        // Strateji: oynanan maÃ§a gÃ¶re pencere aÃ§, ama ekranda gÃ¶rÃ¼nen en ileri
        // ALTAIR fikstÃ¼rÃ¼nÃ¼ de kapsayacak ÅŸekilde saÄŸ tarafa kaydÄ±r.
        // BÃ¶ylece refresh, Samurai gibi ileride gÃ¶rÃ¼nen maÃ§larÄ±n tarihini de
        // tekrar isteyebilir; toplam istek sayÄ±sÄ± yine en fazla 11 kalÄ±r.
        const mds = ALTAIR_MATCHDAYS.slice(0, TOTAL_MATCHDAYS);

        // 3'erli gruplar halinde â€” site yoÄŸulmaz
        const results = [];
        const batchSize = 3;
        for (let i = 0; i < mds.length; i += batchSize) {
          const batch = mds.slice(i, i + batchSize);
          const pages = await Promise.all(batch.map(fetchPage));
          pages.forEach(matches => results.push(...matches));
          // Ä°stekler arasÄ± kÄ±sa bekleme
          if (i + batchSize < mds.length) await new Promise(r => setTimeout(r, 300));
        }

        results.sort((a, b) => a.id - b.id);

        if (results.length) {
          const normalizedResults = results.map(normalizeFixtureMatch);
          writeFixCache(normalizedResults);
          if (!cancelled) {
            setAllMatches(normalizedResults);
            setLastUpdate(new Date());
          }
        } else {
          const snapshot = await readFixtureSnapshot();
          if (!cancelled) {
            if (!hasExistingData) setAllMatches(snapshot.matches);
            if (snapshot.date) setLastUpdate(snapshot.date);
            setError("Live fixture data unavailable");
          }
        }
        if (!cancelled) {
          setFixturesLoading(false);
        }
      } catch (err) {
        console.warn("[useFixtures]", err.message);
        const snapshot = await readFixtureSnapshot();
        if (!cancelled) {
          setError(err.message);
          if (!hasExistingData) setAllMatches(snapshot.matches);
          if (snapshot.date) setLastUpdate(snapshot.date);
          setFixturesLoading(false);
        }
      }
    }

    load();
    const interval = new Date().getDay() === 5
      ? setInterval(() => setTick(t => t+1), FIX_FRIDAY_TTL) : null;
    return () => { cancelled = true; if (interval) clearInterval(interval); };
  }, [tick]);

  const played   = (allMatches || []).filter(m => m.played);
  const upcoming = (allMatches || []).filter(
    m => !m.played && !isPastUnplayedFixture(m),
  );

  // result kodu: ev sahibiyse kendi skoru, deÄŸilse karÅŸÄ± skor
  const withResult = played.map(m => {
    const myScore    = m.home.toLowerCase().includes(ALTAIR_NAME) ? m.hs : m.as;
    const theirScore = m.home.toLowerCase().includes(ALTAIR_NAME) ? m.as : m.hs;
    const result     = myScore > theirScore ? "W" : myScore < theirScore ? "L" : "D";
    return { ...m, result };
  });

  const loading = fixturesLoading;

  return {
    loading,
    error,
    lastUpdate,
    results:  withResult.slice(-5).reverse(),   // son 5 maÃ§, yeniden eskiye
    fixtures: upcoming.slice(0, 4),             // sonraki 4 maÃ§
    refetch,
  };
}

function ClubBadge({ className, isAltair, label }) {
  return (
    <div className={className}>
      {isAltair ? (
        <img src="/logo-ui.png" alt="" aria-hidden="true" className="club-badge-logo" width="256" height="256" loading="lazy" decoding="async" />
      ) : (
        label
      )}
    </div>
  );
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   STATIC FALLBACK DATA (otomasyon Ã§alÄ±ÅŸmazsa gÃ¶rÃ¼nÃ¼r)
   â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

const RESULTS_FALLBACK = [
  { id:10.1, date:"07 August 2026", matchday:"GW 10", competition:"EML FC26 Summer League", home:"Liderpool FC", homeAbbr:"LID", away:"ALTAIR eSports", awayAbbr:"ALT", hs:0, as:2, result:"W", venue:"Away" },
  { id:9.1,  date:"07 August 2026", matchday:"GW 9",  competition:"EML FC26 Summer League", home:"ALTAIR eSports", homeAbbr:"ALT", away:"FC BIG BANG", awayAbbr:"FCB", hs:3, as:1, result:"W", venue:"Home" },
  { id:8.1,  date:"31 July 2026", matchday:"GW 8",  competition:"EML FC26 Summer League", home:"Gunners", homeAbbr:"GUN", away:"ALTAIR eSports", awayAbbr:"ALT", hs:3, as:2, result:"L", venue:"Away" },
  { id:7.1,  date:"31 July 2026", matchday:"GW 7",  competition:"EML FC26 Summer League", home:"3 Silahşörler", homeAbbr:"SIL", away:"ALTAIR eSports", awayAbbr:"ALT", hs:0, as:0, result:"D", venue:"Away" },
  { id:6.1,  date:"17 July 2026", matchday:"GW 6",  competition:"EML FC26 Summer League", home:"Glarung FC", homeAbbr:"GLA", away:"ALTAIR eSports", awayAbbr:"ALT", hs:2, as:0, result:"L", venue:"Away" },
];

const FIXTURES_FALLBACK = [
  { id:11.1, date:"14 August 2026", day:"14", month:"AUG", time:"22:30", matchday:"GW 11", competition:"EML FC26 Summer League", home:"Saray Bahçe eSpor", homeAbbr:"SAR", away:"ALTAIR eSports", awayAbbr:"ALT", venue:"Away" },
  { id:12.1, date:"14 August 2026", day:"14", month:"AUG", time:"23:00", matchday:"GW 12", competition:"EML FC26 Summer League", home:"ALTAIR eSports", homeAbbr:"ALT", away:"Shelter FC", awayAbbr:"SHE", venue:"Home" },
  { id:13.1, date:"21 August 2026", day:"21", month:"AUG", time:"22:30", matchday:"GW 13", competition:"EML FC26 Summer League", home:"ALTAIR eSports", homeAbbr:"ALT", away:"Papatya SK", awayAbbr:"PAP", venue:"Home" },
];

const SQUAD_CACHE_KEY = "altair_squad_roster_v6";
const SQUAD_CACHE_MAX = 15 * 60 * 1000;
const SQUAD_POLL_MS = 5 * 60 * 1000;
const TEAM_PAGE_PATH = EML_TEAM_PATH;
const SQUAD_ROUTE_RE = /href=["']([^"'#?]*\/teams\/team\/\d+\/\d+\/\d+\/squad[^"'#?]*)["']/gi;
const SQUAD_GROUP_ORDER = [
  { group:"Goalkeepers", abbr:"GK" },
  { group:"Defenders", abbr:"DEF" },
  { group:"Midfielders", abbr:"MID" },
  { group:"Forwards", abbr:"FWD" },
];
const POSITION_META = {
  GK:  { group:"Goalkeepers", role:"Goalkeeper" },
  LB:  { group:"Defenders", role:"Left-Back" },
  LWB: { group:"Defenders", role:"Left Wing-Back" },
  CB:  { group:"Defenders", role:"Centre-Back" },
  RB:  { group:"Defenders", role:"Right-Back" },
  RWB: { group:"Defenders", role:"Right Wing-Back" },
  CDM: { group:"Midfielders", role:"Defensive Midfielder" },
  CM:  { group:"Midfielders", role:"Central Midfielder" },
  CAM: { group:"Midfielders", role:"Attacking Midfielder" },
  LM:  { group:"Midfielders", role:"Left Midfielder" },
  RM:  { group:"Midfielders", role:"Right Midfielder" },
  LW:  { group:"Forwards", role:"Left Winger" },
  RW:  { group:"Forwards", role:"Right Winger" },
  CF:  { group:"Forwards", role:"Centre-Forward" },
  ST:  { group:"Forwards", role:"Striker" },
};

function canonicalizeIgn(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&[a-z0-9#]+;/gi, "")
    .replace(/[^a-z0-9]+/gi, "")
    .toLowerCase();
}

function decodeHtmlValue(value) {
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

function stripHtmlTags(value) {
  return decodeHtmlValue(String(value || "").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSquadPosition(value) {
  const position = stripHtmlTags(value).toUpperCase().replace(/[^A-Z]/g, "");
  return POSITION_META[position] ? position : "";
}

function findBestSquadRosterTable(html) {
  const tables = html.match(/<table\b[\s\S]*?<\/table>/gi) || [];
  let bestTable = null;
  let bestScore = 0;

  for (const tableHtml of tables) {
    const rows = tableHtml.match(/<tr\b[\s\S]*?<\/tr>/gi) || [];
    const score = rows.reduce((count, rowHtml) => {
      const cells = [...rowHtml.matchAll(/<t[dh]\b[\s\S]*?<\/t[dh]>/gi)].map((match) => stripHtmlTags(match[0]));
      const position = normalizeSquadPosition(cells[0]);
      const ign = cells[1] || "";
      return count + (position && canonicalizeIgn(ign) && !/^\d+$/.test(ign) ? 1 : 0);
    }, 0);

    if (score > bestScore) {
      bestScore = score;
      bestTable = tableHtml;
    }
  }

  return bestScore >= 5 ? bestTable : null;
}

function parseSquadRosterTable(tableHtml) {
  const roster = [];
  const seen = new Set();
  const rowMatches = tableHtml.match(/<tr\b[\s\S]*?<\/tr>/gi) || [];

  for (const rowHtml of rowMatches) {
    const cellHtml = [...rowHtml.matchAll(/<t[dh]\b[\s\S]*?<\/t[dh]>/gi)].map((match) => match[0]);
    const cells = cellHtml.map((cell) => stripHtmlTags(cell));
    if (cells.length < 2) continue;

    const pos = normalizeSquadPosition(cells[0]);
    const ign = cells[1]?.trim();
    const key = canonicalizeIgn(ign);
    if (!pos || !key || seen.has(key) || /^\d+$/.test(ign)) continue;

    const profileHref = cellHtml[1]?.match(/href=["']([^"']+)["']/i)?.[1] || "";
    const numericCells = cells
      .slice(2)
      .map((cell) => {
        const normalized = cell.replace(",", ".").trim();
        return /^\d+(\.\d+)?$/.test(normalized) ? Number(normalized) : null;
      })
      .filter((value) => value !== null);

    seen.add(key);
    roster.push({
      ign,
      pos,
      apps:numericCells.length >= 3 ? Number(numericCells[0]) : null,
      goals:numericCells.length >= 3 ? Number(numericCells[1]) : null,
      assists:numericCells.length >= 3 ? Number(numericCells[2]) : null,
      profileUrl:profileHref
        ? new URL(profileHref, "https://emajorleague.com").toString()
        : "",
    });
  }

  return roster;
}

function resolveSquadStatsPath(html) {
  const paths = [];
  for (const match of html.matchAll(SQUAD_ROUTE_RE)) {
    paths.push(match[1]);
  }

  const uniquePaths = [...new Set(paths)];
  uniquePaths.sort((left, right) => right.localeCompare(left));
  return uniquePaths[0] || null;
}

function makePlayerInitials(ign) {
  const parts = String(ign || "").split(/[^a-z0-9]+/i).filter(Boolean);
  if (parts.length > 1) return parts.slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return (parts[0] || "A").slice(0, 2).toUpperCase();
}

function normalizePlayerProfileUrl(href) {
  if (!href) return "";

  try {
    const url = new URL(href, "https://emajorleague.com");
    const allowedHosts = new Set(["emajorleague.com", "www.emajorleague.com"]);
    return url.protocol === "https:" && allowedHosts.has(url.hostname) ? url.toString() : "";
  } catch {
    return "";
  }
}

function buildLiveSquad(baseSquad, roster) {
  const knownPlayers = new Map(
    baseSquad
      .flatMap((group) => group.players)
      .map((player) => [canonicalizeIgn(player.ign), { player }]),
  );
  const groups = new Map(SQUAD_GROUP_ORDER.map((item) => [item.group, { ...item, players:[] }]));

  for (const livePlayer of roster) {
    const known = knownPlayers.get(canonicalizeIgn(livePlayer.ign));
    const liveMeta = POSITION_META[livePlayer.pos] || POSITION_META.ST;

    if (known) {
      const player = {
        ...known.player,
        pos:livePlayer.pos,
        role:liveMeta.role,
        apps:livePlayer.apps ?? known.player.apps,
        goals:livePlayer.goals ?? known.player.goals,
        assists:livePlayer.assists ?? known.player.assists,
        profileUrl:normalizePlayerProfileUrl(livePlayer.profileUrl) || known.player.profileUrl,
      };
      groups.get(liveMeta.group)?.players.push(player);
      continue;
    }

    groups.get(liveMeta.group)?.players.push({
      number:"",
      name:"",
      ign:livePlayer.ign,
      pos:livePlayer.pos,
      role:liveMeta.role,
      flag:"",
      init:makePlayerInitials(livePlayer.ign),
      apps:livePlayer.apps,
      goals:livePlayer.goals,
      assists:livePlayer.assists,
      captain:false,
      profileUrl:normalizePlayerProfileUrl(livePlayer.profileUrl),
      pending:true,
    });
  }

  return SQUAD_GROUP_ORDER.map(({ group }) => groups.get(group));
}

function readSquadCache(allowStale = false) {
  try {
    const raw = localStorage.getItem(SQUAD_CACHE_KEY);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (allowStale || Date.now() - ts < SQUAD_CACHE_MAX) {
      return { ts, data };
    }
  } catch { /**/ }
  return null;
}

function writeSquadCache(data) {
  try {
    localStorage.setItem(SQUAD_CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch { /**/ }
}

function useSquadStats() {
  const [squad, setSquad] = useState(SQUAD);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [tick, setTick] = useState(0);

  const refetch = () => {
    localStorage.removeItem(SQUAD_CACHE_KEY);
    setTick((value) => value + 1);
  };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const cached = readSquadCache();
      if (cached) {
        if (!cancelled) {
          setSquad(cached.data);
          setLastUpdate(new Date(cached.ts));
          setLoading(false);
        }
        return;
      }

      try {
        const freshQuery = `&fresh=1&ts=${Date.now()}`;
        const teamRes = await fetch(`/api/eml-proxy?path=${encodeURIComponent(TEAM_PAGE_PATH)}${freshQuery}`, { cache:"no-store" });
        if (!teamRes.ok) throw new Error(`HTTP ${teamRes.status}`);
        const teamHtml = await teamRes.text();

        let tableHtml = findBestSquadRosterTable(teamHtml);

        if (!tableHtml) {
          const squadPath = resolveSquadStatsPath(teamHtml);
          if (!squadPath) throw new Error("Squad page not found");
          const squadRes = await fetch(`/api/eml-proxy?path=${encodeURIComponent(squadPath)}${freshQuery}`, { cache:"no-store" });
          if (!squadRes.ok) throw new Error(`HTTP ${squadRes.status}`);
          const squadHtml = await squadRes.text();
          tableHtml = findBestSquadRosterTable(squadHtml);
        }

        if (!tableHtml) throw new Error("Squad roster table not found");

        const roster = parseSquadRosterTable(tableHtml);
        if (roster.length < 5 || roster.length > 40) throw new Error("Squad roster validation failed");

        const liveSquad = buildLiveSquad(SQUAD, roster);
        writeSquadCache(liveSquad);

        if (!cancelled) {
          setSquad(liveSquad);
          setLastUpdate(new Date());
        }
      } catch (err) {
        console.warn("[useSquadStats]", err.message);
        const staleCache = readSquadCache(true);
        let snapshotSquad = null;
        let snapshotDate = null;

        if (!staleCache?.data) {
          try {
            const snapshot = await readSiteSnapshot();
            if (Array.isArray(snapshot?.roster) && snapshot.roster.length >= 5) {
              snapshotSquad = buildLiveSquad(SQUAD, snapshot.roster);
              snapshotDate = getSnapshotDate(snapshot);
            }
          } catch { /* local fallback remains available */ }
        }

        if (!cancelled) {
          setError(err.message);
          setSquad(staleCache?.data || snapshotSquad || SQUAD);
          if (staleCache?.ts) setLastUpdate(new Date(staleCache.ts));
          else if (snapshotDate) setLastUpdate(snapshotDate);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const interval = setInterval(() => setTick((value) => value + 1), SQUAD_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [tick]);

  return { squad, loading, error, lastUpdate, refetch };
}

const LANG_OPTIONS = [
  { code:"EN", label:"English", note:"English version" },
  { code:"TR", label:"Türkçe",  note:"Varsayılan dil" },
];

const UI_COPY = {
  EN: {
    nav: {
      links: { results:"Results", table:"Table", fixtures:"Fixtures", squad:"Squad", partners:"Partners", watch:"Watch" },
      cta:"Follow the Club",
      langHead:"Site Language",
      menu:"Menu",
      menuClose:"Close menu",
    },
    hero: {
      tagLeague:"FC 26 · eMajor League",
      tagSeason:"EML FC26 Summer League",
      lines:["SUMMER", "LEAGUE.", "ALTAIR RISES."],
      sub:"enters the EML FC26 Summer League with a competitive squad, strong team culture and the ambition to turn every matchday into a statement.",
      primary:"Watch Live",
      secondary:"Meet the Squad",
      scroll:"Scroll",
      pathways:[
        { label:"Supporters", value:"Results & Matchdays", href:"#matches" },
        { label:"Competition", value:"EML FC26 Summer League", href:"#standings" },
        { label:"Partners", value:"Brand Collaborations", href:"#sponsors" },
      ],
    },
    identity: {
      eyebrow:"Club Identity",
      title:["ONE TEAM", "ONE PURPOSE"],
      sub:"A competitive club shaped by shared responsibility, discipline and the ambition to progress as one.",
      cultureLabel:"ALTAIR / TEAM CULTURE",
      foundedLabel:"Founded",
      founded:"Founded in 2025",
      founders:"Competitive Pro Clubs team",
      storyTitle:"The team comes first.",
      storyText:"One badge. One responsibility. One purpose. At ALTAIR, individual talent becomes meaningful only when it moves the whole team forward.",
      mottoLabel:"ALTAIR Principle",
      motto:"We play together. We win together.",
      cards:[
        { k:"01", title:"Team Discipline", text:"Every role is defined around match responsibility, communication and repeatable performance." },
        { k:"02", title:"Competitive Vision", text:"The club targets stable league growth, stronger seasonal results and credible European ambitions." },
        { k:"03", title:"Community Standard", text:"Broadcasts, roster updates and social content are presented with the consistency expected from a modern club." },
      ],
    },
    honours: {
      eyebrow:"Club Honours",
      title:["A SHORT HISTORY", "OF RESULTS"],
      sub:"ALTAIR's early competitive record reflects a team that learned quickly, progressed through the leagues and consistently turned tournament runs into tangible results.",
      view:"View Club Honours",
      items:[
        { mark:"02", season:"FC 26 · Season 1", competition:"EML Third Division", result:"Runner-up" },
        { mark:"7×", season:"Tournament Record", competition:"BRFC Tournaments", result:"Champions" },
        { mark:"5×", season:"Tournament Record", competition:"EML Night Tournaments", result:"Champions" },
        { mark:"F", season:"FC 26 · Season 2", competition:"ProLeague European League", result:"Finalist" },
        { mark:"06", season:"FC 26 · Season 2", competition:"EML First Division", result:"6th Place" },
      ],
    },
    ticker: {
      tag:"EML FC26 · SUMMER",
      form:"CURRENT FORM · W · W · W · W · W",
      next:"NEXT UP · VOGUE · 10 JUL · 23:00 UTC+3",
      live:"BROADCAST LIVE ON TWITCH · /ALTAIRESPOR",
      aria:"Latest results ticker",
    },
    standings: {
      updating:"Updating…",
      cached:"Cached data",
      refresh:"Refresh",
      live:"Live Standings",
      locked:"Final Table",
      filterLabel:"Season",
      lockedNote:"EML FC26 S2 final table snapshot",
      seasonOptions:{ s2:"EML FC26 S2", summer:"EML FC26 Summer League" },
      title:["LIVE", "TABLE"],
      kpis:{ position:"Position", points:"Points", wins:"Wins", goalDiff:"Goal Diff", played:"Played" },
      table:{ club:"Club", form:"Form" },
      loading:"Loading…",
      showing:(from, to, total) => `Showing ranks ${from}-${to} · ${total || 18} clubs total`,
      cachedPrefix:(err) => `Cached · ${err}`,
      full:"Full table on eMajor League →",
      rankUnit:"th",
      pointUnit:"pts",
      winUnit:"W",
      playedUnit:"GP",
    },
    results: {
      eyebrow:"Matchday Report",
      title:["RECENT", "RESULTS"],
      subLoading:"Loading latest results…",
      sub:"A clean matchday archive showing ALTAIR eSports’ latest EML FC26 Summer League results, scorelines and match context.",
      cached:"Cached",
      viewFixtures:"View Fixtures",
      labels:{ W:"Victory", L:"Defeat", D:"Draw" },
      venue:{ home:"Home", away:"Away" },
    },
    fixtures: {
      eyebrow:"Upcoming Schedule",
      title:["NEXT", "FIXTURES"],
      subLoading:"Loading upcoming fixtures…",
      sub:"Upcoming ALTAIR eSports fixtures in EML FC26 Summer League with opponent, matchday and broadcast details.",
      cached:"Cached",
      updated:"Updated",
      spotlight:"Next Match",
      matchCenter:"Matchday Center",
      watch:"Watch on Twitch",
      venue:{ home:"Home", away:"Away" },
      vs:"VS",
    },
    squad: {
      eyebrow:"ALTAIR ROSTER",
      title:["FIELD", "IDENTITY"],
      sub:"A disciplined ALTAIR lineup shaped around defined roles, competitive structure and matchday responsibility.",
      subLoading:"Synchronising the current eMajor League roster…",
      cached:"Last verified roster",
      players:(count) => `${count} Players`,
      count:(count) => `${count} ${count > 1 ? "players" : "player"}`,
      stats:{ apps:"Apps", goals:"Goals", assists:"Assists" },
      captain:"Captain",
      profile:"View Profile",
      cta:"Contact ALTAIR through our official channels for scrims, tournaments or competitive inquiries.",
      filters:{
        all:"All",
        Goalkeepers:"Goalkeepers",
        Defenders:"Defenders",
        Midfielders:"Midfielders",
        Forwards:"Attackers",
      },
      groups:{
        Goalkeepers:"Goalkeepers",
        Defenders:"Defenders",
        Midfielders:"Midfielders",
        Forwards:"Forwards",
      },
      roles:{
        Goalkeeper:"Goalkeeper",
        "Centre-Back":"Centre-Back",
        "Right Wing Back":"Right Wing Back",
        "Left Wing Back":"Left Wing Back",
        "Defensive Midfielder":"Defensive Midfielder",
        "Central Midfielder":"Central Midfielder",
        Striker:"Striker",
      },
    },
    sponsors: {
      eyebrow:"Brand Partnerships",
      title:["CREATE VALUE", "TOGETHER"],
      sub:"We build credible brand collaborations around competitive matchdays, original content and the culture of the Pro Clubs community.",
      open:"Open to partnership conversations",
      modelLabel:"ALTAIR Partnership Model",
      pitchTitle:"Put your brand at the heart of the game.",
      pitchText:"Instead of fixed packages, we shape every collaboration around a clear objective, the right format and a genuine connection with the audience.",
      touchpointLabel:"Collaboration touchpoints",
      touchpoints:["Matchdays","Digital Content","Live Broadcasts","Community"],
      mediaKit:{
        kicker:"ALTAIR / MEDIA KIT",
        title:"A clear starting point for brands.",
        text:"Review the club story, competitive record, collaboration formats and official communication channels in one printable document.",
        cta:"Open Media Kit",
      },
      briefLabel:"ALTAIR / Brand Partnerships",
      briefTitle:["PARTNER", "WITH PURPOSE"],
      briefFoot:"Competition. Content. Community.",
      opportunities:[
        { k:"01", tag:"MATCHDAY", title:"Visible at the Right Moment", text:"Bring your brand into matchday communication, competition-focused posts and live broadcast touchpoints." },
        { k:"02", tag:"CONTENT", title:"Stories People Remember", text:"Develop social formats, campaign ideas and player-led stories that naturally fit the identity of both brands." },
        { k:"03", tag:"COMMUNITY", title:"A Meaningful Connection", text:"Build a consistent and transparent relationship with an active gaming and esports audience." },
      ],
      ctaKicker:"LET'S TALK",
      ctaTitle:"If you have an idea, let’s build it together.",
      ctaSub:"Tell us about your brand, campaign or partnership goal through ALTAIR’s official Instagram account.",
      ctaPrimary:"Contact on Instagram",
      ctaSecondary:"Explore the Channels",
    },
    social: {
      eyebrow:"Broadcasts & Community",
      title:["FOLLOW", "ALTAIR"],
      sub:"Instagram is ALTAIR's primary communication channel. Live matches are broadcast on Twitch, video content is archived on YouTube and the community remains connected through Discord.",
      official:"Official",
      statuses:{ primary:"Primary Channel", live:"Live Broadcasts", archive:"Video Archive", community:"Open Community" },
      cards:{
        tw:{ desc:"Watch ALTAIR's scheduled matches live and follow every competitive matchday in real time.", cta:"Watch Live" },
        yt:{ desc:"Revisit match replays, player-focused videos and selected club content.", cta:"View Channel" },
        ig:{ desc:"The home of official announcements, matchday graphics, squad news and the latest stories from ALTAIR.", cta:"Follow the Main Channel" },
        dc:{ desc:"Join the active ALTAIR community for announcements, matchday conversation and club updates.", cta:"Join the Community" },
      },
    },
    updates: {
      eyebrow:"Club Updates",
      title:["LATEST FROM", "ALTAIR"],
      sub:"The most important current information from the team, gathered in one concise club hub.",
      nextLabel:"Next Match",
      rosterLabel:"Current Roster",
      broadcastLabel:"Broadcast Center",
      rosterTitle:(count) => `${count} Players`,
      rosterMeta:"Automatically synchronised with eMajor League",
      broadcastTitle:"Live Match Broadcasts",
      broadcastMeta:"Twitch · /altairespor",
      matchCta:"View Fixture",
      rosterCta:"Meet the Squad",
      broadcastCta:"Open Twitch",
    },
    footer: {
      brandTag:"FC 26 Pro Clubs · eMajor League",
      bio:"ALTAIR eSports is a competitive Pro Clubs organization built on team discipline, game intelligence and a sustainable ambition for success.",
      titles:{ club:"Club", competition:"Competition", connect:"Connect" },
      clubLinks:["About ALTAIR","Club Honours","Season Results","Media & Press","Official Channels"],
      compLinks:["Team Page","League Table","Fixtures","Statistics","Squad"],
      connectLinks:["Partnerships","Instagram","Twitch","YouTube","Discord"],
      rights:"© 2026 ALTAIR eSports · All rights reserved",
      competing:"Competing in",
      privacy:"Privacy",
      terms:"Terms",
    },
  },
  TR: {
    nav: {
      links: { results:"Sonuçlar", table:"Tablo", fixtures:"Fikstür", squad:"Kadro", partners:"Partnerler", watch:"İzle" },
      cta:"Kulübü Takip Et",
      langHead:"Site Dili",
      menu:"Menü",
      menuClose:"Menüyü kapat",
    },
    hero: {
      tagLeague:"FC 26 · eMajor League",
      tagSeason:"EML FC26 Yaz Ligi",
      lines:["YAZ", "LİGİ.", "ALTAIR SAHADA."],
      sub:"EML FC26 Yaz Ligi’ne rekabetçi kadrosu, güçlü takım kültürü ve her maç gününde iz bırakma hedefiyle çıkan bir e-spor organizasyonudur.",
      primary:"Canlı İzle",
      secondary:"Kadroyu İncele",
      scroll:"Kaydır",
      pathways:[
        { label:"Taraftarlar", value:"Sonuçlar ve Maç Günleri", href:"#matches" },
        { label:"Rekabet", value:"EML FC26 Yaz Ligi", href:"#standings" },
        { label:"Partnerler", value:"Marka İş Birlikleri", href:"#sponsors" },
      ],
    },
    identity: {
      eyebrow:"KULÜP KİMLİĞİ",
      title:["BİR TAKIM", "TEK HEDEF"],
      sub:"Ortak sorumluluk, disiplin ve birlikte ilerleme hedefiyle şekillenen rekabetçi bir kulüp.",
      cultureLabel:"ALTAIR / TAKIM KÜLTÜRÜ",
      foundedLabel:"Kuruluş",
      founded:"2025 yılında kuruldu",
      founders:"Rekabetçi Pro Clubs takımı",
      storyTitle:"Önce takım.",
      storyText:"Tek arma. Ortak sorumluluk. Aynı hedef. ALTAIR'de bireysel yetenek, ancak bütün takımı ileri taşıdığında anlam kazanır.",
      mottoLabel:"ALTAIR İlkesi",
      motto:"Birlikte oynar, birlikte kazanırız.",
      cards:[
        { k:"01", title:"AİDİYET", text:"ALTAIR’de her oyuncu yalnızca kadronun bir parçası olmaz; ortak hedefe, emeğe ve kulüp kültürüne bağlı bir yapının içinde yer alır." },
        { k:"02", title:"GÜVEN VE BAĞ", text:"Sahadaki uyum, birbirine güvenen oyuncularla kurulur. İletişim, fedakârlık ve birlikte hareket etme kültürü ALTAIR’in temelidir." },
        { k:"03", title:"ORTAK HEDEF", text:"Her maç, her antrenman ve her başarı ortak emeğin sonucudur. ALTAIR’de hedef sadece kazanmak değil, birlikte gelişerek kalıcı bir kulüp kimliği oluşturmaktır." },
      ],
    },
    honours: {
      eyebrow:"Kulüp Başarıları",
      title:["KISA TARİH", "BÜYÜK SONUÇLAR"],
      sub:"ALTAIR'in genç rekabet geçmişi; liglerde hızla yükselen, turnuva serilerinde istikrar sağlayan ve önemli finallere ulaşan bir takımın gelişimini gösteriyor.",
      view:"Başarıları Gör",
      items:[
        { mark:"02", season:"FC 26 · 1. Sezon", competition:"EML 3. Lig", result:"İkincilik" },
        { mark:"7×", season:"Turnuva Başarısı", competition:"BRFC Turnuvaları", result:"Şampiyonluk" },
        { mark:"5×", season:"Turnuva Başarısı", competition:"EML Gece Turnuvaları", result:"Şampiyonluk" },
        { mark:"F", season:"FC 26 · 2. Sezon", competition:"ProLeague Avrupa Ligi", result:"Finalist" },
        { mark:"06", season:"FC 26 · 2. Sezon", competition:"EML 1. Lig", result:"6.'lık" },
      ],
    },
    ticker: {
      tag:"EML FC26 · YAZ LİGİ",
      form:"GÜNCEL FORM · G · G · G · G · G",
      next:"SIRADAKİ MAÇ · VOGUE · 10 TEM · 23:00 UTC+3",
      live:"YAYIN TWITCH'TE CANLI · /ALTAIRESPOR",
      aria:"Sonuçlar kayan şeridi",
    },
    standings: {
      updating:"Güncelleniyor…",
      cached:"Önbellek verisi",
      refresh:"Yenile",
      live:"Canlı Puan Durumu",
      locked:"Final Tablo",
      filterLabel:"Sezon",
      lockedNote:"EML FC26 S2 final tablo görünümü",
      seasonOptions:{ s2:"EML FC26 S2", summer:"EML FC26 Yaz Ligi" },
      title:["CANLI", "TABLO"],
      kpis:{ position:"Sıra", points:"Puan", wins:"Galibiyet", goalDiff:"Averaj", played:"Oynanan" },
      table:{ club:"Kulüp", form:"Form" },
      loading:"Yükleniyor…",
      showing:(from, to, total) => `${from}-${to} sıraları gösteriliyor · toplam ${total || 18} kulüp`,
      cachedPrefix:(err) => `Önbellek · ${err}`,
      full:"Tam tablo eMajor League'de →",
      rankUnit:"",
      pointUnit:"puan",
      winUnit:"G",
      playedUnit:"OM",
    },
    results: {
      eyebrow:"Maç Haftası Raporu",
      title:["SON", "SONUÇLAR"],
      subLoading:"Son sonuçlar yükleniyor…",
      sub:"ALTAIR eSports’un EML FC26 Yaz Ligi’ndeki son maçlarını skor, maç haftası ve karşılaşma bağlamıyla gösteren sonuç arşivi.",
      cached:"Önbellek",
      viewFixtures:"Fikstüre Git",
      labels:{ W:"Galibiyet", L:"Mağlubiyet", D:"Beraberlik" },
      venue:{ home:"İç Saha", away:"Deplasman" },
    },
    fixtures: {
      eyebrow:"Yaklaşan Program",
      title:["SIRADAKİ", "FİKSTÜR"],
      subLoading:"Yaklaşan fikstür yükleniyor…",
      sub:"ALTAIR eSports’un EML FC26 Yaz Ligi fikstürü; rakip, maç haftası, saat ve yayın bilgisiyle güncel tutulur.",
      cached:"Önbellek",
      updated:"Güncellendi",
      spotlight:"Sıradaki Maç",
      matchCenter:"Maç Günü Merkezi",
      watch:"Twitch'te İzle",
      venue:{ home:"İç Saha", away:"Deplasman" },
      vs:"VS",
    },
    squad: {
      eyebrow:"ALTAIR ROSTER",
      title:["SAHADAKİ", "KİMLİĞİMİZ"],
      sub:"ALTAIR eSports kadrosu; disiplinli rol dağılımı, takım oyunu ve rekabetçi yapı üzerine kurulur.",
      subLoading:"Güncel eMajor League kadrosu eşitleniyor…",
      cached:"Son doğrulanmış kadro",
      players:(count) => `${count} Oyuncu`,
      count:(count) => `${count} oyuncu`,
      stats:{ apps:"Maç", goals:"Gol", assists:"Asist" },
      captain:"Kaptan",
      profile:"Profili Gör",
      cta:"Hazırlık maçı, turnuva veya rekabetçi iletişim için resmi kanallarımız üzerinden bizimle iletişime geçin.",
      filters:{
        all:"Tüm Kadro",
        Goalkeepers:"Kaleciler",
        Defenders:"Defans",
        Midfielders:"Orta Saha",
        Forwards:"Hücum",
      },
      groups:{
        Goalkeepers:"Kaleciler",
        Defenders:"Defans",
        Midfielders:"Orta Saha",
        Forwards:"Hücum",
      },
      roles:{
        Goalkeeper:"Kaleci",
        "Centre-Back":"Stoper",
        "Right Wing Back":"Sağ Kanat Bek",
        "Left Wing Back":"Sol Kanat Bek",
        "Defensive Midfielder":"Defansif Orta Saha",
        "Central Midfielder":"Merkez Orta Saha",
        Striker:"Forvet",
      },
    },
    sponsors: {
      eyebrow:"Marka Partnerlikleri",
      title:["BİRLİKTE", "DEĞER ÜRETELİM"],
      sub:"Rekabetçi maç günleri, özgün içerikler ve Pro Clubs topluluğunun kültürü etrafında güvenilir marka iş birlikleri kuruyoruz.",
      open:"Partnerlik görüşmelerine açık",
      modelLabel:"ALTAIR Partnerlik Modeli",
      pitchTitle:"Markanızı oyunun merkezine taşıyalım.",
      pitchText:"Hazır paketler yerine her iş birliğini net bir hedef, doğru format ve izleyiciyle gerçek bir bağ etrafında şekillendiriyoruz.",
      touchpointLabel:"İş birliği alanları",
      touchpoints:["Maç Günleri","Dijital İçerik","Canlı Yayın","Topluluk"],
      mediaKit:{
        kicker:"ALTAIR / MEDYA KİTİ",
        title:"Markalar için net bir başlangıç noktası.",
        text:"Kulüp hikâyesini, rekabetçi başarıları, iş birliği formatlarını ve resmi iletişim kanallarını tek bir yazdırılabilir dokümanda inceleyin.",
        cta:"Medya Kitini Aç",
      },
      briefLabel:"ALTAIR / Marka Partnerlikleri",
      briefTitle:["AMAÇ ODAKLI", "PARTNERLİK"],
      briefFoot:"Rekabet. İçerik. Topluluk.",
      opportunities:[
        { k:"01", tag:"MAÇ GÜNÜ", title:"Doğru Anda Görünürlük", text:"Markanızı maç iletişimi, rekabet odaklı paylaşımlar ve canlı yayın temas noktalarıyla buluşturun." },
        { k:"02", tag:"İÇERİK", title:"Hatırlanan Hikâyeler", text:"Her iki markanın kimliğine doğal biçimde uyum sağlayan sosyal formatlar, kampanyalar ve oyuncu hikâyeleri geliştirin." },
        { k:"03", tag:"TOPLULUK", title:"Anlamlı Bir Bağ", text:"Aktif oyuncu ve e-spor kitlesiyle tutarlı, şeffaf ve uzun vadeli bir ilişki kurun." },
      ],
      ctaKicker:"KONUŞALIM",
      ctaTitle:"Bir fikriniz varsa, birlikte geliştirelim.",
      ctaSub:"Markanızı, kampanyanızı veya partnerlik hedefinizi ALTAIR’ın resmi Instagram hesabı üzerinden bizimle paylaşın.",
      ctaPrimary:"Instagram’dan İletişime Geç",
      ctaSecondary:"Kanalları İncele",
    },
    social: {
      eyebrow:"Yayınlar ve Topluluk",
      title:["ALTAIR'I", "TAKİP ET"],
      sub:"Instagram, ALTAIR'in ana iletişim kanalıdır. Maçlar Twitch'te canlı yayınlanır, video içerikleri YouTube'da arşivlenir ve topluluk Discord üzerinden bir araya gelir.",
      official:"Resmi",
      statuses:{ primary:"Ana Kanal", live:"Canlı Yayın", archive:"Video Arşivi", community:"Topluluk Açık" },
      cards:{
        tw:{ desc:"ALTAIR'in programdaki maçlarını canlı izleyin ve tüm rekabetçi maç günlerini anlık takip edin.", cta:"Canlı İzle" },
        yt:{ desc:"Maç tekrarlarını, oyuncu odaklı videoları ve seçili kulüp içeriklerini yeniden izleyin.", cta:"Kanalı İncele" },
        ig:{ desc:"Resmi duyuruların, maç günü tasarımlarının, kadro haberlerinin ve ALTAIR'den son gelişmelerin ana adresi.", cta:"Ana Kanalı Takip Et" },
        dc:{ desc:"Duyurular, maç günü sohbetleri ve kulüp gelişmeleri için aktif ALTAIR topluluğuna katılın.", cta:"Topluluğa Katıl" },
      },
    },
    updates: {
      eyebrow:"Kulüp Duyuruları",
      title:["ALTAIR'DEN", "GÜNCEL"],
      sub:"Takımla ilgili en önemli güncel bilgileri tek ve sade bir kulüp merkezinde bir araya getiriyoruz.",
      nextLabel:"Sıradaki Maç",
      rosterLabel:"Güncel Kadro",
      broadcastLabel:"Yayın Merkezi",
      rosterTitle:(count) => `${count} Oyuncu`,
      rosterMeta:"eMajor League ile otomatik senkronize",
      broadcastTitle:"Canlı Maç Yayınları",
      broadcastMeta:"Twitch · /altairespor",
      matchCta:"Fikstürü Gör",
      rosterCta:"Kadroyu İncele",
      broadcastCta:"Twitch'i Aç",
    },
    footer: {
      brandTag:"FC 26 Pro Clubs · eMajor League",
      bio:"ALTAIR eSports, rekabetçi Pro Clubs sahnesinde takım disiplini, oyun aklı ve sürdürülebilir başarı hedefiyle mücadele eden bir e-spor organizasyonudur.",
      titles:{ club:"Kulüp", competition:"Rekabet", connect:"Bağlantı" },
      clubLinks:["ALTAIR Hakkında","Kulüp Başarıları","Sezon Sonuçları","Medya ve Basın","Resmi Kanallar"],
      compLinks:["Takım Sayfası","Puan Durumu","Fikstür","İstatistikler","Kadro"],
      connectLinks:["Partnerlik","Instagram","Twitch","YouTube","Discord"],
      rights:"© 2026 ALTAIR eSports · Tüm hakları saklıdır",
      competing:"Mücadele ettiği lig",
      privacy:"Gizlilik",
      terms:"Koşullar",
    },
  },
};

const MONTHS_TR = ["","OCA","ŞUB","MAR","NİS","MAY","HAZ","TEM","AĞU","EYL","EKİ","KAS","ARA"];
const MONTH_TITLES_EN = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTH_TITLES_TR = ["","Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"];
const MONTH_INDEX_BY_ALIAS = {
  JAN:1, OCA:1,
  FEB:2, SUB:2,
  MAR:3,
  APR:4, NIS:4,
  MAY:5,
  JUN:6, HAZ:6,
  JUL:7, TEM:7,
  AUG:8, AGU:8,
  SEP:9, EYL:9,
  OCT:10, EKI:10,
  NOV:11, KAS:11,
  DEC:12, ARA:12,
};

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   DESIGN SYSTEM â€” one consistent CSS layer for the whole site
   â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */


/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   COMPONENTS
   â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   STARFIELD CANVAS â€” saÄŸ ve sol kenar hareketli yÄ±ldÄ±zlar
   â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */


function Navigation({ scrolled, activeLang, activeSection, setActiveLang, copy }) {
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const langMenuRef = useRef(null);
  const mobileMenuRef = useRef(null);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (!langMenuRef.current?.contains(event.target)) {
        setLangMenuOpen(false);
      }
      if (!mobileMenuRef.current?.contains(event.target)) {
        setMobileMenuOpen(false);
      }
    };

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setLangMenuOpen(false);
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen]);

  const links = [
    ["#matches",   copy.nav.links.results],
    ["#standings", copy.nav.links.table],
    ["#fixtures",  copy.nav.links.fixtures],
    ["#squad",     copy.nav.links.squad],
    ["#sponsors",  copy.nav.links.partners],
    ["#broadcast", copy.nav.links.watch],
  ];
  return (
    <nav className={`nav${scrolled ? " scrolled" : ""}`} aria-label={activeLang === "TR" ? "Ana menü" : "Main navigation"}>
      <div className="nav-left">
        <a href="#top" className="nav-logo" aria-label="ALTAIR eSports">
          <img src="/logo-ui.png" alt="" aria-hidden="true" className="nav-logo-img" width="256" height="256" decoding="async" />
          <div className="nav-wm">
            <span className="nav-wm-top">ALTAIR</span>
            <span className="nav-wm-sub">FC 26 · Pro Clubs</span>
          </div>
        </a>
      </div>
      <ul className="nav-links">
        {links.map(([href, label]) => (
          <li key={href}>
            <a
              href={href}
              className={activeSection === href.slice(1) ? "active" : undefined}
              aria-current={activeSection === href.slice(1) ? "location" : undefined}
            >
              {label}
            </a>
          </li>
        ))}
      </ul>
      <div className="nav-right">
        <a href="#broadcast" className="nav-cta">{copy.nav.cta}</a>
        <div className="nav-menu" ref={mobileMenuRef}>
          <button
            type="button"
            className={`nav-menu-toggle${mobileMenuOpen ? " active" : ""}`}
            aria-label={mobileMenuOpen ? copy.nav.menuClose : copy.nav.menu}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
            onClick={() => {
              setMobileMenuOpen((open) => !open);
              setLangMenuOpen(false);
            }}
          >
            <span/>
            <span/>
          </button>
          {mobileMenuOpen && (
            <div className="nav-mobile-panel" id="mobile-navigation">
              <div className="nav-mobile-head">{copy.nav.menu}</div>
              <ul className="nav-mobile-links">
                {links.map(([href, label]) => (
                  <li key={href}>
                    <a
                      href={href}
                      className={activeSection === href.slice(1) ? "active" : undefined}
                      aria-current={activeSection === href.slice(1) ? "location" : undefined}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {label}
                    </a>
                  </li>
                ))}
                <li>
                  <a href="#broadcast" className="nav-mobile-primary" onClick={() => setMobileMenuOpen(false)}>{copy.nav.cta}</a>
                </li>
              </ul>
            </div>
          )}
        </div>
        <div className="nav-lang" ref={langMenuRef}>
          <button
            className={`nav-burger${langMenuOpen ? " active" : ""}`}
            aria-label={copy.nav.langHead}
            aria-expanded={langMenuOpen}
            aria-haspopup="menu"
            onClick={() => {
              setLangMenuOpen((open) => !open);
              setMobileMenuOpen(false);
            }}
          >
            <span className="nav-lang-trigger-main">
              <span className="nav-lang-trigger-label">Lang</span>
              <span className="nav-lang-trigger-value">{activeLang === "TR" ? "Türkçe" : "English"}</span>
            </span>
            <span className="nav-lang-trigger-icon" aria-hidden="true">
              <span className="nav-lang-trigger-dot"/>
              <span>{activeLang}</span>
              <span className="nav-lang-trigger-caret">v</span>
            </span>
          </button>
          {langMenuOpen && (
            <div className="nav-lang-panel" role="menu" aria-label="Language options">
              <div className="nav-lang-head">
                <span>{copy.nav.langHead}</span>
                <span className="nav-lang-live">{activeLang}</span>
              </div>
              <div className="nav-lang-list">
                {LANG_OPTIONS.map((option) => (
                  <button
                    key={option.code}
                    className={`nav-lang-option${activeLang === option.code ? " active" : ""}`}
                    role="menuitemradio"
                    aria-checked={activeLang === option.code}
                    onClick={() => {
                      setActiveLang(option.code);
                      setLangMenuOpen(false);
                    }}
                  >
                    <span className="nav-lang-main">
                      <span className="nav-lang-code">{option.code}</span>
                      <span className="nav-lang-label">{option.label}</span>
                      <span className="nav-lang-note">{option.note}</span>
                    </span>
                    <span className="nav-lang-check" aria-hidden="true"/>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}


function Hero({ copy, lang }) {
  const motto = lang === "TR"
    ? [
        { emphasis: "BİRLİKTE", continuation: "oynar," },
        { emphasis: "BİRLİKTE", continuation: "kazanırız." },
      ]
    : [
        { emphasis: "TOGETHER", continuation: "we play," },
        { emphasis: "TOGETHER", continuation: "we win." },
      ];

  return (
    <section className={`hero${lang === "TR" ? " hero--tr" : ""}`} id="top">
      <img
        src="/hero-summer.webp"
        alt=""
        aria-hidden="true"
        className="hero-scene-image"
        fetchPriority="high"
        decoding="async"
      />
      <div className="hero-scene-overlay"/>

      <div className="hero-left">
        <h1 className="hero-h1 hero-h1--motto">
          {motto.map((line) => (
            <span className="motto-line" key={line.continuation}>
              <strong>{line.emphasis}</strong> {line.continuation}
            </span>
          ))}
        </h1>

        <div className="hero-ctas">
          <a href="https://www.twitch.tv/altairespor" target="_blank" rel="noopener noreferrer" className="btn btn-primary">
            {copy.hero.primary} <span className="btn-arrow">›</span>
          </a>
          <a href="#squad" className="btn btn-secondary">
            {copy.hero.secondary}
          </a>
        </div>
      </div>

      <div className="hero-logo-3d">
        <img
          src="/logo-3d.webp"
          alt={lang === "TR" ? "ALTAIR eSports 3D arması" : "ALTAIR eSports 3D crest"}
          className="hero-logo-3d-image"
          decoding="async"
        />
      </div>

    </section>
  );
}

function formatTickerResult(result, lang) {
  if (lang !== "TR") return result;
  return { W:"G", D:"B", L:"M" }[result] || result;
}

function getTickerOpponent(match) {
  if (!match) return null;
  return match.home === "ALTAIR eSports" ? match.away : match.home;
}

function Ticker({ lang, copy, results = [], fixtures = [] }) {
  const tickerResults = (results.length ? results : RESULTS_FALLBACK).map((match) => localizeDisplayMatch(match, lang));
  const latestResult = tickerResults[0];
  const nextMatch = (fixtures.length ? fixtures : FIXTURES_FALLBACK)
    .map((match) => localizeDisplayMatch(match, lang))[0];
  const form = tickerResults.map((r) => formatTickerResult(r.result, lang)).filter(Boolean);
  const formText = form.length
    ? `${lang === "TR" ? "GÜNCEL FORM" : "CURRENT FORM"} · ${form.join(" · ")}`
    : copy.ticker.form;
  const nextOpponent = getTickerOpponent(nextMatch);
  const nextText = nextOpponent
    ? `${lang === "TR" ? "SIRADAKİ MAÇ" : "NEXT UP"} · ${nextOpponent}${nextMatch?.matchday ? ` · ${nextMatch.matchday}` : ""}`
    : copy.ticker.next;
  const items = [
    ...(latestResult ? [{ type:"result", r:latestResult }] : []),
    { type:"meta", kind:"next", text:nextText },
    { type:"meta", kind:"form", text:formText },
    { type:"meta", kind:"broadcast", text:copy.ticker.live },
  ];

  const loop = [...items, ...items, ...items, ...items];

  return (
    <div className="ticker" aria-label={copy.ticker.aria}>
      <span className="sr-only">{nextText}. {formText}.</span>
      <div className="ticker-tag">
        <span className="ticker-tag-dot"/>
        {copy.ticker.tag}
      </div>
      <div className="ticker-body" aria-hidden="true">
        <div className="ticker-track">
          {loop.map((it, i) => {
            if (it.type === "meta") {
              return (
                <div key={i} className={`ticker-item ticker-item--${it.kind}`}>
                  <span className="ticker-meta">{it.text}</span>
                </div>
              );
            }
            const r = it.r;
            const homeMe = r.home === "ALTAIR eSports";
            const awayMe = r.away === "ALTAIR eSports";
            return (
              <div key={i} className="ticker-item ticker-item--match">
                <div className={`ticker-result ${r.result.toLowerCase()}`}>{r.result}</div>
                <span className={`t-team ${homeMe ? "me" : ""}`}>{r.homeAbbr}</span>
                <span className="t-score">{r.hs} - {r.as}</span>
                <span className={`t-team ${awayMe ? "me" : ""}`}>{r.awayAbbr}</span>
                <span className="ticker-meta">· {r.matchday}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ClubUpdates({ lang, copy, fixtures = [], squadCount }) {
  const nextMatch = localizeDisplayMatch(
    (fixtures.length ? fixtures : FIXTURES_FALLBACK)[0],
    lang,
  );
  const opponent = getTickerOpponent(nextMatch);
  const cards = [
    {
      key:"match",
      label:copy.updates.nextLabel,
      title:opponent || (lang === "TR" ? "Fikstür güncelleniyor" : "Fixture updating"),
      meta:nextMatch ? `${nextMatch.date} · ${nextMatch.time} · ${nextMatch.matchday}` : "",
      cta:copy.updates.matchCta,
      href:"#fixtures",
      marker:nextMatch?.day || "—",
    },
    {
      key:"roster",
      label:copy.updates.rosterLabel,
      title:copy.updates.rosterTitle(squadCount),
      meta:copy.updates.rosterMeta,
      cta:copy.updates.rosterCta,
      href:"#squad",
      marker:String(squadCount).padStart(2, "0"),
    },
    {
      key:"broadcast",
      label:copy.updates.broadcastLabel,
      title:copy.updates.broadcastTitle,
      meta:copy.updates.broadcastMeta,
      cta:copy.updates.broadcastCta,
      href:"https://www.twitch.tv/altairespor",
      external:true,
      marker:"LIVE",
    },
  ];

  return (
    <section className="section club-updates" id="updates">
      <div className="container">
        <div className="sec-hdr">
          <div className="sec-hdr-left">
            <div className="sec-eyebrow">{copy.updates.eyebrow}</div>
            <h2 className="sec-title">{copy.updates.title[0]} <span className="accent">{copy.updates.title[1]}</span></h2>
            <p className="sec-sub">{copy.updates.sub}</p>
          </div>
        </div>

        <div className="club-updates-grid">
          {cards.map((card) => (
            <a
              key={card.key}
              className={`club-update-card club-update-card--${card.key}`}
              href={card.href}
              target={card.external ? "_blank" : undefined}
              rel={card.external ? "noopener noreferrer" : undefined}
            >
              <div className="club-update-head">
                <span>{card.label}</span>
                <strong>{card.marker}</strong>
              </div>
              <h3>{card.title}</h3>
              <p>{card.meta}</p>
              <span className="club-update-cta">{card.cta} <span aria-hidden="true">→</span></span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function ClubIdentity({ copy }) {
  return (
    <section className="section identity" id="identity">
      <div className="container">
        <div className="sec-hdr">
          <div className="sec-hdr-left">
            <div className="sec-eyebrow">{copy.identity.eyebrow}</div>
            <h2 className="sec-title">{copy.identity.title[0]} <span className="accent">{copy.identity.title[1]}</span></h2>
            <p className="sec-sub">{copy.identity.sub}</p>
          </div>
          <div className="sec-actions">
            <a className="sec-link" href="#honours">{copy.honours.view} <span className="sec-link-arrow">→</span></a>
          </div>
        </div>

        <div className="identity-editorial">
          <aside className="identity-foundation" aria-label={copy.identity.founded}>
            <span className="identity-foundation-label">{copy.identity.foundedLabel}</span>
            <strong className="identity-foundation-year">2025</strong>
            <span className="identity-foundation-type">{copy.identity.founders}</span>
          </aside>

          <article className="identity-statement">
            <span className="identity-statement-kicker">{copy.identity.cultureLabel}</span>
            <h3 className="identity-statement-title">{copy.identity.storyTitle}</h3>
            <p className="identity-statement-text">{copy.identity.storyText}</p>
            <div className="identity-principle">
              <span className="identity-principle-label">{copy.identity.mottoLabel}</span>
              <span className="identity-principle-text">{copy.identity.motto}</span>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

function Honours({ copy }) {
  return (
    <section className="section honours" id="honours">
      <div className="container">
        <div className="sec-hdr">
          <div className="sec-hdr-left">
            <div className="sec-eyebrow">{copy.honours.eyebrow}</div>
            <h2 className="sec-title">{copy.honours.title[0]} <span className="accent">{copy.honours.title[1]}</span></h2>
            <p className="sec-sub">{copy.honours.sub}</p>
          </div>
        </div>

        <div className="honours-grid">
          {copy.honours.items.map((honour, index) => (
            <article key={`${honour.season}-${honour.competition}`} className="honour-card">
              <div className="honour-card-head">
                <span className="honour-card-index">{String(index + 1).padStart(2, "0")}</span>
                <div className="honour-mark">{honour.mark}</div>
              </div>
              <div className="honour-copy">
                <div className="honour-season">{honour.season}</div>
                <h3 className="honour-competition">{honour.competition}</h3>
                <div className="honour-result">{honour.result}</div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Standings({ lang, copy }) {
  const [seasonKey, setSeasonKey] = useState(DEFAULT_STANDING_SEASON);
  const { standings, allTeams, altairRow, loading, error, lastUpdate, refetch, season } = useStandings(seasonKey);

  const fallback = STANDINGS_BY_SEASON[season.key] || STANDINGS_SUMMER_FALLBACK;
  const alt = altairRow || fallback.find((t) => t.me);
  const kpis = [
    { val: alt?.rank ? `${alt.rank}` : "-", unit: copy.standings.rankUnit, lbl:copy.standings.kpis.position },
    { val: alt?.pts ?? "-", unit:copy.standings.pointUnit, lbl:copy.standings.kpis.points },
    { val: alt?.w ?? "-", unit:copy.standings.winUnit, lbl:copy.standings.kpis.wins },
    { val: alt?.gd ?? "-", unit:"", lbl:copy.standings.kpis.goalDiff },
    { val: alt?.pld ?? "-", unit:copy.standings.playedUnit, lbl:copy.standings.kpis.played },
  ];

  const updatedLabel = lastUpdate
    ? lastUpdate.toLocaleTimeString(lang === "TR" ? "tr-TR" : "en-GB", { hour:"2-digit", minute:"2-digit" })
    : null;

  return (
    <section className="standings" id="standings">
      <div className="st-wrap">
        <div className="st-controlbar">
          <div className="st-topbar">
            <div className="st-topbar-left">
              <span className="st-comp">eMajor League</span>
              <span className="st-sep"/>
              <span className="st-season">{season.label[lang]}</span>
            </div>
            <div className="st-toolbar-actions">
              <span className={`st-sync-meta${error && !loading ? " is-error" : ""}`} aria-live="polite">
                {loading && !season.locked
                  ? copy.standings.updating
                  : error && !season.locked
                    ? copy.standings.cached
                    : updatedLabel || ""}
              </span>
              {!season.locked && (
              <button className="st-refresh-btn" type="button" onClick={refetch} title={copy.standings.refresh} disabled={loading}>
                  ↻ <span>{copy.standings.refresh}</span>
                </button>
              )}
              <div className={`st-live${season.locked ? " st-live--locked" : ""}`}>
                <span className="st-live-dot"/>
                {season.locked ? copy.standings.locked : copy.standings.live}
              </div>
            </div>
          </div>

          <div className="st-season-filter" aria-label={copy.standings.filterLabel}>
            <span className="st-season-filter-label">{copy.standings.filterLabel}</span>
            <div className="st-season-tabs" role="tablist">
              {Object.values(STANDING_SEASONS).map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={`st-season-tab${season.key === item.key ? " active" : ""}`}
                  aria-selected={season.key === item.key}
                  role="tab"
                  onClick={() => setSeasonKey(item.key)}
                >
                  {copy.standings.seasonOptions[item.key]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="st-hero">
          <h2 className="st-hero-title">{copy.standings.title[0]} <em>{copy.standings.title[1]}</em></h2>
          <div className="st-kpis">
            {kpis.map((k, i) => (
              <div key={i} className={`st-kpi${loading ? " st-kpi--loading" : ""}`}>
                <div className="st-kpi-val">
                  <span className="st-kpi-main">{k.val}</span>
                  {k.unit && <span className="st-kpi-unit">{k.unit}</span>}
                </div>
                <div className="st-kpi-lbl">{k.lbl}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="st-table-wrap">
          <div className="st-table-scroll">
            <div className="st-hdr">
              <span className="st-hdr-cell">#</span>
              <span className="st-hdr-cell left">{copy.standings.table.club}</span>
              <span className="st-hdr-cell">P</span>
              <span className="st-hdr-cell">W</span>
              <span className="st-hdr-cell">D</span>
              <span className="st-hdr-cell">L</span>
              <span className="st-hdr-cell">GD</span>
              <span className="st-hdr-cell">{copy.standings.table.form}</span>
              <span className="st-hdr-cell">PTS</span>
            </div>
            {standings.map((s) => (
              <div key={s.abbr + s.rank} className={`st-row${s.me ? " me" : ""}`}>
                <span className="st-rank">{s.rank}</span>
                <div className="st-club">
                  <ClubBadge className={`st-badge${s.me ? " me" : ""}`} isAltair={s.me} label={s.abbr} />
                  <div className="st-club-name">{s.name}</div>
                </div>
                <span className="st-cell">{s.pld}</span>
                <span className="st-cell">{s.w}</span>
                <span className="st-cell">{s.d}</span>
                <span className="st-cell">{s.l}</span>
                <span className={`st-cell ${String(s.gd).startsWith("+") ? "gd-pos" : "gd-neg"}`}>{s.gd}</span>
                <div className="st-form">
                  {String(s.form).split("").map((c, i) => <div key={i} className={`st-form-dot ${c.toLowerCase()}`}/>)}
                </div>
                <span className="st-pts">{s.pts}</span>
              </div>
            ))}
          </div>
          <div className="st-foot">
            <span className="st-foot-note">
              {season.locked ? copy.standings.lockedNote : loading ? copy.standings.loading : error ? copy.standings.cachedPrefix(error) : copy.standings.showing(standings[0]?.rank, standings[standings.length-1]?.rank, allTeams.length)}
            </span>
            <a className="st-foot-link" href={season.url} target="_blank" rel="noopener noreferrer">{copy.standings.full}</a>
          </div>
        </div>
      </div>
    </section>
  );
}

function ResultCard({ r, lang, copy }) {
  const localized = localizeDisplayMatch(r, lang);
  const homeMe = localized.home === "ALTAIR eSports";
  const awayMe = localized.away === "ALTAIR eSports";
  const cls = localized.result.toLowerCase();
  const label = copy.results.labels[localized.result] || localized.result;

  return (
    <div className={`res-card ${cls}`}>
      <div className="res-desk">
        <div className="res-meta">
          <div className="res-gw">{localized.matchday}</div>
          <div className="res-comp">{localized.competition}</div>
          <div className="res-date">{localized.date}</div>
        </div>
        <div className="res-team home">
          <div className="res-team-info">
            <div className="res-name">{localized.home}</div>
            <div className="res-venue">{homeMe ? copy.results.venue.home : ""}</div>
          </div>
          <ClubBadge className={`res-badge ${homeMe ? "me" : ""}`} isAltair={homeMe} label={localized.homeAbbr} />
        </div>
        <div className="res-score">
          <span className="res-score-val">{localized.hs}</span>
          <span className="res-score-sep">-</span>
          <span className="res-score-val">{localized.as}</span>
        </div>
        <div className="res-team away">
          <ClubBadge className={`res-badge ${awayMe ? "me" : ""}`} isAltair={awayMe} label={localized.awayAbbr} />
          <div className="res-team-info">
            <div className="res-name">{localized.away}</div>
            <div className="res-venue">{awayMe ? copy.results.venue.away : ""}</div>
          </div>
        </div>
        <div className="res-pill-col">
          <div className={`res-pill ${cls}`}>
            <span className="res-pill-dot"/>
            {label}
          </div>
        </div>
      </div>

      <div className="res-mob">
        <div className="res-mob-top">
          <div className="res-gw">{localized.matchday}</div>
          <div className="res-date">{localized.date}</div>
        </div>
        <div className="res-mob-teams">
          <div className="res-mob-team home">
            <ClubBadge className={`res-badge ${homeMe ? "me" : ""}`} isAltair={homeMe} label={localized.homeAbbr} />
            <div className="res-mob-name">{localized.home}</div>
          </div>
          <div className="res-mob-score">
            <span>{localized.hs}</span>
            <span className="res-mob-sep">-</span>
            <span>{localized.as}</span>
          </div>
          <div className="res-mob-team away">
            <ClubBadge className={`res-badge ${awayMe ? "me" : ""}`} isAltair={awayMe} label={localized.awayAbbr} />
            <div className="res-mob-name">{localized.away}</div>
          </div>
        </div>
        <div className="res-mob-foot">
          <div className={`res-pill ${cls}`}>
            <span className="res-pill-dot"/>
            {label}
          </div>
        </div>
      </div>
    </div>
  );
}

function Results({ lang, copy, loading, results=[], error, lastUpdate, refetch }) {
  const data = (results.length ? results : RESULTS_FALLBACK).map((match) => localizeDisplayMatch(match, lang));
  const updateLabel = lastUpdate
    ? `${copy.fixtures.updated} · ${lastUpdate.toLocaleTimeString(lang === "TR" ? "tr-TR" : "en-GB", { hour:"2-digit", minute:"2-digit" })}`
    : null;

  return (
    <section className="section" id="matches">
      <div className="container">
        <div className="sec-hdr">
          <div className="sec-hdr-left">
            <div className="sec-eyebrow">{copy.results.eyebrow}</div>
            <h2 className="sec-title">{copy.results.title[0]} <span className="accent">{copy.results.title[1]}</span></h2>
            <p className="sec-sub">{loading ? copy.results.subLoading : copy.results.sub}</p>
          </div>
          <div className="sec-actions">
            {error && <span className="match-data-status">{copy.results.cached}</span>}
            {updateLabel && !loading && <time className="match-data-update">{updateLabel}</time>}
            <button className="match-refresh-btn" type="button" onClick={refetch} title={copy.standings.refresh} disabled={loading}>
              ↻ {copy.standings.refresh}
            </button>
            <a className="sec-link" href="#fixtures">{copy.results.viewFixtures} <span className="sec-link-arrow">→</span></a>
          </div>
        </div>
        <div className="results-grid">
          {data.map((r) => <ResultCard key={r.id} r={r} lang={lang} copy={copy}/>)}
        </div>
      </div>
    </section>
  );
}

function FixtureCard({ f, lang, copy }) {
  const localized = localizeDisplayMatch(f, lang);
  const homeMe = localized.home === "ALTAIR eSports";
  const awayMe = localized.away === "ALTAIR eSports";
  const venue = homeMe ? copy.fixtures.venue.home : copy.fixtures.venue.away;
  return (
    <div className="fix-card">
      <div className="fix-date">
        <span className="fix-day">{localized.day}</span>
        <span className="fix-month">{localized.month}</span>
        <span className="fix-gw">{localized.matchday}</span>
      </div>
      <div className="fix-divider"/>
      <div className="fix-match">
        <div className="fix-team home">
          <span className="fix-team-name">{localized.home}</span>
          <ClubBadge className={`fix-badge ${homeMe ? "me" : ""}`} isAltair={homeMe} label={localized.homeAbbr} />
        </div>
        <div className="fix-vs">
          <span className="fix-vs-line"/>
          <span className="fix-vs-text">{copy.fixtures.vs}</span>
        </div>
        <div className="fix-team away">
          <ClubBadge className={`fix-badge ${awayMe ? "me" : ""}`} isAltair={awayMe} label={localized.awayAbbr} />
          <span className="fix-team-name">{localized.away}</span>
        </div>
      </div>
      <div className="fix-divider"/>
      <div className="fix-meta">
        <span className="fix-time">{localized.time}</span>
        <span className="fix-tz">UTC+3</span>
        <span className={`fix-venue ${(homeMe ? "home" : "away")}`}>{venue}</span>
      </div>
    </div>
  );
}

function Fixtures({ lang, copy, loading, fixtures=[], error, lastUpdate, refetch }) {
  const data = (fixtures.length ? fixtures : FIXTURES_FALLBACK).map((match) => localizeDisplayMatch(match, lang));
  const nextMatch = data[0];
  const nextHomeMe = nextMatch?.home === "ALTAIR eSports";
  const nextOpponent = nextMatch ? (nextHomeMe ? nextMatch.away : nextMatch.home) : "";
  const updateLabel = lastUpdate
    ? `${copy.fixtures.updated} · ${lastUpdate.toLocaleTimeString(lang === "TR" ? "tr-TR" : "en-GB", { hour:"2-digit", minute:"2-digit" })}`
    : null;

  return (
    <section className="section section-compact" id="fixtures">
      <div className="container">
        <div className="sec-hdr">
          <div className="sec-hdr-left">
            <div className="sec-eyebrow">{copy.fixtures.eyebrow}</div>
            <h2 className="sec-title">{copy.fixtures.title[0]} <span className="accent">{copy.fixtures.title[1]}</span></h2>
            <p className="sec-sub">{loading ? copy.fixtures.subLoading : copy.fixtures.sub}</p>
          </div>
          <div className="sec-actions">
            {error && <span className="match-data-status">{copy.fixtures.cached}</span>}
            {updateLabel && !loading && <time className="match-data-update">{updateLabel}</time>}
            <button className="match-refresh-btn" type="button" onClick={refetch} title={copy.standings.refresh} disabled={loading}>
              ↻ {copy.standings.refresh}
            </button>
            <a className="sec-link" href="https://www.twitch.tv/altairespor" target="_blank" rel="noopener noreferrer">
              {copy.fixtures.watch} <span className="sec-link-arrow">→</span>
            </a>
          </div>
        </div>
        {nextMatch && (
          <article className="fixture-spotlight">
            <div className="fixture-spotlight-copy">
              <span>{copy.fixtures.spotlight}</span>
              <h3>ALTAIR <strong>VS</strong> {nextOpponent}</h3>
              <p>{nextMatch.competition} · {nextMatch.matchday}</p>
            </div>
            <div className="fixture-spotlight-date">
              <strong>{nextMatch.day}</strong>
              <span>{nextMatch.month}</span>
            </div>
            <div className="fixture-spotlight-time">
              <span>{copy.fixtures.matchCenter}</span>
              <strong>{nextMatch.time}</strong>
              <small>UTC+3</small>
            </div>
            <a href="https://www.twitch.tv/altairespor" target="_blank" rel="noopener noreferrer">
              {copy.fixtures.watch} <span aria-hidden="true">→</span>
            </a>
          </article>
        )}
        <div className="fix-grid">
          {data.map((f) => <FixtureCard key={f.id} f={f} lang={lang} copy={copy}/>)}
        </div>
      </div>
    </section>
  );
}

function PlayerCard({ p, copy }) {
  const profileLabel = `${copy.squad.profile}: ${p.ign}`;
  const cardContent = (
    <>
      <div className={`p-top${p.image ? " p-top--photo" : " p-top--initials"}`}>
        <div className="p-pos">{p.pos}</div>
        <div className="p-flag" aria-hidden="true">{p.flag}</div>
        <div className="p-number" aria-hidden="true">{p.number}</div>
        <div className="p-media">
          {p.image
            ? <img src={p.image} alt={`${p.name} (${p.ign})`} className="p-avatar-img" loading="lazy" decoding="async"/>
            : (
              <div className="p-avatar" aria-hidden="true">
                <span>{p.init}</span>
                <small>ALTAIR</small>
              </div>
            )}
        </div>
      </div>
      <div className="p-body">
        <div className="p-kicker">{p.number ? `#${p.number}` : "ALTAIR"} · {p.pos}</div>
        <div className="p-ign">{p.ign}</div>
        <div className="p-name">{p.name}</div>
        <div className="p-stats">
          <div className="p-stat">
            <div className="p-stat-val">{p.apps ?? "—"}</div>
            <div className="p-stat-lbl">{copy.squad.stats.apps}</div>
          </div>
          <div className="p-stat">
            <div className="p-stat-val">{p.goals ?? "—"}</div>
            <div className="p-stat-lbl">{copy.squad.stats.goals}</div>
          </div>
          <div className="p-stat">
            <div className="p-stat-val">{p.assists ?? "—"}</div>
            <div className="p-stat-lbl">{copy.squad.stats.assists}</div>
          </div>
        </div>
        <div className="p-profile">
          <span>{copy.squad.profile}</span>
          <span aria-hidden="true">↗</span>
        </div>
      </div>
    </>
  );

  if (!p.profileUrl) {
    return <article className="p-card p-card--static">{cardContent}</article>;
  }

  return (
    <a href={p.profileUrl} target="_blank" rel="noopener noreferrer" className="p-card" aria-label={profileLabel}>
      {cardContent}
    </a>
  );
}

function Squad({ lang, copy, squadData }) {
  const { squad, loading, error, lastUpdate, refetch } = squadData;
  const [activeGroup, setActiveGroup] = useState("all");
  const filters = ["all", "Goalkeepers", "Defenders", "Midfielders", "Forwards"];
  const visibleSquad = activeGroup === "all" ? squad : squad.filter((group) => group.group === activeGroup);
  const total = squad.reduce((n, g) => n + g.players.length, 0);
  const rosterLabel = lang === "TR" ? "FC 26 · KADRO LİSTESİ" : "FC 26 · TEAM LIST";
  const playerLabel = lang === "TR" ? "OYUNCU" : "PLAYERS";
  const statsLabel = loading
    ? (lang === "TR" ? "EML KADROSU GÜNCELLENİYOR" : "UPDATING EML ROSTER")
    : (lang === "TR" ? "EML İLE SENKRONİZE" : "SYNCED WITH EML");
  const updatedLabel = lastUpdate
    ? lastUpdate.toLocaleTimeString(lang === "TR" ? "tr-TR" : "en-GB", { hour:"2-digit", minute:"2-digit" })
    : null;

  return (
    <section className="section squad" id="squad">
      <div className="container">
        <div className="sec-hdr">
          <div className="sec-hdr-left">
            <div className="sec-eyebrow">{copy.squad.eyebrow}</div>
            <h2 className="sec-title">{copy.squad.title[0]} <span className="accent">{copy.squad.title[1]}</span></h2>
            <p className="sec-sub">{loading ? copy.squad.subLoading : copy.squad.sub}</p>
          </div>
        </div>

        <div className="squad-summary" aria-label={copy.squad.eyebrow}>
          <div className="squad-summary-main">
            <span>{rosterLabel}</span>
            <div>
              <strong>{total}</strong>
              <small>{playerLabel}</small>
            </div>
          </div>
          {squad.map((group) => (
            <div className="squad-summary-stat" key={group.group}>
              <span>{group.abbr}</span>
              <strong>{group.players.length}</strong>
              <small>{copy.squad.groups[group.group] || group.group}</small>
            </div>
          ))}
        </div>

        <div className="squad-toolbar">
          <div className="squad-filter" aria-label={copy.squad.eyebrow}>
            {filters.map((filter) => (
              <button
                key={filter}
                type="button"
                className={`squad-filter-btn${activeGroup === filter ? " active" : ""}`}
                onClick={() => setActiveGroup(filter)}
                aria-pressed={activeGroup === filter}
              >
                {copy.squad.filters[filter]}
              </button>
            ))}
          </div>
          <div className="squad-live" aria-live="polite" aria-busy={loading}>
            <span className={`squad-live-dot${loading ? " loading" : ""}`} aria-hidden="true"/>
            <span>{error ? copy.squad.cached : statsLabel}</span>
            {updatedLabel && !loading && <time>{updatedLabel}</time>}
            <button className="squad-refresh" type="button" onClick={refetch} title={copy.standings.refresh} disabled={loading}>
              ↻ <span>{copy.standings.refresh}</span>
            </button>
          </div>
        </div>

        {visibleSquad.map((g, gi) => (
          <div key={gi} className="pos-section">
            <div className="pos-label">
              <span className="pos-pill">{g.abbr}</span>
              <span className="pos-group-name">{copy.squad.groups[g.group] || g.group}</span>
              <span className="pos-count">{copy.squad.count(g.players.length)}</span>
            </div>
            <div className="squad-grid">
              {g.players.map((p, pi) => <PlayerCard key={pi} p={p} copy={copy}/>) }
            </div>
          </div>
        ))}

        <div className="squad-cta">
          <span>{copy.squad.cta}</span>
          <a href="#broadcast">{lang === "TR" ? "İletişim" : "Contact"}</a>
        </div>
      </div>
    </section>
  );
}

function BackToTop({ visible, lang }) {
  const label = lang === "TR" ? "Sayfanın başına dön" : "Back to top";

  const scrollToTop = () => {
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top:0, behavior:reduceMotion ? "auto" : "smooth" });
  };

  return (
    <button
      className={`back-to-top${visible ? " visible" : ""}`}
      type="button"
      aria-label={label}
      title={label}
      tabIndex={visible ? 0 : -1}
      onClick={scrollToTop}
    >
      <span className="back-to-top-arrow" aria-hidden="true">↑</span>
    </button>
  );
}

export default function AltairFC() {
  const [scrolled, setScrolled] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [activeSection, setActiveSection] = useState("");
  const [activeLang, setActiveLang] = useState("TR");
  const fixtureData = useFixtures();
  const squadData = useSquadStats();
  const squadCount = squadData.squad.reduce((total, group) => total + group.players.length, 0);
  const copy = UI_COPY[activeLang] || UI_COPY.EN;

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 32);
      setShowBackToTop(window.scrollY > 720);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.documentElement.lang = activeLang === "TR" ? "tr" : "en";
  }, [activeLang]);

  useEffect(() => {
    const sectionIds = ["matches", "standings", "fixtures", "squad", "sponsors", "broadcast"];
    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    if (!sections.length || !("IntersectionObserver" in window)) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];
        if (visible?.target?.id) setActiveSection(visible.target.id);
      },
      {
        rootMargin:"-22% 0px -58% 0px",
        threshold:[0, 0.05, 0.2, 0.5, 0.8],
      },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <a className="skip-link" href="#main-content">{activeLang === "TR" ? "İçeriğe geç" : "Skip to content"}</a>
      <div className={`site site--${activeLang.toLowerCase()}`}>
        <Navigation scrolled={scrolled} activeLang={activeLang} activeSection={activeSection} setActiveLang={setActiveLang} copy={copy}/>
        <main id="main-content" tabIndex="-1">
          <Hero copy={copy} lang={activeLang}/>
          <Ticker lang={activeLang} copy={copy} results={fixtureData.results} fixtures={fixtureData.fixtures}/>
          <ClubIdentity copy={copy}/>
          <Honours copy={copy}/>
          <ClubUpdates lang={activeLang} copy={copy} fixtures={fixtureData.fixtures} squadCount={squadCount}/>
          <Standings lang={activeLang} copy={copy}/>
          <Results {...fixtureData} lang={activeLang} copy={copy}/>
          <Fixtures {...fixtureData} lang={activeLang} copy={copy}/>
          <Squad lang={activeLang} copy={copy} squadData={squadData}/>
          <PartnershipSection copy={copy}/>
          <SocialHub copy={copy}/>
        </main>
        <BackToTop visible={showBackToTop} lang={activeLang}/>
        <SiteFooter
          copy={copy}
          competitionUrl={STANDING_SEASONS.summer.url}
          competitionLabel={STANDING_SEASONS.summer.label[activeLang]}
        />
      </div>
    </>
  );
}

