import { useState, useEffect } from "react";

/* ─────────────────────────────────────────────────────────
   DATA  —  sourced from eMajor League
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
  { cls:"tw", icon:"TW", platform:"Twitch",    handle:"/altairespor",   desc:"Live match broadcasts every matchday with full commentary.",  cta:"Watch Live", url:"https://www.twitch.tv/altairespor" },
  { cls:"yt", icon:"YT", platform:"YouTube",   handle:"@AltairESPOR",   desc:"Match replays, player breakdowns and season recaps.",         cta:"Subscribe",  url:"https://www.youtube.com/@AltairESPOR" },
  { cls:"ig", icon:"IG", platform:"Instagram", handle:"@altairesports",  desc:"Behind the scenes, squad content and matchday graphics.",     cta:"Follow",     url:"https://www.instagram.com/altairesports/" },
  { cls:"DC", icon:"DC", platform:"Discord",   handle:"Join our server", desc:"Join our community, connect with players and stay updated.", cta:"JOIN",       url:"https://discord.gg/uMgQKQmr" },
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
   HERO
═══════════════════════════════════ */
.hero{position:relative;min-height:100vh;display:grid;grid-template-columns:1fr 1fr;align-items:center;padding:0;overflow:hidden}
.hero-bg{position:absolute;inset:0;background:linear-gradient(140deg,#080f20 0%,#040610 50%,#07090f 100%)}
.hero-grid{position:absolute;inset:0;background-image:repeating-linear-gradient(0deg,transparent,transparent 59px,rgba(255,255,255,.022) 60px),repeating-linear-gradient(90deg,transparent,transparent 59px,rgba(255,255,255,.022) 60px);mask-image:linear-gradient(to right,rgba(0,0,0,.6) 0%,transparent 55%)}
.hero-split-line{position:absolute;left:50%;top:10%;bottom:10%;width:1px;background:linear-gradient(to bottom,transparent,rgba(0,200,240,.15) 30%,rgba(0,200,240,.25) 50%,rgba(0,200,240,.15) 70%,transparent);z-index:1}
.hero-fade-b{position:absolute;bottom:0;left:0;right:0;height:28%;background:linear-gradient(to top,#07090f,transparent);z-index:1}

.hero-stars::before{content:'';position:absolute;inset:0;z-index:0;background-image:radial-gradient(1px 1px at 8% 12%,rgba(255,255,255,0.55) 0%,transparent 100%),radial-gradient(1px 1px at 17% 34%,rgba(255,255,255,0.45) 0%,transparent 100%),radial-gradient(1px 1px at 29% 7%,rgba(255,255,255,0.60) 0%,transparent 100%),radial-gradient(1px 1px at 41% 55%,rgba(255,255,255,0.40) 0%,transparent 100%),radial-gradient(1px 1px at 53% 22%,rgba(255,255,255,0.50) 0%,transparent 100%),radial-gradient(1px 1px at 63% 78%,rgba(255,255,255,0.45) 0%,transparent 100%),radial-gradient(1px 1px at 74% 41%,rgba(255,255,255,0.55) 0%,transparent 100%),radial-gradient(1px 1px at 83% 15%,rgba(255,255,255,0.50) 0%,transparent 100%),radial-gradient(1px 1px at 92% 67%,rgba(255,255,255,0.40) 0%,transparent 100%),radial-gradient(1px 1px at 5% 88%,rgba(255,255,255,0.45) 0%,transparent 100%),radial-gradient(1px 1px at 22% 72%,rgba(255,255,255,0.50) 0%,transparent 100%),radial-gradient(1px 1px at 36% 91%,rgba(255,255,255,0.35) 0%,transparent 100%),radial-gradient(1px 1px at 47% 44%,rgba(255,255,255,0.55) 0%,transparent 100%),radial-gradient(1px 1px at 58% 6%,rgba(255,255,255,0.45) 0%,transparent 100%),radial-gradient(1px 1px at 69% 59%,rgba(255,255,255,0.50) 0%,transparent 100%),radial-gradient(1px 1px at 79% 83%,rgba(255,255,255,0.40) 0%,transparent 100%),radial-gradient(1px 1px at 88% 28%,rgba(255,255,255,0.55) 0%,transparent 100%),radial-gradient(1px 1px at 97% 47%,rgba(255,255,255,0.45) 0%,transparent 100%),radial-gradient(1px 1px at 13% 51%,rgba(255,255,255,0.40) 0%,transparent 100%),radial-gradient(1px 1px at 26% 19%,rgba(255,255,255,0.50) 0%,transparent 100%),radial-gradient(1px 1px at 44% 74%,rgba(255,255,255,0.45) 0%,transparent 100%),radial-gradient(1px 1px at 55% 38%,rgba(255,255,255,0.55) 0%,transparent 100%),radial-gradient(1px 1px at 67% 93%,rgba(255,255,255,0.35) 0%,transparent 100%),radial-gradient(1px 1px at 76% 62%,rgba(255,255,255,0.50) 0%,transparent 100%),radial-gradient(1px 1px at 85% 5%,rgba(255,255,255,0.45) 0%,transparent 100%),radial-gradient(1px 1px at 93% 81%,rgba(255,255,255,0.40) 0%,transparent 100%),radial-gradient(1px 1px at 3% 37%,rgba(255,255,255,0.55) 0%,transparent 100%),radial-gradient(1px 1px at 32% 63%,rgba(255,255,255,0.45) 0%,transparent 100%),radial-gradient(1px 1px at 51% 87%,rgba(255,255,255,0.40) 0%,transparent 100%),radial-gradient(1px 1px at 71% 24%,rgba(255,255,255,0.50) 0%,transparent 100%);background-size:320px 240px;animation:starDriftA 180s linear infinite;pointer-events:none}
.hero-stars::after{content:'';position:absolute;inset:0;z-index:0;background-image:radial-gradient(1.5px 1.5px at 11% 23%,rgba(255,255,255,0.65) 0%,transparent 100%),radial-gradient(2px 2px at 24% 64%,rgba(0,200,240,0.50) 0%,transparent 100%),radial-gradient(1.5px 1.5px at 38% 18%,rgba(255,255,255,0.60) 0%,transparent 100%),radial-gradient(2.5px 2.5px at 49% 79%,rgba(0,200,240,0.40) 0%,transparent 100%),radial-gradient(1.5px 1.5px at 61% 42%,rgba(255,255,255,0.65) 0%,transparent 100%),radial-gradient(2px 2px at 72% 11%,rgba(0,200,240,0.45) 0%,transparent 100%),radial-gradient(1.5px 1.5px at 84% 57%,rgba(255,255,255,0.55) 0%,transparent 100%),radial-gradient(2px 2px at 93% 88%,rgba(0,200,240,0.35) 0%,transparent 100%),radial-gradient(1.5px 1.5px at 6% 71%,rgba(255,255,255,0.60) 0%,transparent 100%),radial-gradient(2px 2px at 19% 47%,rgba(0,200,240,0.42) 0%,transparent 100%),radial-gradient(2.5px 2.5px at 33% 85%,rgba(255,255,255,0.55) 0%,transparent 100%),radial-gradient(1.5px 1.5px at 46% 32%,rgba(0,200,240,0.48) 0%,transparent 100%),radial-gradient(2px 2px at 57% 96%,rgba(255,255,255,0.50) 0%,transparent 100%),radial-gradient(1.5px 1.5px at 68% 68%,rgba(0,200,240,0.38) 0%,transparent 100%),radial-gradient(2px 2px at 81% 14%,rgba(255,255,255,0.65) 0%,transparent 100%),radial-gradient(2.5px 2.5px at 90% 53%,rgba(0,200,240,0.44) 0%,transparent 100%),radial-gradient(1.5px 1.5px at 15% 9%,rgba(255,255,255,0.60) 0%,transparent 100%),radial-gradient(2px 2px at 77% 37%,rgba(0,200,240,0.40) 0%,transparent 100%),radial-gradient(1.5px 1.5px at 43% 58%,rgba(255,255,255,0.55) 0%,transparent 100%),radial-gradient(2px 2px at 28% 92%,rgba(0,200,240,0.36) 0%,transparent 100%);background-size:480px 360px;animation:starDriftB 120s linear infinite;pointer-events:none}
.hero-stars .hero-bg{position:absolute;inset:0}
.hero-stars .hero-bg::after{content:'';position:absolute;inset:0;z-index:0;background-image:radial-gradient(3px 3px at 14% 31%,rgba(0,200,240,0.60) 0%,rgba(0,200,240,0.04) 6px,transparent 12px),radial-gradient(2.5px 2.5px at 37% 8%,rgba(255,255,255,0.80) 0%,rgba(255,255,255,0.04) 5px,transparent 10px),radial-gradient(3px 3px at 59% 52%,rgba(0,200,240,0.55) 0%,rgba(0,200,240,0.03) 7px,transparent 14px),radial-gradient(2.5px 2.5px at 77% 77%,rgba(255,255,255,0.75) 0%,rgba(255,255,255,0.04) 5px,transparent 10px),radial-gradient(3px 3px at 91% 22%,rgba(0,200,240,0.50) 0%,rgba(0,200,240,0.03) 6px,transparent 12px),radial-gradient(2.5px 2.5px at 5% 64%,rgba(255,255,255,0.70) 0%,rgba(255,255,255,0.04) 5px,transparent 10px),radial-gradient(3px 3px at 28% 48%,rgba(0,200,240,0.52) 0%,rgba(0,200,240,0.03) 6px,transparent 12px),radial-gradient(2.5px 2.5px at 52% 89%,rgba(255,255,255,0.72) 0%,rgba(255,255,255,0.03) 5px,transparent 10px),radial-gradient(3px 3px at 70% 17%,rgba(0,200,240,0.58) 0%,rgba(0,200,240,0.04) 7px,transparent 14px),radial-gradient(2.5px 2.5px at 85% 43%,rgba(255,255,255,0.78) 0%,rgba(255,255,255,0.04) 5px,transparent 10px),radial-gradient(3px 3px at 20% 76%,rgba(0,200,240,0.48) 0%,rgba(0,200,240,0.03) 6px,transparent 12px),radial-gradient(2.5px 2.5px at 46% 28%,rgba(255,255,255,0.68) 0%,rgba(255,255,255,0.03) 5px,transparent 10px);background-size:640px 480px;animation:starDriftC 90s linear infinite;pointer-events:none}

@keyframes starDriftA{from{transform:translateY(0)}to{transform:translateY(-240px)}}
@keyframes starDriftB{from{transform:translateY(0)}to{transform:translateY(-360px)}}
@keyframes starDriftC{from{transform:translateY(0)}to{transform:translateY(-480px)}}
@media(prefers-reduced-motion:reduce){.hero-stars::before,.hero-stars::after,.hero-stars .hero-bg::after{animation:none}}

.hero-left{position:relative;z-index:2;padding:120px 56px 80px 44px;display:flex;flex-direction:column;justify-content:center}
.hero-pill{display:inline-flex;align-items:center;gap:8px;padding:5px 14px;margin-bottom:28px;border:1px solid rgba(0,200,240,.2);background:rgba(0,200,240,.06);font-family:var(--fc);font-size:11px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--cyan);width:fit-content}
.hero-pill-dot{width:5px;height:5px;border-radius:50%;background:var(--cyan);animation:blink 2s ease infinite;flex-shrink:0}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
.hero-h1{font-family:var(--fd);font-size:clamp(48px,5.5vw,80px);line-height:1;letter-spacing:.01em;text-transform:uppercase;animation:fadeUp .7s cubic-bezier(.16,1,.3,1) both}
.hero-h1 span{display:block}
.hero-h1 .line-accent{color:var(--cyan)}
.hero-h1 .line-ghost{color:transparent;-webkit-text-stroke:1px rgba(255,255,255,.2)}
@keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
.hero-sub{margin-top:20px;font-size:14px;font-weight:300;line-height:1.7;color:var(--silver);max-width:360px;animation:fadeUp .7s .1s cubic-bezier(.16,1,.3,1) both}
.hero-btns{display:flex;align-items:center;gap:12px;margin-top:32px;animation:fadeUp .7s .2s cubic-bezier(.16,1,.3,1) both}
.btn-primary{display:inline-flex;align-items:center;gap:8px;padding:12px 28px;background:var(--cyan);color:var(--ink);font-family:var(--fc);font-weight:800;font-size:13px;letter-spacing:.12em;text-transform:uppercase;border:none;cursor:pointer;text-decoration:none;transition:background .2s,transform .15s,box-shadow .2s}
.btn-primary:hover{background:var(--cyan2);transform:translateY(-2px);box-shadow:0 8px 28px rgba(0,200,240,.28)}
.btn-secondary{padding:12px 28px;background:transparent;color:var(--white);font-family:var(--fc);font-weight:700;font-size:13px;letter-spacing:.12em;text-transform:uppercase;border:1px solid var(--rim2);cursor:pointer;transition:border-color .2s,color .2s}
.btn-secondary:hover{border-color:var(--cyan);color:var(--cyan)}
.hero-stats{display:flex;gap:0;margin-top:44px;padding-top:28px;border-top:1px solid var(--rim);animation:fadeUp .7s .3s cubic-bezier(.16,1,.3,1) both}
.hst{padding-right:28px;margin-right:28px;border-right:1px solid var(--rim)}
.hst:last-child{border-right:none;margin:0;padding:0}
.hst-val{font-family:var(--fd);font-size:28px;line-height:1;color:var(--white)}
.hst-val em{font-style:normal;color:var(--cyan)}
.hst-lbl{font-family:var(--fc);font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--muted);margin-top:3px}

.hero-right{position:relative;z-index:2;height:100vh;display:flex;align-items:center;justify-content:center;overflow:hidden}
.hero-glow-orb{position:absolute;width:500px;height:500px;border-radius:50%;background:radial-gradient(circle,rgba(0,200,240,.07) 0%,transparent 65%);top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none}
.hero-arc{position:absolute;border:1px solid rgba(0,200,240,.07);border-radius:50%;pointer-events:none}
.hero-stat-float{position:absolute;z-index:3;padding:14px 20px;background:rgba(12,15,25,.85);border:1px solid rgba(0,200,240,.16);backdrop-filter:blur(12px)}
.hsf-val{font-family:var(--fd);font-size:26px;line-height:1;color:var(--white)}
.hsf-val em{font-style:normal;color:var(--cyan)}
.hsf-lbl{font-family:var(--fc);font-size:9px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);margin-top:4px}
.hsf-1{top:22%;left:6%;animation:floatA 6s ease-in-out infinite}
.hsf-2{top:50%;right:8%;animation:floatB 7s ease-in-out infinite}
.hsf-3{bottom:22%;left:12%;animation:floatA 8s 1s ease-in-out infinite}
@keyframes floatA{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes floatB{0%,100%{transform:translateY(0)}50%{transform:translateY(8px)}}
.hero-logo-display{position:relative;z-index:3;display:flex;align-items:center;justify-content:center}
.hero-logo-ring{position:absolute;border-radius:50%;border:1px solid rgba(0,200,240,.08);animation:spinRing 40s linear infinite}
@keyframes spinRing{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
.hero-logo-img{width:340px;height:340px;object-fit:contain;position:relative;z-index:2;filter:drop-shadow(0 0 28px rgba(0,200,240,.35)) drop-shadow(0 0 8px rgba(0,200,240,.2));animation:fadeUp .9s .1s cubic-bezier(.16,1,.3,1) both}
.hero-form-strip{position:absolute;bottom:18%;left:50%;transform:translateX(-50%);z-index:3;display:flex;align-items:center;gap:6px;padding:8px 16px;background:rgba(12,15,25,.85);border:1px solid rgba(0,200,240,.14);backdrop-filter:blur(10px);white-space:nowrap}
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
   RECENT RESULTS
═══════════════════════════════════ */
.results-wrap{display:flex;flex-direction:column;gap:3px}
.result-row{display:grid;grid-template-columns:160px 1fr 120px 1fr 100px;align-items:center;background:var(--ink2);border:1px solid var(--rim);position:relative;overflow:hidden;transition:background .18s,border-color .18s;min-height:72px}
.result-row::after{content:'';position:absolute;left:0;top:0;bottom:0;width:3px}
.result-row.rW::after{background:var(--green)}
.result-row.rL::after{background:var(--red)}
.result-row.rD::after{background:var(--draw)}
.result-row:hover{background:var(--ink3);border-color:rgba(0,200,240,.1)}
.rr-meta{padding:0 20px 0 24px}
.rr-matchday{font-family:var(--fc);font-size:9px;font-weight:800;letter-spacing:.22em;text-transform:uppercase;color:var(--cyan)}
.rr-comp{font-family:var(--fc);font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--silver);margin-top:3px}
.rr-date{font-size:11px;color:var(--muted);margin-top:3px;font-family:var(--fb)}
.rr-team{display:flex;align-items:center;gap:12px;padding:0 16px}
.rr-team.home{justify-content:flex-end;flex-direction:row}
.rr-team.away{justify-content:flex-start;flex-direction:row}
.rr-team-info{display:flex;flex-direction:column}
.rr-team.home .rr-team-info{text-align:right;align-items:flex-end}
.rr-team.away .rr-team-info{text-align:left;align-items:flex-start}
.rr-badge{width:34px;height:34px;border-radius:50%;background:var(--ink3);border:1px solid var(--rim2);display:flex;align-items:center;justify-content:center;font-family:var(--fc);font-size:10px;font-weight:800;color:var(--silver);flex-shrink:0}
.rr-badge.mine{border-color:var(--cyan);color:var(--cyan);background:var(--cdim);box-shadow:0 0 8px rgba(0,200,240,.12)}
.rr-name{font-family:var(--fc);font-size:15px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;line-height:1.1;color:var(--white)}
.rr-venue{font-size:10px;color:var(--muted);margin-top:2px;font-family:var(--fb);letter-spacing:.04em}
.rr-score{display:flex;align-items:center;justify-content:center;gap:0;padding:0;text-align:center;position:relative}
.rr-score::before{content:'';position:absolute;inset:8px 0;background:rgba(0,200,240,.03);border-left:1px solid var(--rim);border-right:1px solid var(--rim)}
.rr-score-val{font-family:var(--fd);font-size:28px;line-height:1;min-width:32px;text-align:center;position:relative;z-index:1}
.rr-score-sep{font-family:var(--fc);font-size:16px;font-weight:300;color:var(--muted);padding:0 6px;position:relative;z-index:1}
.rr-result-col{display:flex;align-items:center;justify-content:center;padding:0 14px}
.rr-result-pill{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;font-family:var(--fc);font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}
.rr-result-pill.win{background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.25);color:var(--green)}
.rr-result-pill.loss{background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25);color:var(--red)}
.rr-result-pill.draw{background:rgba(100,116,139,.08);border:1px solid rgba(100,116,139,.25);color:var(--draw)}
.rr-result-dot{width:5px;height:5px;border-radius:50%;background:currentColor}

