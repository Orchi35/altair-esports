import { useState, useEffect, useRef } from "react";

/* useStandings - inline hook for EML standings */

const CACHE_MAX  = 24 * 60 * 60 * 1000;  // 24 saat
const FRIDAY_TTL = 60 * 60 * 1000;       // Cuma günü 1 saat

const STANDING_SEASONS = {
  s2: {
    key: "s2",
    tournamentId: 39,
    locked: true,
    url: "https://emajorleague.com/tournaments/league_table/39/",
    label: { EN:"EML FC26 S2", TR:"EML FC26 S2" },
  },
  summer: {
    key: "summer",
    tournamentId: 42,
    locked: false,
    url: "https://emajorleague.com/tournaments/league_table/42/",
    label: { EN:"EML FC26 Summer League", TR:"EML FC26 Yaz Ligi" },
  },
};
const DEFAULT_STANDING_SEASON = "summer";

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
        if (!cancelled) { setError(err.message); setAllTeams(fallback); }
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

const FIX_CACHE_KEY  = "altair_fixtures_v9";
const FIX_CACHE_MAX  = 24 * 60 * 60 * 1000;  // 24 saat
const FIX_FRIDAY_TTL = 60 * 60 * 1000;       // Cuma günü 1 saat
const TOTAL_MATCHDAYS = 13;
const TOURNAMENT_ID   = 42;
// ALTAIR'in oynadığı bilinen yeni sezon matchday'leri; gereksiz istekleri azaltır.
const ALTAIR_MATCHDAYS = [1,2,3,4,5,6,7,8,9,10,11,12,13];
const ALTAIR_NAME     = "altair esports";
const COMPETITION     = "EML FC26 Summer League";

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
  return lang === "TR" ? "EML FC26 Yaz Ligi" : "EML FC26 Summer League";
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
    if (Date.now() - ts < ttl) return data;
  } catch { /**/ }
  return null;
}
function writeFixCache(data) {
  try { localStorage.setItem(FIX_CACHE_KEY, JSON.stringify({ ts: Date.now(), data })); }
  catch { /**/ }
}

function useFixtures() {
  const [allMatches,  setAllMatches]  = useState(null);
  const [fixturesLoading, setFixturesLoading] = useState(true);
  const [error,       setError]       = useState(null);
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
          setAllMatches(cached.map(normalizeFixtureMatch));
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

        if (!cancelled) {
          if (results.length) {
            const normalizedResults = results.map(normalizeFixtureMatch);
            writeFixCache(normalizedResults);
            setAllMatches(normalizedResults);
          } else {
            // HiÃ§ veri gelmediyse fallback
            if (!hasExistingData) setAllMatches([]);
          }
          setFixturesLoading(false);
        }
      } catch (err) {
        console.warn("[useFixtures]", err.message);
        if (!cancelled) {
          setError(err.message);
          if (!hasExistingData) setAllMatches([]);
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
    results:  withResult.slice(-5).reverse(),   // son 5 maÃ§, yeniden eskiye
    fixtures: upcoming.slice(0, 4),             // sonraki 4 maÃ§
    refetch,
  };
}

