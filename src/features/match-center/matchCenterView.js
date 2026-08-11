import { COMPETITION_SEASONS, DEFAULT_COMPETITION_SEASON } from "../../config/competition.js";
import { ALTAIR_TEAM } from "../../data/matchCenter.js";

export function getMatchOpponent(match) {
  if (!match) return null;
  return match.homeTeam.id === ALTAIR_TEAM.id ? match.awayTeam.name : match.homeTeam.name;
}

export function localizeMatchCompetition(match, lang) {
  const activeSeason = COMPETITION_SEASONS[DEFAULT_COMPETITION_SEASON];
  return match.competition === activeSeason.competition
    ? activeSeason.label[lang]
    : match.competition;
}

export function signedNumber(value) {
  const number = Number(value) || 0;
  return number > 0 ? `+${number}` : String(number);
}