/* ═══════════════════════════════════
   LIVE TABLE — full width broadcast
═══════════════════════════════════ */
.lts{position:relative;background:var(--ink);border-top:1px solid var(--rim);border-bottom:1px solid var(--rim);overflow:hidden}
.lts::before{content:'';position:absolute;top:-40%;left:50%;transform:translateX(-50%);width:800px;height:600px;background:radial-gradient(ellipse,rgba(0,200,240,.04) 0%,transparent 65%);pointer-events:none;z-index:0}

/* top bar */
.lts-topbar{position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;padding:0 44px;height:46px;border-bottom:1px solid var(--rim);background:rgba(0,200,240,.035)}
.lts-topbar-left{display:flex;align-items:center;gap:18px}
.lts-comp-label{font-family:var(--fc);font-size:10px;font-weight:800;letter-spacing:.28em;text-transform:uppercase;color:var(--cyan)}
.lts-sep{width:1px;height:14px;background:var(--rim2)}
.lts-season{font-family:var(--fc);font-size:10px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--muted)}
.lts-live-pill{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border:1px solid rgba(0,200,240,.25);background:rgba(0,200,240,.08);font-family:var(--fc);font-size:9px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:var(--cyan)}
.lts-live-dot{width:5px;height:5px;border-radius:50%;background:var(--cyan);animation:blink 2s ease infinite}

