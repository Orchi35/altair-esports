import { MatchItem } from "../../features/match-center/MatchList.jsx";
import { toSummaryRow } from "./summaryRow.js";
import "../../styles/match-outcome.css";

/** One match as a list item (`<li>`); render inside an `ol.mc-list`. */
export function MatchSummaryCard({ copy, lang, locale, match, mode }) {
  const row = toSummaryRow(match, { copy, locale });
  return <MatchItem match={row} lang={lang} mode={mode || (row.score ? "results" : "fixtures")} className="content-match-card" linkClassName="content-match-footer"/>;
}
