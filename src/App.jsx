import { useState, useEffect } from "react";

/* ─────────────────────────────────────────────────────────
   DATA  —  sourced from eMajor League
   Team: ALTAIR eSports (#337) | Competition: FC 26 | 1. Lig (#39)
───────────────────────────────────────────────────────── */

const RESULTS = [
  { id:1, date:"10 Apr 2026", matchday:"GW 11", competition:"EML | 1. Lig", home:"ALTAIR eSports", homeAbbr:"ALT", away:"Revenge Esports", awayAbbr:"REV", score:"2 – 0", hs:2, as:0, result:"W", venue:"Home" },
  { id:2, date:"10 Apr 2026", matchday:"GW 12", competition:"EML | 1. Lig", home:"VOGUE",          homeAbbr:"VOG", away:"ALTAIR eSports", awayAbbr:"ALT", score:"0 – 2", hs:0, as:2, result:"W", venue:"Away" },
  { id:3, date:"17 Apr 2026", matchday:"GW 13", competition:"EML | 1. Lig", home:"ALTAIR eSports", homeAbbr:"ALT", away:"Blackburn FC",   awayAbbr:"BLA", score:"2 – 0", hs:2, as:0, result:"W", venue:"Home" },
  { id:4, date:"17 Apr 2026", matchday:"GW 14", competition:"EML | 1. Lig", home:"Anatomy FC",     homeAbbr:"ANA", away:"ALTAIR eSports", awayAbbr:"ALT", score:"0 – 5", hs:0, as:5, result:"W", venue:"Away" },
  { id:5, date:"17 Apr 2026", matchday:"GW 15", competition:"EML | 1. Lig", home:"ALTAIR eSports", homeAbbr:"ALT", away:"Bolton VFC",     awayAbbr:"BOL", score:"3 – 0", hs:3, as:0, result:"W", venue:"Home" },
];

const FIXTURES = [
  { id:1, day:"24", month:"APR", time:"22:30", matchday:"GW 16", competition:"EML | 1. Lig", home:"Abrakadabra eSports", homeAbbr:"ABR", away:"ALTAIR eSports", awayAbbr:"ALT", venue:"Away" },
  { id:2, day:"24", month:"APR", time:"23:00", matchday:"GW 17", competition:"EML | 1. Lig", home:"ALTAIR eSports",      homeAbbr:"ALT", away:"Pure Focus",      awayAbbr:"PUR", venue:"Home" },
  { id:3, day:"24", month:"APR", time:"23:30", matchday:"GW 18", competition:"EML | 1. Lig", home:"Redus EFC",           homeAbbr:"RED", away:"ALTAIR eSports", awayAbbr:"ALT", venue:"Away" },
  { id:4, day:"01", month:"MAY", time:"22:30", matchday:"GW 19", competition:"EML | 1. Lig", home:"SAMURAI",             homeAbbr:"SAM", away:"ALTAIR eSports", awayAbbr:"ALT", venue:"Away" },
];

const STANDINGS_COMPACT = [
  { rank:5, abbr:"SOH", name:"Sons Of Hell",   pld:14, w:9, d:1, l:4, gd:"+26", pts:28, form:"LLL", me:false },
  { rank:6, abbr:"ALT", name:"ALTAIR eSports", pld:15, w:9, d:1, l:5, gd:"+21", pts:28, form:"WWW", me:true  },
  { rank:7, abbr:"RED", name:"Redus EFC",       pld:14, w:8, d:1, l:5, gd:"+15", pts:25, form:"LWL", me:false },
];

const SQUAD = [
  { group:"Goalkeepers", abbr:"GK", players:[
    { number:"1",  name:"MEHMETCAN BABAT",    ign:"mcb06099",     pos:"GK",  role:"Goalkeeper",                    flag:"🇹🇷", init:"MB",  apps:7,  goals:0, assists:0, captain:false, profileUrl:"https://emajorleague.com/players/profile/6666/", image:"public/players/Mehmetcan.png" },
    { number:"31", name:"BERK SER",           ign:"Bwrkser",      pos:"GK",  role:"Goalkeeper",                    flag:"🇹🇷", init:"BS",  apps:5,  goals:0, assists:0, captain:false, profileUrl:"https://emajorleague.com/players/profile/6644/", image:"public/players/Berk.png" },
  ]},
  { group:"Defenders", abbr:"DEF", players:[
    { number:"5",  name:"AYBERK ÖZTÜRK",      ign:"LethalGullit", pos:"CB",  role:"Centre-Back",                   flag:"🇹🇷", init:"AÖ",  apps:12, goals:2, assists:1, captain:false, profileUrl:"https://emajorleague.com/players/profile/8829/", image:"public/players/Ayberk.png" },
    { number:"99", name:"EGE YILMAZ",         ign:"Zeppettoo",    pos:"CB",  role:"Centre-Back",                   flag:"🇹🇷", init:"EY",  apps:12, goals:1, assists:0, captain:false, profileUrl:"https://emajorleague.com/players/profile/9059/", image:"public/players/Ege.png" },
    { number:"3",  name:"ÖMÜR ÇORUMLUOĞLU",  ign:"creedxzenci",  pos:"CB",  role:"Centre-Back",                   flag:"🇹🇷", init:"ÖÇ",  apps:3,  goals:1, assists:0, captain:false, profileUrl:"https://emajorleague.com/players/profile/8458/", image:"public/players/Ömür.png" },
    { number:"15", name:"EFE GÜLER",          ign:"TRU-xEf3s",    pos:"RWB", role:"Right Wing Back",               flag:"🇹🇷", init:"EG",  apps:2,  goals:3, assists:0, captain:false, profileUrl:"https://emajorleague.com/players/profile/7200/", image:"public/players/Efes.png" },
    { number:"57", name:"SACİT KARACA",       ign:"Sparostago1",  pos:"RWB", role:"Right Wing Back",               flag:"🇹🇷", init:"SK",  apps:0,  goals:0, assists:0, captain:false, profileUrl:"https://emajorleague.com/players/profile/9224/" },
    { number:"21", name:"RÜŞTÜ ALPER GÜLER", ign:"DreamArmyA",   pos:"RWB", role:"Right Wing Back",               flag:"🇹🇷", init:"RAG", apps:0,  goals:0, assists:0, captain:false, profileUrl:"https://emajorleague.com/players/profile/9054/" },
    { number:"11", name:"HAZAR TARASHOHİ",   ign:"KingHzrq",     pos:"LWB", role:"Left Wing Back",                flag:"🇹🇷", init:"HT",  apps:9,  goals:1, assists:0, captain:false, profileUrl:"https://emajorleague.com/players/profile/8814/", image:"public/players/Hazar.png" },
    { number:"66", name:"EFE DEMİR",          ign:"future1444",   pos:"LWB", role:"Left Wing Back",                flag:"🇹🇷", init:"ED",  apps:6,  goals:0, assists:0, captain:false, profileUrl:"https://emajorleague.com/players/profile/9929/", image:"public/players/Efe.png" },
    { number:"14", name:"YUSUF EREN ZİYREK", ign:"Sk4y0",         pos:"LWB", role:"Left Wing Back",                flag:"🇹🇷", init:"YEZ", apps:7,  goals:0, assists:0, captain:false, profileUrl:"https://emajorleague.com/Sky/", image:"public/players/Yusuf.png" },
  ]},
  { group:"Midfielders", abbr:"MID", players:[
    { number:"35", name:"KARAHAN ZEKİ TAŞKAN",  ign:"maniac_kara35", pos:"CDM", role:"Central Defensive Midfielder", flag:"🇹🇷", init:"KZT", apps:12, goals:0, assists:1,  captain:true,  profileUrl:"https://emajorleague.com/players/profile/9020/", image:"public/players/Karahan.png" },
    { number:"10", name:"ŞENER YİĞİT ÇOKYÜCEL", ign:"yigitinski",    pos:"CM",  role:"Central Midfielder",           flag:"🇹🇷", init:"ŞYÇ", apps:12, goals:0, assists:10, captain:true,  profileUrl:"https://emajorleague.com/yigitinski/", image:"public/players/Yiğit.png" },
    { number:"77", name:"ORÇUN BEKTAŞ",          ign:"ORC-HI",        pos:"CM",  role:"Central Midfielder",           flag:"🇹🇷", init:"OB",  apps:12, goals:2, assists:3,  captain:true,  profileUrl:"https://emajorleague.com/players/profile/1897/", image:"public/players/Orçun.png" },
  ]},
  { group:"Forwards", abbr:"FWD", players:[
    { number:"9", name:"GÖRKEM YAVUZ",   ign:"Grkm10Fire", pos:"ST", role:"Striker", flag:"🇹🇷", init:"GY", apps:2,  goals:2, assists:4, captain:false, profileUrl:"https://emajorleague.com/players/profile/6171/", image:"public/players/Görkem.png" },
    { number:"7", name:"DOĞUKAN TOMBUL", ign:"Xwrdodo",    pos:"ST", role:"Striker", flag:"🇹🇷", init:"DK", apps:12, goals:8, assists:3, captain:false, profileUrl:"https://emajorleague.com/Dooggyy/", image:"public/players/Doğukan.png" },
  ]},
];