/* header */
.lts-head{position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;padding:36px 44px 32px;border-bottom:1px solid var(--rim)}
.lts-head-title{font-family:var(--fd);font-size:clamp(28px,3.5vw,44px);text-transform:uppercase;line-height:1;letter-spacing:.01em;color:var(--white)}
.lts-head-title em{font-style:normal;color:var(--cyan)}
.lts-head-desc{font-size:13px;font-weight:300;color:var(--muted);margin-top:8px;max-width:340px;line-height:1.6}
.lts-kpi-row{display:flex;gap:0;align-items:stretch}
.lts-kpi{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 28px;border-left:1px solid var(--rim);text-align:center;min-width:90px}
.lts-kpi-val{font-family:var(--fd);font-size:26px;line-height:1;color:var(--white)}
.lts-kpi-val em{font-style:normal;color:var(--cyan);font-size:16px}
.lts-kpi-lbl{font-family:var(--fc);font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--muted);margin-top:5px}

/* table */
.lts-table-wrap{position:relative;z-index:1}
.lts-col-head{display:grid;grid-template-columns:56px 1fr 52px 52px 52px 52px 64px 88px 64px;padding:9px 44px;border-bottom:1px solid var(--rim);background:rgba(255,255,255,.015)}
.lts-ch{font-family:var(--fc);font-size:9px;font-weight:800;letter-spacing:.22em;text-transform:uppercase;color:var(--muted);text-align:center}
.lts-ch:nth-child(2){text-align:left}

