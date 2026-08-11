const POSITION_ROLES = Object.freeze({
  GK:"Goalkeeper",
  LB:"Left-Back",
  RB:"Right-Back",
  CB:"Centre-Back",
  CDM:"Defensive Midfielder",
  CM:"Central Midfielder",
  CAM:"Attacking Midfielder",
  LW:"Left Winger",
  RW:"Right Winger",
  CF:"Centre-Forward",
  ST:"Striker",
});

const GROUP_META = Object.freeze([
  { group:"Goalkeepers", abbr:"GK" },
  { group:"Defenders", abbr:"DEF" },
  { group:"Midfielders", abbr:"MID" },
  { group:"Forwards", abbr:"FWD" },
]);

/**
 * ALTAIR tarafından yönetilen takım üyeliği kaynağıdır. Maç ve oyuncu
 * istatistikleri bu kaynağa ait değildir; yalnızca doğrulanmış geçici
 * istatistik snapshot'ları playerId üzerinden eklenir.
 */
export const CANONICAL_SQUAD = Object.freeze([
  { playerId:"player-mcb06099", slug:"mehmetcan-babat", firstName:"MEHMETCAN", lastName:"BABAT", gamerTag:"mcb06099", shirtNumber:"1", position:"GK", positionGroup:"Goalkeepers", image:"/players/mcb06099-720.webp", status:"active", joinedAt:null, displayOrder:1, profileUrl:"https://emajorleague.com/players/profile/6666/", captain:false, initials:"MB" },
  { playerId:"player-dreamarmya", slug:"rustu-alper-guler", firstName:"RÜŞTÜ ALPER", lastName:"GÜLER", gamerTag:"DreamArmyA", shirtNumber:"21", position:"RB", positionGroup:"Defenders", image:null, status:"active", joinedAt:null, displayOrder:2, profileUrl:"https://emajorleague.com/players/profile/9054/", captain:false, initials:"RAG" },
  { playerId:"player-zeppettoo", slug:"ege-yilmaz", firstName:"EGE", lastName:"YILMAZ", gamerTag:"Zeppettoo", shirtNumber:"99", position:"CB", positionGroup:"Defenders", image:"/players/Zeppettoo-720.webp", status:"active", joinedAt:null, displayOrder:3, profileUrl:"https://emajorleague.com/players/profile/9059/", captain:false, initials:"EY" },
  { playerId:"player-yasko434", slug:"yasko434", firstName:null, lastName:null, gamerTag:"yasko434", shirtNumber:null, position:"CB", positionGroup:"Defenders", image:null, status:"active", joinedAt:null, displayOrder:4, profileUrl:"https://emajorleague.com/YSN43I/", captain:false, initials:"YA" },
  { playerId:"player-lethalgullit", slug:"ayberk-ozturk", firstName:"AYBERK", lastName:"ÖZTÜRK", gamerTag:"LethalGullit", shirtNumber:"5", position:"CB", positionGroup:"Defenders", image:"/players/LethalGullit-720.webp", status:"active", joinedAt:null, displayOrder:5, profileUrl:"https://emajorleague.com/players/profile/8829/", captain:false, initials:"AÖ" },
  { playerId:"player-tru-egehanski", slug:"tru-egehanski", firstName:null, lastName:null, gamerTag:"TRU-egehanski", shirtNumber:null, position:"CB", positionGroup:"Defenders", image:null, status:"active", joinedAt:null, displayOrder:6, profileUrl:"https://emajorleague.com/players/profile/7652/", captain:false, initials:"TE" },
  { playerId:"player-ek341907", slug:"ek341907", firstName:null, lastName:null, gamerTag:"ek341907", shirtNumber:null, position:"CB", positionGroup:"Defenders", image:null, status:"active", joinedAt:null, displayOrder:7, profileUrl:"https://emajorleague.com/players/profile/7979/", captain:false, initials:"EK" },
  { playerId:"player-yigitinski", slug:"sener-yigit-cokyucel", firstName:"ŞENER YİĞİT", lastName:"ÇOKYÜCEL", gamerTag:"yigitinski", shirtNumber:"10", position:"CDM", positionGroup:"Midfielders", image:"/players/yigitinski-720.webp", status:"active", joinedAt:null, displayOrder:8, profileUrl:"https://emajorleague.com/yigitinski/", captain:true, initials:"ŞYÇ" },
  { playerId:"player-maniac-kara35", slug:"karahan-zeki-taskan", firstName:"KARAHAN ZEKİ", lastName:"TAŞKAN", gamerTag:"maniac_kara35", shirtNumber:"35", position:"CDM", positionGroup:"Midfielders", image:"/players/maniac_kara35-720.webp", status:"active", joinedAt:null, displayOrder:9, profileUrl:"https://emajorleague.com/players/profile/9020/", captain:true, initials:"KZT" },
  { playerId:"player-creedxzenci", slug:"omur-corumluoglu", firstName:"ÖMÜR", lastName:"ÇORUMLUOĞLU", gamerTag:"creedxzenci", shirtNumber:"3", position:"CDM", positionGroup:"Midfielders", image:"/players/creedxzenci-720.webp", status:"active", joinedAt:null, displayOrder:10, profileUrl:"https://emajorleague.com/players/profile/8458/", captain:false, initials:"ÖÇ" },
  { playerId:"player-orc-hi", slug:"orcun-bektas", firstName:"ORÇUN", lastName:"BEKTAŞ", gamerTag:"ORC-HI", shirtNumber:"77", position:"CM", positionGroup:"Midfielders", image:"/players/ORC-HI-720.webp", status:"active", joinedAt:null, displayOrder:11, profileUrl:"https://emajorleague.com/Orchi/", captain:true, initials:"OB" },
  { playerId:"player-esquua", slug:"esquua", firstName:null, lastName:null, gamerTag:"Esquua", shirtNumber:null, position:"LW", positionGroup:"Forwards", image:null, status:"active", joinedAt:null, displayOrder:12, profileUrl:"https://emajorleague.com/players/profile/8627/", captain:false, initials:"ES" },
  { playerId:"player-punisherrrx17", slug:"punisherrrx17", firstName:null, lastName:null, gamerTag:"PunisherrrX17", shirtNumber:null, position:"CF", positionGroup:"Forwards", image:null, status:"active", joinedAt:null, displayOrder:13, profileUrl:"https://emajorleague.com/players/profile/6368/", captain:false, initials:"PX" },
  { playerId:"player-kinghzrq", slug:"hazar-tarashohi", firstName:"HAZAR", lastName:"TARASHOHİ", gamerTag:"KingHzrq", shirtNumber:"11", position:"RW", positionGroup:"Forwards", image:"/players/KingHzrq-720.webp", status:"active", joinedAt:null, displayOrder:14, profileUrl:"https://emajorleague.com/players/profile/8814/", captain:false, initials:"HT" },
  { playerId:"player-kinaciyusuf", slug:"kinaciyusuf", firstName:null, lastName:null, gamerTag:"KinaciYusuf", shirtNumber:null, position:"RW", positionGroup:"Forwards", image:null, status:"active", joinedAt:null, displayOrder:15, profileUrl:"https://emajorleague.com/YusufKinaci/", captain:false, initials:"KY" },
  { playerId:"player-sparostago1", slug:"sacit-karaca", firstName:"SACİT", lastName:"KARACA", gamerTag:"Sparostago1", shirtNumber:"57", position:"RW", positionGroup:"Forwards", image:null, status:"active", joinedAt:null, displayOrder:16, profileUrl:"https://emajorleague.com/players/profile/9224/", captain:false, initials:"SK" },
  { playerId:"player-xwrdodo", slug:"dogukan-tombul", firstName:"DOĞUKAN", lastName:"TOMBUL", gamerTag:"Xwrdodo", shirtNumber:"7", position:"ST", positionGroup:"Forwards", image:"/players/Xwrdodo-720.webp", status:"active", joinedAt:null, displayOrder:17, profileUrl:"https://emajorleague.com/Dooggyy/", captain:false, initials:"DK" },
].map((player) => Object.freeze(player)));