function ClubBadge({ className, isAltair, label }) {
  return (
    <div className={className}>
      {isAltair ? (
        <img src="/logo-ui.png" alt="" aria-hidden="true" className="club-badge-logo" />
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
  { id:10.1, date:"31 July 2026", matchday:"GW 10", competition:"EML FC26 Summer League", home:"Liderpool FC", homeAbbr:"LID", away:"ALTAIR eSports", awayAbbr:"ALT", hs:0, as:2, result:"W", venue:"Away" },
  { id:6.1,  date:"17 July 2026", matchday:"GW 6",  competition:"EML FC26 Summer League", home:"Glarung FC", homeAbbr:"GLA", away:"ALTAIR eSports", awayAbbr:"ALT", hs:2, as:0, result:"L", venue:"Away" },
  { id:5.1,  date:"17 July 2026", matchday:"GW 5",  competition:"EML FC26 Summer League", home:"ALTAIR eSports", homeAbbr:"ALT", away:"B2B SK", awayAbbr:"B2B", hs:2, as:4, result:"L", venue:"Home" },
  { id:4.1,  date:"10 July 2026", matchday:"GW 4",  competition:"EML FC26 Summer League", home:"ALTAIR eSports", homeAbbr:"ALT", away:"In Flame", awayAbbr:"INF", hs:2, as:3, result:"L", venue:"Home" },
  { id:3.1,  date:"10 July 2026", matchday:"GW 3",  competition:"EML FC26 Summer League", home:"invictus x", homeAbbr:"INV", away:"ALTAIR eSports", awayAbbr:"ALT", hs:1, as:1, result:"D", venue:"Away" },
];

const FIXTURES_FALLBACK = [
  { id:9.1,  date:"31 July 2026", day:"31", month:"JUL", time:"22:30", matchday:"GW 9",  competition:"EML FC26 Summer League", home:"ALTAIR eSports", homeAbbr:"ALT", away:"FC BIG BANG", awayAbbr:"FCB", venue:"Home" },
  { id:11.1, date:"07 August 2026", day:"07", month:"AUG", time:"22:30", matchday:"GW 11", competition:"EML FC26 Summer League", home:"Saray Bahçe eSpor", homeAbbr:"SAR", away:"ALTAIR eSports", awayAbbr:"ALT", venue:"Away" },
  { id:12.1, date:"07 August 2026", day:"07", month:"AUG", time:"23:00", matchday:"GW 12", competition:"EML FC26 Summer League", home:"ALTAIR eSports", homeAbbr:"ALT", away:"Shelter FC", awayAbbr:"SHE", venue:"Home" },
  { id:13.1, date:"14 August 2026", day:"14", month:"AUG", time:"22:30", matchday:"GW 13", competition:"EML FC26 Summer League", home:"ALTAIR eSports", homeAbbr:"ALT", away:"Papatya SK", awayAbbr:"PAP", venue:"Home" },
];

const SQUAD_CACHE_KEY = "altair_squad_stats_v1";
const SQUAD_CACHE_MAX = 15 * 60 * 1000;
const SQUAD_POLL_MS = 60 * 1000;
const TEAM_PAGE_PATH = "/team/ALTAIReSports/";
const SQUAD_ROUTE_RE = /href=["']([^"'#?]*\/teams\/team\/\d+\/\d+\/\d+\/squad[^"'#?]*)["']/gi;

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

function findBestSquadStatsTable(html, playerKeys) {
  const tables = html.match(/<table\b[\s\S]*?<\/table>/gi) || [];
  let bestTable = null;
  let bestScore = 0;

  for (const tableHtml of tables) {
    const cells = [...tableHtml.matchAll(/<t[dh]\b[\s\S]*?<\/t[dh]>/gi)].map((match) => stripHtmlTags(match[0]));
    const score = cells.reduce((count, cell) => count + (playerKeys.has(canonicalizeIgn(cell)) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      bestTable = tableHtml;
    }
  }

  return bestScore > 0 ? bestTable : null;
}

function parseSquadStatsTable(tableHtml, playerKeys) {
  const statsByIgn = new Map();
  const rowMatches = tableHtml.match(/<tr\b[\s\S]*?<\/tr>/gi) || [];

  for (const rowHtml of rowMatches) {
    const cells = [...rowHtml.matchAll(/<t[dh]\b[\s\S]*?<\/t[dh]>/gi)].map((match) => stripHtmlTags(match[0]));
    if (cells.length < 4) continue;

    const ignIndex = cells.findIndex((cell) => playerKeys.has(canonicalizeIgn(cell)));
    if (ignIndex === -1) continue;

    const numericCells = cells
      .slice(ignIndex + 1)
      .map((cell) => {
        const normalized = cell.replace(",", ".").trim();
        return /^\d+(\.\d+)?$/.test(normalized) ? Number(normalized) : null;
      })
      .filter((value) => value !== null);

    if (numericCells.length < 3) continue;

    statsByIgn.set(canonicalizeIgn(cells[ignIndex]), {
      apps: Number(numericCells[0]),
      goals: Number(numericCells[1]),
      assists: Number(numericCells[2]),
    });
  }

  return statsByIgn;
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

function applyLiveStatsToSquad(baseSquad, statsByIgn) {
  return baseSquad.map((group) => ({
    ...group,
    players: group.players.map((player) => {
      const stats = statsByIgn.get(canonicalizeIgn(player.ign));
      return stats ? { ...player, ...stats } : player;
    }),
  }));
}

function readSquadCache() {
  try {
    const raw = localStorage.getItem(SQUAD_CACHE_KEY);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts < SQUAD_CACHE_MAX) {
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
        const teamRes = await fetch(`/api/eml-proxy?path=${encodeURIComponent(TEAM_PAGE_PATH)}`, { cache:"no-store" });
        if (!teamRes.ok) throw new Error(`HTTP ${teamRes.status}`);
        const teamHtml = await teamRes.text();

        let tableHtml = findBestSquadStatsTable(
          teamHtml,
          new Set(SQUAD.flatMap((group) => group.players.map((player) => canonicalizeIgn(player.ign))).filter(Boolean)),
        );

        if (!tableHtml) {
          const squadPath = resolveSquadStatsPath(teamHtml);
          if (!squadPath) throw new Error("Squad page not found");
          const squadRes = await fetch(`/api/eml-proxy?path=${encodeURIComponent(squadPath)}`, { cache:"no-store" });
          if (!squadRes.ok) throw new Error(`HTTP ${squadRes.status}`);
          const squadHtml = await squadRes.text();
          tableHtml = findBestSquadStatsTable(
            squadHtml,
            new Set(SQUAD.flatMap((group) => group.players.map((player) => canonicalizeIgn(player.ign))).filter(Boolean)),
          );
        }

        if (!tableHtml) throw new Error("Squad stats table not found");

        const statsByIgn = parseSquadStatsTable(
          tableHtml,
          new Set(SQUAD.flatMap((group) => group.players.map((player) => canonicalizeIgn(player.ign))).filter(Boolean)),
        );
        if (!statsByIgn.size) throw new Error("No matching squad stats parsed");

        const liveSquad = applyLiveStatsToSquad(SQUAD, statsByIgn);
        writeSquadCache(liveSquad);

        if (!cancelled) {
          setSquad(liveSquad);
          setLastUpdate(new Date());
        }
      } catch (err) {
        console.warn("[useSquadStats]", err.message);
        if (!cancelled) {
          setError(err.message);
          setSquad(SQUAD);
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

const SQUAD = [
  { group:"Goalkeepers", abbr:"GK", players:[
    { number:"1",  name:"MEHMETCAN BABAT",   ign:"mcb06099",     pos:"GK",  role:"Goalkeeper",       flag:"🇹🇷", init:"MB",  apps:0, goals:0, assists:0, captain:false, profileUrl:"https://emajorleague.com/players/profile/6666/", image:"public/players/mcb06099.webp" },
  ]},
  { group:"Defenders", abbr:"DEF", players:[
    { number:"5",  name:"AYBERK ÖZTÜRK",      ign:"LethalGullit", pos:"CB",  role:"Centre-Back",      flag:"🇹🇷", init:"AÖ",  apps:2, goals:0, assists:0, captain:false, profileUrl:"https://emajorleague.com/players/profile/8829/", image:"public/players/LethalGullit.jpg" },
    { number:"99", name:"EGE YILMAZ",         ign:"Zeppettoo",    pos:"CB",  role:"Centre-Back",      flag:"🇹🇷", init:"EY",  apps:0, goals:0, assists:0, captain:false, profileUrl:"https://emajorleague.com/players/profile/9059/", image:"public/players/Zeppettoo.webp" },
    { number:"3",  name:"ÖMÜR ÇORUMLUOĞLU",   ign:"creedxzenci",  pos:"CB",  role:"Centre-Back",      flag:"🇹🇷", init:"ÖÇ",  apps:2, goals:0, assists:0, captain:false, profileUrl:"https://emajorleague.com/players/profile/8458/", image:"public/players/creedxzenci.jpg" },
    { number:"57", name:"SACİT KARACA",       ign:"Sparostago1",  pos:"RWB", role:"Right Wing Back",  flag:"🇹🇷", init:"SK",  apps:0, goals:0, assists:0, captain:false, profileUrl:"https://emajorleague.com/players/profile/9224/" },
    { number:"21", name:"RÜŞTÜ ALPER GÜLER",  ign:"DreamArmyA",   pos:"RWB", role:"Right Wing Back",  flag:"🇹🇷", init:"RAG", apps:0, goals:0, assists:0, captain:false, profileUrl:"https://emajorleague.com/players/profile/9054/" },
    { number:"11", name:"HAZAR TARASHOHİ",    ign:"KingHzrq",     pos:"LWB", role:"Left Wing Back",   flag:"🇹🇷", init:"HT",  apps:0, goals:0, assists:0, captain:false, profileUrl:"https://emajorleague.com/players/profile/8814/", image:"public/players/KingHzrq.jpg" },
  ]},
  { group:"Midfielders", abbr:"MID", players:[
    { number:"35", name:"KARAHAN ZEKİ TAŞKAN",   ign:"maniac_kara35", pos:"CDM", role:"Defensive Midfielder", flag:"🇹🇷", init:"KZT", apps:2, goals:0, assists:0,  captain:true,  profileUrl:"https://emajorleague.com/players/profile/9020/", image:"public/players/maniac_kara35.jpg" },
    { number:"",   name:"YİĞİTHAN DALDAL",       ign:"Swindler3r",    pos:"CDM", role:"Defensive Midfielder", flag:"🇹🇷", init:"YD",  apps:11, goals:0, assists:3,  captain:false, profileUrl:"https://emajorleague.com/players/profile/2178/", image:"public/players/Swindler3r.jpg" },
    { number:"36", name:"SALİH ERAY AYTEKİN",    ign:"4SAAY",         pos:"CDM", role:"Defensive Midfielder", flag:"🇹🇷", init:"SEA", apps:0,  goals:0, assists:0,  captain:false, profileUrl:"https://emajorleague.com/players/profile/2808/" },
    { number:"10", name:"ŞENER YİĞİT ÇOKYÜCEL",  ign:"yigitinski",    pos:"CM",  role:"Central Midfielder",   flag:"🇹🇷", init:"ŞYÇ", apps:2, goals:0, assists:0, captain:true,  profileUrl:"https://emajorleague.com/yigitinski/", image:"public/players/yigitinski.jpg" },
    { number:"14", name:"YİĞİTCAN ÖZBİRİNCİ",    ign:"LuckyS7even",   pos:"CM",  role:"Central Midfielder",   flag:"🇹🇷", init:"YÖ",  apps:1, goals:0, assists:0,  captain:false, profileUrl:"https://emajorleague.com/LuckyS7even/", image:"public/players/LuckyS7even.jpg" },
  ]},
  { group:"Forwards", abbr:"FWD", players:[
    { number:"7", name:"DOĞUKAN TOMBUL",  ign:"Xwrdodo", pos:"ST", role:"Striker", flag:"🇹🇷", init:"DK", apps:2, goals:1, assists:0, captain:false, profileUrl:"https://emajorleague.com/Dooggyy/", image:"public/players/Xwrdodo.jpg" },
    { number:"77", name:"ORÇUN BEKTAŞ",   ign:"ORC-HI",  pos:"ST", role:"Striker", flag:"🇹🇷", init:"OB", apps:2, goals:0, assists:0, captain:true,  profileUrl:"https://emajorleague.com/players/profile/1897/", image:"public/players/ORC-HI.jpg" },
    { number:"34", name:"MEHMET BERK ÜSTÜNDAĞ", ign:"MBU", pos:"ST", role:"Striker", flag:"🇹🇷", init:"MBÜ", apps:0, goals:0, assists:0, captain:false, profileUrl:"https://emajorleague.com/MBU/", image:"public/players/MBU.jpg" },
  ]},
];

const SOCIAL = [
  { cls:"ig", icon:"IG", platform:"Instagram", handle:"@altairesports", featured:true, url:"https://www.instagram.com/altairesports/" },
  { cls:"tw", icon:"TW", platform:"Twitch",    handle:"/altairespor",    url:"https://www.twitch.tv/altairespor" },
  { cls:"yt", icon:"YT", platform:"YouTube",   handle:"@AltairESPOR",    url:"https://www.youtube.com/@AltairESPOR" },
  { cls:"dc", icon:"DC", platform:"Discord",   handle:"Topluluğa katıl", url:"https://discord.gg/uMgQKQmr" },
];

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
      sub:"Founded in 2025, ALTAIR eSports is a competitive club built around team discipline, shared responsibility and the ambition to progress together.",
      founded:"Founded in 2025",
      founders:"Competitive Pro Clubs team",
      storyTitle:"The team always comes first",
      storyText:"Every player contributes to the same structure, carries responsibility for the same badge and competes toward the same objective. ALTAIR's identity belongs to the whole team.",
      mottoLabel:"Our motto",
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
      watch:"Watch on Twitch",
      venue:{ home:"Home", away:"Away" },
      vs:"VS",
    },
    squad: {
      eyebrow:"ALTAIR ROSTER",
      title:["FIELD", "IDENTITY"],
      sub:"A disciplined ALTAIR lineup shaped around defined roles, competitive structure and matchday responsibility.",
      subLoading:"Refreshing live squad stats…",
      cached:"Cached squad stats",
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
      eyebrow:"Partnership Opportunities",
      title:["BUILD WITH", "ALTAIR"],
      sub:"ALTAIR eSports is open to authentic brand collaborations built around competitive matchdays, original content and a growing Pro Clubs community.",
      open:"Open for collaboration",
      opportunities:[
        { k:"01", title:"Matchday Visibility", text:"Place your brand within ALTAIR matchday communication, live broadcasts and competition-focused digital content." },
        { k:"02", title:"Content Partnerships", text:"Create credible social media formats, player stories and campaign content shaped around the club identity." },
        { k:"03", title:"Community Connection", text:"Reach an active gaming audience through consistent, transparent and community-led collaboration." },
      ],
      ctaTitle:"Start a Conversation with ALTAIR",
      ctaSub:"Share your brand, campaign idea or partnership goal with us through our official Instagram account.",
      ctaPrimary:"Message on Instagram",
      ctaSecondary:"Explore Our Channels",
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
      sub:"2025 yılında kurulan ALTAIR eSports; takım disiplini, ortak sorumluluk ve birlikte ilerleme hedefi üzerine inşa edilmiş rekabetçi bir kulüptür.",
      founded:"2025 yılında kuruldu",
      founders:"Rekabetçi Pro Clubs takımı",
      storyTitle:"Her zaman önce takım",
      storyText:"Her oyuncu aynı yapıya katkı sağlar, aynı arma için sorumluluk alır ve aynı hedef doğrultusunda mücadele eder. ALTAIR'in kimliği bütün takıma aittir.",
      mottoLabel:"Sloganımız",
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
      watch:"Twitch'te İzle",
      venue:{ home:"İç Saha", away:"Deplasman" },
      vs:"VS",
    },
    squad: {
      eyebrow:"ALTAIR ROSTER",
      title:["SAHADAKİ", "KİMLİĞİMİZ"],
      sub:"ALTAIR eSports kadrosu; disiplinli rol dağılımı, takım oyunu ve rekabetçi yapı üzerine kurulur.",
      subLoading:"Canlı kadro istatistikleri yenileniyor…",
      cached:"Önbellek kadro verisi",
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
      eyebrow:"Partnerlik Fırsatları",
      title:["ALTAIR İLE", "İŞ BİRLİĞİ"],
      sub:"ALTAIR eSports; rekabetçi maç günleri, özgün içerikler ve büyüyen Pro Clubs topluluğu etrafında güvenilir marka iş birliklerine açıktır.",
      open:"İş birliğine açık",
      opportunities:[
        { k:"01", title:"Maç Günü Görünürlüğü", text:"Markanızı ALTAIR maç iletişimi, canlı yayınlar ve rekabet odaklı dijital içeriklerle buluşturun." },
        { k:"02", title:"İçerik Ortaklıkları", text:"Kulüp kimliğine uygun sosyal medya serileri, oyuncu hikâyeleri ve kampanya içerikleri üretin." },
        { k:"03", title:"Topluluk Bağlantısı", text:"Tutarlı, şeffaf ve topluluk odaklı çalışmalarla aktif oyuncu ve e-spor kitlesine ulaşın." },
      ],
      ctaTitle:"ALTAIR ile İletişime Geçin",
      ctaSub:"Markanızı, kampanya fikrinizi veya partnerlik hedefinizi resmi Instagram hesabımız üzerinden bizimle paylaşın.",
      ctaPrimary:"Instagram'dan Mesaj Gönder",
      ctaSecondary:"Kanallarımızı İncele",
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

const css = `
@import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800;900&family=Barlow+Condensed:wght@500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&family=Rajdhani:wght@500;600;700&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
:focus-visible{outline:2px solid var(--cyan);outline-offset:4px}
.skip-link{
  position:fixed;
  top:10px;
  left:10px;
  z-index:1000;
  padding:10px 14px;
  color:var(--bg);
  background:var(--cyan);
  font-family:var(--f-mono);
  font-size:10px;
  font-weight:800;
  letter-spacing:.12em;
  text-transform:uppercase;
  text-decoration:none;
  transform:translateY(-150%);
  transition:transform .18s ease;
}
.skip-link:focus{transform:translateY(0)}
body{
  background:#030711;
  color:#e6ecf5;
  font-family:var(--f-body);
  -webkit-font-smoothing:antialiased;
  overflow-x:hidden;
  letter-spacing:-.005em;
  background-image:
    radial-gradient(ellipse 60% 50% at 0% 28%, rgba(56,189,248,.075) 0%, transparent 62%),
    radial-gradient(ellipse 54% 46% at 100% 72%, rgba(14,165,233,.06) 0%, transparent 58%),
    radial-gradient(ellipse 82% 42% at 50% -4%, rgba(18,34,64,.92) 0%, transparent 56%),
    linear-gradient(180deg,#040814 0%,#02050d 100%);
}
a{color:inherit}
button{font-family:inherit}
.site{position:relative;min-height:100svh;background:linear-gradient(180deg,rgba(255,255,255,.012),transparent 22%)}
.site::before{
  content:'';position:fixed;inset:0;z-index:0;pointer-events:none;
  background:
    linear-gradient(90deg,rgba(255,255,255,.018) 1px,transparent 1px),
    linear-gradient(180deg,rgba(255,255,255,.014) 1px,transparent 1px);
  background-size:120px 120px;
  mask-image:linear-gradient(180deg,rgba(0,0,0,.55),transparent 72%);
  -webkit-mask-image:linear-gradient(180deg,rgba(0,0,0,.55),transparent 72%);
}
.site--tr{
  --copy-tracking: 0;
  --label-tracking: .08em;
  --nav-tracking: .08em;
  --display-tracking: .006em;
}
::selection{background:rgba(34,211,238,.28);color:#fff}
:focus-visible{outline:2px solid rgba(103,232,249,.95);outline-offset:4px}

:root{
  /* surfaces */
  --bg:        #030711;
  --surface-0: #070d18;
  --surface-1: #0b1423;
  --surface-2: #111d30;
  --surface-3: #17243a;

  /* lines */
  --line:      rgba(255,255,255,.06);
  --line-2:    rgba(255,255,255,.1);
  --line-cyan: rgba(34,211,238,.22);

  /* text */
  --text:      #eef2f8;
  --text-2:    #aeb8cc;
  --muted:     #6b7789;
  --dim:       #404c61;

  /* brand */
  --cyan:      #22d3ee;
  --cyan-2:    #67e8f9;
  --cyan-deep: #0891b2;
  --cyan-soft: rgba(34,211,238,.08);
  --cyan-edge: rgba(34,211,238,.28);
  --silver:    #d8e4ef;
  --steel:     #7d8fa3;
  --glass:     rgba(9,16,30,.68);
  --glass-2:   rgba(255,255,255,.055);
  --shadow-lg: 0 32px 90px rgba(0,0,0,.48);

  /* state */
  --win:       #10b981;
  --loss:      #ef4444;
  --draw:      #64748b;

  /* type */
  --f-display: 'Rajdhani', sans-serif;
  --f-narrow:  'Barlow Condensed', sans-serif;
  --f-body:    'Barlow', system-ui, sans-serif;
  --f-mono:    'JetBrains Mono', monospace;

  /* rhythm */
  --pad-x: clamp(20px, 5vw, 72px);
  --sec-y: clamp(60px, 9vw, 120px);
  --hero-frame-max: 920px;
  --side-rail: max(0px, calc((100vw - var(--hero-frame-max)) / 2));
}


/* â”€â”€â”€ Side art panels â€” fixed, full viewport height â”€â”€â”€ */
body::before{
  content:'';
  position:fixed;top:0;left:0;width:var(--side-rail);height:100vh;
  background:linear-gradient(to right,rgba(34,211,238,.055) 0%,rgba(34,211,238,.018) 45%,transparent 100%);
  pointer-events:none;z-index:0;
}
body::after{
  content:'';
  position:fixed;top:0;right:0;width:var(--side-rail);height:100vh;
  background:linear-gradient(to left,rgba(34,211,238,.055) 0%,rgba(34,211,238,.018) 45%,transparent 100%);
  pointer-events:none;z-index:0;
}
@media(max-width:1000px){
  body::before,body::after{display:none}
}



.section{padding:var(--sec-y) var(--pad-x);position:relative;overflow:hidden}
.section-compact{padding:calc(var(--sec-y) * .55) var(--pad-x)}
.container{max-width:1360px;margin:0 auto;position:relative;z-index:2}

.standings,
#identity.section,
#matches.section,
#fixtures.section,
#squad.section,
#sponsors.section,
#broadcast.section,
.footer{
  position:relative;
  isolation:isolate;
}
.standings::after,
#identity.section::after,
#matches.section::after,
#fixtures.section::after,
#squad.section::after,
#sponsors.section::after,
#broadcast.section::after,
.footer::after{
  content:'';
  position:absolute;
  top:0;left:0;right:0;height:1px;
  background:linear-gradient(90deg,transparent,rgba(34,211,238,.16),transparent);
  opacity:.68;
  pointer-events:none;
  z-index:1;
}
#identity.section{
  background:
    radial-gradient(circle at 12% 18%,rgba(34,211,238,.095),transparent 34%),
    radial-gradient(circle at 78% 74%,rgba(56,189,248,.06),transparent 30%),
    linear-gradient(135deg,rgba(7,14,26,.98),rgba(3,7,15,.995));
}
#identity.section::before{
  content:'';
  position:absolute;
  inset:0;
  pointer-events:none;
  opacity:.42;
  background:
    linear-gradient(90deg,rgba(255,255,255,.028) 1px,transparent 1px),
    linear-gradient(180deg,rgba(255,255,255,.022) 1px,transparent 1px),
    radial-gradient(circle at 50% 50%,rgba(34,211,238,.08),transparent 42%);
  background-size:88px 88px,88px 88px,100% 100%;
  mask-image:linear-gradient(180deg,transparent,rgba(0,0,0,.72) 18%,rgba(0,0,0,.72) 76%,transparent);
  -webkit-mask-image:linear-gradient(180deg,transparent,rgba(0,0,0,.72) 18%,rgba(0,0,0,.72) 76%,transparent);
}
#matches.section{
  background:
    radial-gradient(circle at 12% 0%,rgba(34,211,238,.08),transparent 34%),
    linear-gradient(180deg,rgba(10,18,31,.92),rgba(7,12,22,.985));
}
#fixtures.section{
  background:
    radial-gradient(circle at 88% 0%,rgba(125,143,163,.08),transparent 32%),
    linear-gradient(180deg,rgba(6,12,22,.94),rgba(9,16,28,.985));
}
#squad.section{
  background:
    radial-gradient(circle at 50% 0%,rgba(34,211,238,.12),transparent 36%),
    radial-gradient(circle at 8% 70%,rgba(59,130,246,.08),transparent 30%),
    linear-gradient(180deg,rgba(9,16,28,.96),rgba(4,8,15,.995));
}
#sponsors.section{
  background:
    radial-gradient(circle at 84% 12%,rgba(34,211,238,.07),transparent 32%),
    linear-gradient(180deg,rgba(7,13,23,.96),rgba(11,19,33,.985));
}
#broadcast.section{
  background:
    radial-gradient(circle at 24% 10%,rgba(34,211,238,.08),transparent 34%),
    linear-gradient(180deg,rgba(10,18,30,.96),rgba(5,9,17,.995));
}

/* â”€â”€â”€ Section header â”€â”€â”€ */
.sec-hdr{display:flex;align-items:flex-end;justify-content:space-between;gap:32px;margin-bottom:44px;flex-wrap:wrap}
.sec-hdr-left{max-width:720px}
.sec-eyebrow{display:inline-flex;align-items:center;gap:12px;font-family:var(--f-mono);font-size:11px;font-weight:700;letter-spacing:var(--label-tracking,.16em);text-transform:uppercase;color:var(--cyan);margin-bottom:16px}
.sec-eyebrow::before{content:'';display:block;width:28px;height:1px;background:var(--cyan);opacity:.6}
.sec-title{font-family:var(--f-display);font-weight:700;font-size:clamp(36px,4.5vw,68px);line-height:.98;letter-spacing:var(--display-tracking,.006em);text-transform:uppercase;color:var(--text);text-wrap:balance;text-shadow:0 22px 46px rgba(0,0,0,.28)}
.sec-title .accent{color:var(--cyan);font-style:normal}
.sec-title .outline{color:transparent;-webkit-text-stroke:1px rgba(255,255,255,.2);font-style:normal}
.sec-sub{margin-top:14px;color:var(--text-2);font-size:15px;line-height:1.72;max-width:620px;font-weight:400;letter-spacing:var(--copy-tracking,0);text-wrap:pretty}
.sec-link{font-family:var(--f-mono);font-size:11px;font-weight:700;letter-spacing:var(--label-tracking,.14em);text-transform:uppercase;color:var(--text-2);text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:11px 18px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.025);transition:all .2s ease;text-align:center;box-shadow:inset 0 1px 0 rgba(255,255,255,.04)}
.sec-link:hover{color:var(--cyan);border-color:var(--cyan-edge);background:var(--cyan-soft);transform:translateY(-1px)}
.sec-link-arrow{transition:transform .2s ease}
.sec-link:hover .sec-link-arrow{transform:translateX(4px)}
.sec-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap}
.refresh-btn{display:inline-flex;align-items:center;justify-content:center;min-height:36px;border-radius:999px;box-shadow:inset 0 1px 0 rgba(255,255,255,.03)}

/* Club identity */
.identity-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}
.identity-card{
  position:relative;
  min-height:260px;
  padding:28px;
  display:flex;
  flex-direction:column;
  justify-content:space-between;
  overflow:hidden;
  border:1px solid rgba(255,255,255,.095);
  border-radius:28px;
  background:
    linear-gradient(145deg,rgba(255,255,255,.07),rgba(255,255,255,.022)),
    rgba(7,13,24,.72);
  box-shadow:0 24px 70px rgba(0,0,0,.34),inset 0 1px 0 rgba(255,255,255,.08);
  backdrop-filter:blur(18px) saturate(135%);
  -webkit-backdrop-filter:blur(18px) saturate(135%);
}
.identity-card::before{
  content:'';
  position:absolute;
  inset:-1px;
  pointer-events:none;
  background:
    radial-gradient(circle at 18% 0%,rgba(34,211,238,.18),transparent 34%),
    linear-gradient(135deg,rgba(34,211,238,.09),transparent 36%,rgba(255,255,255,.035));
  opacity:.78;
}
.identity-card::after{
  content:'✦';
  position:absolute;
  right:22px;
  bottom:-28px;
  font-family:var(--f-display);
  font-size:132px;
  line-height:1;
  color:rgba(255,255,255,.035);
  transform:rotate(-8deg);
  pointer-events:none;
}
.identity-k{
  position:relative;
  z-index:1;
  width:max-content;
  padding:7px 11px;
  border:1px solid rgba(34,211,238,.22);
  border-radius:999px;
  color:var(--cyan);
  background:rgba(34,211,238,.06);
  font-family:var(--f-mono);
  font-size:10px;
  font-weight:800;
  letter-spacing:.16em;
}
.identity-copy{position:relative;z-index:1;margin-top:46px}
.identity-title{
  font-family:var(--f-display);
  font-size:clamp(25px,2vw,34px);
  line-height:1;
  font-weight:800;
  letter-spacing:.035em;
  text-transform:uppercase;
  color:var(--text);
}
.identity-text{
  margin-top:14px;
  color:var(--text-2);
  font-size:13.5px;
  line-height:1.62;
  max-width:38ch;
}

.identity-story{
  display:grid;
  grid-template-columns:minmax(220px,.7fr) minmax(0,1.3fr);
  gap:18px;
  margin-bottom:18px;
}
.identity-origin,
.identity-manifesto{
  position:relative;
  overflow:hidden;
  border:1px solid rgba(126,211,255,.14);
  border-radius:28px;
  background:
    radial-gradient(circle at 88% 0%,rgba(34,211,238,.13),transparent 38%),
    linear-gradient(145deg,rgba(255,255,255,.06),rgba(7,13,24,.82));
  box-shadow:0 24px 64px rgba(0,0,0,.26),inset 0 1px 0 rgba(255,255,255,.055);
}
.identity-origin{
  min-height:280px;
  padding:28px;
  display:flex;
  flex-direction:column;
  justify-content:space-between;
}
.identity-origin-year{
  color:var(--cyan);
  font-family:var(--f-display);
  font-size:clamp(70px,7vw,112px);
  font-weight:900;
  line-height:.8;
  letter-spacing:-.06em;
  text-shadow:0 0 38px rgba(34,211,238,.2);
}
.identity-origin-meta{display:flex;flex-direction:column;gap:7px}
.identity-origin-founded{
  color:var(--text);
  font-family:var(--f-narrow);
  font-size:17px;
  font-weight:800;
  letter-spacing:.07em;
  text-transform:uppercase;
}
.identity-origin-founders{
  color:var(--text-2);
  font-family:var(--f-mono);
  font-size:10px;
  font-weight:700;
  letter-spacing:.14em;
  text-transform:uppercase;
}
.identity-manifesto{
  min-height:280px;
  padding:34px 38px;
  display:flex;
  flex-direction:column;
  justify-content:center;
}
.identity-manifesto-title{
  max-width:20ch;
  color:var(--text);
  font-family:var(--f-display);
  font-size:clamp(30px,3.3vw,50px);
  font-weight:800;
  line-height:.95;
  letter-spacing:.02em;
  text-transform:uppercase;
}
.identity-manifesto-text{max-width:68ch;margin-top:18px;color:var(--text-2);font-size:14px;line-height:1.72}
.identity-motto{
  margin-top:28px;
  padding:17px 20px;
  display:flex;
  align-items:center;
  gap:16px;
  border-left:2px solid var(--cyan);
  background:linear-gradient(90deg,rgba(34,211,238,.09),transparent);
}
.identity-motto-label{
  flex-shrink:0;
  color:var(--cyan);
  font-family:var(--f-mono);
  font-size:9px;
  font-weight:700;
  letter-spacing:.16em;
  text-transform:uppercase;
}
.identity-motto-text{
  color:var(--text);
  font-family:var(--f-narrow);
  font-size:clamp(18px,2vw,25px);
  font-weight:800;
  letter-spacing:.04em;
  text-transform:uppercase;
}

.honours{
  border-top:1px solid rgba(126,211,255,.11);
  border-bottom:1px solid rgba(126,211,255,.08);
  background:
    radial-gradient(circle at 85% 8%,rgba(251,191,36,.1),transparent 28%),
    radial-gradient(circle at 10% 72%,rgba(34,211,238,.08),transparent 30%),
    linear-gradient(180deg,rgba(4,9,17,.99),rgba(8,14,25,.985));
}
.honours-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px}
.honour-card{
  position:relative;
  min-height:270px;
  padding:25px;
  overflow:hidden;
  display:flex;
  flex-direction:column;
  border:1px solid rgba(255,255,255,.09);
  border-radius:24px;
  background:
    radial-gradient(circle at 88% 4%,rgba(251,191,36,.11),transparent 34%),
    linear-gradient(155deg,rgba(19,29,45,.88),rgba(6,11,20,.98));
  box-shadow:0 20px 46px rgba(0,0,0,.22),inset 0 1px 0 rgba(255,255,255,.045);
  transition:transform .22s ease,border-color .22s ease,box-shadow .22s ease;
}
.honour-card:hover{
  transform:translateY(-4px);
  border-color:rgba(251,191,36,.3);
  box-shadow:0 28px 58px rgba(0,0,0,.3),0 0 28px rgba(251,191,36,.055),inset 0 1px 0 rgba(255,255,255,.055);
}
.honour-mark{
  color:#fbbf24;
  font-family:var(--f-display);
  font-size:clamp(52px,5vw,76px);
  font-weight:900;
  line-height:.85;
  letter-spacing:-.06em;
  text-shadow:0 0 28px rgba(251,191,36,.16);
}
.honour-copy{margin-top:auto;padding-top:46px}
.honour-season{
  color:var(--cyan);
  font-family:var(--f-mono);
  font-size:9px;
  font-weight:700;
  letter-spacing:.14em;
  text-transform:uppercase;
}
.honour-competition{
  margin-top:9px;
  color:var(--text);
  font-family:var(--f-display);
  font-size:22px;
  font-weight:800;
  line-height:1.02;
  letter-spacing:.025em;
  text-transform:uppercase;
}
.honour-result{
  margin-top:12px;
  padding-top:12px;
  border-top:1px solid rgba(255,255,255,.08);
  color:var(--text-2);
  font-family:var(--f-narrow);
  font-size:13px;
  font-weight:800;
  letter-spacing:.12em;
  text-transform:uppercase;
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   NAVIGATION
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
.nav{
  position:fixed;top:0;left:0;right:0;z-index:500;
  height:72px;
  display:flex;align-items:center;justify-content:space-between;
  padding:0 var(--pad-x);
  transition:background .3s ease,border-color .3s ease,backdrop-filter .3s ease,box-shadow .3s ease;
  border-bottom:1px solid rgba(255,255,255,.04);
  background:linear-gradient(180deg,rgba(3,7,17,.46),rgba(3,7,17,.08));
  backdrop-filter:blur(12px) saturate(115%);
  -webkit-backdrop-filter:blur(12px) saturate(115%);
}
.nav.scrolled{
  background:rgba(5,10,19,.84);
  backdrop-filter:blur(22px) saturate(155%);
  -webkit-backdrop-filter:blur(22px) saturate(155%);
  border-bottom-color:rgba(126,211,255,.13);
  box-shadow:0 18px 60px rgba(0,0,0,.32);
  height:64px;
}
.nav-left{display:flex;align-items:center;gap:16px}
.nav-logo{display:flex;align-items:center;gap:14px;text-decoration:none}
.nav-logo-img{height:42px;width:42px;object-fit:contain;filter:drop-shadow(0 0 12px rgba(34,211,238,.42))}
.nav-wm{display:flex;flex-direction:column;line-height:1;gap:4px}
.nav-wm-top{font-family:var(--f-display);font-weight:700;font-size:17px;letter-spacing:.035em;color:var(--text);text-transform:uppercase}
.nav-wm-sub{font-family:var(--f-mono);font-size:9px;font-weight:500;letter-spacing:.22em;color:var(--cyan);text-transform:uppercase;opacity:.85}
.nav-right{display:flex;align-items:center;gap:14px}

.nav-links{display:flex;align-items:center;gap:4px;list-style:none;padding:6px;border:1px solid rgba(255,255,255,.075);border-radius:999px;background:rgba(255,255,255,.025);box-shadow:inset 0 1px 0 rgba(255,255,255,.035)}
.nav-links a{
  display:inline-block;
  padding:10px 16px;
  font-family:var(--f-narrow);font-weight:700;font-size:13px;letter-spacing:var(--nav-tracking,.12em);
  text-transform:uppercase;color:var(--text-2);text-decoration:none;
  position:relative;transition:color .2s ease;
}
.nav-links a::after{
  content:'';position:absolute;left:16px;right:16px;bottom:6px;height:1px;
  background:var(--cyan);transform:scaleX(0);transform-origin:left;transition:transform .25s ease;
}
.nav-links a:hover{color:var(--text)}
.nav-links a:hover::after{transform:scaleX(1)}

.nav-cta{
  display:inline-flex;align-items:center;gap:8px;
  padding:11px 22px;
  font-family:var(--f-narrow);font-weight:800;font-size:12px;letter-spacing:var(--nav-tracking,.11em);
  text-transform:uppercase;color:var(--bg);background:linear-gradient(135deg,var(--cyan),var(--cyan-2));
  border:none;cursor:pointer;text-decoration:none;
  position:relative;overflow:hidden;
  text-align:center;line-height:1.05;
  box-shadow:0 14px 34px rgba(34,211,238,.18),inset 0 1px 0 rgba(255,255,255,.26);
  transition:background .2s ease,box-shadow .2s ease,transform .15s ease;
}
.nav-cta::before{content:'';width:6px;height:6px;border-radius:50%;background:var(--bg);animation:navPulse 2s ease infinite}
@keyframes navPulse{0%,100%{opacity:1}50%{opacity:.35}}
.nav-cta:hover{background:var(--cyan-2);box-shadow:0 0 0 4px rgba(34,211,238,.15),0 10px 30px rgba(34,211,238,.25);transform:translateY(-1px)}

.nav-lang{position:relative}
.nav-burger{
  display:flex;min-width:98px;height:38px;padding:0 12px;border:1px solid var(--line-2);
  background:linear-gradient(180deg,rgba(17,25,39,.95),rgba(10,16,27,.98));
  color:var(--text);cursor:pointer;align-items:center;justify-content:space-between;gap:10px;
  transition:border-color .2s ease,background .2s ease,box-shadow .2s ease,transform .18s ease;
}
.nav-burger:hover,
.nav-burger.active{
  border-color:var(--cyan-edge);
  background:linear-gradient(180deg,rgba(17,27,43,.98),rgba(8,15,26,1));
  box-shadow:0 0 0 3px rgba(34,211,238,.08),0 12px 32px rgba(4,10,20,.35);
}
.nav-burger:active{transform:translateY(1px)}
.nav-lang-trigger-main{display:flex;flex-direction:column;align-items:flex-start;gap:2px}
.nav-lang-trigger-label{
  font-family:var(--f-mono);font-size:8px;font-weight:600;letter-spacing:.18em;
  text-transform:uppercase;color:var(--muted);
}
.nav-lang-trigger-value{
  font-family:var(--f-narrow);font-size:11px;font-weight:700;letter-spacing:.16em;
  text-transform:uppercase;color:var(--text);
}
.nav-lang-trigger-icon{
  display:flex;align-items:center;gap:8px;flex-shrink:0;
  font-family:var(--f-mono);font-size:10px;font-weight:700;letter-spacing:.1em;
  text-transform:uppercase;color:var(--cyan);
}
.nav-lang-trigger-dot{
  width:6px;height:6px;border-radius:50%;background:var(--cyan);
  box-shadow:0 0 12px rgba(34,211,238,.5);
}
.nav-lang-trigger-caret{
  color:var(--text-2);
  transition:transform .2s ease,color .2s ease;
}
.nav-burger.active .nav-lang-trigger-caret{
  transform:rotate(180deg);
  color:var(--cyan);
}
.nav-lang-panel{
  position:absolute;top:calc(100% + 12px);right:0;min-width:220px;
  padding:12px;border:1px solid var(--line-cyan);
  background:
    linear-gradient(180deg,rgba(12,19,31,.98),rgba(8,13,22,.98)),
    radial-gradient(circle at top right,rgba(34,211,238,.12),transparent 55%);
  box-shadow:0 24px 70px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.03);
  backdrop-filter:blur(20px) saturate(130%);
}
.nav-lang-head{
  display:flex;align-items:center;justify-content:space-between;gap:10px;
  padding:0 2px 10px;margin-bottom:10px;border-bottom:1px solid var(--line);
  font-family:var(--f-mono);font-size:10px;font-weight:600;letter-spacing:.16em;
  text-transform:uppercase;color:var(--text-2);
}
.nav-lang-live{color:var(--cyan)}
.nav-lang-list{display:flex;flex-direction:column;gap:8px}
.nav-lang-option{
  width:100%;padding:11px 12px;border:1px solid var(--line);
  background:linear-gradient(180deg,rgba(19,28,42,.82),rgba(13,20,32,.94));
  color:var(--text);display:flex;align-items:center;justify-content:space-between;gap:12px;
  cursor:pointer;text-align:left;transition:border-color .2s ease,transform .18s ease,background .2s ease;
}
.nav-lang-option:hover{
  border-color:var(--cyan-edge);
  background:linear-gradient(180deg,rgba(21,33,50,.9),rgba(13,22,36,.98));
  transform:translateY(-1px);
}
.nav-lang-option.active{
  border-color:var(--cyan-edge);
  box-shadow:inset 3px 0 0 var(--cyan);
  background:linear-gradient(180deg,rgba(11,35,47,.92),rgba(10,23,35,.98));
}
.nav-lang-main{display:flex;flex-direction:column;gap:3px}
.nav-lang-code{
  font-family:var(--f-display);font-size:20px;font-weight:800;line-height:1;
  letter-spacing:.04em;text-transform:uppercase;color:var(--text);
}
.nav-lang-label{
  font-family:var(--f-narrow);font-size:12px;font-weight:700;letter-spacing:.1em;
  text-transform:uppercase;color:var(--text-2);
}
.nav-lang-note{
  font-family:var(--f-mono);font-size:9px;font-weight:500;letter-spacing:.12em;
  text-transform:uppercase;color:var(--muted);
}
.nav-lang-check{
  width:10px;height:10px;border-radius:50%;
  background:rgba(34,211,238,.18);border:1px solid rgba(34,211,238,.28);
  box-shadow:0 0 0 0 rgba(34,211,238,.25);
}
.nav-lang-option.active .nav-lang-check{
  background:var(--cyan);
  box-shadow:0 0 0 6px rgba(34,211,238,.08);
}

.nav-menu{display:none;position:relative}
.nav-menu-toggle{
  width:38px;
  height:38px;
  padding:0;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:5px;
  border:1px solid var(--line-2);
  border-radius:50%;
  color:var(--text);
  background:linear-gradient(180deg,rgba(17,25,39,.95),rgba(10,16,27,.98));
  cursor:pointer;
  transition:border-color .2s ease,background .2s ease,box-shadow .2s ease;
}
.nav-menu-toggle span{
  width:15px;
  height:1px;
  background:currentColor;
  transition:transform .2s ease,opacity .2s ease;
}
.nav-menu-toggle:hover,
.nav-menu-toggle.active{
  border-color:var(--cyan-edge);
  color:var(--cyan);
  box-shadow:0 0 0 3px rgba(34,211,238,.08);
}
.nav-menu-toggle.active span:first-child{transform:translateY(3px) rotate(45deg)}
.nav-menu-toggle.active span:last-child{transform:translateY(-3px) rotate(-45deg)}
.nav-mobile-panel{
  position:absolute;
  top:calc(100% + 12px);
  right:0;
  width:min(290px,calc(100vw - 32px));
  padding:12px;
  border:1px solid var(--line-cyan);
  border-radius:22px;
  background:
    radial-gradient(circle at top right,rgba(34,211,238,.12),transparent 48%),
    linear-gradient(180deg,rgba(12,19,31,.99),rgba(7,12,21,.99));
  box-shadow:0 24px 70px rgba(0,0,0,.46),inset 0 1px 0 rgba(255,255,255,.04);
  backdrop-filter:blur(22px);
  -webkit-backdrop-filter:blur(22px);
}
.nav-mobile-head{
  padding:4px 4px 11px;
  color:var(--cyan);
  font-family:var(--f-mono);
  font-size:9px;
  font-weight:700;
  letter-spacing:.17em;
  text-transform:uppercase;
}
.nav-mobile-links{display:flex;flex-direction:column;gap:6px;list-style:none}
.nav-mobile-links a{
  min-height:42px;
  padding:0 13px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  border:1px solid rgba(255,255,255,.075);
  border-radius:14px;
  color:var(--text-2);
  background:rgba(255,255,255,.025);
  font-family:var(--f-narrow);
  font-size:12px;
  font-weight:800;
  letter-spacing:.12em;
  text-transform:uppercase;
  text-decoration:none;
  transition:color .2s ease,border-color .2s ease,background .2s ease;
}
.nav-mobile-links a::after{content:'→';color:var(--muted);font-family:var(--f-mono)}
.nav-mobile-links a:hover{color:var(--cyan);border-color:var(--cyan-edge);background:var(--cyan-soft)}
.nav-mobile-links .nav-mobile-primary{
  margin-top:4px;
  color:var(--bg);
  border-color:transparent;
  background:linear-gradient(135deg,var(--cyan),var(--cyan-2));
}
.nav-mobile-links .nav-mobile-primary::after{color:var(--bg)}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   HERO
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
.hero{
  position:relative;
  min-height:max(720px,100svh);
  display:block;
  overflow:hidden;
  isolation:isolate;
  background:#030711;
}
.hero-bg-base{
  position:absolute;inset:0;
  background:
    radial-gradient(ellipse at 84% 26%,rgba(251,191,36,.14) 0%,rgba(217,119,6,.045) 28%,transparent 56%),
    radial-gradient(ellipse at 14% 30%,#11365f 0%,#071827 42%,#030711 82%);
}
.hero-bg-grid{
  position:absolute;inset:0;opacity:.30;
  background-image:
    linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),
    linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px);
  background-size:86px 86px;
  mask-image:linear-gradient(90deg,black,transparent 46%,black);
  -webkit-mask-image:linear-gradient(90deg,black,transparent 46%,black);
}
.hero-bg-glow{
  position:absolute;right:-12%;top:44%;transform:translateY(-50%);
  width:min(78vw,1180px);height:min(78vw,1180px);border-radius:50%;
  background:
    radial-gradient(circle at 52% 45%,rgba(251,191,36,.13) 0%,rgba(245,158,11,.05) 29%,transparent 58%),
    radial-gradient(circle,rgba(34,211,238,.14) 0%,rgba(14,165,233,.045) 40%,transparent 70%);
  filter:blur(70px);pointer-events:none;
}
.hero-bg-noise{
  position:absolute;inset:0;opacity:.35;mix-blend-mode:overlay;pointer-events:none;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/></svg>");
}

/* Star layers */
.hero-stars-sm{
  position:absolute;inset:0;z-index:1;pointer-events:none;opacity:.42;
  background-image:
    radial-gradient(1px 1px at 7%  12%, rgba(255,255,255,.75) 0%, transparent 100%),
    radial-gradient(1px 1px at 18% 34%, rgba(255,255,255,.55) 0%, transparent 100%),
    radial-gradient(1px 1px at 27%  8%, rgba(255,255,255,.65) 0%, transparent 100%),
    radial-gradient(1px 1px at 38% 52%, rgba(255,255,255,.45) 0%, transparent 100%),
    radial-gradient(1px 1px at 45% 22%, rgba(255,255,255,.70) 0%, transparent 100%),
    radial-gradient(1px 1px at 54% 67%, rgba(255,255,255,.50) 0%, transparent 100%),
    radial-gradient(1px 1px at 62% 14%, rgba(255,255,255,.60) 0%, transparent 100%),
    radial-gradient(1px 1px at 71% 41%, rgba(255,255,255,.55) 0%, transparent 100%),
    radial-gradient(1px 1px at 79% 78%, rgba(255,255,255,.45) 0%, transparent 100%),
    radial-gradient(1px 1px at 86%  6%, rgba(255,255,255,.65) 0%, transparent 100%),
    radial-gradient(1px 1px at 93% 55%, rgba(255,255,255,.50) 0%, transparent 100%),
    radial-gradient(1px 1px at  3% 71%, rgba(255,255,255,.60) 0%, transparent 100%),
    radial-gradient(1px 1px at 12% 88%, rgba(255,255,255,.40) 0%, transparent 100%),
    radial-gradient(1px 1px at 24% 61%, rgba(255,255,255,.55) 0%, transparent 100%),
    radial-gradient(1px 1px at 33% 79%, rgba(255,255,255,.45) 0%, transparent 100%),
    radial-gradient(1px 1px at 48% 44%, rgba(255,255,255,.65) 0%, transparent 100%),
    radial-gradient(1px 1px at 57%  3%, rgba(255,255,255,.55) 0%, transparent 100%),
    radial-gradient(1px 1px at 66% 90%, rgba(255,255,255,.40) 0%, transparent 100%),
    radial-gradient(1px 1px at 75% 28%, rgba(255,255,255,.60) 0%, transparent 100%),
    radial-gradient(1px 1px at 84% 63%, rgba(255,255,255,.50) 0%, transparent 100%),
    radial-gradient(1px 1px at 91% 19%, rgba(255,255,255,.70) 0%, transparent 100%),
    radial-gradient(1px 1px at  9% 47%, rgba(255,255,255,.45) 0%, transparent 100%),
    radial-gradient(1px 1px at 41% 85%, rgba(255,255,255,.55) 0%, transparent 100%),
    radial-gradient(1px 1px at 52% 31%, rgba(255,255,255,.65) 0%, transparent 100%),
    radial-gradient(1px 1px at 96% 82%, rgba(255,255,255,.40) 0%, transparent 100%);
  background-size:100% 100%;
}
.hero-stars-md{
  position:absolute;inset:0;z-index:1;pointer-events:none;opacity:.22;
  background-image:
    radial-gradient(1.5px 1.5px at 15% 25%, rgba(255,255,255,.85) 0%, transparent 100%),
    radial-gradient(1.5px 1.5px at 32% 72%, rgba(255,255,255,.70) 0%, transparent 100%),
    radial-gradient(1.5px 1.5px at 51%  9%, rgba(255,255,255,.80) 0%, transparent 100%),
    radial-gradient(1.5px 1.5px at 68% 57%, rgba(255,255,255,.65) 0%, transparent 100%),
    radial-gradient(1.5px 1.5px at 82% 33%, rgba(255,255,255,.75) 0%, transparent 100%),
    radial-gradient(1.5px 1.5px at 94% 76%, rgba(255,255,255,.60) 0%, transparent 100%),
    radial-gradient(1.5px 1.5px at  6% 91%, rgba(255,255,255,.70) 0%, transparent 100%),
    radial-gradient(1.5px 1.5px at 43% 48%, rgba(255,255,255,.80) 0%, transparent 100%),
    radial-gradient(1.5px 1.5px at 77% 14%, rgba(255,255,255,.65) 0%, transparent 100%),
    radial-gradient(1.5px 1.5px at 22% 55%, rgba(255,255,255,.75) 0%, transparent 100%),
    radial-gradient(1.5px 1.5px at 59% 83%, rgba(255,255,255,.55) 0%, transparent 100%),
    radial-gradient(1.5px 1.5px at 88% 44%, rgba(255,255,255,.70) 0%, transparent 100%);
  background-size:100% 100%;
}
.hero-stars-cyan{
  position:absolute;inset:0;z-index:1;pointer-events:none;opacity:.24;
  background-image:
    radial-gradient(2px 2px at 23% 18%, rgba(34,211,238,.75) 0%, transparent 100%),
    radial-gradient(2px 2px at 64%  7%, rgba(34,211,238,.60) 0%, transparent 100%),
    radial-gradient(2px 2px at 81% 62%, rgba(34,211,238,.70) 0%, transparent 100%),
    radial-gradient(2px 2px at 11% 74%, rgba(34,211,238,.55) 0%, transparent 100%),
    radial-gradient(2px 2px at 47% 91%, rgba(34,211,238,.65) 0%, transparent 100%),
    radial-gradient(2px 2px at 93% 28%, rgba(34,211,238,.50) 0%, transparent 100%),
    radial-gradient(1.5px 1.5px at 36% 39%, rgba(103,232,249,.80) 0%, transparent 100%),
    radial-gradient(1.5px 1.5px at 72% 85%, rgba(103,232,249,.65) 0%, transparent 100%),
    radial-gradient(1.5px 1.5px at  5% 52%, rgba(103,232,249,.70) 0%, transparent 100%),
    radial-gradient(2px 2px at 86% 18%, rgba(251,191,36,.72) 0%, transparent 100%),
    radial-gradient(1.5px 1.5px at 73% 38%, rgba(245,158,11,.55) 0%, transparent 100%);
  background-size:100% 100%;
}

.hero-fade-bottom{position:absolute;bottom:0;left:0;right:0;height:26%;background:linear-gradient(to top,var(--bg) 0%,rgba(3,7,17,.82) 30%,transparent 100%);z-index:3;pointer-events:none}

/* Editorial content */
.hero-left{
  position:relative;z-index:8;
  width:min(650px,48vw);
  min-height:max(720px,100svh);
  margin-left:var(--pad-x);
  padding:clamp(142px,16vh,190px) 0 190px;
  display:flex;flex-direction:column;justify-content:center;align-items:flex-start;
  text-align:left;
}
.hero-left::before{
  content:'';position:absolute;left:-24px;top:50%;width:1px;height:42%;
  transform:translateY(-50%);
  background:linear-gradient(transparent,rgba(34,211,238,.7),rgba(251,191,36,.56),transparent);
  opacity:.65;
}
.hero-left::after{
  content:'ALTAIR / MATCHDAY 26';position:absolute;left:-31px;top:50%;
  transform:translate(-100%,-50%) rotate(-90deg);
  transform-origin:right center;
  color:rgba(185,245,255,.4);
  font-family:var(--f-mono);font-size:7px;font-weight:700;letter-spacing:.24em;
  white-space:nowrap;
}
.hero.hero--tr .hero-h1 .l-3{font-size:.3em;letter-spacing:.12em}
.hero-tag{
  display:inline-flex;align-items:center;gap:10px;width:fit-content;
  border:none;background:none;
  font-family:var(--f-mono);font-size:9px;font-weight:700;letter-spacing:.18em;
  text-transform:uppercase;color:var(--cyan);
  margin-bottom:28px;
}
.hero-tag-dot{width:6px;height:6px;border-radius:50%;background:#fbbf24;box-shadow:0 0 12px rgba(251,191,36,.85);animation:navPulse 2s ease infinite}
.hero-tag-sep{width:32px;height:1px;background:linear-gradient(90deg,var(--cyan),#fbbf24);opacity:.62}

.hero-h1{
  font-family:var(--f-display);font-weight:700;
  font-size:clamp(76px,8.2vw,132px);
  line-height:.78;letter-spacing:-.018em;text-transform:uppercase;
  animation:heroUp .9s cubic-bezier(.16,1,.3,1) both;
  overflow:visible;
}
.hero-h1 .l{display:block;white-space:nowrap}
.hero-h1 .l:first-child{
  margin-bottom:12px;
  color:#eaf5ff;
  font-family:var(--f-narrow);
  font-size:.42em;font-weight:800;line-height:1;letter-spacing:.14em;
}
.hero-h1 .l-2{
  color:var(--cyan);position:relative;display:block;padding-bottom:18px;
  text-shadow:0 0 42px rgba(34,211,238,.18),0 0 30px rgba(251,191,36,.1);
}
.hero-h1 .l-2::after{
  content:'';position:absolute;left:0;width:min(420px,76%);bottom:0;height:2px;
  background:linear-gradient(to right,var(--cyan) 0%,#fbbf24 54%,transparent 100%);
  box-shadow:0 0 16px rgba(34,211,238,.2);
}
.hero-h1 .l-3{
  font-family:var(--f-narrow);font-weight:800;
  color:rgba(238,247,255,.9);
  background:linear-gradient(90deg,#f7fbff 0%,#b8f3ff 36%,#fef3c7 72%,#d9e8f5 100%);
  -webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;
  -webkit-text-stroke:.35px rgba(255,255,255,.14);
  display:block;font-size:.28em;margin-top:20px;
  letter-spacing:.13em;white-space:nowrap;
  text-shadow:0 10px 34px rgba(0,0,0,.5),0 0 24px rgba(34,211,238,.16),0 0 26px rgba(251,191,36,.12);
}
@keyframes heroUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}

.hero-sub{
  margin-top:30px;max-width:540px;
  font-size:15px;line-height:1.78;color:#b8c7d8;font-weight:500;letter-spacing:var(--copy-tracking,0);
  text-align:left;
  text-wrap:pretty;
  animation:heroUp .9s .1s cubic-bezier(.16,1,.3,1) both;
}
.hero-sub strong{color:var(--text);font-weight:600}

.hero-ctas{display:flex;gap:12px;margin-top:34px;flex-wrap:wrap;animation:heroUp .9s .2s cubic-bezier(.16,1,.3,1) both}
.hero-pathways{
  position:absolute;z-index:11;left:var(--pad-x);right:var(--pad-x);bottom:34px;
  display:grid;
  grid-template-columns:minmax(180px,.7fr) repeat(3,minmax(0,1fr));
  margin:0;
  border-top:1px solid rgba(126,211,255,.2);
  border-bottom:1px solid rgba(126,211,255,.11);
  background:
    linear-gradient(90deg,rgba(34,211,238,.08),transparent 42%,rgba(251,191,36,.035)),
    rgba(3,9,18,.72);
  box-shadow:0 24px 58px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.035);
  backdrop-filter:blur(18px) saturate(130%);
  -webkit-backdrop-filter:blur(18px) saturate(130%);
  animation:heroUp .9s .28s cubic-bezier(.16,1,.3,1) both;
}
.hero-pathways-head{
  min-width:0;padding:16px 18px;
  display:flex;flex-direction:column;justify-content:center;gap:6px;
  border-right:1px solid rgba(255,255,255,.075);
}
.hero-pathways-head span{
  display:flex;align-items:center;gap:8px;
  color:var(--cyan);font-family:var(--f-mono);font-size:7px;font-weight:700;
  letter-spacing:.2em;text-transform:uppercase;
}
.hero-pathways-head span::before{
  content:'';width:6px;height:6px;border-radius:50%;background:var(--cyan);
  box-shadow:0 0 12px rgba(34,211,238,.9);
}
.hero-pathways-head strong{
  color:#edf8ff;font-family:var(--f-narrow);font-size:13px;font-weight:800;
  letter-spacing:.11em;text-transform:uppercase;
}
.hero-pathway{
  min-width:0;
  padding:16px 18px 15px;
  display:flex;
  flex-direction:column;
  gap:7px;
  position:relative;
  color:var(--text);
  text-decoration:none;
  border-left:1px solid rgba(255,255,255,.075);
  transition:background .2s ease,color .2s ease,transform .2s ease;
}
.hero-pathway::after{
  content:'↗';
  position:absolute;
  right:13px;
  top:12px;
  color:var(--muted);
  font-family:var(--f-mono);
  font-size:11px;
  transition:color .2s ease,transform .2s ease;
}
.hero-pathway:hover{
  background:linear-gradient(180deg,rgba(34,211,238,.09),rgba(34,211,238,.025));
  color:var(--cyan);
  transform:translateY(-3px);
}
.hero-pathway:hover::after{color:var(--cyan);transform:translate(2px,-2px)}
.hero-pathway-label{
  padding-right:20px;
  color:var(--cyan);
  font-family:var(--f-mono);
  font-size:8px;
  font-weight:700;
  letter-spacing:.17em;
  text-transform:uppercase;
}
.hero-pathway-value{
  max-width:22ch;
  color:inherit;
  font-family:var(--f-narrow);
  font-size:12px;
  font-weight:800;
  line-height:1.2;
  letter-spacing:.07em;
  text-transform:uppercase;
}
.btn{
  display:inline-flex;align-items:center;gap:10px;
  padding:15px 28px;
  font-family:var(--f-narrow);font-weight:800;font-size:13px;letter-spacing:var(--nav-tracking,.11em);
  text-transform:uppercase;text-decoration:none;cursor:pointer;
  transition:all .2s ease;white-space:nowrap;text-align:center;
}
.btn-primary{background:linear-gradient(135deg,var(--cyan),var(--cyan-2));color:var(--bg);border:1px solid rgba(255,255,255,.24);box-shadow:0 18px 40px rgba(34,211,238,.18),inset 0 1px 0 rgba(255,255,255,.28)}
.btn-primary:hover{background:linear-gradient(135deg,var(--cyan-2),#a5f3fc);box-shadow:0 18px 42px rgba(34,211,238,.28);transform:translateY(-2px)}
.btn-secondary{background:rgba(255,255,255,.035);color:var(--text);border:1px solid rgba(255,255,255,.14)}
.btn-secondary:hover{border-color:var(--cyan);color:var(--cyan);background:var(--cyan-soft)}
.btn-arrow{font-family:var(--f-mono);font-size:14px;transition:transform .2s ease}
.btn:hover .btn-arrow{transform:translateX(4px)}

/* Right column â€” logo composition */
.hero-right{
  position:absolute;z-index:2;top:72px;right:0;bottom:0;left:34%;
  display:flex;align-items:stretch;justify-content:stretch;
  pointer-events:none;
}
.hero-stage{
  position:relative;width:100%;height:100%;
  display:flex;align-items:center;justify-content:center;
  overflow:hidden;
  background:#030914;
  isolation:isolate;
  animation:heroStageReveal 1.1s .12s cubic-bezier(.16,1,.3,1) both;
}
.hero-stage::before{
  content:'';position:absolute;inset:0;z-index:1;
  background:
    linear-gradient(90deg,#030711 0%,rgba(3,7,17,.97) 4%,rgba(3,7,17,.74) 18%,rgba(3,7,17,.12) 46%,rgba(3,7,17,.08) 74%,rgba(3,7,17,.66) 100%),
    linear-gradient(180deg,rgba(3,8,16,.48) 0%,transparent 24%,rgba(3,8,16,.08) 58%,rgba(3,8,16,.92) 100%),
    radial-gradient(circle at 60% 43%,transparent 0%,rgba(2,7,15,.04) 36%,rgba(2,7,15,.44) 100%);
  pointer-events:none;
}
.hero-stage::after{
  content:'';position:absolute;z-index:7;top:9%;right:5%;bottom:18%;left:36%;
  border-top:1px solid rgba(103,232,249,.11);
  border-right:1px solid rgba(103,232,249,.08);
  border-bottom:1px solid rgba(251,191,36,.1);
  clip-path:polygon(7% 0,100% 0,100% 92%,93% 100%,0 100%,0 8%);
  pointer-events:none;
}

.hero-arena-img{
  position:absolute;inset:0;width:100%;height:100%;z-index:0;
  object-fit:cover;object-position:center 54%;
  filter:saturate(.9) contrast(1.08) brightness(.66);
  transform:scale(1.025);
}
.hero-stage-grid{
  position:absolute;inset:0;z-index:2;pointer-events:none;opacity:.22;
  background-image:
    linear-gradient(rgba(103,232,249,.08) 1px,transparent 1px),
    linear-gradient(90deg,rgba(103,232,249,.08) 1px,transparent 1px);
  background-size:64px 64px;
  mask-image:radial-gradient(ellipse at 64% 46%,black 0%,transparent 68%);
  -webkit-mask-image:radial-gradient(ellipse at 64% 46%,black 0%,transparent 68%);
}
.hero-stage-top{
  position:absolute;top:32px;left:42%;right:var(--pad-x);z-index:8;
  display:flex;align-items:center;justify-content:space-between;gap:18px;
}
.hero-stage-kicker,.hero-stage-code{
  display:inline-flex;align-items:center;gap:9px;
  font-family:var(--f-mono);font-size:9px;font-weight:700;
  letter-spacing:.18em;text-transform:uppercase;
}
.hero-stage-kicker{color:#b9f5ff}
.hero-stage-kicker::before{
  content:'';width:7px;height:7px;border-radius:50%;
  background:var(--cyan);box-shadow:0 0 15px rgba(34,211,238,.95);
}
.hero-stage-code{
  padding:8px 12px;color:#fef3c7;
  border:1px solid rgba(251,191,36,.25);
  background:rgba(4,10,19,.36);backdrop-filter:blur(12px);
}
.hero-logo-shell{
  position:absolute;left:65%;top:45%;z-index:5;
  width:min(46vw,620px);aspect-ratio:1;transform:translate(-50%,-50%);
  display:flex;align-items:center;justify-content:center;
}
.hero-logo-shell::before,.hero-logo-shell::after{
  content:'';position:absolute;border-radius:50%;pointer-events:none;
}
.hero-logo-shell::before{
  inset:0;border:1px solid rgba(103,232,249,.22);
  box-shadow:0 0 80px rgba(34,211,238,.13),inset 0 0 54px rgba(34,211,238,.055);
}
.hero-logo-shell::after{
  inset:11%;border:1px dashed rgba(251,191,36,.27);
  animation:heroOrbit 24s linear infinite;
}
.hero-logo-center{
  position:relative;width:61%;aspect-ratio:1;display:flex;align-items:center;justify-content:center;z-index:4;
  border-radius:50%;
  background:radial-gradient(circle,rgba(4,14,27,.64) 0%,rgba(3,10,19,.34) 54%,transparent 72%);
}
.hero-logo-img{
  width:100%;height:100%;object-fit:contain;
  filter:drop-shadow(0 20px 44px rgba(0,0,0,.72)) drop-shadow(0 0 30px rgba(34,211,238,.34)) drop-shadow(0 0 18px rgba(251,191,36,.1));
}
.hero-stage-side{
  position:absolute;right:26px;top:50%;z-index:8;
  display:flex;align-items:center;gap:10px;
  transform:translate(42%,-50%) rotate(90deg);
  transform-origin:center;
  color:rgba(185,245,255,.62);
  font-family:var(--f-mono);font-size:8px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;
}
.hero-stage-side::before{content:'';width:34px;height:1px;background:linear-gradient(90deg,transparent,var(--cyan))}
.hero-stage-signature{
  position:absolute;z-index:8;right:var(--pad-x);bottom:144px;
  width:min(390px,40vw);padding:15px 0 0 46px;
  border-top:1px solid rgba(126,211,255,.19);
  text-align:right;
}
.hero-stage-signature::before{
  content:'A';position:absolute;left:0;top:10px;
  color:rgba(185,245,255,.17);
  font-family:var(--f-display);font-size:44px;font-weight:700;line-height:1;
}
.hero-stage-signature span{
  display:block;color:var(--cyan);
  font-family:var(--f-mono);font-size:7px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;
}
.hero-stage-signature strong{
  display:block;margin-top:6px;color:#edf8ff;
  font-family:var(--f-narrow);font-size:clamp(15px,1.45vw,22px);font-weight:800;
  line-height:1.1;letter-spacing:.08em;text-transform:uppercase;
  text-shadow:0 12px 30px rgba(0,0,0,.72);
}
@keyframes heroStageReveal{from{opacity:0;transform:translateY(28px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes heroOrbit{to{transform:rotate(360deg)}}


.hero-mobile-logo{display:none}

/* Scroll indicator */
.hero-scroll{display:none}
.hero-scroll-line{width:1px;height:36px;background:linear-gradient(to bottom,transparent,var(--cyan));position:relative;overflow:hidden}
.hero-scroll-line::after{content:'';position:absolute;top:0;left:0;right:0;height:10px;background:var(--cyan);opacity:.55}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   TICKER / STATUS STRIP
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
.ticker{
  position:relative;
  display:flex;align-items:stretch;
  height:48px;overflow:hidden;
  background:linear-gradient(90deg,#0a1220 0%,#0e1828 100%);
  border-top:1px solid var(--line);border-bottom:1px solid var(--line);
}
.ticker-tag{
  display:flex;align-items:center;gap:10px;
  padding:0 20px;flex-shrink:0;
  background:var(--cyan);color:var(--bg);
  font-family:var(--f-narrow);font-weight:700;font-size:11px;letter-spacing:.2em;text-transform:uppercase;
  position:relative;z-index:2;
  clip-path:polygon(0 0,100% 0,calc(100% - 14px) 100%,0 100%);
  padding-right:30px;
}
.ticker-tag-dot{width:6px;height:6px;border-radius:50%;background:var(--bg);animation:navPulse 1.5s ease infinite}
.ticker-body{flex:1;overflow:hidden;position:relative;mask-image:linear-gradient(to right,transparent,black 40px,black calc(100% - 60px),transparent);-webkit-mask-image:linear-gradient(to right,transparent,black 40px,black calc(100% - 60px),transparent)}
.ticker-track{display:flex;animation:tickerSlide 50s linear infinite;width:max-content}
@keyframes tickerSlide{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.ticker-item{
  display:flex;align-items:center;gap:12px;
  padding:0 28px;height:48px;flex-shrink:0;
  font-family:var(--f-narrow);font-weight:600;font-size:13px;letter-spacing:.05em;color:var(--text-2);
  border-right:1px solid var(--line);text-transform:uppercase;
  line-height:1;
}
.ticker-item--match{
  display:grid;
  grid-template-columns:20px max-content minmax(46px,auto) max-content max-content;
  align-items:center;
  column-gap:12px;
}
.ticker-item--match > *{align-self:center}
.ticker-item .t-team{
  display:inline-flex;align-items:center;justify-content:center;
  min-height:14px;
  color:var(--text-2);
  line-height:1;
  transform:translateY(1px);
}
.ticker-item .t-team.me{
  color:#94f3ff;
  text-shadow:0 0 10px rgba(34,211,238,.34),0 0 22px rgba(34,211,238,.18);
}
.ticker-item .t-score{
  display:inline-flex;align-items:center;justify-content:center;
  min-width:46px;
  min-height:18px;
  font-family:var(--f-display);font-weight:800;font-size:15px;color:var(--text);letter-spacing:0;line-height:1;
  padding:0;
  transform:translateY(2px);
}
.ticker-result{
  width:20px;height:20px;display:flex;align-items:center;justify-content:center;
  font-family:var(--f-narrow);font-weight:800;font-size:9px;color:#fff;flex-shrink:0;
}
.ticker-result.w{background:var(--win)}
.ticker-result.l{background:var(--loss)}
.ticker-result.d{background:var(--draw)}
.ticker-meta{
  display:inline-flex;align-items:center;
  min-height:14px;
  color:var(--muted);font-size:11px;letter-spacing:.12em;line-height:1;white-space:nowrap;
  transform:translateY(1px);
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   STANDINGS
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   STANDINGS â€” broadcast-style redesign
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
.standings{
  background:var(--bg);
  border-top:1px solid var(--line);
  padding:0;
}
.st-wrap{position:relative;overflow:hidden}

/* Topbar */
.st-topbar{
  display:flex;align-items:center;justify-content:space-between;
  padding:11px var(--pad-x);
  border-bottom:1px solid var(--line);
  background:
    linear-gradient(90deg,rgba(34,211,238,.12),transparent 72%),
    rgba(255,255,255,.012);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.03);
}
.st-topbar-left{display:flex;align-items:center;gap:14px}
.st-comp{font-family:var(--f-narrow);font-weight:700;font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:var(--cyan)}
.st-sep{width:1px;height:12px;background:var(--line-2)}
.st-season{font-family:var(--f-mono);font-size:10px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
.st-live{
  display:inline-flex;align-items:center;gap:7px;padding:4px 11px;
  border:1px solid var(--cyan-edge);
  background:linear-gradient(180deg,rgba(34,211,238,.16),rgba(34,211,238,.06));
  box-shadow:0 0 16px rgba(34,211,238,.1),inset 0 1px 0 rgba(255,255,255,.04);
  font-family:var(--f-mono);font-size:9px;font-weight:500;letter-spacing:.18em;text-transform:uppercase;color:var(--cyan);
}
.st-live-dot{width:5px;height:5px;border-radius:50%;background:var(--cyan);box-shadow:0 0 8px var(--cyan);animation:navPulse 1.6s ease infinite}
.st-live--locked{border-color:rgba(255,255,255,.12);background:linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.025));color:var(--text-2)}
.st-live--locked .st-live-dot{background:var(--muted);box-shadow:0 0 8px rgba(100,116,139,.35);animation:none}

.st-season-filter{
  display:flex;align-items:center;justify-content:space-between;gap:18px;
  padding:14px var(--pad-x);
  border-bottom:1px solid var(--line);
  background:
    linear-gradient(90deg,rgba(255,255,255,.025),transparent 58%),
    rgba(0,0,0,.18);
}
.st-season-filter-label{
  font-family:var(--f-mono);font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);
}
.st-season-tabs{display:flex;align-items:center;gap:8px;overflow-x:auto;-webkit-overflow-scrolling:touch}
.st-season-tab{
  border:1px solid rgba(255,255,255,.1);
  background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.012));
  color:var(--text-2);
  padding:8px 14px;
  font-family:var(--f-narrow);font-size:12px;font-weight:800;letter-spacing:var(--nav-tracking,.1em);text-transform:uppercase;
  cursor:pointer;white-space:nowrap;
  transition:border-color .2s ease,background .2s ease,color .2s ease,box-shadow .2s ease,transform .15s ease;
}
.st-season-tab:hover{border-color:var(--cyan-edge);color:var(--cyan);background:var(--cyan-soft)}
.st-season-tab.active{
  border-color:var(--cyan);
  color:var(--bg);
  background:linear-gradient(135deg,var(--cyan),var(--cyan-2));
  box-shadow:0 12px 28px rgba(34,211,238,.18);
}

/* Hero header â€” title left, kpis right on same line */
.st-hero{
  display:flex;align-items:center;justify-content:space-between;gap:32px;
  padding:44px var(--pad-x) 40px;
  border-bottom:1px solid var(--line);
  background:
    radial-gradient(circle at top right,rgba(34,211,238,.1),transparent 34%),
    linear-gradient(135deg,rgba(34,211,238,.07) 0%,transparent 55%);
  flex-wrap:wrap;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.03);
}
.st-hero-title{
  font-family:var(--f-display);font-weight:700;
  font-size:clamp(34px,4.8vw,72px);
  line-height:1;letter-spacing:.006em;text-transform:uppercase;
  color:var(--text);
}
.st-hero-title em{font-style:normal;color:var(--cyan)}

/* KPIs â€” compact horizontal right side */
.st-kpis{
  display:flex;align-items:stretch;gap:0;
  flex-shrink:0;
  background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.01));
  border:1px solid rgba(255,255,255,.06);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.04),0 14px 30px rgba(0,0,0,.14);
}
.st-kpi{
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  padding:10px 36px 8px;
  border-left:1px solid var(--line);
  min-width:120px;white-space:nowrap;
  position:relative;
  background:linear-gradient(180deg,rgba(255,255,255,.02),transparent);
}
.st-kpi:first-child{border-left:none}
.st-kpi::after{
  content:'';position:absolute;left:20%;right:20%;bottom:0;height:1px;
  background:linear-gradient(90deg,transparent,rgba(34,211,238,.2),transparent);
  opacity:.5;
}
.st-kpi--loading .st-kpi-val{opacity:.4;animation:stPulse 1.4s ease infinite}
@keyframes stPulse{0%,100%{opacity:.4}50%{opacity:.15}}

.st-kpi-val{
  font-family:var(--f-display);font-weight:900;
  font-size:clamp(28px,3vw,46px);
  line-height:1;color:var(--text);letter-spacing:-.04em;
  display:flex;align-items:flex-start;justify-content:center;gap:4px;
}
.st-kpi:first-child .st-kpi-val{color:var(--cyan);text-shadow:0 0 24px rgba(34,211,238,.4)}
.st-kpi-main{line-height:.92}
.st-kpi-unit{
  align-self:flex-start;
  margin-top:.18em;
  padding:2px 0 0;
  font-style:normal;color:var(--cyan);
  font-family:var(--f-mono);font-weight:700;
  font-size:clamp(10px,1vw,13px);letter-spacing:.08em;line-height:1;
  text-transform:uppercase;opacity:.88;
}
.st-kpi:first-child .st-kpi-unit{opacity:.72}
.st-kpi-lbl{
  font-family:var(--f-mono);font-size:9px;font-weight:500;
  letter-spacing:.2em;text-transform:uppercase;color:var(--muted);
  margin-top:10px;
}

/* Table */
.st-table-wrap{
  background:
    radial-gradient(circle at top right,rgba(34,211,238,.08),transparent 30%),
    linear-gradient(180deg,rgba(255,255,255,.02),transparent 30%),
    var(--surface-0);
  overflow:hidden;position:relative;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.03),0 18px 40px rgba(0,0,0,.16);
}
.st-table-wrap::before{
  content:'';position:absolute;top:0;left:0;right:0;height:1px;
  background:linear-gradient(90deg,transparent,rgba(34,211,238,.45),transparent);
  opacity:.35;pointer-events:none;
}
.st-table-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}
.st-hdr,.st-row{
  display:grid;
  grid-template-columns:72px minmax(240px,1fr) 62px 62px 62px 62px 88px 120px 90px;
  align-items:center;padding:0 var(--pad-x);min-width:760px;
}
.st-hdr{
  padding-top:16px;padding-bottom:16px;
  background:
    linear-gradient(90deg,rgba(34,211,238,.08),transparent 80%),
    rgba(0,0,0,.3);
  border-bottom:1px solid var(--line);
}
.st-hdr-cell{
  font-family:var(--f-mono);font-size:10px;font-weight:500;letter-spacing:.18em;
  text-transform:uppercase;color:var(--muted);text-align:center;
}
.st-hdr-cell.left{text-align:left}
.st-row{
  min-height:80px;border-bottom:1px solid rgba(255,255,255,.04);
  transition:background .15s ease;position:relative;
}
.st-row:last-child{border-bottom:none}
.st-row:hover{
  background:
    linear-gradient(90deg,rgba(255,255,255,.035),rgba(255,255,255,.015));
}
.st-row.me{
  min-height:100px;
  background:
    radial-gradient(circle at right center,rgba(34,211,238,.12),transparent 32%),
    linear-gradient(90deg,rgba(34,211,238,.14) 0%,rgba(34,211,238,.06) 45%,rgba(34,211,238,.02) 100%);
  border-top:1px solid rgba(34,211,238,.2);
  border-bottom:1px solid rgba(34,211,238,.2);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.04),inset 0 -1px 0 rgba(255,255,255,.02);
}
.st-row.me::before{
  content:'';position:absolute;left:0;top:0;bottom:0;width:4px;
  background:linear-gradient(to bottom,var(--cyan-2),var(--cyan));
  box-shadow:0 0 18px rgba(34,211,238,.4);
}
.st-rank{
  font-family:var(--f-display);font-weight:900;font-size:26px;
  color:var(--muted);text-align:center;letter-spacing:-.02em;
}
.st-row.me .st-rank{font-size:38px;color:var(--cyan);text-shadow:0 0 20px rgba(34,211,238,.4)}
.st-club{display:flex;align-items:center;gap:16px}
.club-badge-logo{width:72%;height:72%;display:block;object-fit:contain}
.st-badge{
  width:46px;height:46px;
  background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.015));
  border:1px solid var(--line-2);
  display:flex;align-items:center;justify-content:center;
  font-family:var(--f-narrow);font-weight:800;font-size:12px;color:var(--text-2);flex-shrink:0;
  border-radius:2px;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.03);
}
.st-badge.me{
  width:54px;height:54px;font-size:14px;
  border-color:var(--cyan);color:var(--cyan);background:var(--cyan-soft);
  box-shadow:0 0 16px rgba(34,211,238,.28),inset 0 0 16px rgba(34,211,238,.1);
  border-radius:50%;
}
.st-badge.me .club-badge-logo{width:80%;height:80%;filter:drop-shadow(0 0 14px rgba(34,211,238,.25))}
.st-club-name{
  font-family:var(--f-narrow);font-weight:600;font-size:16px;
  letter-spacing:.06em;text-transform:uppercase;color:var(--text-2);
}
.st-row.me .st-club-name{font-weight:800;font-size:20px;color:var(--text)}
.st-cell{
  font-family:var(--f-display);font-weight:700;font-size:20px;
  color:var(--text-2);text-align:center;letter-spacing:-.01em;
  text-shadow:0 0 10px rgba(255,255,255,.04);
}
.st-cell.gd-pos{color:var(--win)}
.st-cell.gd-neg{color:var(--loss)}
.st-form{display:flex;align-items:center;justify-content:center;gap:6px}
.st-form-dot{width:12px;height:12px;flex-shrink:0;border-radius:50%}
.st-form-dot.w{background:var(--win);box-shadow:0 0 8px rgba(16,185,129,.5)}
.st-form-dot.l{background:var(--loss);box-shadow:0 0 8px rgba(239,68,68,.28)}
.st-form-dot.d{background:var(--muted);box-shadow:0 0 8px rgba(100,116,139,.18)}
.st-row.me .st-form-dot{width:14px;height:14px}
.st-pts{
  font-family:var(--f-display);font-weight:900;font-size:28px;
  color:var(--text);text-align:center;letter-spacing:-.03em;
  text-shadow:0 0 14px rgba(255,255,255,.08);
}
.st-row.me .st-pts{font-size:38px;color:var(--cyan);text-shadow:0 0 24px rgba(34,211,238,.45)}

.st-foot{
  display:flex;align-items:center;justify-content:space-between;
  padding:14px var(--pad-x);border-top:1px solid var(--line);
  background:
    linear-gradient(90deg,rgba(34,211,238,.06),transparent 72%),
    rgba(0,0,0,.15);
  flex-wrap:wrap;gap:8px;
}
.st-foot-note{font-family:var(--f-mono);font-size:10px;font-weight:500;letter-spacing:.16em;text-transform:uppercase;color:var(--muted)}
.st-foot-link{font-family:var(--f-mono);font-size:10px;font-weight:500;letter-spacing:.16em;text-transform:uppercase;color:var(--cyan);text-decoration:none;display:inline-flex;align-items:center;gap:5px;transition:opacity .2s}
.st-foot-link:hover{opacity:.7}


/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   RESULTS
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
.results-grid{display:flex;flex-direction:column;gap:10px}
.res-card{
  position:relative;
  background:
    radial-gradient(circle at top right,rgba(34,211,238,.07),transparent 34%),
    linear-gradient(180deg,rgba(255,255,255,.025),transparent 42%),
    var(--surface-1);
  border:1px solid var(--line);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.03),0 14px 34px rgba(0,0,0,.16);
  overflow:hidden;transition:background .2s ease,border-color .2s ease,box-shadow .2s ease;
}
.res-card::before{
  content:'';position:absolute;left:0;top:0;bottom:0;width:3px;
}
.res-card::after{
  content:'';position:absolute;inset:auto -18% -58% auto;width:220px;height:220px;border-radius:50%;
  background:radial-gradient(circle,rgba(34,211,238,.12),transparent 68%);
  opacity:.35;pointer-events:none;transition:opacity .2s ease,transform .2s ease;
}
.res-card.w::before{background:var(--win);box-shadow:0 0 20px rgba(16,185,129,.25)}
.res-card.l::before{background:var(--loss);box-shadow:0 0 20px rgba(239,68,68,.18)}
.res-card.d::before{background:var(--draw);box-shadow:0 0 20px rgba(100,116,139,.16)}
.res-card:hover{background:var(--surface-2);border-color:var(--line-2);box-shadow:0 14px 40px rgba(0,0,0,.28),0 0 28px rgba(34,211,238,.07),inset 0 1px 0 rgba(255,255,255,.04)}
.res-card:hover::after{opacity:.7;transform:translateY(-6px)}

.res-desk{
  display:grid;grid-template-columns:180px 1fr 130px 1fr 130px;
  align-items:center;min-height:84px;
}
.res-meta{
  padding:0 24px 0 28px;
  background:linear-gradient(90deg,rgba(34,211,238,.06),transparent 70%);
}
.res-gw{font-family:var(--f-mono);font-size:10px;font-weight:500;letter-spacing:.2em;text-transform:uppercase;color:var(--cyan)}
.res-comp{font-family:var(--f-narrow);font-weight:600;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--text-2);margin-top:4px}
.res-date{font-family:var(--f-mono);font-size:11px;font-weight:400;color:var(--muted);margin-top:4px}

.res-team{display:flex;align-items:center;gap:14px;padding:0 20px;min-width:0}
.res-team.home{justify-content:flex-end}
.res-team-info{display:flex;flex-direction:column;gap:3px}
.res-team.home .res-team-info{text-align:right;align-items:flex-end}
.res-team.away .res-team-info{text-align:left;align-items:flex-start}
.res-badge{
  width:38px;height:38px;
  background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.015));
  border:1px solid var(--line-2);
  display:flex;align-items:center;justify-content:center;
  font-family:var(--f-narrow);font-weight:800;font-size:11px;color:var(--text-2);flex-shrink:0;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.03);
}
.res-badge.me{border-color:var(--cyan);color:var(--cyan);background:var(--cyan-soft);box-shadow:0 0 12px rgba(34,211,238,.15)}
.res-badge.me .club-badge-logo{width:76%;height:76%;filter:drop-shadow(0 0 10px rgba(34,211,238,.22))}
.res-name{
  font-family:var(--f-narrow);font-weight:700;font-size:15px;letter-spacing:.04em;text-transform:uppercase;color:var(--text);line-height:1.15;
  overflow-wrap:anywhere;
}
.res-venue{font-family:var(--f-mono);font-size:9px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}

.res-score{
  display:flex;align-items:center;justify-content:center;gap:8px;
  position:relative;
  background:linear-gradient(180deg,rgba(255,255,255,.025),transparent);
}
.res-score::before,.res-score::after{
  content:'';position:absolute;top:14px;bottom:14px;width:1px;
  background:linear-gradient(to bottom,transparent,rgba(34,211,238,.24),transparent);
  box-shadow:0 0 12px rgba(34,211,238,.1);
}
.res-score::before{left:0}
.res-score::after{right:0}
.res-score-val{
  font-family:var(--f-display);font-weight:800;font-size:34px;color:var(--text);line-height:1;letter-spacing:-.03em;min-width:28px;text-align:center;
  text-shadow:0 0 14px rgba(255,255,255,.08);
}
.res-score-sep{font-family:var(--f-display);font-weight:400;font-size:22px;color:var(--dim);text-shadow:0 0 10px rgba(34,211,238,.1)}

.res-pill-col{display:flex;align-items:center;justify-content:flex-start;padding:0 24px 0 14px}
.res-pill{
  display:inline-flex;align-items:center;gap:7px;
  padding:6px 12px;
  font-family:var(--f-mono);font-size:10px;font-weight:500;letter-spacing:.16em;text-transform:uppercase;
}
.res-pill.w{background:linear-gradient(180deg,rgba(16,185,129,.16),rgba(16,185,129,.06));border:1px solid rgba(16,185,129,.28);color:var(--win);box-shadow:0 0 18px rgba(16,185,129,.1)}
.res-pill.l{background:linear-gradient(180deg,rgba(239,68,68,.16),rgba(239,68,68,.06));border:1px solid rgba(239,68,68,.28);color:var(--loss);box-shadow:0 0 18px rgba(239,68,68,.08)}
.res-pill.d{background:linear-gradient(180deg,rgba(100,116,139,.16),rgba(100,116,139,.06));border:1px solid rgba(100,116,139,.28);color:var(--draw);box-shadow:0 0 18px rgba(100,116,139,.08)}
.res-pill-dot{width:5px;height:5px;border-radius:50%;background:currentColor}

.res-mob{display:none}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   FIXTURES
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
.fix-grid{display:flex;flex-direction:column;gap:10px}
.fix-card{
  position:relative;
  display:grid;grid-template-columns:130px 1px 1fr 1px 170px;
  align-items:stretch;
  background:
    radial-gradient(circle at top right,rgba(34,211,238,.08),transparent 34%),
    linear-gradient(180deg,rgba(255,255,255,.02),transparent 42%),
    var(--surface-1);
  border:1px solid var(--line);
  min-height:104px;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.03),0 14px 34px rgba(0,0,0,.18);
  transition:all .25s ease;overflow:hidden;
}
.fix-card::before{
  content:'';position:absolute;left:0;top:0;bottom:0;width:2px;
  background:var(--cyan);opacity:0;transition:opacity .25s ease;
}
.fix-card::after{
  content:'';position:absolute;inset:auto -20% -55% auto;width:220px;height:220px;border-radius:50%;
  background:radial-gradient(circle,rgba(34,211,238,.14),transparent 68%);
  opacity:.45;pointer-events:none;transition:opacity .25s ease,transform .25s ease;
}
.fix-card:hover{background:var(--surface-2);border-color:var(--cyan-edge);box-shadow:0 12px 40px rgba(0,0,0,.35),0 0 30px rgba(34,211,238,.08),inset 0 1px 0 rgba(255,255,255,.04)}
.fix-card:hover::before{opacity:1}
.fix-card:hover::after{opacity:.8;transform:translateY(-6px)}

.fix-date{
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  padding:14px 24px 4px;gap:2px;
  background:
    linear-gradient(135deg,rgba(34,211,238,.08),transparent 72%),
    linear-gradient(180deg,rgba(255,255,255,.03),transparent);
}
.fix-day{font-family:var(--f-display);font-weight:700;font-size:38px;line-height:1;color:var(--cyan);letter-spacing:-.015em;text-shadow:0 0 18px rgba(34,211,238,.2)}
.fix-month{font-family:var(--f-narrow);font-weight:700;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--text-2)}
.fix-gw{
  font-family:var(--f-mono);font-size:9px;font-weight:500;letter-spacing:.18em;text-transform:uppercase;
  color:var(--muted);margin-top:4px;
}

.fix-divider{width:1px;background:var(--line)}

.fix-match{
  display:grid;grid-template-columns:1fr 64px 1fr;
  align-items:center;padding:0 28px;
}
.fix-team{display:flex;align-items:center;gap:14px;min-width:0}
.fix-team.home{justify-content:flex-end}
.fix-team.away{justify-content:flex-start}
.fix-team-name{
  font-family:var(--f-narrow);font-weight:700;font-size:17px;letter-spacing:.04em;text-transform:uppercase;color:var(--text);line-height:1.15;
  min-width:0;overflow-wrap:anywhere;
}
.fix-badge{
  width:50px;height:50px;
  background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.01));
  border:1px solid var(--line-2);
  display:flex;align-items:center;justify-content:center;
  font-family:var(--f-narrow);font-weight:800;font-size:13px;color:var(--text-2);flex-shrink:0;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.03);
  transition:all .22s ease;
}
.fix-badge.me{border-color:var(--cyan);color:var(--cyan);background:var(--cyan-soft);box-shadow:0 0 14px rgba(34,211,238,.18),inset 0 0 20px rgba(34,211,238,.05)}
.fix-badge.me .club-badge-logo{width:78%;height:78%;filter:drop-shadow(0 0 12px rgba(34,211,238,.22))}

.fix-vs{
  display:flex;align-items:center;justify-content:center;position:relative;
}
.fix-vs-line{
  position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:52px;height:1px;
  background:linear-gradient(90deg,transparent,rgba(34,211,238,.45),transparent);
  box-shadow:0 0 12px rgba(34,211,238,.18);
}
.fix-vs-text{
  position:relative;z-index:2;
  font-family:var(--f-display);font-weight:800;font-size:12px;letter-spacing:.18em;color:var(--muted);
  background:var(--surface-1);padding:0 10px;
  text-shadow:0 0 12px rgba(34,211,238,.16);
  transition:background .25s ease,color .25s ease;
}
.fix-card:hover .fix-vs-text{background:var(--surface-2)}
.fix-card:hover .fix-vs-text{color:var(--cyan)}

.fix-meta{
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  padding:0 22px;gap:2px;
  background:linear-gradient(180deg,rgba(255,255,255,.02),transparent);
}
.fix-time{font-family:var(--f-display);font-weight:700;font-size:22px;color:var(--text);line-height:1;letter-spacing:-.01em;text-shadow:0 0 14px rgba(255,255,255,.08)}
.fix-tz{font-family:var(--f-mono);font-size:9px;font-weight:500;letter-spacing:.18em;text-transform:uppercase;color:var(--muted)}
.fix-venue{
  margin-top:6px;padding:4px 12px;
  font-family:var(--f-mono);font-size:9px;font-weight:500;letter-spacing:.18em;text-transform:uppercase;
}
.fix-venue.home{
  background:linear-gradient(180deg,rgba(34,211,238,.16),rgba(34,211,238,.07));
  border:1px solid var(--cyan-edge);color:var(--cyan);
  box-shadow:0 0 16px rgba(34,211,238,.12);
}
.fix-venue.away{
  background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.02));
  border:1px solid var(--line-2);color:var(--text-2);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.03);
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SQUAD
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
.squad{
  background:
    radial-gradient(ellipse at 50% 0%,rgba(34,211,238,.13),transparent 42%),
    radial-gradient(circle at 12% 22%,rgba(27,74,116,.24),transparent 34%),
    linear-gradient(180deg,#060b14 0%,#08111f 44%,#05080f 100%);
  border-top:1px solid rgba(126,211,255,.13);
  border-bottom:1px solid rgba(126,211,255,.1);
  position:relative;overflow:hidden;
  isolation:isolate;
}
.squad::before{
  content:'';position:absolute;inset:0;
  background:
    linear-gradient(115deg,transparent 0 18%,rgba(255,255,255,.028) 18% 18.4%,transparent 18.4% 43%,rgba(34,211,238,.04) 43% 43.3%,transparent 43.3%),
    repeating-linear-gradient(90deg,rgba(255,255,255,.022) 0 1px,transparent 1px 72px);
  mask-image:linear-gradient(to bottom,rgba(0,0,0,.9),rgba(0,0,0,.25) 54%,transparent);
  pointer-events:none;
  z-index:-1;
}
.squad::after{
  content:'ALTAIR';
  position:absolute;right:-.08em;top:28px;
  font-family:var(--f-display);font-size:clamp(96px,18vw,260px);font-weight:900;line-height:1;
  letter-spacing:.05em;color:rgba(255,255,255,.025);
  pointer-events:none;z-index:-1;
}
.squad .sec-hdr{
  padding:28px;
  margin-bottom:24px;
  background:
    radial-gradient(circle at 88% 8%,rgba(34,211,238,.13),transparent 34%),
    linear-gradient(180deg,rgba(255,255,255,.055),rgba(255,255,255,.018));
  border:1px solid rgba(126,211,255,.14);
  box-shadow:0 24px 70px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.04);
}
.squad-filter{
  display:flex;align-items:center;gap:8px;flex-wrap:wrap;
  margin:0 0 28px;
}
.squad-filter-btn{
  min-height:38px;
  padding:0 15px;
  border:1px solid rgba(126,211,255,.13);
  background:linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.012));
  color:var(--text-2);
  font-family:var(--f-narrow);font-weight:800;font-size:12px;letter-spacing:var(--nav-tracking,.1em);text-transform:uppercase;
  cursor:pointer;
  text-align:center;line-height:1.1;
  transition:transform .18s ease,border-color .22s ease,background .22s ease,color .22s ease,box-shadow .22s ease;
}
.squad-filter-btn:hover,
.squad-filter-btn:focus-visible{
  color:var(--text);
  border-color:var(--cyan-edge);
  background:linear-gradient(180deg,rgba(34,211,238,.12),rgba(34,211,238,.035));
  box-shadow:0 0 0 3px rgba(34,211,238,.08);
}
.squad-filter-btn.active{
  color:var(--bg);
  border-color:var(--cyan);
  background:linear-gradient(180deg,var(--cyan),var(--cyan-deep));
  box-shadow:0 12px 30px rgba(34,211,238,.2);
}
.pos-section{margin-bottom:54px}
.pos-section:last-child{margin-bottom:0}
.pos-label{
  display:flex;align-items:center;gap:14px;
  padding:0 0 16px;margin-bottom:22px;
  border-bottom:1px solid rgba(126,211,255,.12);
}
.pos-pill{
  display:inline-flex;align-items:center;justify-content:center;
  min-width:42px;height:28px;padding:0 10px;
  background:linear-gradient(180deg,rgba(34,211,238,.18),rgba(34,211,238,.05));border:1px solid var(--cyan-edge);
  font-family:var(--f-mono);font-size:10px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--cyan);
  box-shadow:0 0 22px rgba(34,211,238,.1),inset 0 1px 0 rgba(255,255,255,.05);
}
.pos-group-name{font-family:var(--f-narrow);font-weight:800;font-size:14px;letter-spacing:var(--nav-tracking,.1em);text-transform:uppercase;color:var(--text-2)}
.pos-count{margin-left:auto;font-family:var(--f-mono);font-size:11px;font-weight:600;letter-spacing:var(--label-tracking,.1em);text-transform:uppercase;color:var(--muted)}

.squad-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:22px;align-items:stretch}

.p-card{
  position:relative;display:flex;flex-direction:column;text-decoration:none;color:inherit;
  height:520px;
  background:
    radial-gradient(circle at 82% 0%,rgba(34,211,238,.22),transparent 34%),
    radial-gradient(circle at 8% 100%,rgba(59,130,246,.16),transparent 35%),
    linear-gradient(160deg,rgba(255,255,255,.08),rgba(255,255,255,.018) 36%,rgba(3,8,16,.92)),
    #07101d;
  border:1px solid rgba(126,211,255,.18);
  border-radius:28px;
  overflow:hidden;
  box-shadow:0 24px 70px rgba(0,0,0,.42),0 1px 0 rgba(255,255,255,.075) inset;
  transition:transform .32s cubic-bezier(.16,1,.3,1),border-color .25s ease,box-shadow .32s ease,background .32s ease;
}
.p-card::before{
  content:'';position:absolute;left:14px;right:14px;top:0;height:1px;
  background:linear-gradient(90deg,transparent,var(--cyan),transparent);
  opacity:.55;transform:scaleX(.4);transition:transform .3s ease,opacity .3s ease;
  z-index:4;
}
.p-card::after{
  content:'';position:absolute;inset:0;
  background:
    linear-gradient(135deg,transparent 0 48%,rgba(255,255,255,.05) 48.4%,transparent 49.2%),
    repeating-linear-gradient(0deg,transparent 0 9px,rgba(255,255,255,.018) 9px 10px);
  opacity:.46;pointer-events:none;transition:opacity .3s ease;
}
.p-card:hover,
.p-card:focus-visible{
  transform:translateY(-8px);
  border-color:rgba(103,232,249,.56);
  box-shadow:0 28px 70px rgba(0,0,0,.52),0 0 42px rgba(34,211,238,.18),0 1px 0 rgba(255,255,255,.08) inset;
  outline:none;
}
.p-card:hover::before,
.p-card:focus-visible::before{transform:scaleX(1);opacity:1}
.p-card:hover::after,
.p-card:focus-visible::after{opacity:.78}

.p-top{
  position:relative;height:282px;flex:0 0 282px;
  background:
    radial-gradient(circle at 50% 26%,rgba(34,211,238,.3) 0%,transparent 50%),
    radial-gradient(ellipse at 50% 104%,rgba(255,255,255,.08),transparent 44%),
    linear-gradient(160deg,#162947 0%,#07111f 62%,#030711 100%);
  display:flex;align-items:center;justify-content:center;overflow:hidden;
}
.p-top::before{
  content:'';position:absolute;inset:0;
  background:
    radial-gradient(ellipse at 50% 100%,rgba(34,211,238,.12),transparent 52%),
    linear-gradient(180deg,rgba(255,255,255,.06),transparent 34%,rgba(0,0,0,.18));
  pointer-events:none;
}
.p-top::after{
  content:'ALTAIR';position:absolute;left:50%;top:52%;transform:translate(-50%,-50%) rotate(-8deg);
  font-family:var(--f-display);font-size:74px;font-weight:700;line-height:1;color:rgba(255,255,255,.035);letter-spacing:.16em;
  text-shadow:0 0 50px rgba(34,211,238,.14);
  pointer-events:none;
}
.p-number{
  position:absolute;bottom:-18px;right:12px;
  font-family:var(--f-display);font-weight:900;font-size:112px;line-height:.85;
  color:rgba(216,228,239,.11);letter-spacing:-.065em;
  text-shadow:0 0 22px rgba(34,211,238,.1);
  user-select:none;pointer-events:none;z-index:1;
}
.p-pos{
  position:absolute;top:14px;left:14px;z-index:3;
  min-width:48px;height:34px;display:inline-flex;align-items:center;justify-content:center;
  padding:0 12px;border-radius:999px;
  background:linear-gradient(180deg,rgba(103,232,249,.96),rgba(8,145,178,.9));
  color:#04111b;
  border:1px solid rgba(255,255,255,.22);
  box-shadow:0 0 22px rgba(34,211,238,.22);
  font-family:var(--f-display);font-weight:900;font-size:17px;letter-spacing:.04em;
}
.p-tags{
  position:absolute;left:14px;right:14px;bottom:14px;z-index:3;
  display:flex;align-items:center;gap:7px;flex-wrap:wrap;
}
.p-tag{
  display:inline-flex;align-items:center;min-height:24px;padding:0 9px;
  background:
    linear-gradient(180deg,rgba(4,11,20,.72),rgba(4,11,20,.42));
  border:1px solid rgba(126,211,255,.18);
  color:var(--text-2);
  font-family:var(--f-mono);font-size:8px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;
  backdrop-filter:blur(10px);
}
.p-tag--captain{
  border-color:rgba(34,211,238,.44);
  color:var(--cyan);
  box-shadow:0 0 16px rgba(34,211,238,.12);
}
.p-flag{
  position:absolute;top:16px;right:16px;z-index:3;font-size:18px;
  filter:drop-shadow(0 2px 6px rgba(0,0,0,.5)) drop-shadow(0 0 10px rgba(255,255,255,.08));
}
.p-media{position:relative;z-index:2;display:flex;align-items:center;justify-content:center}
.p-avatar{
  width:112px;height:112px;border-radius:50%;
  background:
    radial-gradient(circle at 35% 26%,rgba(255,255,255,.14),transparent 30%),
    radial-gradient(circle at 50% 100%,rgba(34,211,238,.18),transparent 56%),
    linear-gradient(135deg,#10223d,#071020);
  border:2px solid var(--cyan-edge);
  display:flex;align-items:center;justify-content:center;
  font-family:var(--f-display);font-weight:900;font-size:32px;color:var(--cyan);
  box-shadow:0 0 38px rgba(34,211,238,.18),0 18px 36px rgba(0,0,0,.34);
}
.p-avatar span{transform:translateY(2px)}
.p-avatar::after{
  content:'';position:absolute;width:42px;height:4px;border-radius:999px;bottom:24px;
  background:linear-gradient(90deg,transparent,rgba(34,211,238,.6),transparent);
  filter:blur(2px);
}
.p-avatar-img{
  width:198px;height:224px;object-fit:cover;object-position:center 18%;
  border:1px solid rgba(126,211,255,.28);border-radius:18px;
  box-shadow:0 0 42px rgba(34,211,238,.18),0 24px 48px rgba(0,0,0,.42);
  filter:saturate(1.04) contrast(1.03);
}

.p-body{
  position:relative;z-index:2;
  display:flex;flex-direction:column;flex:1;
  padding:20px 20px 0;
  background:
    linear-gradient(180deg,rgba(255,255,255,.055),rgba(255,255,255,.018) 44%,rgba(4,10,20,.22) 100%);
  border-top:1px solid rgba(255,255,255,.08);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.05);
}
.p-kicker{
  font-family:var(--f-mono);font-size:10px;font-weight:700;letter-spacing:var(--label-tracking,.13em);text-transform:uppercase;color:var(--cyan);margin-bottom:8px;text-align:center;
  text-shadow:0 0 10px rgba(34,211,238,.14);
}
.p-ign{
  font-family:var(--f-display);font-weight:800;font-size:clamp(30px,2.8vw,40px);letter-spacing:var(--display-tracking,.004em);text-transform:uppercase;line-height:1.02;color:var(--text);
  text-shadow:0 0 12px rgba(255,255,255,.05);
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center;
}
.p-name{
  min-height:34px;margin-top:8px;
  font-family:var(--f-body);font-weight:700;font-size:13px;letter-spacing:.035em;text-transform:uppercase;line-height:1.38;color:#b9c5d7;text-align:center;
  overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;
}

.p-stats{
  display:grid;grid-template-columns:1fr 1fr 1fr;
  margin-top:auto;margin-inline:-20px;
  border-top:1px solid rgba(34,211,238,.14);
  background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.01));
}
.p-stat{
  padding:14px 8px 15px;text-align:center;
  border-right:1px solid rgba(255,255,255,.06);
  background:
    linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.01)),
    linear-gradient(135deg,rgba(255,255,255,.015),transparent 70%);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.02);
}
.p-stat:last-child{border-right:none}
.p-stat-val{
  font-family:var(--f-display);font-weight:800;font-size:25px;color:var(--text);line-height:1;letter-spacing:-.01em;
  text-shadow:0 0 12px rgba(255,255,255,.07),0 0 18px rgba(34,211,238,.06);
}
.p-stat-lbl{
  font-family:var(--f-mono);font-size:9px;font-weight:600;letter-spacing:var(--label-tracking,.1em);text-transform:uppercase;color:var(--muted);margin-top:6px;
}
.p-profile{
  display:flex;align-items:center;justify-content:space-between;gap:12px;
  min-height:46px;padding:0 16px;margin:0 -20px;
  border-top:1px solid rgba(255,255,255,.07);
  color:var(--cyan);
  font-family:var(--f-narrow);font-size:12px;font-weight:800;letter-spacing:var(--nav-tracking,.1em);text-transform:uppercase;
  background:linear-gradient(90deg,rgba(34,211,238,.08),rgba(255,255,255,.02));
}
.p-card:hover .p-profile,
.p-card:focus-visible .p-profile{background:linear-gradient(90deg,rgba(34,211,238,.16),rgba(255,255,255,.035))}
.squad-cta{
  margin-top:34px;
  display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap;
  padding:18px 20px;
  border:1px solid rgba(126,211,255,.14);
  background:
    radial-gradient(circle at 90% 0%,rgba(34,211,238,.12),transparent 42%),
    linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.014));
  box-shadow:0 18px 44px rgba(0,0,0,.22),inset 0 1px 0 rgba(255,255,255,.035);
}
.squad-cta span{
  color:var(--text-2);font-size:14px;line-height:1.55;
}
.squad-cta a{
  display:inline-flex;align-items:center;justify-content:center;min-height:38px;padding:0 16px;
  background:var(--cyan);color:var(--bg);text-decoration:none;
  font-family:var(--f-narrow);font-weight:800;font-size:12px;letter-spacing:.16em;text-transform:uppercase;
  transition:transform .18s ease,box-shadow .2s ease,background .2s ease;
}
.squad-cta a:hover,
.squad-cta a:focus-visible{
  background:var(--cyan-2);transform:translateY(-2px);
  box-shadow:0 12px 30px rgba(34,211,238,.22);
  outline:none;
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SPONSORS
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
.sponsors{border-top:1px solid var(--line);border-bottom:1px solid var(--line);background:linear-gradient(180deg,var(--bg),var(--surface-0) 100%)}
.sponsors .sec-hdr{margin-bottom:26px}
.sp-top{margin-bottom:32px}
.sp-top p{font-size:15px;line-height:1.75;color:var(--text-2);font-weight:400;max-width:760px;margin:0}
.sp-kpis{
  position:relative;
  display:grid;grid-template-columns:repeat(2,1fr);gap:10px;
  align-self:start;
  margin-top:-12px;
  padding:12px;
  background:
    radial-gradient(circle at top right,rgba(34,211,238,.1),transparent 48%),
    linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.01) 44%,rgba(6,11,20,.6) 100%);
  border:1px solid rgba(126,211,255,.12);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.04),0 18px 38px rgba(0,0,0,.16);
}
.sp-kpis::before{
  content:'';
  position:absolute;top:0;left:18px;right:18px;height:1px;
  background:linear-gradient(90deg,transparent,rgba(34,211,238,.7),transparent);
  opacity:.95;
}
.sp-kpi{
  position:relative;
  overflow:hidden;
  min-height:116px;
  padding:24px 24px 22px;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  text-align:center;
  background:
    radial-gradient(circle at top right,rgba(34,211,238,.14),transparent 42%),
    radial-gradient(circle at bottom left,rgba(255,255,255,.035),transparent 38%),
    linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.015) 38%,rgba(7,13,24,.92) 100%),
    linear-gradient(145deg,rgba(15,25,42,.96),rgba(10,17,31,.98));
  border:1px solid rgba(126,211,255,.14);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.05),
    0 14px 32px rgba(0,0,0,.18),
    0 0 0 1px rgba(34,211,238,.03);
  transition:transform .22s ease,border-color .22s ease,box-shadow .22s ease,background .22s ease;
}
.sp-kpi::before{
  content:'';
  position:absolute;top:0;left:18px;right:18px;height:1px;
  background:linear-gradient(90deg,transparent,rgba(34,211,238,.85),transparent);
  opacity:.9;
}
.sp-kpi::after{
  content:'';
  position:absolute;inset:0;
  background:
    linear-gradient(120deg,transparent 0%,rgba(255,255,255,.04) 18%,transparent 38%),
    repeating-linear-gradient(0deg,transparent,transparent 4px,rgba(255,255,255,.018) 4px,rgba(255,255,255,.018) 5px);
  pointer-events:none;
  opacity:.55;
}
.sp-kpi:hover{
  transform:translateY(-2px);
  border-color:rgba(34,211,238,.3);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.06),
    0 18px 40px rgba(0,0,0,.24),
    0 0 26px rgba(34,211,238,.08);
}
.sp-kpi-val{
  position:relative;z-index:1;
  font-family:var(--f-display);font-weight:800;font-size:32px;line-height:1;color:var(--cyan);letter-spacing:-.02em;
  text-shadow:0 0 18px rgba(34,211,238,.16),0 0 30px rgba(34,211,238,.08);
}
.sp-kpi-lbl{
  position:relative;z-index:1;
  font-family:var(--f-mono);font-size:10px;font-weight:500;letter-spacing:.18em;text-transform:uppercase;color:rgba(229,238,255,.78);margin-top:12px
}

.sp-tier{margin-bottom:40px}
.sp-tier:last-of-type{margin-bottom:56px}
.sp-tier-head{
  display:flex;align-items:center;gap:16px;margin-bottom:22px;
}
.sp-tier-label{
  font-family:var(--f-mono);font-size:10px;font-weight:500;letter-spacing:.22em;text-transform:uppercase;color:var(--muted);white-space:nowrap;
}
.sp-tier-line{flex:1;height:1px;background:linear-gradient(90deg,var(--line-2),transparent)}
.sp-tier-count{font-family:var(--f-mono);font-size:10px;font-weight:500;color:var(--cyan);letter-spacing:.1em}

.sp-row{display:flex;flex-wrap:wrap;gap:10px;align-items:stretch}
.sp-tile{
  flex:1 1 0;min-width:170px;
  display:flex;align-items:center;justify-content:center;
  min-height:112px;
  padding:30px 34px;
  background:
    radial-gradient(circle at top right,rgba(34,211,238,.12),transparent 40%),
    radial-gradient(circle at bottom left,rgba(255,255,255,.035),transparent 32%),
    linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.012) 36%,rgba(6,11,20,.92) 100%),
    linear-gradient(145deg,rgba(16,26,43,.98),rgba(9,15,27,1));
  border:1px solid rgba(126,211,255,.14);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.05),
    inset 0 -1px 0 rgba(34,211,238,.05),
    0 16px 34px rgba(0,0,0,.2);
  transition:transform .22s ease,border-color .22s ease,box-shadow .22s ease,background .22s ease;
  position:relative;overflow:hidden;
}
.sp-tile::before{
  content:'';
  position:absolute;top:0;left:20px;right:20px;height:1px;
  background:linear-gradient(90deg,transparent,rgba(34,211,238,.72),transparent);
  opacity:.95;
}
.sp-tile::after{
  content:'';position:absolute;inset:0;
  background:
    linear-gradient(135deg,transparent 36%,rgba(34,211,238,.08) 50%,transparent 64%),
    repeating-linear-gradient(0deg,transparent,transparent 4px,rgba(255,255,255,.018) 4px,rgba(255,255,255,.018) 5px);
  transform:translateX(-100%);transition:transform .7s ease;
  opacity:.7;
}
.sp-tile:hover{
  border-color:rgba(34,211,238,.34);
  transform:translateY(-4px);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.06),
    inset 0 -1px 0 rgba(34,211,238,.08),
    0 22px 44px rgba(0,0,0,.28),
    0 0 28px rgba(34,211,238,.07);
}
.sp-tile:hover::after{transform:translateX(100%)}

.sp-tile.featured{
  flex:1 1 100%;
  min-height:136px;
  padding:40px 56px;
  background:
    radial-gradient(circle at 50% 50%,rgba(34,211,238,.12),transparent 42%),
    radial-gradient(circle at top right,rgba(255,255,255,.05),transparent 28%),
    linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.012) 38%,rgba(7,14,25,.94) 100%),
    linear-gradient(135deg,rgba(14,27,44,.98),rgba(10,18,31,1));
  border-color:rgba(34,211,238,.26);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.06),
    inset 0 -1px 0 rgba(34,211,238,.08),
    0 22px 48px rgba(0,0,0,.24),
    0 0 34px rgba(34,211,238,.08);
}
.sp-name{
  font-family:var(--f-display);font-weight:800;font-size:24px;letter-spacing:.07em;text-transform:uppercase;color:var(--text);
  position:relative;z-index:2;
  text-shadow:0 0 14px rgba(255,255,255,.05);
}
.sp-name.title{font-size:42px;color:var(--cyan);letter-spacing:.05em;text-shadow:0 0 34px rgba(34,211,238,.28)}
.sp-name.gold{font-size:24px;color:var(--text)}
.sp-name.partner{font-size:17px;color:rgba(229,238,255,.84)}

.sp-cta{
  display:flex;align-items:center;justify-content:space-between;gap:32px;
  padding:32px 40px;
  background:linear-gradient(135deg,rgba(34,211,238,.08),rgba(34,211,238,.02));
  border:1px solid var(--cyan-edge);
  position:relative;overflow:hidden;flex-wrap:wrap;
}
.sp-cta::before{
  content:'';position:absolute;top:-50%;right:-10%;width:300px;height:300px;border-radius:50%;
  background:radial-gradient(circle,rgba(34,211,238,.12),transparent 60%);filter:blur(30px);
}
.sp-cta-text{position:relative;z-index:2;flex:1;min-width:280px}
.sp-cta-title{font-family:var(--f-display);font-weight:800;font-size:24px;letter-spacing:-.01em;text-transform:uppercase;color:var(--text);margin-bottom:8px}
.sp-cta-sub{font-size:14px;color:var(--text-2);line-height:1.6}
.sp-cta-actions{position:relative;z-index:2;display:flex;gap:10px;flex-wrap:wrap}

.sp-opportunities{
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(240px,1fr));
  gap:14px;
  margin:32px 0 44px;
}
.sp-opportunity{
  position:relative;
  min-height:270px;
  padding:28px;
  overflow:hidden;
  display:flex;
  flex-direction:column;
  border:1px solid rgba(126,211,255,.14);
  border-radius:26px;
  background:
    radial-gradient(circle at 88% 0%,rgba(34,211,238,.12),transparent 38%),
    linear-gradient(155deg,rgba(18,29,47,.9),rgba(6,12,22,.98));
  box-shadow:0 20px 48px rgba(0,0,0,.22),inset 0 1px 0 rgba(255,255,255,.045);
  transition:transform .22s ease,border-color .22s ease,box-shadow .22s ease;
}
.sp-opportunity::after{
  content:'';
  position:absolute;
  left:28px;
  right:28px;
  bottom:0;
  height:2px;
  background:linear-gradient(90deg,var(--cyan),transparent);
  opacity:.45;
}
.sp-opportunity:hover{
  transform:translateY(-4px);
  border-color:rgba(34,211,238,.34);
  box-shadow:0 28px 62px rgba(0,0,0,.3),0 0 28px rgba(34,211,238,.07),inset 0 1px 0 rgba(255,255,255,.055);
}
.sp-opportunity-top{display:flex;align-items:center;justify-content:space-between;gap:16px}
.sp-opportunity-k{
  color:var(--cyan);
  font-family:var(--f-display);
  font-size:32px;
  font-weight:800;
  line-height:1;
  letter-spacing:-.03em;
}
.sp-opportunity-status{
  display:inline-flex;
  align-items:center;
  gap:7px;
  color:var(--text-2);
  font-family:var(--f-mono);
  font-size:8px;
  font-weight:700;
  letter-spacing:.14em;
  text-transform:uppercase;
}
.sp-opportunity-status::before{
  content:'';
  width:6px;
  height:6px;
  border-radius:50%;
  background:var(--cyan);
  box-shadow:0 0 12px rgba(34,211,238,.65);
}
.sp-opportunity-title{
  margin-top:auto;
  padding-top:52px;
  color:var(--text);
  font-family:var(--f-display);
  font-size:clamp(23px,2.2vw,32px);
  font-weight:800;
  line-height:1;
  letter-spacing:.025em;
  text-transform:uppercase;
}
.sp-opportunity-text{margin-top:14px;color:var(--text-2);font-size:13.5px;line-height:1.65}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SOCIAL
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
.social-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px}
.sc{
  position:relative;overflow:hidden;
  padding:28px 26px;
  background:var(--surface-1);border:1px solid var(--line);
  text-decoration:none;color:inherit;display:block;
  transition:all .28s ease;
  grid-column:span 2;
}
.sc::before{
  content:'';position:absolute;inset:0;
  background:radial-gradient(circle at 50% 100%,var(--sc-glow,rgba(34,211,238,.08)),transparent 65%);
  opacity:0;transition:opacity .3s ease;pointer-events:none;
}
.sc::after{
  content:'';position:absolute;left:0;bottom:0;right:0;height:2px;
  background:var(--sc-color,var(--cyan));
  transform:scaleX(0);transform-origin:left;transition:transform .35s ease;
}
.sc:hover{transform:translateY(-4px);border-color:var(--line-2);background:var(--surface-2)}
.sc:hover::before{opacity:1}
.sc:hover::after{transform:scaleX(1)}

.sc.tw{--sc-color:#9147ff;--sc-glow:rgba(145,71,255,.15)}
.sc.yt{--sc-color:#ff0033;--sc-glow:rgba(255,0,51,.12)}
.sc.ig{--sc-color:#e1306c;--sc-glow:rgba(225,48,108,.12)}
.sc.dc{--sc-color:#5865f2;--sc-glow:rgba(88,101,242,.15)}
.sc.featured{
  grid-column:1 / -1;
  min-height:300px;
  padding:120px 42px 42px;
  display:flex;
  flex-direction:column;
  justify-content:flex-start;
  background:
    radial-gradient(circle at 88% 12%,rgba(225,48,108,.16),transparent 30%),
    radial-gradient(circle at 66% 82%,rgba(34,211,238,.1),transparent 34%),
    linear-gradient(145deg,rgba(21,24,41,.96),rgba(7,12,22,.99));
  border-color:rgba(225,48,108,.24);
  border-radius:28px;
  box-shadow:0 28px 70px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.055);
}
.sc.featured::after{transform:scaleX(1);height:3px}
.sc.featured .sc-head{position:absolute;top:34px;left:42px;right:42px}
.sc.featured .sc-icon{width:52px;height:52px;font-size:15px;border-color:rgba(225,48,108,.34);color:#f472b6}
.sc.featured .sc-live{color:#f9a8d4}
.sc.featured .sc-platform{font-size:clamp(34px,4vw,58px);line-height:.9}
.sc.featured .sc-handle{font-size:12px;margin-top:10px}
.sc.featured .sc-desc{max-width:660px;font-size:15px;margin-bottom:20px}
.sc.featured .sc-cta{font-size:13px}

.sc-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px}
.sc-icon{
  width:44px;height:44px;display:flex;align-items:center;justify-content:center;
  background:rgba(255,255,255,.04);border:1px solid var(--line-2);
  font-family:var(--f-display);font-weight:800;font-size:13px;color:var(--text);
  transition:all .25s ease;
}
.sc:hover .sc-icon{border-color:var(--sc-color);color:var(--sc-color)}
.sc-live{font-family:var(--f-mono);font-size:9px;font-weight:500;letter-spacing:.18em;text-transform:uppercase;color:var(--muted)}

.sc-platform{font-family:var(--f-display);font-weight:800;font-size:20px;letter-spacing:.02em;text-transform:uppercase;color:var(--text);margin-bottom:4px}
.sc-handle{font-family:var(--f-mono);font-size:11px;font-weight:500;color:var(--cyan);margin-bottom:16px}
.sc-desc{font-size:13px;line-height:1.6;color:var(--text-2);margin-bottom:22px}
.sc-cta{
  display:inline-flex;align-items:center;gap:8px;
  font-family:var(--f-narrow);font-weight:700;font-size:12px;letter-spacing:.16em;text-transform:uppercase;
  color:var(--text);transition:color .25s ease;
}
.sc:hover .sc-cta{color:var(--sc-color)}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   FOOTER
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
.footer{
  padding:72px var(--pad-x) 28px;
  border-top:1px solid rgba(126,211,255,.12);
  background:
    radial-gradient(circle at 18% 0%,rgba(34,211,238,.1),transparent 34%),
    radial-gradient(circle at 88% 18%,rgba(125,143,163,.08),transparent 32%),
    linear-gradient(180deg,#07101c 0%,#030711 100%);
  position:relative;overflow:hidden;
}
.footer::before{
  content:'';position:absolute;top:0;left:0;right:0;height:1px;
  background:linear-gradient(90deg,transparent,var(--cyan),transparent);opacity:.4;
}
.footer-top{
  display:grid;grid-template-columns:2.2fr 1fr 1fr 1fr;gap:64px;
  margin-bottom:48px;padding-bottom:48px;
  border-bottom:1px solid var(--line);
}
.footer-brand{
  padding:24px;border:1px solid rgba(126,211,255,.13);border-radius:26px;
  background:linear-gradient(145deg,rgba(255,255,255,.055),rgba(255,255,255,.012));
  box-shadow:0 22px 58px rgba(0,0,0,.26),inset 0 1px 0 rgba(255,255,255,.045);
}
.footer-brand-logo{height:56px;width:56px;object-fit:contain;filter:drop-shadow(0 0 14px rgba(34,211,238,.35));margin-bottom:20px}
.footer-brand-name{font-family:var(--f-display);font-weight:800;font-size:30px;letter-spacing:.035em;text-transform:uppercase;color:var(--text);line-height:1}
.footer-brand-tag{font-family:var(--f-mono);font-size:11px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--cyan);margin-top:8px;opacity:.9}
.footer-bio{font-size:14px;line-height:1.7;color:var(--text-2);margin-top:18px;max-width:340px}
.footer-col-title{font-family:var(--f-narrow);font-weight:800;font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:var(--text);margin-bottom:20px}
.footer-links{list-style:none;display:flex;flex-direction:column;gap:12px}
.footer-links a{
  font-family:var(--f-body);font-size:13px;color:var(--text-2);
  text-decoration:none;transition:color .2s ease,transform .2s ease;
  display:inline-flex;align-items:center;gap:6px;
}
.footer-links a:hover{color:var(--cyan);transform:translateX(3px)}

.footer-bottom{
  display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;
  font-family:var(--f-mono);font-size:10px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);
}
.footer-bottom a{color:var(--text-2);text-decoration:none;transition:color .2s ease}
.footer-bottom a:hover{color:var(--cyan)}
.footer-legal{display:flex;gap:24px;flex-wrap:wrap}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   RESPONSIVE
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

/* TABLET */
@media (max-width:1100px){
  .hero-left{width:min(560px,53vw)}
  .hero-right{left:32%}
  .hero-logo-shell{width:min(49vw,540px);left:67%;top:44%}
  .hero-stage-signature{width:min(330px,38vw)}
  .hero-pathways{grid-template-columns:minmax(145px,.65fr) repeat(3,minmax(0,1fr))}
  .hero-pathways-head{padding-inline:14px}
  .hero-pathway{padding-inline:14px}
  .identity-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
  .st-hero{flex-wrap:wrap;gap:20px}
  .st-kpis{flex-wrap:wrap}
  .st-kpi{padding:0 16px;min-width:70px}
  .sp-top{grid-template-columns:1fr;gap:32px}
  .social-grid{grid-template-columns:repeat(2,1fr)}
  .sc{grid-column:span 1}
  .sc.featured{grid-column:1 / -1}
  .footer-top{grid-template-columns:1fr 1fr;gap:40px}
}

/* MOBILE */
@media (max-width:768px){
  :root{--pad-x:18px;--sec-y:56px}

  .standings,
  #identity.section,
  #matches.section,
  #fixtures.section,
  #squad.section,
  #sponsors.section,
  #broadcast.section,
  .footer{
    position:relative;
    isolation:isolate;
  }
  .standings::after,
  #identity.section::after,
  #matches.section::after,
  #fixtures.section::after,
  #squad.section::after,
  #sponsors.section::after,
  #broadcast.section::after,
  .footer::after{
    content:'';
    position:absolute;
    top:0;left:0;right:0;height:1px;
    background:linear-gradient(90deg,transparent,rgba(34,211,238,.18),transparent);
    opacity:.75;
    pointer-events:none;
    z-index:1;
  }
  .standings{
    background:linear-gradient(180deg,rgba(9,16,28,.96),rgba(6,10,18,.98));
  }
  #matches.section{
    background:
      linear-gradient(180deg,rgba(12,21,36,.92),rgba(9,15,27,.98));
  }
  #fixtures.section{
    background:
      linear-gradient(180deg,rgba(7,14,25,.94),rgba(10,18,31,.98));
  }
  #squad.section{
    background:
      linear-gradient(180deg,rgba(11,19,33,.96),rgba(7,12,22,.99));
  }
  #sponsors.section{
    background:
      linear-gradient(180deg,rgba(8,14,25,.96),rgba(13,22,37,.98));
  }
  #broadcast.section{
    background:
      linear-gradient(180deg,rgba(10,18,30,.96),rgba(8,13,23,.98));
  }
  .footer{
    background:
      linear-gradient(180deg,rgba(7,12,21,.98),rgba(4,7,13,1));
  }

  /* Nav */
  .nav{height:64px;padding-top:8px;align-items:flex-start}
  .nav.scrolled{height:60px}
  .nav-links{display:none}
  .nav-menu{display:block}
  .nav-left{flex:1;min-width:0}
  .nav-logo{gap:10px;min-width:0}
  .nav-wm{min-width:0}
  .nav-right{gap:8px;align-items:stretch}
  .nav-lang-panel{right:0;min-width:min(240px,calc(100vw - 32px))}
  .nav-burger{min-width:78px;height:38px;padding:0 11px;gap:8px;border-radius:999px}
  .nav-lang-trigger-label{font-size:7px}
  .nav-lang-trigger-value{font-size:10px}
  .nav-lang-trigger-icon{gap:6px;font-size:9px}
  .nav-logo-img{height:34px;width:34px}
  .nav-wm-top{font-size:13px;white-space:nowrap}
  .nav-wm-sub{display:none}
  .nav-cta{
    min-height:38px;padding:0 14px;font-size:10px;letter-spacing:.1em;
    border-radius:999px;justify-content:center;text-align:center;line-height:1.1;
    background:linear-gradient(180deg,rgba(34,211,238,.14),rgba(34,211,238,.06));
    box-shadow:0 10px 26px rgba(0,0,0,.2),inset 0 1px 0 rgba(255,255,255,.04);
  }

  /* Hero */
  .hero{min-height:auto;padding-top:0}
  .hero-right{
    display:block;top:64px;right:0;bottom:auto;left:0;height:500px;
  }
  .hero-stage::before{
    background:
      linear-gradient(90deg,rgba(3,7,17,.52),rgba(3,7,17,.04) 50%,rgba(3,7,17,.52)),
      linear-gradient(180deg,rgba(3,8,16,.34) 0%,transparent 36%,#030711 96%),
      radial-gradient(circle at 50% 42%,transparent,rgba(2,7,15,.42) 82%);
  }
  .hero-stage::after{top:30px;right:18px;bottom:70px;left:18px}
  .hero-arena-img{object-position:center 48%;filter:saturate(.9) contrast(1.08) brightness(.62)}
  .hero-stage-top{top:20px;left:18px;right:18px}
  .hero-stage-side{display:none}
  .hero-logo-shell{left:50%;top:43%;width:min(82vw,360px)}
  .hero-stage-signature{display:none}
  .hero-left{
    width:auto;min-height:0;margin:0;
    padding:400px var(--pad-x) 34px;
    justify-content:flex-start;
  }
  .hero-left::before,.hero-left::after{display:none}
  .hero-tag{font-size:8px;margin-bottom:20px;letter-spacing:.14em;flex-wrap:wrap}
  .hero-tag-sep{width:20px}
  .hero-h1{font-size:clamp(58px,18vw,88px);line-height:.8}
  .hero-h1 .l{white-space:normal}
  .hero-h1 .l:first-child{font-size:.4em;margin-bottom:10px}
  .hero-h1 .l-2::after{width:100%;max-width:280px;height:2px}
  .hero-h1 .l-3,.hero.hero--tr .hero-h1 .l-3{font-size:.28em;line-height:1.08;letter-spacing:.12em;margin-top:18px}
  .hero-sub{font-size:14px;margin-top:24px;max-width:560px}
  .hero-ctas{margin-top:24px;width:100%;display:grid;grid-template-columns:1fr;gap:10px}
  .hero-pathways{
    position:relative;left:auto;right:auto;bottom:auto;
    grid-template-columns:1fr;
    margin:0 var(--pad-x) 34px;
    border:1px solid rgba(126,211,255,.12);
    overflow:hidden;
  }
  .hero-pathways-head{
    padding:13px 14px;display:flex;flex-direction:row;align-items:center;justify-content:space-between;
    border-right:none;border-bottom:1px solid rgba(255,255,255,.075);
  }
  .hero-pathway{
    min-height:52px;
    padding:11px 14px;
    display:grid;
    grid-template-columns:minmax(86px,.7fr) 1.3fr;
    align-items:center;
    gap:12px;
    border-left:none;
    border-top:1px solid rgba(255,255,255,.075);
  }
  .hero-pathway::after{top:50%;right:14px;transform:translateY(-50%)}
  .hero-pathway:hover::after{transform:translate(2px,calc(-50% - 2px))}
  .hero-pathway-value{padding-right:22px;max-width:none;font-size:11px}
  .btn{width:100%;justify-content:center;padding:13px 18px;font-size:11px;letter-spacing:.12em;border-radius:999px}
  .hero-scroll{display:none}

  /* Ticker */
  .ticker{height:40px}
  .ticker-tag{padding:0 14px;font-size:9px;letter-spacing:.14em}
  .ticker-item{padding:0 16px;font-size:11px;gap:8px;height:40px}
  .ticker-item--match{grid-template-columns:16px max-content minmax(40px,auto) max-content max-content;column-gap:8px}
  .ticker-item .t-score{min-width:40px;min-height:16px;font-size:13px;transform:translateY(1.5px)}
  .ticker-item .t-team{min-height:12px;font-size:11px;transform:translateY(.5px)}
  .ticker-result{width:16px;height:16px;font-size:8px}
  .ticker-meta{min-height:12px;font-size:9px;transform:translateY(.5px)}

  /* Section header */
  .sec-hdr{margin-bottom:24px;gap:18px;align-items:stretch}
  .sec-hdr-left{max-width:none}
  .sec-title{font-size:clamp(30px,8.8vw,44px);line-height:1.02}
  .sec-eyebrow{font-size:10px;letter-spacing:.14em}
  .sec-sub{font-size:14px;max-width:none}
  .sec-actions{width:100%;justify-content:space-between;align-items:center;gap:10px}
  .sec-actions > span{width:100%}
  .sec-link,.refresh-btn{flex:1 1 calc(50% - 5px);justify-content:center;font-size:10px;padding:10px 12px}
  .identity-grid{grid-template-columns:1fr;gap:12px}
  .identity-story{grid-template-columns:1fr;gap:12px}
  .identity-origin{min-height:220px;padding:22px;border-radius:22px}
  .identity-manifesto{min-height:auto;padding:24px 22px;border-radius:22px}
  .identity-manifesto-title{font-size:31px}
  .identity-manifesto-text{font-size:13px}
  .identity-motto{margin-top:20px;padding:14px 15px;align-items:flex-start;flex-direction:column;gap:8px}
  .identity-motto-text{font-size:18px}
  .identity-card{min-height:220px;padding:22px;border-radius:22px}
  .identity-copy{margin-top:34px}
  .identity-title{font-size:28px}
  .identity-text{font-size:13px;max-width:none}
  .honours-grid{grid-template-columns:1fr;gap:12px}
  .honour-card{min-height:220px;padding:22px;border-radius:22px}
  .honour-copy{padding-top:36px}

  /* Standings â€” mobilde */
  .st-hero{flex-direction:column;align-items:flex-start;gap:16px;padding:20px var(--pad-x) 16px}
  .st-hero-title{font-size:clamp(28px,7.4vw,42px)}
  .st-kpis{
    display:grid;grid-template-columns:repeat(5,minmax(0,1fr));
    width:100%;
    overflow:visible;
    border-radius:22px;
  }
  .st-kpis::-webkit-scrollbar{display:none}
  .st-kpi{
    min-width:0;
    min-height:78px;
    padding:14px 8px 12px;
    border-left:1px solid var(--line);
  }
  .st-kpi:first-child{border-left:none}
  .st-kpi-val{
    font-size:20px;
    justify-content:center;
    align-items:flex-start;
    gap:3px;
    width:100%;
  }
  .st-kpi-main{line-height:.92}
  .st-kpi-unit{font-size:9px;letter-spacing:.06em;margin-top:.22em}
  .st-kpi-lbl{
    font-size:8px;
    margin-top:6px;
    letter-spacing:.14em;
    text-align:center;
    line-height:1.35;
  }
  .st-topbar{padding:10px var(--pad-x)}
  .st-season-filter{align-items:flex-start;flex-direction:column;gap:10px;padding:12px var(--pad-x)}
  .st-season-tabs{width:100%;padding-bottom:2px}
  .st-season-tab{font-size:10px;padding:8px 11px}
  .st-comp{font-size:10px;letter-spacing:.14em}
  .st-season{display:none}
  .st-live{font-size:9px;padding:3px 9px}
  .st-table-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}
  .st-hdr,.st-row{
    grid-template-columns:40px minmax(140px,1fr) 38px 38px 38px 38px 50px 70px 54px;
    padding:0 16px;min-width:520px;
  }
  .st-hdr{padding:10px 16px}
  .st-row{min-height:54px}
  .st-row.me{min-height:66px}
  .st-hdr-cell{font-size:9px;letter-spacing:.1em}
  .st-rank{font-size:14px}
  .st-row.me .st-rank{font-size:18px}
  .st-badge{width:32px;height:32px;font-size:9px}
  .st-badge.me{width:36px;height:36px;font-size:10px}
  .st-club-name{font-size:11px;letter-spacing:.02em}
  .st-row.me .st-club-name{font-size:13px}
  .st-cell{font-size:13px}
  .st-pts{font-size:17px}
  .st-row.me .st-pts{font-size:22px}
  .st-form-dot{width:7px;height:7px}
  .st-row.me .st-form-dot{width:8px;height:8px}
  .st-foot{padding:12px 16px;flex-direction:column;align-items:flex-start;gap:6px}
  .st-foot-note,.st-foot-link{font-size:9px}

  /* Results */
  .results-grid{gap:12px}
  .res-card{border-radius:24px}
  .res-desk{display:none}
  .res-mob{display:block}
  .res-mob-top{
    display:flex;align-items:flex-start;justify-content:space-between;gap:8px;
    padding:14px 16px 12px;
    flex-wrap:wrap;
    border-bottom:1px solid var(--line);
    background:
      linear-gradient(90deg,rgba(34,211,238,.1),transparent 72%),
      rgba(255,255,255,.015);
  }
  .res-mob-teams{
    display:flex;flex-direction:column;gap:12px;
    align-items:stretch;padding:16px 16px 14px;
    background:linear-gradient(180deg,rgba(255,255,255,.03),transparent);
  }
  .res-mob-team{
    display:flex;align-items:center;gap:10px;min-width:0;
    width:100%;
    justify-content:flex-start;
    padding:14px 14px;
    background:
      radial-gradient(circle at top right,rgba(34,211,238,.1),transparent 44%),
      linear-gradient(180deg,rgba(255,255,255,.055),rgba(255,255,255,.018));
    border:1px solid rgba(255,255,255,.08);
    border-radius:18px;
    box-shadow:inset 0 1px 0 rgba(255,255,255,.04),0 12px 28px rgba(0,0,0,.16);
  }
  .res-mob-team.away{flex-direction:row-reverse;justify-content:flex-start}
  .res-mob-name{
    font-family:var(--f-narrow);font-weight:700;font-size:14px;letter-spacing:.03em;text-transform:uppercase;color:var(--text);
    line-height:1.2;min-width:0;word-break:break-word;
  }
  .res-mob-team.home .res-mob-name{margin-right:auto;text-align:left}
  .res-mob-team.away .res-mob-name{margin-left:auto;text-align:right}
  .res-mob-team .res-badge{width:42px;height:42px}
  .res-mob-score{
    display:flex;align-items:center;justify-content:center;gap:8px;
    align-self:center;min-width:132px;
    padding:10px 16px;
    border:1px solid rgba(34,211,238,.16);
    background:linear-gradient(180deg,rgba(34,211,238,.08),rgba(255,255,255,.02));
    box-shadow:0 0 18px rgba(34,211,238,.08),inset 0 1px 0 rgba(255,255,255,.04);
    border-radius:999px;
    font-family:var(--f-display);font-weight:800;font-size:24px;color:var(--text);letter-spacing:-.02em;
    text-shadow:0 0 14px rgba(255,255,255,.08);
  }
  .res-mob-sep{color:var(--dim);font-weight:400;font-size:16px}
  .res-mob-foot{padding:0 16px 16px}
  .res-pill{border-radius:999px}

  /* Fixtures */
  .fix-grid{gap:12px}
  .fix-card{
    grid-template-columns:1fr;
    grid-template-rows:auto 1px auto 1px auto;
    min-height:auto;
    background:
      radial-gradient(circle at top right,rgba(34,211,238,.12),transparent 38%),
      linear-gradient(180deg,rgba(34,211,238,.05),transparent 34%),
      var(--surface-1);
    border-radius:24px;
  }
  .fix-date{
    grid-row:1;grid-column:1;
    padding:16px 18px 14px;
    flex-direction:row;align-items:center;justify-content:flex-start;gap:12px;
    background:
      linear-gradient(90deg,rgba(34,211,238,.14),transparent 72%),
      linear-gradient(180deg,rgba(255,255,255,.03),transparent);
    transform:none;
  }
  .fix-day{font-size:34px}
  .fix-month{
    font-size:10px;letter-spacing:.2em;
    padding-left:12px;border-left:1px solid var(--line);
  }
  .fix-gw{
    font-size:9px;margin-top:0;margin-left:auto;
    padding:4px 8px;border:1px solid rgba(34,211,238,.2);
    background:linear-gradient(180deg,rgba(34,211,238,.12),rgba(34,211,238,.04));
    color:var(--cyan);box-shadow:0 0 14px rgba(34,211,238,.08);border-radius:999px;
  }
  .fix-divider{grid-column:1;width:auto;height:1px}
  .fix-card > :nth-child(2).fix-divider{grid-row:2}
  .fix-card > :nth-child(4).fix-divider{grid-row:4}
  .fix-match{
    grid-row:3;grid-column:1;
    padding:16px 18px;
    grid-template-columns:1fr;gap:14px;
  }
  .fix-team{
    gap:12px;
    width:100%;
    justify-content:space-between;
    padding:14px 14px;
    background:
      radial-gradient(circle at top right,rgba(34,211,238,.1),transparent 44%),
      linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.018));
    border:1px solid rgba(255,255,255,.08);
    border-radius:18px;
    box-shadow:inset 0 1px 0 rgba(255,255,255,.04),0 12px 28px rgba(0,0,0,.16);
  }
  .fix-team.home{background:linear-gradient(90deg,rgba(34,211,238,.08),rgba(255,255,255,.02) 45%)}
  .fix-team.away{background:linear-gradient(270deg,rgba(34,211,238,.08),rgba(255,255,255,.02) 45%)}
  .fix-team.home,.fix-team.away{justify-content:space-between}
  .fix-team-name{font-size:14px;line-height:1.25;flex:1}
  .fix-team.home .fix-team-name{padding-right:12px;text-align:left}
  .fix-team.away .fix-team-name{padding-left:12px;text-align:left}
  .fix-badge{width:44px;height:44px;font-size:11px}
  .fix-vs{min-height:22px}
  .fix-vs-text{
    font-size:10px;padding:0 8px;background:var(--surface-1);
    border-left:1px solid rgba(34,211,238,.12);border-right:1px solid rgba(34,211,238,.12);
  }
  .fix-card:hover .fix-vs-text{background:var(--surface-2)}
  .fix-vs-line{width:88px}
  .fix-meta{
    grid-row:5;grid-column:1;
    flex-direction:row;align-items:center;justify-content:flex-start;
    gap:10px;padding:14px 18px 16px;
    border-top:none;flex-wrap:wrap;
    background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.01));
  }
  .fix-time{font-size:18px}
  .fix-tz{font-size:9px}
  .fix-venue{margin-top:0;margin-left:auto;font-size:8px;padding:6px 10px;border-radius:999px}

  /* Squad */
  .squad .sec-hdr{padding:20px;margin-bottom:18px;border-radius:22px}
  .squad-filter{
    display:grid;grid-template-columns:repeat(2,minmax(0,1fr));
    gap:8px;margin-bottom:24px;
  }
  .squad-filter-btn{width:100%;min-height:40px;padding:0 10px;font-size:10px;letter-spacing:.11em}
  .squad-grid{grid-template-columns:1fr;gap:14px}
  .pos-label{padding-bottom:12px;margin-bottom:18px;gap:10px}
  .pos-pill{font-size:9px;min-width:36px;height:26px;padding:0 9px}
  .pos-group-name{font-size:11px;letter-spacing:.14em}
  .pos-count{font-size:10px}
  .pos-section{margin-bottom:32px}
  .p-card{
    height:470px;
    border-radius:24px;
  }
  .p-top{
    height:216px;flex-basis:216px;
  }
  .p-number{font-size:82px;bottom:-13px;right:9px}
  .p-avatar-img{width:152px;height:166px;border-radius:16px}
  .p-avatar{width:94px;height:94px;font-size:27px}
  .p-tags{left:12px;right:12px;bottom:12px}
  .p-tag{font-size:7px;letter-spacing:.11em}
  .p-body{
    padding:16px 16px 0;
  }
  .p-ign{font-size:30px}
  .p-name{font-size:12px;min-height:auto}
  .p-stat{
    padding:11px 6px 12px;
    display:flex;
    flex-direction:column;
    align-items:center;
    justify-content:center;
    gap:5px;
  }
  .p-stat-val{font-size:20px}
  .p-stat-lbl{font-size:9px;line-height:1.15;letter-spacing:.12em;margin-top:0}
  .p-pos{font-size:14px;top:12px;left:12px}
  .p-stats{margin-inline:-16px}
  .p-profile{min-height:42px;margin:0 -16px;font-size:11px}
  .squad-cta{align-items:stretch;padding:16px;gap:14px}
  .squad-cta a{width:100%}
  .p-cap{width:18px;height:18px;font-size:9px;right:30px;top:9px}
  .p-flag{font-size:14px;top:8px;right:8px}

  /* Sponsors */
  .sp-top{margin-bottom:36px;gap:28px}
  .sp-top p{font-size:13px}
  .sp-opportunities{margin:24px 0 32px;gap:12px}
  .sp-opportunity{min-height:230px;padding:22px;border-radius:22px}
  .sp-opportunity-title{padding-top:38px;font-size:25px}
  .sp-opportunity-text{font-size:13px}
  .p-card{border-radius:22px}
  .sp-kpis{
    grid-template-columns:1fr 1fr;gap:8px;margin-top:0;padding:10px;
    background:
      radial-gradient(circle at top right,rgba(34,211,238,.12),transparent 50%),
      linear-gradient(180deg,rgba(255,255,255,.035),rgba(255,255,255,.01) 46%,rgba(6,11,20,.72) 100%);
    border:1px solid rgba(126,211,255,.12);
    box-shadow:inset 0 1px 0 rgba(255,255,255,.04),0 18px 34px rgba(0,0,0,.14);
    border-radius:22px;
  }
  .sp-kpi{padding:16px 14px;min-height:98px;border-radius:18px}
  .sp-kpi-val{font-size:22px}
  .sp-kpi-lbl{font-size:9px}
  .sp-tile{min-width:120px;padding:18px 24px}
  .sp-tile.featured{min-height:100px;padding:26px 30px}
  .sp-name{font-size:18px}
  .sp-name.title{font-size:26px}
  .sp-name.gold{font-size:17px}
  .sp-name.partner{font-size:13px}
  .sp-cta{
    padding:24px 20px;flex-direction:column;align-items:flex-start;gap:16px;
    border-radius:24px;
    box-shadow:0 20px 44px rgba(0,0,0,.18),inset 0 1px 0 rgba(255,255,255,.05);
  }
  .sp-cta-title{font-size:18px}
  .sp-cta-sub{font-size:13px}
  .sp-cta-actions{width:100%;display:grid;grid-template-columns:1fr;gap:10px}
  .sp-cta-actions .btn{width:100%}
  .sp-tier-label{font-size:9px}

  /* Social */
  .social-grid{grid-template-columns:1fr;gap:10px}
  .sc{padding:20px 18px;border-radius:22px;box-shadow:0 16px 36px rgba(0,0,0,.16),inset 0 1px 0 rgba(255,255,255,.03)}
  .sc,.sc.featured{grid-column:1}
  .sc.featured{min-height:310px;padding:92px 20px 24px}
  .sc.featured .sc-head{top:20px;left:20px;right:20px}
  .sc.featured .sc-platform{font-size:36px}
  .sc.featured .sc-desc{font-size:13px}
  .sc-head{margin-bottom:16px}
  .sc-icon{width:36px;height:36px;font-size:11px}
  .sc-live{font-size:8px}
  .sc-platform{font-size:15px}
  .sc-handle{font-size:10px;margin-bottom:10px}
  .sc-desc{font-size:12px;margin-bottom:14px}
  .sc-cta{font-size:11px}

  /* Footer */
  .footer{padding:56px var(--pad-x) 24px}
  .footer-top{grid-template-columns:1fr;gap:24px;margin-bottom:24px;padding-bottom:24px}
  .footer-brand{
    padding:20px;border:1px solid rgba(126,211,255,.12);
    background:
      radial-gradient(circle at top right,rgba(34,211,238,.1),transparent 42%),
      linear-gradient(180deg,rgba(255,255,255,.035),rgba(255,255,255,.01) 46%,rgba(6,11,20,.72) 100%);
    box-shadow:inset 0 1px 0 rgba(255,255,255,.04),0 18px 38px rgba(0,0,0,.14);
    border-radius:22px;
  }
  .footer-brand-logo{height:42px;width:42px;margin-bottom:12px}
  .footer-brand-name{font-size:20px}
  .footer-brand-tag{font-size:10px}
  .footer-bio{font-size:12px;margin-top:12px}
  .footer-col-title{font-size:11px;margin-bottom:14px}
  .footer-links a{font-size:12px}
  .footer-legal{justify-content:center;gap:12px}
  .footer-bottom{flex-direction:column;gap:10px;text-align:center;font-size:9px}
}

@media (max-width:620px){
  .nav{padding-top:6px}
  .nav-right{gap:6px}
  .nav-burger{min-width:64px;padding:0 10px}
  .nav-lang-trigger-main{display:none}
  .nav-cta{display:none}

  .hero-left{margin:0;padding:380px var(--pad-x) 30px}
  .hero-right{height:470px}
  .hero-logo-shell{width:min(86vw,340px);top:41%}
  .hero-h1{font-size:clamp(54px,18vw,80px)}
  .hero-h1 .l-3,.hero.hero--tr .hero-h1 .l-3{font-size:.27em}

  .sec-actions{gap:8px}
  .sec-link,.refresh-btn{flex-basis:100%}

  .squad-grid{grid-template-columns:1fr}
}

@media (max-width:480px){
  .footer-brand{order:-1}
  /* KPI 480'de de aynÄ± oran korunur, sadece daha kompakt olur */
  .st-kpis{grid-template-columns:repeat(5,minmax(0,1fr))}
  .st-kpi{min-height:72px;padding:12px 4px 10px}
  .st-kpi-val{font-size:18px}
  .st-kpi-unit{font-size:8px;letter-spacing:.05em}
  .st-kpi-lbl{font-size:7px;margin-top:5px;letter-spacing:.12em}

  .fix-date{padding:12px 14px 10px;gap:10px;flex-wrap:wrap}
  .fix-day{font-size:26px}
  .fix-month{padding-left:10px}
  .fix-gw{margin-left:0}
  .fix-match{padding:12px 14px}
  .fix-team{padding:10px 12px}
  .fix-team-name{font-size:12px}
  .fix-badge{width:36px;height:36px}
  .fix-meta{padding:10px 14px 12px;gap:10px}
  .fix-time{font-size:15px}
  .fix-venue{margin-left:0}

  .res-mob-top{padding:10px 13px}
  .res-mob-teams{padding:12px 13px 10px;gap:9px}
  .res-mob-team{padding:10px 11px}
  .res-mob-name{font-size:12px}
  .res-mob-team .res-badge{width:36px;height:36px}
  .res-mob-score{min-width:98px;padding:7px 12px;font-size:20px}

  .squad-filter{grid-template-columns:1fr}
  .p-card{height:420px}
  .p-top{height:184px;flex-basis:184px}
  .p-avatar-img{width:130px;height:142px}
  .p-avatar{width:82px;height:82px;font-size:24px}
  .p-number{font-size:58px}
  .p-body{padding:12px 12px 0}
  .p-name{font-size:11px}
  .p-ign{font-size:25px}
  .p-kicker{font-size:8px;letter-spacing:.12em}
  .p-stat{padding:10px 4px 11px;gap:4px}
  .p-stat-val{font-size:18px}
  .p-stat-lbl{font-size:8px;letter-spacing:.1em}
  .p-stats{margin-inline:-12px}
  .p-profile{margin:0 -12px;font-size:10px}

  .p-card:hover{transform:translateY(-5px)}
  .p-pos{box-shadow:0 0 12px rgba(34,211,238,.14)}
  .p-avatar{box-shadow:0 0 20px rgba(34,211,238,.12),0 8px 18px rgba(0,0,0,.2)}
  .p-avatar-img{box-shadow:0 0 20px rgba(34,211,238,.12),0 10px 20px rgba(0,0,0,.22)}
}

/* HERO — SUMMER CAMPAIGN */
.hero{
  position:relative;
  min-height:max(720px,100svh);
  display:block;
  overflow:hidden;
  isolation:isolate;
  padding:0;
  background:#04101c;
}
.hero-scene-image{
  position:absolute;inset:0;z-index:0;
  width:100%;height:100%;
  object-fit:cover;object-position:center;
  filter:saturate(.98) contrast(1.06) brightness(.84);
  transform:scale(1.012);
}
.hero-scene-overlay{
  position:absolute;inset:0;z-index:1;pointer-events:none;
  background:
    linear-gradient(90deg,rgba(2,9,18,.98) 0%,rgba(3,13,25,.92) 24%,rgba(4,16,30,.7) 42%,rgba(3,11,21,.2) 61%,rgba(2,7,14,.12) 100%),
    linear-gradient(180deg,rgba(2,8,16,.56) 0%,transparent 28%,transparent 65%,rgba(2,7,14,.84) 100%);
}
.hero-scene-overlay::after{
  content:'';position:absolute;inset:0;
  background:
    radial-gradient(circle at 76% 49%,rgba(2,9,18,.5) 0%,rgba(2,9,18,.3) 18%,transparent 37%),
    radial-gradient(circle at 82% 43%,rgba(251,191,36,.14),transparent 28%),
    linear-gradient(110deg,transparent 0 54%,rgba(34,211,238,.045) 72%,transparent 100%);
  mix-blend-mode:normal;
}
.hero-left{
  position:relative;z-index:4;
  width:min(620px,48vw);
  min-height:max(720px,100svh);
  margin:0 0 0 var(--pad-x);
  padding:122px 0 104px;
  display:flex;flex-direction:column;align-items:flex-start;justify-content:center;
  overflow:visible;text-align:left;
}
.hero-left::before,.hero-left::after{display:none}
.hero-tag{
  display:inline-flex;align-items:center;gap:10px;
  width:fit-content;margin:0 0 24px;padding:8px 12px;
  border:1px solid rgba(255,255,255,.13);
  background:rgba(2,10,19,.38);
  color:#baf6ff;
  font-family:var(--f-mono);font-size:9px;font-weight:700;letter-spacing:.17em;
  text-transform:uppercase;
  backdrop-filter:blur(12px);
}
.hero-tag-dot{background:#fbbf24;box-shadow:0 0 14px rgba(251,191,36,.92)}
.hero-tag-sep{width:24px;height:1px;background:linear-gradient(90deg,var(--cyan),#fbbf24);opacity:.76}
.hero-h1{
  margin:0;overflow:visible;
  font-family:var(--f-display);font-size:clamp(74px,6.8vw,116px);font-weight:700;
  line-height:.8;letter-spacing:-.02em;text-transform:uppercase;
  text-shadow:0 18px 48px rgba(0,0,0,.48);
}
.hero-h1 .l{display:block;white-space:nowrap}
.hero-h1 .l:first-child{
  margin:0 0 12px;
  color:#f4f9ff;
  font-family:var(--f-narrow);font-size:.43em;font-weight:800;line-height:1;letter-spacing:.14em;
}
.hero-h1 .l-2{
  position:relative;display:block;padding:0 0 18px;
  color:var(--cyan);
  text-shadow:0 0 34px rgba(34,211,238,.24),0 18px 48px rgba(0,0,0,.5);
}
.hero-h1 .l-2::after{
  content:'';position:absolute;left:0;bottom:0;
  width:min(350px,78%);height:2px;
  background:linear-gradient(90deg,var(--cyan),#fbbf24 54%,transparent);
}
.hero-h1 .l-3,.hero.hero--tr .hero-h1 .l-3{
  display:block;margin:20px 0 0;
  color:#f4f9ff;
  background:none;
  -webkit-background-clip:initial;background-clip:initial;-webkit-text-fill-color:initial;
  -webkit-text-stroke:0;
  font-family:var(--f-narrow);font-size:.28em;font-weight:800;line-height:1.08;
  letter-spacing:.13em;white-space:nowrap;
  text-shadow:0 8px 28px rgba(0,0,0,.72);
}
.hero-h1--motto{
  width:min(760px,58vw);
  font-size:clamp(50px,4.6vw,80px);
  line-height:.98;
  letter-spacing:0;
  text-transform:none;
}
.hero-h1--motto .motto-line{
  display:block;
  color:#f4f9ff;
  font-family:var(--f-narrow);
  font-size:1em;font-weight:500;
  letter-spacing:.01em;line-height:1;
  white-space:nowrap;
}
.hero-h1--motto .motto-line strong{
  color:var(--cyan);
  font-family:var(--f-display);
  font-size:1.05em;font-weight:700;
  letter-spacing:-.025em;
  text-shadow:0 0 34px rgba(34,211,238,.24),0 18px 48px rgba(0,0,0,.5);
}
.hero-h1--motto .motto-line + .motto-line{
  position:relative;
  margin-top:14px;padding-bottom:22px;
}
.hero-h1--motto .motto-line + .motto-line::after{
  content:'';position:absolute;left:0;bottom:0;
  width:min(430px,72%);height:2px;
  background:linear-gradient(90deg,var(--cyan),#fbbf24 54%,transparent);
}
.hero-sub{
  max-width:520px;margin:28px 0 0;
  color:rgba(238,247,255,.82);
  font-size:15px;font-weight:500;line-height:1.75;
  text-shadow:0 3px 18px rgba(0,0,0,.72);
}
.hero-sub strong{color:#fff}
.hero-ctas{margin-top:32px;gap:12px}
.hero-ctas .btn{min-height:50px;padding:14px 26px}
.hero-ctas .btn-secondary{
  background:rgba(2,10,19,.42);
  border-color:rgba(255,255,255,.18);
  backdrop-filter:blur(10px);
}
.hero-logo-3d{
  position:absolute;z-index:4;
  top:50%;right:clamp(44px,7vw,134px);
  width:clamp(320px,33vw,560px);
  transform:translateY(-48%);
  display:flex;align-items:center;justify-content:center;
  animation:heroStageReveal 1s .12s cubic-bezier(.16,1,.3,1) both;
}
.hero-logo-3d::before{
  content:'';position:absolute;z-index:-1;
  inset:7%;border-radius:50%;
  background:
    radial-gradient(circle,rgba(3,12,24,.66) 0%,rgba(3,12,24,.38) 44%,transparent 70%),
    radial-gradient(circle at 60% 38%,rgba(251,191,36,.16),transparent 44%);
  filter:blur(14px);
}
.hero-logo-3d-image{
  display:block;width:100%;height:auto;object-fit:contain;
  filter:drop-shadow(0 30px 46px rgba(0,0,0,.48)) drop-shadow(0 0 24px rgba(34,211,238,.22));
  animation:heroLogoFloat 7s ease-in-out 1.1s infinite;
}
@keyframes heroLogoFloat{
  0%,100%{transform:translateY(0)}
  50%{transform:translateY(-8px)}
}
.hero-crest{
  position:absolute;z-index:4;
  top:50%;right:clamp(48px,8vw,154px);
  width:clamp(300px,31vw,520px);
  transform:translateY(-47%);
  display:flex;flex-direction:column;align-items:center;
  animation:heroStageReveal 1s .12s cubic-bezier(.16,1,.3,1) both;
}
.hero-crest::before{
  content:'';position:absolute;z-index:-1;
  left:50%;top:47%;width:128%;aspect-ratio:1;
  transform:translate(-50%,-50%);border-radius:50%;
  background:radial-gradient(circle,rgba(251,191,36,.2) 0%,rgba(34,211,238,.11) 34%,rgba(3,10,19,.12) 57%,transparent 72%);
  filter:blur(12px);
}
.hero-crest-overline{
  margin-bottom:8px;
  color:rgba(255,255,255,.78);
  font-family:var(--f-mono);font-size:9px;font-weight:700;letter-spacing:.26em;text-transform:uppercase;
  text-shadow:0 4px 18px rgba(0,0,0,.8);
}
.hero-crest-image{
  width:100%;height:auto;object-fit:contain;
  filter:drop-shadow(0 28px 50px rgba(0,0,0,.54)) drop-shadow(0 0 24px rgba(34,211,238,.3));
}
.hero-crest-meta{
  display:flex;align-items:center;gap:16px;margin-top:-4px;padding:9px 16px;
  border-top:1px solid rgba(255,255,255,.22);
  color:#fff;
  font-family:var(--f-mono);font-size:8px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;
  text-shadow:0 4px 16px rgba(0,0,0,.78);
}
.hero-crest-meta span+span{color:#ffe7a0}
.hero-edition{
  position:absolute;z-index:4;right:var(--pad-x);bottom:28px;
  display:flex;align-items:center;gap:12px;
  color:rgba(255,255,255,.58);
  font-family:var(--f-mono);font-size:8px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;
}
.hero-edition i{display:block;width:34px;height:1px;background:linear-gradient(90deg,var(--cyan),#fbbf24)}

@media (max-width:1100px){
  .hero-left{width:min(560px,53vw)}
  .hero-logo-3d{right:3vw;width:clamp(280px,35vw,390px)}
  .hero-crest{right:4vw;width:clamp(270px,34vw,390px)}
}

@media (max-width:768px){
  .hero{min-height:940px}
  .hero-scene-image{
    object-position:70% center;
    filter:saturate(.98) contrast(1.06) brightness(.78);
  }
  .hero-scene-overlay{
    background:
      linear-gradient(180deg,rgba(2,8,16,.46) 0%,rgba(2,8,16,.08) 28%,rgba(2,9,18,.76) 50%,#030a14 72%,#030811 100%),
      linear-gradient(90deg,rgba(2,9,18,.36),transparent 50%,rgba(2,9,18,.2));
  }
  .hero-left{
    width:auto;min-height:940px;margin:0;
    padding:430px var(--pad-x) 82px;
    justify-content:flex-start;
  }
  .hero-tag{margin-bottom:20px;font-size:8px;letter-spacing:.13em;flex-wrap:wrap}
  .hero-h1{font-size:clamp(58px,18vw,84px);line-height:.8}
  .hero-h1--motto{width:100%;font-size:clamp(34px,9.4vw,48px)}
  .hero-h1 .l:first-child{margin-bottom:10px}
  .hero-h1 .l-3,.hero.hero--tr .hero-h1 .l-3{
    margin-top:18px;font-size:.27em;line-height:1.08;letter-spacing:.1em;
  }
  .hero-h1--motto .motto-line + .motto-line{margin-top:10px;padding-bottom:17px}
  .hero-sub{max-width:560px;margin-top:24px;font-size:14px;line-height:1.68}
  .hero-ctas{width:100%;margin-top:24px;display:grid;grid-template-columns:1fr;gap:10px}
  .hero-crest{
    top:92px;left:50%;right:auto;
    width:min(62vw,270px);
    transform:translateX(-50%);
  }
  .hero-logo-3d{
    top:88px;left:50%;right:auto;
    width:min(70vw,285px);
    transform:translateX(-50%);
  }
  .hero-crest-overline{font-size:7px;margin-bottom:2px}
  .hero-crest-meta{gap:10px;margin-top:-8px;padding:8px 10px;font-size:7px}
  .hero-edition{right:auto;left:var(--pad-x);bottom:24px}
}

@media (max-width:480px){
  .hero{min-height:920px}
  .hero-left{min-height:920px;padding-top:405px}
  .hero-crest{top:88px;width:min(68vw,250px)}
  .hero-logo-3d{top:84px;width:min(72vw,260px)}
  .hero-h1{font-size:clamp(54px,18vw,74px)}
  .hero-h1--motto{font-size:clamp(32px,9vw,42px)}
}

/* SQUAD — PROFESSIONAL TEAM CENTRE */
.squad{
  background:
    radial-gradient(circle at 18% 0%,rgba(22,92,138,.23),transparent 34%),
    radial-gradient(circle at 88% 28%,rgba(34,211,238,.08),transparent 26%),
    linear-gradient(180deg,#06101c 0%,#07111d 48%,#040911 100%);
}
.squad::before{
  background:
    linear-gradient(90deg,transparent 0 8%,rgba(63,198,231,.035) 8% 8.08%,transparent 8.08% 92%,rgba(63,198,231,.035) 92% 92.08%,transparent 92.08%),
    linear-gradient(180deg,rgba(255,255,255,.018) 0 1px,transparent 1px 74px);
  mask-image:linear-gradient(to bottom,rgba(0,0,0,.75),transparent 82%);
}
.squad::after{
  content:"15";
  right:2vw;top:38px;
  font-size:clamp(150px,25vw,360px);
  letter-spacing:-.08em;
  color:rgba(196,231,245,.023);
}
.squad .sec-hdr{
  max-width:880px;
  padding:0 0 28px;
  margin-bottom:20px;
  background:none;
  border:0;
  border-bottom:1px solid rgba(126,211,255,.14);
  box-shadow:none;
}
.squad .sec-sub{max-width:720px}

.squad-summary{
  display:grid;
  grid-template-columns:minmax(260px,1.55fr) repeat(4,minmax(120px,.72fr));
  margin-bottom:14px;
  border:1px solid rgba(126,211,255,.16);
  background:rgba(3,10,18,.64);
  box-shadow:0 24px 60px rgba(0,0,0,.24),inset 0 1px 0 rgba(255,255,255,.035);
  overflow:hidden;
}
.squad-summary-main{
  min-height:96px;
  padding:18px 22px;
  display:flex;align-items:center;justify-content:space-between;gap:20px;
  background:
    linear-gradient(115deg,rgba(34,211,238,.15),rgba(34,211,238,.025) 68%),
    rgba(255,255,255,.018);
  border-right:1px solid rgba(126,211,255,.14);
}
.squad-summary-main > span{
  font-family:var(--f-mono);font-size:10px;font-weight:700;letter-spacing:.16em;
  color:var(--cyan);text-transform:uppercase;
}
.squad-summary-main > div{display:flex;align-items:flex-end;gap:9px}
.squad-summary-main strong{
  font-family:var(--f-display);font-size:46px;line-height:.8;color:var(--text);
}
.squad-summary-main small{
  padding-bottom:2px;
  font-family:var(--f-narrow);font-size:10px;font-weight:800;letter-spacing:.14em;
  color:var(--text-2);
}
.squad-summary-stat{
  min-height:96px;
  padding:16px 14px;
  display:grid;
  grid-template-columns:auto 1fr;
  grid-template-rows:auto 1fr;
  align-items:center;column-gap:10px;
  border-right:1px solid rgba(126,211,255,.1);
  position:relative;
}
.squad-summary-stat:last-child{border-right:0}
.squad-summary-stat::after{
  content:"";position:absolute;left:14px;right:14px;bottom:0;height:1px;
  background:linear-gradient(90deg,var(--cyan),transparent);
  opacity:.34;
}
.squad-summary-stat > span{
  grid-column:1;
  min-width:32px;height:23px;padding:0 7px;
  display:inline-flex;align-items:center;justify-content:center;
  border:1px solid rgba(34,211,238,.26);
  color:var(--cyan);
  font-family:var(--f-mono);font-size:8px;font-weight:800;letter-spacing:.12em;
}
.squad-summary-stat strong{
  grid-column:2;grid-row:1 / span 2;
  justify-self:end;
  font-family:var(--f-display);font-size:34px;line-height:1;color:var(--text);
}
.squad-summary-stat small{
  grid-column:1;align-self:end;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
  font-family:var(--f-narrow);font-size:9px;font-weight:800;letter-spacing:.08em;
  color:var(--muted);text-transform:uppercase;
}

.squad-toolbar{
  min-height:58px;
  margin-bottom:42px;
  padding:9px 10px;
  display:flex;align-items:center;justify-content:space-between;gap:16px;
  border:1px solid rgba(126,211,255,.11);
  background:rgba(255,255,255,.018);
}
.squad-filter{margin:0;gap:4px}
.squad-filter-btn{
  min-height:36px;padding:0 14px;
  border-color:transparent;
  background:transparent;
  font-size:10px;letter-spacing:.1em;
}
.squad-filter-btn:hover,
.squad-filter-btn:focus-visible{
  border-color:rgba(126,211,255,.2);
  background:rgba(34,211,238,.06);
  box-shadow:none;
}
.squad-filter-btn.active{
  color:#eafcff;
  border-color:rgba(34,211,238,.36);
  background:linear-gradient(180deg,rgba(34,211,238,.2),rgba(34,211,238,.08));
  box-shadow:inset 3px 0 0 var(--cyan);
}
.squad-live{
  min-height:36px;
  display:flex;align-items:center;gap:9px;
  padding-left:12px;
  color:var(--muted);
  font-family:var(--f-mono);font-size:8px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;
  white-space:nowrap;
}
.squad-live-dot{
  width:6px;height:6px;border-radius:50%;
  background:var(--cyan);
  box-shadow:0 0 12px rgba(34,211,238,.8);
}
.squad-live-dot.loading{animation:squadPulse 1.1s ease-in-out infinite}
.squad-live time{color:var(--text-2)}
.squad-refresh{
  min-height:30px;padding:0 10px;
  border:1px solid rgba(126,211,255,.15);
  background:rgba(255,255,255,.02);color:var(--text-2);
  font:inherit;letter-spacing:inherit;text-transform:inherit;
  cursor:pointer;transition:border-color .2s ease,color .2s ease,background .2s ease;
}
.squad-refresh:hover,
.squad-refresh:focus-visible{
  border-color:var(--cyan-edge);background:rgba(34,211,238,.07);color:var(--cyan);outline:none;
}
@keyframes squadPulse{
  0%,100%{opacity:.35;transform:scale(.8)}
  50%{opacity:1;transform:scale(1.15)}
}

.pos-section{margin-bottom:48px}
.pos-label{
  gap:12px;
  margin-bottom:15px;padding-bottom:12px;
  border-color:rgba(126,211,255,.13);
}
.pos-pill{
  min-width:38px;height:25px;padding:0 8px;
  background:transparent;
  border-color:rgba(34,211,238,.28);
  box-shadow:none;
  font-size:8px;
}
.pos-group-name{font-size:13px;color:var(--text)}
.pos-count{font-size:9px}
.squad-grid{
  grid-template-columns:repeat(5,minmax(0,1fr));
  gap:16px;
}

.p-card{
  width:100%;
  min-width:0;
  height:464px;
  border-radius:18px;
  border-color:rgba(126,211,255,.14);
  background:#07111e;
  box-shadow:0 18px 44px rgba(0,0,0,.34),inset 0 1px 0 rgba(255,255,255,.04);
  transition:transform .28s cubic-bezier(.16,1,.3,1),border-color .24s ease,box-shadow .28s ease;
}
.p-card::before{
  left:0;right:0;
  background:linear-gradient(90deg,var(--cyan),rgba(241,193,52,.72),transparent 82%);
  opacity:.8;transform:none;
}
.p-card::after{display:none}
.p-card:hover,
.p-card:focus-visible{
  transform:translateY(-6px);
  border-color:rgba(103,232,249,.42);
  box-shadow:0 25px 54px rgba(0,0,0,.46),0 0 30px rgba(34,211,238,.1);
}

.p-top{
  height:250px;flex-basis:250px;
  align-items:stretch;
  background:
    radial-gradient(circle at 50% 24%,rgba(34,211,238,.18),transparent 42%),
    linear-gradient(155deg,#10253d,#071321 56%,#040a12);
}
.p-top::before{
  z-index:2;
  background:
    linear-gradient(180deg,rgba(2,7,13,.03) 45%,rgba(3,9,16,.12) 66%,#07111e 100%),
    linear-gradient(90deg,rgba(3,9,16,.2),transparent 26% 74%,rgba(3,9,16,.2));
}
.p-top::after{
  content:"A";
  top:50%;left:50%;
  transform:translate(-50%,-50%);
  font-size:170px;letter-spacing:0;
  color:rgba(150,224,242,.035);
}
.p-top--photo::after{display:none}
.p-media{width:100%;height:100%;z-index:1}
.p-avatar-img{
  width:100%;height:100%;
  border:0;border-radius:0;
  object-fit:cover;object-position:center 20%;
  box-shadow:none;
  filter:saturate(.9) contrast(1.04) brightness(.9);
  transition:transform .45s cubic-bezier(.16,1,.3,1),filter .3s ease;
}
.p-card:hover .p-avatar-img,
.p-card:focus-visible .p-avatar-img{
  transform:scale(1.025);
  filter:saturate(1) contrast(1.04) brightness(.96);
}
.p-avatar{
  position:relative;
  width:142px;height:142px;border-radius:24px;
  flex-direction:column;gap:8px;
  background:
    linear-gradient(145deg,rgba(34,211,238,.13),rgba(34,211,238,.015) 48%),
    url("/logo-ui.png") center/82% no-repeat,
    #071522;
  border:1px solid rgba(103,232,249,.36);
  box-shadow:0 22px 46px rgba(0,0,0,.42),0 0 42px rgba(34,211,238,.12),inset 0 1px 0 rgba(255,255,255,.07);
  overflow:hidden;
}
.p-avatar::before{
  content:"";position:absolute;inset:0;
  background:linear-gradient(180deg,rgba(4,12,21,.2),rgba(4,12,21,.78));
}
.p-avatar::after{
  width:auto;height:1px;left:22px;right:22px;bottom:32px;
  background:linear-gradient(90deg,transparent,var(--cyan),transparent);
  filter:none;
}
.p-avatar span{
  position:relative;z-index:1;
  transform:none;
  font-size:42px;line-height:1;letter-spacing:.02em;color:#f2fbff;
  text-shadow:0 0 20px rgba(34,211,238,.3);
}
.p-avatar small{
  position:relative;z-index:1;
  font-family:var(--f-mono);font-size:7px;font-weight:800;letter-spacing:.28em;color:var(--cyan);
}
.p-number{
  right:10px;bottom:-10px;z-index:3;
  font-size:84px;color:rgba(229,242,249,.14);
  text-shadow:none;
}
.p-pos{
  top:12px;left:12px;z-index:4;
  min-width:43px;height:29px;padding:0 10px;
  border-radius:4px;
  background:rgba(3,11,19,.8);
  border-color:rgba(103,232,249,.4);
  color:var(--cyan);
  box-shadow:none;
  backdrop-filter:blur(10px);
  font-size:14px;
}
.p-flag{top:14px;right:14px;z-index:4;font-size:17px}

.p-body{
  padding:14px 16px 0;
  background:linear-gradient(180deg,#091522,#06101b);
  border-top-color:rgba(126,211,255,.1);
  box-shadow:none;
}
.p-kicker{
  margin-bottom:5px;text-align:left;
  font-size:8px;letter-spacing:.14em;
}
.p-ign{
  text-align:left;
  font-size:clamp(26px,2.2vw,32px);
  letter-spacing:0;
}
.p-name{
  min-height:28px;margin-top:5px;text-align:left;
  font-size:11px;line-height:1.3;color:#aebdcc;
}
.p-stats{
  margin-inline:-16px;
  border-color:rgba(126,211,255,.11);
  background:rgba(255,255,255,.012);
}
.p-stat{padding:10px 6px 11px;background:transparent}
.p-stat-val{font-size:21px}
.p-stat-lbl{margin-top:4px;font-size:7px}
.p-profile{
  min-height:38px;padding:0 14px;margin:0 -16px;
  font-size:9px;
  background:rgba(34,211,238,.04);
}
.p-card--static .p-profile{color:var(--muted)}

.squad-cta{
  margin-top:10px;padding:17px 18px;
  border-color:rgba(126,211,255,.12);
  background:rgba(255,255,255,.018);
  box-shadow:none;
}

@media (max-width:1040px){
  .squad-summary{grid-template-columns:repeat(4,1fr)}
  .squad-summary-main{grid-column:1 / -1;min-height:76px;border-right:0;border-bottom:1px solid rgba(126,211,255,.14)}
  .squad-summary-stat{min-height:78px}
  .squad-toolbar{align-items:flex-start;flex-direction:column}
  .squad-live{width:100%;padding:8px 4px 0;border-top:1px solid rgba(126,211,255,.09)}
  .squad-grid{grid-template-columns:repeat(4,minmax(0,1fr))}
}
@media (max-width:860px){
  .squad-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
}
@media (max-width:720px){
  .squad .sec-hdr{padding-bottom:22px}
  .squad-summary{grid-template-columns:repeat(2,1fr)}
  .squad-summary-main{grid-column:1 / -1}
  .squad-summary-stat:nth-child(3){border-right:0}
  .squad-summary-stat{border-bottom:1px solid rgba(126,211,255,.08)}
  .squad-toolbar{margin-bottom:34px}
  .squad-filter{width:100%;display:grid;grid-template-columns:repeat(2,1fr)}
  .squad-filter-btn:first-child{grid-column:1 / -1}
  .squad-live{flex-wrap:wrap;white-space:normal}
  .squad-live time{margin-left:auto}
  .squad-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
  .p-card{height:420px}
  .p-top{height:214px;flex-basis:214px}
  .p-avatar{width:116px;height:116px;border-radius:20px}
  .p-avatar span{font-size:34px}
  .p-number{font-size:68px}
  .p-body{padding:12px 12px 0}
  .p-ign{font-size:24px}
  .p-name{font-size:10px}
  .p-stats{margin-inline:-12px}
  .p-profile{margin:0 -12px}
}
@media (max-width:520px){
  .squad-summary-main{padding:15px 16px}
  .squad-summary-main > span{font-size:8px}
  .squad-summary-main strong{font-size:38px}
  .squad-summary-stat{padding:13px 12px}
  .squad-grid{grid-template-columns:1fr}
  .p-card{height:448px}
  .p-top{height:240px;flex-basis:240px}
  .p-avatar{width:132px;height:132px}
  .p-ign{font-size:27px}
  .squad-refresh{margin-left:auto}
  .squad-refresh span{display:none}
}

@media (prefers-reduced-motion:reduce){
  *,*::before,*::after{animation-duration:.01ms !important;animation-iteration-count:1 !important;transition-duration:.01ms !important}
}
`;

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   COMPONENTS
   â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   STARFIELD CANVAS â€” saÄŸ ve sol kenar hareketli yÄ±ldÄ±zlar
   â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */


function Navigation({ scrolled, activeLang, setActiveLang, copy }) {
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

  const links = [
    ["#matches",   copy.nav.links.results],
    ["#standings", copy.nav.links.table],
    ["#fixtures",  copy.nav.links.fixtures],
    ["#squad",     copy.nav.links.squad],
    ["#sponsors",  copy.nav.links.partners],
    ["#broadcast", copy.nav.links.watch],
  ];
  return (
    <nav className={`nav${scrolled ? " scrolled" : ""}`}>
      <div className="nav-left">
        <a href="#top" className="nav-logo" aria-label="ALTAIR eSports">
          <img src="/logo-ui.png" alt="ALTAIR eSports" className="nav-logo-img" />
          <div className="nav-wm">
            <span className="nav-wm-top">ALTAIR</span>
            <span className="nav-wm-sub">FC 26 · Pro Clubs</span>
          </div>
        </a>
      </div>
      <ul className="nav-links">
        {links.map(([h, l]) => (
          <li key={l}><a href={h}>{l}</a></li>
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
                    <a href={href} onClick={() => setMobileMenuOpen(false)}>{label}</a>
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
          alt="ALTAIR eSports 3D arması"
          className="hero-logo-3d-image"
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
  const items = tickerResults.map((r) => ({ type:"result", r }));
  items.push({ type:"meta", text:formText });
  items.push({ type:"meta", text:nextText });
  items.push({ type:"meta", text:copy.ticker.live });

  const loop = [...items, ...items];

  return (
    <div className="ticker" aria-label={copy.ticker.aria}>
      <div className="ticker-tag">
        <span className="ticker-tag-dot"/>
        {copy.ticker.tag}
      </div>
      <div className="ticker-body">
        <div className="ticker-track">
          {loop.map((it, i) => {
            if (it.type === "meta") {
              return (
                <div key={i} className="ticker-item">
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

        <div className="identity-story">
          <article className="identity-origin">
            <div className="identity-origin-year">2025</div>
            <div className="identity-origin-meta">
              <span className="identity-origin-founded">{copy.identity.founded}</span>
              <span className="identity-origin-founders">{copy.identity.founders}</span>
            </div>
          </article>

          <article className="identity-manifesto">
            <h3 className="identity-manifesto-title">{copy.identity.storyTitle}</h3>
            <p className="identity-manifesto-text">{copy.identity.storyText}</p>
            <div className="identity-motto">
              <span className="identity-motto-label">{copy.identity.mottoLabel}</span>
              <span className="identity-motto-text">{copy.identity.motto}</span>
            </div>
          </article>
        </div>

        <div className="identity-grid">
          {copy.identity.cards.map((card) => (
            <article className="identity-card" key={card.k}>
              <span className="identity-k">{card.k}</span>
              <div className="identity-copy">
                <h3 className="identity-title">{card.title}</h3>
                <p className="identity-text">{card.text}</p>
              </div>
            </article>
          ))}
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
          {copy.honours.items.map((honour) => (
            <article key={`${honour.season}-${honour.competition}`} className="honour-card">
              <div className="honour-mark">{honour.mark}</div>
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
        <div className="st-topbar">
          <div className="st-topbar-left">
            <span className="st-comp">eMajor League</span>
            <span className="st-sep"/>
            <span className="st-season">{season.label[lang]}</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {loading && !season.locked && <span style={{fontFamily:"var(--f-mono)",fontSize:9,letterSpacing:".14em",textTransform:"uppercase",color:"var(--muted)"}}>{copy.standings.updating}</span>}
            {error && !loading && !season.locked && <span style={{fontFamily:"var(--f-mono)",fontSize:9,letterSpacing:".14em",textTransform:"uppercase",color:"var(--loss)"}}>{copy.standings.cached}</span>}
            {updatedLabel && !loading && <span style={{fontFamily:"var(--f-mono)",fontSize:9,letterSpacing:".14em",textTransform:"uppercase",color:"var(--muted)"}}>{updatedLabel}</span>}
            {!season.locked && (
              <button onClick={refetch} title={copy.standings.refresh}
                style={{background:"transparent",border:"1px solid var(--line-2)",color:"var(--muted)",padding:"3px 10px",cursor:"pointer",fontFamily:"var(--f-mono)",fontSize:9,letterSpacing:".14em",textTransform:"uppercase",transition:"all .2s"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--cyan)";e.currentTarget.style.color="var(--cyan)"}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--line-2)";e.currentTarget.style.color="var(--muted)"}}>
                ↻ {copy.standings.refresh}
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

function Results({ lang, copy, loading, results=[], error, refetch }) {
  const data = (results.length ? results : RESULTS_FALLBACK).map((match) => localizeDisplayMatch(match, lang));

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
            {error && <span style={{fontFamily:"var(--f-mono)",fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:"var(--loss)"}}>{copy.results.cached}</span>}
            <button className="refresh-btn" onClick={refetch} title={copy.standings.refresh} style={{background:"transparent",border:"1px solid var(--line-2)",color:"var(--muted)",padding:"4px 10px",cursor:"pointer",fontFamily:"var(--f-mono)",fontSize:10,letterSpacing:".14em",textTransform:"uppercase"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--cyan)";e.currentTarget.style.color="var(--cyan)"}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--line-2)";e.currentTarget.style.color="var(--muted)"}}>
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

function Fixtures({ lang, copy, loading, fixtures=[], error, refetch }) {
  const data = (fixtures.length ? fixtures : loading ? FIXTURES_FALLBACK : []).map((match) => localizeDisplayMatch(match, lang));

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
            {error && <span style={{fontFamily:"var(--f-mono)",fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:"var(--loss)"}}>{copy.fixtures.cached}</span>}
            <button className="refresh-btn" onClick={refetch} title={copy.standings.refresh} style={{background:"transparent",border:"1px solid var(--line-2)",color:"var(--muted)",padding:"4px 10px",cursor:"pointer",fontFamily:"var(--f-mono)",fontSize:10,letterSpacing:".14em",textTransform:"uppercase"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--cyan)";e.currentTarget.style.color="var(--cyan)"}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--line-2)";e.currentTarget.style.color="var(--muted)"}}>
              ↻ {copy.standings.refresh}
            </button>
            <a className="sec-link" href="https://www.twitch.tv/altairespor" target="_blank" rel="noopener noreferrer">
              {copy.fixtures.watch} <span className="sec-link-arrow">→</span>
            </a>
          </div>
        </div>
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
            ? <img src={p.image} alt={p.name} className="p-avatar-img"/>
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
            <div className="p-stat-val">{p.apps}</div>
            <div className="p-stat-lbl">{copy.squad.stats.apps}</div>
          </div>
          <div className="p-stat">
            <div className="p-stat-val">{p.goals}</div>
            <div className="p-stat-lbl">{copy.squad.stats.goals}</div>
          </div>
          <div className="p-stat">
            <div className="p-stat-val">{p.assists}</div>
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

function Squad({ lang, copy }) {
  const { squad, loading, error, lastUpdate, refetch } = useSquadStats();
  const [activeGroup, setActiveGroup] = useState("all");
  const filters = ["all", "Goalkeepers", "Defenders", "Midfielders", "Forwards"];
  const visibleSquad = activeGroup === "all" ? squad : squad.filter((group) => group.group === activeGroup);
  const total = squad.reduce((n, g) => n + g.players.length, 0);
  const rosterLabel = lang === "TR" ? "FC 26 · KADRO LİSTESİ" : "FC 26 · TEAM LIST";
  const playerLabel = lang === "TR" ? "OYUNCU" : "PLAYERS";
  const statsLabel = loading
    ? (lang === "TR" ? "EML VERİLERİ GÜNCELLENİYOR" : "UPDATING EML DATA")
    : (lang === "TR" ? "EML İSTATİSTİKLERİ" : "EML STATISTICS");
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
          <div className="squad-live">
            <span className={`squad-live-dot${loading ? " loading" : ""}`} aria-hidden="true"/>
            <span>{error ? copy.squad.cached : statsLabel}</span>
            {updatedLabel && !loading && <time>{updatedLabel}</time>}
            <button className="squad-refresh" type="button" onClick={refetch} title={copy.standings.refresh}>
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

function Sponsors({ copy }) {
  return (
    <section className="section sponsors" id="sponsors">
      <div className="container">
        <div className="sec-hdr">
          <div className="sec-hdr-left">
            <div className="sec-eyebrow">{copy.sponsors.eyebrow}</div>
            <h2 className="sec-title">{copy.sponsors.title[0]} <span className="accent">{copy.sponsors.title[1]}</span></h2>
          </div>
        </div>

        <div className="sp-top">
          <p>{copy.sponsors.sub}</p>
        </div>

        <div className="sp-opportunities">
          {copy.sponsors.opportunities.map((opportunity) => (
            <article key={opportunity.k} className="sp-opportunity">
              <div className="sp-opportunity-top">
                <span className="sp-opportunity-k">{opportunity.k}</span>
                <span className="sp-opportunity-status">{copy.sponsors.open}</span>
              </div>
              <h3 className="sp-opportunity-title">{opportunity.title}</h3>
              <p className="sp-opportunity-text">{opportunity.text}</p>
            </article>
          ))}
        </div>

        <div className="sp-cta">
          <div className="sp-cta-text">
            <div className="sp-cta-title">{copy.sponsors.ctaTitle}</div>
            <div className="sp-cta-sub">{copy.sponsors.ctaSub}</div>
          </div>
          <div className="sp-cta-actions">
            <a href="https://www.instagram.com/altairesports/" target="_blank" rel="noopener noreferrer" className="btn btn-primary">{copy.sponsors.ctaPrimary} <span className="btn-arrow">→</span></a>
            <a href="#broadcast" className="btn btn-secondary">{copy.sponsors.ctaSecondary}</a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Social({ copy }) {
  const statusByChannel = {
    ig: copy.social.statuses.primary,
    tw: copy.social.statuses.live,
    yt: copy.social.statuses.archive,
    dc: copy.social.statuses.community,
  };

  return (
    <section className="section" id="broadcast">
      <div className="container">
        <div className="sec-hdr">
          <div className="sec-hdr-left">
            <div className="sec-eyebrow">{copy.social.eyebrow}</div>
            <h2 className="sec-title">{copy.social.title[0]} <span className="accent">{copy.social.title[1]}</span></h2>
            <p className="sec-sub">{copy.social.sub}</p>
          </div>
        </div>
        <div className="social-grid">
          {SOCIAL.map((s, i) => (
            <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className={`sc ${s.cls}${s.featured ? " featured" : ""}`}>
              <div className="sc-head">
                <div className="sc-icon">{s.icon}</div>
                <span className="sc-live">{statusByChannel[s.cls]}</span>
              </div>
              <div className="sc-platform">{s.platform}</div>
              <div className="sc-handle">{s.handle}</div>
              <div className="sc-desc">{copy.social.cards[s.cls].desc}</div>
              <span className="sc-cta">{copy.social.cards[s.cls].cta} <span>→</span></span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer({ lang, copy }) {
  const clubLinks = [
    { label:copy.footer.clubLinks[0], url:"#identity" },
    { label:copy.footer.clubLinks[1], url:"#honours" },
    { label:copy.footer.clubLinks[2], url:"#matches" },
    { label:copy.footer.clubLinks[3], url:"https://www.instagram.com/altairesports/", external:true },
    { label:copy.footer.clubLinks[4], url:"#broadcast" },
  ];
  const compLinks = [
    { url:"https://emajorleague.com/teams/team/337/", label:copy.footer.compLinks[0], external:true },
    { url:STANDING_SEASONS.summer.url, label:copy.footer.compLinks[1], external:true },
    { url:"#fixtures", label:copy.footer.compLinks[2] },
    { url:"#matches",  label:copy.footer.compLinks[3] },
    { url:"#squad",    label:copy.footer.compLinks[4] },
  ];
  const connectLinks = [
    { label:copy.footer.connectLinks[0], url:"#sponsors" },
    { label:copy.footer.connectLinks[1], url:"https://www.instagram.com/altairesports/", external:true },
    { label:copy.footer.connectLinks[2], url:"https://www.twitch.tv/altairespor", external:true },
    { label:copy.footer.connectLinks[3], url:"https://www.youtube.com/@AltairESPOR", external:true },
    { label:copy.footer.connectLinks[4], url:"https://discord.gg/uMgQKQmr", external:true },
  ];

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-top">
          <div className="footer-brand">
            <img src="/logo-ui.png" alt="ALTAIR eSports" className="footer-brand-logo"/>
            <div className="footer-brand-name">ALTAIR eSports</div>
            <div className="footer-brand-tag">{copy.footer.brandTag}</div>
            <p className="footer-bio">{copy.footer.bio}</p>
          </div>
          <div>
            <div className="footer-col-title">{copy.footer.titles.club}</div>
            <ul className="footer-links">
              {clubLinks.map((l) => (
                <li key={l.label}>
                  <a href={l.url} target={l.external ? "_blank" : undefined} rel={l.external ? "noopener noreferrer" : undefined}>{l.label}</a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="footer-col-title">{copy.footer.titles.competition}</div>
            <ul className="footer-links">
              {compLinks.map((l) => (
                <li key={l.label}>
                  <a href={l.url} target={l.external ? "_blank" : undefined} rel={l.external ? "noopener noreferrer" : undefined}>{l.label}</a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="footer-col-title">{copy.footer.titles.connect}</div>
            <ul className="footer-links">
              {connectLinks.map((l) => (
                <li key={l.label}>
                  <a href={l.url} target={l.external ? "_blank" : undefined} rel={l.external ? "noopener noreferrer" : undefined}>{l.label}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>{copy.footer.rights}</span>
          <div className="footer-legal">
            <span>{copy.footer.competing} <a href={STANDING_SEASONS.summer.url} target="_blank" rel="noopener noreferrer">{STANDING_SEASONS.summer.label[lang]}</a></span>
            <a href="#">{copy.footer.privacy}</a>
            <a href="#">{copy.footer.terms}</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function AltairFC() {
  const [scrolled, setScrolled] = useState(false);
  const [activeLang, setActiveLang] = useState("TR");
  const fixtureData = useFixtures();
  const copy = UI_COPY[activeLang] || UI_COPY.EN;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.documentElement.lang = activeLang === "TR" ? "tr" : "en";
  }, [activeLang]);

  return (
    <>
      <style>{css}</style>

      <a className="skip-link" href="#top">{activeLang === "TR" ? "İçeriğe geç" : "Skip to content"}</a>
      <div className={`site site--${activeLang.toLowerCase()}`}>
        <Navigation scrolled={scrolled} activeLang={activeLang} setActiveLang={setActiveLang} copy={copy}/>
        <Hero copy={copy} lang={activeLang}/>
        <Ticker lang={activeLang} copy={copy} results={fixtureData.results} fixtures={fixtureData.fixtures}/>
        <ClubIdentity copy={copy}/>
        <Honours copy={copy}/>
        <Standings lang={activeLang} copy={copy}/>
        <Results {...fixtureData} lang={activeLang} copy={copy}/>
        <Fixtures {...fixtureData} lang={activeLang} copy={copy}/>
        <Squad lang={activeLang} copy={copy}/>
        <Sponsors copy={copy}/>
        <Social copy={copy}/>
        <Footer lang={activeLang} copy={copy}/>
      </div>
    </>
  );
}