.lts-row{display:grid;grid-template-columns:56px 1fr 52px 52px 52px 52px 64px 88px 64px;padding:0 44px;align-items:center;min-height:62px;border-bottom:1px solid var(--rim);position:relative;transition:background .15s}
.lts-row:hover{background:rgba(255,255,255,.02)}

/* ALTAIR highlight row */
.lts-row--me{min-height:76px;background:linear-gradient(90deg,rgba(0,200,240,.1) 0%,rgba(0,200,240,.04) 60%,transparent 100%);border-top:1px solid rgba(0,200,240,.18);border-bottom:1px solid rgba(0,200,240,.18);margin:2px 0}
.lts-row--me:hover{background:linear-gradient(90deg,rgba(0,200,240,.14) 0%,rgba(0,200,240,.06) 60%,transparent 100%)}
.lts-row--me::before{content:'';position:absolute;left:0;top:0;bottom:0;width:4px;background:linear-gradient(to bottom,var(--cyan2),var(--cyan));box-shadow:2px 0 12px rgba(0,200,240,.3)}
.lts-row--me::after{content:'';position:absolute;right:0;top:0;bottom:0;width:120px;background:linear-gradient(to left,rgba(0,200,240,.04),transparent);pointer-events:none}

.lts-rank{font-family:var(--fd);font-size:16px;color:var(--muted);text-align:center}
.lts-row--me .lts-rank{font-size:20px;color:var(--cyan)}