function toSquadPlayer(player) {
  const name = [player.firstName, player.lastName].filter(Boolean).join(" ");
  return Object.freeze({
    playerId:player.playerId,
    id:player.playerId,
    slug:player.slug,
    firstName:player.firstName,
    lastName:player.lastName,
    gamerTag:player.gamerTag,
    shirtNumber:player.shirtNumber,
    position:player.position,
    positionGroup:player.positionGroup,
    status:player.status,
    joinedAt:player.joinedAt,
    displayOrder:player.displayOrder,
    number:player.shirtNumber || "",
    name,
    ign:player.gamerTag,
    pos:player.position,
    role:POSITION_ROLES[player.position] || player.position,
    flag:name ? "🇹🇷" : "",
    init:player.initials,
    captain:player.captain,
    profileUrl:player.profileUrl,
    image:player.image || "",
    pending:!name,
  });
}

export const SQUAD = Object.freeze(GROUP_META.map((group) => Object.freeze({
  ...group,
  players:Object.freeze(
    CANONICAL_SQUAD
      .filter((player) => player.positionGroup === group.group)
      .sort((left, right) => left.displayOrder - right.displayOrder)
      .map(toSquadPlayer),
  ),
})));

export function validateCanonicalSquad(players = CANONICAL_SQUAD) {
  if (!Array.isArray(players) || players.length === 0) return { valid:false, errors:["CANONICAL_SQUAD_EMPTY"] };
  const errors = [];
  const playerIds = new Set();
  const slugs = new Set();
  for (const player of players) {
    if (!player?.playerId || !player.slug || !player.gamerTag || !player.position || !player.positionGroup || !player.status) {
      errors.push("CANONICAL_PLAYER_FIELDS_INVALID");
      continue;
    }
    if (playerIds.has(player.playerId)) errors.push(`DUPLICATE_PLAYER_ID:${player.playerId}`);
    if (slugs.has(player.slug)) errors.push(`DUPLICATE_PLAYER_SLUG:${player.slug}`);
    playerIds.add(player.playerId);
    slugs.add(player.slug);
  }
  if (![...players].some((player) => player.status === "active")) errors.push("ACTIVE_SQUAD_EMPTY");
  return { valid:errors.length === 0, errors };
}
