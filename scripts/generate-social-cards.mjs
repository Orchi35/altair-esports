// Optional authoring command; committed JPEGs are used by builds without a browser.
// Uses existing club artwork, embedded assets and system fonts; no network requests.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launchBrowser } from "../test/e2e/support/browser.mjs";
import { getSocialCardPath, SOCIAL_CARD_SECTIONS } from "../src/seo/socialCards.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assets = {};
for (const [name, file] of Object.entries({logo:"altair-brand-logo.png", stadium:"games/penalty/stadium-v1.webp", ball:"games/penalty/ball-v1.webp", player:"builder/player-silhouette-v2.png", captain:"players/vpg/732864.png", teammate:"players/vpg/869642.png"})) {
  assets[name] = `data:image/${file.endsWith("png") ? "png" : "webp"};base64,${(await fs.readFile(path.join(root, "public", file))).toString("base64")}`;
}
const copy = {
  tr:{
    home:["BİRLİKTE OYNAR.", "BİRLİKTE<br>KAZANIRIZ.", "Bir kulüpten daha fazlası.", "KULÜP · OYUN · TOPLULUK"],
    penalty:["ALTAIR PENALTI ARENA", "SAHNE SENİN.<br>REKOR SENİN.", "10 şut. 2 Panenka. Tek hedef: zirve.", "OYNA · REKORUNU GELİŞTİR"],
    builder:["FC27 PRO CLUBS BUILDER", "OYUNCUNU<br>SEN TASARLA.", "Build oluştur. Kartını indir. Bağlantıyla paylaş.", "ÜYELİK GEREKTİRMEZ"],
    squad:["ALTAIR KADRO", "AYNI ARMA.<br>TEK TAKIM.", "Sahadaki gücümüzü yakından tanı.", "OYUNCULAR · PROFİLLER"],
    matches:["MAÇ MERKEZİ", "HER MAÇ.<br>AYNI TUTKU.", "Fikstür, sonuçlar ve sezonun hikâyesi.", "FİKSTÜR · SONUÇLAR"],
    honours:["KULÜP BAŞARILARI", "BİRLİKTE<br>YAZDIK.", "Sahada kazanılan, tarihe yazılan başarılar.", "ALTAIR ESPORTS"],
    partnerships:["MARKA İŞ BİRLİKLERİ", "BİRLİKTE<br>DAHA İLERİ.", "Markanı oyunun ve topluluğun bir parçası yap.", "İŞ BİRLİKLERİ · MEDYA KİTİ"],
  },
  en:{
    home:["TOGETHER WE PLAY.", "TOGETHER<br>WE WIN.", "More than a club.", "CLUB · GAME · COMMUNITY"],
    penalty:["ALTAIR PENALTY ARENA", "YOUR STAGE.<br>YOUR RECORD.", "10 shots. 2 Panenkas. One goal: the top.", "PLAY · BEAT YOUR BEST"],
    builder:["FC27 PRO CLUBS BUILDER", "BUILD YOUR<br>OWN PLAYER.", "Create a build. Download a card. Share a link.", "NO ACCOUNT REQUIRED"],
    squad:["ALTAIR SQUAD", "ONE CREST.<br>ONE TEAM.", "Meet the players behind our game.", "PLAYERS · PROFILES"],
    matches:["MATCH CENTER", "EVERY MATCH.<br>ONE PASSION.", "Fixtures, results and the story of our season.", "FIXTURES · RESULTS"],
    honours:["CLUB HONOURS", "EARNED<br>TOGETHER.", "Our achievements. Our shared history.", "ALTAIR ESPORTS"],
    partnerships:["BRAND PARTNERSHIPS", "GO FURTHER.<br>TOGETHER.", "Make your brand part of the game.", "PARTNERSHIPS · MEDIA KIT"],
  },
};