.lts-club{display:flex;align-items:center;gap:13px}
.lts-badge{width:36px;height:36px;border-radius:50%;background:var(--ink3);border:1px solid var(--rim2);display:flex;align-items:center;justify-content:center;font-family:var(--fc);font-size:10px;font-weight:800;color:var(--silver);flex-shrink:0}
.lts-badge--mine{width:42px;height:42px;border-color:var(--cyan);color:var(--cyan);background:var(--cdim);box-shadow:0 0 16px rgba(0,200,240,.22),0 0 4px rgba(0,200,240,.15);font-size:11px}
.lts-club-name{font-family:var(--fc);font-size:14px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--silver)}
.lts-row--me .lts-club-name{font-size:17px;color:var(--white);letter-spacing:.05em}
.lts-club-sub{font-family:var(--fc);font-size:9px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--cyan);margin-top:2px;opacity:.75}

.lts-cell{font-family:var(--fc);font-size:13px;font-weight:600;color:var(--muted);text-align:center}
.lts-row--me .lts-cell{color:rgba(238,242,248,.6)}
.lts-cell--w{color:var(--green)!important;font-weight:700}
.lts-cell--l{color:var(--red)!important}
.lts-cell--gdp{color:var(--green)!important;font-weight:700}
.lts-cell--gdn{color:var(--red)!important;font-weight:700}

.lts-form{display:flex;align-items:center;justify-content:center;gap:4px}
.lts-fd{width:9px;height:9px;border-radius:50%;flex-shrink:0}
.lts-row--me .lts-fd{width:11px;height:11px}
.lts-fd--w{background:var(--green);box-shadow:0 0 5px rgba(34,197,94,.45)}
.lts-fd--l{background:var(--red)}
.lts-fd--d{background:var(--muted)}

.lts-pts{font-family:var(--fd);font-size:20px;color:var(--white);text-align:center}
.lts-row--me .lts-pts{font-size:26px;color:var(--cyan);text-shadow:0 0 20px rgba(0,200,240,.35)}