const SPONSORS = {
  title:    ["NEXCORE"],
  gold:     ["STEELWAVE", "HYPERTEK"],
  partners: ["ARGON", "PIXELRIFT", "VAULTNET"],
};

const SOCIAL = [
  { cls:"tw", icon:"Tw", platform:"Twitch",      handle:"/altairespor",  desc:"Live match broadcasts every matchday with full commentary.",   cta:"Watch Live", url:"https://www.twitch.tv/altairespor" },
  { cls:"yt", icon:"YT", platform:"YouTube",     handle:"@AltairESPOR",  desc:"Match replays, player breakdowns and season recaps.",          cta:"Subscribe", url:"https://www.youtube.com/@AltairESPOR" },
  { cls:"ig", icon:"IG", platform:"Instagram",   handle:"@altairesports", desc:"Behind the scenes, squad content and matchday graphics.",      cta:"Follow", url:"https://www.instagram.com/altairesports/" },
  { cls:"DC",  icon:"DC",  platform:"Discord", handle:"Join our server",  desc:"Join our community, connect with players and stay updated.", cta:"JOIN", url:"https://discord.gg/uMgQKQmr" }
];

/* ─────────────────────────────────────────────────────────
   STYLES
───────────────────────────────────────────────────────── */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Anton&family=Barlow+Condensed:wght@400;500;600;700;800;900&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,300&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{background:#07090f;color:#eef2f8;font-family:'DM Sans',sans-serif;overflow-x:hidden;-webkit-font-smoothing:antialiased}

:root{
  --ink:   #07090f;
  --ink2:  #0c0f19;
  --ink3:  #111622;
  --rim:   rgba(255,255,255,.055);
  --rim2:  rgba(255,255,255,.1);
  --cyan:  #00c8f0;
  --cyan2: #40daff;
  --cdim:  rgba(0,200,240,.1);
  --white: #eef2f8;
  --silver:#8a95a8;
  --muted: #4a5568;
  --green: #22c55e;
  --red:   #ef4444;
  --draw:  #64748b;
  --fd:'Anton',sans-serif;
  --fc:'Barlow Condensed',sans-serif;
  --fb:'DM Sans',sans-serif;
}

/* ── NAV ─────────────────────────── */
.nav{position:fixed;top:0;left:0;right:0;z-index:200;height:66px;display:flex;align-items:center;justify-content:space-between;padding:0 44px;border-bottom:1px solid transparent;transition:background .35s,border-color .35s}
.nav.scrolled{background:rgba(7,9,15,.97);border-color:var(--rim);backdrop-filter:blur(14px)}
.nav-logo{display:flex;align-items:center;gap:10px;text-decoration:none}
.nav-logo-img{height:50px;width:50px;object-fit:contain;display:block;flex-shrink:0;filter:drop-shadow(0 0 7px rgba(0,200,240,.4)) drop-shadow(0 0 2px rgba(0,200,240,.2))}
.nav-wordmark{display:flex;flex-direction:column;line-height:1;justify-content:center}
.nav-wm-top{font-family:var(--fd);font-size:17px;letter-spacing:.07em;color:var(--white);line-height:1}
.nav-wm-sub{font-family:var(--fc);font-size:10px;font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:var(--cyan);margin-top:3px;opacity:.8}
.nav-links{display:flex;gap:32px;list-style:none}
.nav-links a{font-family:var(--fc);font-size:14px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--silver);text-decoration:none;transition:color .2s}
.nav-links a:hover{color:var(--white)}
.nav-cta{font-family:var(--fc);font-size:13px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;padding:9px 22px;background:var(--cyan);color:var(--ink);border:none;cursor:pointer;transition:background .2s,box-shadow .2s}
.nav-cta:hover{background:var(--cyan2);box-shadow:0 0 20px rgba(0,200,240,.3)}

/* ═══════════════════════════════════
   HERO — two-column redesign
═══════════════════════════════════ */
.hero{
  position:relative;min-height:100vh;
  display:grid;grid-template-columns:1fr 1fr;
  align-items:center;
  padding:0;overflow:hidden;
}


