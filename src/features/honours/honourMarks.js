/* Shared helpers for the honours record (home section and the honours page). */

export function honourCount(mark) {
  const count = Number.parseInt(String(mark), 10);
  return Number.isFinite(count) && count > 0 ? count : 0;
}

export function isFinalMark(mark) {
  return mark === "F";
}

const SEASON_LABELS = {
  tr:{ "Tournament Record":"Turnuva kaydı" },
  en:{ "Tournament Record":"Tournament record" },
};

export function localizeSeason(season, locale) {
  const lang = locale === "en" ? "en" : "tr";
  if (SEASON_LABELS[lang][season]) return SEASON_LABELS[lang][season];
  return lang === "tr" ? String(season).replace(/Season (\d+)/, "$1. Sezon") : season;
}
