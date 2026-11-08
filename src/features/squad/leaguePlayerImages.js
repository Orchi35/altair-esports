// Add artwork by league and stable provider player ID, never by display name.
// Example: vpg: { "732864": { src:"/players/vpg/732864.webp", objectPosition:"50% 20%" } }
export const LEAGUE_PLAYER_IMAGES = { vpg:{}, nex:{} };

export function getLeaguePlayerImage(league, playerId) {
  return LEAGUE_PLAYER_IMAGES[league]?.[String(playerId)] || null;
}