function artwork(section, locale) {
  if (section === "penalty") return `<div class="goal"></div><img class="ball" src="${assets.ball}"><div class="orbit"></div><span class="panenka">PANENKA <b>×2</b></span>`;
  if (section === "builder") return `<div class="player-card"><span class="card-tag">FC27 <b>PRO CLUBS</b></span><img src="${assets.player}"><div class="card-name">${locale === "tr" ? "SENİN BUILD’İN" : "YOUR BUILD"}</div><div class="card-features">ARCHETYPE <i>+</i> AP <i>+</i> PLAYSTYLE</div></div><span class="build-chip">${locale === "tr" ? "OLUŞTUR → PAYLAŞ" : "CREATE → SHARE"}</span>`;
  if (section === "squad") return `<img class="portrait back" src="${assets.teammate}"><img class="portrait front" src="${assets.captain}">`;
  return `<div class="halo"></div><img class="hero-logo" src="${assets.logo}">${section === "matches" ? '<span class="match-label">MATCHDAY</span>' : ""}`;
}

function render(section, locale) {
  const [eyebrow, title, description, footer] = copy[locale][section];
  return `<!doctype html><html lang="${locale}"><meta charset="utf-8"><style>
  *{box-sizing:border-box}body{margin:0;width:1200px;height:630px;overflow:hidden;background:#07111f;color:#f4f8ff;font-family:Arial,sans-serif}
  .card{position:relative;width:1200px;height:630px;overflow:hidden;background:radial-gradient(ellipse at 85% 40%,#1e4b70 0,transparent 55%),#07111f}
  .stadium{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.28}.shade{position:absolute;inset:0;background:linear-gradient(90deg,#07111f 0%,#07111ff5 28%,#07111fa0 62%,#07111f15)}
  .rule{position:absolute;inset:0 auto 0 0;width:7px;background:linear-gradient(#bde5ff,#4087c4)}.top{position:absolute;left:54px;top:35px;display:flex;align-items:center;gap:14px;font-size:22px;font-weight:700;letter-spacing:2px}.top img{width:52px;height:52px;object-fit:contain}.top span{font-size:13px;letter-spacing:3px;color:#8ba5bc;font-weight:400;margin-left:8px}
  .copy{position:absolute;left:60px;top:170px;z-index:3}.eyebrow{font-size:17px;letter-spacing:3px;color:#a9d9fa;font-weight:700;margin-bottom:22px}h1{font-size:70px;line-height:1.05;letter-spacing:-3px;margin:0 0 23px;font-weight:900}p{font-size:21px;line-height:1.45;color:#c0d1df;margin:0;max-width:540px}
  .art{position:absolute;left:720px;top:110px;width:430px;height:430px}.hero-logo{position:absolute;width:405px;height:405px;top:4px;left:5px;object-fit:contain;filter:drop-shadow(0 22px 28px #020815)}.halo{position:absolute;border:1px solid #7db9ec38;border-radius:50%;inset:0;box-shadow:0 0 100px #74c7ff1a,inset 0 0 80px #70c4ff15}.halo:after{content:"";position:absolute;inset:30px;border:1px solid #7db9ec26;border-radius:50%}
  .bottom{position:absolute;left:60px;right:54px;bottom:35px;padding-top:22px;border-top:1px solid #a3cce633;display:flex;justify-content:space-between;align-items:center;font-size:14px;letter-spacing:2px;color:#a9c0d3}.url{color:#e9f5ff;letter-spacing:1px;font-size:17px}.arrow{color:#9fd3f6;font-size:22px;margin-left:15px}
  .goal{position:absolute;left:-38px;top:22px;width:445px;height:246px;border:8px solid #d7e6ef;border-bottom:5px solid #9db8cb;transform:perspective(700px) rotateY(-13deg);background:repeating-linear-gradient(0deg,transparent 0 18px,#e5f4ff45 18px 19px),repeating-linear-gradient(90deg,transparent 0 21px,#e5f4ff45 21px 22px);box-shadow:0 0 35px #9bd9ff33}
  .ball{position:absolute;left:87px;top:146px;width:270px;height:270px;object-fit:contain;filter:drop-shadow(0 20px 20px #000b);z-index:2}.orbit{position:absolute;left:66px;top:255px;width:315px;height:110px;border:2px solid #8ad9ff88;border-radius:50%;transform:rotate(-25deg)}.panenka{position:absolute;top:344px;left:-24px;padding:15px 20px;background:#132b40;border:1px solid #9dd9ff70;border-radius:10px;font-size:15px;letter-spacing:2px;z-index:3}.panenka b{color:#c3e8ff;margin-left:10px;font-size:24px}
  .player-card{position:absolute;left:55px;top:-7px;width:303px;height:411px;border:1px solid #a3d5ff99;border-radius:24px 24px 56px 24px;background:linear-gradient(145deg,#416786,#152c43 50%,#08131f);transform:rotate(5deg);overflow:hidden;box-shadow:0 20px 70px #0008}.player-card img{position:absolute;width:285px;left:8px;top:47px}.card-tag{position:absolute;top:24px;left:24px;right:24px;font-size:25px;z-index:2;font-weight:700;color:#d2ecff}.card-tag b{float:right;font-size:11px;letter-spacing:2px;padding-top:10px}.card-name{position:absolute;bottom:61px;left:0;right:0;text-align:center;background:#0a1929d9;padding:15px 0;font-weight:700;letter-spacing:2px;font-size:21px}.card-features{position:absolute;bottom:31px;left:0;right:0;text-align:center;font-size:10px;letter-spacing:1px;color:#b9d9ed}.card-features i{color:#e3c89a;margin:0 7px}.build-chip{position:absolute;left:10px;bottom:4px;padding:15px 24px;border-radius:8px;background:#b7def8;color:#10243a;font-weight:700;letter-spacing:2px;font-size:13px}
  .portrait{position:absolute;object-fit:cover;width:235px;height:340px;top:42px;border:1px solid #8fbbd555;border-radius:18px;box-shadow:0 20px 40px #0006}.portrait.back{left:180px;transform:rotate(8deg);filter:brightness(.8)}.portrait.front{left:-10px;top:12px;height:380px;width:250px;transform:rotate(-5deg)}.match-label{position:absolute;bottom:1px;left:115px;letter-spacing:6px;color:#a5d1ec;font-size:14px}.honours .eyebrow,.honours .bottom{color:#dcc59c}.honours .rule{background:#dcc59c}
  </style><div class="card ${section}"><img class="stadium" src="${assets.stadium}"><div class="shade"></div><div class="rule"></div><div class="top"><img src="${assets.logo}">ALTAIR <span>ESPORTS</span></div><div class="copy"><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${description}</p></div><div class="art">${artwork(section, locale)}</div><div class="bottom"><span>${footer}</span><span class="url">altairesports.com <b class="arrow">↗</b></span></div></div></html>`;
}