/* backgrounds */
.hero-bg{position:absolute;inset:0;background:linear-gradient(140deg,#080f20 0%,#040610 50%,#07090f 100%)}
.hero-grid{
  position:absolute;inset:0;
  background-image:
    repeating-linear-gradient(0deg,transparent,transparent 59px,rgba(255,255,255,.022) 60px),
    repeating-linear-gradient(90deg,transparent,transparent 59px,rgba(255,255,255,.022) 60px);
  mask-image:linear-gradient(to right,rgba(0,0,0,.6) 0%,transparent 55%);
}
/* vertical divider glow */
.hero-split-line{
  position:absolute;left:50%;top:10%;bottom:10%;width:1px;
  background:linear-gradient(to bottom,transparent,rgba(0,200,240,.15) 30%,rgba(0,200,240,.25) 50%,rgba(0,200,240,.15) 70%,transparent);
  z-index:1;
}
/* bottom fade */
.hero-fade-b{position:absolute;bottom:0;left:0;right:0;height:28%;background:linear-gradient(to top,#07090f,transparent);z-index:1}

/* ═══════════════════════════════════
   STAR BACKGROUND — hero-stars
═══════════════════════════════════ */

/* Layer 1 — dense small white stars */
.hero-stars::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  background-image:
    radial-gradient(1px 1px at 8%   12%, rgba(255,255,255,0.55) 0%, transparent 100%),
    radial-gradient(1px 1px at 17%  34%, rgba(255,255,255,0.45) 0%, transparent 100%),
    radial-gradient(1px 1px at 29%  7%,  rgba(255,255,255,0.60) 0%, transparent 100%),
    radial-gradient(1px 1px at 41%  55%, rgba(255,255,255,0.40) 0%, transparent 100%),
    radial-gradient(1px 1px at 53%  22%, rgba(255,255,255,0.50) 0%, transparent 100%),
    radial-gradient(1px 1px at 63%  78%, rgba(255,255,255,0.45) 0%, transparent 100%),
    radial-gradient(1px 1px at 74%  41%, rgba(255,255,255,0.55) 0%, transparent 100%),
    radial-gradient(1px 1px at 83%  15%, rgba(255,255,255,0.50) 0%, transparent 100%),
    radial-gradient(1px 1px at 92%  67%, rgba(255,255,255,0.40) 0%, transparent 100%),
    radial-gradient(1px 1px at 5%   88%, rgba(255,255,255,0.45) 0%, transparent 100%),
    radial-gradient(1px 1px at 22%  72%, rgba(255,255,255,0.50) 0%, transparent 100%),
    radial-gradient(1px 1px at 36%  91%, rgba(255,255,255,0.35) 0%, transparent 100%),
    radial-gradient(1px 1px at 47%  44%, rgba(255,255,255,0.55) 0%, transparent 100%),
    radial-gradient(1px 1px at 58%  6%,  rgba(255,255,255,0.45) 0%, transparent 100%),
    radial-gradient(1px 1px at 69%  59%, rgba(255,255,255,0.50) 0%, transparent 100%),
    radial-gradient(1px 1px at 79%  83%, rgba(255,255,255,0.40) 0%, transparent 100%),
    radial-gradient(1px 1px at 88%  28%, rgba(255,255,255,0.55) 0%, transparent 100%),
    radial-gradient(1px 1px at 97%  47%, rgba(255,255,255,0.45) 0%, transparent 100%),
    radial-gradient(1px 1px at 13%  51%, rgba(255,255,255,0.40) 0%, transparent 100%),
    radial-gradient(1px 1px at 26%  19%, rgba(255,255,255,0.50) 0%, transparent 100%),
    radial-gradient(1px 1px at 44%  74%, rgba(255,255,255,0.45) 0%, transparent 100%),
    radial-gradient(1px 1px at 55%  38%, rgba(255,255,255,0.55) 0%, transparent 100%),
    radial-gradient(1px 1px at 67%  93%, rgba(255,255,255,0.35) 0%, transparent 100%),
    radial-gradient(1px 1px at 76%  62%, rgba(255,255,255,0.50) 0%, transparent 100%),
    radial-gradient(1px 1px at 85%  5%,  rgba(255,255,255,0.45) 0%, transparent 100%),
    radial-gradient(1px 1px at 93%  81%, rgba(255,255,255,0.40) 0%, transparent 100%),
    radial-gradient(1px 1px at 3%   37%, rgba(255,255,255,0.55) 0%, transparent 100%),
    radial-gradient(1px 1px at 32%  63%, rgba(255,255,255,0.45) 0%, transparent 100%),
    radial-gradient(1px 1px at 51%  87%, rgba(255,255,255,0.40) 0%, transparent 100%),
    radial-gradient(1px 1px at 71%  24%, rgba(255,255,255,0.50) 0%, transparent 100%);
  background-size: 320px 240px;
  animation: starDriftA 180s linear infinite;
  pointer-events: none;
}

/* Layer 2 — medium stars, mix of white + cyan glow */
.hero-stars::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  background-image:
    radial-gradient(1.5px 1.5px at 11%  23%, rgba(255,255,255,0.65) 0%, transparent 100%),
    radial-gradient(2px   2px   at 24%  64%, rgba(0,200,240,0.50)   0%, transparent 100%),
    radial-gradient(1.5px 1.5px at 38%  18%, rgba(255,255,255,0.60) 0%, transparent 100%),
    radial-gradient(2.5px 2.5px at 49%  79%, rgba(0,200,240,0.40)   0%, transparent 100%),
    radial-gradient(1.5px 1.5px at 61%  42%, rgba(255,255,255,0.65) 0%, transparent 100%),
    radial-gradient(2px   2px   at 72%  11%, rgba(0,200,240,0.45)   0%, transparent 100%),
    radial-gradient(1.5px 1.5px at 84%  57%, rgba(255,255,255,0.55) 0%, transparent 100%),
    radial-gradient(2px   2px   at 93%  88%, rgba(0,200,240,0.35)   0%, transparent 100%),
    radial-gradient(1.5px 1.5px at 6%   71%, rgba(255,255,255,0.60) 0%, transparent 100%),
    radial-gradient(2px   2px   at 19%  47%, rgba(0,200,240,0.42)   0%, transparent 100%),
    radial-gradient(2.5px 2.5px at 33%  85%, rgba(255,255,255,0.55) 0%, transparent 100%),
    radial-gradient(1.5px 1.5px at 46%  32%, rgba(0,200,240,0.48)   0%, transparent 100%),
    radial-gradient(2px   2px   at 57%  96%, rgba(255,255,255,0.50) 0%, transparent 100%),
    radial-gradient(1.5px 1.5px at 68%  68%, rgba(0,200,240,0.38)   0%, transparent 100%),
    radial-gradient(2px   2px   at 81%  14%, rgba(255,255,255,0.65) 0%, transparent 100%),
    radial-gradient(2.5px 2.5px at 90%  53%, rgba(0,200,240,0.44)   0%, transparent 100%),
    radial-gradient(1.5px 1.5px at 15%  9%,  rgba(255,255,255,0.60) 0%, transparent 100%),
    radial-gradient(2px   2px   at 77%  37%, rgba(0,200,240,0.40)   0%, transparent 100%),
    radial-gradient(1.5px 1.5px at 43%  58%, rgba(255,255,255,0.55) 0%, transparent 100%),
    radial-gradient(2px   2px   at 28%  92%, rgba(0,200,240,0.36)   0%, transparent 100%);
  background-size: 480px 360px;
  animation: starDriftB 120s linear infinite;
  pointer-events: none;
}

/* Layer 3 — sparse larger accent stars with perceptible glow radius */
.hero-stars .hero-bg::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  background-image:
    radial-gradient(3px 3px at 14%  31%, rgba(0,200,240,0.60)   0%, rgba(0,200,240,0.04) 6px, transparent 12px),
    radial-gradient(2.5px 2.5px at 37% 8%, rgba(255,255,255,0.80) 0%, rgba(255,255,255,0.04) 5px, transparent 10px),
    radial-gradient(3px 3px at 59%  52%, rgba(0,200,240,0.55)   0%, rgba(0,200,240,0.03) 7px, transparent 14px),
    radial-gradient(2.5px 2.5px at 77% 77%,rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.04) 5px, transparent 10px),
    radial-gradient(3px 3px at 91%  22%, rgba(0,200,240,0.50)   0%, rgba(0,200,240,0.03) 6px, transparent 12px),
    radial-gradient(2.5px 2.5px at 5%  64%, rgba(255,255,255,0.70) 0%, rgba(255,255,255,0.04) 5px, transparent 10px),
    radial-gradient(3px 3px at 28%  48%, rgba(0,200,240,0.52)   0%, rgba(0,200,240,0.03) 6px, transparent 12px),
    radial-gradient(2.5px 2.5px at 52% 89%, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.03) 5px, transparent 10px),
    radial-gradient(3px 3px at 70%  17%, rgba(0,200,240,0.58)   0%, rgba(0,200,240,0.04) 7px, transparent 14px),
    radial-gradient(2.5px 2.5px at 85% 43%, rgba(255,255,255,0.78) 0%, rgba(255,255,255,0.04) 5px, transparent 10px),
    radial-gradient(3px 3px at 20%  76%, rgba(0,200,240,0.48)   0%, rgba(0,200,240,0.03) 6px, transparent 12px),
    radial-gradient(2.5px 2.5px at 46% 28%, rgba(255,255,255,0.68) 0%, rgba(255,255,255,0.03) 5px, transparent 10px);
  background-size: 640px 480px;
  animation: starDriftC 90s linear infinite;
  pointer-events: none;
}

/* ensure .hero-bg is position:relative so its ::after is contained */
.hero-stars .hero-bg {
  position: absolute;
  inset: 0;
}

/* ── Drift animations (vertical only, looping seamlessly) ── */
@keyframes starDriftA {
  from { transform: translateY(0); }
  to   { transform: translateY(-240px); }
}
@keyframes starDriftB {
  from { transform: translateY(0); }
  to   { transform: translateY(-360px); }
}
@keyframes starDriftC {
  from { transform: translateY(0); }
  to   { transform: translateY(-480px); }
}

/* Respect reduced-motion preference */
@media (prefers-reduced-motion: reduce) {
  .hero-stars::before,
  .hero-stars::after,
  .hero-stars .hero-bg::after {
    animation: none;
  }
}

/* ── LEFT COLUMN ── */
.hero-left{
  position:relative;z-index:2;
  padding:120px 56px 80px 44px;
  display:flex;flex-direction:column;justify-content:center;
}
.hero-pill{
  display:inline-flex;align-items:center;gap:8px;
  padding:5px 14px;margin-bottom:28px;
  border:1px solid rgba(0,200,240,.2);background:rgba(0,200,240,.06);
  font-family:var(--fc);font-size:11px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--cyan);
  width:fit-content;
}
.hero-pill-dot{width:5px;height:5px;border-radius:50%;background:var(--cyan);animation:blink 2s ease infinite;flex-shrink:0}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
.hero-h1{
  font-family:var(--fd);
  font-size:clamp(48px,5.5vw,80px);
  line-height:1;letter-spacing:.01em;text-transform:uppercase;
  animation:fadeUp .7s cubic-bezier(.16,1,.3,1) both;
}
.hero-h1 span{display:block}
.hero-h1 .line-accent{color:var(--cyan)}
.hero-h1 .line-ghost{color:transparent;-webkit-text-stroke:1px rgba(255,255,255,.2)}
@keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
.hero-sub{
  margin-top:20px;font-size:14px;font-weight:300;line-height:1.7;
  color:var(--silver);max-width:360px;
  animation:fadeUp .7s .1s cubic-bezier(.16,1,.3,1) both;
}
.hero-btns{
  display:flex;align-items:center;gap:12px;margin-top:32px;
  animation:fadeUp .7s .2s cubic-bezier(.16,1,.3,1) both;
}
.btn-primary{
  display:inline-flex;align-items:center;gap:8px;
  padding:12px 28px;background:var(--cyan);color:var(--ink);
  font-family:var(--fc);font-weight:800;font-size:13px;letter-spacing:.12em;text-transform:uppercase;
  border:none;cursor:pointer;text-decoration:none;
  transition:background .2s,transform .15s,box-shadow .2s;
}
.btn-primary:hover{background:var(--cyan2);transform:translateY(-2px);box-shadow:0 8px 28px rgba(0,200,240,.28)}
.btn-secondary{
  padding:12px 28px;background:transparent;color:var(--white);
  font-family:var(--fc);font-weight:700;font-size:13px;letter-spacing:.12em;text-transform:uppercase;
  border:1px solid var(--rim2);cursor:pointer;
  transition:border-color .2s,color .2s;
}
.btn-secondary:hover{border-color:var(--cyan);color:var(--cyan)}

/* stat bar below hero text */
.hero-stats{
  display:flex;gap:0;
  margin-top:44px;padding-top:28px;
  border-top:1px solid var(--rim);
  animation:fadeUp .7s .3s cubic-bezier(.16,1,.3,1) both;
}
.hst{padding-right:28px;margin-right:28px;border-right:1px solid var(--rim)}
.hst:last-child{border-right:none;margin:0;padding:0}
.hst-val{font-family:var(--fd);font-size:28px;line-height:1;color:var(--white)}
.hst-val em{font-style:normal;color:var(--cyan)}
.hst-lbl{font-family:var(--fc);font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--muted);margin-top:3px}

