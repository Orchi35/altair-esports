import { getAltairOutcome } from "./matchOutcome.js";

export const MATCH_VIEWS = Object.freeze(["standings", "fixtures", "results"]);

export function viewLabels(tr) {
  return tr
    ? { standings:"Puan Durumu", fixtures:"Fikstür", results:"Sonuçlar" }
    : { standings:"Standings", fixtures:"Fixtures", results:"Results" };
}

/** Win / draw / loss totals for ALTAIR across finished matches. */
export function summarizeOutcomes(matches) {
  return matches.reduce((total, match) => {
    const outcome = getAltairOutcome(match);
    if (outcome) total[outcome] += 1;
    return total;
  }, { win:0, draw:0, loss:0 });
}

const MINUS = "−";
/** +4 / −3 / 0 with a typographic minus. */
export function signed(value) {
  const number = Number(value) || 0;
  return number > 0 ? `+${number}` : number < 0 ? `${MINUS}${Math.abs(number)}` : "0";
}
