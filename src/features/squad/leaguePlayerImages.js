// Add artwork by league and stable provider player ID, never by display name.
// Example: vpg: { "732864": { src:"/players/vpg/732864.webp", objectPosition:"50% 20%" } }
export const LEAGUE_PLAYER_IMAGES = {
  vpg: {
    "927200": { src: "/players/vpg/927200.png", objectPosition: "50% 0%" }, // Swindler3r
    "916844": { src: "/players/vpg/916844.png", objectPosition: "50% 0%" }, // GocebeEno
    "951110": { src: "/players/vpg/951110.png", objectPosition: "50% 0%" }, // ardaygz1o
    "869359": { src: "/players/vpg/869359.png", objectPosition: "50% 0%" }, // HzrqKing
    "829482": { src: "/players/vpg/829482.png", objectPosition: "50% 0%" }, // yakupeyz
    "949390": { src: "/players/vpg/949390.png", objectPosition: "50% 0%" }, // Yalazi
    "759748": { src: "/players/vpg/759748.png", objectPosition: "50% 0%" }, // BlackinN35
    "869642": { src: "/players/vpg/869642.png", objectPosition: "50% 0%" }, // LethalGullit
    "836365": { src: "/players/vpg/836365.png", objectPosition: "50% 0%" }, // Michy
    "946408": { src: "/players/vpg/946408.png", objectPosition: "50% 0%" }, // raindrxps
    "927266": { src: "/players/vpg/927266.png", objectPosition: "50% 0%" }, // Tru-Ardas
    "701340": { src: "/players/vpg/701340.png", objectPosition: "50% 0%" }, // ByakuzaD
    "860664": { src: "/players/vpg/860664.png", objectPosition: "50% 0%" }, // creedxzenci
    "845171": { src: "/players/vpg/845171.png", objectPosition: "50% 0%" }, // egehanski
    "893787": { src: "/players/vpg/893787.png", objectPosition: "50% 0%" }, // mcb06099
    "732864": { src: "/players/vpg/732864.png", objectPosition: "50% 0%" }, // ORC-HI
    "887118": { src: "/players/vpg/887118.png", objectPosition: "50% 0%" }, // SOH-Chucky
    "868786": { src: "/players/vpg/868786.png", objectPosition: "50% 0%" }, // Xwrdodo
  },
  nex: {},
};

export function getLeaguePlayerImage(league, playerId) {
  return LEAGUE_PLAYER_IMAGES[league]?.[String(playerId)] || null;
}