await fs.mkdir(path.join(root, "public/social"), { recursive:true });
const browser = await launchBrowser();
try {
  const { page } = browser;
  await page.setViewport(1200, 630);
  const previews = [];
  for (const locale of ["tr", "en"]) for (const section of SOCIAL_CARD_SECTIONS) {
    const html = render(section, locale);
    const { frameTree } = await page.cdp.send("Page.getFrameTree");
    await page.cdp.send("Page.setDocumentContent", { frameId:frameTree.frame.id, html });
    await page.evaluate("Promise.all([...document.images].map(image => image.decode())).then(() => document.fonts.ready)");
    const shot = await page.cdp.send("Page.captureScreenshot", { format:"jpeg", quality:92 });
    const filename = getSocialCardPath(section, locale);
    const data = Buffer.from(shot.data, "base64");
    await fs.writeFile(path.join(root, "public", filename), data);
    previews.push(`<figure><img src="data:image/jpeg;base64,${shot.data}"><figcaption>${section} / ${locale}</figcaption></figure>`);
    console.log(`${filename} (${Math.round(data.length / 1024)} KB)`);
  }
  await fs.mkdir(path.join(root, "output"), { recursive:true });
  const html = `<html><style>body{margin:0;padding:20px;background:#17212e;color:white;font:14px Arial;display:grid;grid-template-columns:1fr 1fr;gap:20px}figure{margin:0}img{width:100%}figcaption{padding:6px}</style>${previews.join("")}</html>`;
  await fs.writeFile(path.join(root, "output/social-cards-preview.html"), html);
  await page.setViewport(1240, 2470);
  const { frameTree } = await page.cdp.send("Page.getFrameTree");
  await page.cdp.send("Page.setDocumentContent", { frameId:frameTree.frame.id, html });
  await page.evaluate("Promise.all([...document.images].map(image => image.decode()))");
  const preview = await page.cdp.send("Page.captureScreenshot", { format:"jpeg", quality:85 });
  await fs.writeFile(path.join(root, "output/social-cards-preview.jpg"), Buffer.from(preview.data, "base64"));
} finally {
  await browser.close();
}