/* footer */
.lts-footer{display:flex;align-items:center;justify-content:space-between;padding:14px 44px;border-top:1px solid var(--rim);background:rgba(255,255,255,.01);position:relative;z-index:1}
.lts-footer-note{font-family:var(--fc);font-size:9px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--muted)}
.lts-footer-link{font-family:var(--fc);font-size:10px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--cyan);text-decoration:none;transition:opacity .2s}
.lts-footer-link:hover{opacity:.7}

/* ═══════════════════════════════════
   FIXTURES
═══════════════════════════════════ */
.fixtures-panel{display:flex;flex-direction:column;gap:2px}
.fxr-card{display:grid;grid-template-columns:100px 1px 1fr 1px 140px;align-items:center;min-height:88px;background:var(--ink2);border:1px solid var(--rim);position:relative;overflow:hidden;transition:border-color .22s,background .22s,box-shadow .22s}
.fxr-card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:2px;background:var(--cyan);opacity:0;transition:opacity .22s}
.fxr-card:hover{background:var(--ink3);border-color:rgba(0,200,240,.18);box-shadow:0 0 24px rgba(0,200,240,.05)}
.fxr-card:hover::before{opacity:1}
.fxr-date{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 20px;gap:1px}
.fxr-day{font-family:var(--fd);font-size:30px;line-height:2;color:var(--cyan)}
.fxr-month{font-family:var(--fc);font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--muted)}
.fxr-gw{font-family:var(--fc);font-size:9px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:rgba(0,200,240,.45);margin-top:4px}
.fxr-divider-v{width:1px;align-self:stretch;background:var(--rim)}
.fxr-matchup{display:grid;grid-template-columns:1fr 48px 1fr;align-items:center;padding:0 24px;gap:0}
.fxr-team{display:flex;align-items:center;gap:11px}
.fxr-team--home{justify-content:flex-end}
.fxr-team--away{justify-content:flex-start}
.fxr-badge{width:44px;height:44px;border-radius:50%;background:var(--ink3);border:1px solid var(--rim2);display:flex;align-items:center;justify-content:center;font-family:var(--fc);font-size:15px;font-weight:800;color:var(--silver);flex-shrink:0;transition:border-color .2s,box-shadow .2s}
.fxr-badge--mine{border-color:var(--cyan);color:var(--cyan);background:var(--cdim);box-shadow:0 0 10px rgba(0,200,240,.18)}
.fxr-tname{font-family:var(--fc);font-size:17px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--white);line-height:1.1}
.fxr-vs-block{display:flex;align-items:center;justify-content:center}
.fxr-vs{font-family:var(--fc);font-size:10px;font-weight:800;letter-spacing:.2em;color:var(--muted);text-align:center}
.fxr-meta{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 20px;gap:3px}
.fxr-time{font-family:var(--fd);font-size:18px;line-height:1;color:var(--white);letter-spacing:.02em}
.fxr-tz{font-family:var(--fc);font-size:9px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--muted)}
.fxr-venue{margin-top:6px;padding:2px 10px;font-family:var(--fc);font-size:9px;font-weight:800;letter-spacing:.16em;text-transform:uppercase}
.fxr-venue--home{background:var(--cdim);border:1px solid rgba(0,200,240,.22);color:var(--cyan)}
.fxr-venue--away{background:rgba(255,255,255,.04);border:1px solid var(--rim);color:var(--muted)}

