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
    { number:"1", name:"MEHMETCAN BABAT", ign:"mcb06099", pos:"GK", role:"Goalkeeper", flag:"🇹🇷", init:"MB", apps:0, goals:0, assists:0, captain:false, profileUrl:"https://emajorleague.com/players/profile/6666/", image:"public/players/mcb06099.webp" },
  ]},
  { group:"Defenders", abbr:"DEF", players:[
    { number:"21", name:"RÜŞTÜ ALPER GÜLER", ign:"DreamArmyA", pos:"RB", role:"Right-Back", flag:"🇹🇷", init:"RAG", apps:0, goals:0, assists:0, captain:false, profileUrl:"https://emajorleague.com/players/profile/9054/" },
    { number:"99", name:"EGE YILMAZ", ign:"Zeppettoo", pos:"CB", role:"Centre-Back", flag:"🇹🇷", init:"EY", apps:0, goals:0, assists:0, captain:false, profileUrl:"https://emajorleague.com/players/profile/9059/", image:"public/players/Zeppettoo.webp" },
    { number:"", name:"", ign:"YSN43I", pos:"CB", role:"Centre-Back", flag:"", init:"YS", apps:null, goals:null, assists:null, captain:false, profileUrl:"", pending:true },
    { number:"5", name:"AYBERK ÖZTÜRK", ign:"LethalGullit", pos:"CB", role:"Centre-Back", flag:"🇹🇷", init:"AÖ", apps:2, goals:0, assists:0, captain:false, profileUrl:"https://emajorleague.com/players/profile/8829/", image:"public/players/LethalGullit.jpg" },
    { number:"", name:"", ign:"TRU-egehanski", pos:"CB", role:"Centre-Back", flag:"", init:"TE", apps:null, goals:null, assists:null, captain:false, profileUrl:"", pending:true },
    { number:"", name:"", ign:"ek341907", pos:"CB", role:"Centre-Back", flag:"", init:"EK", apps:null, goals:null, assists:null, captain:false, profileUrl:"", pending:true },
  ]},
  { group:"Midfielders", abbr:"MID", players:[
    { number:"35", name:"KARAHAN ZEKİ TAŞKAN", ign:"maniac_kara35", pos:"CDM", role:"Defensive Midfielder", flag:"🇹🇷", init:"KZT", apps:2, goals:0, assists:0, captain:true, profileUrl:"https://emajorleague.com/players/profile/9020/", image:"public/players/maniac_kara35.jpg" },
    { number:"3", name:"ÖMÜR ÇORUMLUOĞLU", ign:"creedxzenci", pos:"CM", role:"Central Midfielder", flag:"🇹🇷", init:"ÖÇ", apps:2, goals:0, assists:0, captain:false, profileUrl:"https://emajorleague.com/players/profile/8458/", image:"public/players/creedxzenci.jpg" },
    { number:"77", name:"ORÇUN BEKTAŞ", ign:"ORC-HI", pos:"CM", role:"Central Midfielder", flag:"🇹🇷", init:"OB", apps:2, goals:0, assists:0, captain:true, profileUrl:"https://emajorleague.com/players/profile/1897/", image:"public/players/ORC-HI.jpg" },
  ]},
  { group:"Forwards", abbr:"FWD", players:[
    { number:"", name:"", ign:"Esquua", pos:"LW", role:"Left Winger", flag:"", init:"ES", apps:null, goals:null, assists:null, captain:false, profileUrl:"", pending:true },
    { number:"", name:"", ign:"PunisherrrX17", pos:"LW", role:"Left Winger", flag:"", init:"PX", apps:null, goals:null, assists:null, captain:false, profileUrl:"", pending:true },
    { number:"11", name:"HAZAR TARASHOHİ", ign:"KingHzrq", pos:"RW", role:"Right Winger", flag:"🇹🇷", init:"HT", apps:0, goals:0, assists:0, captain:false, profileUrl:"https://emajorleague.com/players/profile/8814/", image:"public/players/KingHzrq.jpg" },
    { number:"", name:"", ign:"KinaciYusuf", pos:"RW", role:"Right Winger", flag:"", init:"KY", apps:null, goals:null, assists:null, captain:false, profileUrl:"", pending:true },
    { number:"57", name:"SACİT KARACA", ign:"Sparostago1", pos:"RW", role:"Right Winger", flag:"🇹🇷", init:"SK", apps:0, goals:0, assists:0, captain:false, profileUrl:"https://emajorleague.com/players/profile/9224/" },
    { number:"7", name:"DOĞUKAN TOMBUL", ign:"Xwrdodo", pos:"ST", role:"Striker", flag:"🇹🇷", init:"DK", apps:2, goals:1, assists:0, captain:false, profileUrl:"https://emajorleague.com/Dooggyy/", image:"public/players/Xwrdodo.jpg" },
    { number:"10", name:"ŞENER YİĞİT ÇOKYÜCEL", ign:"yigitinski", pos:"ST", role:"Striker", flag:"🇹🇷", init:"ŞYÇ", apps:2, goals:0, assists:0, captain:true, profileUrl:"https://emajorleague.com/yigitinski/", image:"public/players/yigitinski.jpg" },
  ]},
];
