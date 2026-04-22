import { useState, useEffect, useRef } from "react";

/* ─────────────────────────────────────────────────────────────
   useStandings — inline hook (EML puan durumu scraper)
   ───────────────────────────────────────────────────────────── */

const CACHE_KEY  = "altair_standings_v1";
const CACHE_MAX  = 24 * 60 * 60 * 1000;  // 24 saat
const FRIDAY_TTL = 60 * 60 * 1000;       // Cuma günü 1 saat

const STANDINGS_FALLBACK = [
  { rank:5, abbr:"SOH", name:"Sons Of Hell",   pld:15, w:10, d:1, l:4, gf:43, ga:15, gd:"+28", pts:31, form:"LLD", me:false },
  { rank:6, abbr:"ALT", name:"ALTAIR eSports", pld:15, w:9,  d:1, l:5, gf:32, ga:11, gd:"+21", pts:28, form:"WWW", me:true  },
  { rank:7, abbr:"RED", name:"Redus EFC",       pld:14, w:8,  d:1, l:5, gf:35, ga:20, gd:"+15", pts:25, form:"LWL", me:false },
];

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
      const name = td[1]?.querySelector("a")?.textContent?.trim() || td[1]?.textContent?.trim() || "–";
      const gd   = parseInt(raw(8)) || 0;
      const form = (td[10]?.textContent || "").replace(/\s+/g,"").toUpperCase().slice(0,5);
      const abbr = name.replace(/[^A-Za-zĞÜŞİÖÇğüşiöç]/g,"").slice(0,3).toUpperCase() || "???";
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

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    const ttl = new Date().getDay() === 5 ? FRIDAY_TTL : CACHE_MAX;
    if (Date.now() - ts < ttl) return { data, ts };
  } catch { /* ignore */ }
  return null;
}

function writeCache(data) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data })); }
  catch { /* ignore */ }
}

function useStandings() {
  const [allTeams,   setAllTeams]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [tick,       setTick]       = useState(0);

  const refetch = () => { localStorage.removeItem(CACHE_KEY); setTick(t => t + 1); };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setError(null);
      const cached = readCache();
      if (cached) {
        if (!cancelled) { setAllTeams(cached.data); setLastUpdate(new Date(cached.ts)); setLoading(false); }
        return;
      }
      try {
        const url = "/api/eml-proxy?path=/tournaments/league_table/39/";
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html   = await res.text();
        const parsed = parseEMLTable(html);
        if (!parsed) throw new Error("Parse hatası");
        writeCache(parsed);
        if (!cancelled) { setAllTeams(parsed); setLastUpdate(new Date()); }
      } catch (err) {
        console.warn("[useStandings]", err.message);
        if (!cancelled) { setError(err.message); setAllTeams(STANDINGS_FALLBACK); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const interval = new Date().getDay() === 5
      ? setInterval(() => setTick(t => t + 1), FRIDAY_TTL) : null;
    return () => { cancelled = true; if (interval) clearInterval(interval); };
  }, [tick]);

  const altairRow = allTeams.find(t => t.me) || null;
  const standings = allTeams.length ? compactView(allTeams) : STANDINGS_FALLBACK;
  return { standings, allTeams, altairRow, loading, error, lastUpdate, refetch };
}

/* ─────────────────────────────────────────────────────────────
   useFixtures — EML fikstür scraper
   Tüm matchday'leri tarar, ALTAIR maçlarını filtreler,
   oynananları RESULTS, oynanmayanları FIXTURES olarak ayırır.
   ───────────────────────────────────────────────────────────── */

const FIX_CACHE_KEY  = "altair_fixtures_v3";
const FIX_CACHE_MAX  = 24 * 60 * 60 * 1000;  // 24 saat
const FIX_FRIDAY_TTL = 60 * 60 * 1000;       // Cuma günü 1 saat
const TOTAL_MATCHDAYS = 34;
const TOURNAMENT_ID   = 39;
// ALTAIR'ın oynadığı bilinen matchday'ler — gereksiz 34 istek yerine sadece bunlar
const ALTAIR_MATCHDAYS = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34];
const ALTAIR_NAME     = "altair esports";
const COMPETITION     = "EML | 1. Lig";

// Ay numarasını kısa metne çevirir: "3" → "MAR"
const MONTHS = ["","JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
const MONTH_ALIASES = {
  OCA: "JAN",
  SUB: "FEB",
  ŞUB: "FEB",
  MAR: "MAR",
  NIS: "APR",
  NİS: "APR",
  APR: "APR",
  MAY: "MAY",
  HAZ: "JUN",
  JUN: "JUN",
  TEM: "JUL",
  JUL: "JUL",
  AGU: "AUG",
  AĞU: "AUG",
  AUG: "AUG",
  EYL: "SEP",
  SEP: "SEP",
  EKI: "OCT",
  EKİ: "OCT",
  OCT: "OCT",
  KAS: "NOV",
  NOV: "NOV",
  ARA: "DEC",
  DEC: "DEC",
};

function toEnglishMonthAbbr(value) {
  const key = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\./g, "");

  return MONTH_ALIASES[key] || key.slice(0, 3) || "APR";
}

function abbr3(name) {
  return (name || "").replace(/[^A-Za-z]/g,"").slice(0,3).toUpperCase() || "???";
}

