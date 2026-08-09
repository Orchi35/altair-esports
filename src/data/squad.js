/*
 * ALTAIR oyuncu profillerinin yerel bilgi kaynağı.
 *
 * Kadro üyeliği ve mevkiler eMajor League üzerinden otomatik eşitlenir.
 * İsim, forma numarası, görsel, kaptanlık ve profil bağlantısı gibi kulübe
 * özel bilgiler bu dosyada korunur. Yeni bir oyuncunun eksik alanları,
 * doğrulanmış bilgiler geldikten sonra burada doldurulabilir.
 */
export const SQUAD = [
  { group:"Goalkeepers", abbr:"GK", players:[
    { number:"1", name:"MEHMETCAN BABAT", ign:"mcb06099", pos:"GK", role:"Goalkeeper", flag:"🇹🇷", init:"MB", apps:3, goals:0, assists:0, captain:false, profileUrl:"https://emajorleague.com/players/profile/6666/", image:"/players/mcb06099.webp" },
  ]},
  { group:"Defenders", abbr:"DEF", players:[
    { number:"21", name:"RÜŞTÜ ALPER GÜLER", ign:"DreamArmyA", pos:"RB", role:"Right-Back", flag:"🇹🇷", init:"RAG", apps:0, goals:0, assists:0, captain:false, profileUrl:"https://emajorleague.com/players/profile/9054/" },
    { number:"99", name:"EGE YILMAZ", ign:"Zeppettoo", pos:"CB", role:"Centre-Back", flag:"🇹🇷", init:"EY", apps:5, goals:0, assists:0, captain:false, profileUrl:"https://emajorleague.com/players/profile/9059/", image:"/players/Zeppettoo.webp" },
    { number:"", name:"", ign:"yasko434", pos:"CB", role:"Centre-Back", flag:"", init:"YA", apps:3, goals:0, assists:0, captain:false, profileUrl:"https://emajorleague.com/YSN43I/", pending:true },
    { number:"5", name:"AYBERK ÖZTÜRK", ign:"LethalGullit", pos:"CB", role:"Centre-Back", flag:"🇹🇷", init:"AÖ", apps:9, goals:1, assists:0, captain:false, profileUrl:"https://emajorleague.com/players/profile/8829/", image:"/players/LethalGullit.jpg" },
    { number:"", name:"", ign:"TRU-egehanski", pos:"CB", role:"Centre-Back", flag:"", init:"TE", apps:6, goals:1, assists:0, captain:false, profileUrl:"https://emajorleague.com/players/profile/7652/", pending:true },
    { number:"", name:"", ign:"ek341907", pos:"CB", role:"Centre-Back", flag:"", init:"EK", apps:2, goals:0, assists:0, captain:false, profileUrl:"https://emajorleague.com/players/profile/7979/", pending:true },
  ]},
  { group:"Midfielders", abbr:"MID", players:[
    { number:"10", name:"ŞENER YİĞİT ÇOKYÜCEL", ign:"yigitinski", pos:"CDM", role:"Defensive Midfielder", flag:"🇹🇷", init:"ŞYÇ", apps:9, goals:7, assists:1, captain:true, profileUrl:"https://emajorleague.com/yigitinski/", image:"/players/yigitinski.jpg" },
    { number:"35", name:"KARAHAN ZEKİ TAŞKAN", ign:"maniac_kara35", pos:"CDM", role:"Defensive Midfielder", flag:"🇹🇷", init:"KZT", apps:6, goals:0, assists:0, captain:true, profileUrl:"https://emajorleague.com/players/profile/9020/", image:"/players/maniac_kara35.jpg" },
    { number:"3", name:"ÖMÜR ÇORUMLUOĞLU", ign:"creedxzenci", pos:"CDM", role:"Defensive Midfielder", flag:"🇹🇷", init:"ÖÇ", apps:9, goals:0, assists:1, captain:false, profileUrl:"https://emajorleague.com/players/profile/8458/", image:"/players/creedxzenci.jpg" },
    { number:"77", name:"ORÇUN BEKTAŞ", ign:"ORC-HI", pos:"CM", role:"Central Midfielder", flag:"🇹🇷", init:"OB", apps:9, goals:0, assists:3, captain:true, profileUrl:"https://emajorleague.com/Orchi/", image:"/players/ORC-HI.jpg" },
  ]},
  { group:"Forwards", abbr:"FWD", players:[
    { number:"", name:"", ign:"Esquua", pos:"LW", role:"Left Winger", flag:"", init:"ES", apps:0, goals:0, assists:0, captain:false, profileUrl:"https://emajorleague.com/players/profile/8627/", pending:true },
    { number:"", name:"", ign:"PunisherrrX17", pos:"CF", role:"Centre-Forward", flag:"", init:"PX", apps:3, goals:3, assists:1, captain:false, profileUrl:"https://emajorleague.com/players/profile/6368/", pending:true },
    { number:"11", name:"HAZAR TARASHOHİ", ign:"KingHzrq", pos:"RW", role:"Right Winger", flag:"🇹🇷", init:"HT", apps:5, goals:1, assists:0, captain:false, profileUrl:"https://emajorleague.com/players/profile/8814/", image:"/players/KingHzrq.jpg" },
    { number:"", name:"", ign:"KinaciYusuf", pos:"RW", role:"Right Winger", flag:"", init:"KY", apps:7, goals:1, assists:1, captain:false, profileUrl:"https://emajorleague.com/YusufKinaci/", pending:true },
    { number:"57", name:"SACİT KARACA", ign:"Sparostago1", pos:"RW", role:"Right Winger", flag:"🇹🇷", init:"SK", apps:0, goals:0, assists:0, captain:false, profileUrl:"https://emajorleague.com/players/profile/9224/" },
    { number:"7", name:"DOĞUKAN TOMBUL", ign:"Xwrdodo", pos:"ST", role:"Striker", flag:"🇹🇷", init:"DK", apps:9, goals:1, assists:4, captain:false, profileUrl:"https://emajorleague.com/Dooggyy/", image:"/players/Xwrdodo.jpg" },
  ]},
];