/* ── RIGHT COLUMN — visual composition ── */
.hero-right{
  position:relative;z-index:2;
  height:100vh;
  display:flex;align-items:center;justify-content:center;
  overflow:hidden;
}
/* large ambient glow */
.hero-glow-orb{
  position:absolute;
  width:500px;height:500px;border-radius:50%;
  background:radial-gradient(circle,rgba(0,200,240,.07) 0%,transparent 65%);
  top:50%;left:50%;transform:translate(-50%,-50%);
  pointer-events:none;
}
/* pitch arc reference */
.hero-arc{
  position:absolute;
  border:1px solid rgba(0,200,240,.07);
  border-radius:50%;
  pointer-events:none;
}
/* floating stat cards */
.hero-stat-float{
  position:absolute;z-index:3;
  padding:14px 20px;
  background:rgba(12,15,25,.85);
  border:1px solid rgba(0,200,240,.16);
  backdrop-filter:blur(12px);
}
.hsf-val{font-family:var(--fd);font-size:26px;line-height:1;color:var(--white)}
.hsf-val em{font-style:normal;color:var(--cyan)}
.hsf-lbl{font-family:var(--fc);font-size:9px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);margin-top:4px}
.hsf-1{top:22%;left:6%;animation:floatA 6s ease-in-out infinite}
.hsf-2{top:50%;right:8%;animation:floatB 7s ease-in-out infinite}
.hsf-3{bottom:22%;left:12%;animation:floatA 8s 1s ease-in-out infinite}
@keyframes floatA{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes floatB{0%,100%{transform:translateY(0)}50%{transform:translateY(8px)}}
/* central logo display */
.hero-logo-display{
  position:relative;z-index:3;
  display:flex;align-items:center;justify-content:center;
}
.hero-logo-ring{
  position:absolute;border-radius:50%;
  border:1px solid rgba(0,200,240,.08);
  animation:spinRing 40s linear infinite;
}
@keyframes spinRing{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
.hero-logo-img{
  width:250px;height:250px;object-fit:contain;position:relative;z-index:2;
  filter:drop-shadow(0 0 28px rgba(0,200,240,.35)) drop-shadow(0 0 8px rgba(0,200,240,.2));
  animation:fadeUp .9s .1s cubic-bezier(.16,1,.3,1) both;
}
.hero-form-strip{
  position:absolute;bottom:18%;left:50%;transform:translateX(-50%);
  z-index:3;
  display:flex;align-items:center;gap:6px;
  padding:8px 16px;
  background:rgba(12,15,25,.85);
  border:1px solid rgba(0,200,240,.14);
  backdrop-filter:blur(10px);
  white-space:nowrap;
}
.hfs-label{font-family:var(--fc);font-size:9px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);margin-right:4px}
.hfs-dot{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:var(--fc);font-size:9px;font-weight:800;color:#fff}
.hfs-w{background:#16a34a}.hfs-l{background:#dc2626}.hfs-d{background:#475569}

/* ── LIVE TICKER ─────────────────── */
.ticker{height:38px;display:flex;align-items:center;overflow:hidden;border-top:1px solid var(--rim);border-bottom:1px solid var(--rim);background:var(--ink2)}
.ticker-tag{height:38px;padding:0 18px;display:flex;align-items:center;background:var(--cyan);font-family:var(--fc);font-size:10px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:var(--ink);white-space:nowrap;flex-shrink:0}
.ticker-body{overflow:hidden;flex:1}
.ticker-track{display:flex;animation:tick 32s linear infinite}
@keyframes tick{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.tick-item{display:flex;align-items:center;gap:8px;padding:0 24px;height:38px;border-right:1px solid var(--rim);white-space:nowrap;font-family:var(--fc);font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--silver)}
.tick-score{color:var(--white);font-size:14px;font-weight:900}
.tick-badge{width:16px;height:16px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:900;color:#fff;flex-shrink:0}
.tb-w{background:#16a34a}.tb-l{background:#dc2626}.tb-d{background:#475569}

/* ── SECTION COMMONS ─────────────── */
.section{padding:88px 44px}
.sec-ey{font-family:var(--fc);font-size:10px;font-weight:800;letter-spacing:.25em;text-transform:uppercase;color:var(--cyan);margin-bottom:10px;display:flex;align-items:center;gap:10px}
.sec-ey::before{content:'';display:block;width:18px;height:1px;background:var(--cyan)}
.sec-h{font-family:var(--fd);font-size:clamp(28px,4vw,46px);text-transform:uppercase;line-height:1;letter-spacing:.01em}
.sec-h em{font-style:normal;color:var(--cyan)}
.sec-hdr{margin-bottom:48px}

/* ═══════════════════════════════════
   RECENT RESULTS — redesigned
═══════════════════════════════════ */
.results-wrap{display:flex;flex-direction:column;gap:3px}

.result-row{
  display:grid;
  /* meta | home | score | away | badge */
  grid-template-columns:160px 1fr 120px 1fr 100px;
  align-items:center;
  background:var(--ink2);
  border:1px solid var(--rim);
  position:relative;overflow:hidden;
  transition:background .18s,border-color .18s;
  min-height:72px;
}
.result-row::after{
  content:'';position:absolute;left:0;top:0;bottom:0;width:3px;
}
.result-row.rW::after{background:var(--green)}
.result-row.rL::after{background:var(--red)}
.result-row.rD::after{background:var(--draw)}
.result-row:hover{background:var(--ink3);border-color:rgba(0,200,240,.1)}

/* meta column */
.rr-meta{padding:0 20px 0 24px}
.rr-matchday{font-family:var(--fc);font-size:9px;font-weight:800;letter-spacing:.22em;text-transform:uppercase;color:var(--cyan)}
.rr-comp{font-family:var(--fc);font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--silver);margin-top:3px}
.rr-date{font-size:11px;color:var(--muted);margin-top:3px;font-family:var(--fb)}

/* team columns */
.rr-team{
  display:flex;align-items:center;gap:12px;
  padding:0 16px;
}
.rr-team.home{justify-content:flex-end;flex-direction:row-reverse}
.rr-team.away{justify-content:flex-start}
.rr-badge{
  width:34px;height:34px;border-radius:50%;
  background:var(--ink3);border:1px solid var(--rim2);
  display:flex;align-items:center;justify-content:center;
  font-family:var(--fc);font-size:10px;font-weight:800;color:var(--silver);flex-shrink:0;
}
.rr-badge.mine{border-color:var(--cyan);color:var(--cyan);background:var(--cdim);box-shadow:0 0 8px rgba(0,200,240,.12)}
.rr-team-info{}
.rr-name{font-family:var(--fc);font-size:15px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;line-height:1.1;color:var(--white)}
.rr-venue{font-size:10px;color:var(--muted);margin-top:2px;font-family:var(--fb);letter-spacing:.04em}

/* score column */
.rr-score{
  display:flex;align-items:center;justify-content:center;gap:0;
  padding:0;
  text-align:center;
  position:relative;
}
/* subtle score bg */
.rr-score::before{
  content:'';
  position:absolute;inset:8px 0;
  background:rgba(0,200,240,.03);
  border-left:1px solid var(--rim);border-right:1px solid var(--rim);
}
.rr-score-val{
  font-family:var(--fd);font-size:28px;line-height:1;
  min-width:32px;text-align:center;
  position:relative;z-index:1;
}
.rr-score-sep{
  font-family:var(--fc);font-size:16px;font-weight:300;
  color:var(--muted);padding:0 6px;
  position:relative;z-index:1;
}

/* result badge column */
.rr-result-col{
  display:flex;align-items:center;justify-content:center;
  padding:0 14px;
}
.rr-result-pill{
  display:inline-flex;align-items:center;gap:5px;
  padding:4px 10px;
  font-family:var(--fc);font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;
}
.rr-result-pill.win{ background:rgba(34,197,94,.08); border:1px solid rgba(34,197,94,.25); color:var(--green)}
.rr-result-pill.loss{background:rgba(239,68,68,.08);  border:1px solid rgba(239,68,68,.25);  color:var(--red)}
.rr-result-pill.draw{background:rgba(100,116,139,.08);border:1px solid rgba(100,116,139,.25);color:var(--draw)}
.rr-result-dot{width:5px;height:5px;border-radius:50%;background:currentColor}

/* ── STANDINGS BAND ─────────────── */
.standings-band{padding:64px 44px;background:var(--ink2);border-bottom:1px solid var(--rim);position:relative;overflow:hidden}
.standings-band::before{content:'';position:absolute;top:0;right:0;bottom:0;width:40%;background:linear-gradient(to right,transparent 0%,rgba(0,200,240,.028) 100%);pointer-events:none}
.standings-band-inner{display:grid;grid-template-columns:280px 1fr;gap:0;align-items:stretch}
.standings-band-label{padding-right:48px;border-right:1px solid var(--rim);display:flex;flex-direction:column;justify-content:space-between}
.standings-band-kpis{display:flex;flex-direction:column;gap:20px;margin-top:28px}
.sb-kpi-val{font-family:var(--fd);font-size:28px;line-height:1;color:var(--white)}
.sb-kpi-val em{font-style:normal;color:var(--cyan)}
.sb-kpi-lbl{font-family:var(--fc);font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--muted);margin-top:3px}
.standings-band-link{display:inline-flex;align-items:center;gap:6px;font-family:var(--fc);font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--cyan);text-decoration:none;margin-top:32px;transition:opacity .2s}
.standings-band-link:hover{opacity:.75}
.standings-band-table{padding-left:40px}

/* ── STANDINGS WIDGET ─────────────── */
.standings-widget{background:transparent;border:none;overflow:hidden}
.sw-head{padding:11px 0;border-bottom:1px solid var(--rim);display:flex;align-items:center;justify-content:space-between}
.sw-head-title{font-family:var(--fc);font-size:10px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:var(--silver)}
.sw-head-badge{font-family:var(--fc);font-size:9px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--cyan);padding:3px 9px;border:1px solid rgba(0,200,240,.25);background:rgba(0,200,240,.07)}
.sw-cols{display:grid;grid-template-columns:26px 1fr 28px 28px 28px 28px 38px 52px 36px;padding:7px 0;border-bottom:1px solid var(--rim)}
.sw-col-label{font-family:var(--fc);font-size:9px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:var(--muted);text-align:center}
.sw-col-label:nth-child(2){text-align:left}
.sw-row{display:grid;grid-template-columns:26px 1fr 28px 28px 28px 28px 38px 52px 36px;padding:13px 0;align-items:center;border-bottom:1px solid var(--rim);transition:background .15s;position:relative}
.sw-row:last-child{border-bottom:none}
.sw-row:hover{background:rgba(255,255,255,.025)}
.sw-row.me{background:rgba(0,200,240,.05)}
.sw-row.me::before{content:'';position:absolute;left:-40px;top:0;bottom:0;width:3px;background:var(--cyan)}
.sw-rank{font-family:var(--fd);font-size:14px;color:var(--muted);text-align:center}
.sw-club{display:flex;align-items:center;gap:9px}
.sw-club-badge{width:26px;height:26px;border-radius:50%;background:var(--ink3);border:1px solid var(--rim2);display:flex;align-items:center;justify-content:center;font-family:var(--fc);font-size:9px;font-weight:800;color:var(--silver);flex-shrink:0}
.sw-club-badge.mine{border-color:var(--cyan);color:var(--cyan);background:var(--cdim)}
.sw-club-name{font-family:var(--fc);font-size:14px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;color:var(--silver)}
.me .sw-club-name{color:var(--white)}
.sw-cell{font-family:var(--fb);font-size:12px;color:var(--muted);text-align:center}
.sw-w{color:var(--green)!important;font-weight:600}
.sw-l{color:var(--red)!important}
.sw-pts{font-family:var(--fd);font-size:16px;color:var(--white)!important;text-align:center}
.me .sw-pts{color:var(--cyan)!important}
.sw-form{display:flex;gap:3px;justify-content:center}
.sf{width:7px;height:7px;border-radius:50%}
.sf-w{background:var(--green)}.sf-l{background:var(--red)}.sf-d{background:var(--muted)}
.sw-context-note{padding:12px 0 0;font-family:var(--fc);font-size:9px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
.sw-context-note a{color:var(--cyan);text-decoration:none}
.sw-context-note a:hover{text-decoration:underline}

/* ── FIXTURES ──────────────────── */
.fixtures-panel{display:flex;flex-direction:column;gap:2px}
.fx-card{background:var(--ink2);border:1px solid var(--rim);overflow:hidden;transition:background .2s,border-color .2s}
.fx-card:hover{background:var(--ink3);border-color:rgba(0,200,240,.16)}
.fx-top{padding:12px 18px;border-bottom:1px solid var(--rim);display:flex;align-items:center;gap:14px}
.fx-date-box{text-align:center;min-width:40px}
.fx-day{font-family:var(--fd);font-size:22px;line-height:1;color:var(--cyan)}
.fx-mth{font-family:var(--fc);font-size:9px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--muted)}
.fx-divider{width:1px;height:28px;background:var(--rim)}
.fx-info{flex:1}
.fx-comp{font-family:var(--fc);font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--silver)}
.fx-matchday{font-size:11px;color:var(--muted);margin-top:1px;font-family:var(--fb)}
.fx-time{font-family:var(--fc);font-size:16px;font-weight:700;color:var(--white);letter-spacing:.04em;white-space:nowrap}
.fx-tz{font-size:9px;color:var(--muted);letter-spacing:.1em;text-transform:uppercase}
.fx-body{padding:12px 18px;display:flex;align-items:center;gap:10px}
.fx-team{flex:1;display:flex;align-items:center;gap:9px}
.fx-team.right{flex-direction:row-reverse}
.fx-tbadge{width:30px;height:30px;border-radius:50%;background:var(--ink3);border:1px solid var(--rim2);display:flex;align-items:center;justify-content:center;font-family:var(--fc);font-size:9px;font-weight:800;color:var(--silver);flex-shrink:0}
.fx-tbadge.mine{border-color:var(--cyan);color:var(--cyan);background:var(--cdim);box-shadow:0 0 6px rgba(0,200,240,.12)}
.fx-tname{font-family:var(--fc);font-size:14px;font-weight:700;letter-spacing:.04em;text-transform:uppercase}
.fx-vs{font-family:var(--fc);font-size:10px;font-weight:700;letter-spacing:.14em;color:var(--muted);padding:0 6px;flex-shrink:0}
.fx-venue-tag{padding:2px 8px;font-family:var(--fc);font-size:9px;font-weight:700;letter-spacing:.14em;text-transform:uppercase}
.fx-venue-home{background:var(--cdim);border:1px solid rgba(0,200,240,.2);color:var(--cyan)}
.fx-venue-away{background:rgba(255,255,255,.04);border:1px solid var(--rim);color:var(--muted)}