/* ── SQUAD ───────────────────────── */
.squad-section{background:var(--ink2);border-top:1px solid var(--rim);border-bottom:1px solid var(--rim)}
.pos-group{margin-bottom:20px}
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
.sponsors-section{padding:72px 44px;border-top:1px solid var(--rim);border-bottom:1px solid var(--rim), text-align: left;}
.sp-layout{display:grid;grid-template-columns:1fr 1fr;gap:72px;align-items:center;margin-bottom:64px}
.sp-pitch-body{font-size:15px;font-weight:300;line-height:1.7;color:var(--silver);margin-top:14px;text-align: left;}
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
.footer-brand-name{font-family:var(--fd);font-size:35px;letter-spacing:.07em;text-transform:uppercase;color:var(--white)}
.footer-brand-tag{font-family:var(--fc);font-size:13px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--cyan);margin:5px 0 14px;opacity:.8}
.footer-bio{font-size:13px;color:var(--muted);line-height:1.7;max-width:270px}
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
  .sp-layout{grid-template-columns:1fr;gap:40px}
  .social-grid{grid-template-columns:1fr 1fr}
  .footer-top{grid-template-columns:1fr 1fr}
}
@media(max-width:768px){
  .nav{padding:0 18px}.nav-links{display:none}
  .section,.social-section{padding:60px 18px}
  .hero-left{padding:100px 18px 52px}
  .hero-stats{flex-wrap:wrap;gap:20px}
  .hst{border-right:none;margin:0;padding:0}
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
  /* lts mobile */
  .lts-topbar{padding:0 18px}
  .lts-head{padding:28px 18px;flex-direction:column;align-items:flex-start;gap:20px}
  .lts-kpi-row{flex-wrap:wrap;gap:16px 0}
  .lts-kpi:first-child{border-left:none;padding-left:0}
  .lts-footer{padding:12px 18px}
  .lts-col-head,.lts-row{grid-template-columns:36px 1fr 0 0 0 0 48px 0 48px;padding:0 18px}
  .lts-col-head>*:nth-child(3),.lts-col-head>*:nth-child(4),.lts-col-head>*:nth-child(5),
  .lts-col-head>*:nth-child(6),.lts-col-head>*:nth-child(8),
  .lts-row>*:nth-child(3),.lts-row>*:nth-child(4),.lts-row>*:nth-child(5),
  .lts-row>*:nth-child(6),.lts-row>*:nth-child(8){display:none}
  .lts-row--me{min-height:64px}
  .lts-badge--mine{width:36px;height:36px;font-size:10px}
  .lts-row--me .lts-club-name{font-size:14px}
  .lts-row--me .lts-pts{font-size:20px}
  /* fxr mobile */
  .fxr-card{grid-template-columns:72px 1px 1fr 1px 100px;min-height:76px}
  .fxr-matchup{padding:0 12px;grid-template-columns:1fr 36px 1fr}
  .fxr-tname{font-size:11px}
  .fxr-day{font-size:22px}
  .fxr-time{font-size:14px}
  .fxr-date,.fxr-meta{padding:0 10px}
  .fxr-gw{display:none}
}
`;

/* ─────────────────────────────────────────────────────────
   COMPONENTS
───────────────────────────────────────────────────────── */
function Logo() {
  return <img src="/logo.png" alt="ALTAIR eSports" className="nav-logo-img" />;
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

function HeroVisual() {
  const form = ["W","W","W","W","W"];
  return (
    <div className="hero-right">
      <div className="hero-glow-orb" />
      {[480,340,220,120].map((s,i)=>(
        <div key={i} className="hero-arc" style={{width:s,height:s,top:"50%",left:"50%",transform:"translate(-50%,-50%)"}} />
      ))}
      <div className="hero-logo-ring" style={{width:280,height:280}} />
      
      <div className="hero-logo-display">
        <img src="/logo.png" alt="ALTAIR" className="hero-logo-img" />
      </div>
      <div className="hero-form-strip">
        <span className="hfs-label">Form</span>
        {form.map((r,i)=>(
          <div key={i} className={`hfs-dot ${r==="W"?"hfs-w":r==="L"?"hfs-l":"hfs-d"}`}>{r}</div>
        ))}
      </div>
    </div>
  );
}

function ResultRow({ r }) {
  const homeIsAltair = r.home === "ALTAIR eSports";
  const awayIsAltair = r.away === "ALTAIR eSports";
  const badgeLabel = r.result==="W" ? "Victory" : r.result==="L" ? "Defeat" : "Draw";
  const badgeCls   = r.result==="W" ? "win"     : r.result==="L" ? "loss"   : "draw";
  return (
    <div className={`result-row r${r.result}`}>
      <div className="rr-meta">
        <div className="rr-matchday">{r.matchday}</div>
        <div className="rr-comp">{r.competition}</div>
        <div className="rr-date">{r.date}</div>
      </div>
      <div className="rr-team home">
        <div className="rr-team-info">
          <div className="rr-name">{r.home}</div>
          {homeIsAltair && <div className="rr-venue">Home</div>}
        </div>
        <div className={`rr-badge ${homeIsAltair ? "mine" : ""}`}>{r.homeAbbr}</div>
      </div>
      <div className="rr-score">
        <span className="rr-score-val">{r.hs}</span>
        <span className="rr-score-sep">–</span>
        <span className="rr-score-val">{r.as}</span>
      </div>
      <div className="rr-team away">
        <div className={`rr-badge ${awayIsAltair ? "mine" : ""}`}>{r.awayAbbr}</div>
        <div className="rr-team-info">
          <div className="rr-name">{r.away}</div>
          {awayIsAltair && <div className="rr-venue">Away</div>}
        </div>
      </div>
      <div className="rr-result-col">
        <div className={`rr-result-pill ${badgeCls}`}>
          <span className="rr-result-dot" />
          {badgeLabel}
        </div>
      </div>
    </div>
  );
}

function FixtureCard({ f }) {
  const altairHome = f.home === "ALTAIR eSports";
  const altairAway = f.away === "ALTAIR eSports";
  return (
    <div className="fxr-card">
      <div className="fxr-date">
        <span className="fxr-day">{f.day}</span>
        <span className="fxr-month">{f.month}</span>
        <span className="fxr-gw">{f.matchday}</span>
      </div>
      <div className="fxr-divider-v" />
      <div className="fxr-matchup">
        <div className="fxr-team fxr-team--home">
          <span className="fxr-tname">{f.home}</span>
          <div className={`fxr-badge ${altairHome ? "fxr-badge--mine" : ""}`}>{f.homeAbbr}</div>
        </div>
        <div className="fxr-vs-block">
          <span className="fxr-vs">VS</span>
        </div>
        <div className="fxr-team fxr-team--away">
          <div className={`fxr-badge ${altairAway ? "fxr-badge--mine" : ""}`}>{f.awayAbbr}</div>
          <span className="fxr-tname">{f.away}</span>
        </div>
      </div>
      <div className="fxr-divider-v" />
      <div className="fxr-meta">
        <span className="fxr-time">{f.time}</span>
        <span className="fxr-tz">CET</span>
        <span className={`fxr-venue ${altairHome ? "fxr-venue--home" : "fxr-venue--away"}`}>
          {altairHome ? "Home" : "Away"}
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
        <a href="#broadcast" className="nav-cta">Follow the Club</a>
      </nav>

      {/* HERO */}
      <section className="hero hero-stars">
        <div className="hero-bg"/>
        <div className="hero-grid"/>
        <div className="hero-split-line"/>
        <div className="hero-fade-b"/>
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
            ALTAIR eSports competes in the eMajor League FC 26 Pro Clubs 1. Lig 
            — a professional eSports team.
          </p>
          <div className="hero-btns">
            <a href="https://www.twitch.tv/altairespor" className="btn-primary">Watch Matches</a>
            <a href="#squad" className="btn-secondary">View Squad</a>
          </div>
          <div className="hero-stats" />
        </div>
        <HeroVisual />
      </section>

      {/* TICKER */}
      <Ticker />

      {/* LIVE TABLE */}
      <div className="lts" id="standings">

        <div className="lts-topbar">
          <div className="lts-topbar-left">
            <span className="lts-comp-label">eMajor League</span>
            <div className="lts-sep" />
            <span className="lts-season">FC 26 · 1. Lig · Season 2026</span>
          </div>
          <div className="lts-live-pill">
            <span className="lts-live-dot" />
            Live Standings
          </div>
        </div>

        <div className="lts-head">
          <div>
            <h2 className="lts-head-title">LIVE <em>TABLE</em></h2>
            <p className="lts-head-desc">
              
            </p>
          </div>
          <div className="lts-kpi-row">
            {[
              { val:"6",   unit:"th",   lbl:"Position" },
              { val:"28",  unit:" pts", lbl:"Points"   },
              { val:"9",   unit:"W",    lbl:"Wins"      },
              { val:"+21", unit:"",     lbl:"Goal Diff" },
              { val:"15",  unit:" GP",  lbl:"Played"    },
            ].map((k,i) => (
              <div key={i} className="lts-kpi">
                <div className="lts-kpi-val">{k.val}<em>{k.unit}</em></div>
                <div className="lts-kpi-lbl">{k.lbl}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="lts-table-wrap">
          <div className="lts-col-head">
            <span className="lts-ch">#</span>
            <span className="lts-ch" style={{textAlign:"left"}}>Club</span>
            <span className="lts-ch">P</span>
            <span className="lts-ch">W</span>
            <span className="lts-ch">D</span>
            <span className="lts-ch">L</span>
            <span className="lts-ch">GD</span>
            <span className="lts-ch">Form</span>
            <span className="lts-ch">Pts</span>
          </div>

          {STANDINGS_COMPACT.map(s => (
            <div key={s.abbr} className={`lts-row${s.me ? " lts-row--me" : ""}`}>
              <span className="lts-rank">{s.rank}</span>
              <div className="lts-club">
                <div className={`lts-badge${s.me ? " lts-badge--mine" : ""}`}>{s.abbr}</div>
                <div>
                  <div className="lts-club-name">{s.name}</div>
                </div>
              </div>
              <span className="lts-cell">{s.pld}</span>
              <span className="lts-cell lts-cell--w">{s.w}</span>
              <span className="lts-cell">{s.d}</span>
              <span className="lts-cell lts-cell--l">{s.l}</span>
              <span className={`lts-cell ${s.gd.startsWith("+") ? "lts-cell--gdp" : "lts-cell--gdn"}`}>
                {s.gd}
              </span>
              <div className="lts-form">
                {s.form.split("").map((c,i) => (
                  <div key={i} className={`lts-fd ${c==="W"?"lts-fd--w":c==="L"?"lts-fd--l":"lts-fd--d"}`} />
                ))}
              </div>
              <span className="lts-pts">{s.pts}</span>
            </div>
          ))}
        </div>

        <div className="lts-footer">
          <span className="lts-footer-note">Showing ranks 5–7 · 18 clubs total</span>
          <a
            className="lts-footer-link"
            href="https://emajorleague.com/tournaments/league_table/39/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Full table on eMajor League →
          </a>
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
      <section className="section squad-section" id="squad" style={{paddingTop:30, paddingBottom:30}}>
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
        <div className="sec-ey" style={{marginBottom:10,marginTop:-50}}>Partners &amp; Sponsors</div>
<div className="sp-layout">
  <div>
    <h2 className="sec-h" style={{marginBottom:14}}>OUR <em>PARTNERS</em></h2>
    ALTAIR partners with brands that share our drive for excellence. We deliver an authentic, engaged audience at the intersection of football and competitive gaming.
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
      <section className="social-section" id="broadcast" style={{paddingTop:0, paddingBottom:50}}>
        <div className="sec-hdr">
          <div className="sec-ey">Broadcasts &amp; Community</div>
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
            <img src="/logo.png" alt="ALTAIR eSports" style={{width:150, height:150, objectFit:"contain", marginTop:16, marginBottom:4, filter:"drop-shadow(0 0 7px rgba(0,200,240,.4))"}} />
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
