const ALTAIR_IDS = new Set(["ALTAIR-eSports", "altair-esports"]);

/**
 * @param {{ id?: string, slug?: string, name?: string } | null | undefined} team
 * @returns {boolean}
 */
export function isAltairTeam(team) {
  if (!team) return false;
  return ALTAIR_IDS.has(team.id) || ALTAIR_IDS.has(team.slug) || /^altair(\s+esports)?$/i.test(String(team.name || "").trim());
}

/**
 * ALTAIR's result in a finished match, or null when ALTAIR did not play or there is no score.
 * @param {{ homeTeam?: object, awayTeam?: object, score?: { home: number|string, away: number|string } | null }} match
 * @returns {"win" | "draw" | "loss" | null}
 */
export function getAltairOutcome(match) {
  const home = Number(match?.score?.home);
  const away = Number(match?.score?.away);
  if (!Number.isFinite(home) || !Number.isFinite(away)) return null;
  const altairHome = isAltairTeam(match.homeTeam);
  const altairAway = isAltairTeam(match.awayTeam);
  if (altairHome === altairAway) return null;
  const own = altairHome ? home : away;
  const other = altairHome ? away : home;
  return own > other ? "win" : own < other ? "loss" : "draw";
}

export const OUTCOME_LABELS = Object.freeze({
  TR:{ win:"Galibiyet", draw:"Beraberlik", loss:"Mağlubiyet" },
  EN:{ win:"Win", draw:"Draw", loss:"Loss" },
});

/** One-letter badge text for dense lists (G/B/M in Turkish, W/D/L in English). */
export const OUTCOME_SHORT = Object.freeze({
  TR:{ win:"G", draw:"B", loss:"M" },
  EN:{ win:"W", draw:"D", loss:"L" },
});

/** Matchday label for numeric rounds; other round strings are returned unchanged. */
export function formatRound(round, lang) {
  if (round === null || round === undefined || round === "") return null;
  return /^\d+$/.test(String(round).trim()) ? `${lang === "TR" ? "Hafta" : "Matchday"} ${round}` : String(round);
}