/* ── SQUAD ───────────────────────── */
.squad-section{background:var(--ink2);border-top:1px solid var(--rim);border-bottom:1px solid var(--rim)}
.pos-group{margin-bottom:52px}
.pos-group:last-child{margin-bottom:0}
.pos-group-label{display:flex;align-items:center;gap:10px;padding-bottom:14px;margin-bottom:22px;border-bottom:1px solid var(--rim);font-family:var(--fc);font-size:10px;font-weight:800;letter-spacing:.28em;text-transform:uppercase;color:var(--muted)}
.pos-group-pill{display:inline-flex;align-items:center;justify-content:center;padding:2px 9px;background:var(--cdim);border:1px solid rgba(0,200,240,.18);font-family:var(--fc);font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--cyan)}
.squad-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(175px,1fr));gap:14px}
.pcard{background:var(--ink);border:1px solid var(--rim);overflow:hidden;cursor:pointer;transition:transform .24s,border-color .24s,box-shadow .24s;position:relative;text-decoration:none;color:inherit;display:block}
.pcard:hover{transform:translateY(-5px);border-color:var(--cyan);box-shadow:0 16px 44px rgba(0,0,0,.55),0 0 18px rgba(0,200,240,.09)}
.pcard-top{height:172px;position:relative;overflow:hidden;background:linear-gradient(158deg,#0c1525 0%,#060b15 100%);display:flex;align-items:center;justify-content:center}
.pcard-num{position:absolute;bottom:-1px;right:8px;font-family:var(--fd);font-size:50px;line-height:1;color:rgba(0,200,240,.04);user-select:none;pointer-events:none;letter-spacing:-.04em}
.pcard-pos{position:absolute;top:10px;left:10px;z-index:2;font-family:var(--fd);font-size:13px;background:var(--cyan);color:var(--ink);padding:2px 8px;line-height:1.45}
.pcard-flag{position:absolute;top:10px;right:10px;font-size:18px;z-index:2}
.pcard-cap{position:absolute;top:10px;right:34px;z-index:2;font-family:var(--fc);font-size:9px;font-weight:800;letter-spacing:.08em;color:var(--cyan);border:1px solid rgba(0,200,240,.3);padding:2px 6px;background:rgba(0,200,240,.08)}
.pcard-avatar{width:76px;height:76px;border-radius:50%;background:linear-gradient(135deg,#0e1e32,#080f1e);border:2px solid rgba(0,200,240,.18);display:flex;align-items:center;justify-content:center;font-family:var(--fd);font-size:24px;color:var(--cyan);position:relative;z-index:1}
.pcard-avatar-img{width:96px;height:96px;object-fit:cover;border-radius:10%;border:2px solid rgba(0,200,240,.22);box-shadow:0 0 18px rgba(0,200,240,.08);position:relative;z-index:1}
.pcard-bottom{padding:15px 14px 0;background:var(--ink2);border-top:1px solid var(--rim)}
.pcard-role{font-family:var(--fc);font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--cyan);margin-bottom:3px}
.pcard-name{font-family:var(--fc);font-size:18px;font-weight:900;letter-spacing:.03em;text-transform:uppercase;line-height:1.1;color:var(--white)}
.pcard-ign{font-size:11px;color:var(--muted);margin-top:4px;font-family:var(--fb)}
.pcard-stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:1px;margin-top:12px;background:var(--rim);border-top:1px solid var(--rim)}
.pstat{background:var(--ink2);padding:9px 0;text-align:center}
.pstat-val{font-family:var(--fd);font-size:16px;color:var(--white);line-height:1}
.pstat-lbl{font-family:var(--fc);font-size:8px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:var(--muted);margin-top:2px}

/* ── SPONSORS ────────────────────── */
.sponsors-section{padding:72px 44px;border-top:1px solid var(--rim);border-bottom:1px solid var(--rim)}
.sp-layout{display:grid;grid-template-columns:1fr 1fr;gap:72px;align-items:center;margin-bottom:64px}
.sp-pitch-body{font-size:15px;font-weight:300;line-height:1.7;color:var(--silver);margin-top:14px}
.sp-kpis{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.sp-kpi{padding:22px;border:1px solid var(--rim);background:var(--ink2);transition:border-color .2s}
.sp-kpi:hover{border-color:rgba(0,200,240,.18)}
.sp-kpi-val{font-family:var(--fd);font-size:32px;color:var(--cyan);line-height:1}
.sp-kpi-lbl{font-family:var(--fc);font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);margin-top:5px}
.tier-sep{display:flex;align-items:center;gap:14px;margin-bottom:20px}
.tier-sep-label{font-family:var(--fc);font-size:9px;font-weight:800;letter-spacing:.24em;text-transform:uppercase;color:var(--muted);white-space:nowrap}
.tier-sep-line{flex:1;height:1px;background:var(--rim)}
.sp-row{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:14px;margin-bottom:28px}
.sp-tile{background:var(--ink2);border:1px solid var(--rim);padding:18px 36px;display:flex;align-items:center;justify-content:center;min-width:140px;transition:border-color .2s,box-shadow .2s}
.sp-tile:hover{border-color:rgba(0,200,240,.18);box-shadow:0 0 16px rgba(0,200,240,.05)}
.sp-tile.featured{min-width:200px;padding:24px 52px}
.sp-name{font-family:var(--fd);font-size:20px;text-transform:uppercase;letter-spacing:.06em;color:var(--silver)}
.sp-name.title{font-size:28px;color:var(--cyan)}
.sp-name.gold{font-size:18px;color:rgba(255,255,255,.6)}
.sp-name.partner{font-size:14px;color:var(--muted)}
.become-cta{display:flex;align-items:center;justify-content:space-between;padding:28px 36px;background:rgba(0,200,240,.04);border:1px solid rgba(0,200,240,.14);margin-top:40px}
.become-title{font-family:var(--fc);font-size:20px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--white)}
.become-sub{font-size:14px;color:var(--silver);margin-top:5px}

/* ── SOCIAL ──────────────────────── */
.social-section{padding:88px 44px}
.social-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.sc-card{background:var(--ink2);border:1px solid var(--rim);padding:26px 22px;text-decoration:none;color:inherit;display:block;transition:transform .2s,border-color .2s;position:relative;overflow:hidden}
.sc-card::after{content:'';position:absolute;left:0;bottom:0;right:0;height:2px;transform:scaleX(0);transform-origin:left;transition:transform .28s}
.sc-card:hover{transform:translateY(-4px);border-color:var(--rim2)}
.sc-card:hover::after{transform:scaleX(1)}
.sc-tw::after{background:#9147ff}.sc-yt::after{background:#f00}.sc-ig::after{background:#e1306c}.sc-DC::after{background:#e7e9ea}
.sc-icon{font-family:var(--fd);font-size:18px;color:var(--silver);margin-bottom:18px;display:block}
.sc-platform{font-family:var(--fc);font-size:17px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--white);margin-bottom:3px}
.sc-handle{font-size:12px;color:var(--cyan);margin-bottom:12px;font-family:var(--fb)}
.sc-desc{font-size:13px;color:var(--muted);line-height:1.55}
.sc-cta{display:inline-block;margin-top:18px;font-family:var(--fc);font-size:10px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:var(--silver)}



/* ── FOOTER ──────────────────────── */
.footer{padding:56px 44px 32px;border-top:1px solid var(--rim)}
.footer-top{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:52px;margin-bottom:44px;padding-bottom:44px;border-bottom:1px solid var(--rim)}
.footer-brand-name{font-family:var(--fd);font-size:18px;letter-spacing:.07em;text-transform:uppercase;color:var(--white)}
.footer-brand-tag{font-family:var(--fc);font-size:9px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:var(--cyan);margin:5px 0 14px;opacity:.8}
.footer-bio{font-size:13px;color:var(--muted);line-height:1.7;max-width:270px,text-align: right;
}
.footer-col-title{font-family:var(--fc);font-size:10px;font-weight:800;letter-spacing:.22em;text-transform:uppercase;color:var(--silver);margin-bottom:18px}
.footer-links{list-style:none;display:flex;flex-direction:column;gap:10px}
.footer-links a{font-size:13px;color:var(--muted);text-decoration:none;transition:color .2s}
.footer-links a:hover{color:var(--white)}
.footer-bottom{display:flex;align-items:center;justify-content:space-between;font-family:var(--fc);font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
.footer-bottom a{color:var(--muted);text-decoration:none;transition:color .2s}
.footer-bottom a:hover{color:var(--cyan)}

/* ── RESPONSIVE ──────────────────── */
@media(max-width:1024px){
  .hero{grid-template-columns:1fr;min-height:auto}
  .hero-right{display:none}
  .hero-split-line{display:none}
  .hero-left{padding:120px 44px 60px}
}
@media(max-width:900px){
  .standings-band-inner{grid-template-columns:1fr;gap:40px}
  .standings-band-label{border-right:none;border-bottom:1px solid var(--rim);padding-right:0;padding-bottom:32px}
  .standings-band-kpis{flex-direction:row;flex-wrap:wrap;gap:24px 40px}
  .standings-band-table{padding-left:0}
  .sp-layout{grid-template-columns:1fr;gap:40px}
  .social-grid{grid-template-columns:1fr 1fr}
  .footer-top{grid-template-columns:1fr 1fr}
}
@media(max-width:768px){
  .nav{padding:0 18px}.nav-links{display:none}
  .section,.social-section{padding:60px 18px}
  .standings-band{padding:48px 18px}
  .hero-left{padding:100px 18px 52px}
  .hero-stats{flex-wrap:wrap;gap:20px}
  .hst{border-right:none;margin:0;padding:0}
  /* results stack on mobile */
  .result-row{grid-template-columns:1fr;min-height:auto;padding:16px 18px;gap:12px}
  .result-row::after{width:100%;height:3px;top:0;left:0;bottom:auto}
  .rr-team.home,.rr-team.away{justify-content:flex-start;padding:0}
  .rr-score{justify-content:flex-start;padding:0}
  .rr-score::before{display:none}
  .rr-result-col{justify-content:flex-start;padding:0}
  .sponsors-section,.footer{padding:56px 18px 32px}
  .social-grid{grid-template-columns:1fr}
  .footer-top{grid-template-columns:1fr;gap:28px}
  .become-cta{flex-direction:column;gap:18px;align-items:flex-start}
  .sw-cols,.sw-row{grid-template-columns:24px 1fr 0 0 0 0 36px 0 34px}
  .sw-cols>*:nth-child(3),.sw-cols>*:nth-child(4),.sw-cols>*:nth-child(5),
  .sw-cols>*:nth-child(6),.sw-cols>*:nth-child(8),
  .sw-row>*:nth-child(3),.sw-row>*:nth-child(4),.sw-row>*:nth-child(5),
  .sw-row>*:nth-child(6),.sw-row>*:nth-child(8){display:none}
}
`;

/* ─────────────────────────────────────────────────────────
   COMPONENTS
───────────────────────────────────────────────────────── */
function Logo() {
  return <img src="/logo.png" alt="ALTAIR eSports" className="nav-logo-img" />;
}

function FormDots({ form }) {
  return (
    <div className="sw-form">
      {form.split("").map((c, i) => (
        <div key={i} className={`sf ${c==="W"?"sf-w":c==="L"?"sf-l":"sf-d"}`} />
      ))}
    </div>
  );
}

function Ticker() {
  const items = [...RESULTS, ...RESULTS, ...RESULTS, ...RESULTS];
  return (
    <div className="ticker">
      <div className="ticker-tag">EML | 1. Lig · Latest Results</div>
      <div className="ticker-body">
        <div className="ticker-track">
          {items.concat(items).map((r, i) => (
            <div key={i} className="tick-item">
              <div className={`tick-badge ${r.result==="W"?"tb-w":r.result==="L"?"tb-l":"tb-d"}`}>{r.result}</div>
              <span>{r.home}</span>
              <span className="tick-score">{r.score}</span>
              <span>{r.away}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── HERO RIGHT — visual composition ── */
function HeroVisual() {
  const form = ["W","W","W","W","W"]; // last 5
  return (
    <div className="hero-right">
      <div className="hero-glow-orb" />
      {/* concentric pitch rings */}
      {[480,340,220,120].map((s,i)=>(
        <div key={i} className="hero-arc" style={{width:s,height:s,top:"50%",left:"50%",transform:`translate(-50%,-50%)`}} />
      ))}
      {/* rotating outer ring */}
      <div className="hero-logo-ring" style={{width:280,height:280}} />

      {/* floating stat cards */}
      <div className="hero-stat-float hsf-1">
        <div className="hsf-val">6<em>th</em></div>
        <div className="hsf-lbl">League Position</div>
      </div>
      <div className="hero-stat-float hsf-2">
        <div className="hsf-val">28<em> pts</em></div>
        <div className="hsf-lbl">Points</div>
      </div>
      <div className="hero-stat-float hsf-3">
        <div className="hsf-val">+21</div>
        <div className="hsf-lbl">Goal Difference</div>
      </div>

      {/* central logo */}
      <div className="hero-logo-display">
        <img src="/logo.png" alt="ALTAIR" className="hero-logo-img" />
      </div>

      {/* form strip */}
      <div className="hero-form-strip">
        <span className="hfs-label">Form</span>
        {form.map((r,i)=>(
          <div key={i} className={`hfs-dot ${r==="W"?"hfs-w":r==="L"?"hfs-l":"hfs-d"}`}>{r}</div>
        ))}
      </div>
    </div>
  );
}

/* ── RESULT ROW — redesigned ── */
function ResultRow({ r }) {
  const homeIsAltair = r.home === "ALTAIR eSports";
  const awayIsAltair = r.away === "ALTAIR eSports";
  const badgeLabel = r.result==="W" ? "Victory" : r.result==="L" ? "Defeat" : "Draw";
  const badgeCls   = r.result==="W" ? "win"     : r.result==="L" ? "loss"   : "draw";

  return (
    <div className={`result-row r${r.result}`}>
      {/* meta */}
      <div className="rr-meta">
        <div className="rr-matchday">{r.matchday}</div>
        <div className="rr-comp">{r.competition}</div>
        <div className="rr-date">{r.date}</div>
      </div>

      {/* home team */}
      <div className="rr-team home">
        <div className={`rr-badge ${homeIsAltair?"mine":""}`}>{r.homeAbbr}</div>
        <div className="rr-team-info">
          <div className="rr-name">{r.home}</div>
          {homeIsAltair && <div className="rr-venue">Home</div>}
        </div>
      </div>

      {/* score */}
      <div className="rr-score">
        <span className="rr-score-val">{r.hs}</span>
        <span className="rr-score-sep">–</span>
        <span className="rr-score-val">{r.as}</span>
      </div>

      {/* away team */}
      <div className="rr-team away">
        <div className={`rr-badge ${awayIsAltair?"mine":""}`}>{r.awayAbbr}</div>
        <div className="rr-team-info">
          <div className="rr-name">{r.away}</div>
          {awayIsAltair && <div className="rr-venue">Away</div>}
        </div>
      </div>

      {/* result pill */}
      <div className="rr-result-col">
        <div className={`rr-result-pill ${badgeCls}`}>
          <span className="rr-result-dot" />
          {badgeLabel}
        </div>
      </div>
    </div>
  );
}

function StandingsWidget() {
  return (
    <div className="standings-widget">
      <div className="sw-head">
        <span className="sw-head-title">eMajor League | 1. Lig</span>
        <span className="sw-head-badge">Live</span>
      </div>
      <div className="sw-cols">
        <span className="sw-col-label">#</span>
        <span className="sw-col-label" style={{textAlign:"left"}}>Club</span>
        <span className="sw-col-label">P</span>
        <span className="sw-col-label">W</span>
        <span className="sw-col-label">D</span>
        <span className="sw-col-label">L</span>
        <span className="sw-col-label">GD</span>
        <span className="sw-col-label">Form</span>
        <span className="sw-col-label">Pts</span>
      </div>
      {STANDINGS_COMPACT.map(s=>(
        <div key={s.abbr} className={`sw-row ${s.me?"me":""}`}>
          <span className="sw-rank">{s.rank}</span>
          <div className="sw-club">
            <div className={`sw-club-badge ${s.me?"mine":""}`}>{s.abbr}</div>
            <span className="sw-club-name">{s.name}</span>
          </div>
          <span className="sw-cell">{s.pld}</span>
          <span className="sw-cell sw-w">{s.w}</span>
          <span className="sw-cell">{s.d}</span>
          <span className="sw-cell sw-l">{s.l}</span>
          <span className="sw-cell" style={{color:s.gd.startsWith("+")?"var(--green)":"var(--red)",textAlign:"center"}}>{s.gd}</span>
          <FormDots form={s.form} />
          <span className="sw-cell sw-pts">{s.pts}</span>
        </div>
      ))}
      <div className="sw-context-note">
        <a href="https://emajorleague.com/tournaments/league_table/39/" target="_blank" rel="noopener noreferrer">Full table →</a>
      </div>
    </div>
  );
}

function FixtureCard({ f }) {
  const altairHome = f.home === "ALTAIR eSports";
  const altairAway = f.away === "ALTAIR eSports";
  return (
    <div className="fx-card">
      <div className="fx-top">
        <div className="fx-date-box">
          <div className="fx-day">{f.day}</div>
          <div className="fx-mth">{f.month}</div>
        </div>
        <div className="fx-divider"/>
        <div className="fx-info">
          <div className="fx-comp">{f.competition}</div>
          <div className="fx-matchday">{f.matchday}</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div className="fx-time">{f.time}</div>
          <div className="fx-tz">CET</div>
        </div>
      </div>
      <div className="fx-body">
        <div className="fx-team">
          <div className={`fx-tbadge ${altairHome?"mine":""}`}>{f.homeAbbr}</div>
          <span className="fx-tname">{f.home}</span>
        </div>
        <span className="fx-vs">VS</span>
        <div className="fx-team right">
          <div className={`fx-tbadge ${altairAway?"mine":""}`}>{f.awayAbbr}</div>
          <span className="fx-tname">{f.away}</span>
        </div>
        <span className={`fx-venue-tag ${altairHome?"fx-venue-home":"fx-venue-away"}`}>
          {altairHome?"Home":"Away"}
        </span>
      </div>
    </div>
  );
}

function PlayerCard({ p }) {
  return (
    <a href={p.profileUrl} target="_blank" rel="noopener noreferrer" className="pcard">
      <div className="pcard-top">
        <div className="pcard-pos">{p.pos}</div>
        {p.captain && <div className="pcard-cap">C</div>}
        <span className="pcard-flag">{p.flag}</span>
        <div className="pcard-num">{p.number}</div>
        {p.image
          ? <img src={p.image} alt={p.name} className="pcard-avatar-img" />
          : <div className="pcard-avatar">{p.init}</div>
        }
      </div>
      <div className="pcard-bottom">
        <div className="pcard-role">{p.role}</div>
        <div className="pcard-name">{p.name}</div>
        <div className="pcard-ign">{p.ign}</div>
        <div className="pcard-stats">
          <div className="pstat"><div className="pstat-val">{p.apps}</div><div className="pstat-lbl">Apps</div></div>
          <div className="pstat"><div className="pstat-val">{p.goals}</div><div className="pstat-lbl">Goals</div></div>
          <div className="pstat"><div className="pstat-val">{p.assists}</div><div className="pstat-lbl">Assists</div></div>
        </div>
      </div>
    </a>
  );
}

/* ─────────────────────────────────────────────────────────
   MAIN APP
───────────────────────────────────────────────────────── */
export default function AltairFC() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(()=>{
    const fn = ()=>setScrolled(window.scrollY > 56);
    window.addEventListener("scroll", fn);
    return ()=>window.removeEventListener("scroll", fn);
  },[]);

  return (
    <>
      <style>{css}</style>

      {/* NAV */}
      <nav className={`nav${scrolled?" scrolled":""}`}>
        <a href="#top" className="nav-logo">
          <Logo />
          <div className="nav-wordmark">
            <span className="nav-wm-top">ALTAIR</span>
            <span className="nav-wm-sub">FC 26 Pro Clubs</span>
          </div>
        </a>
        <ul className="nav-links">
          {[["#matches","Results"],["#standings","Table"],["#fixtures","Fixtures"],["#squad","Squad"],["#sponsors","Partners"]].map(([h,l])=>(
            <li key={l}><a href={h}>{l}</a></li>
          ))}
        </ul>
        <a href="#broadcast" className="nav-cta">
  Follow the Club
</a>
      </nav>

      {/* ── HERO ── */}
      <section className="hero hero-stars">
        <div className="hero-bg"/>
        <div className="hero-grid"/>
        <div className="hero-split-line"/>
        <div className="hero-fade-b"/>

        {/* LEFT */}
        <div className="hero-left">
          <div className="hero-pill">
            <span className="hero-pill-dot"/>
            FC 26 | 1. Lig · eMajor League · Season 2026
          </div>
          <h1 className="hero-h1">
            <span>WE</span>
            <span className="line-accent">PLAY</span>
            <span className="line-ghost">AS ONE</span>
          </h1>
          <p className="hero-sub">
            ALTAIR eSports competes in the eMajor League FC 26 Pro Clubs 1. Lig —
            a professional squad built around structure, teamwork, and results.
          </p>
          <div className="hero-btns">
            <a href="https://www.altairesports.com/live" className="btn-primary">
              Watch Matches
            </a>
           <a href="#squad" className="btn-secondary">
  View Squad
</a>
          </div>
          <div className="hero-stats">
           
          </div>
        </div>

        {/* RIGHT */}
        <HeroVisual />
      </section>

      {/* TICKER */}
      <Ticker />

      {/* STANDINGS BAND */}
      <div className="standings-band" id="standings">
        <div className="standings-band-inner">
          <div className="standings-band-label">
            <div>
              <div className="sec-ey">EML | 1. Lig · Season 2026</div>
              <h2 className="sec-h" style={{marginTop:10}}>LIVE <em>TABLE</em></h2>
              <p style={{fontSize:13,color:"var(--muted)",lineHeight:1.6,marginTop:12,fontWeight:300,maxWidth:220}}>
                ALTAIR sit 6th on 28 pts — level with Sons Of Hell above, 3 clear of Redus EFC below.
              </p>
            </div>
            <div className="standings-band-kpis">
              {[{val:"6",unit:"th",lbl:"Position"},{val:"28",unit:" pts",lbl:"Points"},{val:"9",unit:"W",lbl:"Wins"}].map((k,i)=>(
                <div key={i}>
                  <div className="sb-kpi-val">{k.val}<em>{k.unit}</em></div>
                  <div className="sb-kpi-lbl">{k.lbl}</div>
                </div>
              ))}
            </div>
            <a className="standings-band-link" href="https://emajorleague.com/tournaments/league_table/39/" target="_blank" rel="noopener noreferrer">
              Full table on eMajor League →
            </a>
          </div>
          <div className="standings-band-table">
            <StandingsWidget />
          </div>
        </div>
      </div>

      {/* RECENT RESULTS */}
      <section className="section" id="matches">
        <div className="sec-hdr">
          <div className="sec-ey">EML | 1. Lig</div>
          <h2 className="sec-h">RECENT <em>RESULTS</em></h2>
        </div>
        <div className="results-wrap">
          {RESULTS.map(r=><ResultRow key={r.id} r={r}/>)}
        </div>
      </section>

      {/* FIXTURES */}
      <section className="section" style={{paddingTop:0}} id="fixtures">
        <div className="sec-hdr">
          <div className="sec-ey">Schedule · EML | 1. Lig</div>
          <h2 className="sec-h">UPCOMING <em>FIXTURES</em></h2>
        </div>
        <div className="fixtures-panel">
          {FIXTURES.map(f=><FixtureCard key={f.id} f={f}/>)}
        </div>
      </section>

      {/* SQUAD */}
      <section className="section squad-section" id="squad">
        <div className="sec-hdr">
          <div className="sec-ey">Season 2026 · Full Squad</div>
          <h2 className="sec-h">THE <em>SQUAD</em></h2>
        </div>
        {SQUAD.map((g,gi)=>(
          <div key={gi} className="pos-group">
            <div className="pos-group-label">
              <span className="pos-group-pill">{g.abbr}</span>
              {g.group}
              <span style={{marginLeft:"auto",fontSize:"11px"}}>{g.players.length} player{g.players.length>1?"s":""}</span>
            </div>
            <div className="squad-grid">
              {g.players.map((p,pi)=><PlayerCard key={pi} p={p}/>)}
            </div>
          </div>
        ))}
      </section>

      {/* SPONSORS */}
      <section className="sponsors-section" id="sponsors">
        <div className="sp-layout">
          <div>
            <div className="sec-ey">Partners & Sponsors</div>
            <h2 className="sec-h" style={{marginBottom:14}}>OUR <em>PARTNERS</em></h2>
            <p className="sp-pitch-body">ALTAIR partners with brands that share our drive for excellence. We deliver an authentic, engaged audience at the intersection of football and competitive gaming.</p>
          </div>
          <div className="sp-kpis">
            {[{val:"200K+",lbl:"Combined Reach"},{val:"*",lbl:"VPG Club Ranking"},{val:"1",lbl:"Titles Won"},{val:"14",lbl:"Active Players"}].map((k,i)=>(
              <div key={i} className="sp-kpi"><div className="sp-kpi-val">{k.val}</div><div className="sp-kpi-lbl">{k.lbl}</div></div>
            ))}
          </div>
        </div>
        <div className="tier-sep"><span className="tier-sep-label">Title Partner</span><div className="tier-sep-line"/></div>
        <div className="sp-row">{SPONSORS.title.map(n=><div key={n} className="sp-tile featured"><span className="sp-name title">{n}</span></div>)}</div>
        <div className="tier-sep"><span className="tier-sep-label">Gold Partners</span><div className="tier-sep-line"/></div>
        <div className="sp-row">{SPONSORS.gold.map(n=><div key={n} className="sp-tile"><span className="sp-name gold">{n}</span></div>)}</div>
        <div className="tier-sep"><span className="tier-sep-label">Official Partners</span><div className="tier-sep-line"/></div>
        <div className="sp-row">{SPONSORS.partners.map(n=><div key={n} className="sp-tile"><span className="sp-name partner">{n}</span></div>)}</div>
        <div className="become-cta">
          <div>
            <div className="become-title">Become an ALTAIR Partner</div>
            <div className="become-sub">Reach the next generation of competitive football fans through our platform.</div>
          </div>
          <button className="btn-primary">Get in Touch</button>
        </div>
      </section>

      {/* SOCIAL */}
      <section className="social-section" id="broadcast">
        <div className="sec-hdr">
          <div className="sec-ey">Broadcasts & Community</div>
          <h2 className="sec-h">FOLLOW <em>ALTAIR</em></h2>
        </div>
        <div className="social-grid">
          {SOCIAL.map((s,i)=>(
            <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className={`sc-card sc-${s.cls}`}>
              <span className="sc-icon">{s.icon}</span>
              <div className="sc-platform">{s.platform}</div>
              <div className="sc-handle">{s.handle}</div>
              <div className="sc-desc">{s.desc}</div>
              <span className="sc-cta">{s.cta} →</span>
            </a>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-top">
          <div>
            <div className="footer-brand-name">ALTAIR eSports</div>
            <div className="footer-brand-tag">FC 26 Pro Clubs · eMajor League</div>
            <p className="footer-bio">A competitive FC 26 Pro Clubs organisation built for structured league competition. Discipline, teamwork, and the relentless pursuit of promotion.</p>
          </div>
          <div>
            <div className="footer-col-title">Club</div>
            <ul className="footer-links">
              {["About ALTAIR","Season History","Honours","Press Kit","Careers"].map(l=><li key={l}><a href="#">{l}</a></li>)}
            </ul>
          </div>
          <div>
            <div className="footer-col-title">Competition</div>
            <ul className="footer-links">
              {[["https://emajorleague.com/teams/team/337/","Team Page"],["https://emajorleague.com/tournaments/league_table/39/","League Table"],"Fixtures","Statistics","Squad"].map((l,i)=>(
                <li key={i}><a href={typeof l==="object"?l[0]:"#"} target={typeof l==="object"?"_blank":""}>{typeof l==="object"?l[1]:l}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <div className="footer-col-title">Connect</div>
            <ul className="footer-links">
              {["Sponsorships","Media Enquiries","Fan Community","Merchandise","Contact Us"].map(l=><li key={l}><a href="#">{l}</a></li>)}
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 ALTAIR eSports · All rights reserved</span>
          <span>Competing in <a href="https://emajorleague.com/tournaments/league_table/39/" target="_blank" rel="noopener noreferrer">FC 26 | 1. Lig</a> via eMajor League</span>
        </div>
      </footer>
    </>
  );
}