function parseFixturePage(html, matchday) {
  const parser = new DOMParser();
  const doc    = parser.parseFromString(html, "text/html");
  const rows   = [...doc.querySelectorAll("table tbody tr")];
  const matches = [];

  // Tarih/saat başlık satırını bul
  let date = "", time = "22:30";
  const dateCandidates = [
    ...doc.querySelectorAll("h1, h2, h3, h4, h5, h6, caption, th, td[colspan], .card-body, .text-center"),
  ];
  dateCandidates.forEach((el) => {
    const t = (el.textContent || "").replace(/\s+/g, " ").trim();
    if (!t) return;

    const dateMatch =
      t.match(/(\d{1,2})\s+([A-Za-zÇĞİÖŞÜçğıöşü]+)\s+(\d{4})/i) ||
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

    // home takım, skorlar, away takım
    const homeEl   = tds[1]?.querySelector("a") || tds[1];
    const awayEl   = tds[5]?.querySelector("a") || tds[5];
    const homeName = homeEl?.textContent?.trim().replace(/\s+/g," ") || "";
    const awayName = awayEl?.textContent?.trim().replace(/\s+/g," ") || "";
    if (!homeName || !awayName) return;

    const scoreH   = tds[2]?.textContent?.trim();
    const scoreA   = tds[4]?.textContent?.trim();
    const played   = scoreH !== "" && scoreH !== "-" && !isNaN(Number(scoreH));

    const isAltair = homeName.toLowerCase().includes(ALTAIR_NAME) ||
                     awayName.toLowerCase().includes(ALTAIR_NAME);
    if (!isAltair) return;

    // Tarih parse
    const dateParts = date.match(/(\d+)\s+([A-Za-zÇĞİÖŞÜçğıöşü]+)\s+(\d{4})/i);
    const dayNum    = dateParts ? dateParts[1].padStart(2,"0") : "01";
    const monthName = dateParts ? dateParts[2].toUpperCase().slice(0,3) : "APR";
    const year      = dateParts ? dateParts[3] : "2026";

    matches.push({
      id:          matchday,
      matchday:    `GW ${matchday}`,
      competition: COMPETITION,
      date:        date || `${dayNum} ${monthName} ${year}`,
      day:         dayNum,
      month:       monthName,
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

async function getLatestPlayedCount() {
  const cachedStandings = readCache();
  const cachedAltair = cachedStandings?.data?.find((team) => team.me);
  if (Number.isFinite(cachedAltair?.pld)) {
    return Math.max(0, cachedAltair.pld);
  }

  const url = `/api/eml-proxy?path=/tournaments/league_table/${TOURNAMENT_ID}/`;
  const res = await fetch(url, { cache:"no-store", signal:AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`Standings HTTP ${res.status}`);

  const html = await res.text();
  const parsed = parseEMLTable(html);
  if (!parsed) throw new Error("Standings parse hatasi");

  writeCache(parsed);
  const altair = parsed.find((team) => team.me);
  return Math.max(0, altair?.pld || 0);
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
          setAllMatches(cached);
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
        // Strateji: oynanan maça göre pencere aç, ama ekranda görünen en ileri
        // ALTAIR fikstürünü de kapsayacak şekilde sağ tarafa kaydır.
        // Böylece refresh, Samurai gibi ileride görünen maçların tarihini de
        // tekrar isteyebilir; toplam istek sayısı yine en fazla 11 kalır.
        const latestPlayedCount = await getLatestPlayedCount();
        const latestPlayedIndex = Math.min(
          TOTAL_MATCHDAYS - 1,
          Math.max(-1, latestPlayedCount - 1),
        );

        const visibleMaxIndex = Array.isArray(allMatchesRef.current) && allMatchesRef.current.length
          ? Math.max(...allMatchesRef.current.map((match) => Math.max(0, (match.id || 1) - 1)))
          : -1;

        const toIndex = Math.min(
          TOTAL_MATCHDAYS - 1,
          Math.max(latestPlayedIndex + 4, visibleMaxIndex, 3),
        );
        const fromIndex = Math.max(0, toIndex - 10);
        const mds = ALTAIR_MATCHDAYS.slice(fromIndex, toIndex + 1);

        // 3'erli gruplar halinde — site yoğulmaz
        const results = [];
        const batchSize = 3;
        for (let i = 0; i < mds.length; i += batchSize) {
          const batch = mds.slice(i, i + batchSize);
          const pages = await Promise.all(batch.map(fetchPage));
          pages.forEach(matches => results.push(...matches));
          // İstekler arası kısa bekleme
          if (i + batchSize < mds.length) await new Promise(r => setTimeout(r, 300));
        }

        results.sort((a, b) => a.id - b.id);

        if (!cancelled) {
          if (results.length) {
            writeFixCache(results);
            setAllMatches(results);
          } else {
            // Hiç veri gelmediyse fallback
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
  const upcoming = (allMatches || []).filter(m => !m.played);

  // result kodu: ev sahibiyse kendi skoru, değilse karşı skor
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
    results:  withResult.slice(-5).reverse(),   // son 5 maç, yeniden eskiye
    fixtures: upcoming.slice(0, 4),             // sonraki 4 maç
    refetch,
  };
}

function ClubBadge({ className, isAltair, label }) {
  return (
    <div className={className}>
      {isAltair ? (
        <img src="/logo.png" alt="" aria-hidden="true" className="club-badge-logo" />
      ) : (
        label
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   STATIC FALLBACK DATA (otomasyon çalışmazsa görünür)
   ───────────────────────────────────────────────────────────── */

const RESULTS_FALLBACK = [
  { id:11, date:"10 Apr 2026", matchday:"GW 11", competition:"EML | 1. Lig", home:"ALTAIR eSports", homeAbbr:"ALT", away:"Revenge Esports", awayAbbr:"REV", hs:2, as:0, result:"W", venue:"Home" },
  { id:12, date:"10 Apr 2026", matchday:"GW 12", competition:"EML | 1. Lig", home:"VOGUE",          homeAbbr:"VOG", away:"ALTAIR eSports", awayAbbr:"ALT", hs:0, as:2, result:"W", venue:"Away" },
  { id:13, date:"17 Apr 2026", matchday:"GW 13", competition:"EML | 1. Lig", home:"ALTAIR eSports", homeAbbr:"ALT", away:"Blackburn FC",   awayAbbr:"BLA", hs:2, as:0, result:"W", venue:"Home" },
  { id:14, date:"17 Apr 2026", matchday:"GW 14", competition:"EML | 1. Lig", home:"Anatomy FC",     homeAbbr:"ANA", away:"ALTAIR eSports", awayAbbr:"ALT", hs:0, as:5, result:"W", venue:"Away" },
  { id:15, date:"17 Apr 2026", matchday:"GW 15", competition:"EML | 1. Lig", home:"ALTAIR eSports", homeAbbr:"ALT", away:"Bolton VFC",     awayAbbr:"BOL", hs:3, as:0, result:"W", venue:"Home" },
];

const FIXTURES_FALLBACK = [
  { id:16, day:"24", month:"APR", time:"22:30", matchday:"GW 16", competition:"EML | 1. Lig", home:"Abrakadabra eSports", homeAbbr:"ABR", away:"ALTAIR eSports", awayAbbr:"ALT", venue:"Away" },
  { id:17, day:"24", month:"APR", time:"23:00", matchday:"GW 17", competition:"EML | 1. Lig", home:"ALTAIR eSports",      homeAbbr:"ALT", away:"Pure Focus",      awayAbbr:"PUR", venue:"Home" },
  { id:18, day:"24", month:"APR", time:"23:30", matchday:"GW 18", competition:"EML | 1. Lig", home:"Redus EFC",           homeAbbr:"RED", away:"ALTAIR eSports", awayAbbr:"ALT", venue:"Away" },
  { id:19, day:"01", month:"MAY", time:"22:30", matchday:"GW 19", competition:"EML | 1. Lig", home:"SAMURAI",             homeAbbr:"SAM", away:"ALTAIR eSports", awayAbbr:"ALT", venue:"Away" },
];

const SQUAD = [
  { group:"Goalkeepers", abbr:"GK", players:[
    { number:"1",  name:"MEHMETCAN BABAT",   ign:"mcb06099",     pos:"GK",  role:"Goalkeeper",       flag:"🇹🇷", init:"MB",  apps:7,  goals:0, assists:0, captain:false, profileUrl:"https://emajorleague.com/players/profile/6666/", image:"public/players/Mehmetcan.png" },
    { number:"31", name:"BERK SER",          ign:"Bwrkser",      pos:"GK",  role:"Goalkeeper",       flag:"🇹🇷", init:"BS",  apps:5,  goals:0, assists:0, captain:false, profileUrl:"https://emajorleague.com/players/profile/6644/", image:"public/players/Berk.png" },
  ]},
  { group:"Defenders", abbr:"DEF", players:[
    { number:"5",  name:"AYBERK ÖZTÜRK",     ign:"LethalGullit", pos:"CB",  role:"Centre-Back",      flag:"🇹🇷", init:"AÖ",  apps:12, goals:2, assists:1, captain:false, profileUrl:"https://emajorleague.com/players/profile/8829/", image:"public/players/Ayberk.png" },
    { number:"99", name:"EGE YILMAZ",        ign:"Zeppettoo",    pos:"CB",  role:"Centre-Back",      flag:"🇹🇷", init:"EY",  apps:12, goals:1, assists:0, captain:false, profileUrl:"https://emajorleague.com/players/profile/9059/", image:"public/players/Ege.png" },
    { number:"3",  name:"ÖMÜR ÇORUMLUOĞLU",  ign:"creedxzenci",  pos:"CB",  role:"Centre-Back",      flag:"🇹🇷", init:"ÖÇ",  apps:3,  goals:1, assists:0, captain:false, profileUrl:"https://emajorleague.com/players/profile/8458/", image:"public/players/Ömür.png" },
    { number:"15", name:"EFE GÜLER",         ign:"TRU-xEf3s",    pos:"RWB", role:"Right Wing Back",  flag:"🇹🇷", init:"EG",  apps:2,  goals:3, assists:0, captain:false, profileUrl:"https://emajorleague.com/players/profile/7200/", image:"public/players/Efes.png" },
    { number:"57", name:"SACİT KARACA",      ign:"Sparostago1",  pos:"RWB", role:"Right Wing Back",  flag:"🇹🇷", init:"SK",  apps:0,  goals:0, assists:0, captain:false, profileUrl:"https://emajorleague.com/players/profile/9224/" },
    { number:"21", name:"RÜŞTÜ ALPER GÜLER", ign:"DreamArmyA",   pos:"RWB", role:"Right Wing Back",  flag:"🇹🇷", init:"RAG", apps:0,  goals:0, assists:0, captain:false, profileUrl:"https://emajorleague.com/players/profile/9054/" },
    { number:"11", name:"HAZAR TARASHOHİ",   ign:"KingHzrq",     pos:"LWB", role:"Left Wing Back",   flag:"🇹🇷", init:"HT",  apps:9,  goals:1, assists:0, captain:false, profileUrl:"https://emajorleague.com/players/profile/8814/", image:"public/players/Hazar.png" },
    { number:"66", name:"EFE DEMİR",         ign:"future1444",   pos:"LWB", role:"Left Wing Back",   flag:"🇹🇷", init:"ED",  apps:6,  goals:0, assists:0, captain:false, profileUrl:"https://emajorleague.com/players/profile/9929/", image:"public/players/Efe.png" },
    { number:"14", name:"YUSUF EREN ZİYREK", ign:"Sk4y0",        pos:"LWB", role:"Left Wing Back",   flag:"🇹🇷", init:"YEZ", apps:7,  goals:0, assists:0, captain:false, profileUrl:"https://emajorleague.com/Sky/", image:"public/players/Yusuf.png" },
  ]},
  { group:"Midfielders", abbr:"MID", players:[
    { number:"35", name:"KARAHAN ZEKİ TAŞKAN",  ign:"maniac_kara35", pos:"CDM", role:"Defensive Midfielder", flag:"🇹🇷", init:"KZT", apps:12, goals:0, assists:1,  captain:true,  profileUrl:"https://emajorleague.com/players/profile/9020/", image:"public/players/Karahan.png" },
    { number:"10", name:"ŞENER YİĞİT ÇOKYÜCEL", ign:"yigitinski",    pos:"CM",  role:"Central Midfielder",   flag:"🇹🇷", init:"ŞYÇ", apps:12, goals:0, assists:10, captain:true,  profileUrl:"https://emajorleague.com/yigitinski/", image:"public/players/Yiğit.png" },
    { number:"77", name:"ORÇUN BEKTAŞ",         ign:"ORC-HI",        pos:"CM",  role:"Central Midfielder",   flag:"🇹🇷", init:"OB",  apps:12, goals:2, assists:3,  captain:true,  profileUrl:"https://emajorleague.com/players/profile/1897/", image:"public/players/Orçun.png" },
  ]},
  { group:"Forwards", abbr:"FWD", players:[
    { number:"7", name:"DOĞUKAN TOMBUL", ign:"Xwrdodo", pos:"ST", role:"Striker", flag:"🇹🇷", init:"DK", apps:12, goals:8, assists:3, captain:false, profileUrl:"https://emajorleague.com/Dooggyy/", image:"public/players/Doğukan.png" },
  ]},
];

const SPONSORS = {
  title:    ["NEXCORE"],
  gold:     ["STEELWAVE", "HYPERTEK"],
  partners: ["ARGON", "PIXELRIFT", "VAULTNET"],
};

const SOCIAL = [
  { cls:"tw", icon:"TW", platform:"Twitch",    handle:"/altairespor",    desc:"Live match broadcasts every matchday with full commentary.",  cta:"Watch Live", url:"https://www.twitch.tv/altairespor" },
  { cls:"yt", icon:"YT", platform:"YouTube",   handle:"@AltairESPOR",    desc:"Match replays, player breakdowns and season recaps.",         cta:"Subscribe",  url:"https://www.youtube.com/@AltairESPOR" },
  { cls:"ig", icon:"IG", platform:"Instagram", handle:"@altairesports",  desc:"Behind the scenes, squad content and matchday graphics.",     cta:"Follow",     url:"https://www.instagram.com/altairesports/" },
  { cls:"dc", icon:"DC", platform:"Discord",   handle:"Join our server", desc:"Join our community, connect with players and stay updated.",  cta:"Join",       url:"https://discord.gg/uMgQKQmr" },
];

/* ─────────────────────────────────────────────────────────────
   DESIGN SYSTEM — one consistent CSS layer for the whole site
   ───────────────────────────────────────────────────────────── */

const css = `
@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=Archivo+Narrow:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{
  background:#05080f;
  color:#e6ecf5;
  font-family:'Inter',system-ui,sans-serif;
  -webkit-font-smoothing:antialiased;
  overflow-x:hidden;
  letter-spacing:-.005em;
  /* Subtle ambient glow on sides */
  background-image:
    radial-gradient(ellipse 60% 50% at 0% 30%, rgba(34,211,238,.04) 0%, transparent 60%),
    radial-gradient(ellipse 60% 50% at 100% 70%, rgba(34,211,238,.04) 0%, transparent 60%),
    radial-gradient(ellipse 80% 40% at 50% 0%, rgba(14,28,56,.8) 0%, transparent 55%);
}
a{color:inherit}
button{font-family:inherit}

:root{
  /* surfaces */
  --bg:        #05080f;
  --surface-0: #0a0f1a;
  --surface-1: #0e1524;
  --surface-2: #141d30;
  --surface-3: #1a2438;

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

  /* state */
  --win:       #10b981;
  --loss:      #ef4444;
  --draw:      #64748b;

  /* type */
  --f-display: 'Archivo', sans-serif;
  --f-narrow:  'Archivo Narrow', sans-serif;
  --f-body:    'Inter', sans-serif;
  --f-mono:    'JetBrains Mono', monospace;

  /* rhythm */
  --pad-x: clamp(20px, 5vw, 72px);
  --sec-y: clamp(60px, 9vw, 120px);
}


/* ─── Side art panels — fixed, full viewport height ─── */
body::before{
  content:'';
  position:fixed;top:0;left:0;width:340px;height:100vh;
  background:linear-gradient(to right,rgba(34,211,238,.055) 0%,rgba(34,211,238,.018) 45%,transparent 100%);
  pointer-events:none;z-index:0;
}
body::after{
  content:'';
  position:fixed;top:0;right:0;width:340px;height:100vh;
  background:linear-gradient(to left,rgba(34,211,238,.055) 0%,rgba(34,211,238,.018) 45%,transparent 100%);
  pointer-events:none;z-index:0;
}
.side-canvas-wrap{
  position:fixed;
  top:0;bottom:0;
  width:300px;
  pointer-events:none;
  z-index:5;
}
.side-canvas-wrap--left{left:0}
.side-canvas-wrap--right{right:0}
.side-canvas{
  position:absolute;top:0;left:0;
  width:100%;height:100%;
  display:block;
}
@media(max-width:1600px){.side-canvas-wrap{width:220px}}
@media(max-width:1400px){.side-canvas-wrap{width:150px}}
@media(max-width:1200px){.side-canvas-wrap{width:80px}}
@media(max-width:1000px){
  .side-canvas-wrap{display:none}
  body::before,body::after{display:none}
}



.section{padding:var(--sec-y) var(--pad-x);position:relative}
.section-compact{padding:calc(var(--sec-y) * .55) var(--pad-x)}
.container{max-width:1360px;margin:0 auto;position:relative;z-index:2}

.standings,
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
#matches.section{
  background:
    linear-gradient(180deg,rgba(10,18,31,.9),rgba(7,12,22,.98));
}
#fixtures.section{
  background:
    linear-gradient(180deg,rgba(6,12,22,.92),rgba(9,16,28,.98));
}
#squad.section{
  background:
    linear-gradient(180deg,rgba(9,16,28,.94),rgba(6,10,18,.99));
}
#sponsors.section{
  background:
    linear-gradient(180deg,rgba(7,13,23,.95),rgba(11,19,33,.98));
}
#broadcast.section{
  background:
    linear-gradient(180deg,rgba(10,18,30,.94),rgba(6,10,18,.99));
}

/* ─── Section header ─── */
.sec-hdr{display:flex;align-items:flex-end;justify-content:space-between;gap:32px;margin-bottom:44px;flex-wrap:wrap}
.sec-hdr-left{max-width:720px}
.sec-eyebrow{display:inline-flex;align-items:center;gap:12px;font-family:var(--f-mono);font-size:11px;font-weight:500;letter-spacing:.2em;text-transform:uppercase;color:var(--cyan);margin-bottom:16px}
.sec-eyebrow::before{content:'';display:block;width:28px;height:1px;background:var(--cyan);opacity:.6}
.sec-title{font-family:var(--f-display);font-weight:800;font-size:clamp(34px,4.5vw,58px);line-height:.96;letter-spacing:-.02em;text-transform:uppercase;color:var(--text)}
.sec-title .accent{color:var(--cyan);font-style:normal}
.sec-title .outline{color:transparent;-webkit-text-stroke:1px rgba(255,255,255,.2);font-style:normal}
.sec-sub{margin-top:14px;color:var(--text-2);font-size:15px;line-height:1.65;max-width:560px;font-weight:400}
.sec-link{font-family:var(--f-mono);font-size:11px;font-weight:500;letter-spacing:.18em;text-transform:uppercase;color:var(--text-2);text-decoration:none;display:inline-flex;align-items:center;gap:8px;padding:10px 18px;border:1px solid var(--line-2);transition:all .2s ease}
.sec-link:hover{color:var(--cyan);border-color:var(--cyan-edge);background:var(--cyan-soft)}
.sec-link-arrow{transition:transform .2s ease}
.sec-link:hover .sec-link-arrow{transform:translateX(4px)}

/* ═══════════════════════════════════════════════════════════
   NAVIGATION
   ═══════════════════════════════════════════════════════════ */
.nav{
  position:fixed;top:0;left:0;right:0;z-index:500;
  height:72px;
  display:flex;align-items:center;justify-content:space-between;
  padding:0 var(--pad-x);
  transition:background .3s ease,border-color .3s ease,backdrop-filter .3s ease;
  border-bottom:1px solid transparent;
}
.nav.scrolled{
  background:rgba(8,12,20,.82);
  backdrop-filter:blur(18px) saturate(140%);
  -webkit-backdrop-filter:blur(18px) saturate(140%);
  border-bottom-color:var(--line);
  height:64px;
}
.nav-left{display:flex;align-items:center;gap:16px}
.nav-logo{display:flex;align-items:center;gap:14px;text-decoration:none}
.nav-logo-img{height:42px;width:42px;object-fit:contain;filter:drop-shadow(0 0 10px rgba(34,211,238,.35))}
.nav-wm{display:flex;flex-direction:column;line-height:1;gap:4px}
.nav-wm-top{font-family:var(--f-display);font-weight:800;font-size:16px;letter-spacing:.04em;color:var(--text);text-transform:uppercase}
.nav-wm-sub{font-family:var(--f-mono);font-size:9px;font-weight:500;letter-spacing:.22em;color:var(--cyan);text-transform:uppercase;opacity:.85}

.nav-links{display:flex;align-items:center;gap:4px;list-style:none}
.nav-links a{
  display:inline-block;
  padding:10px 16px;
  font-family:var(--f-narrow);font-weight:600;font-size:13px;letter-spacing:.14em;
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
  font-family:var(--f-narrow);font-weight:700;font-size:12px;letter-spacing:.14em;
  text-transform:uppercase;color:var(--bg);background:var(--cyan);
  border:none;cursor:pointer;text-decoration:none;
  position:relative;overflow:hidden;
  transition:background .2s ease,box-shadow .2s ease,transform .15s ease;
}
.nav-cta::before{content:'';width:6px;height:6px;border-radius:50%;background:var(--bg);animation:navPulse 2s ease infinite}
@keyframes navPulse{0%,100%{opacity:1}50%{opacity:.35}}
.nav-cta:hover{background:var(--cyan-2);box-shadow:0 0 0 4px rgba(34,211,238,.15),0 10px 30px rgba(34,211,238,.25);transform:translateY(-1px)}

.nav-burger{display:none;width:38px;height:38px;border:1px solid var(--line-2);background:transparent;cursor:pointer;align-items:center;justify-content:center;flex-direction:column;gap:4px}
.nav-burger span{display:block;width:18px;height:1.5px;background:var(--text)}

/* ═══════════════════════════════════════════════════════════
   HERO
   ═══════════════════════════════════════════════════════════ */
.hero{
  position:relative;min-height:100vh;
  display:grid;grid-template-columns:1.15fr .85fr;align-items:center;
  overflow:hidden;
  padding-top:72px;
}
.hero-bg-base{position:absolute;inset:0;background:radial-gradient(ellipse at 20% 30%,#0d1a2e 0%,#070b16 45%,#05080f 100%)}
.hero-bg-grid{
  position:absolute;inset:0;opacity:.4;
  background-image:
    linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),
    linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px);
  background-size:80px 80px;
  mask-image:radial-gradient(ellipse at 70% 50%,black 0%,transparent 70%);
  -webkit-mask-image:radial-gradient(ellipse at 70% 50%,black 0%,transparent 70%);
}
.hero-bg-glow{
  position:absolute;right:-10%;top:50%;transform:translateY(-50%);
  width:820px;height:820px;border-radius:50%;
  background:radial-gradient(circle,rgba(34,211,238,.12) 0%,rgba(34,211,238,.04) 35%,transparent 65%);
  filter:blur(40px);pointer-events:none;
}
.hero-bg-noise{
  position:absolute;inset:0;opacity:.35;mix-blend-mode:overlay;pointer-events:none;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/></svg>");
}

/* Star layers */
.hero-stars-sm{
  position:absolute;inset:0;z-index:1;pointer-events:none;
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
  animation:starsDrift 120s linear infinite;
}
.hero-stars-md{
  position:absolute;inset:0;z-index:1;pointer-events:none;
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
  animation:starsDrift 90s linear infinite reverse;
}
.hero-stars-cyan{
  position:absolute;inset:0;z-index:1;pointer-events:none;
  background-image:
    radial-gradient(2px 2px at 23% 18%, rgba(34,211,238,.75) 0%, transparent 100%),
    radial-gradient(2px 2px at 64%  7%, rgba(34,211,238,.60) 0%, transparent 100%),
    radial-gradient(2px 2px at 81% 62%, rgba(34,211,238,.70) 0%, transparent 100%),
    radial-gradient(2px 2px at 11% 74%, rgba(34,211,238,.55) 0%, transparent 100%),
    radial-gradient(2px 2px at 47% 91%, rgba(34,211,238,.65) 0%, transparent 100%),
    radial-gradient(2px 2px at 93% 28%, rgba(34,211,238,.50) 0%, transparent 100%),
    radial-gradient(1.5px 1.5px at 36% 39%, rgba(103,232,249,.80) 0%, transparent 100%),
    radial-gradient(1.5px 1.5px at 72% 85%, rgba(103,232,249,.65) 0%, transparent 100%),
    radial-gradient(1.5px 1.5px at  5% 52%, rgba(103,232,249,.70) 0%, transparent 100%);
  background-size:100% 100%;
  animation:starsDrift 150s linear infinite;
  animation-delay:-40s;
}
@keyframes starsDrift{
  0%  { transform:translateY(0)   }
  100%{ transform:translateY(-18px) }
}
@media(prefers-reduced-motion:reduce){
  .hero-stars-sm,.hero-stars-md,.hero-stars-cyan{animation:none}
}

.hero-fade-bottom{position:absolute;bottom:0;left:0;right:0;height:20%;background:linear-gradient(to top,var(--bg),transparent);z-index:3;pointer-events:none}

/* Left column */
.hero-left{position:relative;z-index:4;padding:40px var(--pad-x) 80px;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;text-align:left;overflow:hidden}
.hero-tag{
  display:inline-flex;align-items:center;gap:10px;padding:7px 14px;width:fit-content;
  border:1px solid var(--cyan-edge);background:var(--cyan-soft);
  font-family:var(--f-mono);font-size:10px;font-weight:500;letter-spacing:.2em;
  text-transform:uppercase;color:var(--cyan);
  margin-bottom:32px;
}
.hero-tag-dot{width:6px;height:6px;border-radius:50%;background:var(--cyan);box-shadow:0 0 10px var(--cyan);animation:navPulse 2s ease infinite}
.hero-tag-sep{width:1px;height:10px;background:var(--cyan);opacity:.4}

.hero-h1{
  font-family:var(--f-display);font-weight:900;
  font-size:clamp(52px,6.2vw,96px);
  line-height:.92;letter-spacing:-.035em;text-transform:uppercase;
  animation:heroUp .9s cubic-bezier(.16,1,.3,1) both;
  overflow:hidden;
}
.hero-h1 .l{display:block;white-space:nowrap}
.hero-h1 .l-2{color:var(--cyan);position:relative;display:block;padding-bottom:12px}
.hero-h1 .l-2::after{
  content:'';position:absolute;left:0;width:65%;bottom:0;height:3px;
  background:linear-gradient(to right,var(--cyan),transparent);
}
.hero-h1 .l-3{
  color:transparent;-webkit-text-stroke:1px rgba(255,255,255,.15);
  display:block;font-size:.52em;margin-top:14px;
  letter-spacing:.01em;white-space:nowrap;
}
@keyframes heroUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}

.hero-sub{
  margin-top:24px;max-width:480px;
  font-size:15px;line-height:1.7;color:var(--text-2);font-weight:400;
  text-align:left;
  animation:heroUp .9s .1s cubic-bezier(.16,1,.3,1) both;
}
.hero-sub strong{color:var(--text);font-weight:600}

.hero-ctas{display:flex;gap:12px;margin-top:40px;flex-wrap:wrap;animation:heroUp .9s .2s cubic-bezier(.16,1,.3,1) both}
.btn{
  display:inline-flex;align-items:center;gap:10px;
  padding:14px 26px;
  font-family:var(--f-narrow);font-weight:700;font-size:13px;letter-spacing:.14em;
  text-transform:uppercase;text-decoration:none;cursor:pointer;
  transition:all .2s ease;white-space:nowrap;
}
.btn-primary{background:var(--cyan);color:var(--bg);border:1px solid var(--cyan)}
.btn-primary:hover{background:var(--cyan-2);box-shadow:0 12px 32px rgba(34,211,238,.25);transform:translateY(-2px)}
.btn-secondary{background:transparent;color:var(--text);border:1px solid var(--line-2)}
.btn-secondary:hover{border-color:var(--cyan);color:var(--cyan);background:var(--cyan-soft)}
.btn-arrow{font-family:var(--f-mono);font-size:14px;transition:transform .2s ease}
.btn:hover .btn-arrow{transform:translateX(4px)}

/* Right column — logo composition */
.hero-right{position:relative;z-index:3;height:100%;display:flex;align-items:center;justify-content:center;padding:60px 40px 60px 20px}
.hero-stage{
  position:relative;width:min(500px,100%);aspect-ratio:1;
  display:flex;align-items:center;justify-content:center;
}
@keyframes spin{from{transform:translate(-50%,-50%) rotate(0)}to{transform:translate(-50%,-50%) rotate(360deg)}}

.hero-logo-center{position:relative;width:72%;aspect-ratio:1;display:flex;align-items:center;justify-content:center;z-index:4}
.hero-logo-img{width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 0 60px rgba(34,211,238,.5)) drop-shadow(0 0 20px rgba(34,211,238,.35)) drop-shadow(0 0 6px rgba(34,211,238,.2));animation:heroFloat 6s ease-in-out infinite}
@keyframes heroFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}


.hero-mobile-logo{display:none}

/* Scroll indicator */
.hero-scroll{position:absolute;bottom:28px;left:var(--pad-x);z-index:10;display:flex;align-items:center;gap:10px;font-family:var(--f-mono);font-size:10px;font-weight:500;letter-spacing:.22em;text-transform:uppercase;color:var(--muted)}
.hero-scroll-line{width:1px;height:36px;background:linear-gradient(to bottom,transparent,var(--cyan));position:relative;overflow:hidden}
.hero-scroll-line::after{content:'';position:absolute;top:0;left:0;right:0;height:10px;background:var(--cyan);animation:scrollDown 2s ease infinite}
@keyframes scrollDown{0%{transform:translateY(-100%)}100%{transform:translateY(360%)}}

/* ═══════════════════════════════════════════════════════════
   TICKER / STATUS STRIP
   ═══════════════════════════════════════════════════════════ */
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
}
.ticker-item .t-team{color:var(--text-2)}
.ticker-item .t-team.me{color:var(--text)}
.ticker-item .t-score{font-family:var(--f-display);font-weight:800;font-size:14px;color:var(--text);letter-spacing:0;padding:0 4px}
.ticker-result{
  width:20px;height:20px;display:flex;align-items:center;justify-content:center;
  font-family:var(--f-narrow);font-weight:800;font-size:9px;color:#fff;flex-shrink:0;
}
.ticker-result.w{background:var(--win)}
.ticker-result.l{background:var(--loss)}
.ticker-result.d{background:var(--draw)}
.ticker-meta{color:var(--muted);font-size:11px;letter-spacing:.12em}

/* ═══════════════════════════════════════════════════════════
   STANDINGS
   ═══════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════
   STANDINGS — broadcast-style redesign
   ═══════════════════════════════════════════════════════════ */
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

/* Hero header — title left, kpis right on same line */
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
  font-family:var(--f-display);font-weight:900;
  font-size:clamp(40px,6vw,80px);
  line-height:.9;letter-spacing:-.03em;text-transform:uppercase;
  color:var(--text);
}
.st-hero-title em{font-style:normal;color:var(--cyan)}

/* KPIs — compact horizontal right side */
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
  display:flex;align-items:baseline;gap:3px;
}
.st-kpi:first-child .st-kpi-val{color:var(--cyan);text-shadow:0 0 24px rgba(34,211,238,.4)}
.st-kpi-val em{
  font-style:normal;color:var(--cyan);
  font-family:var(--f-narrow);font-weight:700;
  font-size:clamp(13px,1.3vw,18px);letter-spacing:.02em;opacity:.9;
}
.st-kpi:first-child .st-kpi-val em{opacity:.65}
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


/* ═══════════════════════════════════════════════════════════
   RESULTS
   ═══════════════════════════════════════════════════════════ */
.results-grid{display:flex;flex-direction:column;gap:6px}
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

/* ═══════════════════════════════════════════════════════════
   FIXTURES
   ═══════════════════════════════════════════════════════════ */
.fix-grid{display:flex;flex-direction:column;gap:4px}
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
.fix-day{font-family:var(--f-display);font-weight:800;font-size:40px;line-height:1;color:var(--cyan);letter-spacing:-.04em;text-shadow:0 0 18px rgba(34,211,238,.2)}
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

/* ═══════════════════════════════════════════════════════════
   SQUAD
   ═══════════════════════════════════════════════════════════ */
.squad{background:var(--bg);border-top:1px solid var(--line);border-bottom:1px solid var(--line);position:relative;overflow:hidden}
.squad::before{
  content:'';position:absolute;top:-160px;left:50%;transform:translateX(-50%);
  width:800px;height:400px;border-radius:50%;
  background:radial-gradient(ellipse,rgba(34,211,238,.05),transparent 60%);
  filter:blur(40px);pointer-events:none;
}
.pos-section{margin-bottom:48px}
.pos-section:last-child{margin-bottom:0}
.pos-label{
  display:flex;align-items:center;gap:14px;
  padding-bottom:16px;margin-bottom:26px;
  border-bottom:1px solid var(--line);
}
.pos-pill{
  display:inline-flex;align-items:center;justify-content:center;
  padding:4px 11px;
  background:var(--cyan-soft);border:1px solid var(--cyan-edge);
  font-family:var(--f-mono);font-size:10px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:var(--cyan);
}
.pos-group-name{font-family:var(--f-narrow);font-weight:700;font-size:14px;letter-spacing:.18em;text-transform:uppercase;color:var(--text-2)}
.pos-count{margin-left:auto;font-family:var(--f-mono);font-size:11px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}

.squad-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px}

.p-card{
  position:relative;display:block;text-decoration:none;color:inherit;
  background:
    radial-gradient(circle at top right,rgba(34,211,238,.1),transparent 32%),
    linear-gradient(180deg,rgba(255,255,255,.03),transparent 44%),
    var(--surface-2);
  border:1px solid rgba(255,255,255,.1);
  overflow:hidden;
  box-shadow:0 8px 28px rgba(0,0,0,.42),0 1px 0 rgba(255,255,255,.06) inset;
  transition:transform .3s cubic-bezier(.16,1,.3,1),border-color .25s ease,box-shadow .3s ease;
}
.p-card::before{
  content:'';position:absolute;left:0;top:0;right:0;height:2px;
  background:linear-gradient(90deg,transparent,var(--cyan),transparent);
  transform:scaleX(0);transition:transform .3s ease;
}
.p-card::after{
  content:'';position:absolute;inset:auto -16% -42% auto;width:180px;height:180px;border-radius:50%;
  background:radial-gradient(circle,rgba(34,211,238,.16),transparent 68%);
  opacity:.3;pointer-events:none;transition:opacity .3s ease,transform .3s ease;
}
.p-card:hover{
  transform:translateY(-8px);
  border-color:var(--cyan-edge);
  box-shadow:0 24px 56px rgba(0,0,0,.6),0 0 36px rgba(34,211,238,.16),0 1px 0 rgba(255,255,255,.08) inset;
}
.p-card:hover::before{transform:scaleX(1)}
.p-card:hover::after{opacity:.72;transform:translateY(-8px)}

.p-top{
  position:relative;aspect-ratio:1/.95;
  background:
    radial-gradient(circle at 50% 36%,rgba(34,211,238,.22) 0%,transparent 56%),
    radial-gradient(circle at top right,rgba(255,255,255,.08),transparent 26%),
    linear-gradient(158deg,#111e35 0%,#0a1225 100%);
  display:flex;align-items:center;justify-content:center;overflow:hidden;
}
.p-top::before{
  content:'';position:absolute;inset:0;
  background:linear-gradient(180deg,rgba(255,255,255,.05),transparent 36%,rgba(0,0,0,.12));
  pointer-events:none;
}
.p-top::after{
  content:'';position:absolute;inset:0;
  background:
    repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(255,255,255,.02) 3px,rgba(255,255,255,.02) 4px);
  pointer-events:none;
}
.p-number{
  position:absolute;bottom:6px;right:8px;
  font-family:var(--f-display);font-weight:900;font-size:52px;line-height:1;
  color:rgba(34,211,238,.1);letter-spacing:-.06em;
  text-shadow:0 0 18px rgba(34,211,238,.08);
  user-select:none;pointer-events:none;z-index:1;
}
.p-pos{
  position:absolute;top:12px;left:12px;z-index:3;
  padding:4px 10px;
  background:linear-gradient(180deg,rgba(34,211,238,.95),rgba(34,211,238,.72));
  color:var(--bg);
  box-shadow:0 0 18px rgba(34,211,238,.18);
  font-family:var(--f-display);font-weight:800;font-size:11px;letter-spacing:.05em;
}
.p-cap{
  position:absolute;top:12px;right:40px;z-index:3;
  width:22px;height:22px;display:flex;align-items:center;justify-content:center;
  background:linear-gradient(180deg,rgba(34,211,238,.22),rgba(34,211,238,.08));
  border:1px solid var(--cyan-edge);color:var(--cyan);
  box-shadow:0 0 16px rgba(34,211,238,.1),inset 0 1px 0 rgba(255,255,255,.04);
  font-family:var(--f-display);font-weight:800;font-size:10px;
}
.p-flag{
  position:absolute;top:10px;right:10px;z-index:3;font-size:18px;
  filter:drop-shadow(0 2px 6px rgba(0,0,0,.5)) drop-shadow(0 0 10px rgba(255,255,255,.08));
}

.p-avatar{
  width:84px;height:84px;border-radius:50%;
  background:
    radial-gradient(circle at 35% 30%,rgba(255,255,255,.08),transparent 30%),
    linear-gradient(135deg,#101e35,#080f1c);
  border:2px solid var(--cyan-edge);
  display:flex;align-items:center;justify-content:center;
  font-family:var(--f-display);font-weight:800;font-size:24px;color:var(--cyan);
  position:relative;z-index:2;box-shadow:0 0 28px rgba(34,211,238,.14),0 12px 26px rgba(0,0,0,.22);
}
.p-avatar-img{
  width:112px;height:112px;object-fit:cover;
  border:2px solid var(--cyan-edge);border-radius:4px;
  box-shadow:0 0 28px rgba(34,211,238,.14),0 14px 28px rgba(0,0,0,.24);
  position:relative;z-index:2;
}

.p-body{
  padding:16px 16px 0;
  background:
    radial-gradient(circle at top right,rgba(34,211,238,.08),transparent 34%),
    linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.015) 42%,rgba(4,10,20,.22) 100%),
    linear-gradient(135deg,rgba(8,15,28,.94),rgba(13,22,38,.98));
  border-top:1px solid rgba(255,255,255,.08);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.05);
}
.p-role{
  font-family:var(--f-mono);font-size:10px;font-weight:500;letter-spacing:.2em;text-transform:uppercase;color:var(--cyan);margin-bottom:4px;
  text-shadow:0 0 10px rgba(34,211,238,.14);
}
.p-name{
  font-family:var(--f-narrow);font-weight:800;font-size:18px;letter-spacing:.03em;text-transform:uppercase;line-height:1.1;color:var(--text);
  text-shadow:0 0 12px rgba(255,255,255,.05);
}
.p-ign{font-family:var(--f-mono);font-size:11px;font-weight:400;color:var(--muted);margin-top:5px}

.p-stats{
  display:grid;grid-template-columns:1fr 1fr 1fr;
  margin-top:16px;
  border-top:1px solid rgba(34,211,238,.14);
  background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.01));
}
.p-stat{
  padding:12px 8px 13px;text-align:center;
  border-right:1px solid rgba(255,255,255,.06);
  background:
    linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.01)),
    linear-gradient(135deg,rgba(255,255,255,.015),transparent 70%);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.02);
}
.p-stat:last-child{border-right:none}
.p-stat-val{
  font-family:var(--f-display);font-weight:800;font-size:17px;color:var(--text);line-height:1;letter-spacing:-.02em;
  text-shadow:0 0 12px rgba(255,255,255,.07),0 0 18px rgba(34,211,238,.06);
}
.p-stat-lbl{
  font-family:var(--f-mono);font-size:9px;font-weight:500;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);margin-top:6px;
}

/* ═══════════════════════════════════════════════════════════
   SPONSORS
   ═══════════════════════════════════════════════════════════ */
.sponsors{border-top:1px solid var(--line);border-bottom:1px solid var(--line);background:linear-gradient(180deg,var(--bg),var(--surface-0) 100%)}
.sp-top{display:grid;grid-template-columns:1.1fr .9fr;gap:64px;align-items:end;margin-bottom:56px}
.sp-top p{font-size:15px;line-height:1.75;color:var(--text-2);font-weight:400;max-width:540px}
.sp-kpis{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
.sp-kpi{
  padding:22px 24px;
  background:var(--surface-1);border:1px solid var(--line);
  transition:all .22s ease;
}
.sp-kpi:hover{border-color:var(--cyan-edge);background:var(--surface-2)}
.sp-kpi-val{font-family:var(--f-display);font-weight:800;font-size:32px;line-height:1;color:var(--cyan);letter-spacing:-.02em}
.sp-kpi-lbl{font-family:var(--f-mono);font-size:10px;font-weight:500;letter-spacing:.18em;text-transform:uppercase;color:var(--text-2);margin-top:8px}

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
  padding:28px 32px;
  background:var(--surface-1);border:1px solid var(--line);
  transition:all .22s ease;position:relative;overflow:hidden;
}
.sp-tile::after{
  content:'';position:absolute;inset:0;
  background:linear-gradient(135deg,transparent 40%,rgba(34,211,238,.08) 50%,transparent 60%);
  transform:translateX(-100%);transition:transform .6s ease;
}
.sp-tile:hover{border-color:var(--cyan-edge);background:var(--surface-2);transform:translateY(-3px);box-shadow:0 12px 32px rgba(0,0,0,.35)}
.sp-tile:hover::after{transform:translateX(100%)}

.sp-tile.featured{flex:1 1 100%;min-height:130px;padding:36px 56px;background:linear-gradient(135deg,var(--surface-1),var(--surface-2));border-color:var(--cyan-edge)}
.sp-name{font-family:var(--f-display);font-weight:800;font-size:22px;letter-spacing:.06em;text-transform:uppercase;color:var(--text-2);position:relative;z-index:2}
.sp-name.title{font-size:38px;color:var(--cyan);letter-spacing:.04em;text-shadow:0 0 30px rgba(34,211,238,.3)}
.sp-name.gold{font-size:22px;color:var(--text)}
.sp-name.partner{font-size:16px;color:var(--text-2)}

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

/* ═══════════════════════════════════════════════════════════
   SOCIAL
   ═══════════════════════════════════════════════════════════ */
.social-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.sc{
  position:relative;overflow:hidden;
  padding:28px 26px;
  background:var(--surface-1);border:1px solid var(--line);
  text-decoration:none;color:inherit;display:block;
  transition:all .28s ease;
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

/* ═══════════════════════════════════════════════════════════
   FOOTER
   ═══════════════════════════════════════════════════════════ */
.footer{
  padding:72px var(--pad-x) 28px;
  border-top:1px solid var(--line);
  background:var(--surface-0);
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
.footer-brand-logo{height:56px;width:56px;object-fit:contain;filter:drop-shadow(0 0 14px rgba(34,211,238,.35));margin-bottom:20px}
.footer-brand-name{font-family:var(--f-display);font-weight:800;font-size:28px;letter-spacing:.04em;text-transform:uppercase;color:var(--text);line-height:1}
.footer-brand-tag{font-family:var(--f-mono);font-size:11px;font-weight:500;letter-spacing:.2em;text-transform:uppercase;color:var(--cyan);margin-top:8px;opacity:.85}
.footer-bio{font-size:14px;line-height:1.7;color:var(--text-2);margin-top:18px;max-width:340px}
.footer-col-title{font-family:var(--f-narrow);font-weight:700;font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:var(--text);margin-bottom:20px}
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

/* ═══════════════════════════════════════════════════════════
   RESPONSIVE
   ═══════════════════════════════════════════════════════════ */

/* TABLET */
@media (max-width:1100px){
  .hero{grid-template-columns:1.2fr .8fr}
  .hero-stage{width:min(420px,100%)}
  .st-hero{flex-wrap:wrap;gap:20px}
  .st-kpis{flex-wrap:wrap}
  .st-kpi{padding:0 16px;min-width:70px}
  .sp-top{grid-template-columns:1fr;gap:32px}
  .social-grid{grid-template-columns:repeat(2,1fr)}
  .footer-top{grid-template-columns:1fr 1fr;gap:40px}
}

/* MOBILE */
@media (max-width:768px){
  :root{--pad-x:18px;--sec-y:56px}

  .standings,
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
  .nav{height:60px}
  .nav.scrolled{height:56px}
  .nav-links{display:none}
  .nav-burger{display:flex}
  .nav-logo-img{height:34px;width:34px}
  .nav-wm-top{font-size:14px}
  .nav-wm-sub{display:none}
  .nav-cta{padding:9px 14px;font-size:10px;letter-spacing:.1em}

  /* Hero */
  .hero{grid-template-columns:1fr;min-height:auto;padding-top:60px}
  .hero-right{display:none}
  .hero-left{padding:40px var(--pad-x) 60px}
  .hero-mobile-logo{display:block;width:110px;height:110px;object-fit:contain;margin-bottom:28px;filter:drop-shadow(0 0 20px rgba(34,211,238,.4))}
  .hero-tag{font-size:9px;padding:6px 11px;margin-bottom:20px;letter-spacing:.14em}
  .hero-h1{font-size:clamp(44px,11vw,68px)}
  .hero-sub{font-size:14px;margin-top:20px}
  .hero-ctas{margin-top:28px}
  .btn{padding:11px 18px;font-size:11px;letter-spacing:.12em}
  .hero-scroll{display:none}

  /* Ticker */
  .ticker{height:40px}
  .ticker-tag{padding:0 14px;font-size:9px;letter-spacing:.14em}
  .ticker-item{padding:0 16px;font-size:11px;gap:8px;height:40px}
  .ticker-item .t-score{font-size:12px}
  .ticker-result{width:16px;height:16px;font-size:8px}
  .ticker-meta{font-size:9px}

  /* Section header */
  .sec-hdr{margin-bottom:28px}
  .sec-title{font-size:clamp(26px,7vw,38px)}
  .sec-eyebrow{font-size:10px;letter-spacing:.14em}
  .sec-link{font-size:10px;padding:8px 14px}

  /* Standings — mobilde */
  .st-hero{flex-direction:column;align-items:flex-start;gap:16px;padding:20px var(--pad-x) 16px}
  .st-hero-title{font-size:clamp(28px,8vw,44px)}
  .st-kpis{flex-wrap:nowrap;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;width:100%}
  .st-kpis::-webkit-scrollbar{display:none}
  .st-kpi{padding:0 14px;min-width:70px;border-left:1px solid var(--line)}
  .st-kpi:first-child{border-left:none}
  .st-kpi-val{font-size:20px}
  .st-kpi-val em{font-size:10px}
  .st-kpi-lbl{font-size:8px;margin-top:5px}
  .st-topbar{padding:10px var(--pad-x)}
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
  .res-desk{display:none}
  .res-mob{display:block}
  .res-mob-top{
    display:flex;align-items:center;justify-content:space-between;gap:8px;
    padding:11px 14px;
    flex-wrap:wrap;
    border-bottom:1px solid var(--line);
    background:
      linear-gradient(90deg,rgba(34,211,238,.1),transparent 72%),
      rgba(255,255,255,.015);
  }
  .res-mob-teams{
    display:flex;flex-direction:column;gap:10px;
    align-items:stretch;padding:14px 14px 12px;
    background:linear-gradient(180deg,rgba(255,255,255,.03),transparent);
  }
  .res-mob-team{
    display:flex;align-items:center;gap:10px;min-width:0;
    width:100%;
    justify-content:flex-start;
    padding:12px 12px;
    background:linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.015));
    border:1px solid rgba(255,255,255,.08);
    box-shadow:inset 0 1px 0 rgba(255,255,255,.04),0 10px 22px rgba(0,0,0,.12);
  }
  .res-mob-team.away{flex-direction:row-reverse;justify-content:flex-start}
  .res-mob-name{
    font-family:var(--f-narrow);font-weight:700;font-size:13px;letter-spacing:.03em;text-transform:uppercase;color:var(--text);
    line-height:1.2;min-width:0;word-break:break-word;
  }
  .res-mob-team.home .res-mob-name{margin-right:auto;text-align:left}
  .res-mob-team.away .res-mob-name{margin-left:auto;text-align:right}
  .res-mob-team .res-badge{width:40px;height:40px}
  .res-mob-score{
    display:flex;align-items:center;justify-content:center;gap:8px;
    align-self:center;min-width:110px;
    padding:8px 14px;
    border:1px solid rgba(34,211,238,.16);
    background:linear-gradient(180deg,rgba(34,211,238,.08),rgba(255,255,255,.02));
    box-shadow:0 0 18px rgba(34,211,238,.08),inset 0 1px 0 rgba(255,255,255,.04);
    font-family:var(--f-display);font-weight:800;font-size:22px;color:var(--text);letter-spacing:-.02em;
    text-shadow:0 0 14px rgba(255,255,255,.08);
  }
  .res-mob-sep{color:var(--dim);font-weight:400;font-size:16px}
  .res-mob-foot{padding:0 14px 12px}

  /* Fixtures */
  .fix-card{
    grid-template-columns:1fr;
    grid-template-rows:auto 1px auto 1px auto;
    min-height:auto;
    background:
      radial-gradient(circle at top right,rgba(34,211,238,.12),transparent 38%),
      linear-gradient(180deg,rgba(34,211,238,.05),transparent 34%),
      var(--surface-1);
  }
  .fix-date{
    grid-row:1;grid-column:1;
    padding:14px 16px 12px;
    flex-direction:row;align-items:center;justify-content:flex-start;gap:12px;
    background:
      linear-gradient(90deg,rgba(34,211,238,.14),transparent 72%),
      linear-gradient(180deg,rgba(255,255,255,.03),transparent);
    transform:none;
  }
  .fix-day{font-size:30px}
  .fix-month{
    font-size:10px;letter-spacing:.2em;
    padding-left:12px;border-left:1px solid var(--line);
  }
  .fix-gw{
    font-size:9px;margin-top:0;margin-left:auto;
    padding:4px 8px;border:1px solid rgba(34,211,238,.2);
    background:linear-gradient(180deg,rgba(34,211,238,.12),rgba(34,211,238,.04));
    color:var(--cyan);box-shadow:0 0 14px rgba(34,211,238,.08);
  }
  .fix-divider{grid-column:1;width:auto;height:1px}
  .fix-card > :nth-child(2).fix-divider{grid-row:2}
  .fix-card > :nth-child(4).fix-divider{grid-row:4}
  .fix-match{
    grid-row:3;grid-column:1;
    padding:14px 16px;
    grid-template-columns:1fr;gap:12px;
  }
  .fix-team{
    gap:10px;
    width:100%;
    justify-content:space-between;
    padding:12px 14px;
    background:linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.015));
    border:1px solid rgba(255,255,255,.08);
    box-shadow:inset 0 1px 0 rgba(255,255,255,.04),0 10px 24px rgba(0,0,0,.14);
  }
  .fix-team.home{background:linear-gradient(90deg,rgba(34,211,238,.08),rgba(255,255,255,.02) 45%)}
  .fix-team.away{background:linear-gradient(270deg,rgba(34,211,238,.08),rgba(255,255,255,.02) 45%)}
  .fix-team.home,.fix-team.away{justify-content:space-between}
  .fix-team-name{font-size:13px;line-height:1.2;flex:1}
  .fix-team.home .fix-team-name{padding-right:12px;text-align:left}
  .fix-team.away .fix-team-name{padding-left:12px;text-align:left}
  .fix-badge{width:40px;height:40px;font-size:10px}
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
    gap:12px;padding:12px 16px 14px;
    border-top:none;flex-wrap:wrap;
    background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.01));
  }
  .fix-time{font-size:16px}
  .fix-tz{font-size:9px}
  .fix-venue{margin-top:0;margin-left:auto;font-size:8px;padding:3px 9px}

  /* Squad */
  .squad-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
  .pos-label{padding-bottom:12px;margin-bottom:18px;gap:10px}
  .pos-pill{font-size:9px;padding:3px 9px}
  .pos-group-name{font-size:11px;letter-spacing:.14em}
  .pos-count{font-size:10px}
  .pos-section{margin-bottom:32px}
  .p-top{aspect-ratio:1/.9}
  .p-number{font-size:40px}
  .p-avatar-img{width:88px;height:88px}
  .p-avatar{width:68px;height:68px;font-size:20px}
  .p-body{padding:12px 12px 0}
  .p-name{font-size:14px;word-break:break-word}
  .p-ign{font-size:10px}
  .p-role{font-size:9px}
  .p-stat-val{font-size:14px}
  .p-stat-lbl{font-size:8px}
  .p-pos{font-size:10px;padding:3px 8px}
  .p-cap{width:18px;height:18px;font-size:9px;right:34px}
  .p-flag{font-size:15px}

  /* Sponsors */
  .sp-top{margin-bottom:36px;gap:28px}
  .sp-top p{font-size:13px}
  .sp-kpis{grid-template-columns:1fr 1fr;gap:6px}
  .sp-kpi{padding:14px 16px}
  .sp-kpi-val{font-size:22px}
  .sp-kpi-lbl{font-size:9px}
  .sp-tile{min-width:120px;padding:18px 24px}
  .sp-tile.featured{min-height:100px;padding:26px 30px}
  .sp-name{font-size:18px}
  .sp-name.title{font-size:26px}
  .sp-name.gold{font-size:17px}
  .sp-name.partner{font-size:13px}
  .sp-cta{padding:22px;flex-direction:column;align-items:flex-start;gap:16px}
  .sp-cta-title{font-size:18px}
  .sp-cta-sub{font-size:13px}
  .sp-tier-label{font-size:9px}

  /* Social */
  .social-grid{grid-template-columns:repeat(2,1fr);gap:8px}
  .sc{padding:18px 16px}
  .sc-head{margin-bottom:16px}
  .sc-icon{width:36px;height:36px;font-size:11px}
  .sc-live{font-size:8px}
  .sc-platform{font-size:15px}
  .sc-handle{font-size:10px;margin-bottom:10px}
  .sc-desc{font-size:12px;margin-bottom:14px}
  .sc-cta{font-size:11px}

  /* Footer */
  .footer{padding:48px var(--pad-x) 20px}
  .footer-top{grid-template-columns:1fr 1fr;gap:28px;margin-bottom:28px;padding-bottom:28px}
  .footer-brand-logo{height:42px;width:42px;margin-bottom:12px}
  .footer-brand-name{font-size:20px}
  .footer-brand-tag{font-size:10px}
  .footer-bio{font-size:12px;margin-top:12px}
  .footer-col-title{font-size:11px;margin-bottom:14px}
  .footer-links a{font-size:12px}
  .footer-bottom{flex-direction:column;gap:10px;text-align:center;font-size:9px}
}

@media (max-width:480px){
  .footer-top{grid-template-columns:1fr;gap:22px}
  .footer-brand{order:-1}
  .social-grid{grid-template-columns:1fr}
  /* KPI 480'de de yatay kalır, sadece biraz daha küçük */
  .st-kpis{flex-wrap:nowrap;overflow-x:auto}
  .st-kpi{flex:0 0 auto;min-width:70px;padding:10px 12px 8px}
  .st-kpi:nth-child(odd){border-right:1px solid var(--line)}
  .st-kpi:nth-child(3){border-top:none}
  .st-kpi:nth-child(4){border-top:none}
  .st-kpi:nth-child(5){border-right:none}
  .st-kpi-val{font-size:18px}
  .st-kpi-lbl{font-size:8px;margin-top:5px;padding-top:5px}

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

  .p-card:hover{transform:translateY(-5px)}
  .p-card::after{width:150px;height:150px;opacity:.24}
  .p-pos{box-shadow:0 0 12px rgba(34,211,238,.14)}
  .p-avatar{box-shadow:0 0 20px rgba(34,211,238,.12),0 8px 18px rgba(0,0,0,.2)}
  .p-avatar-img{box-shadow:0 0 20px rgba(34,211,238,.12),0 10px 20px rgba(0,0,0,.22)}
}

@media (prefers-reduced-motion:reduce){
  *,*::before,*::after{animation-duration:.01ms !important;animation-iteration-count:1 !important;transition-duration:.01ms !important}
}
`;

/* ─────────────────────────────────────────────────────────────
   COMPONENTS
   ───────────────────────────────────────────────────────────── */

/* ─────────────────────────────────────────────────────────────
   STARFIELD CANVAS — sağ ve sol kenar hareketli yıldızlar
   ───────────────────────────────────────────────────────────── */


function StarCanvas({ side }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf, W = 0, H = 0;

    function resize() {
      const wrap = canvas.parentElement;
      W = wrap ? wrap.offsetWidth : 240;
      H = window.innerHeight;
      canvas.width  = W;
      canvas.height = H;
    }
    resize();
    window.addEventListener("resize", resize, { passive: true });

    /* ── Stars ── */
    const stars = Array.from({ length: 160 }, () => ({
      x: Math.random(), y: Math.random(),
      r: Math.random() < 0.1 ? Math.random() * 1.6 + 0.8 : Math.random() * 0.65 + 0.15,
      cyan: Math.random() < 0.22,
      a: Math.random() * 0.55 + 0.18,
      vy: -(Math.random() * 0.00018 + 0.00004),
      vx: (Math.random() - 0.5) * 0.00005,
      tw: Math.random() * 0.03 + 0.008,
      to: Math.random() * Math.PI * 2,
    }));

    /* ── Shooting stars ── */
    const shoots = Array.from({ length: 4 }, (_, i) => ({
      prog: Math.random(), speed: Math.random() * 0.004 + 0.002,
      x: Math.random(), y: Math.random() * 0.6, delay: i * 0.25,
    }));

    /* ── Geometric rings ── */
    const rings = [
      { cx: 0.5, cy: 0.28, r: 0.28, rot: 0,   rotSpeed: 0.0003,   a: 0.12, dashes: [12, 8],  w: 0.6 },
      { cx: 0.3, cy: 0.65, r: 0.18, rot: 1.2,  rotSpeed: -0.0005,  a: 0.09, dashes: [6, 14],  w: 0.5 },
      { cx: 0.7, cy: 0.45, r: 0.14, rot: 0.5,  rotSpeed: 0.0007,   a: 0.08, dashes: [20, 6],  w: 0.4 },
    ];

    /* ── Pulse circles ── */
    const pulses = [
      { cx: 0.5,  cy: 0.28, phase: 0,   speed: 0.008, maxR: 0.22, a: 0.18 },
      { cx: 0.25, cy: 0.72, phase: 2.1, speed: 0.006, maxR: 0.16, a: 0.14 },
      { cx: 0.75, cy: 0.5,  phase: 4.2, speed: 0.009, maxR: 0.18, a: 0.12 },
    ];

    /* ── Floating particles ── */
    const particles = Array.from({ length: 18 }, () => ({
      x: Math.random(), y: Math.random(),
      r: Math.random() * 2 + 1, a: Math.random() * 0.4 + 0.1,
      vx: (Math.random() - 0.5) * 0.0004,
      vy: -(Math.random() * 0.0006 + 0.0002),
      life: Math.random(), lifeSpeed: Math.random() * 0.002 + 0.001,
      cyan: Math.random() < 0.5,
    }));

    /* ── Arc segments ── */
    const arcs = [
      { cx: 0.5, cy: 0.28, r: 0.32, start: 0.2,  len: 0.8,  rot: 0,   rotSpeed: 0.0004,  a: 0.20, w: 1   },
      { cx: 0.5, cy: 0.28, r: 0.38, start: 2.5,  len: 1.2,  rot: 0,   rotSpeed: -0.0003, a: 0.12, w: 0.6 },
      { cx: 0.3, cy: 0.65, r: 0.22, start: 1.0,  len: 0.6,  rot: 1.2, rotSpeed: 0.0006,  a: 0.15, w: 0.8 },
      { cx: 0.7, cy: 0.45, r: 0.17, start: 3.5,  len: 1.4,  rot: 0.5, rotSpeed: -0.0004, a: 0.14, w: 0.7 },
    ];

    /* ── Diamond dots ── */
    const diamonds = Array.from({ length: 6 }, () => ({
      x: Math.random(), y: Math.random(),
      s: Math.random() * 3 + 1.5, a: Math.random() * 0.35 + 0.1,
      rot: Math.random() * Math.PI, rotSpeed: (Math.random() - 0.5) * 0.004,
      vy: -(Math.random() * 0.0003 + 0.0001),
    }));

    let t = 0;

    function draw() {
      if (!W || !H) { raf = requestAnimationFrame(draw); return; }
      ctx.clearRect(0, 0, W, H);
      t += 0.016;

      /* Pulse circles */
      pulses.forEach(p => {
        const phase    = (t * p.speed + p.phase) % (Math.PI * 2);
        const progress = (Math.sin(phase) + 1) / 2;
        const r = p.maxR * W * progress;
        const a = p.a * (1 - progress * 0.7);
        ctx.beginPath(); ctx.arc(p.cx * W, p.cy * H, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(34,211,238,${a})`; ctx.lineWidth = 0.8; ctx.stroke();
        if (progress > 0.2) {
          ctx.beginPath(); ctx.arc(p.cx * W, p.cy * H, r * 0.6, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(34,211,238,${a * 0.5})`; ctx.lineWidth = 0.4; ctx.stroke();
        }
      });

      /* Geometric rings */
      rings.forEach(ring => {
        ring.rot += ring.rotSpeed;
        ctx.save(); ctx.translate(ring.cx * W, ring.cy * H); ctx.rotate(ring.rot);
        ctx.setLineDash(ring.dashes);
        ctx.beginPath(); ctx.arc(0, 0, ring.r * W, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(34,211,238,${ring.a})`; ctx.lineWidth = ring.w; ctx.stroke();
        ctx.setLineDash([]); ctx.restore();
      });

      /* Arc segments */
      arcs.forEach(arc => {
        arc.rot += arc.rotSpeed;
        ctx.save(); ctx.translate(arc.cx * W, arc.cy * H); ctx.rotate(arc.rot);
        ctx.beginPath(); ctx.arc(0, 0, arc.r * W, arc.start, arc.start + arc.len);
        ctx.strokeStyle = `rgba(34,211,238,${arc.a})`; ctx.lineWidth = arc.w; ctx.stroke();
        ctx.restore();
      });

      /* Stars */
      stars.forEach(s => {
        const tw = 0.5 + 0.5 * Math.sin(t * s.tw * 60 + s.to);
        const a  = s.a * (0.4 + 0.6 * tw);
        const sx = s.x * W, sy = s.y * H;
        s.y += s.vy; s.x += s.vx;
        if (s.y < 0) { s.y = 1; s.x = Math.random(); }
        if (s.x < 0) s.x = 1; if (s.x > 1) s.x = 0;
        if (s.r > 0.9) {
          const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, s.r * 8);
          const c = s.cyan ? "34,211,238" : "190,215,255";
          g.addColorStop(0, `rgba(${c},${a * 0.5})`); g.addColorStop(1, `rgba(${c},0)`);
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, s.r * 8, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = `rgba(${s.cyan ? "34,211,238" : "210,228,255"},${a})`;
        ctx.beginPath(); ctx.arc(sx, sy, s.r, 0, Math.PI * 2); ctx.fill();
      });

      /* Shooting stars */
      shoots.forEach(s => {
        s.prog += s.speed;
        if (s.prog > 1) { s.prog = 0; s.x = Math.random(); s.y = Math.random() * 0.6; }
        const dir = side === "right" ? -1 : 1;
        const px = s.x * W + s.prog * 55 * dir, py = s.y * H + s.prog * 32;
        const g  = ctx.createLinearGradient(px, py, px - 40 * dir, py - 24);
        g.addColorStop(0, `rgba(34,211,238,${0.7 * Math.sin(s.prog * Math.PI)})`);
        g.addColorStop(1, "rgba(34,211,238,0)");
        ctx.strokeStyle = g; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - 40 * dir, py - 24); ctx.stroke();
      });

      /* Floating particles */
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.life += p.lifeSpeed;
        if (p.y < 0 || p.life > 1) { p.y = 1; p.x = Math.random(); p.life = 0; p.a = Math.random() * 0.4 + 0.1; }
        const a = p.a * Math.sin(p.life * Math.PI);
        const c = p.cyan ? "34,211,238" : "150,200,255";
        const g = ctx.createRadialGradient(p.x * W, p.y * H, 0, p.x * W, p.y * H, p.r * 4);
        g.addColorStop(0, `rgba(${c},${a})`); g.addColorStop(1, `rgba(${c},0)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x * W, p.y * H, p.r * 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(${c},${a})`;
        ctx.beginPath(); ctx.arc(p.x * W, p.y * H, p.r * 0.4, 0, Math.PI * 2); ctx.fill();
      });

      /* Diamond dots */
      diamonds.forEach(d => {
        d.y += d.vy; d.rot += d.rotSpeed;
        if (d.y < 0) { d.y = 1; d.x = Math.random(); }
        ctx.save(); ctx.translate(d.x * W, d.y * H); ctx.rotate(d.rot);
        ctx.strokeStyle = `rgba(34,211,238,${d.a})`; ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(0, -d.s); ctx.lineTo(d.s, 0); ctx.lineTo(0, d.s); ctx.lineTo(-d.s, 0);
        ctx.closePath(); ctx.stroke(); ctx.restore();
      });

      raf = requestAnimationFrame(draw);
    }

    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [side]);

  return (
    <div className={`side-canvas-wrap side-canvas-wrap--${side}`} aria-hidden>
      <canvas ref={canvasRef} className="side-canvas"/>
    </div>
  );
}


function Navigation({ scrolled }) {
  const links = [
    ["#matches",   "Results"],
    ["#standings", "Table"],
    ["#fixtures",  "Fixtures"],
    ["#squad",     "Squad"],
    ["#sponsors",  "Partners"],
    ["#broadcast", "Watch"],
  ];
  return (
    <nav className={`nav${scrolled ? " scrolled" : ""}`}>
      <div className="nav-left">
        <a href="#top" className="nav-logo" aria-label="ALTAIR eSports">
          <img src="/logo.png" alt="ALTAIR eSports" className="nav-logo-img" />
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
      <a href="#broadcast" className="nav-cta">Follow the Club</a>
      <button className="nav-burger" aria-label="Menu">
        <span/><span/><span/>
      </button>
    </nav>
  );
}


function Hero() {
  return (
    <section className="hero" id="top">
      <div className="hero-bg-base"/>
      <div className="hero-bg-grid"/>
      <div className="hero-bg-glow"/>
      <div className="hero-bg-noise"/>
      <div className="hero-stars-sm"/>
      <div className="hero-stars-md"/>
      <div className="hero-stars-cyan"/>

      <div className="hero-left">
        <img src="/logo.png" alt="ALTAIR" className="hero-mobile-logo"/>
        <div className="hero-tag">
          <span className="hero-tag-dot"/>
          <span>FC 26 · eMajor League</span>
          <span className="hero-tag-sep"/>
          <span>1. Lig · S26</span>
        </div>

        <h1 className="hero-h1">
          <span className="l">WE PLAY</span>
          <span className="l l-2">AS ONE.</span>
          <span className="l l-3">WE WIN TOGETHER.</span>
        </h1>

        <p className="hero-sub">
          <strong>ALTAIR eSports</strong> competes in the eMajor League FC 26 Pro Clubs 1. Lig — a disciplined, modern pro club built on chemistry, structure and relentless standards.
        </p>

        <div className="hero-ctas">
          <a href="https://www.twitch.tv/altairespor" target="_blank" rel="noopener noreferrer" className="btn btn-primary">
            Watch Live <span className="btn-arrow">→</span>
          </a>
          <a href="#squad" className="btn btn-secondary">
            Meet the Squad
          </a>
        </div>

      </div>

      <div className="hero-right">
        <div className="hero-stage">
          <div className="hero-logo-center">
            <img src="/logo.png" alt="ALTAIR crest" className="hero-logo-img"/>
          </div>
        </div>
      </div>

      <div className="hero-fade-bottom"/>
      <div className="hero-scroll">
        <span>Scroll</span>
        <div className="hero-scroll-line"/>
      </div>
    </section>
  );
}

function Ticker() {
  const items = [];
  RESULTS_FALLBACK.forEach(r => {
    items.push({ type:"result", r });
  });
  items.push({ type:"meta", text:"CURRENT FORM · W · W · W · W · W" });
  items.push({ type:"meta", text:"NEXT UP · ABRAKADABRA ESPORTS · 24 APR · 22:30 UTC+3" });
  items.push({ type:"meta", text:"BROADCAST LIVE ON TWITCH · /ALTAIRESPOR" });

  const loop = [...items, ...items];

  return (
    <div className="ticker" aria-label="Latest results ticker">
      <div className="ticker-tag">
        <span className="ticker-tag-dot"/>
        EML · 1. LIG
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
              <div key={i} className="ticker-item">
                <div className={`ticker-result ${r.result.toLowerCase()}`}>{r.result}</div>
                <span className={`t-team ${homeMe ? "me":""}`}>{r.homeAbbr}</span>
                <span className="t-score">{r.hs} – {r.as}</span>
                <span className={`t-team ${awayMe ? "me":""}`}>{r.awayAbbr}</span>
                <span className="ticker-meta">· {r.matchday}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Standings() {
  const { standings, altairRow, loading, error, lastUpdate, refetch } = useStandings();

  const alt = altairRow || STANDINGS_FALLBACK.find(t => t.me);
  const kpis = [
    { val: alt?.rank ? `${alt.rank}` : "–", unit: alt?.rank ? "th" : "", lbl:"Position" },
    { val: alt?.pts  ?? "–", unit:"pts", lbl:"Points" },
    { val: alt?.w    ?? "–", unit:"W",   lbl:"Wins"   },
    { val: alt?.gd   ?? "–", unit:"",    lbl:"Goal Diff" },
    { val: alt?.pld  ?? "–", unit:"GP",  lbl:"Played" },
  ];

  const updatedLabel = lastUpdate
    ? lastUpdate.toLocaleTimeString("tr-TR", { hour:"2-digit", minute:"2-digit" })
    : null;

  return (
    <section className="standings" id="standings">
      <div className="st-wrap">

        {/* Topbar */}
        <div className="st-topbar">
          <div className="st-topbar-left">
            <span className="st-comp">eMajor League</span>
            <span className="st-sep"/>
            <span className="st-season">FC 26 · 1. Lig · Season 2026</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {loading && <span style={{fontFamily:"var(--f-mono)",fontSize:9,letterSpacing:".14em",textTransform:"uppercase",color:"var(--muted)"}}>Updating…</span>}
            {error && !loading && <span style={{fontFamily:"var(--f-mono)",fontSize:9,letterSpacing:".14em",textTransform:"uppercase",color:"var(--loss)"}}>Cached data</span>}
            {updatedLabel && !loading && <span style={{fontFamily:"var(--f-mono)",fontSize:9,letterSpacing:".14em",textTransform:"uppercase",color:"var(--muted)"}}>{updatedLabel}</span>}
            <button onClick={refetch} title="Refresh"
              style={{background:"transparent",border:"1px solid var(--line-2)",color:"var(--muted)",padding:"3px 10px",cursor:"pointer",fontFamily:"var(--f-mono)",fontSize:9,letterSpacing:".14em",textTransform:"uppercase",transition:"all .2s"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--cyan)";e.currentTarget.style.color="var(--cyan)"}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--line-2)";e.currentTarget.style.color="var(--muted)"}}>
              ↻ Refresh
            </button>
            <div className="st-live"><span className="st-live-dot"/>Live Standings</div>
          </div>
        </div>

        {/* Hero — title + kpis side by side */}
        <div className="st-hero">
          <h2 className="st-hero-title">LIVE <em>TABLE</em></h2>
          <div className="st-kpis">
            {kpis.map((k, i) => (
              <div key={i} className={`st-kpi${loading ? " st-kpi--loading" : ""}`}>
                <div className="st-kpi-val">{k.val}{k.unit && <em>{k.unit}</em>}</div>
                <div className="st-kpi-lbl">{k.lbl}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="st-table-wrap">
          <div className="st-table-scroll">
            <div className="st-hdr">
              <span className="st-hdr-cell">#</span>
              <span className="st-hdr-cell left">Club</span>
              <span className="st-hdr-cell">P</span>
              <span className="st-hdr-cell">W</span>
              <span className="st-hdr-cell">D</span>
              <span className="st-hdr-cell">L</span>
              <span className="st-hdr-cell">GD</span>
              <span className="st-hdr-cell">Form</span>
              <span className="st-hdr-cell">Pts</span>
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
                  {String(s.form).split("").map((c, i) => (
                    <div key={i} className={`st-form-dot ${c.toLowerCase()}`}/>
                  ))}
                </div>
                <span className="st-pts">{s.pts}</span>
              </div>
            ))}
          </div>
          <div className="st-foot">
            <span className="st-foot-note">
              {loading ? "Loading…" : error ? "Cached · " + error : `Showing ranks ${standings[0]?.rank}–${standings[standings.length-1]?.rank} · 18 clubs total`}
            </span>
            <a className="st-foot-link" href="https://emajorleague.com/tournaments/league_table/39/" target="_blank" rel="noopener noreferrer">
              Full table on eMajor League →
            </a>
          </div>
        </div>

      </div>
    </section>
  );
}

function ResultCard({ r }) {
  const homeMe = r.home === "ALTAIR eSports";
  const awayMe = r.away === "ALTAIR eSports";
  const cls = r.result.toLowerCase();
  const label = r.result === "W" ? "Victory" : r.result === "L" ? "Defeat" : "Draw";

  return (
    <div className={`res-card ${cls}`}>
      <div className="res-desk">
        <div className="res-meta">
          <div className="res-gw">{r.matchday}</div>
          <div className="res-comp">{r.competition}</div>
          <div className="res-date">{r.date}</div>
        </div>
        <div className="res-team home">
          <div className="res-team-info">
            <div className="res-name">{r.home}</div>
            <div className="res-venue">{homeMe ? "Home" : ""}</div>
          </div>
          <ClubBadge className={`res-badge ${homeMe ? "me" : ""}`} isAltair={homeMe} label={r.homeAbbr} />
        </div>
        <div className="res-score">
          <span className="res-score-val">{r.hs}</span>
          <span className="res-score-sep">–</span>
          <span className="res-score-val">{r.as}</span>
        </div>
        <div className="res-team away">
          <ClubBadge className={`res-badge ${awayMe ? "me" : ""}`} isAltair={awayMe} label={r.awayAbbr} />
          <div className="res-team-info">
            <div className="res-name">{r.away}</div>
            <div className="res-venue">{awayMe ? "Away" : ""}</div>
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
          <div className="res-gw">{r.matchday}</div>
          <div className="res-date">{r.date}</div>
        </div>
        <div className="res-mob-teams">
          <div className="res-mob-team home">
            <ClubBadge className={`res-badge ${homeMe ? "me" : ""}`} isAltair={homeMe} label={r.homeAbbr} />
            <div className="res-mob-name">{r.home}</div>
          </div>
          <div className="res-mob-score">
            <span>{r.hs}</span>
            <span className="res-mob-sep">–</span>
            <span>{r.as}</span>
          </div>
          <div className="res-mob-team away">
            <ClubBadge className={`res-badge ${awayMe ? "me" : ""}`} isAltair={awayMe} label={r.awayAbbr} />
            <div className="res-mob-name">{r.away}</div>
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

function Results({ loading, results=[], error, refetch }) {
  const data = results.length ? results : RESULTS_FALLBACK;

  return (
    <section className="section" id="matches">
      <div className="container">
        <div className="sec-hdr">
          <div className="sec-hdr-left">
            <div className="sec-eyebrow">Matchday Report</div>
            <h2 className="sec-title">RECENT <span className="accent">RESULTS</span></h2>
            <p className="sec-sub">
              {loading ? "Loading latest results…" : "The last five matchdays, played and decided. Every performance measured."}
            </p>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {error && <span style={{fontFamily:"var(--f-mono)",fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:"var(--loss)"}}>Cached</span>}
            <button onClick={refetch} title="Refresh" style={{background:"transparent",border:"1px solid var(--line-2)",color:"var(--muted)",padding:"4px 10px",cursor:"pointer",fontFamily:"var(--f-mono)",fontSize:10,letterSpacing:".14em",textTransform:"uppercase"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--cyan)";e.currentTarget.style.color="var(--cyan)"}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--line-2)";e.currentTarget.style.color="var(--muted)"}}>
              ↻ Refresh
            </button>
            <a className="sec-link" href="#fixtures">View Fixtures <span className="sec-link-arrow">→</span></a>
          </div>
        </div>
        <div className="results-grid">
          {data.map(r => <ResultCard key={r.id} r={r}/>)}
        </div>
      </div>
    </section>
  );
}

function FixtureCard({ f }) {
  const homeMe = f.home === "ALTAIR eSports";
  const awayMe = f.away === "ALTAIR eSports";
  const venue = homeMe ? "Home" : "Away";
  return (
    <div className="fix-card">
      <div className="fix-date">
        <span className="fix-day">{f.day}</span>
        <span className="fix-month">{toEnglishMonthAbbr(f.month)}</span>
        <span className="fix-gw">{f.matchday}</span>
      </div>
      <div className="fix-divider"/>
      <div className="fix-match">
        <div className="fix-team home">
          <span className="fix-team-name">{f.home}</span>
          <ClubBadge className={`fix-badge ${homeMe ? "me" : ""}`} isAltair={homeMe} label={f.homeAbbr} />
        </div>
        <div className="fix-vs">
          <span className="fix-vs-line"/>
          <span className="fix-vs-text">VS</span>
        </div>
        <div className="fix-team away">
          <ClubBadge className={`fix-badge ${awayMe ? "me" : ""}`} isAltair={awayMe} label={f.awayAbbr} />
          <span className="fix-team-name">{f.away}</span>
        </div>
      </div>
      <div className="fix-divider"/>
      <div className="fix-meta">
        <span className="fix-time">{f.time}</span>
        <span className="fix-tz">UTC+3</span>
        <span className={`fix-venue ${venue.toLowerCase()}`}>{venue}</span>
      </div>
    </div>
  );
}

function Fixtures({ loading, fixtures=[], error, refetch }) {
  const data = fixtures.length ? fixtures : loading ? FIXTURES_FALLBACK : [];

  return (
    <section className="section section-compact" id="fixtures">
      <div className="container">
        <div className="sec-hdr">
          <div className="sec-hdr-left">
            <div className="sec-eyebrow">Upcoming Schedule</div>
            <h2 className="sec-title">NEXT <span className="accent">FIXTURES</span></h2>
            <p className="sec-sub">
              {loading ? "Loading upcoming fixtures…" : "Every upcoming matchday on the EML 1. Lig calendar. Broadcast live on Twitch."}
            </p>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {error && <span style={{fontFamily:"var(--f-mono)",fontSize:10,letterSpacing:".14em",textTransform:"uppercase",color:"var(--loss)"}}>Cached</span>}
            <button onClick={refetch} title="Refresh" style={{background:"transparent",border:"1px solid var(--line-2)",color:"var(--muted)",padding:"4px 10px",cursor:"pointer",fontFamily:"var(--f-mono)",fontSize:10,letterSpacing:".14em",textTransform:"uppercase"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--cyan)";e.currentTarget.style.color="var(--cyan)"}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--line-2)";e.currentTarget.style.color="var(--muted)"}}>
              ↻ Refresh
            </button>
            <a className="sec-link" href="https://www.twitch.tv/altairespor" target="_blank" rel="noopener noreferrer">
              Watch on Twitch <span className="sec-link-arrow">→</span>
            </a>
          </div>
        </div>
        <div className="fix-grid">
          {data.map(f => <FixtureCard key={f.id} f={f}/>)}
        </div>
      </div>
    </section>
  );
}

function PlayerCard({ p }) {
  return (
    <a href={p.profileUrl} target="_blank" rel="noopener noreferrer" className="p-card">
      <div className="p-top">
        <div className="p-pos">{p.pos}</div>
        {p.captain && <div className="p-cap" title="Captain">C</div>}
        <div className="p-flag">{p.flag}</div>
        <div className="p-number">{p.number}</div>
        {p.image
          ? <img src={p.image} alt={p.name} className="p-avatar-img"/>
          : <div className="p-avatar">{p.init}</div>}
      </div>
      <div className="p-body">
        <div className="p-role">{p.role}</div>
        <div className="p-name">{p.name}</div>
        <div className="p-ign">{p.ign}</div>
        <div className="p-stats">
          <div className="p-stat">
            <div className="p-stat-val">{p.apps}</div>
            <div className="p-stat-lbl">Apps</div>
          </div>
          <div className="p-stat">
            <div className="p-stat-val">{p.goals}</div>
            <div className="p-stat-lbl">Goals</div>
          </div>
          <div className="p-stat">
            <div className="p-stat-val">{p.assists}</div>
            <div className="p-stat-lbl">Assists</div>
          </div>
        </div>
      </div>
    </a>
  );
}

function Squad() {
  const total = SQUAD.reduce((n, g) => n + g.players.length, 0);
  return (
    <section className="section squad" id="squad">
      <div className="container">
        <div className="sec-hdr">
          <div className="sec-hdr-left">
            <div className="sec-eyebrow">Season 2026 Roster</div>
            <h2 className="sec-title">THE <span className="accent">SQUAD</span></h2>
            <p className="sec-sub">Fourteen players. One club. The current ALTAIR roster competing in the FC 26 Pro Clubs 1. Lig.</p>
          </div>
          <div className="sec-link" style={{ pointerEvents:"none", background:"var(--cyan-soft)", borderColor:"var(--cyan-edge)", color:"var(--cyan)" }}>
            {total} Players
          </div>
        </div>

        {SQUAD.map((g, gi) => (
          <div key={gi} className="pos-section">
            <div className="pos-label">
              <span className="pos-pill">{g.abbr}</span>
              <span className="pos-group-name">{g.group}</span>
              <span className="pos-count">{g.players.length} {g.players.length > 1 ? "players" : "player"}</span>
            </div>
            <div className="squad-grid">
              {g.players.map((p, pi) => <PlayerCard key={pi} p={p}/>)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Sponsors() {
  return (
    <section className="section sponsors" id="sponsors">
      <div className="container">
        <div className="sec-hdr">
          <div className="sec-hdr-left">
            <div className="sec-eyebrow">Partners &amp; Sponsors</div>
            <h2 className="sec-title">OUR <span className="accent">PARTNERS</span></h2>
          </div>
        </div>

        <div className="sp-top">
          <p>
            ALTAIR partners with brands that share our drive for excellence. We deliver an authentic, engaged audience at the intersection of football and competitive gaming — a growing community that watches, streams, and buys.
          </p>
          <div className="sp-kpis">
            {[
              { val:"200K+", lbl:"Combined Reach" },
              { val:"VPG",   lbl:"Club Ranking" },
              { val:"1",     lbl:"Titles Won" },
              { val:"15",    lbl:"Active Players" },
            ].map((k, i) => (
              <div key={i} className="sp-kpi">
                <div className="sp-kpi-val">{k.val}</div>
                <div className="sp-kpi-lbl">{k.lbl}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="sp-tier">
          <div className="sp-tier-head">
            <span className="sp-tier-label">Title Partner</span>
            <div className="sp-tier-line"/>
            <span className="sp-tier-count">01</span>
          </div>
          <div className="sp-row">
            {SPONSORS.title.map(n => (
              <div key={n} className="sp-tile featured"><span className="sp-name title">{n}</span></div>
            ))}
          </div>
        </div>

        <div className="sp-tier">
          <div className="sp-tier-head">
            <span className="sp-tier-label">Gold Partners</span>
            <div className="sp-tier-line"/>
            <span className="sp-tier-count">0{SPONSORS.gold.length}</span>
          </div>
          <div className="sp-row">
            {SPONSORS.gold.map(n => (
              <div key={n} className="sp-tile"><span className="sp-name gold">{n}</span></div>
            ))}
          </div>
        </div>

        <div className="sp-tier">
          <div className="sp-tier-head">
            <span className="sp-tier-label">Official Partners</span>
            <div className="sp-tier-line"/>
            <span className="sp-tier-count">0{SPONSORS.partners.length}</span>
          </div>
          <div className="sp-row">
            {SPONSORS.partners.map(n => (
              <div key={n} className="sp-tile"><span className="sp-name partner">{n}</span></div>
            ))}
          </div>
        </div>

        <div className="sp-cta">
          <div className="sp-cta-text">
            <div className="sp-cta-title">Become an ALTAIR Partner</div>
            <div className="sp-cta-sub">Reach the next generation of competitive football fans through matchday broadcasts, digital content and on-kit placement.</div>
          </div>
          <div className="sp-cta-actions">
            <a href="#" className="btn btn-primary">Get in Touch <span className="btn-arrow">→</span></a>
            <a href="#" className="btn btn-secondary">Partnership Deck</a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Social() {
  return (
    <section className="section" id="broadcast">
      <div className="container">
        <div className="sec-hdr">
          <div className="sec-hdr-left">
            <div className="sec-eyebrow">Broadcasts &amp; Community</div>
            <h2 className="sec-title">FOLLOW <span className="accent">ALTAIR</span></h2>
            <p className="sec-sub">Every live match, every highlight, every behind-the-scenes moment — across the channels where the ALTAIR community lives.</p>
          </div>
        </div>
        <div className="social-grid">
          {SOCIAL.map((s, i) => (
            <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className={`sc ${s.cls}`}>
              <div className="sc-head">
                <div className="sc-icon">{s.icon}</div>
                <span className="sc-live">Official</span>
              </div>
              <div className="sc-platform">{s.platform}</div>
              <div className="sc-handle">{s.handle}</div>
              <div className="sc-desc">{s.desc}</div>
              <span className="sc-cta">{s.cta} <span>→</span></span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const clubLinks = ["About ALTAIR","Season History","Honours","Press Kit","Careers"];
  const compLinks = [
    { url:"https://emajorleague.com/teams/team/337/", label:"Team Page", external:true },
    { url:"https://emajorleague.com/tournaments/league_table/39/", label:"League Table", external:true },
    { url:"#fixtures", label:"Fixtures" },
    { url:"#matches",  label:"Statistics" },
    { url:"#squad",    label:"Squad" },
  ];
  const connectLinks = ["Sponsorships","Media Enquiries","Fan Community","Merchandise","Contact Us"];

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-top">
          <div className="footer-brand">
            <img src="/logo.png" alt="ALTAIR eSports" className="footer-brand-logo"/>
            <div className="footer-brand-name">ALTAIR eSports</div>
            <div className="footer-brand-tag">FC 26 Pro Clubs · eMajor League</div>
            <p className="footer-bio">A professional FC 26 Pro Clubs organisation competing in the EML 1. Lig. Built on structure, chemistry and a relentless standard.</p>
          </div>
          <div>
            <div className="footer-col-title">Club</div>
            <ul className="footer-links">
              {clubLinks.map(l => <li key={l}><a href="#">{l}</a></li>)}
            </ul>
          </div>
          <div>
            <div className="footer-col-title">Competition</div>
            <ul className="footer-links">
              {compLinks.map(l => (
                <li key={l.label}>
                  <a href={l.url} target={l.external ? "_blank" : undefined} rel={l.external ? "noopener noreferrer" : undefined}>
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="footer-col-title">Connect</div>
            <ul className="footer-links">
              {connectLinks.map(l => <li key={l}><a href="#">{l}</a></li>)}
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 ALTAIR eSports · All rights reserved</span>
          <div className="footer-legal">
            <span>Competing in <a href="https://emajorleague.com/tournaments/league_table/39/" target="_blank" rel="noopener noreferrer">FC 26 · 1. Lig</a></span>
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ─────────────────────────────────────────────────────────────
   ROOT
   ───────────────────────────────────────────────────────────── */

export default function AltairFC() {
  const [scrolled, setScrolled] = useState(false);
  const fixtureData = useFixtures();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <style>{css}</style>
      {/* Canvas'lar ana div'in DIŞINDA — fixed positioning için */}
      <StarCanvas side="left"/>
      <StarCanvas side="right"/>

      <div style={{position:"relative"}}>
        <Navigation scrolled={scrolled}/>
        <Hero/>
        <Ticker/>
        <Standings/>
        <Results {...fixtureData}/>
        <Fixtures {...fixtureData}/>
        <Squad/>
        <Sponsors/>
        <Social/>
        <Footer/>
      </div>
    </>
  );
}
